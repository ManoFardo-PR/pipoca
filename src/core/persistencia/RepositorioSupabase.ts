/**
 * Pipoca — Repositório Supabase (stub — ponto de migração para fase06)
 * ----------------------------------------------------------------------
 * Esqueleto do adaptador remoto. Cada método lança erro explícito até
 * a fase de migração estar completa.
 *
 * PONTO DE MIGRAÇÃO (fase06):
 *   - Tabelas: `perfis`, `saves`, `telemetria`
 *   - RLS por família (supabase row-level security)
 *   - Auth: ServicoAuth (lei do seam — não importar SDK direto nas telas)
 *   - Trocar criarRepositorio({ remoto: true }) para ativar.
 */

import type { Perfil } from "../perfil.js";
import type { EstadoApp, EventoTelemetria } from "../estado.js";
import type { RepositorioPersistencia } from "./index.js";

export class RepositorioSupabase implements RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]> {
    return Promise.reject(
      new Error(
        "RepositorioSupabase: não implementado — ponto de migração fase06. " +
          "Use criarRepositorio() (local) no MVP."
      )
    );
  }

  salvarPerfil(_p: Perfil): Promise<void> {
    return Promise.reject(
      new Error("RepositorioSupabase: não implementado — ponto de migração fase06.")
    );
  }

  carregarSave(_perfilId: string): Promise<EstadoApp | null> {
    return Promise.reject(
      new Error("RepositorioSupabase: não implementado — ponto de migração fase06.")
    );
  }

  salvarSave(_perfilId: string, _estado: EstadoApp): Promise<void> {
    return Promise.reject(
      new Error("RepositorioSupabase: não implementado — ponto de migração fase06.")
    );
  }

  registrarTelemetria(_evento: EventoTelemetria): Promise<void> {
    return Promise.reject(
      new Error("RepositorioSupabase: não implementado — ponto de migração fase06.")
    );
  }

  apagarPerfil(_perfilId: string): Promise<void> {
    return Promise.reject(
      new Error("RepositorioSupabase: não implementado — ponto de migração fase06.")
    );
  }
}
