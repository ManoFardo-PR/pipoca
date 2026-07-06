/**
 * Pipoca — Feature flags globais e kill-switches (SA_SAFE) · doc fase04-04-06
 * ----------------------------------------------------------------------------
 * Mapa nome→bool com DEFAULTS SEGUROS para crianças (IA e fala desligadas até
 * decisão deliberada). `killSwitch` força um recurso a desligado; a leitura é
 * fail-closed para recursos sensíveis desconhecidos. `aplicarFlagsAosModos`
 * é o efeito canônico sobre a narrativa: flag global de IA desligada IGNORA
 * `Modos.iaLigada` (o cuidador autoriza, mas a plataforma tem a palavra final).
 */

import type { StorageLike } from "./auth/tiposAdmin.js";
import type { Modos } from "../core/modos.js";

export type FeatureFlags = Record<string, boolean>;

/** Defaults seguros: IA/fala desligadas; conteúdo customizado e telemetria ligados. */
export const FLAGS_PADRAO: FeatureFlags = {
  ia: false,
  fala: false,
  conteudoCustomizado: true,
  telemetria: true,
};

/** Liga/desliga uma flag (puro — devolve novo mapa). */
export function definirFlag(flags: FeatureFlags, nome: string, valor: boolean): FeatureFlags {
  return { ...flags, [nome]: !!valor };
}

/** Kill-switch: força o recurso a DESLIGADO (puro). */
export function killSwitch(flags: FeatureFlags, recurso: string): FeatureFlags {
  return { ...flags, [recurso]: false };
}

/** O recurso está desligado? Fail-closed: flag ausente/estranha conta como desligada. */
export function killSwitchAtivo(flags: FeatureFlags, recurso: string): boolean {
  return flags[recurso] !== true;
}

/**
 * Efeito das flags sobre os Modos da sessão (regra 1 do doc):
 * — IA global desligada → `iaLigada` vira false, ignorando a autorização do
 *   cuidador; ligada → respeita `Modos.iaLigada`.
 * — Fala global desligada (fase05) → `verificacao: "fala"` degrada para
 *   "cuidador" (o portão nunca fica sem caminho); outras verificações intactas.
 * Sempre devolve cópia; a intenção original do cuidador nunca é mutada.
 */
export function aplicarFlagsAosModos(modos: Modos, flags: FeatureFlags): Modos {
  const efetivos = { ...modos };
  if (killSwitchAtivo(flags, "ia")) efetivos.iaLigada = false;
  if (killSwitchAtivo(flags, "fala") && efetivos.verificacao === "fala") efetivos.verificacao = "cuidador";
  return efetivos;
}

// ─── Persistência local (MVP) ────────────────────────────────────────────────

const CHAVE_FLAGS = "pipoca.admin.flags.v1";

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Saneia um mapa de flags vindo de fora (storage OU servidor): parte dos
 * defaults seguros e só aceita valores booleanos. Corrompido → FLAGS_PADRAO.
 */
export function normalizarFlags(raw: unknown): FeatureFlags {
  const limpo: FeatureFlags = { ...FLAGS_PADRAO };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "boolean") limpo[k] = v;
    }
  }
  return limpo;
}

/** Ausente/corrompido → FLAGS_PADRAO (defaults seguros). */
export function carregarFlags(armazem?: StorageLike): FeatureFlags {
  const st = armazem ?? storagePadrao();
  if (!st) return { ...FLAGS_PADRAO };
  try {
    const raw = st.getItem(CHAVE_FLAGS);
    if (raw === null) return { ...FLAGS_PADRAO };
    return normalizarFlags(JSON.parse(raw) as unknown);
  } catch {
    return { ...FLAGS_PADRAO };
  }
}

export function salvarFlags(flags: FeatureFlags, armazem?: StorageLike): void {
  const st = armazem ?? storagePadrao();
  if (!st) return;
  try {
    st.setItem(CHAVE_FLAGS, JSON.stringify(flags));
  } catch {
    /* degradação silenciosa */
  }
}
