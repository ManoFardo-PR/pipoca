/**
 * [ia_global.ts] — config GLOBAL de IA da plataforma (modelo padrão por provedor
 *   + cadeia de fallback) que os tenants herdam, e o formato do status MASCARADO da chave.
 *
 * PAPEL: admin (SA_IA_GLOBAL — lado plataforma; herança de IA)
 * POR QUE EXISTE: dar defaults de provedor/modelo e uma cascata de fallback comum
 *   a todos os tenants sem forçar cada um a configurar, mantendo a MESMA regra de
 *   herança que o ProxyIA aplica server-side.
 * ENTRA: ConfigIaGlobal, ConfigIaTenant, StatusChaveIa; leitura de localStorage
 *   (chave "pipoca.admin.iaglobal.v1").
 * SAI: CONFIG_IA_GLOBAL_PADRAO, validação/normalização, helpers de herança
 *   (provedor/modelo/fallbacks efetivos), rótulo do status mascarado, persistência local.
 * CHAMA: ./auth/tiposAdmin:StorageLike, ./ia_config (MODELOS_POR_PROVEDOR,
 *   ConfigIaTenant, ProvedorIaId).
 * É CHAMADO POR: bridge_admin.ts (PipocaAdminCanonico.iaGlobal),
 *   ../backend/espelho_admin.ts (tipos + helpers), admin.test.ts, backend.test.ts.
 * RODA POR: boot do admin — bundled em pipoca.admin.bundle.js via `bun run build:admin`.
 * CUIDADO: CHAVES NUNCA AQUI — chaves vivem na tabela deny-all `chaves_ia`, lida
 *   só pela Edge Function; este módulo só conhece o STATUS MASCARADO (ex.:
 *   "****ab12"). O storage local é só espelho de LEITURA — o servidor é a verdade.
 *   Default fail-closed: sem modelo padrão e sem cadeia → tenant sem config
 *   própria segue SEM IA. A regra de herança é espelhada no ProxyIA (mantê-las iguais).
 *
 * — detalhe preservado —
 * Pipoca — Configuração GLOBAL de IA (SA_IA_GLOBAL) · tarefa #31
 * ----------------------------------------------------------------
 * O lado da PLATAFORMA (não por tenant): modelo padrão por provedor e a
 * cadeia de fallback global que os tenants herdam quando não definem a
 * própria. CHAVES NUNCA AQUI: chaves vivem no servidor (tabela deny-all
 * `chaves_ia`, lida só pela Edge Function) — este módulo só conhece o
 * STATUS MASCARADO devolvido pelo servidor. Default fail-closed: sem
 * modelos padrão e sem cadeia (tenant sem config própria segue SEM IA).
 */

import type { StorageLike } from "./auth/tiposAdmin.js";
import { MODELOS_POR_PROVEDOR, type ConfigIaTenant, type ProvedorIaId } from "./ia_config.js";

export interface ConfigIaGlobal {
  /** Modelo padrão por provedor (null = sem padrão; catálogo obrigatório). */
  modeloPadrao: Record<ProvedorIaId, string | null>;
  /** Ordem global de fallback — herdada quando o tenant não define a sua. */
  cadeiaFallback: ProvedorIaId[];
}

// A4 (Plan03): fail-closed de ponta a ponta — nenhum provedor nasce com modelo padrão
// (antes o Gemini vinha pré-preenchido aqui enquanto as edges tinham OUTRO default
// escondido). O operador define o padrão em SA_IA_GLOBAL; as edges (realizador,
// proxy-ia) usam tenant → padrão global → sem modelo = não configurado.
export const CONFIG_IA_GLOBAL_PADRAO: ConfigIaGlobal = {
  modeloPadrao: { claude: null, gemini: null, openai: null, deepseek: null },
  cadeiaFallback: [],
};

const PROVEDORES: ProvedorIaId[] = ["claude", "gemini", "openai", "deepseek"];

/** Erros de forma/coerência (lista vazia = válida). Mesma lei do por-tenant: "chave" não entra no cliente. */
export function validarConfigIaGlobal(c: unknown): string[] {
  const erros: string[] = [];
  if (!c || typeof c !== "object" || Array.isArray(c)) return ["configuração deve ser um objeto"];
  const r = c as Record<string, unknown>;

  const mp = r["modeloPadrao"];
  if (!mp || typeof mp !== "object" || Array.isArray(mp)) {
    erros.push("modeloPadrao deve ser um objeto provedor→modelo");
  } else {
    for (const [prov, modelo] of Object.entries(mp as Record<string, unknown>)) {
      if (PROVEDORES.indexOf(prov as ProvedorIaId) < 0) {
        erros.push("modeloPadrao com provedor desconhecido: " + prov);
        continue;
      }
      if (modelo !== null) {
        const catalogo = MODELOS_POR_PROVEDOR[prov as ProvedorIaId];
        if (typeof modelo !== "string" || catalogo.indexOf(modelo) < 0) {
          erros.push("modelo padrão fora do catálogo do provedor " + prov);
        }
      }
    }
  }

  const cadeia = r["cadeiaFallback"];
  if (!Array.isArray(cadeia)) {
    erros.push("cadeiaFallback deve ser uma lista de provedores");
  } else {
    const vistos: Record<string, boolean> = {};
    for (const p of cadeia) {
      if (PROVEDORES.indexOf(p as ProvedorIaId) < 0) erros.push("cadeiaFallback com provedor desconhecido");
      else if (vistos[p as string]) erros.push("cadeiaFallback não pode repetir provedor");
      vistos[p as string] = true;
    }
  }

  if (JSON.stringify(c).toLowerCase().includes("chave")) {
    erros.push("chaves não pertencem ao cliente (server-side, fase06)");
  }
  return erros;
}

