/**
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
import { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";

export interface RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]>;
  salvarPerfil(p: Perfil): Promise<void>;
  carregarSave(perfilId: string): Promise<EstadoApp | null>;
  salvarSave(perfilId: string, estado: EstadoApp): Promise<void>;
  registrarTelemetria(evento: EventoTelemetria): Promise<void>;
  /** Lê os eventos de telemetria de um perfil (origem do painel PC_DASH). */
  carregarTelemetria(perfilId: string): Promise<EventoTelemetria[]>;
  /** LGPD: remove o perfil + seu save + sua telemetria. */
  apagarPerfil(perfilId: string): Promise<void>;
}

export { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";

/** Fábrica do repositório LOCAL (base do aparelho). */
export function criarRepositorio(): RepositorioPersistencia {
  return new RepositorioLocalStorage();
}
