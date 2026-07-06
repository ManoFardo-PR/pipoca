/**
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
