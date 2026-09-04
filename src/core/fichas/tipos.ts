/**
 * [tipos.ts] — Tipos do contrato pipoca.fichas.v1: as fichas da geração 2
 *   (identidade do objeto, relação objeto×objeto, cenário) em camadas.
 *
 * PAPEL: core-lógica (fichas · fase 10 · contrato de tipos da geração 2)
 * POR QUE EXISTE: modela a MATÉRIA que o compositor consome — a mesma imagem em 4
 *   alturas de leitura (PorNivel), separando identidade (o que o objeto É), relação
 *   (como reage a outro) e cenário (o mundo e sua voz).
 * ENTRA: nada em runtime (arquivo só de tipos + a constante de esquema).
 * SAI: ESQUEMA_FICHAS_V1 + interfaces (FichaIdentidade, FichaRelacao,
 *   ManifestacaoNoCenario, FichaCenario, ArquivoObjetos/Relacoes/CenariosV1, PorNivel).
 * CHAMA: composicao.ts:NivelKey (tipo, fonte canônica reaproveitada).
 * É CHAMADO POR: compositor/{compor,gramatica,pacote}.ts, fichas/lint_fichas.ts,
 *   fichas.test.ts, experimentos/fichas-para-historias/*.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/fichas/fichas.test.ts` (dentro de `bun run test`).
 * CUIDADO: os 4 níveis são OBRIGATÓRIOS em todo campo por-nível (invariante 3 do
 *   10-00; o lint E1 exige); `descricao` de cenário é string ÚNICA (D3, não por nível);
 *   `alvo` nas relações é SEMPRE explícito (D4).
 *
 * — detalhe preservado —
 * Fichas (geração 2) — contrato pipoca.fichas.v1.
 * Fonte da verdade: docs/plans02/fase10_modelo_de_fichas/10-00_contrato-schema-de-fichas.md
 * (decisões D1–D6 fechadas; sensacao_no_personagem no cenário conforme D2/D-11.2; descricao
 * de cenário string única conforme D3; alvo explícito nas relações conforme D4).
 * Fase 10: fichas nascem como JSON versionado em docs/fichas/ (migração a BD é fase 13).
 * NivelKey é reaproveitado do motor v3 (fonte canônica) — nenhuma mudança no runtime.
 */
import type { NivelKey } from "../composicao.js";

export const ESQUEMA_FICHAS_V1 = "pipoca.fichas.v1";

/** Os 4 níveis são obrigatórios em todo campo por-nível (invariante 3 do 10-00; lint E1). */
export type PorNivel = Record<NivelKey, string>;

/** Camada 1 — ficha de identidade: o que o objeto É, cross-cenário (10-01). */
export interface FichaIdentidade {
  genero: "m" | "f";
  numero: "sg" | "pl";
  /** Dial de riqueza: a MESMA imagem em quatro alturas — nunca coisas diferentes por nível. */
  descricao: PorNivel;
  sensacao: {
    /** Sentido dominante (mapa sensorial do 10-03). */
    dominante: string;
    /** Tom emocional (herda o espírito do `registro` do v3). */
    registro: string;
    /** O que o corpo da criança faz/sente. n1 = UMA sensação (lição da PoC; lint E4). */
    corpo: PorNivel;
  };
}

/** Camada 2 — relação objeto×objeto, chaveada pela gramática v3 (10-02; D4/D5). */
export interface FichaRelacao {
  /** Condição da gramática v3 (tem:/depois_de:/antes_de:/pos:); array = E lógico. */
  se: string | string[];
  /** Quem reage/anuncia (dono da relação). */
  objeto: string;
  /** O outro lado, SEMPRE explícito (D4) — o realizador nunca parseia a condição. */
  alvo: string;
  /** Interação para o realizador — nunca frase pronta. */
  interacao: PorNivel;
}

/** Camada 2 — como o objeto se manifesta NESTE cenário (sem condição; 10-02, tabela 2). */
export interface ManifestacaoNoCenario {
  objeto: string;
  manifestacao: PorNivel;
}

/** Camada 3 — ficha de cenário: o mundo e sua voz (10-00 pós D3/D-11.2). */
export interface FichaCenario {
  nome: string;
  /** String única (D3). Variações futuras de cenário são TEMÁTICAS, não por nível. */
  descricao: string;
  /** Lei 2 — o cenário como contador. */
  voz_do_contador: string;
  /** A sensação que o lugar provoca na criança (D2/D-11.2) — por nível de leitura. */
  sensacao_no_personagem: PorNivel;
}

/** docs/fichas/objetos.v1.json */
export interface ArquivoObjetosV1 {
  esquema: typeof ESQUEMA_FICHAS_V1;
  objetos: Record<string, FichaIdentidade>;
}

/** docs/fichas/relacoes.<cenario>.v1.json */
export interface ArquivoRelacoesV1 {
  esquema: typeof ESQUEMA_FICHAS_V1;
  cenario: string;
  objeto_x_objeto: FichaRelacao[];
  objeto_x_cenario: ManifestacaoNoCenario[];
}

/** docs/fichas/cenarios.v1.json */
export interface ArquivoCenariosV1 {
  esquema: typeof ESQUEMA_FICHAS_V1;
  cenarios: Record<string, FichaCenario>;
}

// ─── Manifesto de cenários (Plan03 · E4, ML-2) ───────────────────────────────

export const ESQUEMA_CENARIOS_INDEX_V1 = "pipoca.cenarios-index.v1";

/**
 * Uma entrada do manifesto (docs/cenarios.index.json): o ID CANÔNICO é o
 * vocabulário único de galeria, liberação (cenariosLiberados) e motor.
 * `grafo`/`relacoes` são caminhos servíveis (null enquanto "em breve");
 * `svg` é a chave do desenho na galeria (Canon.cenas).
 */
export interface EntradaCenarioIndex {
  id: string;
  nome: string;
  descricao: string;
  grafo: string | null;
  relacoes: string | null;
  svg: string;
  disponivel: boolean;
}

/** docs/cenarios.index.json — adicionar cenário = registrar aqui + escrever grafo/fichas/SVG. */
export interface ArquivoCenariosIndexV1 {
  esquema: typeof ESQUEMA_CENARIOS_INDEX_V1;
  cenarios: EntradaCenarioIndex[];
}
