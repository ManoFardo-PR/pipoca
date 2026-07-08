/**
 * Experimento B1.5 — matriz de amostragem: 4 níveis × N partidas por nível.
 * Cada partida percorre as 4 rodadas (ver linha-aleatoria.ts), cobrindo a
 * matriz 4 rodadas × 4 níveis com ~N estados por célula.
 */

import type { NivelKey } from "../../src/core/composicao.js";

export interface SpecPartida {
  partidaId: string;
  nivel: NivelKey;
}

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];

export function montarMatriz(playthroughsPorNivel: number): SpecPartida[] {
  const specs: SpecPartida[] = [];
  for (const nivel of NIVEIS) {
    for (let i = 0; i < playthroughsPorNivel; i++) {
      specs.push({ partidaId: `${nivel}-p${String(i + 1).padStart(2, "0")}`, nivel });
    }
  }
  return specs;
}

export const ID_TESTEMUNHA = "testemunha-r4-n3";
