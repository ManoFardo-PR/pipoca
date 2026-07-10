/**
 * ⚠️ ANDAIME DESCARTÁVEL — SÓ DESTE EXPERIMENTO. ⚠️
 * Avaliação de condições da gramática v3 + seleção D5, no mínimo necessário
 * para montar o prompt da validação em escala. É PROIBIDO promover este
 * arquivo (ou cópia dele) a src/core/compositor|geracao — o compositor de
 * produção nasce na fase 11 guiado pelos docs de docs/plans02 (fase 11), não por aqui.
 * Semântica espelhada de src/core/composicao.ts:200-231 (verificada).
 */

import type { FichaRelacao } from "../../src/core/fichas/tipos.js";
import type { RelacaoAtiva } from "./tipos.js";

export function avaliarCondicao(cond: string, objId: string, linha: string[]): boolean {
  const c = String(cond || "");
  const i = linha.indexOf(objId);
  if (c.startsWith("tem:")) {
    const alvo = c.slice(4);
    return alvo !== objId && linha.indexOf(alvo) !== -1; // guarda do tem: (v3 :205)
  }
  if (c.startsWith("nao_tem:")) return linha.indexOf(c.slice(8)) === -1;
  if (c === "pos:inicio") return i === 0 && linha.length > 0;
  if (c === "pos:fim") return i !== -1 && i === linha.length - 1;
  if (c === "pos:miolo") return i > 0 && i < linha.length - 1;
  if (c.startsWith("antes_de:")) {
    const j = linha.indexOf(c.slice(9));
    return i !== -1 && j !== -1 && i < j;
  }
  if (c.startsWith("depois_de:")) {
    const j = linha.indexOf(c.slice(10));
    return i !== -1 && j !== -1 && i > j;
  }
  return false; // func:* e desconhecidas: aceitas, nunca casam (v3 :221-222)
}

export function casaSe(se: string | string[], objId: string, linha: string[]): boolean {
  const conds = Array.isArray(se) ? se : [se];
  if (conds.length === 0) return false;
  return conds.every((c) => avaliarCondicao(c, objId, linha));
}

/**
 * Seleção D5 (10-02, decisão fixada): candidatas que casam → maior
 * especificidade (nº de condições no se) vence → desempate pela ordem do
 * array → teto de 2 por história.
 */
export function selecionarRelacoes(relacoes: FichaRelacao[], linha: string[]): RelacaoAtiva[] {
  const candidatas: Array<RelacaoAtiva & { indice: number }> = [];
  relacoes.forEach((relacao, indice) => {
    if (!linha.includes(relacao.objeto)) return;
    if (!casaSe(relacao.se, relacao.objeto, linha)) return;
    const especificidade = Array.isArray(relacao.se) ? relacao.se.length : 1;
    candidatas.push({ relacao, especificidade, indice });
  });
  candidatas.sort((a, b) => b.especificidade - a.especificidade || a.indice - b.indice);
  return candidatas.slice(0, 2).map(({ relacao, especificidade }) => ({ relacao, especificidade }));
}

/** Papel por posição (pontas travadas desde a R1 — composicao.ts:475-488). */
export function derivarPapel(indice: number, tamanho: number): "abertura" | "miolo" | "fecho" {
  if (indice === 0) return "abertura";
  if (indice === tamanho - 1 && tamanho > 1) return "fecho";
  return "miolo";
}

/** Parágrafos-alvo por rodada (D-12.1, tabela-semente do 12-01). */
export function paragrafosPorRodada(rodada: 1 | 2 | 3 | 4): [number, number] {
  if (rodada === 1) return [1, 1];
  if (rodada === 2) return [1, 2];
  return [2, 2];
}

/** Teto de palavras por parágrafo, por nível (tabela do 11-00). */
export const PALAVRAS_POR_PARAGRAFO: Record<string, number> = {
  n1: 25,
  n2: 40,
  n3: 55,
  n4: 70,
};

/**
 * Orçamento de palavras PROPORCIONAL ao material (C-1 da recalibração).
 * O alvo fixo por célula estrangulava o realizador (R1-n1: ~110 palavras de
 * material contra 1×25 ⇒ compressão 4–5× ⇒ telegrama). Tabela-SEMENTE,
 * calibrável após a leitura da Parada Dura 2.
 */
export const FATOR_MATERIAL = 0.45;

/** Piso de palavras por nível (tabela-semente calibrável). */
export const PISO_PALAVRAS: Record<string, number> = {
  n1: 35,
  n2: 50,
  n3: 65,
  n4: 80,
};

/** Teto de palavras por nível × rodada — índices 0..3 = R1..R4 (tabela-semente calibrável). */
export const TETO_PALAVRAS: Record<string, [number, number, number, number]> = {
  n1: [60, 75, 90, 110],
  n2: [80, 100, 120, 145],
  n3: [100, 125, 150, 180],
  n4: [120, 150, 185, 220],
};

/** alvo = clamp(round(material × FATOR_MATERIAL), piso[nivel], teto[nivel][rodada]). */
export function alvoPalavras(palavrasMaterial: number, nivel: string, rodada: 1 | 2 | 3 | 4): number {
  const piso = PISO_PALAVRAS[nivel];
  const tetos = TETO_PALAVRAS[nivel];
  if (piso === undefined || !tetos) throw new Error(`nível sem orçamento de palavras: ${nivel}`);
  const teto = tetos[rodada - 1];
  const proporcional = Math.round(palavrasMaterial * FATOR_MATERIAL);
  return Math.min(Math.max(proporcional, piso), teto);
}
