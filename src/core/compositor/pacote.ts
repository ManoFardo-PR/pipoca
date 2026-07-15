/**
 * [pacote.ts] — Tipos do contrato pipoca.pacote-composicao.v1: a fronteira de dados
 *   entre o compositor (determinístico) e o realizador (LLM).
 *
 * PAPEL: core-lógica (contrato de tipos · fase 11 · fronteira compositor↔realizador)
 * POR QUE EXISTE: define o formato do Pacote (cenário, personagem, nível, beats, eco,
 *   restrições) + os tipos de entrada do compositor (EstadoCompositor,
 *   PerfilCompositor, CatalogoFichas), para que os dois lados nunca compartilhem
 *   fichas nem lógica — só o Pacote atravessa.
 * ENTRA: nada em runtime (arquivo só de tipos + a constante de esquema).
 * SAI: interfaces/tipos exportados + ESQUEMA_PACOTE_COMPOSICAO_V1.
 * CHAMA: composicao.ts:NivelKey (tipo), fichas/tipos.ts:ArquivoObjetos/Relacoes/
 *   CenariosV1 (tipos).
 * É CHAMADO POR: compositor/compor.ts e gramatica.ts (produzem/decidem), realizador
 *   {realizar,prompt_template,validador,cascata}.ts (consomem), geracao/geracao.ts,
 *   backend/proxy_realizador.ts, core/historias.ts, compositor.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/compositor/compositor.test.ts` (dentro de `bun run test`).
 * CUIDADO: o Pacote carrega só MATÉRIA (fatos/sensações já resolvidos no nível) — as
 *   3 leis editoriais são MÉTODO e vivem no prompt-template do realizador (D-11.1),
 *   NUNCA aqui; os `beats` seguem a ordem da linha da criança (nunca reordenar).
 *
 * — detalhe preservado —
 * Pipoca — Pacote de Composição v1 (pacote.ts)
 * --------------------------------------------
 * Tipos do contrato `pipoca.pacote-composicao.v1` — a fronteira entre o
 * compositor (fase 11, determinístico) e o realizador (fase 12, LLM).
 * Fonte da verdade: docs/plans02/fase11_a_mais_compositor/11-00.
 * O Pacote carrega MATÉRIA (fatos e sensações já resolvidos no nível); as 3 leis
 * editoriais são MÉTODO e vivem no prompt-template do realizador (D-11.1).
 */

import type { NivelKey } from "../composicao.js";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../fichas/tipos.js";

export const ESQUEMA_PACOTE_COMPOSICAO_V1 = "pipoca.pacote-composicao.v1";

/** Derivado da POSIÇÃO na linha (pontas travadas desde a R1), nunca de campo da ficha. */
export type PapelBeat = "abertura" | "miolo" | "fecho";

/** Relação já RESOLVIDA pelo compositor: `alvo` explícito, sem condição `se` (D4). */
export interface RelacaoResolvida {
  alvo: string;
  interacao: string;
}

export interface BeatComposicao {
  objeto: string;
  papel: PapelBeat;
  /** `descricao[nivel]` da ficha de identidade — o realizador não vê fichas. */
  descricao: string;
  /** `sensacao.corpo[nivel]` da ficha de identidade. */
  corpo: string;
  /** Pode ser vazia; teto de 2 relações POR PACOTE (D5). */
  relacoes: RelacaoResolvida[];
}

export interface PacoteComposicao {
  esquema: typeof ESQUEMA_PACOTE_COMPOSICAO_V1;
  cenario: {
    id: string;
    /** String única (D3). */
    descricao: string;
    voz_do_contador: string;
    /** RESOLVIDA no nível (D-11.2). */
    sensacao_no_personagem: string;
  };
  /** Do perfil (cadastro), nunca de ficha — invariante de fase10-10-00. */
  personagem: {
    nome: string;
    genero: "m" | "f";
  };
  nivel: NivelKey;
  /** Ordem ≡ ordem da linha da criança; nunca reordenar (mínimo 1). */
  beats: BeatComposicao[];
  /** Decisão de arranjo do compositor; `null` = desfecho convergente. */
  eco: { abre_com: string; fecha_com: string } | null;
  restricoes: {
    /** DERIVADO DA RODADA (D-12.1; tabela-semente em compor.ts). */
    paragrafos: number;
    /** Por nível (tabela do 11-00). */
    palavras_max_por_paragrafo: number;
  };
}

/**
 * Estado de composição consumido pelo compositor — o equivalente da nova geração
 * do `EstadoComp` do v3 (`src/core/composicao.ts:102`). Decisão registrada
 * (fase11-11-01, passo 1): tipo próprio mínimo em vez de reusar `EstadoComp`,
 * que carrega o grafo v2 inteiro — matéria que o compositor não consome
 * (as fichas o substituem).
 */
export interface EstadoCompositor {
  cenarioId: string;
  /** A linha da criança, na ordem escolhida — a ordem dos beats. */
  linha: string[];
  rodada: 1 | 2 | 3 | 4;
  /** Modo de desfecho da sessão — decide o campo `eco`. */
  desfecho: "convergente" | "aberto";
}

/**
 * Perfil da criança (cadastro) — fonte de `personagem` e `nivel`. Tipo próprio:
 * o `Perfil` de `src/core/estado.ts:34-40` não carrega `genero` (campo aditivo
 * opcional planejado na fase 13).
 */
export interface PerfilCompositor {
  nome: string;
  genero: "m" | "f";
  nivel: NivelKey;
}

/** Os três catálogos `pipoca.fichas.v1` (import de JSON versionado; banco é fase 13). */
export interface CatalogoFichas {
  objetos: ArquivoObjetosV1;
  relacoes: ArquivoRelacoesV1;
  cenarios: ArquivoCenariosV1;
}
