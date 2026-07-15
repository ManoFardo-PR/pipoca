/**
 * [telemetria_repo.ts] — política de retenção da telemetria (janela por idade e
 *   poda de eventos velhos), em funções puras.
 *
 * PAPEL: core-lógica (serviço de retenção · telemetria)
 * POR QUE EXISTE: a telemetria não pode crescer para sempre; aqui mora a regra
 *   de quanto tempo um evento vive e como podar, separada da gravação concreta.
 * ENTRA: EventoTelemetria (ou lista), `agora` (ms) e retencaoDias opcional.
 * SAI: RETENCAO_DIAS_PADRAO, dentroDaRetencao() → boolean, podarPorRetencao() →
 *   nova lista filtrada (sem mutar a original).
 * CHAMA: ../core/telemetria.js:EventoTelemetria (só tipo).
 * É CHAMADO POR: core/persistencia/RepositorioLocalStorage.ts, backend/adaptadores/
 *   repo_supabase.ts, core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; exercitado por
 *   `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: funções PURAS (não tocam localStorage) — a gravação concreta vive em
 *   RepositorioLocalStorage.registrarTelemetria; poda devolve lista nova, nunca muta.
 *
 * — detalhe preservado —
 * Pipoca — Persistência/retenção da telemetria · doc fase03-03-03
 * ---------------------------------------------------------------
 * Onde a telemetria aterrissa em SAVE e a política de retenção (poda por idade).
 * Local no MVP → Supabase na Fase 1.5 (o ponto de troca é a `RepositorioPersistencia`).
 *
 * As funções aqui são PURAS (operam sobre listas de `EventoTelemetria` + `agora`),
 * para serem testáveis sem localStorage. A gravação concreta vive no
 * `RepositorioLocalStorage.registrarTelemetria` ([[fase00-00-12]]).
 */

import type { EventoTelemetria } from "../core/telemetria.js";

/** Retenção padrão (dias). Configurável por PC_PRIV ([[fase02-02-09]]). */
export const RETENCAO_DIAS_PADRAO = 90;

const MS_POR_DIA = 86_400_000;

/** Um evento está dentro da janela de retenção se seu `ts` não é mais velho que `retencaoDias`. */
export function dentroDaRetencao(
  evento: EventoTelemetria,
  agora: number,
  retencaoDias: number = RETENCAO_DIAS_PADRAO
): boolean {
  const limite = agora - retencaoDias * MS_POR_DIA;
  return evento.ts >= limite;
}

/**
 * Poda eventos mais velhos que `retencaoDias` em relação a `agora`.
 * Pura: devolve uma nova lista, sem mutar a original.
 */
export function podarPorRetencao(
  eventos: EventoTelemetria[],
  agora: number,
  retencaoDias: number = RETENCAO_DIAS_PADRAO
): EventoTelemetria[] {
  return eventos.filter((e) => dentroDaRetencao(e, agora, retencaoDias));
}
