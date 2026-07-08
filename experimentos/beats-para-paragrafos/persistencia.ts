/**
 * Experimento B1.5 — escrita incremental dos lotes em disco. Nunca acumula
 * os ~97 registros em memória até o fim: histórias-base gravam assim que
 * geradas; respostas-llm reescreve o arquivo do lote a cada resposta
 * recebida; o consolidado de monitoramento é recomputado a partir de TODOS
 * os lote-*.json em disco a cada lote fechado (não só o estado em memória),
 * para sobreviver a uma interrupção no meio da execução.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ArquivoHistoriasBase,
  ArquivoRespostasLLM,
  ConsolidadoMonitoramento,
  EstatisticaTempo,
  HistoriaBase,
  MetaExecucao,
  MonitoramentoLote,
  RespostaLLM,
  TempoHistoriaLote,
} from "./tipos.js";

export interface CaminhosSaida {
  raiz: string;
  historiasBase: string;
  respostasLlm: string;
  monitoramento: string;
}

export function resolverCaminhos(raiz: string): CaminhosSaida {
  return {
    raiz,
    historiasBase: join(raiz, "historias-base"),
    respostasLlm: join(raiz, "respostas-llm"),
    monitoramento: join(raiz, "monitoramento"),
  };
}

export async function garantirDiretorios(caminhos: CaminhosSaida): Promise<void> {
  await mkdir(caminhos.historiasBase, { recursive: true });
  await mkdir(caminhos.respostasLlm, { recursive: true });
  await mkdir(caminhos.monitoramento, { recursive: true });
}

function nomeArquivoRodada(lote: number): string {
  return `rodada-${String(lote).padStart(2, "0")}.json`;
}

function nomeArquivoLote(lote: number): string {
  return `lote-${String(lote).padStart(2, "0")}.json`;
}

export async function escreverMeta(caminhos: CaminhosSaida, meta: MetaExecucao): Promise<void> {
  await writeFile(join(caminhos.monitoramento, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
}

export async function escreverHistoriasBase(
  caminhos: CaminhosSaida,
  lote: number,
  historias: HistoriaBase[]
): Promise<void> {
  const arquivo: ArquivoHistoriasBase = { lote, tamanho: historias.length, historias };
  await writeFile(join(caminhos.historiasBase, nomeArquivoRodada(lote)), JSON.stringify(arquivo, null, 2), "utf8");
}

export async function escreverRespostasLLM(
  caminhos: CaminhosSaida,
  lote: number,
  respostas: RespostaLLM[]
): Promise<void> {
  const arquivo: ArquivoRespostasLLM = { lote, tamanho: respostas.length, respostas };
  await writeFile(join(caminhos.respostasLlm, nomeArquivoRodada(lote)), JSON.stringify(arquivo, null, 2), "utf8");
}

export async function escreverMonitoramentoLote(caminhos: CaminhosSaida, lote: MonitoramentoLote): Promise<void> {
  await writeFile(join(caminhos.monitoramento, nomeArquivoLote(lote.lote)), JSON.stringify(lote, null, 2), "utf8");
}

function estatistica(valores: number[]): EstatisticaTempo {
  if (valores.length === 0) return { minMs: 0, maxMs: 0, mediaMs: 0 };
  const soma = valores.reduce((a, b) => a + b, 0);
  return { minMs: Math.min(...valores), maxMs: Math.max(...valores), mediaMs: soma / valores.length };
}

export async function atualizarConsolidado(caminhos: CaminhosSaida): Promise<ConsolidadoMonitoramento> {
  const arquivos = (await readdir(caminhos.monitoramento)).filter((f) => /^lote-\d+\.json$/.test(f));
  const lotes: MonitoramentoLote[] = [];
  for (const arquivo of arquivos) {
    const bruto = await readFile(join(caminhos.monitoramento, arquivo), "utf8");
    lotes.push(JSON.parse(bruto) as MonitoramentoLote);
  }
  lotes.sort((a, b) => a.lote - b.lote);

  const todasHistorias: TempoHistoriaLote[] = lotes.flatMap((l) => l.historias);
  const geracaoLocal = estatistica(todasHistorias.map((h) => h.geracaoLocalMs));
  const chamadaLLM = estatistica(todasHistorias.map((h) => h.chamadaLLMMs));
  const erros = todasHistorias.filter((h) => !h.ok).length;
  const avisosCrescimento = todasHistorias.filter((h) => h.excedeuTeto).length;

  const consolidado: ConsolidadoMonitoramento = {
    atualizadoEm: new Date().toISOString(),
    totalHistoriasProcessadas: todasHistorias.length,
    totalLotes: lotes.length,
    porFase: {
      geracaoLocal,
      chamadaLLM: { ...chamadaLLM, erros, avisosCrescimento },
    },
    porLote: lotes.map((l) => ({
      lote: l.lote,
      historias: l.historias.length,
      geracaoLocal: estatistica(l.historias.map((h) => h.geracaoLocalMs)),
      chamadaLLM: estatistica(l.historias.map((h) => h.chamadaLLMMs)),
      erros: l.historias.filter((h) => !h.ok).length,
    })),
  };
  await writeFile(join(caminhos.monitoramento, "consolidado.json"), JSON.stringify(consolidado, null, 2), "utf8");
  return consolidado;
}
