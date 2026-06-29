/**
 * Pipoca — Motor A (Grafo Autoral)
 * ---------------------------------
 * Implementa MotorNarrativa lendo um grafo autoral (ex.: quintal_grafo.json),
 * SEM IA e SEM reconhecimento de fala. É a fatia verde do diagrama.
 *
 * LEI DO SEAM: telas NUNCA importam este arquivo diretamente.
 * Falam com a interface MotorNarrativa (src/motores/contrato.ts).
 */

import type {
  MotorNarrativa,
  Trecho,
  Nivel,
  ModoDesfecho,
} from "./contrato.js";

import type {
  GrafoAutoral,
  Cenario,
  Objeto,
} from "../core/grafo/tipos.js";

export type { MotorNarrativa, Trecho, Nivel, ModoDesfecho };
export type { GrafoAutoral, Cenario, Objeto };

export class MotorGrafoAutoral implements MotorNarrativa {
  private readonly cen: Cenario;
  private readonly objIndex: Map<string, Objeto>;

  constructor(grafo: GrafoAutoral) {
    this.cen = grafo.cenario;
    this.objIndex = new Map(this.cen.objetos.map((o) => [o.id, o]));
  }

  abertura(nivel: Nivel): Trecho {
    return { texto: this.cen.abertura[nivel], ehFinal: false };
  }

  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho {
    const obj = this.objIndex.get(objetoId);
    if (!obj) return { texto: "", ehFinal: false, objetoId };

    const regra = obj.regras.find((r) => this.avaliaCondicao(r.se, historia));
    const frag = regra ? regra.entao : obj.gatilho;
    return { texto: frag[nivel], ehFinal: false, objetoId };
  }

  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho {
    if (modo === "aberto") {
      const ultimo = historia[historia.length - 1];
      const aberto = this.cen.desfechos.aberto.find((a) => a.se_terminou_com === ultimo);
      if (aberto) return { texto: aberto.fragmento[nivel], ehFinal: true };
    }
    return { texto: this.cen.desfechos.convergente[nivel], ehFinal: true };
  }

  private avaliaCondicao(cond: string, historia: string[]): boolean {
    const colonIdx = cond.indexOf(":");
    if (colonIdx === -1) return false;
    const op = cond.slice(0, colonIdx);
    const alvo = cond.slice(colonIdx + 1);
    const presente = historia.includes(alvo);
    if (op === "tem") return presente;
    if (op === "nao_tem") return !presente;
    return false;
  }
}
