/**
 * [orquestrador.ts] — percorre a cascata de provedores de IA (primário →
 *   fallback) aplicando teto de cota e de custo por chamada.
 *
 * PAPEL: core-lógica (orquestração de IA · GERAÇÃO 1 · fallback/cotas/custo)
 * POR QUE EXISTE: dá uma cadeia de fallback resiliente sobre vários provedores
 *   e um freio de cota/custo local, expondo tudo como um único ProvedorIA.
 * ENTRA: cadeiaFallback (ProvedorIA[]) e OpcoesOrquestrador (cotaMensal,
 *   custoMaxMensal, custoPorChamada, aoRegistrarUso); depois prompt/schema/opts.
 * SAI: um Orquestrador (ProvedorIA + uso()); gerar() devolve Trecho ou lança
 *   quando cota/custo esgotam ou todos falham.
 * CHAMA: ./provedor.js:{JsonSchema, OptsGeracao, ProvedorIA} (tipos),
 *   ../core/grafo/tipos.js:Trecho.
 * É CHAMADO POR: ia/ia.test.ts e backend/backend.test.ts (cobertura da cascata).
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; `bun run src/ia/ia.test.ts`
 *   (dentro de `bun run test`).
 * CUIDADO: cliente KEYLESS — nenhuma chave de provedor vive aqui (nem em src/):
 *   a credencial mora nos secrets da Edge Function proxy-ia. O degrau final é o
 *   THROW — quem degrada p/ Motor A é o consumidor. Cota/custo no MVP são pool
 *   LOCAL em memória (não persistido). Telemetria de uso SEM PII: só números.
 *
 * — detalhe preservado —
 * Pipoca — Fallback, cotas e custo · doc fase05-05-10
 * ----------------------------------------------------
 * Orquestra a cadeia de provedores (primário → fallback); o degrau final
 * ("motorA" da cadeiaFallback do doc) é o THROW: quem degrada para o
 * Motor A é o consumidor (Motor B/fábrica), como em toda a fase.
 * Implementa `ProvedorIA` — encaixa onde qualquer provedor encaixa (05-04).
 *
 * Cotas/custo no MVP: pool LOCAL em memória (cotaRestante/custoAcumulado),
 * com teto injetável; a config real por tenant (SA_AI) e a persistência/
 * medição de verdade chegam com o backend (fase06). Telemetria de uso SEM
 * PII: o callback recebe só números (nunca prompt/texto).
 */

import type { Trecho } from "../core/grafo/tipos.js";
import type { JsonSchema, OptsGeracao, ProvedorIA } from "./provedor.js";

export interface UsoIA {
  chamadas: number; // tentativas que chegaram a um provedor
  custoAcumulado: number;
  cotaRestante: number;
}

export interface OpcoesOrquestrador {
  cotaMensal?: number; // teto de chamadas (default local generoso)
  custoMaxMensal?: number; // teto de custo estimado
  custoPorChamada?: number; // estimativa local por chamada (MVP)
  aoRegistrarUso?: (uso: UsoIA) => void; // telemetria de custo — só números, sem PII
}

export interface Orquestrador extends ProvedorIA {
  uso(): UsoIA;
}

export function criarOrquestrador(cadeiaFallback: ProvedorIA[], opts?: OpcoesOrquestrador): Orquestrador {
  const cotaMensal = opts && typeof opts.cotaMensal === "number" ? opts.cotaMensal : 1000;
  const custoMaxMensal = opts && typeof opts.custoMaxMensal === "number" ? opts.custoMaxMensal : 1000;
  const custoPorChamada = opts && typeof opts.custoPorChamada === "number" ? opts.custoPorChamada : 1;
  const aoRegistrarUso = opts ? opts.aoRegistrarUso : undefined;

  let chamadas = 0;
  let custoAcumulado = 0;

  function usoAtual(): UsoIA {
    return { chamadas, custoAcumulado, cotaRestante: Math.max(0, cotaMensal - chamadas) };
  }

  function registrar(): void {
    chamadas += 1;
    custoAcumulado += custoPorChamada;
    if (aoRegistrarUso) {
      try {
        aoRegistrarUso(usoAtual());
      } catch {
        /* telemetria nunca derruba a geração */
      }
    }
  }

  return {
    uso: usoAtual,
    async gerar(prompt: string, schema: JsonSchema, optsGeracao?: OptsGeracao): Promise<Trecho> {
      if (!cadeiaFallback.length) {
        throw new Error("Orquestrador sem provedores na cadeia.");
      }
      let ultimoErro: unknown = null;
      for (const provedor of cadeiaFallback) {
        // Cota/custo zerados → nem chama: o throw degrada para o Motor A.
        if (cotaMensal - chamadas <= 0) {
          throw new Error("Cota de IA esgotada — degradando para o motor autoral.");
        }
        if (custoAcumulado + custoPorChamada > custoMaxMensal) {
          throw new Error("Teto de custo de IA atingido — degradando para o motor autoral.");
        }
        try {
          registrar();
          return await provedor.gerar(prompt, schema, optsGeracao);
        } catch (e) {
          ultimoErro = e; // falhou/estourou → próximo da cadeia
        }
      }
      throw (ultimoErro instanceof Error ? ultimoErro : new Error("Todos os provedores falharam."));
    },
  };
}
