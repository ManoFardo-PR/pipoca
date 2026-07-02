/**
 * Pipoca — Config do backend trocável (fase06-06-06)
 * ---------------------------------------------------
 * `ConfigBackend { provedor: "supabase"|"firebase"|"local"; ... }` vem de
 * `window.PIPOCA_CONFIG` (arquivo público `pipoca.config.js`, carregado nos
 * dois entries ANTES dos bundles; só valores públicos — URL + anon key,
 * protegidos por RLS). A leitura é LAZY (na chamada, nunca no load do
 * módulo) para o e2e poder injetar `{provedor:"local"}` via addInitScript.
 * FAIL-SAFE: ausente/malformado/incompleto → "local" (offline-first,
 * regra 4 do doc 06-01).
 */

export type ProvedorBackend = "supabase" | "firebase" | "local";

export interface ConfigBackend {
  provedor: ProvedorBackend;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  opcoes?: Record<string, unknown>;
}

export const CONFIG_LOCAL: ConfigBackend = { provedor: "local" };

/** Normaliza um valor cru em ConfigBackend — qualquer dúvida degrada para "local". */
export function normalizarConfigBackend(raw: unknown): ConfigBackend {
  if (!raw || typeof raw !== "object") return { ...CONFIG_LOCAL };
  const r = raw as Record<string, unknown>;
  const provedor = r["provedor"];

  if (provedor === "supabase") {
    const url = r["supabaseUrl"];
    const anon = r["supabaseAnonKey"];
    if (typeof url === "string" && url.length > 0 && typeof anon === "string" && anon.length > 0) {
      return { provedor: "supabase", supabaseUrl: url.replace(/\/+$/, ""), supabaseAnonKey: anon };
    }
    return { ...CONFIG_LOCAL }; // supabase sem credenciais públicas → local
  }
  if (provedor === "firebase") {
    const opcoes = r["opcoes"];
    return { provedor: "firebase", opcoes: opcoes && typeof opcoes === "object" ? (opcoes as Record<string, unknown>) : {} };
  }
  return { ...CONFIG_LOCAL };
}

/** Lê a config do ambiente (window.PIPOCA_CONFIG) — lazy e fail-safe. */
export function configDoAmbiente(): ConfigBackend {
  try {
    const g = globalThis as unknown as { PIPOCA_CONFIG?: unknown };
    return normalizarConfigBackend(g.PIPOCA_CONFIG);
  } catch {
    return { ...CONFIG_LOCAL };
  }
}
