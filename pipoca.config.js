/**
 * Pipoca — config PÚBLICA do backend trocável (fase06-06-06).
 * ------------------------------------------------------------
 * Carregado nos dois entries (index.html / admin.html) ANTES dos bundles.
 * Só valores públicos por design (URL do projeto + anon key do Supabase,
 * protegidos por RLS no servidor) — segredos NUNCA entram aqui.
 *
 * O guard `||` permite override: os runners e2e injetam
 * `window.PIPOCA_CONFIG = { provedor: "local" }` antes do boot e o app
 * roda 100% offline. Sem este arquivo (404) ou com config incompleta,
 * o backend degrada para "local" (fail-safe — src/backend/config.ts).
 *
 * provedor: "supabase" | "firebase" | "local".
 */
window.PIPOCA_CONFIG = window.PIPOCA_CONFIG || {
  provedor: "local",
};
