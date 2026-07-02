/**
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
