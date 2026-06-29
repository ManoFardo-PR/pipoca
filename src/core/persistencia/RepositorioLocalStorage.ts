/**
 * Pipoca — Repositório localStorage (impl MVP de RepositorioPersistencia)
 * -------------------------------------------------------------------------
 * Implementação local para MVP. Todos os dados ficam no dispositivo do cuidador.
 * Postura LGPD: apagar perfil remove save + telemetria + entrada da lista.
 * Erros de escrita não interrompem a sessão da criança (degradação silenciosa).
 *
 * Invariante de segurança: todos os loads passam pelos validadores de schema em
 * src/dados/schemas.ts antes de retornar dados ao chamador. Payloads corrompidos
 * ou com tipos errados são descartados silenciosamente (null/[] de volta).
 */

import type { Perfil } from "../perfil.js";
import type { EstadoApp, EventoTelemetria } from "../estado.js";
import type { RepositorioPersistencia } from "./index.js";
import { validarEnvelopePerfil, validarEnvelopeSave } from "../../dados/schemas.js";
import { validarEvento } from "../telemetria.js";
import { podarPorRetencao, RETENCAO_DIAS_PADRAO } from "../../servicos/telemetria_repo.js";
import {
  CHAVE_PERFIS,
  chaveSave,
  chaveTelemetria,
  lerArrayEnvelopes,
  gravarItem,
} from "./chaves.js";

interface EnvelopePerfil {
  esquema: "pipoca.perfil.v1";
  perfil: Perfil;
}

interface EnvelopeTelemetria {
  esquema: "pipoca.telemetria.v1";
  evento: EventoTelemetria;
}

export class RepositorioLocalStorage implements RepositorioPersistencia {
  /**
   * Carrega todos os perfis validando cada envelope individualmente.
   * Entradas com esquema correto mas dados corrompidos são descartadas silenciosamente.
   */
  async carregarPerfis(): Promise<Perfil[]> {
    const raw = lerArrayEnvelopes<unknown>(CHAVE_PERFIS, "pipoca.perfil.v1");
    const validos: Perfil[] = [];
    for (const envelope of raw) {
      const perfil = validarEnvelopePerfil(envelope);
      if (perfil !== null) validos.push(perfil);
    }
    return validos;
  }

  async salvarPerfil(p: Perfil): Promise<void> {
    const raw = lerArrayEnvelopes<EnvelopePerfil>(CHAVE_PERFIS, "pipoca.perfil.v1");
    const semEste = raw.filter((e) => e.perfil?.id !== p.id);
    const novoEnvelope: EnvelopePerfil = {
      esquema: "pipoca.perfil.v1",
      perfil: { ...p },
    };
    gravarItem(CHAVE_PERFIS, [...semEste, novoEnvelope]);
  }

  /**
   * Carrega o save de um perfil e valida a estrutura completa do EstadoApp.
   * Retorna null para saves ausentes, com esquema errado, ou com campos inválidos.
   * O chamador pode usar carregarSaveComFallback (schemas.ts) para obter estadoInicial.
   */
  async carregarSave(perfilId: string): Promise<EstadoApp | null> {
    try {
      const raw = localStorage.getItem(chaveSave(perfilId));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return validarEnvelopeSave(parsed);
    } catch {
      return null;
    }
  }

  async salvarSave(perfilId: string, estado: EstadoApp): Promise<void> {
    const envelope = {
      esquema: "pipoca.save.v1",
      perfilId,
      estado,
    };
    gravarItem(chaveSave(perfilId), envelope);
  }

  async registrarTelemetria(evento: EventoTelemetria): Promise<void> {
    const chave = chaveTelemetria(evento.perfilId);
    let lista: EnvelopeTelemetria[] = [];
    try {
      const raw = localStorage.getItem(chave);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) lista = parsed as EnvelopeTelemetria[];
      }
    } catch {
    }
    const envelope: EnvelopeTelemetria = {
      esquema: "pipoca.telemetria.v1",
      evento,
    };
    gravarItem(chave, [...lista, envelope]);
  }

  /** Lê os eventos de telemetria válidos de um perfil (descarta corrompidos). */
  carregarTelemetria(perfilId: string): EventoTelemetria[] {
    const envelopes = lerArrayEnvelopes<EnvelopeTelemetria>(
      chaveTelemetria(perfilId),
      "pipoca.telemetria.v1"
    );
    return envelopes.map((e) => e.evento).filter((ev): ev is EventoTelemetria => validarEvento(ev));
  }

  /**
   * Poda eventos mais velhos que `retencaoDias` (política de retenção — fase03-03-03).
   * `agora` é injetado pela borda. Retorna quantos eventos foram removidos.
   */
  podarTelemetria(
    perfilId: string,
    agora: number,
    retencaoDias: number = RETENCAO_DIAS_PADRAO
  ): number {
    const eventos = this.carregarTelemetria(perfilId);
    const mantidos = podarPorRetencao(eventos, agora, retencaoDias);
    const removidos = eventos.length - mantidos.length;
    if (removidos > 0) {
      const envelopes: EnvelopeTelemetria[] = mantidos.map((evento) => ({
        esquema: "pipoca.telemetria.v1",
        evento,
      }));
      gravarItem(chaveTelemetria(perfilId), envelopes);
    }
    return removidos;
  }

  /**
   * Apaga todos os dados de um perfil (LGPD).
   * Remove save + telemetria + entrada da lista de perfis.
   */
  apagarPerfil(perfilId: string): void {
    try { localStorage.removeItem(chaveSave(perfilId)); } catch {}
    try { localStorage.removeItem(chaveTelemetria(perfilId)); } catch {}
    const envelopes = lerArrayEnvelopes<EnvelopePerfil>(CHAVE_PERFIS, "pipoca.perfil.v1");
    const filtrado = envelopes.filter((e) => e.perfil?.id !== perfilId);
    gravarItem(CHAVE_PERFIS, filtrado);
  }
}
