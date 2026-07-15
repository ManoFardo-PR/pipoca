/**
 * [geracao.ts] — A costura App↔motores: recebe estado+perfil, roteia por nível,
 *   chama compositor→realizador e devolve texto + origem (LLM ou fallback A+ v3).
 *
 * PAPEL: core-lógica (geração 2 · fase 13 · seam único entre app e motores)
 * POR QUE EXISTE: dá ao app UMA porta — o app não sabe se o texto veio do LLM ou do
 *   A+ v3, o realizador não vê fichas, o compositor não vê provedor; aplica a rota por
 *   nível e a política de falha do 12-04.
 * ENTRA: EntradaGeracao (estado, fichas|null, perfil, estadoFallback) + OpcoesGeracao
 *   (rota, provedores, realizador injetável, temperatura, tetos).
 * SAI: Promise<ResultadoGeracao> (texto, paragrafos, veredito|null, origem, metadados?,
 *   pacote|null).
 * CHAMA: composicao.ts:montar (fallback A+ v3), perfil.ts:NOME_PADRAO,
 *   compositor/compor.ts:compor, realizador/realizar.ts:realizar (default injetável),
 *   + tipos de compositor/pacote.ts, realizador/cascata.ts e validador.ts.
 * É CHAMADO POR: src/app/bridge.ts (gerar), geracao.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/geracao/geracao.test.ts` (dentro de `bun run test`).
 * CUIDADO: NÃO chamar de "orquestrador" (homonímia com src/ia/orquestrador.ts);
 *   `personagem.nome` é SEMPRE o do perfil (nunca substituir por "Joana" — incidente
 *   forense); gênero ausente ⇒ concordância FEMININA (nunca inferir do nome); nunca
 *   lança pelo caminho infeliz do LLM quando há estadoFallback, mas LANÇA se nem o A+
 *   está disponível (nunca texto "meio certo"); em produção a cascata roda NO EDGE
 *   (realizador injetável keyless) — nenhuma chave de IA vive aqui.
 *
 * — detalhe preservado —
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
 * REGRA DE IDENTIDADE (evoluída em 2026-07-11 — incidente da primeira sessão
 * real, ver docs/plans02/forense-personagem.md): `personagem.nome` é SEMPRE o
 * nome do perfil — o nome da criança NUNCA é substituído ("Joana" permanece
 * apenas em conteúdo legado/demonstração). `personagem.genero`: o do perfil
 * quando definido; ausente ⇒ concordância FEMININA com o nome real (o app
 * pede o gênero uma vez na ativação do perfil e persiste — 13-01). Nunca
 * inferir do nome.
 */

import { montar, type EstadoComp, type NivelKey } from "../composicao.js";
import { NOME_PADRAO } from "../perfil.js";
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

/**
 * Default de CONCORDÂNCIA quando o perfil não tem gênero e ninguém respondeu
 * ao pedir-uma-vez (regra de 2026-07-11): a história usa o NOME REAL do perfil
 * com flexões femininas. Substitui o antigo PERSONAGEM_CANONICO ("Joana", f),
 * que trocava a identidade inteira — causa-raiz do incidente da 1ª sessão real.
 */
export const GENERO_CONCORDANCIA_PADRAO = "f" as const;

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

  // Identidade (regra de 2026-07-11): o nome é SEMPRE o do perfil — nunca
  // substituído. Nome vazio é caso degenerado (criarPerfil normaliza para
  // NOME_PADRAO a montante); aqui o mesmo default explícito, nunca "Joana".
  // Gênero ausente/ inválido ⇒ concordância feminina com o nome real.
  const nomeCru = typeof entrada.perfil.nome === "string" ? entrada.perfil.nome.trim() : "";
  const personagem = {
    nome: nomeCru !== "" ? nomeCru : NOME_PADRAO,
    genero: generoValido(entrada.perfil.genero) ? entrada.perfil.genero : GENERO_CONCORDANCIA_PADRAO,
  };

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
