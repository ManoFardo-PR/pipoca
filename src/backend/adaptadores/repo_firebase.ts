/**
 * Pipoca — Repositório Firebase (stub honesto) · doc fase06-06-03
 * ----------------------------------------------------------------
 * Interface completa de RepositorioPersistencia com erro limpo em toda
 * operação de escrita/leitura remota. Paridade documentada em PARIDADE.md;
 * implementação real = trocar este adaptador (lei do backend).
 */

import type { Perfil } from "../../core/perfil.js";
import type { EstadoApp, EventoTelemetria } from "../../core/estado.js";
import type { RepositorioPersistencia } from "../../core/persistencia/index.js";

const NAO_CONFIGURADO = "RepositorioFirebase não configurado neste build (paridade documentada — fase06).";

export class RepositorioFirebase implements RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  salvarPerfil(_p: Perfil): Promise<void> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  carregarSave(_perfilId: string): Promise<EstadoApp | null> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  salvarSave(_perfilId: string, _estado: EstadoApp): Promise<void> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  registrarTelemetria(_evento: EventoTelemetria): Promise<void> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  carregarTelemetria(_perfilId: string): Promise<EventoTelemetria[]> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
  apagarPerfil(_perfilId: string): Promise<void> {
    return Promise.reject(new Error(NAO_CONFIGURADO));
  }
}
