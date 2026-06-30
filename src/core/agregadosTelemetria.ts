/**
 * Pipoca — Agregados de telemetria (PC_DASH) · doc dono fase03-03-02
 * ------------------------------------------------------------------
 * Funções PURAS que transformam `EventoTelemetria[]` em resumos e séries para o
 * painel de evolução do cuidador (Tela 8). Não tocam localStorage, não importam
 * motor algum, não gravam telemetria — só leem e agregam (read-only).
 *
 * DISCIPLINA DE TEMPO (lei do contrato): nenhuma função chama `Date.now()`. A
 * janela de período é calculada a partir do `agora` injetado pela borda. Os
 * rótulos de dia/semana usam UTC (`Math.floor(ts / MS_POR_DIA)`) para serem
 * determinísticos e testáveis sem depender do fuso da máquina.
 *
 * TOM CALOROSO (PC_DASH regra 1/3): `engajamento` é índice 0..1 (heurística de
 * cadência), NUNCA "nota" ou percentual punitivo. Outliers de tempo (sessão
 * deixada aberta) são clampados por `TETO_MINUTOS_SESSAO`.
 */

import type {
  EventoTelemetria,
  DadosLeituraConfirmada,
  DadosSessaoEncerrada,
} from "./telemetria.js";

// --- tipos canônicos do agregador (derivam de EventoTelemetria; sem domínio novo) ---
export interface ResumoEvolucao {
  minutos: number;
  palavras: number;
  historias: number;
  diasAtivos: number;
  sequenciaDias: number; // maior cadeia de dias seguidos com leitura_confirmada
}
export interface PontoSerie {
  rotulo: string; // chave de dia/semana em ISO (UTC): "2026-06-29"
  valor: number;
}
export interface SeriesEvolucao {
  minutosPorDia: PontoSerie[];
  palavrasPorDia: PontoSerie[];
  historiasPorSemana: PontoSerie[];
  engajamentoPorDia: PontoSerie[]; // valor 0..1
}
export type PeriodoPainel = "semana" | "mes" | "tudo";

const MS_POR_DIA = 86_400_000;

/** Teto por evento de sessão para não distorcer o gráfico (sessão deixada aberta). */
export const TETO_MINUTOS_SESSAO = 60;

/** Heurística calorosa de engajamento — metas suaves, não cobranças. */
const META_LEITURAS_DIA = 5; // volume "cheio" do dia
const META_CENARIOS_DIA = 3; // variedade "cheia" do dia
const PESO_REGULARIDADE = 0.4;
const PESO_VOLUME = 0.4;
const PESO_VARIEDADE = 0.2;

/** Janela do período em dias; `tudo` = sem janela (Infinity). */
function diasDoPeriodo(periodo: PeriodoPainel): number {
  switch (periodo) {
    case "semana":
      return 7;
    case "mes":
      return 30;
    case "tudo":
      return Infinity;
  }
}

/** Índice de dia em UTC (dias inteiros desde a epoch). */
function indiceDia(ts: number): number {
  return Math.floor(ts / MS_POR_DIA);
}

/** Rótulo ISO (UTC) "YYYY-MM-DD" a partir de um índice de dia. */
export function rotuloDia(idxDia: number): string {
  return new Date(idxDia * MS_POR_DIA).toISOString().slice(0, 10);
}

/** Chave de dia (ISO UTC) de um evento — usada para casar `calcularEngajamento`. */
export function chaveDia(ts: number): string {
  return rotuloDia(indiceDia(ts));
}

/**
 * Filtra eventos dentro do período relativo a `agora`.
 * `tudo` devolve todos. Pura: não muta a lista de entrada.
 */
export function filtrarPorPeriodo(
  eventos: EventoTelemetria[],
  periodo: PeriodoPainel,
  agora: number
): EventoTelemetria[] {
  const dias = diasDoPeriodo(periodo);
  if (!Number.isFinite(dias)) return eventos.slice();
  const limite = agora - dias * MS_POR_DIA;
  return eventos.filter((e) => e.ts >= limite);
}

/** Minutos de um evento `sessao_encerrada`, clampados ao teto (0..TETO). */
function minutosClampados(e: EventoTelemetria): number {
  const m = (e.dados as DadosSessaoEncerrada).minutos;
  if (typeof m !== "number" || !Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(TETO_MINUTOS_SESSAO, m));
}

/** Maior cadeia de dias consecutivos dentre um conjunto de índices de dia. */
function maiorSequencia(indices: Set<number>): number {
  if (indices.size === 0) return 0;
  const ordenados = [...indices].sort((a, b) => a - b);
  let melhor = 1;
  let atual = 1;
  for (let i = 1; i < ordenados.length; i++) {
    atual = ordenados[i] === ordenados[i - 1] + 1 ? atual + 1 : 1;
    if (atual > melhor) melhor = atual;
  }
  return melhor;
}

/**
 * Totais do período (Tela 8 do brief): minutos, palavras, histórias, dias ativos
 * e a sequência de dias seguidos lendo. Pura; `agora` define a janela.
 */
