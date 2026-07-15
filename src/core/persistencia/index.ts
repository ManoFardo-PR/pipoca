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
 *   adaptadores/{repo_supabase,repo_sincronizado,repo_firebase,repo_local}.ts,
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

import type { Perfil } from "../perfil.js";
import type { EstadoApp, EventoTelemetria } from "../estado.js";
import type { HistoriaSalva } from "../historias.js";
import { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";

export interface RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]>;
  salvarPerfil(p: Perfil): Promise<void>;
  carregarSave(perfilId: string): Promise<EstadoApp | null>;
  salvarSave(perfilId: string, estado: EstadoApp): Promise<void>;
  registrarTelemetria(evento: EventoTelemetria): Promise<void>;
  /** Lê os eventos de telemetria de um perfil (origem do painel PC_DASH). */
  carregarTelemetria(perfilId: string): Promise<EventoTelemetria[]>;
  /**
   * Poda eventos além da retenção (90d padrão — fase03-03-03). OPCIONAL por
   * contrato aditivo; devolve quantos saíram (o remoto pode devolver 0).
   */
  podarTelemetria?(perfilId: string, agora: number, retencaoDias?: number): Promise<number>;
  /** LGPD: remove o perfil + seu save + sua telemetria + suas histórias. */
  apagarPerfil(perfilId: string): Promise<void>;
  // ─── Histórias salvas (pós-fase06) — OPCIONAIS por contrato aditivo ───────
  // (stubs/fakes antigos seguem válidos; os consumidores usam guardas.)
  /** Histórias válidas do perfil, mais novas primeiro. */
  carregarHistorias?(perfilId: string): Promise<HistoriaSalva[]>;
  /** Upsert por historia.id (favoritar = regravar com favorita=true). */
  salvarHistoria?(perfilId: string, historia: HistoriaSalva): Promise<void>;
  apagarHistoria?(perfilId: string, historiaId: string): Promise<void>;
  /** Poda por retenção (20d; favoritas ficam). Devolve quantas saíram. */
  podarHistorias?(perfilId: string, agora: number): Promise<number>;
}

export { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";

/** Fábrica do repositório LOCAL (base do aparelho). */
export function criarRepositorio(): RepositorioPersistencia {
  return new RepositorioLocalStorage();
}
