/**
 * Pipoca — Perfil (PERF)
 * ----------------------
 * Define o perfil da criança e o repositório em memória de perfis.
 * Regras: idade 3..12 (clamp); nome vazio → apelido padrão; avatarId em AVATARES.
 */

import type { Nivel } from "./estado.js";

export type { Nivel };

export const AVATARES = ["pingo", "fubá", "cacau", "lua", "tuca"] as const;
export type AvatarId = typeof AVATARES[number];

export const NOME_PADRAO = "Pipoquinha";
export const NIVEL_PADRAO: Nivel = "n1";
export const AVATAR_PADRAO: AvatarId = "pingo";
export const IDADE_MIN = 3;
export const IDADE_MAX = 12;

export interface Perfil {
  id: string;
  nome: string;
  idade: number;
  nivel: Nivel;
  avatarId: string;
}

const NIVEIS_VALIDOS: Nivel[] = ["n1", "n2", "n3", "n4"];

/** Perfil sem dados — placeholder seguro. */
export const perfilVazio: Perfil = {
  id: "",
  nome: NOME_PADRAO,
  idade: 7,
  nivel: NIVEL_PADRAO,
  avatarId: AVATAR_PADRAO,
};

/** Clamp de idade entre IDADE_MIN e IDADE_MAX. */
export function clampIdade(idade: number): number {
  return Math.max(IDADE_MIN, Math.min(IDADE_MAX, Math.round(idade)));
}

/** Normaliza o nome: em branco → NOME_PADRAO. */
export function normalizarNome(nome: string): string {
  const trimmed = nome.trim();
  return trimmed.length > 0 ? trimmed : NOME_PADRAO;
}

/** Valida e normaliza um nível; fallback para NIVEL_PADRAO. */
export function normalizarNivel(nivel: string): Nivel {
  if ((NIVEIS_VALIDOS as string[]).includes(nivel)) return nivel as Nivel;
  return NIVEL_PADRAO;
}

/** Valida se um avatarId é reconhecido; fallback para AVATAR_PADRAO. */
export function normalizarAvatar(avatarId: string): AvatarId {
  if ((AVATARES as readonly string[]).includes(avatarId)) return avatarId as AvatarId;
  return AVATAR_PADRAO;
}

/** Cria um Perfil normalizado com os dados fornecidos. */
export function criarPerfil(
  id: string,
  params: { nome?: string; idade?: number; nivel?: string; avatarId?: string }
): Perfil {
  return {
    id,
    nome: normalizarNome(params.nome ?? ""),
    idade: clampIdade(params.idade ?? 7),
    nivel: normalizarNivel(params.nivel ?? NIVEL_PADRAO),
    avatarId: normalizarAvatar(params.avatarId ?? AVATAR_PADRAO),
  };
}

/** Valida um Perfil candidato, retornando erros encontrados. */
export function validarPerfil(p: unknown): string[] {
  const erros: string[] = [];
  if (typeof p !== "object" || p === null) {
    return ["perfil deve ser um objeto"];
  }
  const r = p as Record<string, unknown>;
  if (typeof r["id"] !== "string" || r["id"].trim() === "") {
    erros.push("id ausente ou vazio");
  }
  if (typeof r["nome"] !== "string") {
    erros.push("nome deve ser string");
  }
  if (typeof r["idade"] !== "number" || r["idade"] < IDADE_MIN || r["idade"] > IDADE_MAX) {
    erros.push(`idade deve ser número entre ${IDADE_MIN} e ${IDADE_MAX}`);
  }
  if (!(NIVEIS_VALIDOS as string[]).includes(r["nivel"] as string)) {
    erros.push("nivel inválido");
  }
  if (typeof r["avatarId"] !== "string") {
    erros.push("avatarId deve ser string");
  }
  return erros;
}

/**
 * RepositorioPerfil — repositório em memória de perfis.
 * Produção usa RepositorioPersistencia; este é usado para operações
 * síncronas na camada de estado (antes de persistir).
 */
export class RepositorioPerfil {
  private _perfis: Map<string, Perfil> = new Map();

  /** Lista todos os perfis. */
  listar(): Perfil[] {
    return [...this._perfis.values()];
  }

  /** Busca um perfil por id; null se não encontrado. */
  buscar(id: string): Perfil | null {
    return this._perfis.get(id) ?? null;
  }

  /** Insere ou atualiza um perfil (upsert). */
  salvar(p: Perfil): void {
    this._perfis.set(p.id, { ...p });
  }

  /** Remove um perfil. Retorna true se existia. */
  remover(id: string): boolean {
    return this._perfis.delete(id);
  }

  /** Substitui toda a lista de perfis (usado ao carregar do storage). */
  carregar(perfis: Perfil[]): void {
    this._perfis.clear();
    for (const p of perfis) this._perfis.set(p.id, { ...p });
  }
}
