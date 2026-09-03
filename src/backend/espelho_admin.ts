/**
 * [espelho_admin.ts] — Espelho remoto (admin-only) do painel do operador:
 *   upserts/pulls de tenants, conteúdo, flags e config-IA no PostgREST + cliente
 *   KEYLESS da Edge Function admin-chaves-ia.
 *
 * PAPEL: admin (espelho remoto do operador; cliente keyless da edge admin-chaves-ia)
 * POR QUE EXISTE: tirar tenants/conteúdo/flags/config-IA do localStorage-só e
 *   dar espelho no servidor para operadores em navegadores diferentes
 *   convergirem; e gerenciar as chaves de IA via edge (write-only).
 * ENTRA: Tenant/CenarioVersionado/FeatureFlags/ConfigIaGlobal/ProvedorIaId +
 *   chave crua (write-only); ConfigBackend e Transporte opcionais.
 * SAI: upserts fire-and-forget (boolean); pulls que substituem o local
 *   (SERVIDOR VENCE); StatusChaveIa mascarado; decorator
 *   envolverRepoTenantComEspelho.
 * CHAMA: config.ts, adaptadores/auth_supabase.ts:criarAuthSupabase,
 *   ia/provedor:transportePadrao, admin/{tenant,validar_grafo,flags,ia_global,
 *   ia_config}.
 * É CHAMADO POR: admin/bridge_admin.ts (SÓ), backend.test.ts.
 * RODA POR: boot do admin (bundle); cliente das Edge Functions.
 * CUIDADO: importado SÓ por bridge_admin.ts — NÃO entra no bundle da criança.
 *   Guarda de TODAS as funções: provedor supabase + sessão de OPERADOR + token;
 *   qualquer outra situação → false/null em silêncio, nunca lança. Cliente
 *   KEYLESS de admin-chaves-ia: manda apenas o bearer do OPERADOR + a anon key
 *   pública — NENHUMA chave de provedor vive no cliente; a chave passa
 *   write-only e morre com a chamada, e sanearStatus é fail-closed (só aceita o
 *   formato mascarado "****"+até 4). SERVIDOR VENCE no pull: escrita local
 *   offline que nunca espelhou é sobrescrita no próximo login.
 *
 * — detalhe preservado —
 * Pipoca — Espelho remoto do painel do operador (pós-fase06)
 * -----------------------------------------------------------
 * Tenants, conteúdo e flags saem do localStorage-só e ganham espelho no
 * PostgREST, no MESMO padrão de `espelharConfigIA` (backend.ts): o local
 * segue sendo a base (telas não mudam), a escrita espelha fire-and-forget
 * e o PULL no login do operador faz navegadores diferentes convergirem
 * (SERVIDOR VENCE no pull — limite documentado: escrita local offline que
 * nunca espelhou é sobrescrita no próximo login).
 *
 * IMPORTANTE: este módulo é importado SÓ por bridge_admin.ts — não entra no
 * bundle da criança (o app da família lê apenas flags, via flags_globais.ts).
 * Guardas de TODAS as funções: provedor supabase + sessão de OPERADOR +
 * token; qualquer outra situação devolve false/null em silêncio, nunca lança.
 */

import type { Tenant } from "../admin/tenant/tiposTenant.js";
import type { RepositorioTenant } from "../admin/tenant/repositorioTenant.js";
import {
  validarEnvelopeTenant,
  substituirTenantsLocais,
} from "../admin/tenant/repositorioTenant.js";
import type { CenarioVersionado } from "../admin/validar_grafo.js";
import {
  validarEnvelopeCenario,
  substituirCenariosLocais,
} from "../admin/validar_grafo.js";
import type { FeatureFlags } from "../admin/flags.js";
import { normalizarFlags, salvarFlags } from "../admin/flags.js";
import type { ConfigIaGlobal, StatusChaveIa } from "../admin/ia_global.js";
import {
  normalizarConfigIaGlobal,
  salvarConfigIaGlobal,
  validarConfigIaGlobal,
} from "../admin/ia_global.js";
import type { ProvedorIaId } from "../admin/ia_config.js";
import { configDoAmbiente, type ConfigBackend } from "./config.js";
import { criarAuthSupabase } from "./adaptadores/auth_supabase.js";
import { transportePadrao, type Transporte } from "../ia/provedor.js";

