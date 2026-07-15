/**
 * [gramatica.ts] — Gramática de decisão do compositor: avalia as condições `se` e
 *   SELECIONA as fichas de relação que entram no Pacote (decide arranjo, não redação).
 *
 * PAPEL: core-lógica (compositor · fase 11 · espelho semântico do v3)
 * POR QUE EXISTE: o compositor precisa decidir QUAIS relações objeto×objeto valem
 *   para a linha da criança; reimplementa a gramática do v3 (mesma semântica) para
 *   manter os módulos independentes, mas com EFEITO diferente (seleciona fichas).
 * ENTRA: condição `se` (string|string[]), objeto dono e a linha de objetos; para a
 *   seleção, a lista de FichaRelacao (objeto_x_objeto) e a linha.
 * SAI: booleanos de casamento (avaliarCondicao/casaSe), as ≤2 relações vencedoras por
 *   Pacote (selecionarRelacoes) e o eco de arranjo (derivarEco).
 * CHAMA: fichas/tipos.ts:FichaRelacao (tipo), compositor/pacote.ts:EstadoCompositor
 *   (tipo). Nada em runtime — funções puras.
 * É CHAMADO POR: compositor/compor.ts (selecionarRelacoes, derivarEco),
 *   compositor.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/compositor/compositor.test.ts` (dentro de `bun run test`).
 * CUIDADO: semântica ESPELHADA do v3 (composicao.ts:200-231) — divergir aqui quebra a
 *   paridade; `func:*` e qualquer condição desconhecida NUNCA casam e nunca lançam; o
 *   teto de 2 relações é POR PACOTE, não por beat; desempate é pela ordem do array.
 *
 * — detalhe preservado —
 * Pipoca — Gramática de decisão do compositor (gramatica.ts)
 * ----------------------------------------------------------
 * A gramática do v3 REIMPLEMENTADA com semântica idêntica — não importada — para
 * manter os módulos independentes (fase11-11-02). Fonte da semântica:
 * `src/core/composicao.ts:200-231` (`avaliarCondicao`/`casaSe`, o v3 intocável).
 * O que muda é o EFEITO: aqui as condições selecionam FICHAS DE RELAÇÃO,
 * nunca temperos-frase.
 */

import type { FichaRelacao } from "../fichas/tipos.js";
import type { EstadoCompositor } from "./pacote.js";

/** Teto de relações POR PACOTE, não por beat (D5 de fase10-10-02). */
export const TETO_RELACOES_POR_PACOTE = 2;

/**
 * Avalia uma condição da gramática — espelho de `composicao.ts:200-223`:
 * `tem:X` com guarda contra o próprio objeto (`alvo !== objId`, :205);
 * `antes_de:`/`depois_de:` exigem AMBOS na linha (:213-220);
 * `func:*` (reservado) e qualquer condição desconhecida nunca casam, nunca lançam.
 */
export function avaliarCondicao(cond: string, objId: string, linha: string[]): boolean {
  const c = String(cond || "");
  const i = linha.indexOf(objId);
  if (c.indexOf("tem:") === 0) {
    const alvo = c.slice(4);
    return alvo !== objId && linha.indexOf(alvo) !== -1;
  }
  if (c.indexOf("nao_tem:") === 0) {
    return linha.indexOf(c.slice(8)) === -1;
  }
  if (c === "pos:inicio") return i === 0 && linha.length > 0;
  if (c === "pos:fim") return i !== -1 && i === linha.length - 1;
  if (c === "pos:miolo") return i > 0 && i < linha.length - 1;
  if (c.indexOf("antes_de:") === 0) {
    const j = linha.indexOf(c.slice(9));
    return i !== -1 && j !== -1 && i < j;
  }
  if (c.indexOf("depois_de:") === 0) {
    const j = linha.indexOf(c.slice(10));
    return i !== -1 && j !== -1 && i > j;
  }
  return false;
}

/** `se` string vira [se]; array vazio NUNCA casa; array = E lógico (composicao.ts:226-231). */
export function casaSe(se: string | string[], objId: string, linha: string[]): boolean {
  const conds = Array.isArray(se) ? se : [se];
  if (conds.length === 0) return false;
  return conds.every((c) => avaliarCondicao(c, objId, linha));
}

/** Especificidade D5 = número de condições no `se`. */
function especificidade(se: string | string[]): number {
  return Array.isArray(se) ? se.length : 1;
}

/**
 * Seleção D5 (fase11-11-02): candidatas (condição casa, avaliada aqui — o Pacote
 * sai sem `se`) → maior especificidade vence → desempate pela ordem do array
 * (herdeira do primeiro-que-casa do v3) → teto de 2 por Pacote.
 * Guarda defensiva além da semântica: relação com `objeto` ou `alvo` fora da
 * linha nunca entra (fase11-11-01, edge-cases).
 */
export function selecionarRelacoes(relacoes: FichaRelacao[], linha: string[]): FichaRelacao[] {
  const candidatas = relacoes
    .map((relacao, indice) => ({ relacao, indice }))
    .filter(
      ({ relacao }) =>
        linha.indexOf(relacao.objeto) !== -1 &&
        linha.indexOf(relacao.alvo) !== -1 &&
        casaSe(relacao.se, relacao.objeto, linha)
    );
  candidatas.sort((a, b) => {
    const porEspecificidade = especificidade(b.relacao.se) - especificidade(a.relacao.se);
    return porEspecificidade !== 0 ? porEspecificidade : a.indice - b.indice;
  });
  return candidatas.slice(0, TETO_RELACOES_POR_PACOTE).map((c) => c.relacao);
}

/**
 * Ecos traduzidos (fase11-11-02): o compositor NÃO seleciona fragmento de texto —
 * decide o ARRANJO. Desfecho aberto → `{abre_com: linha[0], fecha_com: última}`
 * (linha de 1 objeto: iguais, legal); convergente → `null`. A redação do eco
 * migra para o realizador.
 */
export function derivarEco(
  estado: EstadoCompositor
): { abre_com: string; fecha_com: string } | null {
  if (estado.desfecho !== "aberto" || estado.linha.length === 0) return null;
  return { abre_com: estado.linha[0], fecha_com: estado.linha[estado.linha.length - 1] };
}
