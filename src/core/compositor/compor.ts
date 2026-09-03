/**
 * [compor.ts] — O compositor: transforma o arranjo da criança + as fichas num
 *   PacoteComposicao determinístico (a matéria que o realizador vai narrar).
 *
 * PAPEL: core-lógica (compositor · fase 11 · determinístico, fronteira fichas→Pacote)
 * POR QUE EXISTE: separa a DECISÃO editorial (o que entra na história, já resolvido
 *   no nível) da REDAÇÃO (o LLM): a partir do estado da partida e dos 3 catálogos de
 *   fichas, monta os beats na ordem da linha — sem I/O, sem relógio, sem LLM.
 * ENTRA: EstadoCompositor (cenarioId, linha ordenada, rodada, desfecho),
 *   CatalogoFichas (objetos/relacoes/cenarios pipoca.fichas.v1) e PerfilCompositor
 *   (nome, gênero, nível).
 * SAI: PacoteComposicao (esquema pipoca.pacote-composicao.v1) — puro e byte-idêntico
 *   para a mesma entrada, sem RNG.
 * CHAMA: fichas/tipos.ts:ESQUEMA_FICHAS_V1/PorNivel, compositor/pacote.ts (tipos +
 *   ESQUEMA_PACOTE_COMPOSICAO_V1), gramatica.ts:selecionarRelacoes/derivarEco,
 *   composicao.ts:NivelKey (tipo).
 * É CHAMADO POR: geracao/geracao.ts:gerar (rota "realizador"), compositor.test.ts,
 *   experimentos/fichas-para-historias/gerar.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/compositor/compositor.test.ts` (dentro de `bun run test`).
 * CUIDADO: célula ausente no nível LANÇA com objeto+campo+nível (nunca degrada para
 *   outro nível — dupla barreira com o lint); a ordem das chaves do literal de retorno
 *   é fixa de propósito (JSON.stringify byte-idêntico); NUNCA reordenar os beats
 *   (seguem a linha da criança). Há DOIS `compor()` homônimos: este (fichas→Pacote) ≠
 *   composicao.ts:461 (v3, recompõe o miolo).
 *
 * — detalhe preservado —
 * Pipoca — O compositor (compor.ts)
 * ---------------------------------
 * `compor(estado, fichas, perfil) → PacoteComposicao` — pura (sem I/O, sem
 * relógio), determinística (mesma entrada ⇒ Pacote byte-idêntico) e SEM RNG:
 * fichas têm UMA célula por nível, então a única fonte de aleatoriedade do v3
 * (`escolherVariante`, `src/core/composicao.ts:159-164`) não tem objeto aqui.
 * Fonte da verdade: docs/plans02/fase11_a_mais_compositor/11-01.
 *
 * Homonímia (fase11-11-01): este é o `compor` do COMPOSITOR — não confundir com
 * o `compor` do v3 (recompor o miolo com pontas travadas,
 * `src/core/composicao.ts:461-469`); módulos e propósitos distintos.
 */

import type { NivelKey } from "../composicao.js";
import { ESQUEMA_FICHAS_V1, type PorNivel } from "../fichas/tipos.js";
import {
  ESQUEMA_PACOTE_COMPOSICAO_V1,
  type BeatComposicao,
  type CatalogoFichas,
  type EstadoCompositor,
  type PacoteComposicao,
  type PapelBeat,
  type PerfilCompositor,
} from "./pacote.js";
import { derivarEco, selecionarRelacoes } from "./gramatica.js";

export const NIVEIS_VALIDOS: readonly NivelKey[] = ["n1", "n2", "n3", "n4"];

/**
 * Tabelas-semente CALIBRÁVEIS. `paragrafos` é DERIVADO DA RODADA (D-12.1;
 * tabela em fase12-12-01 — a faixa "R2: 1–2" do doc é resolvida para 2 nesta
 * semente, decisão registrada no PR da fase 11). `palavras_max_por_paragrafo`
 * é por nível (tabela do fase11-11-00).
 */
export const PARAGRAFOS_POR_RODADA: Record<1 | 2 | 3 | 4, number> = { 1: 1, 2: 2, 3: 2, 4: 2 };
export const PALAVRAS_MAX_POR_PARAGRAFO: Record<NivelKey, number> = {
  n1: 25,
  n2: 40,
  n3: 55,
  n4: 70,
};

/**
 * Projeta uma célula por-nível — falha explícita com objeto+campo+nível quando
 * ausente (nunca degradar para outro nível; invariante de fase10-10-00). O lint
 * de fase10-10-05 impede a montante, mas o compositor não confia: dupla barreira.
 */
function celula(
  porNivel: PorNivel | undefined,
  nivel: NivelKey,
  dono: string,
  campo: string
): string {
  const texto = porNivel ? porNivel[nivel] : undefined;
  if (typeof texto !== "string" || texto.length === 0) {
    throw new Error(
      `compositor: nível ausente na ficha — objeto "${dono}", campo "${campo}", nível "${nivel}"`
    );
  }
  return texto;
}

