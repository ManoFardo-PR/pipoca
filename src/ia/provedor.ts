/**
 * Pipoca — Provedor de IA (AIPROV) · doc fase05-05-04
 * ----------------------------------------------------
 * Interface ÚNICA multi-provedor que o Motor B consome (eixo 2): trocar
 * Claude/Gemini/OpenAI não muda o motor. Este módulo é PURO (tipos, schema
 * do Trecho e validação) — sem rede, sem imports de runtime; os adaptadores
 * concretos vivem em src/ia/adaptadores/ e a seleção por config em
 * adaptadores/selecionar.ts (fora do bundle da criança no MVP).
 * Guardrails SEMPRE no caminho: compor com envolverComGuardrails (05-08).
 */

import type { Trecho } from "../core/grafo/tipos.js";

export type JsonSchema = Record<string, unknown>;

export interface OptsGeracao {
  system?: string; // PROMPT_BASE (05-02) — o adaptador mapeia p/ o campo do provedor
  maxTokens?: number;
}

/** Contrato do doc 05-04 (ipsis litteris): geração restrita por JSON schema. */
export interface ProvedorIA {
  gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho>;
}

/** Schema JSON que restringe a saída ao formato Trecho (05-03). */
export const TRECHO_JSON_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    texto: { type: "string" },
    ehFinal: { type: "boolean" },
  },
  required: ["texto", "ehFinal"],
  additionalProperties: false,
};

/** Recusa do provedor (ex.: stop_reason "refusal") — tratada ANTES do conteúdo. */
export class ErroRecusaProvedor extends Error {
  constructor(mensagem?: string) {
    super(mensagem || "O provedor recusou a geração.");
    this.name = "ErroRecusaProvedor";
  }
}

/**
 * Valida a saída bruta do provedor como Trecho e devolve SOMENTE
 * { texto, ehFinal } — `objetoId` é injetado pelo motor, nunca pela IA (05-02).
 */
export function validarTrechoGerado(bruto: unknown): Trecho {
  if (!bruto || typeof bruto !== "object") {
    throw new Error("Saída do provedor não é um objeto Trecho.");
  }
  const r = bruto as Record<string, unknown>;
  const texto = r["texto"];
  const ehFinal = r["ehFinal"];
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new Error("Trecho gerado sem texto.");
  }
  if (typeof ehFinal !== "boolean") {
    throw new Error("Trecho gerado sem ehFinal booleano.");
  }
  return { texto, ehFinal };
}

/**
 * Transporte HTTP injetável (fetch-like mínimo): os adaptadores montam a
 * requisição e interpretam a resposta; os testes injetam um fake; a chamada
 * real (com chave, via ProxyIA server-side) é da fase 06.
 */
export interface RespostaTransporte {
  status: number;
  json(): Promise<unknown>;
}

export type Transporte = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<RespostaTransporte>;

/** Default: fetch global (só usado fora do MVP — fase06 via proxy). */
export function transportePadrao(): Transporte {
  return (url, init) => fetch(url, init) as unknown as Promise<RespostaTransporte>;
}
