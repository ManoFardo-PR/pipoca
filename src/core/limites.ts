/**
 * Pipoca — Limites: tempo de tela e bloco de foco (PC_LIM) · doc fase02-02-06
 * ---------------------------------------------------------------------------
 * Bloco curto e visível (Pomodoro) + tempo de tela diário opcional. Sem castigo: o fim do
 * bloco é encerramento calmo (a história em curso não é interrompida). `blocoMin` mora na
 * `Sessao` (SESS); o tempo de tela é configuração à parte. `agora` vem da borda.
 */

import type { BlocoMin, Sessao } from "./sessao.js";
import { iniciarSessao, normalizarBlocoMin } from "./sessao.js";

export interface Limites {
  blocoMin: BlocoMin;
  tempoDeTelaMin: number | null; // limite diário (min); null = sem limite
}

export const LIMITES_PADRAO: Limites = { blocoMin: 15, tempoDeTelaMin: null };

/** Redefine o bloco de foco reiniciando o timer da sessão com o novo bloco. */
export function definirBlocoFoco(sessao: Sessao, blocoMin: BlocoMin, agora: number): Sessao {
  return iniciarSessao(sessao.perfilId, blocoMin, agora);
}

/** Normaliza o tempo de tela diário (minutos): número > 0 ou null. */
export function normalizarTempoDeTela(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor);
}

export function normalizarLimites(raw: unknown): Limites {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    blocoMin: normalizarBlocoMin(r["blocoMin"]),
    tempoDeTelaMin: normalizarTempoDeTela(r["tempoDeTelaMin"]),
  };
}