export const ESQUEMA_CONTEUDO = "pipoca.conteudo.v1";

/** Sessão de operador pronta para o REST — ou null (guarda comum). */
async function contextoOperador(
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<{ base: string; headers: Record<string, string>; t: Transporte } | null> {
  const cfg = config || configDoAmbiente();
  if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const auth = criarAuthSupabase({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      ...(transporte ? { transporte } : {}),
    });
    const s = auth.sessaoAtual();
    if (!s || s.tipo !== "superadmin") return null;
    const token = await auth.obterToken();
    if (!token) return null;
    return {
      base: cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1",
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      t: transporte || transportePadrao(),
    };
  } catch {
    return null;
  }
}

async function upsert(
  ctx: { base: string; headers: Record<string, string>; t: Transporte },
  caminho: string,
  linhas: unknown[],
  prefer = "resolution=merge-duplicates,return=minimal"
): Promise<boolean> {
  try {
    const resp = await ctx.t(ctx.base + caminho, {
      method: "POST",
      headers: { ...ctx.headers, Prefer: prefer },
      body: JSON.stringify(linhas),
    });
    return resp.status >= 200 && resp.status < 300;
  } catch {
    return false;
  }
}

async function lerLinhas(
  ctx: { base: string; headers: Record<string, string>; t: Transporte },
  caminho: string
): Promise<Array<{ dados?: unknown }>> {
  const resp = await ctx.t(ctx.base + caminho, { method: "GET", headers: ctx.headers });
  if (resp.status < 200 || resp.status >= 300) throw new Error("HTTP " + resp.status);
  const json = (await resp.json()) as unknown;
  return Array.isArray(json) ? (json as Array<{ dados?: unknown }>) : [];
}

