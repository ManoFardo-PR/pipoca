/**
 * [index.ts] — Fábrica e contrato do repositório de persistência: a interface
 *   RepositorioPersistencia + criarRepositorio() (o LOCAL, base do aparelho).
 *
 * PAPEL: core-lógica (persistência · seam de leitura/escrita)
 * POR QUE EXISTE: LEI DO SEAM — nenhuma tela toca localStorage ou Supabase direto;
 *   toda leitura/escrita (perfis, save, telemetria, histórias) passa por este contrato.
 * ENTRA: nada (fábrica sem parâmetros).
 * SAI: a interface RepositorioPersistencia + criarRepositorio() →
 *   RepositorioLocalStorage; re-exporta RepositorioLocalStorage.
 * CHAMA: RepositorioLocalStorage.ts (impl local) + tipos de perfil.ts, estado.ts,
 *   historias.ts.
 * É CHAMADO POR: app/bridge.ts (criarRepositorio no boot), backend/backend.ts e
 *   adaptadores/{repo_supabase,repo_sincronizado,repo_local}.ts,
 *   backend/{sync,migracao}.ts, core/{captura,lgpd}.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes.
 * CUIDADO: o adaptador REMOTO real (fase06) vive em src/backend/adaptadores/
 *   (repo_supabase + repo_sincronizado) e chega às telas pela fachada `obterBackend()`,
 *   NUNCA por esta fábrica; os métodos de histórias/poda são OPCIONAIS por contrato
 *   aditivo (consumidores usam guardas).
 *
 * — detalhe preservado —
 * Pipoca — Fábrica do repositório de persistência
 * -------------------------------------------------
 * LEI DO SEAM: nenhuma tela importa localStorage ou Supabase diretamente.
 * Toda leitura/escrita passa por RepositorioPersistencia.
 *
 * criarRepositorio() → RepositorioLocalStorage (a base do aparelho).
 * O adaptador REMOTO real (fase06) vive em src/backend/adaptadores/
 * (repo_supabase + repo_sincronizado) e chega às telas pela fachada
 * `obterBackend()` — nunca por esta fábrica.
 */

import { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";
import type { RepositorioPersistencia } from "./tipos.js";

// D3 (Plan03): o CONTRATO vive em ./tipos.ts (arquivo só de tipos) — fim do
// ciclo type-only em que a implementação importava a interface deste barril.
export type { RepositorioPersistencia } from "./tipos.js";

export { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";

/** Fábrica do repositório LOCAL (base do aparelho). */
export function criarRepositorio(): RepositorioPersistencia {
  return new RepositorioLocalStorage();
}
