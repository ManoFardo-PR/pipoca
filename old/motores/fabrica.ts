/**
 * Pipoca — Fábrica de motor (fase00-00-19 · ramo B da fase05)
 * ------------------------------------------------------------
 * Único ponto de escolha Motor A ↔ Motor B (05-01: a troca acontece SÓ
 * aqui; nenhuma tela muda). iaLigada + provedor injetado → MotorIA;
 * iaLigada sem provedor → Motor A com aviso (fallback seguro);
 * iaLigada=false → Motor A.
 *
 * LEI DO SEAM: telas NUNCA importam MotorGrafoAutoral/MotorIA diretamente.
 * Recebem { motor, ordem } por injeção (props/contexto CORE).
 *
 * O provedor chega pela borda (estado.js compõe simulado→guardrails→
 * orquestrador no MVP local); a fábrica continua pura.
 */

import type { MotorNarrativa } from "./contrato.js";
import type { Modos } from "../core/modos.js";
import type { Cenario, GrafoAutoral } from "../core/grafo/tipos.js";
import type { ProvedorIA } from "../ia/provedor.js";
import { MotorGrafoAutoral } from "./motor_a.js";
import { MotorIA } from "./motor_ia.js";
import { criarValidadorOrdem, type ValidadorOrdem } from "./validador_ordem.js";

export type { MotorNarrativa, ValidadorOrdem };

export interface ResultadoFabrica {
  motor: MotorNarrativa;
  ordem: ValidadorOrdem;
}

/** Dependências opcionais da borda (fase05): presença de provedor habilita o Motor B. */
export interface DepsFabrica {
  provedor?: ProvedorIA;
}

/**
 * Cria o par { motor, ordem } para um cenário e configuração de modos.
 *
 * @param cenario - cenário autoral do grafo
 * @param modos - modos da sessão (iaLigada decide A vs B; desfecho vira default do aquecimento)
 * @param deps - opcional; `{ provedor }` liga o Motor B quando iaLigada=true
 * @returns { motor: MotorNarrativa, ordem: ValidadorOrdem }
 */
export function criarMotor(
  cenario: Cenario,
  modos: Modos,
  deps?: DepsFabrica
): ResultadoFabrica {
  const ordem = criarValidadorOrdem(cenario);

  if (modos.iaLigada) {
    const provedor = deps ? deps.provedor : undefined;
    if (provedor) {
      const motor = new MotorIA(provedor, montarGrafoAutoral(cenario), modos.desfecho);
      return { motor, ordem };
    }
    return criarMotorComFallback(cenario, ordem);
  }

  const motor = criarMotorA(cenario);
  return { motor, ordem };
}

/** Wrapper canônico do cenário (compartilhado pelos dois motores). */
function montarGrafoAutoral(cenario: Cenario): GrafoAutoral {
  return {
    esquema: "pipoca.grafo-autoral.v1",
    niveis: { n1: "n1", n2: "n2", n3: "n3", n4: "n4" },
    regra_de_ouro: "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
    cenario,
  };
}

/**
 * Instancia Motor A (grafo autoral) a partir de um cenário.
 * Nenhuma tela chama esta função — apenas a fábrica.
 */
function criarMotorA(cenario: Cenario): MotorNarrativa {
  return new MotorGrafoAutoral(montarGrafoAutoral(cenario));
}

/**
 * iaLigada=true mas sem provedor injetado → Motor A com aviso (fallback
 * seguro — mesmo comportamento do stub pré-fase05).
 */
function criarMotorComFallback(
  cenario: Cenario,
  ordem: ValidadorOrdem
): ResultadoFabrica {
  console.warn(
    "[fabrica] iaLigada=true mas nenhum provedor de IA foi injetado. " +
      "Usando Motor A como fallback seguro."
  );
  const motor = criarMotorA(cenario);
  return { motor, ordem };
}
