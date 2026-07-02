/**
 * Pipoca — Configuração de IA por tenant (SA_AI) · doc fase04-04-05
 * -------------------------------------------------------------------
 * Provedor/modelo/cotas/custo/fallback POR TENANT. Default: SEM IA até
 * configuração deliberada e válida. CHAVES NUNCA NO CLIENTE: este tipo não
 * tem campo de chave — chaves e teste de conexão vivem no servidor (fase06).
 * O gate efetivo é triplo: plano permite (`iaPermitida`) ∧ config válida ∧
 * flag global de IA ligada (SA_SAFE).
 */

import type { StorageLike, TenantId } from "./auth/tiposAdmin.js";
import type { LimitesPlano } from "./tenant/tiposTenant.js";
import { killSwitchAtivo, type FeatureFlags } from "./flags.js";

export type ProvedorIaId = "claude" | "gemini" | "openai" | "deepseek";

export const MODELOS_POR_PROVEDOR: Record<ProvedorIaId, string[]> = {
  claude: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
  gemini: ["gemini-flash"],
  openai: ["gpt-mini"],
  // fase06: DeepSeek (API OpenAI-compatível; só JSON mode — sem json_schema).
  // O reasoner fica fora do catálogo do MVP (não aceita response_format).
  deepseek: ["deepseek-chat"],
};

export interface ConfigIaTenant {
  provedor: ProvedorIaId | null; // null = sem IA (default seguro)
  modelo: string | null;
  cotaMensal: number; // chamadas/mês (0 = sem cota → IA indisponível)
  custoMaxMensal: number; // teto de custo (unidade abstrata no MVP)
  fallback: ProvedorIaId | null; // provedor alternativo (≠ principal)
}

export const CONFIG_IA_PADRAO: ConfigIaTenant = {
  provedor: null,
  modelo: null,
  cotaMensal: 0,
  custoMaxMensal: 0,
  fallback: null,
};

const PROVEDORES: ProvedorIaId[] = ["claude", "gemini", "openai", "deepseek"];

/** Erros de forma/coerência (lista vazia = válida). */
export function validarConfigIA(c: unknown): string[] {
  const erros: string[] = [];
  if (!c || typeof c !== "object") return ["configuração deve ser um objeto"];
  const r = c as Record<string, unknown>;
  const provedor = r["provedor"];
  if (provedor !== null && PROVEDORES.indexOf(provedor as ProvedorIaId) < 0) {
    erros.push("provedor desconhecido");
  }
  const modelo = r["modelo"];
  if (provedor !== null && PROVEDORES.indexOf(provedor as ProvedorIaId) >= 0) {
    const catalogo = MODELOS_POR_PROVEDOR[provedor as ProvedorIaId];
    if (typeof modelo !== "string" || catalogo.indexOf(modelo) < 0) {
      erros.push("modelo fora do catálogo do provedor");
    }
  }
  const cota = r["cotaMensal"];
  if (typeof cota !== "number" || !Number.isFinite(cota) || cota < 0) erros.push("cotaMensal deve ser ≥ 0");
  const custo = r["custoMaxMensal"];
  if (typeof custo !== "number" || !Number.isFinite(custo) || custo < 0) erros.push("custoMaxMensal deve ser ≥ 0");
  const fallback = r["fallback"];
  if (fallback !== null && PROVEDORES.indexOf(fallback as ProvedorIaId) < 0) erros.push("fallback desconhecido");
  if (fallback !== null && fallback === provedor) erros.push("fallback deve ser diferente do provedor principal");
  if (JSON.stringify(c).toLowerCase().includes("chave")) erros.push("chaves não pertencem ao cliente (server-side, fase06)");
  return erros;
}

/**
 * Gate triplo do doc: a IA só fica efetivamente disponível para o tenant se o
 * PLANO permite, a CONFIG está completa/válida (provedor + cota > 0) e a flag
 * global de IA (SA_SAFE) está ligada. Fail-closed em qualquer dúvida.
 */
export function iaEfetivaDisponivel(
  config: ConfigIaTenant,
  limites: LimitesPlano,
  flags: FeatureFlags
): boolean {
  if (!limites || limites.iaPermitida !== true) return false;
  if (killSwitchAtivo(flags, "ia")) return false;
  if (!config || config.provedor === null) return false;
  if (validarConfigIA(config).length > 0) return false;
  return config.cotaMensal > 0;
}

// ─── Persistência local por tenant (MVP; server-side na fase06) ─────────────

const CHAVE_IA = "pipoca.admin.ia.v1";

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function lerMapa(st: StorageLike): Record<string, ConfigIaTenant> {
  try {
    const raw = st.getItem(CHAVE_IA);
    const obj = raw ? (JSON.parse(raw) as unknown) : {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return obj as Record<string, ConfigIaTenant>;
  } catch {
    return {};
  }
}

/** Sem config salva (ou corrompida) → padrão SEM IA. */
export function carregarConfigIA(tenantId: TenantId, armazem?: StorageLike): ConfigIaTenant {
  const st = armazem ?? storagePadrao();
  if (!st) return { ...CONFIG_IA_PADRAO };
  const c = lerMapa(st)[tenantId];
  return c && validarConfigIA(c).length === 0 ? { ...c } : { ...CONFIG_IA_PADRAO };
}

export function salvarConfigIA(tenantId: TenantId, c: ConfigIaTenant, armazem?: StorageLike): void {
  const st = armazem ?? storagePadrao();
  if (!st) return;
  const mapa = lerMapa(st);
  mapa[tenantId] = { ...c };
  try {
    st.setItem(CHAVE_IA, JSON.stringify(mapa));
  } catch {
    /* degradação silenciosa */
  }
}
