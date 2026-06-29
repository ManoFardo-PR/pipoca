/**
 * Pipoca — Fábrica do repositório de persistência
 * -------------------------------------------------
 * LEI DO SEAM: nenhuma tela importa localStorage ou Supabase diretamente.
 * Toda leitura/escrita passa por RepositorioPersistencia.
 *
 * MVP: criarRepositorio() → RepositorioLocalStorage (sempre local).
 * Migração fase06: criarRepositorio({ remoto: true }) → RepositorioSupabase.
 */

import type { Perfil } from "../perfil.js";
import type { EstadoApp, EventoTelemetria } from "../estado.js";
import { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";
import { RepositorioSupabase } from "./RepositorioSupabase.js";

export interface RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]>;
  salvarPerfil(p: Perfil): Promise<void>;
  carregarSave(perfilId: string): Promise<EstadoApp | null>;
  salvarSave(perfilId: string, estado: EstadoApp): Promise<void>;
  registrarTelemetria(evento: EventoTelemetria): Promise<void>;
}

export { RepositorioLocalStorage } from "./RepositorioLocalStorage.js";
export { RepositorioSupabase } from "./RepositorioSupabase.js";

/**
 * Fábrica do repositório.
 * MVP: devolve sempre a implementação local.
 * Com { remoto: true }: devolve stub do Supabase (lança erro — fase06).
 */
export function criarRepositorio(
  opts?: { remoto?: boolean }
): RepositorioPersistencia {
  if (opts?.remoto) {
    return new RepositorioSupabase();
  }
  return new RepositorioLocalStorage();
}
