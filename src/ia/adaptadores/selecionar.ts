/**
 * Pipoca — Seleção de adaptador por config (AIPROV) · doc fase05-05-04
 * ---------------------------------------------------------------------
 * `selecionarAdaptador(config)` → adaptador Claude | Gemini | OpenAI já
 * EMBRULHADO em guardrails (GUARD sempre no caminho — regra 1 do 05-04).
 * A config vem do SA_AI (fase04-04-05, `ConfigIaTenant` — sem campo de
 * chave). Módulo FORA do bundle da criança no MVP: o runtime usa o
 * provedor simulado; o consumidor real desta seleção é o ProxyIA (fase06).
 */

import { MODELOS_POR_PROVEDOR, type ConfigIaTenant } from "../../admin/ia_config.js";
import { envolverComGuardrails, type Guardrails } from "../guardrails.js";
import type { ProvedorIA, Transporte } from "../provedor.js";
import { criarAdaptadorClaude } from "./claude.js";
import { criarAdaptadorGemini } from "./gemini.js";
import { criarAdaptadorOpenAI } from "./openai.js";

export interface DepsSelecao {
  transporte?: Transporte;
  guardrails?: Guardrails;
}

export function selecionarAdaptador(config: ConfigIaTenant, deps?: DepsSelecao): ProvedorIA {
  const provedor = config ? config.provedor : null;
  if (!provedor) throw new Error("Config de IA sem provedor ativo — sem adaptador.");

  const catalogo = MODELOS_POR_PROVEDOR[provedor] || [];
  const modelo = config.modelo || catalogo[0] || "";
  if (!modelo) throw new Error("Config de IA sem modelo para o provedor.");

  const transporte = deps ? deps.transporte : undefined;
  let bruto: ProvedorIA;
  if (provedor === "claude") bruto = criarAdaptadorClaude({ modelo, transporte });
  else if (provedor === "gemini") bruto = criarAdaptadorGemini({ modelo, transporte });
  else bruto = criarAdaptadorOpenAI({ modelo, transporte });

  // GUARD sempre no caminho: AIPROV → GUARD → adaptador.
  return envolverComGuardrails(bruto, deps ? deps.guardrails : undefined) as ProvedorIA;
}
