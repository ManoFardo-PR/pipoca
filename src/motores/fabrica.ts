/**
 * Pipoca — Fábrica de motor (fase00-00-19)
 * -----------------------------------------
 * Único ponto de escolha Motor A ↔ Motor B.
 * MVP: sempre Motor A (grafo autoral).
 * Fase05: ramo iaLigada + provedor disponível → Motor B.
 *
 * LEI DO SEAM: telas NUNCA importam MotorGrafoAutoral diretamente.
 * Recebem { motor, ordem } por injeção (props/contexto CORE).
 *
 * Degradação: se Motor B falhar (fase05), cai para Motor A com aviso.
 */

import type { MotorNarrativa } from "./contrato.js";
import type { Modos } from "../core/modos.js";
import type { Cenario, GrafoAutoral } from "../core/grafo/tipos.js";
import { MotorGrafoAutoral } from "./motor_a.js";
import { criarValidadorOrdem, type ValidadorOrdem } from "./validador_ordem.js";

export type { MotorNarrativa, ValidadorOrdem };

export interface ResultadoFabrica {
  motor: MotorNarrativa;
  ordem: ValidadorOrdem;
}

/**
 * Cria o par { motor, ordem } para um cenário e configuração de modos.
 *
 * @param cenario - cenário autoral do grafo
 * @param modos - modos da sessão (iaLigada decide A vs B)
 * @returns { motor: MotorNarrativa, ordem: ValidadorOrdem }
 */
export function criarMotor(
  cenario: Cenario,
  modos: Modos
): ResultadoFabrica {
  const ordem = criarValidadorOrdem(cenario);

  if (modos.iaLigada) {
    return criarMotorComFallback(cenario, ordem);
  }

  const motor = criarMotorA(cenario);
  return { motor, ordem };
}

/**
 * Instancia Motor A (grafo autoral) a partir de um cenário.
 * Nenhuma tela chama esta função — apenas a fábrica.
 */
function criarMotorA(cenario: Cenario): MotorNarrativa {
  const grafo: GrafoAutoral = {
    esquema: "pipoca.grafo-autoral.v1",
    niveis: { n1: "n1", n2: "n2", n3: "n3", n4: "n4" },
    regra_de_ouro: "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
    cenario,
  };
  return new MotorGrafoAutoral(grafo);
}

/**
 * Stub do ramo Motor B (fase05).
 * iaLigada=true mas sem provedor configurado → Motor A com aviso.
 */
function criarMotorComFallback(
  cenario: Cenario,
  ordem: ValidadorOrdem
): ResultadoFabrica {
  console.warn(
    "[fabrica] iaLigada=true mas Motor B não está disponível (fase05). " +
      "Usando Motor A como fallback seguro."
  );
  const motor = criarMotorA(cenario);
  return { motor, ordem };
}
