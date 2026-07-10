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
  // No ambiente remoto (Claude Code Web) o egress passa por um proxy que
  // re-termina TLS; o fetch do Bun fecha o socket no handshake mesmo com
  // `tls.ca` explícito, enquanto o curl (CURL_CA_BUNDLE/https_proxy já
  // configurados pelo ambiente) atravessa. Fora do ambiente remoto, fetch.
  if (process.env["CCR_AGENT_PROXY_ENABLED"] === "1") return transporteCurl();
  return (url, init) => fetch(url, init) as unknown as Promise<RespostaTransporte>;
}

export function transporteCurl(): Transporte {
  return async (url, init) => {
    const args = ["curl", "-sS", "--max-time", "180", "-X", init.method, "-w", "%{stderr}%{http_code}", url];
    for (const [nome, valor] of Object.entries(init.headers)) args.push("-H", `${nome}: ${valor}`);
    if (init.body !== undefined) args.push("--data-binary", "@-");
    const proc = Bun.spawn(args, {
      stdin: init.body !== undefined ? new TextEncoder().encode(init.body) : undefined,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [corpo, stderr, codigo] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (codigo !== 0) throw new Error(`curl saiu com ${codigo}: ${stderr.trim().slice(0, 200)}`);
    const m = /(\d{3})\s*$/.exec(stderr);
    if (!m) throw new Error(`curl sem status na saída: ${stderr.trim().slice(0, 200)}`);
    return {
      status: Number(m[1]),
      json: async () => {
        try {
          return JSON.parse(corpo) as unknown;
        } catch {
          return {};
        }
      },
    };
  };
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
  /** usageMetadata do Gemini, quando presente (monitoramento de custo). */
  tokens?: { entrada: number; saida: number };
}

interface RespostaGeminiJson {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
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
    const uso = json.usageMetadata;
    const tokens =
      uso && typeof uso.promptTokenCount === "number" && typeof uso.candidatesTokenCount === "number"
        ? { entrada: uso.promptTokenCount, saida: uso.candidatesTokenCount }
        : undefined;
    const cand = Array.isArray(json.candidates) ? json.candidates[0] : undefined;
    if (cand?.finishReason === "SAFETY") return { ok: false, erro: "recusa_seguranca", tentativas };
    const textoJson = typeof cand?.content?.parts?.[0]?.text === "string" ? cand.content.parts[0].text : "";
    try {
      const parsed = textoJson ? (JSON.parse(textoJson) as Record<string, unknown>) : null;
      const texto = parsed ? parsed["texto_limpo"] : undefined;
      if (typeof texto === "string" && texto.trim() !== "") return { ok: true, texto, tentativas, tokens };
    } catch {
      // JSON malformado — não é transiente
    }
    return { ok: false, erro: "resposta_invalida", tentativas };
  }
  return { ok: false, erro: "erro_desconhecido", tentativas: MAX_TENTATIVAS };
}
