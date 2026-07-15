/**
 * [sessao.ts] — Sessão de leitura com bloco de foco (SESS/Pomodoro): iniciar, tick,
 *   fim do bloco, formatação do tempo e normalização/validação.
 *
 * PAPEL: core-lógica (sessão e bloco de foco · SESS)
 * POR QUE EXISTE: modelar o bloco Pomodoro da leitura de forma calma — sem pressa punitiva,
 *   com encerramento suave e pausa em background.
 * ENTRA: perfilId, blocoMin (10|15|20|25), agora (epoch ms), deltaSeg (tick), raw (normalizar/validar).
 * SAI: Sessao imutável (iniciarSessao/tick), boolean (blocoTerminou), "MM:SS" (formatarRestante),
 *   null (encerrarSessao), erros de validação.
 * CHAMA: nada externo.
 * É CHAMADO POR: src/core/limites.ts, src/core/onboarding.ts, src/dados/schemas.ts, src/app/bridge.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); coberto de forma transversal em `bun run test`.
 * CUIDADO: iniciarSessao tem default `agora = Date.now()` — o ÚNICO ponto do módulo com relógio;
 *   o resto é puro (a borda deve passar `agora`). O fim do bloco é encerramento calmo (não
 *   interrompe a história); app em background → pausa o timer. Sessao (bloco de foco) ≠ SessaoConta
 *   (sessão de conta, contaFamilia.ts).
 *
 * — detalhe preservado —
 * Pipoca — Sessão e bloco de foco (SESS)
 * ----------------------------------------
 * Modela a sessão de leitura com bloco Pomodoro.
 * Sem pressa punitiva: o fim do bloco é um encerramento calmo.
 * App em background → pausa o timer (não punir).
 */

export type BlocoMin = 10 | 15 | 20 | 25;

export interface Sessao {
  perfilId: string;
  blocoMin: BlocoMin;
  iniciadaEm: number;
  restanteSeg: number;
}

const BLOCOS_VALIDOS: BlocoMin[] = [10, 15, 20, 25];

/** Cria uma nova sessão para o perfilId dado. iniciadaEm = agora. */
export function iniciarSessao(
  perfilId: string,
  blocoMin: BlocoMin,
  agora: number = Date.now()
): Sessao {
  return {
    perfilId,
    blocoMin,
    iniciadaEm: agora,
    restanteSeg: blocoMin * 60,
  };
}

/**
 * Decrementa restanteSeg em `delta` segundos.
 * Retorna a sessão atualizada. Se restanteSeg <= 0, retorna com 0 (encerramento suave).
 */
export function tick(sessao: Sessao, deltaSeg: number = 1): Sessao {
  const restante = Math.max(0, sessao.restanteSeg - deltaSeg);
  return { ...sessao, restanteSeg: restante };
}

/** Verifica se o bloco de foco terminou. */
export function blocoTerminou(sessao: Sessao): boolean {
  return sessao.restanteSeg <= 0;
}

/** Encerra a sessão retornando null (slot vazio no EstadoApp). */
export function encerrarSessao(): null {
  return null;
}

/** Formata o tempo restante como "MM:SS" para exibição. */
export function formatarRestante(restanteSeg: number): string {
  const min = Math.floor(restanteSeg / 60);
  const seg = restanteSeg % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

/** Valida se um valor é BlocoMin; fallback para 15. */
export function normalizarBlocoMin(valor: unknown): BlocoMin {
  if ((BLOCOS_VALIDOS as unknown[]).includes(valor)) return valor as BlocoMin;
  return 15;
}

/** Valida um objeto Sessao candidato. Retorna lista de erros. */
export function validarSessao(s: unknown): string[] {
  const erros: string[] = [];
  if (typeof s !== "object" || s === null) return ["sessao deve ser objeto"];
  const r = s as Record<string, unknown>;
  if (typeof r["perfilId"] !== "string") erros.push("perfilId deve ser string");
  if (!(BLOCOS_VALIDOS as unknown[]).includes(r["blocoMin"])) erros.push("blocoMin inválido");
  if (typeof r["iniciadaEm"] !== "number") erros.push("iniciadaEm deve ser number");
  if (typeof r["restanteSeg"] !== "number") erros.push("restanteSeg deve ser number");
  return erros;
}
