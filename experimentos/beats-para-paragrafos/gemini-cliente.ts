/**
 * [gemini-cliente.ts] — cliente HTTP do Gemini (o "realizador" do experimento
 *   B1.5): monta system instruction + schema, chama a API e devolve o texto
 *   limpo com métricas de crescimento e retry para 429/5xx.
 *
 * PAPEL: experimento (B1.5 · GASTA API paga)
 * POR QUE EXISTE: reescrever o texto base em prosa fluida sem inventar/remover
 *   acontecimentos, com contrato PRÓPRIO (não o do Motor B), e transporte
 *   injetável para poder testar sem rede.
 * ENTRA: textoOriginal, nível (NivelKey) e OpcoesGemini (modelo, chave,
 *   temperatura, urlBase/transporte opcionais).
 * SAI: ResultadoChamadaGemini { ok, textoLimpo?, erro?, tentativas, palavras }.
 * CHAMA: src/core/composicao.js (tipo NivelKey); fetch real ao Gemini via
 *   transportePadrao() (injetável).
 * É CHAMADO POR: gerar-historias.ts:limparTextoComGemini; gerar-historias.test.ts
 *   (com Transporte fake, sem rede).
 * RODA POR: importado por gerar-historias.ts; nos testes,
 *   `bun run experimentos/beats-para-paragrafos/gerar-historias.test.ts`.
 * CUIDADO: GASTA API paga — fetch real a generativelanguage.googleapis.com com
 *   header x-goog-api-key (a chave chega por opts.chave, do .env). O
 *   responseSchema do Gemini é subset do OpenAPI 3.0: "additionalProperties"
 *   NÃO existe e faz a API devolver HTTP 400 — não adicionar.
 *
 * — detalhe preservado —
 * Experimento B1.5 — chamada HTTP real ao Gemini (o "realizador"). Schema e
 * prompt PRÓPRIOS — não reaproveita TRECHO_JSON_SCHEMA/validarTrechoGerado
 * de src/ia/provedor.ts, que são do contrato do Motor B (sistema diferente).
 * Transporte injetável local (mesmo formato de src/ia/provedor.ts) para não
 * acoplar este experimento standalone ao Motor B.
 */

import type { NivelKey } from "../../src/core/composicao.js";

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

// O responseSchema do Gemini é um subconjunto do OpenAPI 3.0 (não JSON Schema
// puro) — "additionalProperties" não existe nesse dialeto e a API rejeita a
// requisição inteira com HTTP 400 se o campo estiver presente.
export const SCHEMA_TEXTO_LIMPO = {
  type: "object",
  properties: { texto_limpo: { type: "string" } },
  required: ["texto_limpo"],
} as const;

const DESCRICAO_NIVEL: Record<NivelKey, string> = {
  n1: "Primeiras palavras — sílabas e palavras soltas",
  n2: "Frases curtas — uma linha",
  n3: "Pequenos textos — frases ligadas",
  n4: "Parágrafos — histórias mais longas",
};

export function montarSystemInstruction(nivel: NivelKey, teto: number): string {
  return [
    "Reescreva os trechos abaixo como um texto infantil fluido e contínuo.",
    "NÃO invente acontecimentos, objetos, personagens ou falas.",
    "NÃO remova nenhum acontecimento. NÃO mude a ordem.",
    "NÃO troque o nome (Joana), o gênero ou a idade da protagonista.",
    `Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.`,
    'Uma frase pode unir-se à outra com "e", "mas", "então", "depois".',
    "Menos pontos finais, sem frases picadas — mas sem floreio que não existia.",
    `Máx. ${teto} palavras. Devolva só o texto final.`,
  ].join("\n");
}

export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter((p) => p.length > 0).length;
}

export interface OpcoesGemini {
  modelo: string;
  chave: string;
  temperatura: number;
  urlBase?: string;
  transporte?: Transporte;
  atrasoRetryMs?: number;
  tetoCrescimento?: number; // proporção, default 0.25
}

