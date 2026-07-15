/**
 * [tipos.ts] — tipos compartilhados do experimento fichas→histórias (estado,
 *   registros de geração/realização, veredito e grade).
 *
 * PAPEL: experimento (offline: tipos)
 * POR QUE EXISTE: contrato único entre gerador, avaliador, matriz e o andaime —
 *   um só lugar para o formato dos estados e dos artefatos persistidos.
 * ENTRA: —
 * SAI: interfaces/tipos (EstadoExperimento, RegistroGeracao/Realizacao,
 *   ArquivoLote*, VereditoCamada1Fichas, CelulaGrade, ...).
 * CHAMA: src/core/composicao.js:NivelKey e src/core/fichas/tipos.js:FichaRelacao
 *   (só tipos).
 * É CHAMADO POR: matriz.ts, gerar.ts, avaliar/avaliar.ts e os arquivos do
 *   _andaime-arquivado/ (camada1-fichas.ts, micro-sanidade.ts, montar-prompt.ts).
 * RODA POR: offline — só tipos (zero runtime); compilado com quem importa.
 *
 * — detalhe preservado —
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

// ---------- Ciclo 2 (fase 12): o experimento consome compor() + realizar() reais ----------

/** Resposta da realização real (ciclo 2) — origem/veredito vêm do realizador. */
export interface RespostaRealizacao {
  estadoId: string;
  /** true = houve texto (mesmo que o veredito seja FAIL); false = falha de provedor. */
  ok: boolean;
  texto?: string;
  erro?: string;
  modelo: string;
  temperatura: number;
  /** Chamadas de LLM feitas pela cascata nesta realização. */
  chamadas: number;
  duracaoMs: number;
  tokens?: { entrada: number; saida: number };
}

export interface RegistroRealizacao {
  estado: EstadoExperimento;
  pacote: {
    /** Máximo canônico de palavras (tabela da herança 1, nível×rodada derivada). */
    maximoPalavras: number;
    paragrafos: number;
    relacoes: Array<{ objeto: string; alvo: string }>;
  };
  resposta: RespostaRealizacao;
  /** Veredito do validador de produção (12-03); ausente em falha de provedor. */
  veredito?: VereditoCamada1Fichas;
  origem?: { fonte: "llm" | "fallback-a-mais"; provedor?: string; modelo?: string };
}

export interface ArquivoLoteRealizacao {
  lote: number;
  temperatura: number;
  tamanho: number;
  registros: RegistroRealizacao[];
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
