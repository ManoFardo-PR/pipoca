/**
 * Pipoca — Módulo de geração (geracao.ts) · fase13-13-00 / 13-01
 * --------------------------------------------------------------
 * O módulo NOVO entre o app e os motores (D-13.1; nome fixado "geracao" —
 * NUNCA "orquestrador", homonímia com `src/ia/orquestrador.ts`): recebe
 * estado+perfil, chama compositor → realizador, aplica a política de falha
 * (fase12-12-04) e devolve texto+origem. Regra de ouro (13-00): o app não
 * sabe se o texto veio de LLM ou do fallback A+ v3 — só recebe a origem
 * como metadado; o realizador não vê fichas; o compositor não vê provedor.
 *
 * POLÍTICA DE ROTA POR NÍVEL (requisito do autor, fases 13+14): cada nível
 * roteia para "realizador" (compor→realizar) ou "ap_cru" (A+ v3 direto).
 * Default: realizador em TODOS os níveis (decisão executiva de 2026-07-11 —
 * o n1 permanece no realizador; o CRITÉRIO do fase12-12-05 reavalia na
 * primeira sessão real). Trocar a rota de um nível custa UMA linha:
 *   gerar(entrada, { rota: { n1: "ap_cru" } })
 *
 * Perfil legado SEM gênero (13-01, decisão fixada): o Pacote exige
 * `personagem.genero`; sem ele o compositor não é chamado com personagem
 * "meio certo" — usa-se o PERSONAGEM CANÔNICO ("Joana", f). Nunca inferir
 * do nome.
 */

import { montar, type EstadoComp, type NivelKey } from "../composicao.js";
import { compor } from "../compositor/compor.js";
import type {
  CatalogoFichas,
  EstadoCompositor,
  PacoteComposicao,
} from "../compositor/pacote.js";
import { realizar } from "../realizador/realizar.js";
import type {
  MetadadosRealizacao,
  OpcoesRealizar,
  ResultadoRealizar,
} from "../realizador/cascata.js";
import type { ProvedorRealizador } from "../realizador/provedor_realizador.js";
import type { VereditoRealizador } from "../realizador/validador.js";

export type RotaNivel = "realizador" | "ap_cru";
export type RotaPorNivel = Record<NivelKey, RotaNivel>;

/** Default: realizador em todos os níveis. Trocar um nível = UMA linha de config. */
export const ROTA_PADRAO: RotaPorNivel = {
  n1: "realizador",
  n2: "realizador",
  n3: "realizador",
  n4: "realizador",
};

/** Regra de default do perfil legado sem gênero (13-01): personagem canônico. */
export const PERSONAGEM_CANONICO = { nome: "Joana", genero: "f" } as const;

const NIVEIS: readonly NivelKey[] = ["n1", "n2", "n3", "n4"];

/** Perfil como chega do app (o gênero é campo ADITIVO OPCIONAL no pipoca.perfil.v1). */
export interface PerfilGeracao {
  nome?: string;
  genero?: string;
  nivel: NivelKey;
}

export interface EntradaGeracao {
  /** O estado da partida na fronteira App → Compositor (13-00). */
  estado: EstadoCompositor;
  /** Os 3 catálogos `pipoca.fichas.v1`; null = fichas não carregadas ⇒ caminho v3. */
  fichas: CatalogoFichas | null;
  perfil: PerfilGeracao;
  /** O "estado da partida" v3 para o fallback A+ (12-04). Sem ele, o caminho A+ falha explícito. */
  estadoFallback?: { estado: EstadoComp; nivel: NivelKey } | null;
}

export interface OpcoesGeracao {
  /** Sobreposição parcial da rota por nível (uma linha para trocar um nível). */
  rota?: Partial<RotaPorNivel>;
  /** Injeção para teste/local — em produção o realizador roda no edge (13-03). */
  provedores?: ProvedorRealizador[];
  /**
   * Realizador injetável (produção: cliente keyless do edge — a cascata roda
   * NO SERVIDOR, uma viagem por realização; teste: fake). Default: `realizar`
   * local (cascata no dispositivo, só faz sentido com `provedores`).
   */
  realizador?: (pacote: PacoteComposicao, opcoes: OpcoesRealizar) => Promise<ResultadoRealizar>;
  temperatura?: number;
  teto_tentativas?: number;
  atraso_retry_ms?: number;
}

