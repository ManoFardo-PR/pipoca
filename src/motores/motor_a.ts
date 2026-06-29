/**
 * Pipoca — Motor A (Grafo Autoral)
 * ---------------------------------
 * Transforma um grafo autoral (ex.: quintal_grafo.json) em história jogável,
 * SEM IA e SEM reconhecimento de fala. É a fatia verde do diagrama.
 *
 * O ponto de arquitetura: as telas NUNCA falam com este arquivo direto.
 * Elas falam com a interface `MotorNarrativa` (o Contrato de Narrativa).
 * Na Fase 2, o Motor B implementa A MESMA interface trocando "buscar no grafo"
 * por "gerar com LLM" — e nenhuma tela muda.
 */

// ============ Tipos do grafo (espelham o JSON) ============
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
  gatilho: Fragmento4;          // texto padrão ao adicionar o objeto
  regras: Regra[];             // variações que dependem do estado da história
}

export interface DesfechoAberto { se_terminou_com: string; fragmento: Fragmento4; }

export interface Cenario {
  id: string;
  nome: string;
  personagem: string;
  paleta: string;
  abertura: Fragmento4;
  objetos: Objeto[];
  desfechos: { convergente: Fragmento4; aberto: DesfechoAberto[] };
}

export interface GrafoAutoral {
  esquema: string;
  niveis: Record<Nivel, string>;
  regra_de_ouro: string;
  cenario: Cenario;
}

// O que o motor devolve para a tela. Puro: nada de estado, nada de UI.
export interface Trecho {
  texto: string;
  ehFinal: boolean;
  objetoId?: string;
}

// ============ Contrato de Narrativa (o eixo 1) ============
// `historia` = ids dos objetos já colocados, EM ORDEM. O estado vive na app
// (camada CORE), não no motor — o motor é uma função pura do grafo.
export interface MotorNarrativa {
  abertura(nivel: Nivel): Trecho;
  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho;
  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho;
}

// ============ Motor A: implementação por grafo autoral ============
export class MotorGrafoAutoral implements MotorNarrativa {
  private readonly cen: Cenario;
  private readonly objIndex: Map<string, Objeto>;

  constructor(grafo: GrafoAutoral) {
    this.cen = grafo.cenario;
    this.objIndex = new Map(this.cen.objetos.map((o) => [o.id, o]));
  }

  abertura(nivel: Nivel): Trecho {
    return { texto: this.cen.abertura[nivel], ehFinal: false };
  }

  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho {
    const obj = this.objIndex.get(objetoId);
    if (!obj) return { texto: "", ehFinal: false, objetoId };

    // a primeira regra cuja condição bate com o estado atual vence; senão, gatilho.
    const regra = obj.regras.find((r) => this.avaliaCondicao(r.se, historia));
    const frag = regra ? regra.entao : obj.gatilho;
    return { texto: frag[nivel], ehFinal: false, objetoId };
  }

  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho {
    if (modo === "aberto") {
      const ultimo = historia[historia.length - 1];
      const aberto = this.cen.desfechos.aberto.find((a) => a.se_terminou_com === ultimo);
      if (aberto) return { texto: aberto.fragmento[nivel], ehFinal: true };
      // objeto final sem ramo aberto → cai no convergente (degradação segura)
    }
    return { texto: this.cen.desfechos.convergente[nivel], ehFinal: true };
  }

  /** Condições suportadas: "tem:ID" e "nao_tem:ID". */
  private avaliaCondicao(cond: string, historia: string[]): boolean {
    const [op, alvo] = cond.split(":");
    const presente = historia.includes(alvo);
    if (op === "tem") return presente;
    if (op === "nao_tem") return !presente;
    return false; // operador desconhecido = condição não satisfeita
  }
}

// ============ DEMO — as duas trajetórias divergentes ============
// Reproduz, em texto, o mesmo cenário com escolhas diferentes.
// Requer tsconfig com "resolveJsonModule": true e "esModuleInterop": true.
//
//   import grafo from "../dados/quintal_grafo.json";
//   const motor = new MotorGrafoAutoral(grafo as GrafoAutoral);
//   console.log(jogar(motor, ["vagalume","frasco","vento"], "convergente", "n3"));
//   console.log(jogar(motor, ["vagalume","gato","coruja"], "aberto", "n3"));

export function jogar(
  motor: MotorNarrativa,
  objetos: string[],
  modo: ModoDesfecho,
  nivel: Nivel
): string {
  const historia: string[] = [];
  const linhas: string[] = [motor.abertura(nivel).texto];

  for (const id of objetos) {
    // o trecho é calculado com a história ANTES de colocar o objeto...
    const t = motor.aoAdicionarObjeto(historia, id, nivel);
    // ...e na app real, o objeto só é "empurrado" para a história DEPOIS que a
    // criança lê o trecho no portão (o Premack). Aqui simulamos a leitura ok.
    historia.push(id);
    linhas.push(t.texto);
  }

  linhas.push(motor.desfecho(historia, modo, nivel).texto);
  return linhas.map((l) => "— " + l).join("\n");
}
