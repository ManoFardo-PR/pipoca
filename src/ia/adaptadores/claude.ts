/**
 * Pipoca — Adaptador Anthropic Claude (CLAUDE) · doc fase05-05-05
 * ----------------------------------------------------------------
 * Implementa `ProvedorIA` como montador de requisição + parser sobre um
 * `Transporte` injetável — SEM SDK e SEM chave no cliente (autenticação e
 * chamada real vivem no ProxyIA server-side, fase06).
 * Regras do doc: `stop_reason === "refusal"` tratado ANTES de ler conteúdo;
 * NUNCA enviar temperature/top_p/budget_tokens (400 no 4.8); saída
 * restrita por `output_config.format` json_schema (schema do Trecho).
 */

import type { Trecho } from "../../core/grafo/tipos.js";
import {
  ErroRecusaProvedor,
  transportePadrao,
  validarTrechoGerado,
  type JsonSchema,
  type OptsGeracao,
  type ProvedorIA,
  type Transporte,
} from "../provedor.js";

export interface OpcoesAdaptadorClaude {
  modelo: string; // do catálogo MODELOS_POR_PROVEDOR (fase04-04-05)
  transporte?: Transporte;
  urlBase?: string;
  maxTokensPadrao?: number;
}

interface RespostaClaude {
  stop_reason?: string;
  content?: Array<{ type?: string; text?: string }>;
}

export function criarAdaptadorClaude(op: OpcoesAdaptadorClaude): ProvedorIA {
  const transporte = op.transporte || transportePadrao();
  const urlBase = op.urlBase || "https://api.anthropic.com";

  return {
    async gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho> {
      const corpo: Record<string, unknown> = {
        model: op.modelo,
        max_tokens: (opts && opts.maxTokens) || op.maxTokensPadrao || 400,
        thinking: { type: "adaptive" },
        output_config: { format: { type: "json_schema", schema } },
        messages: [{ role: "user", content: prompt }],
      };
      if (opts && opts.system) corpo["system"] = opts.system;

      const resp = await transporte(urlBase + "/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          // sem chave aqui — o ProxyIA (fase06) autentica no servidor
        },
        body: JSON.stringify(corpo),
      });
      if (resp.status !== 200) throw new Error("Claude: HTTP " + resp.status);

      const json = (await resp.json()) as RespostaClaude;
      // Refusal verificado ANTES de qualquer leitura de conteúdo (regra do doc).
      if (json && json.stop_reason === "refusal") {
        throw new ErroRecusaProvedor("Claude recusou a geração.");
      }
      const bloco = json && Array.isArray(json.content) ? json.content.find((c) => c && c.type === "text") : undefined;
      const textoJson = bloco && typeof bloco.text === "string" ? bloco.text : "";
      return validarTrechoGerado(textoJson ? (JSON.parse(textoJson) as unknown) : null);
    },
  };
}
