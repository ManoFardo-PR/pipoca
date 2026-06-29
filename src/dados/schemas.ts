/**
 * Pipoca — Validadores de schema (pipoca.perfil.v1 e pipoca.save.v1)
 * -------------------------------------------------------------------
 * Validação leve, sem dependência externa.
 * Save inválido → recai no estadoInicial (nunca quebra o app).
 * Versão imutável: .v1 nunca muda de forma; mudança = .v2.
 *
 * validarEnvelopeSave valida TODOS os slices do EstadoApp:
 *   tela, perfil (null | Perfil), sessao (null | Sessao), historia,
 *   economia, modos, a11y.
 */

import type { Perfil, EstadoApp } from "../core/estado.js";
import { estadoInicial } from "../core/estado.js";
import { validarPerfil } from "../core/perfil.js";
import { validarModos } from "../core/modos.js";
import { validarEconomia } from "../core/economia.js";
import { validarHistoriaState } from "../core/historia.js";
import { validarSessao } from "../core/sessao.js";

export const ESQUEMA_PERFIL = "pipoca.perfil.v1";
export const ESQUEMA_SAVE = "pipoca.save.v1";

const TEXT_SCALES_VALIDOS = [1, 1.2, 1.45];

// --- Envelopes ---
export interface EnvelopePerfilV1 {
  esquema: "pipoca.perfil.v1";
  perfil: Perfil;
}

export interface EnvelopeSaveV1 {
  esquema: "pipoca.save.v1";
  perfilId: string;
  estado: EstadoApp;
}

// --- Validadores internos ---

/**
 * Valida o slice a11y. Retorna lista de erros.
 */
function validarA11y(raw: unknown): string[] {
  const erros: string[] = [];
  if (typeof raw !== "object" || raw === null) return ["a11y deve ser objeto"];
  const r = raw as Record<string, unknown>;
  if (!TEXT_SCALES_VALIDOS.includes(r["textScale"] as number))
    erros.push(`a11y.textScale inválido (deve ser 1, 1.2 ou 1.45)`);
  for (const campo of ["dyslexia", "syllable", "contrast", "reduceMotion"] as const) {
    if (typeof r[campo] !== "boolean")
      erros.push(`a11y.${campo} deve ser boolean`);
  }
  return erros;
}

/**
 * Valida o slice perfil: null (sem perfil) ou Perfil válido.
 * Retorna lista de erros.
 */
function validarSlicePerfil(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  return validarPerfil(raw);
}

// --- Validadores públicos ---

/**
 * Valida um envelope pipoca.perfil.v1.
 * Retorna o perfil ou null se inválido.
 */
export function validarEnvelopePerfil(raw: unknown): Perfil | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r["esquema"] !== ESQUEMA_PERFIL) return null;
  const erros = validarPerfil(r["perfil"]);
  if (erros.length > 0) return null;
  return r["perfil"] as Perfil;
}

/**
 * Valida um envelope pipoca.save.v1.
 * Valida TODOS os slices de EstadoApp (tela, perfil, sessao, historia,
 * economia, modos, a11y). Retorna o EstadoApp ou null se inválido/corrompido.
 * Nunca lança — degradação segura.
 */
export function validarEnvelopeSave(raw: unknown): EstadoApp | null {
  try {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (r["esquema"] !== ESQUEMA_SAVE) return null;
    if (typeof r["perfilId"] !== "string" || r["perfilId"].trim() === "") return null;

    const estado = r["estado"];
    if (typeof estado !== "object" || estado === null) return null;
    const e = estado as Record<string, unknown>;

    // --- tela ---
    if (typeof e["tela"] !== "number") return null;

    // --- perfil (null ou Perfil válido) ---
    if (!("perfil" in e)) return null;
    const errosPerfil = validarSlicePerfil(e["perfil"]);
    if (errosPerfil.length > 0) return null;

    // --- sessao (null ou Sessao válida) ---
    if (e["sessao"] !== null && e["sessao"] !== undefined) {
      if (validarSessao(e["sessao"]).length > 0) return null;
    }

    // --- historia ---
    if (validarHistoriaState(e["historia"]).length > 0) return null;

    // --- economia ---
    if (validarEconomia(e["economia"]).length > 0) return null;

    // --- modos ---
    if (validarModos(e["modos"]).length > 0) return null;

    // --- a11y ---
    if (validarA11y(e["a11y"]).length > 0) return null;

    return estado as EstadoApp;
  } catch {
    return null;
  }
}

/**
 * Tenta validar um save; em caso de falha, retorna estadoInicial.
 * Uso: ao carregar do localStorage, garantir que nunca quebra a app.
 */
export function carregarSaveComFallback(raw: unknown): EstadoApp {
  const estado = validarEnvelopeSave(raw);
  return estado ?? estadoInicial;
}

/**
 * Cria um envelope pipoca.perfil.v1 pronto para serializar.
 */
export function criarEnvelopePerfil(perfil: Perfil): EnvelopePerfilV1 {
  return { esquema: ESQUEMA_PERFIL, perfil };
}

/**
 * Cria um envelope pipoca.save.v1 pronto para serializar.
 */
export function criarEnvelopeSave(
  perfilId: string,
  estado: EstadoApp
): EnvelopeSaveV1 {
  return { esquema: ESQUEMA_SAVE, perfilId, estado };
}
