/**
 * [economia.ts] — Economia de vaga-lumes: creditar/gastar o token do esforço + sugestões
 *   de gastar/poupar, tudo em funções puras e imutáveis.
 *
 * PAPEL: core-lógica (economia de vaga-lumes · ECON)
 * POR QUE EXISTE: os vaga-lumes são o registro visível do esforço da criança; este módulo
 *   guarda o saldo e as regras (2/3 gastar · 1/3 poupar) sem variabilidade manipulativa.
 * ENTRA: Economia { vagalumes, poupado }, n (creditar/gastar), raw (normalizar/validar).
 * SAI: nova Economia (imutável), resultado de gasto (ok/faltam), sugestões (spend/save/pct),
 *   erros de validação.
 * CHAMA: nada externo — funções puras de soma.
 * É CHAMADO POR: src/core/estado.ts (tipo Economia), src/dados/schemas.ts, src/app/bridge.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); coberto de forma transversal em `bun run test`.
 * CUIDADO: a IDEMPOTÊNCIA mora na BORDA — creditarVagalumes credita 1x por objeto commitado;
 *   a Economia NÃO guarda ledger próprio (a fonte de verdade é HISTORIA.objetos, lei-do-contrato #3).
 *   Saldo nunca fica < 0 (gastarVagalumes recusa e informa `faltam`). Sem dark patterns.
 *
 * — detalhe preservado —
 * Pipoca — Economia de vaga-lumes (ECON)
 * ----------------------------------------
 * Vaga-lumes como token colecionável-narrativo: registro visível do esforço.
 * Regra 2/3 gastar · 1/3 poupar: sugestão calma, não obrigação.
 * Idempotência: um objeto commitado credita exatamente uma vez.
 * Sem dark patterns: sem variabilidade manipulativa.
 *
 * Mapeamento do protótipo:
 *   fireflies → economia.vagalumes
 *   saved     → economia.poupado
 */

export interface Economia {
  vagalumes: number;
  poupado: number;
}

/** Estado inicial da economia. */
export const economiaInicial: Economia = {
  vagalumes: 0,
  poupado: 0,
};

/**
 * Credita n vaga-lumes (transação ECON). Função pura de soma.
 *
 * IDEMPOTÊNCIA: o crédito acontece UMA vez por objeto commitado. A garantia mora na borda
 * (T6/recompensa), que credita só quando o objeto entra em `HISTORIA.objetos` — a única fonte
 * de verdade da história ([[lei-do-contrato]] #3). Por isso a Economia não guarda ledger próprio.
 * @param economia - estado atual
 * @param n - quantidade a creditar (piso 0)
 */
export function creditarVagalumes(economia: Economia, n: number): Economia {
  return { ...economia, vagalumes: economia.vagalumes + Math.max(0, n) };
}

/**
 * Gasta n vaga-lumes. Saldo nunca fica abaixo de 0.
 * @returns nova economia ou null se saldo insuficiente
 */
export function gastarVagalumes(
  economia: Economia,
  n: number
): { economia: Economia; ok: boolean; faltam: number } {
  const custo = Math.max(0, n);
  if (custo > economia.vagalumes) {
    return {
      economia,
      ok: false,
      faltam: custo - economia.vagalumes,
    };
  }
  return {
    economia: { ...economia, vagalumes: economia.vagalumes - custo },
    ok: true,
    faltam: 0,
  };
}

/** Sugestão de quanto gastar (~2/3 do total). */
export function spendSuggest(economia: Economia): number {
  const total = economia.vagalumes + economia.poupado;
  return Math.round(total * (2 / 3));
}

/** Sugestão de quanto poupar (~1/3 do total). */
export function saveSuggest(economia: Economia): number {
  const total = economia.vagalumes + economia.poupado;
  return total - spendSuggest(economia);
}

/** Fração do total sugerida para GASTAR (0–1) — espelha spendSuggest (~2/3). */
export function spendPct(economia: Economia): number {
  const total = economia.vagalumes + economia.poupado;
  if (total === 0) return 0;
  return spendSuggest(economia) / total;
}

/** Valida um objeto Economia candidato. Retorna lista de erros. */
export function validarEconomia(e: unknown): string[] {
  const erros: string[] = [];
  if (typeof e !== "object" || e === null) return ["economia deve ser objeto"];
  const r = e as Record<string, unknown>;
  if (typeof r["vagalumes"] !== "number" || r["vagalumes"] < 0) erros.push("vagalumes deve ser número >= 0");
  if (typeof r["poupado"] !== "number" || r["poupado"] < 0) erros.push("poupado deve ser número >= 0");
  return erros;
}

/** Normaliza uma Economia candidata, corrigindo campos inválidos. */
export function normalizarEconomia(raw: unknown): Economia {
  if (typeof raw !== "object" || raw === null) return { ...economiaInicial };
  const r = raw as Record<string, unknown>;
  return {
    vagalumes: typeof r["vagalumes"] === "number" && r["vagalumes"] >= 0
      ? r["vagalumes"]
      : 0,
    poupado: typeof r["poupado"] === "number" && r["poupado"] >= 0
      ? r["poupado"]
      : 0,
  };
}
