/**
 * [tipos.ts] — O CONTRATO da persistência: interface RepositorioPersistencia
 *   (perfis, save, telemetria, histórias) num arquivo só de tipos.
 *
 * PAPEL: core-lógica (persistência · tipos)
 * POR QUE EXISTE: D3 (Plan03) — desfazer o ciclo type-only index.ts ↔
 *   RepositorioLocalStorage.ts: a implementação importava a interface do
 *   barril que a re-exporta. O contrato agora vive aqui; index.ts re-exporta.
 * ENTRA/SAI: só tipos (zero runtime).
 * CHAMA: tipos de perfil.ts, estado.ts, historias.ts.
 * É CHAMADO POR: index.ts (re-export), RepositorioLocalStorage.ts e qualquer
 *   implementação/consumidor do contrato.
 */

import type { Perfil } from "../perfil.js";
import type { EstadoApp, EventoTelemetria } from "../estado.js";
import type { HistoriaSalva } from "../historias.js";

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
