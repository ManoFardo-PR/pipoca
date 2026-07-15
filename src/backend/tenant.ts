/**
 * [tenant.ts] — `escopoTenant(sessao)` deriva o tenant de uma SessaoAuth; toda
 *   leitura/escrita remota filtra por ele.
 *
 * PAPEL: backend (escopo multi-tenant)
 * POR QUE EXISTE: dar UMA regra de derivação do tenant para filtrar o acesso
 *   remoto; a barreira dura é o RLS/Rules do provedor.
 * ENTRA: SessaoAuth | null.
 * SAI: string do tenant ("familia:<uid>" sintético ou o tenantId vinculado) ou
 *   null.
 * CHAMA: auth.ts:SessaoAuth (tipo).
 * É CHAMADO POR: backend.ts, limites_familia.ts (repo_supabase/proxy recebem o
 *   resultado por callback), backend.test.ts.
 * RODA POR: boot do app/admin (bundle); cliente das Edge Functions.
 * CUIDADO: é só derivação — o enforcement REAL é o RLS/Rules do servidor
 *   (adaptadores/rls_supabase.sql). MVP sem vínculo: cada família é seu tenant
 *   sintético "familia:<uid>". Superadmin não tem tenant próprio (o escopo vem
 *   da sessão dele) → devolve null.
 *
 * — detalhe preservado —
 * Pipoca — Escopo de tenant (fase06-06-04)
 * -----------------------------------------
 * `escopoTenant(sessao)` deriva o tenant de uma `SessaoAuth` — TODA
 * leitura/escrita remota filtra por ele (a barreira dura é o RLS/Rules do
 * provedor; ver adaptadores/rls_supabase.sql). No MVP sem vínculo explícito,
 * cada família é seu próprio tenant sintético ("familia:<uid>"); o operador
 * não tem tenant próprio (opera sobre o escopo da sessão dele).
 */

import type { SessaoAuth } from "./auth.js";

export function escopoTenant(sessao: SessaoAuth | null): string | null {
  if (!sessao || !sessao.uid) return null;
  if (sessao.tenantId) return sessao.tenantId;
  if (sessao.tipo === "familia") return "familia:" + sessao.uid;
  return null; // superadmin: escopo vem da sessão do operador, não daqui
}
