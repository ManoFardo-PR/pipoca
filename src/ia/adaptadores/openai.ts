/**
 * Pipoca — Adaptador OpenAI (OPENAI) · doc fase05-05-07
 * ------------------------------------------------------
 * Mesma interface `ProvedorIA` — intercambiável sem mudar o Motor B.
 * Montador de requisição + parser sobre `Transporte` injetável; SEM chave
 * no cliente (ProxyIA fase06). Structured outputs via
 * `response_format.json_schema` (strict, schema do Trecho); o campo
 * `refusal` da resposta é tratado ANTES de ler o conteúdo.
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

export interface OpcoesAdaptadorOpenAI {
  modelo: string;
  transporte?: Transporte;
  urlBase?: string;
  maxTokensPadrao?: number;
}

interface RespostaOpenAI {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null };
  }>;
}

export function criarAdaptadorOpenAI(op: OpcoesAdaptadorOpenAI): ProvedorIA {
  const transporte = op.transporte || transportePadrao();
  const urlBase = op.urlBase || "https://api.openai.com";

  return {
    async gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho> {
      const mensagens: Array<{ role: string; content: string }> = [];
      if (opts && opts.system) mensagens.push({ role: "system", content: opts.system });
      mensagens.push({ role: "user", content: prompt });

      const corpo: Record<string, unknown> = {
        model: op.modelo,
        max_completion_tokens: (opts && opts.maxTokens) || op.maxTokensPadrao || 400,
        messages: mensagens,
        response_format: {
          type: "json_schema",
          json_schema: { name: "trecho", strict: true, schema },
        },
      };

      const resp = await transporte(urlBase + "/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (resp.status !== 200) throw new Error("OpenAI: HTTP " + resp.status);

      const json = (await resp.json()) as RespostaOpenAI;
      const msg = json && Array.isArray(json.choices) && json.choices[0] ? json.choices[0].message : undefined;
      // Refusal verificado ANTES de ler o conteúdo (espelha 05-05).
      if (msg && typeof msg.refusal === "string" && msg.refusal.length > 0) {
        throw new ErroRecusaProvedor("OpenAI recusou a geração.");
      }
      const textoJson = msg && typeof msg.content === "string" ? msg.content : "";
      return validarTrechoGerado(textoJson ? (JSON.parse(textoJson) as unknown) : null);
    },
  };
}
