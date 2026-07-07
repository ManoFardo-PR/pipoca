/**
 * Pipoca — Tipos canônicos do grafo autoral (GRAPH)
 * --------------------------------------------------
 * Linhagem: schema v1 (congelado; grafo e leitor arquivados em old/ na
 * implantação do Motor A+ — o grafo ATIVO é o v3 de src/core/composicao.ts).
 * Os tipos genéricos daqui (Nivel, ModoDesfecho, Trecho, MotorNarrativa)
 * seguem sendo o vocabulário vivo de core/ia/backend. Não renomear nem
 * alterar a forma sem criar um novo esquema.
 */

export type Nivel = "n1" | "n2" | "n3" | "n4";
export type ModoDesfecho = "convergente" | "aberto";
export type PapelNoFim = "nucleo" | "chave" | "neutro";

export interface Fragmento4 { n1: string; n2: string; n3: string; n4: string; }
export interface Regra { se: string; entao: Fragmento4; }

export interface Objeto {
  id: string;
  emoji: string;
  nome: string;
  papel_no_fim: PapelNoFim;
  gatilho: Fragmento4;
  regras: Regra[];
}

export interface DesfechoAberto { se_terminou_com: string; fragmento: Fragmento4; }

export interface Cenario {
  id: string;
  nome: string;
  personagem: string;
  paleta: string;
  abertura: Fragmento4;
  ordem_canonica?: string[];
  objetos: Objeto[];
  desfechos: { convergente: Fragmento4; aberto: DesfechoAberto[] };
}

export interface GrafoAutoral {
  esquema: string;
  niveis: Record<Nivel, string>;
  regra_de_ouro: string;
  cenario: Cenario;
}

export interface Trecho {
  texto: string;
  ehFinal: boolean;
  objetoId?: string;
}

export interface MotorNarrativa {
  abertura(nivel: Nivel): Trecho;
  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho;
  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho;
}
