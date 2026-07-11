/**
 * Experimento fichas→histórias — a matriz de estados: rodada(R1..R4) ×
 * nível(n1..n4) × 6 estados por célula (3 Joana/f + 3 Pietro/m — eixo de
 * gênero do veredito A-1) + a testemunha da tira real (R4×n3).
 * Linha montada com as regras de rodada do v3 (R1 ordena 3 de 4; R2+ insere
 * no miolo), via rng seedado do experimento-beats (import somente-leitura).
 */

import type { NivelKey } from "../../src/core/composicao.js";
import { criarRng, embaralhar, indiceAleatorio } from "../beats-para-paragrafos/rng.js";
import type { EstadoExperimento, GeneroPersonagem } from "./tipos.js";

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];
const RODADAS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const REVELA_R1 = ["vagalume", "frasco", "vento", "folha"];
const INSERE: Record<number, string> = { 2: "gato", 3: "lua", 4: "orvalho" };
export const ESTADOS_POR_CELULA = 6;

/** A linha da tira real (fumaça manual da revisão A2) — testemunha R4×n3. */
export const LINHA_TESTEMUNHA = ["vagalume", "frasco", "lua", "gato", "vento", "folha"];

function montarLinha(rodada: 1 | 2 | 3 | 4, seedBase: number | string, id: string): { linha: string[]; seed: number } {
  const { seed, rng } = criarRng(seedBase, id);
  // R1: embaralha os 4 revelados e fica com 3, na ordem (pontas travadas dali em diante).
  const linha = embaralhar(REVELA_R1, rng).slice(0, 3);
  for (let r = 2; r <= rodada; r++) {
    const objeto = INSERE[r];
    if (!objeto) continue;
    const slot = 1 + indiceAleatorio(linha.length - 1, rng); // só miolo (1..len-1)
    linha.splice(slot, 0, objeto);
  }
  return { linha, seed };
}

export function montarMatriz(
  temperatura: number,
  seedBase: number | string = 42,
  estadosPorCelula: number = ESTADOS_POR_CELULA
): EstadoExperimento[] {
  const estados: EstadoExperimento[] = [];
  for (const rodada of RODADAS) {
    for (const nivel of NIVEIS) {
      // estadosPorCelula < 6 = modo AMOSTRA (12-05): mesmos ids/seeds/linhas dos
      // primeiros p da matriz cheia — a amostra é um prefixo da matriz, não outra.
      for (let p = 0; p < estadosPorCelula; p++) {
        const genero: GeneroPersonagem = p % 2 === 0 ? "f" : "m";
        const personagem = genero === "f" ? "Joana" : "Pietro";
        const id = `r${rodada}-${nivel}-${genero}-p${String(p + 1).padStart(2, "0")}`;
        const { linha, seed } = montarLinha(rodada, seedBase, id);
        estados.push({ id, seed, rodada, nivel, genero, personagem, linha, temperatura });
      }
    }
  }
  const { seed } = criarRng(seedBase, "testemunha");
  estados.push({
    id: "r4-n3-f-testemunha",
    seed,
    rodada: 4,
    nivel: "n3",
    genero: "f",
    personagem: "Joana",
    linha: LINHA_TESTEMUNHA.slice(),
    temperatura,
    testemunha: true,
  });
  return estados;
}
