/**
 * Pipoca — config PÚBLICA do backend trocável (fase06-06-06).
 * ------------------------------------------------------------
 * Carregado nos dois entries (index.html / admin.html) ANTES dos bundles.
 * Só valores públicos por design (URL do projeto + anon key do Supabase,
 * protegidos por RLS no servidor) — segredos NUNCA entram aqui: as chaves
 * dos provedores de IA vivem nos secrets da Edge Function proxy-ia.
 *
 * O guard `||` permite override: os runners e2e injetam
 * `window.PIPOCA_CONFIG = { provedor: "local" }` antes do boot e o app
 * roda 100% offline. Sem este arquivo (404) ou com config incompleta,
 * o backend degrada para "local" (fail-safe — src/backend/config.ts).
 *
 * provedor: "supabase" | "local" (D5: o ramo do BaaS alternativo foi aposentado).
 * Projeto: pipoca (sa-east-1) · ref bamlljvllcxdnsheatqv.
 */
window.PIPOCA_CONFIG = window.PIPOCA_CONFIG || {
  provedor: "supabase",
  supabaseUrl: "https://bamlljvllcxdnsheatqv.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbWxsanZsbGN4ZG5zaGVhdHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTkzNDcsImV4cCI6MjA5ODU5NTM0N30.YhWbucQmSMpIG_D3IU2FK-SM7b-2TxTYwmiLciefgNo",
};
