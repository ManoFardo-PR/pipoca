/**
 * Pipoca — Estado da história (HIST)
 * ------------------------------------
 * Fonte única de verdade dos objetos commitados.
 * A tira (strip/quebra-cabeça) é a mecânica canônica:
 *   1. Criança ordena objetos na bandeja → strip
 *   2. _checkStory delega a ValidadorOrdem.validar()
 *   3. Tira válida → lerEmVozAlta → portão → commitar → destravar próximo
 *
 * Conteúdo graph-driven: texto de cada card/portão vem de MotorNarrativa.
 * Ordem graph-driven: a ordem certa vem de ValidadorOrdem.ordemCanonica().
 *
 * Mapeamento do protótipo:
 *   strip (ordenado) → strip da tira antes do commit
 *   tray             → bandeja (objetos ainda não na tira)
 *   _order()         → ValidadorOrdem.ordemCanonica() (não mais array fixo)
 *   _cards/_gateWords → MotorNarrativa.aoAdicionarObjeto() (não mais hardcoded)
 *   _checkStory      → delega a ValidadorOrdem.validar()
 */

import type { MotorNarrativa, Trecho, Nivel } from "./grafo/tipos.js";

export type { MotorNarrativa, Trecho, Nivel };

/**
 * Shape estrutural do validador de ordem da tira. O módulo v1 que o criava
 * (src/motores/validador_ordem.ts) foi arquivado em old/ na implantação do
 * A+ v3; estas funções seguem como registro vivo da mecânica SUPERSEDED
 * (ver fase00-00-20).
 */
export interface ValidadorOrdem {
  ordemCanonica(): string[];
  validar(ordemJogador: string[]): { ok: boolean; dica?: string };
}

// --- Estado persistido ---
export interface HistoriaState {
  cenarioId: string;
  objetos: string[];
  aberta: boolean;
}

// --- Estado da tira (mecânica de puzzle — NÃO persistido, é UI transitória) ---
export interface EstadoTira {
  strip: string[];
  bandeja: string[];
  storyMsg: string;
  dica: string | null;
}

/** Estado inicial da história para um cenário. */
export function historiaInicial(cenarioId: string): HistoriaState {
  return {
    cenarioId,
    objetos: [],
    aberta: true,
  };
}

/** Estado inicial da tira dado o conjunto de objetos do cenário. */
export function tiraInicial(todosIds: string[]): EstadoTira {
  return {
    strip: [],
    bandeja: [...todosIds],
    storyMsg: "",
    dica: null,
  };
}

/**
 * _placeInSlot — move um objeto da bandeja para a tira (em determinada posição ou ao final).
 */
export function _placeInSlot(
  tira: EstadoTira,
  objetoId: string,
  posicao?: number
): EstadoTira {
  const bandeja = tira.bandeja.filter((id) => id !== objetoId);
  let strip: string[];
  if (posicao !== undefined && posicao >= 0 && posicao <= tira.strip.length) {
    strip = [
      ...tira.strip.slice(0, posicao),
      objetoId,
      ...tira.strip.slice(posicao),
    ];
  } else {
    strip = [...tira.strip, objetoId];
  }
  return { ...tira, strip, bandeja, dica: null };
}

/**
 * _returnToTray — devolve um objeto da tira para a bandeja.
 */
export function _returnToTray(
  tira: EstadoTira,
  objetoId: string
): EstadoTira {
  const strip = tira.strip.filter((id) => id !== objetoId);
  const bandeja = [...tira.bandeja, objetoId];
  return { ...tira, strip, bandeja, dica: null };
}

/**
 * _autoPlace — coloca todos os objetos da bandeja na tira na ordem canônica.
 * Útil para acessibilidade ou atalho do cuidador.
 */
export function _autoPlace(
  tira: EstadoTira,
  ordem: ValidadorOrdem
): EstadoTira {
  const canonica = ordem.ordemCanonica();
  const todos = [...tira.strip, ...tira.bandeja];
  const strip = canonica.filter((id) => todos.includes(id));
  return { ...tira, strip, bandeja: [], dica: null };
}

/**
 * _checkStory — valida a tira usando o ValidadorOrdem.
 * Retorna dica acolhedora se fora de ordem; nunca X vermelho.
 */
export function _checkStory(
  tira: EstadoTira,
  ordem: ValidadorOrdem
): EstadoTira {
  const resultado = ordem.validar(tira.strip);
  if (resultado.ok) {
    return {
      ...tira,
      dica: null,
      storyMsg: "Tira pronta! Hora de ler. 🌟",
    };
  }
  return {
    ...tira,
    dica: resultado.dica ?? "Quase! Arraste os quadros para montar a história.",
    storyMsg: "",
  };
}

/**
 * Gera o texto do card de portão para um objeto, usando o motor.
 * Substitui o array _gateWords do protótipo.
 */
export function textoPortao(
  motor: MotorNarrativa,
  objetoId: string,
  historiaAtual: string[],
  nivel: Nivel
): string {
  return motor.aoAdicionarObjeto(historiaAtual, objetoId, nivel).texto;
}

/**
 * Commita um objeto lido na história após sucesso no portão.
 * Regra de ouro: só entra em objetos após leitura confirmada.
 */
export function commitarObjeto(
  historia: HistoriaState,
  objetoId: string,
  motor: MotorNarrativa,
  nivel: Nivel
): { historia: HistoriaState; trecho: Trecho } {
  const trecho = motor.aoAdicionarObjeto(historia.objetos, objetoId, nivel);
  const novaHistoria: HistoriaState = {
    ...historia,
    objetos: [...historia.objetos, objetoId],
    aberta: !trecho.ehFinal,
  };
  return { historia: novaHistoria, trecho };
}

/**
 * Reseta a história para um novo cenário.
 */
export function resetHistoria(cenarioId: string): HistoriaState {
  return historiaInicial(cenarioId);
}

/**
 * Deriva a bandeja: objetos do cenário ainda não commitados.
 * @param todosIds - todos os ids de objetos do cenário
 * @param historia - estado atual da história
 */
export function derivarBandeja(
  todosIds: string[],
  historia: HistoriaState
): string[] {
  const commitados = new Set(historia.objetos);
  return todosIds.filter((id) => !commitados.has(id));
}

/** Valida um objeto HistoriaState candidato. */
export function validarHistoriaState(h: unknown): string[] {
  const erros: string[] = [];
  if (typeof h !== "object" || h === null) return ["historia deve ser objeto"];
  const r = h as Record<string, unknown>;
  if (typeof r["cenarioId"] !== "string") erros.push("cenarioId deve ser string");
  if (!Array.isArray(r["objetos"])) erros.push("objetos deve ser array");
  if (typeof r["aberta"] !== "boolean") erros.push("aberta deve ser boolean");
  return erros;
}

/** Normaliza uma HistoriaState candidata. */
export function normalizarHistoriaState(raw: unknown): HistoriaState {
  if (typeof raw !== "object" || raw === null) return historiaInicial("");
  const r = raw as Record<string, unknown>;
  return {
    cenarioId: typeof r["cenarioId"] === "string" ? r["cenarioId"] : "",
    objetos: Array.isArray(r["objetos"])
      ? (r["objetos"] as unknown[]).filter((v) => typeof v === "string") as string[]
      : [],
    aberta: typeof r["aberta"] === "boolean" ? r["aberta"] : true,
  };
}
