/**
 * [schemas.ts] — valida e sela os envelopes pipoca.perfil.v1 e pipoca.save.v1
 *   antes de qualquer dado externo virar estado do app.
 *
 * PAPEL: core-lógica (validadores de schema · borda de persistência)
 * POR QUE EXISTE: dados vindos do localStorage/backend podem estar corrompidos
 *   ou de outra versão; aqui são validados/saneados para que save ruim nunca
 *   quebre o app (recai no estadoInicial).
 * ENTRA: valores unknown crus (envelope de perfil/save) e Perfil/EstadoApp.
 * SAI: Perfil|null, EstadoApp|null, EstadoApp com fallback estadoInicial e os
 *   criadores de envelope; nunca lança.
 * CHAMA: ../core/estado.js:estadoInicial, ../core/perfil.js:{normalizarGenero,
 *   validarPerfil}, ../core/modos.js:validarModos, ../core/economia.js:
 *   validarEconomia, ../core/historia.js:validarHistoriaState, ../core/sessao.js:
 *   validarSessao, ../core/limites.js:normalizarLimites, ../core/cardapio.js:
 *   validarItemCardapio.
 * É CHAMADO POR: core/persistencia/RepositorioLocalStorage.ts, core/lgpd.ts,
 *   backend/adaptadores/repo_supabase.ts, core/persistencia/persistencia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; exercitado por
 *   `bun run src/core/persistencia/persistencia.test.ts` (dentro de `bun run test`).
 * CUIDADO: contrato de versão — .v1 só aceita mudança ADITIVO-OPCIONAL (campo
 *   novo opcional + saneamento, nunca rejeição); renomear/trocar tipo/remover = .v2.
 *   Os slices por criança são SANEADOS (malformado → null), nunca derrubam o save.
 *
 * — detalhe preservado —
 * Pipoca — Validadores de schema (pipoca.perfil.v1 e pipoca.save.v1)
 * -------------------------------------------------------------------
 * Validação leve, sem dependência externa.
 * Save inválido → recai no estadoInicial (nunca quebra o app).
 * Versão: .v1 aceita mudança ADITIVO-OPCIONAL (campo novo opcional, com
 * saneamento — nunca rejeição); renomear, mudar tipo ou remover campo = .v2.
 *
 * validarEnvelopeSave valida os slices ORIGINAIS do EstadoApp (inválido →
 * save rejeitado): tela, perfil (null | Perfil), sessao (null | Sessao),
 * historia, economia, modos, a11y. Os slices por criança (limites, cardapio,
 * cenariosLiberados, coletaTelemetria) são SANEADOS: malformado → null
 * ("não configurado") — config ruim nunca derruba o save da criança.
 */

import type { Perfil, EstadoApp, Limites, ItemCardapio } from "../core/estado.js";
import { estadoInicial } from "../core/estado.js";
import { normalizarGenero, validarPerfil } from "../core/perfil.js";
import { validarModos } from "../core/modos.js";
import { validarEconomia } from "../core/economia.js";
import { validarHistoriaState } from "../core/historia.js";
import { validarSessao } from "../core/sessao.js";
import { normalizarLimites } from "../core/limites.js";
import { validarItemCardapio } from "../core/cardapio.js";

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

// --- Saneadores dos slices por criança (aditivo-opcionais no .v1) ---
// Contrato: NUNCA rejeitam — malformado vira null ("não configurado"; a borda
// aplica o padrão de cardapio.ts/limites.ts). Só limites materializa default
// interno (normalizarLimites sempre devolve um Limites válido).

function sanearLimites(raw: unknown): Limites | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  return normalizarLimites(raw);
}

function sanearCardapio(raw: unknown): ItemCardapio[] | null {
  if (!Array.isArray(raw)) return null;
  const itens = raw.filter(validarItemCardapio);
  return itens.length > 0 ? itens : null;
}

function sanearCenariosLiberados(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  return ids.length > 0 ? ids : null;
}

function sanearColetaTelemetria(raw: unknown): boolean | null {
  return typeof raw === "boolean" ? raw : null;
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
  const perfil = r["perfil"] as Perfil;
  // Campo aditivo opcional (fase13-13-01): gênero fora de "m"/"f" é SANEADO
  // (cai fora), nunca rejeita — o perfil da criança não cai por metadado novo.
  const genero = normalizarGenero((perfil as unknown as Record<string, unknown>)["genero"]);
  if (genero !== perfil.genero) {
    const copia = { ...perfil };
    if (genero) copia.genero = genero;
    else delete copia.genero;
    return copia;
  }
  return perfil;
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

    // --- slices por criança (saneados, nunca rejeitam) ---
    return {
      ...(estado as EstadoApp),
      limites: sanearLimites(e["limites"]),
      cardapio: sanearCardapio(e["cardapio"]),
      cenariosLiberados: sanearCenariosLiberados(e["cenariosLiberados"]),
      coletaTelemetria: sanearColetaTelemetria(e["coletaTelemetria"]),
    };
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
