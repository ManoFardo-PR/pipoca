/**
 * [limites.ts] — Limites do cuidador: bloco de foco (Pomodoro) + tempo de tela diário
 *   opcional, com normalização e reinício do timer da sessão.
 *
 * PAPEL: core-lógica (limites: tempo de tela + bloco de foco · PC_LIM)
 * POR QUE EXISTE: encapsular as regras de tempo que o cuidador ajusta, sem castigo — o fim
 *   do bloco é um encerramento calmo, não uma interrupção.
 * ENTRA: Sessao, blocoMin (BlocoMin), agora (epoch ms da borda), raw (normalizar).
 * SAI: Limites normalizado (LIMITES_PADRAO como base), Sessao reiniciada com o novo bloco.
 * CHAMA: ./sessao.js:{iniciarSessao, normalizarBlocoMin, BlocoMin, Sessao}.
 * É CHAMADO POR: src/core/estado.ts (tipo Limites), src/dados/schemas.ts, src/app/bridge.ts,
 *   src/core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: o fim do bloco é encerramento calmo — a história em curso NÃO é interrompida.
 *   blocoMin mora na Sessao (SESS); o tempo de tela é config à parte (null = sem limite).
 *   `agora` vem da borda.
 *
 * — detalhe preservado —
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