/** Origem SEMPRE sinalizada (12-04) + a rota que a política escolheu. */
export interface OrigemGeracao {
  fonte: "llm" | "fallback-a-mais";
  rota: RotaNivel;
  provedor?: string;
  modelo?: string;
  /** Por que o texto veio do A+ v3 (telemetria; a criança nunca vê). */
  motivo?: string;
}

export interface ResultadoGeracao {
  texto: string;
  paragrafos: string[];
  /** null quando o texto veio do A+ v3 sem passar pelo realizador. */
  veredito: VereditoRealizador | null;
  origem: OrigemGeracao;
  metadados?: MetadadosRealizacao;
  /** O Pacote que gerou o texto (pacoteOrigem da persistência, 13-02); null se não houve. */
  pacote: PacoteComposicao | null;
}

function generoValido(g: unknown): g is "m" | "f" {
  return g === "m" || g === "f";
}

/**
 * Gera a história de ponta a ponta: política de rota → compor → realizar →
 * veredito → fallback A+ v3. NUNCA lança pelo caminho infeliz do LLM quando
 * há `estadoFallback` (a cascata do 12-04 garante texto fiel); lança explícito
 * quando nem o A+ está disponível — nunca texto "meio certo" para a criança.
 */
export async function gerar(
  entrada: EntradaGeracao,
  opcoes: OpcoesGeracao = {}
): Promise<ResultadoGeracao> {
  const nivel = entrada.perfil ? entrada.perfil.nivel : undefined;
  if (!nivel || !NIVEIS.includes(nivel)) {
    throw new Error(`geracao: perfil sem nível válido — recebido "${String(nivel)}"`);
  }
  const rota: RotaNivel = { ...ROTA_PADRAO, ...(opcoes.rota ?? {}) }[nivel];

  const aMais = (motivo: string, pacote: PacoteComposicao | null): ResultadoGeracao => {
    if (!entrada.estadoFallback) {
      throw new Error(`geracao: caminho A+ v3 sem estadoFallback — ${motivo}`);
    }
    const texto = montar(entrada.estadoFallback.estado, entrada.estadoFallback.nivel);
    return {
      texto,
      paragrafos: [texto],
      veredito: null,
      origem: { fonte: "fallback-a-mais", rota, motivo },
      pacote,
    };
  };

  // Rota do nível = A+ cru (política) — zero LLM, zero fichas.
  if (rota === "ap_cru") return aMais(`rota do nível ${nivel} = ap_cru`, null);

  // Fichas não carregadas ⇒ cai direto no caminho v3 (13-00, edge-case).
  if (!entrada.fichas) return aMais("fichas não carregadas", null);

  // Perfil completo antes de compor (13-01, regra 5); legado sem gênero ⇒ canônico.
  const nome = typeof entrada.perfil.nome === "string" ? entrada.perfil.nome.trim() : "";
  const personagem =
    nome !== "" && generoValido(entrada.perfil.genero)
      ? { nome, genero: entrada.perfil.genero }
      : PERSONAGEM_CANONICO;

  let pacote: PacoteComposicao;
  try {
    pacote = compor(entrada.estado, entrada.fichas, {
      nome: personagem.nome,
      genero: personagem.genero,
      nivel,
    });
  } catch (e) {
    // Fichas corrompidas/incompletas: falha explícita a montante do LLM ⇒ v3.
    return aMais(`compor falhou: ${e instanceof Error ? e.message : String(e)}`, null);
  }

  const realizador = opcoes.realizador ?? realizar;
  try {
    const r = await realizador(pacote, {
      ...(opcoes.provedores ? { provedores: opcoes.provedores } : {}),
      ...(entrada.estadoFallback ? { estadoFallback: entrada.estadoFallback } : {}),
      ...(opcoes.temperatura !== undefined ? { temperatura: opcoes.temperatura } : {}),
      ...(opcoes.teto_tentativas !== undefined ? { teto_tentativas: opcoes.teto_tentativas } : {}),
      ...(opcoes.atraso_retry_ms !== undefined ? { atraso_retry_ms: opcoes.atraso_retry_ms } : {}),
    });
    return {
      texto: r.texto,
      paragrafos: r.paragrafos,
      veredito: r.veredito,
      origem: { ...r.origem, rota },
      metadados: r.metadados,
      pacote,
    };
  } catch (e) {
    // Realizador indisponível (edge fora do ar, esgotamento sem fallback interno):
    // o fallback NÃO depende do edge — roda no dispositivo (13-03, edge-case).
    return aMais(`realização falhou: ${e instanceof Error ? e.message : String(e)}`, pacote);
  }
}
