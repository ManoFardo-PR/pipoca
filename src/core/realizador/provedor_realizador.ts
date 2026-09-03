/**
 * [provedor_realizador.ts] — Interface do provedor plugável do realizador + o
 *   adaptador Gemini: recebe prompt+config, devolve texto+metadados.
 *
 * PAPEL: core-lógica (realizador · fase 12 · porta de provedor / adaptador Gemini)
 * POR QUE EXISTE: isola o realizador de QUAL LLM responde — a cascata fala só com a
 *   interface ProvedorRealizador; erros de provedor e de recusa viram tipos próprios
 *   para a política de falha decidir retry ou pular.
 * ENTRA: prompt (string) + ConfigGeracao (modelo, temperatura, maxTokens, system);
 *   OpcoesGemini (modelo, apiKey, transporte, urlBase) na criação do adaptador.
 * SAI: RespostaProvedor { texto, metadados }; classes ErroRecusaRealizador e
 *   ErroProvedorRealizador; criarProvedorGeminiRealizador.
 * CHAMA: ../../ia/provedor.ts:transportePadrao/Transporte (reuso da geração 1).
 * É CHAMADO POR: realizador/cascata.ts (interface + classes de erro), geracao/
 *   geracao.ts (tipo), realizador.test.ts, experimentos/fichas-para-historias/gerar.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/realizador/realizador.test.ts` (dentro de `bun run test`).
 * CUIDADO: CHAVE NUNCA NO CLIENTE nem lida aqui — `apiKey` chega por PARÂMETRO (na
 *   calibração o script lê o env; em produção a Edge Function tem os secrets). ZERO
 *   process.env neste módulo. SAFETY/blockReason vira recusa tipada ANTES de ler o
 *   conteúdo; retry é política da cascata (uma chamada por gerarTexto).
 *
 * — detalhe preservado —
 * Pipoca — Provedor plugável do realizador (provedor_realizador.ts)
 * -----------------------------------------------------------------
 * Interface `ProvedorRealizador` (fase12-12-02): texto+config → texto+metadados.
 * Reusa o `Transporte` injetável da geração 1 (`src/ia/provedor.ts:70-83`).
 * CHAVE NUNCA NO CLIENTE nem lida aqui: `apiKey` chega por PARÂMETRO de quem
 * cria o provedor (na calibração, o script do experimento lê o env; em
 * produção, o padrão é a Edge Function com secrets — deploy é fase 13,
 * a edge é a referência). Nenhum process.env
 * neste módulo.
 */

import { transportePadrao, type Transporte } from "../../ia/provedor.js";

export interface MetadadosGeracao {
  modelo: string;
  tentativas: number;
  duracaoMs: number;
  /** usageMetadata quando o provedor reporta (monitoramento de custo). */
  tokens?: { entrada: number; saida: number };
}

export interface ConfigGeracao {
  modelo: string;
  temperatura: number;
  maxTokens?: number;
  /** Instrução de sistema (o prompt do realizador é system+user). */
  system?: string;
}

export interface RespostaProvedor {
  texto: string;
  metadados: MetadadosGeracao;
}

export interface ProvedorRealizador {
  /** Nome estável para a sinalização de origem (12-04). */
  nome: string;
  /** Modelo usado quando `opcoes.modelo` não força outro. */
  modeloPadrao: string;
  gerarTexto(prompt: string, config: ConfigGeracao): Promise<RespostaProvedor>;
}

/** Recusa de conteúdo (SAFETY/blockReason) — NUNCA repetir no mesmo provedor (12-04). */
export class ErroRecusaRealizador extends Error {
  constructor(motivo: string) {
    super(`recusa do provedor: ${motivo}`);
    this.name = "ErroRecusaRealizador";
  }
}

