/**
 * [gemini.ts] — adaptador ProvedorIA para a API Google Gemini: monta
 *   :generateContent e faz o parse do Trecho, sobre um Transporte injetável.
 *
 * PAPEL: core-lógica (orquestração de IA · GERAÇÃO 1 · adaptador Gemini)
 * POR QUE EXISTE: encaixa o Gemini na interface única ProvedorIA sem mudar o
 *   Motor B, restringindo a saída por responseSchema.
 * ENTRA: OpcoesAdaptadorGemini {modelo, transporte?, urlBase?}; depois
 *   prompt/schema/opts.
 * SAI: um ProvedorIA cujo gerar() devolve Trecho; lança ErroRecusaProvedor em
 *   bloqueio/recusa.
 * CHAMA: ../provedor.js:{ErroRecusaProvedor, transportePadrao, validarTrechoGerado,
 *   JsonSchema, OptsGeracao, ProvedorIA, Transporte}, ../../core/grafo/tipos.js:Trecho.
 * É CHAMADO POR: ia/adaptadores/selecionar.ts, ia/ia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; `bun run src/ia/ia.test.ts`
 *   (dentro de `bun run test`).
 * CUIDADO: cliente KEYLESS — nenhuma chave Google vive aqui (nem em src/): a
 *   credencial mora nos secrets da Edge Function proxy-ia (chamada real server-side).
 *   promptFeedback.blockReason e finishReason "SAFETY" são tratados como recusa
 *   ANTES de ler conteúdo.
 *
 * — detalhe preservado —
 * Pipoca — Adaptador Google Gemini (GEMINI) · doc fase05-05-06
 * -------------------------------------------------------------
 * Mesma interface `ProvedorIA` dos demais — intercambiável sem mudar o
 * Motor B. Montador de requisição + parser sobre `Transporte` injetável;
 * SEM chave no cliente (ProxyIA fase06). Saída restrita por
 * `generationConfig.responseSchema` (schema do Trecho); bloqueio de
 * segurança do provedor tratado como recusa ANTES de ler conteúdo.
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

export interface OpcoesAdaptadorGemini {
  modelo: string;
  transporte?: Transporte;
  urlBase?: string;
}

interface RespostaGemini {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export function criarAdaptadorGemini(op: OpcoesAdaptadorGemini): ProvedorIA {
  const transporte = op.transporte || transportePadrao();
  const urlBase = op.urlBase || "https://generativelanguage.googleapis.com";

  return {
    async gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho> {
      const corpo: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      };
      if (opts && opts.system) corpo["systemInstruction"] = { parts: [{ text: opts.system }] };

      const resp = await transporte(urlBase + "/v1beta/models/" + op.modelo + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (resp.status !== 200) throw new Error("Gemini: HTTP " + resp.status);

      const json = (await resp.json()) as RespostaGemini;
      // Bloqueios de segurança tratados ANTES de ler conteúdo (espelha 05-05).
      if (json && json.promptFeedback && json.promptFeedback.blockReason) {
        throw new ErroRecusaProvedor("Gemini bloqueou o prompt.");
      }
      const cand = json && Array.isArray(json.candidates) ? json.candidates[0] : undefined;
      if (cand && cand.finishReason === "SAFETY") {
        throw new ErroRecusaProvedor("Gemini recusou a geração.");
      }
      const parte = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts[0] : undefined;
      const textoJson = parte && typeof parte.text === "string" ? parte.text : "";
      return validarTrechoGerado(textoJson ? (JSON.parse(textoJson) as unknown) : null);
    },
  };
}
