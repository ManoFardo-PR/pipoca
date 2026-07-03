/**
 * Pipoca — Adaptador DeepSeek · fase06 (extensão do eixo AIPROV da fase05)
 * -------------------------------------------------------------------------
 * Mesma interface `ProvedorIA` — intercambiável sem mudar o Motor B.
 * A API é OpenAI-compatível (POST /chat/completions), mas NÃO aceita
 * `response_format: json_schema`: só JSON mode (`{type:"json_object"}`),
 * que exige a palavra "json" no prompt/system — o schema do Trecho é
 * descrito no system e a saída é revalidada por `validarTrechoGerado`
 * (parse defensivo). SEM chave no cliente (ProxyIA fase06).
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

export interface OpcoesAdaptadorDeepSeek {
  modelo: string; // catálogo MVP: deepseek-chat
  transporte?: Transporte;
  urlBase?: string;
  maxTokensPadrao?: number;
}

interface RespostaDeepSeek {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string;
  }>;
}

export function criarAdaptadorDeepSeek(op: OpcoesAdaptadorDeepSeek): ProvedorIA {
  const transporte = op.transporte || transportePadrao();
  const urlBase = op.urlBase || "https://api.deepseek.com";

  return {
    async gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho> {
      // JSON mode exige "json" na conversa: o schema entra descrito no system.
      const systemBase = (opts && opts.system) || "";
      const system =
        systemBase +
        '\nResponda SOMENTE com um objeto json válido no formato: { "texto": string, "ehFinal": boolean }.' +
        "\nSchema json exigido: " +
        JSON.stringify(schema);

      const corpo: Record<string, unknown> = {
        model: op.modelo,
        max_tokens: (opts && opts.maxTokens) || op.maxTokensPadrao || 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      };

      const resp = await transporte(urlBase + "/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (resp.status !== 200) throw new Error("DeepSeek: HTTP " + resp.status);

      const json = (await resp.json()) as RespostaDeepSeek;
      const escolha = json && Array.isArray(json.choices) ? json.choices[0] : undefined;
      const msg = escolha ? escolha.message : undefined;
      // Recusa verificada ANTES de ler o conteúdo (espelha 05-05).
      if (msg && typeof msg.refusal === "string" && msg.refusal.length > 0) {
        throw new ErroRecusaProvedor("DeepSeek recusou a geração.");
      }
      if (escolha && escolha.finish_reason === "content_filter") {
        throw new ErroRecusaProvedor("DeepSeek bloqueou o conteúdo.");
      }
      const textoJson = msg && typeof msg.content === "string" ? msg.content : "";
      // Parse DEFENSIVO: JSON mode não garante o shape — validarTrechoGerado fecha.
      let bruto: unknown = null;
      try {
        bruto = textoJson ? JSON.parse(textoJson) : null;
      } catch {
        throw new Error("DeepSeek: resposta fora do formato json.");
      }
      return validarTrechoGerado(bruto);
    },
  };
}