/** Saneia valor cru (storage OU servidor): inválido/corrompido → padrão fail-closed. */
export function normalizarConfigIaGlobal(raw: unknown): ConfigIaGlobal {
  if (validarConfigIaGlobal(raw).length > 0) {
    return { modeloPadrao: { ...CONFIG_IA_GLOBAL_PADRAO.modeloPadrao }, cadeiaFallback: [] };
  }
  const r = raw as { modeloPadrao: Record<string, string | null>; cadeiaFallback: ProvedorIaId[] };
  const modeloPadrao: Record<ProvedorIaId, string | null> = { ...CONFIG_IA_GLOBAL_PADRAO.modeloPadrao };
  for (const p of PROVEDORES) {
    const m = r.modeloPadrao[p];
    modeloPadrao[p] = typeof m === "string" ? m : null;
  }
  return { modeloPadrao, cadeiaFallback: r.cadeiaFallback.slice() };
}

// ─── Herança (helpers puros — a MESMA regra é espelhada no ProxyIA) ─────────

/** Provedor efetivo do tenant: o próprio; senão o 1º da cadeia global; senão null. */
export function provedorEfetivoGlobal(cfg: ConfigIaTenant, global: ConfigIaGlobal): ProvedorIaId | null {
  if (cfg && cfg.provedor !== null) return cfg.provedor;
  return (global && global.cadeiaFallback[0]) || null;
}

/** Modelo efetivo p/ um provedor: modelo do tenant (se o provedor é o do tenant); senão padrão global; senão null. */
export function modeloEfetivoGlobal(
  provedor: ProvedorIaId | null,
  cfg: ConfigIaTenant,
  global: ConfigIaGlobal
): string | null {
  if (provedor === null) return null;
  if (cfg && cfg.provedor === provedor && cfg.modelo) return cfg.modelo;
  return (global && global.modeloPadrao[provedor]) || null;
}

/** Fallbacks efetivos: o do tenant (lista de 1); senão a cadeia global SEM o provedor efetivo. */
export function fallbacksEfetivosGlobal(cfg: ConfigIaTenant, global: ConfigIaGlobal): ProvedorIaId[] {
  if (cfg && cfg.fallback !== null) return [cfg.fallback];
  const primario = provedorEfetivoGlobal(cfg, global);
  return ((global && global.cadeiaFallback) || []).filter((p) => p !== primario);
}

// ─── Persistência local (espelho de leitura; o servidor é a verdade) ────────

const CHAVE_IA_GLOBAL = "pipoca.admin.iaglobal.v1";

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Ausente/corrompida → padrão fail-closed. */
export function carregarConfigIaGlobal(armazem?: StorageLike): ConfigIaGlobal {
  const st = armazem ?? storagePadrao();
  if (!st) return normalizarConfigIaGlobal(null);
  try {
    const raw = st.getItem(CHAVE_IA_GLOBAL);
    if (raw === null) return normalizarConfigIaGlobal(null);
    return normalizarConfigIaGlobal(JSON.parse(raw) as unknown);
  } catch {
    return normalizarConfigIaGlobal(null);
  }
}

export function salvarConfigIaGlobal(c: ConfigIaGlobal, armazem?: StorageLike): void {
  const st = armazem ?? storagePadrao();
  if (!st) return;
  try {
    st.setItem(CHAVE_IA_GLOBAL, JSON.stringify(normalizarConfigIaGlobal(c)));
  } catch {
    /* degradação silenciosa */
  }
}

// ─── Status de chave (SÓ o formato mascarado que o servidor devolve) ────────

export interface StatusChaveIa {
  provedor: ProvedorIaId;
  configurada: boolean;
  /** Ex.: "****ab12" — o servidor NUNCA devolve a chave inteira. */
  mascarada: string | null;
  fonte: "banco" | "ambiente" | null;
}

/** Rótulo humano do status (fail-closed: entrada estranha → "não configurada"). */
export function rotuloStatusChave(s: StatusChaveIa | null | undefined): string {
  if (!s || s.configurada !== true) return "não configurada";
  const mascara = typeof s.mascarada === "string" && /^\*{4}.{0,4}$/.test(s.mascarada) ? s.mascarada : "****";
  const fonte = s.fonte === "ambiente" ? " · secret do ambiente" : "";
  return "configurada · " + mascara + fonte;
}
