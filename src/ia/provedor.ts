/**
 * [provedor.ts] — o contrato ÚNICO de IA (interface ProvedorIA + schema/validação
 *   do Trecho + tipo de Transporte) que todo adaptador e o Motor B compartilham.
 *
 * PAPEL: core-lógica (orquestração de IA · GERAÇÃO 1 · AIPROV, módulo PURO)
 * POR QUE EXISTE: desacopla o motor do provedor concreto — trocar
 *   Claude/Gemini/OpenAI/DeepSeek não muda o motor; centraliza a validação da
 *   saída como Trecho.
 * ENTRA: (nos consumidores) prompt, JsonSchema, OptsGeracao; validarTrechoGerado
 *   recebe a saída bruta unknown do provedor.
 * SAI: tipos {ProvedorIA, JsonSchema, OptsGeracao, Transporte}, TRECHO_JSON_SCHEMA,
 *   ErroRecusaProvedor, validarTrechoGerado (→ Trecho) e transportePadrao (fetch).
 * CHAMA: ../core/grafo/tipos.js:Trecho (só tipos); transportePadrao usa fetch global.
 * É CHAMADO POR: ia/adaptadores/{claude,gemini,openai,deepseek,selecionar}.ts,
 *   ia/simulado.ts, ia/orquestrador.ts, core/realizador/provedor_realizador.ts,
 *   backend/{proxy_ia,proxy_realizador,espelho_admin,limites_familia,backend,
 *   flags_globais}.ts, backend/adaptadores/{repo_supabase,auth_supabase}.ts,
 *   ia/ia.test.ts, backend/backend.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; `bun run src/ia/ia.test.ts`
 *   (dentro de `bun run test`).
 * CUIDADO: cliente KEYLESS — nenhuma chave de provedor vive aqui (nem em src/):
 *   a credencial mora nos secrets da Edge Function proxy-ia. Módulo PURO (sem
 *   rede). transportePadrao (fetch direto) só é usado fora do MVP — a chamada
 *   real com chave passa pela edge server-side.
 *
 * — detalhe preservado —
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
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<RespostaTransporte>;

/** Default: fetch global (só usado fora do MVP — fase06 via proxy). */
export function transportePadrao(): Transporte {
  return (url, init) => fetch(url, init) as unknown as Promise<RespostaTransporte>;
}
