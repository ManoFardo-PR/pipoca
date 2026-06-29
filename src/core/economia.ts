/**
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
  objetosCreditados: string[];
}

/** Estado inicial da economia. */
export const economiaInicial: Economia = {
  vagalumes: 0,
  poupado: 0,
  objetosCreditados: [],
};

/**
 * Credita n vaga-lumes por um objeto lido.
 * Idempotente: se objetoId já está em objetosCreditados, não credita de novo.
 * @param economia - estado atual
 * @param n - quantidade a creditar
 * @param objetoId - id do objeto que gerou a recompensa
 */
export function creditarVagalumes(
  economia: Economia,
  n: number,
  objetoId: string
): Economia {
  if (economia.objetosCreditados.includes(objetoId)) {
    return economia;
  }
  return {
    ...economia,
    vagalumes: economia.vagalumes + Math.max(0, n),
    objetosCreditados: [...economia.objetosCreditados, objetoId],
  };
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

/** Percentual gasto em relação ao total (0–1). */
export function spendPct(economia: Economia): number {
  const total = economia.vagalumes + economia.poupado;
  if (total === 0) return 0;
  return economia.poupado / total;
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
    objetosCreditados: Array.isArray(r["objetosCreditados"])
      ? (r["objetosCreditados"] as unknown[]).filter((v) => typeof v === "string") as string[]
      : [],
  };
}