export interface ResultadoChamadaGemini {
  ok: boolean;
  textoLimpo?: string;
  erro?: string;
  tentativas: number;
  palavras: { original: number; limpo?: number; razaoCrescimento?: number; excedeuTeto?: boolean };
}

interface RespostaGeminiJson {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_TENTATIVAS = 2;

export async function limparTextoComGemini(
  textoOriginal: string,
  nivel: NivelKey,
  opts: OpcoesGemini
): Promise<ResultadoChamadaGemini> {
  const transporte = opts.transporte || transportePadrao();
  const urlBase = opts.urlBase || "https://generativelanguage.googleapis.com";
  const atrasoRetryMs = opts.atrasoRetryMs ?? 2000;
  const tetoCrescimento = opts.tetoCrescimento ?? 0.25;
  const palavrasOriginal = contarPalavras(textoOriginal);
  const teto = Math.ceil(palavrasOriginal * (1 + tetoCrescimento));
  const systemInstruction = montarSystemInstruction(nivel, teto);

  const corpo = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: textoOriginal }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA_TEXTO_LIMPO,
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
      return {
        ok: false,
        erro: `falha_rede:${e instanceof Error ? e.message : String(e)}`,
        tentativas,
        palavras: { original: palavrasOriginal },
      };
    }

    const podeRetry = (resp.status === 429 || resp.status >= 500) && tentativas < MAX_TENTATIVAS;
    if (resp.status === 429 || resp.status >= 500) {
      if (podeRetry) {
        await dormir(atrasoRetryMs);
        continue;
      }
      return { ok: false, erro: `http_${resp.status}`, tentativas, palavras: { original: palavrasOriginal } };
    }
    if (resp.status !== 200) {
      return { ok: false, erro: `http_${resp.status}`, tentativas, palavras: { original: palavrasOriginal } };
    }

    const json = (await resp.json()) as RespostaGeminiJson;
    if (json.promptFeedback?.blockReason) {
      return {
        ok: false,
        erro: `bloqueio_seguranca:${json.promptFeedback.blockReason}`,
        tentativas,
        palavras: { original: palavrasOriginal },
      };
    }
    const cand = Array.isArray(json.candidates) ? json.candidates[0] : undefined;
    if (cand?.finishReason === "SAFETY") {
      return { ok: false, erro: "recusa_seguranca", tentativas, palavras: { original: palavrasOriginal } };
    }
    const parte = cand?.content?.parts?.[0];
    const textoJson = typeof parte?.text === "string" ? parte.text : "";
    let textoLimpo: string | undefined;
    try {
      const parsed = textoJson ? (JSON.parse(textoJson) as Record<string, unknown>) : null;
      const candidato = parsed ? parsed["texto_limpo"] : undefined;
      if (typeof candidato === "string" && candidato.trim() !== "") textoLimpo = candidato;
    } catch {
      // JSON malformado — sem retry, não é transiente
    }
    if (!textoLimpo) {
      return { ok: false, erro: "resposta_invalida", tentativas, palavras: { original: palavrasOriginal } };
    }

    const palavrasLimpo = contarPalavras(textoLimpo);
    const razaoCrescimento = palavrasOriginal > 0 ? (palavrasLimpo - palavrasOriginal) / palavrasOriginal : 0;
    const excedeuTeto = razaoCrescimento > tetoCrescimento;
    if (excedeuTeto) {
      console.warn(
        `[gemini-cliente] crescimento de ${(razaoCrescimento * 100).toFixed(0)}% acima do teto de ${(tetoCrescimento * 100).toFixed(0)}%`
      );
    }
    return {
      ok: true,
      textoLimpo,
      tentativas,
      palavras: { original: palavrasOriginal, limpo: palavrasLimpo, razaoCrescimento, excedeuTeto },
    };
  }

  // Inalcançável: todo caminho do loop acima retorna. Só satisfaz o compilador.
  return { ok: false, erro: "erro_desconhecido", tentativas: MAX_TENTATIVAS, palavras: { original: palavrasOriginal } };
}
