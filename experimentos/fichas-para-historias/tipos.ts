/**
 * Experimento fichas→histórias — tipos compartilhados entre gerador e avaliador.
 * Consome as fichas reais de docs/fichas/*.v1.json (contrato pipoca.fichas.v1).
 */

import type { NivelKey } from "../../src/core/composicao.js";
import type { FichaRelacao } from "../../src/core/fichas/tipos.js";

export type GeneroPersonagem = "f" | "m";

export interface EstadoExperimento {
  id: string; // ex.: "t04-r2-n3-f-p01"
  seed: number;
  rodada: 1 | 2 | 3 | 4;
  nivel: NivelKey;
  genero: GeneroPersonagem;
  personagem: string; // Joana (f) | Pietro (m)
  linha: string[]; // ids dos objetos, na ordem da criança
  temperatura: number;
  testemunha?: boolean;
}

export interface RelacaoAtiva {
  relacao: FichaRelacao;
  especificidade: number; // nº de condições no se (D5)
}

export interface MaterialPrompt {
  system: string;
  user: string;
  /** Palavras do material textual injetado no prompt (base do orçamento C-1). */
  palavrasMaterial: number;
  /** Orçamento proporcional: clamp(material×0.45, piso[nivel], teto[nivel][rodada]) — C-1. */
  alvoPalavras: number;
  relacoesAtivas: RelacaoAtiva[];
  paragrafosAlvo: [number, number]; // [min, max] por rodada (D-12.1)
  palavrasPorParagrafo: number; // por nível (11-00) — mantido para transparência histórica
}

export interface RespostaGeracao {
  estadoId: string;
  ok: boolean;
  texto?: string;
  erro?: string;
  modelo: string;
  temperatura: number;
  tentativas: number;
  duracaoMs: number;
  /** usageMetadata do Gemini, quando presente (monitoramento de custo). */
  tokens?: { entrada: number; saida: number };
}

export interface RegistroGeracao {
  estado: EstadoExperimento;
  material: {
    palavrasMaterial: number;
    /** Orçamento proporcional calculado no momento da geração (C-1). */
    alvoPalavras: number;
    paragrafosAlvo: [number, number];
    palavrasPorParagrafo: number;
    relacoes: Array<{ objeto: string; alvo: string; se: string | string[] }>;
  };
  resposta: RespostaGeracao;
}

export interface ArquivoLoteGeracao {
  lote: number;
  temperatura: number;
  tamanho: number;
  registros: RegistroGeracao[];
}

export interface VereditoCamada1Fichas {
  pass: boolean;
  motivos: string[];
  avisos: string[];
  ritmoN1?: { pontosFinais: number; mediaFrasesPorBeat: number; ok: boolean };
  presencaPorBeat: Record<string, boolean>;
}

export interface CelulaGrade {
  rodada: number;
  nivel: NivelKey;
  genero: GeneroPersonagem;
  temperatura: number;
  total: number;
  passCamada1: number;
  percentualPass: number;
  mediaCamada2?: { fluidez: number; adequacao: number; naturalidade: number };
}