export function resumir(
  eventos: EventoTelemetria[],
  periodo: PeriodoPainel,
  agora: number
): ResumoEvolucao {
  const janela = filtrarPorPeriodo(eventos, periodo, agora);
  let minutos = 0;
  let palavras = 0;
  let historias = 0;
  const diasComEvento = new Set<number>();
  const diasComLeitura = new Set<number>();

  for (const e of janela) {
    diasComEvento.add(indiceDia(e.ts));
    if (e.tipo === "sessao_encerrada") {
      minutos += minutosClampados(e);
    } else if (e.tipo === "leitura_confirmada") {
      palavras += (e.dados as DadosLeituraConfirmada).palavras ?? 0;
      diasComLeitura.add(indiceDia(e.ts));
    } else if (e.tipo === "historia_concluida") {
      historias += 1;
    }
  }

  return {
    minutos,
    palavras,
    historias,
    diasAtivos: diasComEvento.size,
    sequenciaDias: maiorSequencia(diasComLeitura),
  };
}

/** Soma valores por índice de dia → pontos ordenados cronologicamente. */
function serieDiaria(
  eventos: EventoTelemetria[],
  valorDe: (e: EventoTelemetria) => number
): PontoSerie[] {
  const porDia = new Map<number, number>();
  for (const e of eventos) {
    const v = valorDe(e);
    if (v === 0) continue;
    const idx = indiceDia(e.ts);
    porDia.set(idx, (porDia.get(idx) ?? 0) + v);
  }
  return [...porDia.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, valor]) => ({ rotulo: rotuloDia(idx), valor }));
}

/**
 * Séries temporais para os gráficos do painel. Pura; `agora` define a janela.
 * `historiasPorSemana` agrupa por semana (índice de dia ÷ 7), rótulo = início da semana.
 * `engajamentoPorDia` deriva de `calcularEngajamento` para cada dia ativo.
 */
export function gerarSeries(
  eventos: EventoTelemetria[],
  periodo: PeriodoPainel,
  agora: number
): SeriesEvolucao {
  const janela = filtrarPorPeriodo(eventos, periodo, agora);

  const minutosPorDia = serieDiaria(janela, (e) =>
    e.tipo === "sessao_encerrada" ? minutosClampados(e) : 0
  );
  const palavrasPorDia = serieDiaria(janela, (e) =>
    e.tipo === "leitura_confirmada" ? (e.dados as DadosLeituraConfirmada).palavras ?? 0 : 0
  );

  // histórias por semana (bucket = floor(indiceDia / 7); rótulo = dia inicial da semana)
  const porSemana = new Map<number, number>();
  for (const e of janela) {
    if (e.tipo !== "historia_concluida") continue;
    const semana = Math.floor(indiceDia(e.ts) / 7);
    porSemana.set(semana, (porSemana.get(semana) ?? 0) + 1);
  }
  const historiasPorSemana: PontoSerie[] = [...porSemana.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([semana, valor]) => ({ rotulo: rotuloDia(semana * 7), valor }));

  // engajamento por dia ativo (qualquer evento naquele dia)
  const diasAtivos = new Set<number>(janela.map((e) => indiceDia(e.ts)));
  const engajamentoPorDia: PontoSerie[] = [...diasAtivos]
    .sort((a, b) => a - b)
    .map((idx) => {
      const dia = rotuloDia(idx);
      return { rotulo: dia, valor: calcularEngajamento(janela, dia) };
    });

  return { minutosPorDia, palavrasPorDia, historiasPorSemana, engajamentoPorDia };
}

/**
 * Engajamento de um dia (`dia` em ISO UTC) — índice 0..1, NÃO é nota.
 * Heurística calorosa combinando três sinais do próprio dia:
 *  - regularidade: leu hoje? (sim → cheio)
 *  - volume: nº de leituras vs `META_LEITURAS_DIA` (saturando em 1)
 *  - variedade: nº de cenários distintos vs `META_CENARIOS_DIA` (saturando em 1)
 * Pesos suaves; o resultado é sempre clampado a [0, 1].
 */
export function calcularEngajamento(eventos: EventoTelemetria[], dia: string): number {
  let leituras = 0;
  const cenarios = new Set<string>();
  for (const e of eventos) {
    if (e.tipo !== "leitura_confirmada") continue;
    if (chaveDia(e.ts) !== dia) continue;
    leituras += 1;
    const c = (e.dados as DadosLeituraConfirmada).cenarioId;
    if (typeof c === "string" && c.length > 0) cenarios.add(c);
  }
  if (leituras === 0) return 0;
  const regularidade = 1;
  const volume = Math.min(leituras / META_LEITURAS_DIA, 1);
  const variedade = Math.min(cenarios.size / META_CENARIOS_DIA, 1);
  const valor =
    PESO_REGULARIDADE * regularidade + PESO_VOLUME * volume + PESO_VARIEDADE * variedade;
  return Math.max(0, Math.min(1, valor));
}
