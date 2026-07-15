/**
 * [acesso_repo.ts] — persiste o estado do acesso parental (PIN + lockout) no
 *   localStorage, no nível do dispositivo/família.
 *
 * PAPEL: core-lógica (serviço de persistência · PINGATE)
 * POR QUE EXISTE: o núcleo acesso.ts é puro; alguém precisa guardar/ler o
 *   EstadoAcesso sem espalhar localStorage ad-hoc, degradando em silêncio.
 * ENTRA: EstadoAcesso a salvar; nada para ler (lê da chave pipoca.acesso.v1).
 * SAI: carregarAcesso() → EstadoAcesso (acessoInicial se vazio/corrompido),
 *   salvarAcesso(), temPin() → boolean.
 * CHAMA: ../core/acesso.js:{EstadoAcesso, acessoInicial}.
 * É CHAMADO POR: app/bridge.ts (carregarAcesso, salvarAcesso, temPin).
 * RODA POR: boot do app (via pipoca.bundle.js) e testes.
 * CUIDADO: leitura/escrita degradam em silêncio (quota/indisponível) — corrompido
 *   vira acessoInicial; nunca lança, nunca trava a UI.
 *
 * — detalhe preservado —
 * Pipoca — Persistência do acesso parental (PINGATE) · doc fase02-02-03
 * ---------------------------------------------------------------------
 * Guarda o `EstadoAcesso` (PIN + lockout) no nível do dispositivo/família — NÃO por perfil
 * (o PIN protege a saída do modo criança). localStorage no MVP; o núcleo (acesso.ts) é puro.
 *
 * Chave `pipoca.acesso.v1`. Recuperação/troca de PIN entram com o login da família (02-01).
 */

import type { EstadoAcesso } from "../core/acesso.js";
import { acessoInicial } from "../core/acesso.js";

const CHAVE_ACESSO = "pipoca.acesso.v1";

/** Lê o estado de acesso (PIN/tentativas/bloqueio). Sem nada salvo → acessoInicial. */
export function carregarAcesso(): EstadoAcesso {
  try {
    const raw = localStorage.getItem(CHAVE_ACESSO);
    if (!raw) return { ...acessoInicial };
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (p && typeof p === "object") {
      return {
        pinHash: typeof p["pinHash"] === "string" ? (p["pinHash"] as string) : null,
        tentativas: typeof p["tentativas"] === "number" ? (p["tentativas"] as number) : 0,
        bloqueioAte: typeof p["bloqueioAte"] === "number" ? (p["bloqueioAte"] as number) : 0,
      };
    }
  } catch {
    /* corrompido → padrão */
  }
  return { ...acessoInicial };
}

/** Grava o estado de acesso. Degrada em silêncio (quota/indisponível). */
export function salvarAcesso(estado: EstadoAcesso): void {
  try {
    localStorage.setItem(CHAVE_ACESSO, JSON.stringify(estado));
  } catch {
    /* sem persistência — não trava a UI */
  }
}

/** Já existe um PIN configurado neste dispositivo? */
export function temPin(): boolean {
  return carregarAcesso().pinHash !== null;
}
