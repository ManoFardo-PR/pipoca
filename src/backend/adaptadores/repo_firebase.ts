/**
 * [repo_firebase.ts] — Adaptador RepositorioPersistencia do Firebase: stub
 *   honesto, toda leitura/escrita rejeita com erro limpo.
 *
 * PAPEL: backend (adaptador repo · stub honesto / paridade documentada)
 * POR QUE EXISTE: mesma prova de portabilidade do auth_firebase — a
 *   implementação real é só preencher este adaptador (lei do backend).
 * ENTRA: Perfil/EstadoApp/EventoTelemetria (rejeitados).
 * SAI: métodos que rejeitam com NAO_CONFIGURADO.
 * CHAMA: core/perfil, core/estado, core/persistencia (tipos).
 * É CHAMADO POR: backend.ts (criarBackendFirebase), backend.test.ts.
 * RODA POR: boot do app/admin (bundle) quando provedor="firebase".
 * CUIDADO: stub — paridade documentada em PARIDADE.md; não configurado neste
 *   build.
 *
 * — detalhe preservado —
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
