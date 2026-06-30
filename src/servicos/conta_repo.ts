/**
 * Pipoca — Persistência da conta/sessão da família (HH_LOGIN) · doc fase02-02-01
 * ------------------------------------------------------------------------------
 * A `RepositorioPersistencia` (seam SAVE) cuida de perfis/saves/telemetria; conta e sessão
 * são nível dispositivo/família (como o acesso/PIN) — guardadas aqui, centralizado, sem
 * `localStorage` ad-hoc espalhado. localStorage no MVP; o núcleo (contaFamilia.ts) é puro.
 *
 * Chaves: `pipoca.conta.v1`, `pipoca.sessao-conta.v1`.
 */

import type { ContaFamilia, SessaoConta } from "../core/contaFamilia.js";

const CHAVE_CONTA = "pipoca.conta.v1";
const CHAVE_SESSAO = "pipoca.sessao-conta.v1";

export function carregarConta(): ContaFamilia | null {
  try {
    const raw = localStorage.getItem(CHAVE_CONTA);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (p && typeof p["id"] === "string" && typeof p["email"] === "string" && typeof p["criadaEm"] === "number") {
      return { id: p["id"] as string, email: p["email"] as string, criadaEm: p["criadaEm"] as number };
    }
  } catch {
    /* corrompido → null */
  }
  return null;
}

export function salvarConta(conta: ContaFamilia): void {
  try {
    localStorage.setItem(CHAVE_CONTA, JSON.stringify(conta));
  } catch {
    /* degrada em silêncio */
  }
}

export function carregarSessaoConta(): SessaoConta | null {
  try {
    const raw = localStorage.getItem(CHAVE_SESSAO);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (
      p &&
      typeof p["contaId"] === "string" &&
      typeof p["autenticadaEm"] === "number" &&
      typeof p["expiraEm"] === "number"
    ) {
      return {
        contaId: p["contaId"] as string,
        autenticadaEm: p["autenticadaEm"] as number,
        expiraEm: p["expiraEm"] as number,
      };
    }
  } catch {
    /* corrompido → null */
  }
  return null;
}

export function salvarSessaoConta(sessao: SessaoConta): void {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    /* degrada em silêncio */
  }
}

/** Logout: remove a sessão de conta (mantém a conta cadastrada). */
export function limparSessaoConta(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* nada */
  }
}
