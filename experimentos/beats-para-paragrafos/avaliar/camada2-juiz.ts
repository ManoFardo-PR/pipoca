/**
 * Experimento B1.5 — Camada 2: juiz LLM (OpenAI, diferente do gerador para
 * eliminar auto-avaliação). Só roda nos pares que já passaram a Camada 1.
 * Endpoint/auth confirmados em functions/proxy-ia/index.ts:184-195
 * (POST /v1/chat/completions, Authorization: Bearer).
 */

import type { NivelKey } from "../../../src/core/composicao.js";
import type { VereditoCamada2 } from "../tipos.js";

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

export const SCHEMA_VEREDITO_CAMADA2 = {
  type: "object",
  properties: {
    fluidez: { type: "number" },
    adequacao: { type: "number" },
    naturalidade: { type: "number" },
    comentario_curto: { type: "string" },
  },
  required: ["fluidez", "adequacao", "naturalidade", "comentario_curto"],
  additionalProperties: false,
} as const;

function montarPromptJuiz(nivel: NivelKey, textoBase: string, textoLimpo: string): string {
  return [
    `Nível de leitura: ${nivel}.`,
    "Texto original (bruto, do motor de composição):",
    textoBase,
    "",
    "Texto realizado (reescrito para prosa fluida):",
    textoLimpo,
    "",
    "Avalie o TEXTO REALIZADO em três eixos separados, notas de 0 a 5 cada:",
    "- fluidez: soa como um livro, não como uma lista de frases picadas?",
    "- adequacao: o vocabulário e a complexidade batem com o nível informado (nem mais simples, nem mais difícil)?",
    "- naturalidade: a prosa parece escrita por um humano para uma criança, sem soar mecânica?",
    "Devolva também um comentário curto (1 frase) justificando as notas.",
  ].join("\n");
}

export interface OpcoesJuiz {
  modelo: string;
  chave: string;
  temperatura: number;
  urlBase?: string;
  transporte?: Transporte;
}

export interface ResultadoJuiz {
  ok: boolean;
  veredito?: VereditoCamada2;
  erro?: string;
}

interface RespostaOpenAIJson {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
}

export async function julgarPar(
  nivel: NivelKey,
  textoBase: string,
  textoLimpo: string,
  opts: OpcoesJuiz
): Promise<ResultadoJuiz> {
  const transporte = opts.transporte || transportePadrao();
  const urlBase = opts.urlBase || "https://api.openai.com";
  const prompt = montarPromptJuiz(nivel, textoBase, textoLimpo);

  const corpo = {
    model: opts.modelo,
    temperature: opts.temperatura,
    messages: [
      {
        role: "system",
        content: "Você é um crítico literário especializado em literatura infantil. Responda só com o JSON pedido.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "veredito_camada2", strict: true, schema: SCHEMA_VEREDITO_CAMADA2 },
    },
  };

  let resp: RespostaTransporte;
  try {
    resp = await transporte(urlBase + "/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + opts.chave },
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    return { ok: false, erro: `falha_rede:${e instanceof Error ? e.message : String(e)}` };
  }
  if (resp.status !== 200) return { ok: false, erro: `http_${resp.status}` };

  const json = (await resp.json()) as RespostaOpenAIJson;
  const msg = Array.isArray(json.choices) ? json.choices[0]?.message : undefined;
  if (msg && typeof msg.refusal === "string" && msg.refusal.length > 0) {
    return { ok: false, erro: `recusa:${msg.refusal}` };
  }
  const conteudo = typeof msg?.content === "string" ? msg.content : "";
  try {
    const parsed = conteudo ? (JSON.parse(conteudo) as Record<string, unknown>) : null;
    if (
      !parsed ||
      typeof parsed["fluidez"] !== "number" ||
      typeof parsed["adequacao"] !== "number" ||
      typeof parsed["naturalidade"] !== "number" ||
      typeof parsed["comentario_curto"] !== "string"
    ) {
      return { ok: false, erro: "resposta_invalida" };
    }
    return {
      ok: true,
      veredito: {
        fluidez: parsed["fluidez"] as number,
        adequacao: parsed["adequacao"] as number,
        naturalidade: parsed["naturalidade"] as number,
        comentarioCurto: parsed["comentario_curto"] as string,
      },
    };
  } catch {
    return { ok: false, erro: "resposta_invalida" };
  }
}
