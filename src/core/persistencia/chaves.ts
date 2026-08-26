/**
 * [chaves.ts] — Convenções de nomes de chave do localStorage + helpers de leitura/
 *   escrita segura de envelopes versionados (pipoca.*.v1).
 *
 * PAPEL: core-lógica (persistência · nomes de chave + I/O de envelope)
 * POR QUE EXISTE: centraliza as chaves (perfis, save, telemetria, histórias) e a
 *   leitura tolerante a corrupção — ausência/JSON inválido/esquema errado ⇒ null/[] em
 *   vez de exceção; quota estourada ⇒ false em vez de lançar.
 * ENTRA: chave + esquema esperado (leitura); chave + valor (escrita).
 * SAI: CHAVE_PERFIS + funções chaveSave/chaveTelemetria/chaveHistorias;
 *   lerEnvelope/lerArrayEnvelopes/gravarItem.
 * CHAMA: nada — só localStorage e JSON.
 * É CHAMADO POR: persistencia/RepositorioLocalStorage.ts, persistencia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/persistencia/persistencia.test.ts` (dentro de `bun run test`).
 * CUIDADO: nenhum código fora do repositório deve tocar localStorage direto; a leitura
 *   VALIDA o campo `esquema` e descarta em silêncio o que não bate; gravarItem engole
 *   quota estourada (retorna false, não lança).
 *
 * — detalhe preservado —
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

/**
 * Lê o array CRU de envelopes (sem filtrar por esquema). Serve às escritas que
 * regravam a lista inteira: elas precisam PRESERVAR os itens de versão
 * desconhecida (ex.: um `pipoca.perfil.v2` gravado por um app mais novo) em vez
 * de deixá-los cair na filtragem — senão um downgrade de versão apaga dados.
 */
export function lerArrayBruto(chave: string): unknown[] {
  try {
    const raw = localStorage.getItem(chave);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Particiona um array cru em `conhecidos` (esquema esperado) e `resto` (tudo o
 * mais — versões futuras/desconhecidas a preservar ao regravar). O chamador
 * mexe só nos conhecidos e regrava `[...resto, ...conhecidos]`.
 */
export function particionarPorEsquema(
  itens: unknown[],
  esquemaEsperado: string
): { conhecidos: Array<Record<string, unknown>>; resto: unknown[] } {
  const conhecidos: Array<Record<string, unknown>> = [];
  const resto: unknown[] = [];
  for (const item of itens) {
    if (
      typeof item === "object" &&
      item !== null &&
      (item as Record<string, unknown>)["esquema"] === esquemaEsperado
    ) {
      conhecidos.push(item as Record<string, unknown>);
    } else {
      resto.push(item);
    }
  }
  return { conhecidos, resto };
}
