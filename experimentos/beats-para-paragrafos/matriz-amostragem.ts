/**
 * [matriz-amostragem.ts] — define o plano de amostragem do experimento B1.5:
 *   4 níveis × N partidas por nível, mais o id do estado-testemunha.
 *
 * PAPEL: experimento (B1.5 · offline)
 * POR QUE EXISTE: enumerar de forma determinística as partidas a gerar, para
 *   cobrir a matriz 4 rodadas × 4 níveis com ~N estados por célula.
 * ENTRA: playthroughsPorNivel (N).
 * SAI: SpecPartida[] (montarMatriz) e a constante ID_TESTEMUNHA.
 * CHAMA: src/core/composicao.js (só o tipo NivelKey).
 * É CHAMADO POR: gerar-historias.ts (montarMatriz, ID_TESTEMUNHA);
 *   gerar-historias.test.ts.
 * RODA POR: importado por gerar-historias.ts (dentro do gerador).
 *
 * — detalhe preservado —
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
