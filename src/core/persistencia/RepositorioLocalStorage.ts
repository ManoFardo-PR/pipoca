/**
 * [RepositorioLocalStorage.ts] — Implementação localStorage de RepositorioPersistencia:
 *   perfis, save, telemetria e histórias no dispositivo do cuidador.
 *
 * PAPEL: core-lógica (persistência · impl MVP local, base do aparelho)
 * POR QUE EXISTE: a base offline do app — grava/lê tudo no localStorage, validando cada
 *   envelope no load e degradando em silêncio na escrita.
 * ENTRA: Perfil, EstadoApp, EventoTelemetria, HistoriaSalva (por método) + perfilId.
 * SAI: os dados persistidos + os loads validados (null/[] quando corrompido).
 * CHAMA: persistencia/chaves.ts (chaves + lerArrayEnvelopes/gravarItem), dados/
 *   schemas.ts (validarEnvelopePerfil/Save), telemetria.ts:validarEvento, servicos/
 *   telemetria_repo.ts (poda), historias.ts (envelope/normalização).
 * É CHAMADO POR: persistencia/index.ts:criarRepositorio (+ re-export),
 *   backend/adaptadores/repo_local.ts (re-export), persistencia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/persistencia/persistencia.test.ts` (dentro de `bun run test`).
 * CUIDADO: LGPD — apagarPerfil remove save + telemetria + histórias + entrada da lista;
 *   TODOS os loads passam pelos validadores de schema (payload corrompido ⇒ descartado);
 *   erro de escrita NUNCA interrompe a sessão da criança (degradação silenciosa);
 *   salvarHistoria poda preventivamente ao estourar a quota.
 *
 * — detalhe preservado —
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
import type { RepositorioPersistencia } from "./tipos.js"; // D3: contrato em arquivo próprio (fim do ciclo com o barril)
import { validarEnvelopePerfil, validarEnvelopeSave } from "../../dados/schemas.js";
import { validarEvento } from "../telemetria.js";
import { podarPorRetencao, RETENCAO_DIAS_PADRAO } from "../../servicos/telemetria_repo.js";
import type { HistoriaSalva } from "../historias.js";
import {
  ESQUEMA_HISTORIAS,
  criarEnvelopeHistoria,
  normalizarHistorias,
  validarHistoriaSalva,
  type EnvelopeHistoriaV1,
} from "../historias.js";
import {
  CHAVE_PERFIS,
  chaveSave,
  chaveTelemetria,
  chaveHistorias,
  lerArrayEnvelopes,
  lerArrayBruto,
  particionarPorEsquema,
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
    // D-09: preserva envelopes de versão desconhecida (`resto`) ao regravar.
    const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(CHAVE_PERFIS), "pipoca.perfil.v1");
    const semEste = (conhecidos as unknown as EnvelopePerfil[]).filter((e) => e.perfil?.id !== p.id);
    const novoEnvelope: EnvelopePerfil = {
      esquema: "pipoca.perfil.v1",
      perfil: { ...p },
    };
    gravarItem(CHAVE_PERFIS, [...resto, ...semEste, novoEnvelope]);
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
    if (gravarItem(chaveSave(perfilId), envelope)) return;
    // D-10: quota cheia — o save (progresso da criança) é o dado mais precioso,
    // não pode sumir em silêncio. Abre espaço podando a telemetria DESTE perfil
    // (analytics: o dado mais volumoso e descartável) e tenta de novo; só então
    // degrada em silêncio (regra da casa: nunca interromper a sessão).
    try {
      const chaveTel = chaveTelemetria(perfilId);
      const bruto = lerArrayBruto(chaveTel);
      if (bruto.length > 0) {
        gravarItem(chaveTel, bruto.slice(Math.floor(bruto.length / 2))); // mantém a metade mais recente
        if (gravarItem(chaveSave(perfilId), envelope)) return;
        gravarItem(chaveTel, []); // ainda não coube: descarta toda a telemetria e tenta a última vez
        gravarItem(chaveSave(perfilId), envelope);
      }
    } catch {
      /* degradação silenciosa */
    }
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
  async carregarTelemetria(perfilId: string): Promise<EventoTelemetria[]> {
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
  async podarTelemetria(
    perfilId: string,
    agora: number,
    retencaoDias: number = RETENCAO_DIAS_PADRAO
  ): Promise<number> {
    const eventos = await this.carregarTelemetria(perfilId);
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

  // ─── Histórias salvas (pós-fase06) ─────────────────────────────────────────

  /** Histórias válidas do perfil, mais novas primeiro (corrompidas caem). */
  async carregarHistorias(perfilId: string): Promise<HistoriaSalva[]> {
    const envelopes = lerArrayEnvelopes<EnvelopeHistoriaV1>(
      chaveHistorias(perfilId),
      ESQUEMA_HISTORIAS
    );
    return envelopes
      .map((e) => validarHistoriaSalva(e.historia))
      .filter((h): h is HistoriaSalva => h !== null)
      .sort((a, b) => b.criadaEm - a.criadaEm);
  }

  /**
   * Upsert por historia.id (favoritar = regravar com favorita=true).
   * localStorage cheio (gravarItem → false; comportamento verificado no
   * fase13-13-02): poda preventiva — primeiro as INTERMEDIÁRIAS não-favoritas
   * mais antigas, depois as completas não-favoritas mais antigas — e regrava.
   * Se ainda assim não couber, degrada em silêncio (regra da casa: erro de
   * escrita nunca interrompe a sessão da criança).
   */
  async salvarHistoria(perfilId: string, historia: HistoriaSalva): Promise<void> {
    const chave = chaveHistorias(perfilId);
    // D-09: `resto` (versões desconhecidas) é preservado em toda regravação.
    const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(chave), ESQUEMA_HISTORIAS);
    const envelopes = conhecidos as unknown as EnvelopeHistoriaV1[];
    const semEsta = envelopes.filter((e) => e.historia?.id !== historia.id);
    let lista = [...semEsta, criarEnvelopeHistoria({ ...historia })];
    if (gravarItem(chave, [...resto, ...lista])) return;
    const podavel = (e: EnvelopeHistoriaV1, intermediaria: boolean): boolean =>
      !!e.historia && e.historia.favorita !== true && e.historia.id !== historia.id &&
      (e.historia.intermediaria === true) === intermediaria;
    for (const faseIntermediarias of [true, false]) {
      const candidatas = lista
        .filter((e) => podavel(e, faseIntermediarias))
        .sort((a, b) => (a.historia?.criadaEm ?? 0) - (b.historia?.criadaEm ?? 0));
      for (const vitima of candidatas) {
        lista = lista.filter((e) => e !== vitima);
        if (gravarItem(chave, [...resto, ...lista])) return;
      }
    }
  }

  async apagarHistoria(perfilId: string, historiaId: string): Promise<void> {
    const chave = chaveHistorias(perfilId);
    // D-09: preserva `resto` (versões desconhecidas) ao regravar.
    const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(chave), ESQUEMA_HISTORIAS);
    const envelopes = conhecidos as unknown as EnvelopeHistoriaV1[];
    const restantes = envelopes.filter((e) => e.historia?.id !== historiaId);
    if (restantes.length !== envelopes.length) gravarItem(chave, [...resto, ...restantes]);
  }

  /**
   * Poda por retenção (20 dias; FAVORITAS ficam) + teto de não-favoritas.
   * `agora` é injetado pela borda. Retorna quantas histórias saíram.
   */
  async podarHistorias(perfilId: string, agora: number): Promise<number> {
    const antes = await this.carregarHistorias(perfilId);
    const mantidas = normalizarHistorias(antes, agora);
    const removidas = antes.length - mantidas.length;
    if (removidas > 0) {
      // D-09: `resto` (versões desconhecidas) sobrevive à poda.
      const resto = particionarPorEsquema(lerArrayBruto(chaveHistorias(perfilId)), ESQUEMA_HISTORIAS).resto;
      gravarItem(chaveHistorias(perfilId), [...resto, ...mantidas.map(criarEnvelopeHistoria)]);
    }
    return removidas;
  }

  /**
   * Apaga todos os dados de um perfil (LGPD).
   * Remove save + telemetria + histórias + entrada da lista de perfis.
   */
  async apagarPerfil(perfilId: string): Promise<void> {
    try { localStorage.removeItem(chaveSave(perfilId)); } catch {}
    try { localStorage.removeItem(chaveTelemetria(perfilId)); } catch {}
    try { localStorage.removeItem(chaveHistorias(perfilId)); } catch {}
    // D-09: preserva `resto` (versões desconhecidas) ao remover o perfil da lista.
    const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(CHAVE_PERFIS), "pipoca.perfil.v1");
    const filtrado = (conhecidos as unknown as EnvelopePerfil[]).filter((e) => e.perfil?.id !== perfilId);
    gravarItem(CHAVE_PERFIS, [...resto, ...filtrado]);
  }
}
