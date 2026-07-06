/**
 * Pipoca — Chaves do localStorage e helpers de envelope
 * -------------------------------------------------------
 * Convenções de nomes de chave e helper para leitura segura de envelopes
 * versionados. Nenhum código fora do repositório deve acessar localStorage
 * diretamente.
 */

/** Chave do array de envelopes pipoca.perfil.v1. */
export const CHAVE_PERFIS = "pipoca.perfil.v1";

/** Chave do save de um perfil específico. */
export function chaveSave(perfilId: string): string {
  return `pipoca.save.v1:${perfilId}`;
}

/** Chave da fila de telemetria de um perfil. */
export function chaveTelemetria(perfilId: string): string {
  return `pipoca.telemetria.v1:${perfilId}`;
}

/** Chave das histórias salvas de um perfil (retenção 20d; favoritas ficam). */
export function chaveHistorias(perfilId: string): string {
  return `pipoca.historias.v1:${perfilId}`;
}

/**
 * Lê e parseia um envelope do localStorage.
 * Valida que o campo `esquema` bate com esquemaEsperado.
 * Retorna o objeto parseado ou null em caso de ausência/corrupção.
 */
export function lerEnvelope<T>(
  chave: string,
  esquemaEsperado: string
): T | null {
  try {
    const raw = localStorage.getItem(chave);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>)["esquema"] !== esquemaEsperado
    ) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Lê e parseia um array de envelopes do localStorage.
 * Filtra silenciosamente os itens com esquema inválido.
 */
export function lerArrayEnvelopes<T>(
  chave: string,
  esquemaEsperado: string
): T[] {
  try {
    const raw = localStorage.getItem(chave);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as Record<string, unknown>)["esquema"] === esquemaEsperado
    ) as T[];
  } catch {
    return [];
  }
}

/**
 * Grava um valor como JSON no localStorage.
 * Captura exceções de quota estourada e retorna false sem lançar.
 */
export function gravarItem(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}
