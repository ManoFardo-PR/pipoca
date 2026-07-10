/**
 * Pipoca — Política de falha em cascata (cascata.ts)
 * --------------------------------------------------
 * Máquina do fase12-12-04: distingue falha de PROVEDOR (retry curto 1× só em
 * erro transitório; recusa NUNCA repete) de falha de FIDELIDADE (1 tentativa
 * por provedor — texto reprovado não se "reconserta" com retry idêntico ⇒
 * próximo da cascata). Teto GLOBAL de chamadas LLM (semente: 4). Esgotado ⇒
 * fallback final = A+ v3 (`montar`, `src/core/composicao.ts:505`, chamado como
 * função — o arquivo é intocável), sempre disponível, sempre fiel.
 * NUNCA entregar texto infiel; origem do texto SEMPRE sinalizada.
 */

import { montar, type EstadoComp, type NivelKey } from "../composicao.js";
import type { PacoteComposicao } from "../compositor/pacote.js";
import type { PromptRealizador } from "./prompt_template.js";
import { validar, type VereditoRealizador } from "./validador.js";
import {
  ErroProvedorRealizador,
  ErroRecusaRealizador,
  type ProvedorRealizador,
} from "./provedor_realizador.js";

/** Teto global de chamadas de LLM por realização (proposta-semente do 12-04). */
export const TETO_GLOBAL_TENTATIVAS = 4;

export interface OrigemTexto {
  fonte: "llm" | "fallback-a-mais";
  provedor?: string;
  modelo?: string;
}

export interface MetadadosRealizacao {
  /** Chamadas de LLM efetivamente feitas (≤ teto global). */
  chamadas: number;
  duracaoMs: number;
  tokens?: { entrada: number; saida: number };
}

export interface ResultadoRealizar {
  texto: string;
  paragrafos: string[];
  veredito: VereditoRealizador;
  origem: OrigemTexto;
  metadados: MetadadosRealizacao;
}

export interface OpcoesRealizar {
  provedor?: string;
  modelo?: string;
  temperatura?: number;
  teto_tentativas?: number;
  /** Injeção para teste/calibração — em produção o SERVIDOR decide (fase 13). */
  provedores?: ProvedorRealizador[];
  /** O "estado da partida" do fallback A+ v3 (12-04). Ausente + cascata esgotada ⇒ erro. */
  estadoFallback?: { estado: EstadoComp; nivel: NivelKey };
}

/**
 * Cascata esgotada SEM fallback disponível — erro explícito de aplicação
 * (12-04, edge-case). Carrega a última tentativa para calibração/telemetria:
 * o dado não se perde, mas NUNCA sai como sucesso.
 */
export class ErroRealizacaoEsgotada extends Error {
  readonly ultima?: {
    texto: string;
    paragrafos: string[];
    veredito: VereditoRealizador;
    origem: OrigemTexto;
    metadados: MetadadosRealizacao;
  };
  constructor(mensagem: string, ultima?: ErroRealizacaoEsgotada["ultima"]) {
    super(mensagem);
    this.name = "ErroRealizacaoEsgotada";
    this.ultima = ultima;
  }
}

/** Segmentação declarada pelo LLM: parágrafos separados por linha em branco (12-00). */
export function segmentarParagrafos(texto: string): string[] {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export async function realizarComCascata(
  pacote: PacoteComposicao,
  prompt: PromptRealizador,
  provedores: ProvedorRealizador[],
  opcoes: OpcoesRealizar
): Promise<ResultadoRealizar> {
  const inicio = Date.now();
  const teto = opcoes.teto_tentativas ?? TETO_GLOBAL_TENTATIVAS;
  const temperatura = opcoes.temperatura ?? 0.4;
  let chamadas = 0;
  let tokensEntrada = 0;
  let tokensSaida = 0;
  let temTokens = false;
  let ultima: ErroRealizacaoEsgotada["ultima"];

  const metadados = (): MetadadosRealizacao => ({
    chamadas,
    duracaoMs: Date.now() - inicio,
    ...(temTokens ? { tokens: { entrada: tokensEntrada, saida: tokensSaida } } : {}),
  });

  cascata: for (const provedor of provedores) {
    let jaRetentou = false;
    while (chamadas < teto) {
      chamadas++;
      let resposta;
      try {
        resposta = await provedor.gerarTexto(prompt.user, {
          modelo: opcoes.modelo ?? provedor.modeloPadrao,
          temperatura,
          system: prompt.system,
        });
      } catch (e) {
        if (e instanceof ErroRecusaRealizador) continue cascata; // recusa não repete (12-04)
        const transitorio = e instanceof ErroProvedorRealizador && e.transitorio;
        if (transitorio && !jaRetentou && chamadas < teto) {
          jaRetentou = true; // retry curto, 1×, só falha técnica transitória
          continue;
        }
        continue cascata;
      }
      if (resposta.metadados.tokens) {
        temTokens = true;
        tokensEntrada += resposta.metadados.tokens.entrada;
        tokensSaida += resposta.metadados.tokens.saida;
      }
      const paragrafos = segmentarParagrafos(resposta.texto);
      const veredito = validar(pacote, resposta.texto, paragrafos);
      const origem: OrigemTexto = {
        fonte: "llm",
        provedor: provedor.nome,
        modelo: resposta.metadados.modelo,
      };
      if (veredito.pass) {
        return { texto: resposta.texto, paragrafos, veredito, origem, metadados: metadados() };
      }
      // Falha de FIDELIDADE: 1 tentativa por provedor ⇒ próximo da cascata.
      ultima = { texto: resposta.texto, paragrafos, veredito, origem, metadados: metadados() };
      continue cascata;
    }
    break; // teto global atingido
  }

  // Cascata esgotada — fallback final = A+ v3 (rede de segurança de CONTEÚDO).
  if (opcoes.estadoFallback) {
    const texto = montar(opcoes.estadoFallback.estado, opcoes.estadoFallback.nivel);
    return {
      texto,
      paragrafos: [texto],
      veredito: {
        pass: true,
        motivos: [],
        avisos: ["texto do fallback A+ v3 (cascata de LLM esgotada)"],
        presencaPorBeat: {},
      },
      origem: { fonte: "fallback-a-mais" },
      metadados: metadados(),
    };
  }
  throw new ErroRealizacaoEsgotada(
    `realizador: cascata esgotada (${chamadas} chamada(s)) e sem estadoFallback — erro explícito de aplicação (12-04)`,
    ultima
  );
}