/** Falha de PROVEDOR (12-04): rede/timeout/5xx são transitórias (retry curto); o resto não. */
export class ErroProvedorRealizador extends Error {
  readonly transitorio: boolean;
  constructor(motivo: string, transitorio: boolean) {
    super(motivo);
    this.name = "ErroProvedorRealizador";
    this.transitorio = transitorio;
  }
}

// Dialeto OpenAPI 3.0 do Gemini — sem additionalProperties (rejeita com 400).
const SCHEMA_TEXTO = {
  type: "object",
  properties: { texto_limpo: { type: "string" } },
  required: ["texto_limpo"],
} as const;

interface RespostaGeminiJson {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export interface OpcoesGemini {
  modelo: string;
  /** Injetada pelo chamador (script de calibração via env; edge via secret — fase 13). */
  apiKey: string;
  transporte?: Transporte;
  urlBase?: string;
}

/**
 * Adaptador Gemini do realizador — uma chamada por gerarTexto (retry é política
 * da cascata, 12-04). Saída em JSON restrito (`texto_limpo`), tokens de
 * usageMetadata, SAFETY/blockReason vira recusa tipada ANTES de ler conteúdo
 * (mesmo padrão de `src/ia/adaptadores/gemini.ts:60-66`).
 */
export function criarProvedorGeminiRealizador(opcoes: OpcoesGemini): ProvedorRealizador {
  const transporte = opcoes.transporte || transportePadrao();
  const urlBase = opcoes.urlBase || "https://generativelanguage.googleapis.com";

  return {
    nome: "gemini",
    modeloPadrao: opcoes.modelo,
    async gerarTexto(prompt: string, config: ConfigGeracao): Promise<RespostaProvedor> {
      const inicio = Date.now();
      const modelo = config.modelo || opcoes.modelo;
      const corpo = {
        systemInstruction: { parts: [{ text: config.system ?? "" }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA_TEXTO,
          temperature: config.temperatura,
          ...(config.maxTokens !== undefined ? { maxOutputTokens: config.maxTokens } : {}),
        },
      };

      let resp;
      try {
        resp = await transporte(`${urlBase}/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": opcoes.apiKey },
          body: JSON.stringify(corpo),
        });
      } catch (e) {
        throw new ErroProvedorRealizador(
          `falha_rede: ${e instanceof Error ? e.message : String(e)}`,
          true
        );
      }
      if (resp.status === 429 || resp.status >= 500) {
        throw new ErroProvedorRealizador(`http_${resp.status}`, true);
      }
      if (resp.status !== 200) {
        throw new ErroProvedorRealizador(`http_${resp.status}`, false);
      }

      const json = (await resp.json()) as RespostaGeminiJson;
      if (json.promptFeedback?.blockReason) {
        throw new ErroRecusaRealizador(json.promptFeedback.blockReason);
      }
      const cand = Array.isArray(json.candidates) ? json.candidates[0] : undefined;
      if (cand?.finishReason === "SAFETY") {
        throw new ErroRecusaRealizador("finishReason SAFETY");
      }
      const uso = json.usageMetadata;
      const tokens =
        uso && typeof uso.promptTokenCount === "number" && typeof uso.candidatesTokenCount === "number"
          ? { entrada: uso.promptTokenCount, saida: uso.candidatesTokenCount }
          : undefined;

      const textoJson = typeof cand?.content?.parts?.[0]?.text === "string" ? cand.content.parts[0].text : "";
      let texto: unknown;
      try {
        const parsed = textoJson ? (JSON.parse(textoJson) as Record<string, unknown>) : null;
        texto = parsed ? parsed["texto_limpo"] : undefined;
      } catch {
        throw new ErroProvedorRealizador("resposta_invalida: JSON malformado", false);
      }
      if (typeof texto !== "string" || texto.trim() === "") {
        throw new ErroProvedorRealizador("resposta_invalida: texto_limpo ausente/vazio", false);
      }

      return {
        texto,
        metadados: { modelo, tentativas: 1, duracaoMs: Date.now() - inicio, tokens },
      };
    },
  };
}
