/**
 * [limites_familia.ts] — Resolve os limites VIGENTES do plano do próprio tenant
 *   lendo a linha em `tenants` (mesma régua do trigger do servidor).
 *
 * PAPEL: backend (leitura de limites no app da família)
 * POR QUE EXISTE: a UI mostrar o teto de perfis do plano da casa sem carregar o
 *   runtime admin; o enforcement real é o trigger do servidor.
 * ENTRA: agora? + ConfigBackend + Transporte opcionais; lê a linha `tenants` do
 *   próprio escopo (escopoTenant).
 * SAI: LimitesPlano vigente (Freemium vencido degrada aos limites do Grátis) ou
 *   null.
 * CHAMA: config.ts, adaptadores/auth_supabase.ts, tenant.ts:escopoTenant,
 *   admin/tenant/tiposTenant:limitesVigentes/validarEnvelopeTenant,
 *   ia/provedor:transportePadrao.
 * É CHAMADO POR: app/bridge.ts, backend.test.ts.
 * RODA POR: boot do app (bundle); cliente das Edge Functions.
 * CUIDADO: fail-soft por contrato — qualquer dúvida (não-supabase, sem sessão
 *   de família, sem token, HTTP≠2xx, envelope inválido) → null = "sem
 *   informação: deixa criar". O trigger `teto_perfis` do servidor é o
 *   enforcement REAL; aqui é UX acolhedora. Importa só o módulo puro
 *   tiposTenant (nada do runtime admin entra no bundle da criança).
 *
 * — detalhe preservado —
 * Pipoca — Limites do plano da FAMÍLIA (pós-fase06, iteração 2)
 * ---------------------------------------------------------------
 * O app da criança/cuidador resolve os limites VIGENTES do próprio tenant
 * lendo a linha em `tenants` (a policy `tenants_familia_leitura` deixa a
 * família ler a própria linha: sintética `familia:<uid>` ou vinculada por
 * `contas_tenant`). A régua é a MESMA do trigger do servidor:
 * `limitesVigentes` — Freemium vencido degrada aos limites do Grátis.
 *
 * Fail-soft por contrato: qualquer dúvida (provedor não-supabase, sem sessão
 * de família, sem token, HTTP≠2xx, envelope inválido) → null = "sem
 * informação: deixa criar" — o trigger `teto_perfis` do servidor é o
 * enforcement real; aqui é UX acolhedora. Importa SÓ o módulo puro
 * tiposTenant (nada do runtime admin entra no bundle da criança).
 */

import type { LimitesPlano } from "../admin/tenant/tiposTenant.js";
import { limitesVigentes, validarEnvelopeTenant } from "../admin/tenant/tiposTenant.js";
import { configDoAmbiente, type ConfigBackend } from "./config.js";
import { criarAuthSupabase } from "./adaptadores/auth_supabase.js";
import { escopoTenant } from "./tenant.js";
import { transportePadrao, type Transporte } from "../ia/provedor.js";

export async function limitesDaFamilia(
  agora?: number,
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<LimitesPlano | null> {
  const cfg = config || configDoAmbiente();
  if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const auth = criarAuthSupabase({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      ...(transporte ? { transporte } : {}),
    });
    const s = auth.sessaoAtual();
    if (!s || s.tipo !== "familia") return null;
    const tenant = escopoTenant(s);
    if (!tenant) return null;
    const token = await auth.obterToken();
    if (!token) return null;
    const t = transporte || transportePadrao();
    const resp = await t(
      cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/tenants?select=dados&id=eq." + encodeURIComponent(tenant),
      {
        method: "GET",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json",
        },
      }
    );
    if (resp.status < 200 || resp.status >= 300) return null;
    const json = (await resp.json()) as unknown;
    const linha = Array.isArray(json) ? (json[0] as { dados?: unknown } | undefined) : undefined;
    const dados = validarEnvelopeTenant(linha ? linha.dados : null);
    if (!dados) return null;
    return limitesVigentes(dados, typeof agora === "number" ? agora : Date.now());
  } catch {
    return null;
  }
}
