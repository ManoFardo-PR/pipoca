/**
 * [perfil.ts] — Perfil da criança (PERF): tipo, constantes, normalizações e a
 *   tabela única dos avatars (C4).
 *
 * PAPEL: core-lógica (perfil da criança + tabela dos avatars)
 * POR QUE EXISTE: dar um shape canônico e sempre-válido ao Perfil (idade/nome/nível/avatar/
 *   gênero) e uma definição ÚNICA dos avatars (id+nome+cor+emoji) para as telas.
 * ENTRA: id + params (nome, idade, nivel, avatarId, genero), raw (validar).
 * SAI: Perfil normalizado (criarPerfil), lista de erros (validarPerfil), AVATARES_DEF/porIdAvatar.
 * CHAMA: ./estado.js:Nivel (tipo).
 * É CHAMADO POR: src/core/onboarding.ts, src/core/geracao/geracao.ts, src/dados/schemas.ts,
 *   os repositórios (src/core/persistencia/, src/backend/adaptadores/), src/app/bridge.ts e os testes.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: idade sofre clamp 3..12; nome vazio → NOME_PADRAO ("Pipoquinha"); avatarId fora de
 *   AVATARES → AVATAR_PADRAO. `genero` é ADITIVO OPCIONAL no pipoca.perfil.v1 (fase13-13-01):
 *   saneado, nunca rejeita; ausente ⇒ concordância FEMININA padrão com o NOME REAL do perfil
 *   (NUNCA inferir do nome — "Joana" só em conteúdo legado/demonstração). Os ids de avatar são
 *   identidade de login gravada nos envelopes — nunca renomear ("fubá" fica com acento).
 *
 * — detalhe preservado —
 * Pipoca — Perfil (PERF)
 * ----------------------
 * Define o perfil da criança e o repositório em memória de perfis.
 * Regras: idade 3..12 (clamp); nome vazio → apelido padrão; avatarId em AVATARES.
 */

import type { Nivel } from "./estado.js";

export type { Nivel };

export const AVATARES = ["pingo", "fubá", "cacau", "lua", "tuca"] as const;
export type AvatarId = typeof AVATARES[number];

/**
 * A TABELA ÚNICA dos avatars (Plan03 · C4): id + nome + cor + emoji num lugar só,
 * exposta às telas via `window.PipocaCanonico.avatares` (bridge). Antes a definição
 * visual vivia duplicada em 6 lugares com 2 formatos. Os IDS SÃO IDENTIDADE DE
 * LOGIN da criança (gravados no envelope pipoca.perfil.v1) — nunca renomear
 * ("fubá" fica com acento, decisão do dono). Emojis decididos pelo dono:
 * 🐶 🦊 🐻 🐱 🐦 (a metáfora dos bichinhos, sem as orelhas-chifre — ML-4).
 */
export const AVATARES_DEF: ReadonlyArray<{ id: AvatarId; nome: string; cor: string; emoji: string }> = [
  { id: "pingo", nome: "Pingo", cor: "#3f6f9e", emoji: "🐶" },
  { id: "fubá",  nome: "Fubá",  cor: "#d98a4e", emoji: "🦊" },
  { id: "cacau", nome: "Cacau", cor: "#7a9a5b", emoji: "🐻" },
  { id: "lua",   nome: "Lua",   cor: "#9c7cb0", emoji: "🐱" },
  { id: "tuca",  nome: "Tuca",  cor: "#5fa9b8", emoji: "🐦" },
];

export const NOME_PADRAO = "Pipoquinha";
const NIVEL_PADRAO: Nivel = "n1"; // C4: interno (nenhum consumidor externo)
export const AVATAR_PADRAO: AvatarId = "pingo";
export const IDADE_MIN = 3;
export const IDADE_MAX = 12;

// C4: GENEROS (lista) saiu — sem consumidor; o tipo continua para o shape do Perfil.
export type GeneroPerfil = "m" | "f";

export interface Perfil {
  id: string;
  nome: string;
  idade: number;
  nivel: Nivel;
  avatarId: string;
  /**
   * Gênero do personagem nas histórias — campo ADITIVO OPCIONAL no
   * `pipoca.perfil.v1` (fase13-13-01, decisão fixada: o envelope de storage
   * local evolui aditivamente; leitores antigos ignoram o campo novo).
   * Ausente (perfil legado) ⇒ regra pós-PR#26: o NOME é SEMPRE o do perfil
   * (nunca substituído); o app pede o gênero UMA vez na ativação e, sem
   * resposta, usa concordância FEMININA padrão (GENERO_CONCORDANCIA_PADRAO,
   * `geracao.ts`) com o nome real. NUNCA inferir do nome; "Joana" só em
   * conteúdo legado/demonstração.
   */
  genero?: GeneroPerfil;
}

const NIVEIS_VALIDOS: Nivel[] = ["n1", "n2", "n3", "n4"];

/** Clamp de idade entre IDADE_MIN e IDADE_MAX. */
export function clampIdade(idade: number): number {
  return Math.max(IDADE_MIN, Math.min(IDADE_MAX, Math.round(idade)));
}

/** Normaliza o nome: em branco → NOME_PADRAO. (C4: interno — só criarPerfil usa.) */
function normalizarNome(nome: string): string {
  const trimmed = nome.trim();
  return trimmed.length > 0 ? trimmed : NOME_PADRAO;
}

/** Valida e normaliza um nível; fallback para NIVEL_PADRAO. (C4: interno.) */
function normalizarNivel(nivel: string): Nivel {
  if ((NIVEIS_VALIDOS as string[]).includes(nivel)) return nivel as Nivel;
  return NIVEL_PADRAO;
}

/** Valida se um avatarId é reconhecido; fallback para AVATAR_PADRAO. */
export function normalizarAvatar(avatarId: string): AvatarId {
  if ((AVATARES as readonly string[]).includes(avatarId)) return avatarId as AvatarId;
  return AVATAR_PADRAO;
}

/** A definição visual do avatar (id desconhecido cai no padrão — nunca null). C4. */
export function porIdAvatar(avatarId: string): { id: AvatarId; nome: string; cor: string; emoji: string } {
  const id = normalizarAvatar(avatarId);
  return AVATARES_DEF.find((a) => a.id === id) ?? AVATARES_DEF[0]!;
}

/**
 * Normaliza o gênero OPCIONAL: "m"/"f" passam; qualquer outro valor vira
 * `undefined` (saneado, nunca rejeita — mesmo padrão de `favorita` em
 * historias.ts: dado opcional corrompido não derruba o perfil da criança).
 */
export function normalizarGenero(genero: unknown): GeneroPerfil | undefined {
  return genero === "m" || genero === "f" ? genero : undefined;
}

/** Cria um Perfil normalizado com os dados fornecidos. */
export function criarPerfil(
  id: string,
  params: { nome?: string; idade?: number; nivel?: string; avatarId?: string; genero?: string }
): Perfil {
  const genero = normalizarGenero(params.genero);
  return {
    id,
    nome: normalizarNome(params.nome ?? ""),
    idade: clampIdade(params.idade ?? 7),
    nivel: normalizarNivel(params.nivel ?? NIVEL_PADRAO),
    avatarId: normalizarAvatar(params.avatarId ?? AVATAR_PADRAO),
    // Campo aditivo: só entra quando escolhido (perfil sem gênero é estado legal).
    ...(genero ? { genero } : {}),
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

// C4 (Plan03): RepositorioPerfil (in-memory) e perfilVazio saíram — superseded por
// RepositorioLocalStorage/RepositorioPersistencia; zero consumidores desde a fase06.
