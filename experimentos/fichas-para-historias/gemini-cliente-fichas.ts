/**
 * Experimento fichas→histórias — chamada real ao Gemini com system+user
 * PRÓPRIOS (o system vem do montador de prompt, não é fixo como no
 * experimento-beats). Transporte injetável; retry só em 429/5xx.
 */

export interface RespostaTransporte {
  status: number;
  json(): Promise<unknown>;
}

export type Transporte = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<RespostaTransporte>;

export function transportePadrao(): Transporte {
  return (url, init) => fetch(url, init) as unknown as Promise<RespostaTransporte>;
}

// Dialeto OpenAPI 3.0 do Gemini — sem additionalProperties (rejeita com 400).
export const SCHEMA_TEXTO = {
  type: "object",
  properties: { texto_limpo: { type: "string" } },
  required: ["texto_limpo"],
} as const;

export interface OpcoesGeracao {
  modelo: string;
  chave: string;
  temperatura: number;
  urlBase?: string;
  transporte?: Transporte;
  atrasoRetryMs?: number;
}

export interface ResultadoGeracao {
  ok: boolean;
  texto?: string;
  erro?: string;
  tentativas: number;
}

interface RespostaGeminiJson {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
}

const MAX_TENTATIVAS = 2;
const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function gerarComGemini(system: string, user: string, opts: OpcoesGeracao): Promise<ResultadoGeracao> {
  const transporte = opts.transporte || transportePadrao();
  const urlBase = opts.urlBase || "https://generativelanguage.googleapis.com";
  const atrasoRetryMs = opts.atrasoRetryMs ?? 2000;

  const corpo = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA_TEXTO,
      temperature: opts.temperatura,
    },
  };

  for (let tentativas = 1; tentativas <= MAX_TENTATIVAS; tentativas++) {
    let resp: RespostaTransporte;
    try {
      resp = await transporte(urlBase + "/v1beta/models/" + opts.modelo + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": opts.chave },
        body: JSON.stringify(corpo),
      });
    } catch (e) {
      return { ok: false, erro: `falha_rede:${e instanceof Error ? e.message : String(e)}`, tentativas };
    }
    if (resp.status === 429 || resp.status >= 500) {
      if (tentativas < MAX_TENTATIVAS) {
        await dormir(atrasoRetryMs);
        continue;
      }
      return { ok: false, erro: `http_${resp.status}`, tentativas };
    }
    if (resp.status !== 200) return { ok: false, erro: `http_${resp.status}`, tentativas };

    const json = (await resp.json()) as RespostaGeminiJson;
    if (json.promptFeedback?.blockReason) {
      return { ok: false, erro: `bloqueio_seguranca:${json.promptFeedback.blockReason}`, tentativas };
    }
    const cand = Array.isArray(json.candidates) ? json.candidates[0] : undefined;
    if (cand?.finishReason === "SAFETY") return { ok: false, erro: "recusa_seguranca", tentativas };
    const textoJson = typeof cand?.content?.parts?.[0]?.text === "string" ? cand.content.parts[0].text : "";
    try {
      const parsed = textoJson ? (JSON.parse(textoJson) as Record<string, unknown>) : null;
      const texto = parsed ? parsed["texto_limpo"] : undefined;
      if (typeof texto === "string" && texto.trim() !== "") return { ok: true, texto, tentativas };
    } catch {
      // JSON malformado — não é transiente
    }
    return { ok: false, erro: "resposta_invalida", tentativas };
  }
  return { ok: false, erro: "erro_desconhecido", tentativas: MAX_TENTATIVAS };
}