function validarEntrada(
  estado: EstadoCompositor,
  fichas: CatalogoFichas,
  perfil: PerfilCompositor
): void {
  if (!NIVEIS_VALIDOS.includes(perfil.nivel)) {
    throw new Error(`compositor: perfil sem nível válido — recebido "${perfil.nivel}"`);
  }
  // Consumidores rejeitam esquema desconhecido com erro explícito (fase11-11-00).
  for (const [nome, arquivo] of [
    ["objetos", fichas.objetos],
    ["relacoes", fichas.relacoes],
    ["cenarios", fichas.cenarios],
  ] as const) {
    if (!arquivo || arquivo.esquema !== ESQUEMA_FICHAS_V1) {
      throw new Error(
        `compositor: catálogo "${nome}" com esquema desconhecido — esperado "${ESQUEMA_FICHAS_V1}"`
      );
    }
  }
  if (!Array.isArray(estado.linha) || estado.linha.length === 0) {
    throw new Error("compositor: linha vazia — o Pacote exige ao menos 1 beat");
  }
  if (!(estado.rodada in PARAGRAFOS_POR_RODADA)) {
    throw new Error(`compositor: rodada fora de 1..4 — recebida "${estado.rodada}"`);
  }
}

/** `linha[0]` = abertura, última = fecho, resto = miolo — pontas travadas desde a
 *  R1 (`ordenarR1`/`podeInserir`, `src/core/composicao.ts:475-488` e `:405-410`);
 *  linha de 1 objeto → beat único "abertura"; linha de 2 → abertura + fecho. */
function derivarPapel(indice: number, tamanho: number): PapelBeat {
  if (indice === 0) return "abertura";
  if (indice === tamanho - 1) return "fecho";
  return "miolo";
}

export function compor(
  estado: EstadoCompositor,
  fichas: CatalogoFichas,
  perfil: PerfilCompositor
): PacoteComposicao {
  validarEntrada(estado, fichas, perfil);
  const nivel = perfil.nivel;

  const fichaCenario = fichas.cenarios.cenarios[estado.cenarioId];
  if (!fichaCenario) {
    throw new Error(`compositor: cenário sem ficha no catálogo — "${estado.cenarioId}"`);
  }

  // Seleção D5 (teto 2 POR PACOTE) antes da montagem dos beats.
  const vencedoras = selecionarRelacoes(fichas.relacoes.objeto_x_objeto, estado.linha);

  // Beats na ordem da linha da criança — NUNCA reordenar (garantia de existência).
  const beats: BeatComposicao[] = estado.linha.map((objeto, indice) => {
    const ficha = fichas.objetos.objetos[objeto];
    if (!ficha) {
      throw new Error(`compositor: objeto sem ficha no catálogo — "${objeto}"`);
    }
    return {
      objeto,
      papel: derivarPapel(indice, estado.linha.length),
      descricao: celula(ficha.descricao, nivel, objeto, "descricao"),
      corpo: celula(ficha.sensacao ? ficha.sensacao.corpo : undefined, nivel, objeto, "sensacao.corpo"),
      // E1 (ML-5): o sentimento (registro) e o sentido (dominante) já escritos
      // nas fichas viajam para a IA — aditivos, só quando a ficha os tem.
      ...(ficha.sensacao && ficha.sensacao.registro ? { sentimento: ficha.sensacao.registro } : {}),
      ...(ficha.sensacao && ficha.sensacao.dominante ? { sentido: ficha.sensacao.dominante } : {}),
      relacoes: vencedoras
        .filter((r) => r.objeto === objeto)
        .map((r) => ({ alvo: r.alvo, interacao: celula(r.interacao, nivel, r.objeto, "interacao") })),
    };
  });

  // Literais na ordem do contrato (11-00): a ordem de chaves fica estável e o
  // JSON.stringify é byte-idêntico entre execuções (edge-case do fase11-11-03).
  return {
    esquema: ESQUEMA_PACOTE_COMPOSICAO_V1,
    cenario: {
      id: estado.cenarioId,
      descricao: fichaCenario.descricao,
      voz_do_contador: fichaCenario.voz_do_contador,
      sensacao_no_personagem: celula(
        fichaCenario.sensacao_no_personagem,
        nivel,
        estado.cenarioId,
        "sensacao_no_personagem"
      ),
    },
    personagem: { nome: perfil.nome, genero: perfil.genero },
    nivel,
    beats,
    eco: derivarEco(estado),
    restricoes: {
      paragrafos: PARAGRAFOS_POR_RODADA[estado.rodada],
      palavras_max_por_paragrafo: PALAVRAS_MAX_POR_PARAGRAFO[nivel],
    },
  };
}
