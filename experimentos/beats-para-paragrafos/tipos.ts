/**
 * [tipos.ts] — tipos/contratos TypeScript compartilhados entre o gerador e o
 *   avaliador do experimento B1.5 (história-base, resposta-LLM, vereditos,
 *   agregados, monitoramento).
 *
 * PAPEL: experimento (B1.5 · offline — só tipos, sem runtime)
 * POR QUE EXISTE: manter um único vocabulário de dados para os dois scripts e
 *   os arquivos gravados em saida/ não divergirem.
 * ENTRA: nada (arquivo de tipos).
 * SAI: interfaces/tipos (HistoriaBase, RespostaLLM, Par, VereditoCamada1/2,
 *   ParAvaliado, Grade, AgregadoHistoria, etc.).
 * CHAMA: src/core/composicao.js (só o tipo NivelKey).
 * É CHAMADO POR: gerar-historias.ts, avaliar-pares.ts, camada1-fidelidade.ts,
 *   camada2-juiz.ts, relatorios.ts, persistencia.ts, linha-aleatoria.ts (e os
 *   .test.ts).
 * RODA POR: importado por todo o experimento (só tipos, sem efeito em runtime).
 */

import type { NivelKey } from "../../src/core/composicao.js";

export type Desfecho = "convergente" | "aberto";

export interface HistoriaBase {
  id: string;
  seed: number;
  partidaId: string;
  objetosDaLinha: string[];
  rodada: number;
  nivel: NivelKey;
  modos: { desfecho: Desfecho };
  texto: string;
  geracaoLocal: { inicio: string; fim: string; duracaoMs: number };
}

export interface ArquivoHistoriasBase {
  lote: number;
  tamanho: number;
  historias: HistoriaBase[];
}

export interface PalavrasInfo {
  original: number;
  limpo?: number;
  razaoCrescimento?: number;
  excedeuTeto?: boolean;
}

export interface RespostaLLM {
  historiaId: string;
  ok: boolean;
  textoLimpo?: string;
  erro?: string;
  modelo: string;
  temperatura: number;
  tentativas: number;
  palavras: PalavrasInfo;
  chamadaLLM: { inicio: string; fim: string; duracaoMs: number };
}

export interface ArquivoRespostasLLM {
  lote: number;
  tamanho: number;
  respostas: RespostaLLM[];
}

export interface MetaExecucao {
  seedBase: string | number;
  totalHistorias: number;
  tamanhoLote: number;
  modelo: string;
  temperatura: number;
  iniciadoEm: string;
}

export interface TempoHistoriaLote {
  historiaId: string;
  geracaoLocalMs: number;
  chamadaLLMMs: number;
  ok: boolean;
  erro?: string;
  excedeuTeto?: boolean;
}

export interface MonitoramentoLote {
  lote: number;
  geradoEm: string;
  historias: TempoHistoriaLote[];
}

export interface EstatisticaTempo {
  minMs: number;
  maxMs: number;
  mediaMs: number;
}

export interface ConsolidadoMonitoramento {
  atualizadoEm: string;
  totalHistoriasProcessadas: number;
  totalLotes: number;
  porFase: {
    geracaoLocal: EstatisticaTempo;
    chamadaLLM: EstatisticaTempo & { erros: number; avisosCrescimento: number };
  };
  porLote: Array<{
    lote: number;
    historias: number;
    geracaoLocal: EstatisticaTempo;
    chamadaLLM: EstatisticaTempo;
    erros: number;
  }>;
}

// ─── Avaliador ────────────────────────────────────────────────────────────

export interface Par {
  base: HistoriaBase;
  resposta: RespostaLLM;
}

export interface VereditoCamada1 {
  pass: boolean;
  motivos: string[];
  /** Heurísticas que sinalizam para revisão manual, mas não reprovam sozinhas. */
  avisos: string[];
  ritmoN1?: { pontosFinais: number; mediaFrasesPorBeat: number; ok: boolean };
}

export interface VereditoCamada2 {
  fluidez: number;
  adequacao: number;
  naturalidade: number;
  comentarioCurto: string;
}

export interface ParAvaliado {
  par: Par;
  camada1: VereditoCamada1;
  camada2?: VereditoCamada2;
}

export interface CelulaGrade {
  rodada: number;
  nivel: NivelKey;
  totalPares: number;
  passCamada1: number;
  percentualPass: number;
  mediaCamada2?: { fluidez: number; adequacao: number; naturalidade: number };
}

export interface Grade {
  geradoEm: string;
  celulas: CelulaGrade[];
}

/**
 * Uma história com TUDO junto: o registro original do gerador, a resposta
 * do LLM, e o veredito do avaliador — pensado pra leitura humana direta
 * (não é consumido por nenhum outro script), um arquivo por lote, na mesma
 * numeração de historias-base/respostas-llm (saida/historias-base/agregados/).
 */
export interface AgregadoHistoria extends HistoriaBase {
  respostaLLM: RespostaLLM;
  avaliacao: {
    camada1: VereditoCamada1;
    camada2?: VereditoCamada2;
  };
}

export interface ArquivoAgregados {
  lote: number;
  tamanho: number;
  historias: AgregadoHistoria[];
}
