/**
 * Pipoca — Portão parental / verificação de PIN (PINGATE) · doc fase02-02-03
 * --------------------------------------------------------------------------
 * Protege os ajustes adultos atrás de um PIN, SEM culpar a criança em caso de erro.
 * Lógica pura e testável: o tempo (`agora`) é injetado pela borda — nada de `Date.now()`.
 *
 * Nota de segurança (MVP): o PIN é guardado como hash não-criptográfico (FNV-1a), suficiente
 * para um gesto de barreira no dispositivo do cuidador. Segurança real (auth/servidor) é fase06.
 */

export interface EstadoAcesso {
  pinHash: string | null; // null = ainda não configurado
  tentativas: number; // erros consecutivos na janela atual
  bloqueioAte: number; // epoch ms até quando está bloqueado (0 = livre)
}

export const acessoInicial: EstadoAcesso = {
  pinHash: null,
  tentativas: 0,
  bloqueioAte: 0,
};

/** Nº de erros consecutivos que dispara o lockout suave. */
export const MAX_TENTATIVAS = 5;
/** Duração do lockout suave (ms) — calmo, não punitivo à criança. */
export const LOCKOUT_MS = 60_000;

const DICA_ERRO = "PIN não confere. Tente de novo com calma.";
const DICA_BLOQUEIO = "Muitas tentativas. Aguarde um instante e tente de novo.";

/** Hash não-criptográfico FNV-1a (32-bit) em hex. Determinístico, sem dependências. */
function hashPin(pin: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Define (ou troca) o PIN. Retorna um novo estado com o hash e contadores zerados. */
export function definirPin(estado: EstadoAcesso, pin: string): EstadoAcesso {
  return { ...estado, pinHash: hashPin(String(pin)), tentativas: 0, bloqueioAte: 0 };
}

/** Há lockout ativo neste instante? */
export function estaBloqueado(estado: EstadoAcesso, agora: number): boolean {
  return estado.bloqueioAte > 0 && agora < estado.bloqueioAte;
}

export interface ResultadoPin {
  ok: boolean;
  estado: EstadoAcesso;
  bloqueado: boolean;
  dica?: string;
}

/**
 * Verifica o PIN informado contra o configurado.
 * - bloqueado → recusa sem contar tentativa.
 * - acerto → zera tentativas/bloqueio (ok:true).
 * - erro → incrementa; ao atingir MAX_TENTATIVAS, ativa lockout suave.
 */
export function verificarPin(estado: EstadoAcesso, pin: string, agora: number): ResultadoPin {
  if (estado.pinHash === null) {
    return { ok: false, estado, bloqueado: false, dica: "Nenhum PIN configurado." };
  }
  if (estaBloqueado(estado, agora)) {
    return { ok: false, estado, bloqueado: true, dica: DICA_BLOQUEIO };
  }

  // lockout expirou: começa uma nova janela de tentativas
  const base: EstadoAcesso =
    estado.bloqueioAte > 0 && agora >= estado.bloqueioAte
      ? { ...estado, tentativas: 0, bloqueioAte: 0 }
      : estado;

  if (hashPin(String(pin)) === base.pinHash) {
    return { ok: true, estado: { ...base, tentativas: 0, bloqueioAte: 0 }, bloqueado: false };
  }

  const tentativas = base.tentativas + 1;
  if (tentativas >= MAX_TENTATIVAS) {
    return {
      ok: false,
      estado: { ...base, tentativas, bloqueioAte: agora + LOCKOUT_MS },
      bloqueado: true,
      dica: DICA_BLOQUEIO,
    };
  }
  return { ok: false, estado: { ...base, tentativas }, bloqueado: false, dica: DICA_ERRO };
}
