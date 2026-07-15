/**
 * [tipos.ts] — Tipos canônicos do grafo autoral: o vocabulário compartilhado
 *   (Nivel, ModoDesfecho, Trecho, MotorNarrativa, GrafoAutoral) de core/ia/backend.
 *
 * PAPEL: core-lógica (grafo · schema v1 congelado · vocabulário vivo)
 * POR QUE EXISTE: o schema v1 do grafo foi arquivado, mas seus tipos genéricos seguem
 *   sendo a linguagem comum de níveis, desfechos e trechos por todo o app.
 * ENTRA: nada em runtime (arquivo só de tipos).
 * SAI: tipos/interfaces (Nivel, ModoDesfecho, PapelNoFim, Fragmento4, Regra, Objeto,
 *   Cenario, GrafoAutoral, Trecho, MotorNarrativa).
 * CHAMA: nada — sem imports.
 * É CHAMADO POR: amplo em core/ia/backend/dados — ex.: core/{estado,historia,
 *   historias,telemetria}.ts, ia/{provedor,orquestrador,prompt,guardrails,simulado}.ts
 *   e adaptadores, backend/backend.ts, dados/niveis.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes.
 * CUIDADO: schema v1 CONGELADO — NÃO renomear nem alterar a forma sem criar um novo
 *   esquema; o grafo ATIVO é o v3 de src/core/composicao.ts (estes tipos são só o
 *   vocabulário; o leitor/grafo v1 estão arquivados em old/).
 *
 * — detalhe preservado —
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