/** Upsert do tenant na tabela `tenants` (envelope pipoca.tenant.v1 em dados). */
export async function espelharTenantRemoto(
  t: Tenant,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean> {
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return false;
  return upsert(ctx, "/tenants?on_conflict=id", [
    { id: t.id, dados: { esquema: "pipoca.tenant.v1", tenant: { ...t } } },
  ]);
}

/** Upsert do cenário na tabela `conteudo` — identidade composta (cenario_id, versao). */
export async function espelharCenarioRemoto(
  c: CenarioVersionado,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean> {
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return false;
  return upsert(ctx, "/conteudo?on_conflict=cenario_id,versao", [
    {
      cenario_id: c.cenarioId,
      versao: c.versao,
      tenant_id: c.tenantId,
      publicado_em: c.publicadoEm,
      dados: { esquema: ESQUEMA_CONTEUDO, cenario: { ...c } },
    },
  ]);
}

/**
 * Vínculo explícito conta↔tenant na tabela `contas_tenant` (pós-fase06).
 * A família resolve o tenant real no login por este vínculo; e-mail sempre
 * minúsculo (as policies reforçam com lower()). ignore-duplicates: revincular
 * o mesmo par é no-op.
 */
export async function espelharVinculoConta(
  email: string,
  tenantId: string,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean> {
  const e = (email || "").trim().toLowerCase();
  if (!e || !e.includes("@") || !tenantId) return false;
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return false;
  return upsert(
    ctx,
    "/contas_tenant?on_conflict=email,tenant_id",
    [{ email: e, tenant_id: tenantId }],
    "resolution=ignore-duplicates,return=minimal"
  );
}

/** Upsert das flags na linha única `flags_admin.id='global'` (kill-switch global). */
export async function espelharFlagsRemotas(
  flags: FeatureFlags,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean> {
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return false;
  return upsert(ctx, "/flags_admin?on_conflict=id", [{ id: "global", dados: { ...flags } }]);
}

export interface ResultadoPullAdmin {
  tenants: number;
  cenarios: number;
  flags: boolean;
}

/**
 * Pull no login/boot do operador: o SERVIDOR VENCE (substituição integral das
 * chaves locais — operadores em navegadores diferentes convergem). Envelopes
 * corrompidos são descartados em silêncio; flags SEM linha no servidor não
 * tocam o local (o seed é deliberadamente o 1º salvamento em SA_SAFE).
 */
export async function puxarAdminDoServidor(
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<ResultadoPullAdmin | null> {
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return null;
  try {
    const [linhasT, linhasC, linhasF] = await Promise.all([
      lerLinhas(ctx, "/tenants?select=dados"),
      lerLinhas(ctx, "/conteudo?select=dados"),
      lerLinhas(ctx, "/flags_admin?select=dados&id=eq.global"),
    ]);
    const tenants: Tenant[] = [];
    for (const l of linhasT) {
      const t = validarEnvelopeTenant(l ? l.dados : null);
      if (t !== null) tenants.push(t);
    }
    substituirTenantsLocais(tenants);
    const cenarios: CenarioVersionado[] = [];
    for (const l of linhasC) {
      const c = validarEnvelopeCenario(l ? l.dados : null);
      if (c !== null) cenarios.push(c);
    }
    substituirCenariosLocais(cenarios);
    let flags = false;
    const linhaFlags = linhasF[0];
    if (linhaFlags && linhaFlags.dados && typeof linhaFlags.dados === "object") {
      salvarFlags(normalizarFlags(linhaFlags.dados));
      flags = true;
    }
    return { tenants: tenants.length, cenarios: cenarios.length, flags };
  } catch {
    return null;
  }
}

// ─── Config GLOBAL de IA + chaves (tarefa #31 · SA_IA_GLOBAL) ────────────────

/** Linha reservada em `config_ia` para a config GLOBAL (dados = ConfigIaGlobal). */
export const ID_CONFIG_IA_GLOBAL = "plataforma:global";

/**
 * Upsert da config global de IA na linha reservada de `config_ia` (a edge realizador
 * lê essa linha server-side para herança de modelo padrão e cadeia de
 * fallback). Recusa payload inválido — inclusive qualquer "chave" (a mesma
 * lei do por-tenant: chave nunca sai do servidor nem entra pelo cliente).
 */
export async function espelharConfigIaGlobal(
  cfg: ConfigIaGlobal,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean> {
  if (validarConfigIaGlobal(cfg).length > 0) return false;
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return false;
  return upsert(ctx, "/config_ia?on_conflict=tenant_id", [
    { tenant_id: ID_CONFIG_IA_GLOBAL, dados: normalizarConfigIaGlobal(cfg) },
  ]);
}

/**
 * Pull da config global (SERVIDOR VENCE): valida, grava o espelho local e
 * devolve a config. Sem linha/inválida → null (local intacto — o seed é o
 * 1º salvamento na tela).
 */
export async function puxarConfigIaGlobal(
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<ConfigIaGlobal | null> {
  const ctx = await contextoOperador(config, transporte);
  if (!ctx) return null;
  try {
    const linhas = await lerLinhas(
      ctx,
      "/config_ia?select=dados&tenant_id=eq." + encodeURIComponent(ID_CONFIG_IA_GLOBAL)
    );
    const dados = linhas[0] ? linhas[0].dados : null;
    if (!dados || validarConfigIaGlobal(dados).length > 0) return null;
    const cfg = normalizarConfigIaGlobal(dados);
    salvarConfigIaGlobal(cfg);
    return cfg;
  } catch {
    return null;
  }
}

/** POST autenticado na Edge Function admin-chaves-ia — ou null (guarda comum). */
async function chamarAdminChavesIa(
  corpo: Record<string, unknown>,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<unknown | null> {
  const cfg = config || configDoAmbiente();
  if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const auth = criarAuthSupabase({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      ...(transporte ? { transporte } : {}),
    });
    const s = auth.sessaoAtual();
    if (!s || s.tipo !== "superadmin") return null;
    const token = await auth.obterToken();
    if (!token) return null;
    const t = transporte || transportePadrao();
    const resp = await t(cfg.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/admin-chaves-ia", {
      method: "POST",
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(corpo),
    });
    if (resp.status < 200 || resp.status >= 300) return null;
    return (await resp.json()) as unknown;
  } catch {
    return null;
  }
}

/** O que veio do servidor vira StatusChaveIa saneado — e NUNCA contém chave inteira. */
function sanearStatus(raw: unknown): StatusChaveIa | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const provedores: ProvedorIaId[] = ["claude", "gemini", "openai", "deepseek"];
  if (provedores.indexOf(r["provedor"] as ProvedorIaId) < 0) return null;
  const mascarada = typeof r["mascarada"] === "string" ? r["mascarada"] : null;
  // fail-closed: só aceita o FORMATO mascarado ("****" + até 4) — nada além disso
  if (mascarada !== null && !/^\*{4}.{0,4}$/.test(mascarada)) return null;
  return {
    provedor: r["provedor"] as ProvedorIaId,
    configurada: r["configurada"] === true,
    mascarada,
    fonte: r["fonte"] === "banco" || r["fonte"] === "ambiente" ? (r["fonte"] as "banco" | "ambiente") : null,
  };
}

/** Status mascarado das chaves dos 4 provedores — ou null (sem backend/operador). */
export async function statusChavesIa(
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<StatusChaveIa[] | null> {
  const resp = await chamarAdminChavesIa({ acao: "status" }, config, transporte);
  if (!resp || typeof resp !== "object") return null;
  const lista = (resp as { provedores?: unknown }).provedores;
  if (!Array.isArray(lista)) return null;
  const saneados: StatusChaveIa[] = [];
  for (const item of lista) {
    const s = sanearStatus(item);
    if (s) saneados.push(s);
  }
  return saneados;
}

/**
 * Envia a chave ao servidor (write-only) e devolve APENAS o status mascarado.
 * A chave não é validada nem retida aqui — passa direto e morre com a chamada.
 */
export async function salvarChaveIa(
  provedor: ProvedorIaId,
  chave: string,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<StatusChaveIa | null> {
  const resp = await chamarAdminChavesIa({ acao: "salvar", provedor, chave }, config, transporte);
  if (!resp || typeof resp !== "object") return null;
  return sanearStatus((resp as { provedor?: unknown }).provedor);
}

/** Teste de conexão server-side — true/false, ou null se a chamada não rolou. */
export async function testarChaveIa(
  provedor: ProvedorIaId,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<boolean | null> {
  const resp = await chamarAdminChavesIa({ acao: "testar", provedor }, config, transporte);
  if (!resp || typeof resp !== "object") return null;
  return (resp as { ok?: unknown }).ok === true;
}

/**
 * Decorator do seam de tenants: mesma instância, com `salvarTenant` gravando
 * local (await, como sempre) + espelho remoto fire-and-forget. As telas do
 * admin não mudam — o embrulho acontece no estadoAdmin.
 */
export function envolverRepoTenantComEspelho(
  repo: RepositorioTenant,
  config?: ConfigBackend,
  transporte?: Transporte
): RepositorioTenant {
  return {
    listarTenants: (escopo) => repo.listarTenants(escopo),
    obterTenant: (id) => repo.obterTenant(id),
    listarPlanos: () => repo.listarPlanos(),
    obterLimitesEfetivos: (id, agora) => repo.obterLimitesEfetivos(id, agora),
    async salvarTenant(t: Tenant): Promise<void> {
      await repo.salvarTenant(t);
      espelharTenantRemoto(t, config, transporte).catch(() => {});
    },
  };
}
