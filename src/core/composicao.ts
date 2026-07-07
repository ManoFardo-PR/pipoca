/**
 * Pipoca — Motor de COMPOSIÇÃO AUTORAL A+ (linha verde) · esquemas pipoca.grafo-autoral.v2 e .v3
 * ---------------------------------------------------------------------------------------------
 * Mecânica-coração do produto: a criança COMBINA múltiplos objetos numa cena e a
 * história nasce do arranjo dela. A história É a recompensa — cada leitura no portão
 * destrava uma nova rodada com MAIS DE UMA opção de objeto, e o texto CRESCE.
 *
 * Modelo (4 rodadas, conjunto fechado de 7 objetos):
 *   R1 → revela 4 · escolhe e ORDENA 3 · as pontas (1º e último) TRAVAM (âncoras)
 *   R2 → revela +1 · escolhe 1 · insere SÓ no miolo (entre as pontas)
 *   R3 → revela +1 · escolhe 1 · insere SÓ no miolo
 *   R4 → revela +1 · escolhe 1 · insere SÓ no miolo → converge → desfecho
 *
 * Invariantes:
 *   • Banco = novas + sobras: objeto revelado e não escolhido segue disponível; nada repete.
 *   • Moldura fixa: história = abertura + contas(na ordem da linha) + desfecho.
 *   • Tempero é SABOR, nunca PORTÃO: condições enriquecem a frase quando casam;
 *     jamais bloqueiam uma escolha.
 *   • Portão perdoador: leitura imperfeita → dica calorosa (fora deste motor); sem punição.
 *   • Replay determinístico (v3): mesma linha + mesmo nível ⇒ o mesmo texto, sempre.
 *     Nenhum Math.random() — PRNG semeado por (cenario.id, linha, nível).
 *
 * Leitor v3 com compat v2 (contrato: docs/plans/_contratos/grafo-autoral-v3.md):
 *   • Variantes por célula: cada nível aceita string (≡ array de 1) ou string[].
 *   • Condições: tem:/nao_tem: (v2) + pos:inicio|miolo|fim, antes_de:/depois_de:,
 *     func:* (namespace RESERVADO — nunca casa), `se` string ou array (AND).
 *   • Ecos no desfecho aberto: se_comecou_com / composto / max_ecos (default 1).
 *   • Conectivos: só nos slots do miolo, sem repetição consecutiva.
 *   A normalização acontece nos PONTOS DE LEITURA — o grafo nunca é mutado.
 *
 * Funções PURAS: nenhum estado de módulo. O grafo do cenário viaja dentro do EstadoComp
 * (`cenario`) para que toda função leia o que precisa a partir do próprio estado.
 */

// ─── Tipos do grafo (v2 e v3 — grafo ativo: docs/quintal.v3.json) ─────────────
/** Esquema canônico do grafo ativo da composição (linha verde). */
export const ESQUEMA_COMPOSICAO_V3 = "pipoca.grafo-autoral.v3";
export type NivelKey = "n1" | "n2" | "n3" | "n4";
/** v3: cada nível aceita string (compat v2 ≡ array de 1) ou array de variantes. */
export type TextoV3 = Record<string, string | string[]>;
/** Uma condição da gramática de temperos/ecos (`tem:X`, `pos:fim`, `func:*`, …). */
export type CondicaoV3 = string;

export interface TemperaV2 {
  se: CondicaoV3 | CondicaoV3[]; // array = AND (todas precisam casar)
  entao: TextoV3;
}
export interface ObjetoV2 {
  emoji?: string;
  nome?: string;
  papel_no_fim?: string;
  registro?: string;
  genero?: "m" | "f"; // v3: declaração obrigatória (lint); consumo futuro
  numero?: "sg" | "pl"; // v3: declaração obrigatória (lint); consumo futuro
  conta: TextoV3;
  tempera?: TemperaV2[];
}
export interface RodadaV2 {
  n: number;
  revela: string[];
  escolhe: number;
  ordena?: boolean;
  trava_pontas?: boolean;
  insere_em?: string;
}
export interface DesfechoAbertoV2 {
  se_terminou_com?: string; // eco da âncora final (v2)
  se_comecou_com?: string; // eco da âncora inicial (v3); com ambos = AND (composto)
  fragmento: TextoV3;
}
export interface MolduraV2 {
  abertura: TextoV3;
  conectivos?: Partial<Record<NivelKey, string[]>>; // v3: tecido conjuntivo do miolo
  desfecho: { convergente: TextoV3; aberto?: DesfechoAbertoV2[]; max_ecos?: number };
}
export interface CenarioV2 {
  id: string;
  nome?: string;
  personagem?: string;
  paleta?: string;
  moldura: MolduraV2;
  rodadas: RodadaV2[];
  objetos: Record<string, ObjetoV2>;
}

export interface ModosComp {
  desfecho?: "convergente" | "aberto";
  [k: string]: unknown;
}

/**
 * Estado da sessão de composição. Os campos do contrato público são os primeiros;
 * `cenario`/`modos` viajam junto para manter as funções puras (leem daqui, não de
 * estado global). O app espelha os campos leves em `state.comp` para renderizar.
 */
export interface EstadoComp {
  cenarioId: string;
  rodada: number; // 1..N (N = cenario.rodadas.length, tipicamente 4)
  banco: string[]; // ids disponíveis p/ escolher nesta rodada (novas + sobras)
  linha: string[]; // ids colocados, EM ORDEM
  pontasTravadas: boolean;
  historiaTexto: string;
  convergiu: boolean; // true quando a última rodada já foi lida
  cenario: CenarioV2; // grafo do cenário (interno)
  modos: ModosComp; // desfecho convergente|aberto (interno)
}

// ─── PRNG semeado (contrato §3 — replay determinístico) ─────────────────────
/** Hash FNV-1a 32 bits — puro, minúsculo, zero dependências. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32 — puro, minúsculo, zero dependências. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

// ─── Helpers internos ───────────────────────────────────────────────────────
function nivelKey(nivel: unknown): NivelKey {
  const s = String(nivel ?? "").trim().toLowerCase();
  if (s === "n1" || s === "n2" || s === "n3" || s === "n4") return s as NivelKey;
  const d = s.replace(/[^0-9]/g, "");
  if (d === "1" || d === "2" || d === "3" || d === "4") return ("n" + d) as NivelKey;
  return "n2";
}

/** Normalização v2→v3 no ponto de leitura: string ≡ array de 1; ausente ≡ []. */
function variantes(t: string | string[] | undefined): string[] {
  if (t === undefined || t === null) return [];
  return Array.isArray(t) ? t : [t];
}

/**
 * Sorteia uma variante do pool. REGRA DE CONSUMO (parte do contrato de replay):
 * só consome rng quando o pool tem MAIS DE UM item. Consequência deliberada:
 * um grafo v2 (tudo string, sem conectivos) consome ZERO rng — a equivalência
 * com o texto do leitor v2 (fixtures golden) vale por construção.
 */
function escolherVariante(t: string | string[] | undefined, rng: Rng): string {
  const pool = variantes(t);
  if (pool.length === 0) return "";
  if (pool.length === 1) return pool[0];
  return pool[Math.floor(rng() * pool.length)];
}

function totalRodadas(cenario: CenarioV2): number {
  return (cenario.rodadas && cenario.rodadas.length) || 0;
}

/** União (em ordem de revelação) dos objetos revelados nas rodadas 1..rodada. */
function reveladosAte(cenario: CenarioV2, rodada: number): string[] {
  const out: string[] = [];
  for (const r of cenario.rodadas) {
    if (r.n <= rodada) {
      for (const id of r.revela) if (out.indexOf(id) === -1) out.push(id);
    }
  }
  return out;
}

function estaNaUltimaRodada(estado: EstadoComp): boolean {
  return estado.rodada >= totalRodadas(estado.cenario);
}

// ─── Gramática de condições (contrato §1.2) ─────────────────────────────────
/**
 * Avalia UMA condição da gramática v3 para o objeto `objId` dentro de `linha`.
 * Nunca lança: condição desconhecida (e o namespace RESERVADO `func:*`) → false.
 *   tem:X       → X está na linha (preserva a guarda v2: X !== objId)
 *   nao_tem:X   → X NÃO está na linha
 *   pos:inicio  → o PRÓPRIO objId é o primeiro da linha
 *   pos:fim     → o PRÓPRIO objId é o último da linha
 *   pos:miolo   → o PRÓPRIO objId está no interior (nem primeiro nem último)
 *   antes_de:X  → objId vem antes de X (só casa se X está na linha)
 *   depois_de:X → objId vem depois de X (só casa se X está na linha)
 *   func:*      → RESERVADO para funções dramáticas futuras: aceito, nunca casa
 * Compat consciente: o runtime v2 só avaliava `tem:` (ignorava `nao_tem:`);
 * docs/quintal.v2.json não usa `nao_tem:` — as fixtures golden permanecem válidas.
 */
function avaliarCondicao(cond: CondicaoV3, objId: string, linha: string[]): boolean {
  const c = String(cond || "");
  const i = linha.indexOf(objId);
  if (c.indexOf("tem:") === 0) {
    const alvo = c.slice(4);
    return alvo !== objId && linha.indexOf(alvo) !== -1;
  }
  if (c.indexOf("nao_tem:") === 0) {
    return linha.indexOf(c.slice(8)) === -1;
  }
  if (c === "pos:inicio") return i === 0 && linha.length > 0;
  if (c === "pos:fim") return i !== -1 && i === linha.length - 1;
  if (c === "pos:miolo") return i > 0 && i < linha.length - 1;
  if (c.indexOf("antes_de:") === 0) {
    const j = linha.indexOf(c.slice(9));
    return i !== -1 && j !== -1 && i < j;
  }
  if (c.indexOf("depois_de:") === 0) {
    const j = linha.indexOf(c.slice(10));
    return i !== -1 && j !== -1 && i > j;
  }
  // func:* (reservado) e qualquer condição desconhecida: nunca casam, nunca lançam.
  return false;
}

/** `se` string ou array (AND): todas as condições precisam casar. */
function casaSe(se: CondicaoV3 | CondicaoV3[], objId: string, linha: string[]): boolean {
  const conds = Array.isArray(se) ? se : [se];
  if (conds.length === 0) return false;
  for (const c of conds) if (!avaliarCondicao(c, objId, linha)) return false;
  return true;
}

/**
 * Conta do objeto no nível pedido, aplicando o PRIMEIRO tempero satisfeito pela
 * linha (ordem do array; mais específico primeiro, por convenção autoral).
 * Tempero que casa mas não tem texto no nível → segue para o próximo (regra v2).
 */
function contaComTempera(
  cenario: CenarioV2,
  objId: string,
  linha: string[],
  nivel: NivelKey,
  rng: Rng
): string {
  const obj = cenario.objetos[objId];
  if (!obj) return "";
  for (const t of obj.tempera || []) {
    if (casaSe(t.se, objId, linha)) {
      const txt = escolherVariante(t.entao && t.entao[nivel], rng);
      if (txt) return txt;
    }
  }
  return escolherVariante(obj.conta[nivel], rng);
}

/**
 * Conectivo do slot de miolo: sorteio semeado no pool do nível, SEM repetição
 * consecutiva (se sortear o mesmo do slot anterior, avança circular para o
 * próximo). Pool de 1 item não consome rng (mesma regra de escolherVariante).
 */
function escolherConectivo(pool: string[], rng: Rng, anterior: string): string {
  if (pool.length === 0) return "";
  let idx = pool.length === 1 ? 0 : Math.floor(rng() * pool.length);
  if (pool.length > 1 && pool[idx] === anterior) idx = (idx + 1) % pool.length;
  return pool[idx];
}

/**
 * Fragmento de desfecho (contrato §1.3): convergente por padrão; no modo aberto,
 * ECOS — fragmentos cujas condições declaradas TODAS casam (`se_terminou_com` →
 * último da linha; `se_comecou_com` → primeiro; ambos = composto), concatenados
 * na ordem do array até `max_ecos` (default 1). Nenhum eco casa → convergente
 * (comportamento v2 preservado). Fragmento sem NENHUMA condição declarada é
 * defensivamente ignorado (não vira eco universal por verdade vazia).
 */
function textoDesfecho(estado: EstadoComp, nivel: NivelKey, rng: Rng): string {
  const d = estado.cenario.moldura.desfecho;
  if (estado.modos && estado.modos.desfecho === "aberto" && d.aberto && d.aberto.length) {
    const primeiro = estado.linha[0];
    const ultimo = estado.linha[estado.linha.length - 1];
    const teto = typeof d.max_ecos === "number" && d.max_ecos > 0 ? d.max_ecos : 1;
    const partes: string[] = [];
    for (const a of d.aberto) {
      if (partes.length >= teto) break;
      const temCondicao = a.se_terminou_com !== undefined || a.se_comecou_com !== undefined;
      if (!temCondicao) continue;
      if (a.se_terminou_com !== undefined && a.se_terminou_com !== ultimo) continue;
      if (a.se_comecou_com !== undefined && a.se_comecou_com !== primeiro) continue;
      const txt = escolherVariante(a.fragmento && a.fragmento[nivel], rng);
      if (txt) partes.push(txt);
    }
    if (partes.length) return partes.join(" ");
  }
  return escolherVariante(d.convergente[nivel], rng);
}

// ─── API do contrato (consumida pelo app via PipocaCanonico.composicao) ──────

/** Rodada 1: banco = revela da R1, linha vazia, pontas destravadas. */
export function iniciar(cenario: CenarioV2, modos?: ModosComp): EstadoComp {
  const estado: EstadoComp = {
    cenarioId: cenario.id,
    rodada: 1,
    banco: [],
    linha: [],
    pontasTravadas: false,
    historiaTexto: "",
    convergiu: false,
    cenario,
    modos: modos || {},
  };
  estado.banco = bancoDaRodada(estado);
  return estado;
}

/** Objetos disponíveis para escolher na rodada atual: revelados até agora − já na linha. */
export function bancoDaRodada(estado: EstadoComp): string[] {
  const revelados = reveladosAte(estado.cenario, estado.rodada);
  return revelados.filter((id) => estado.linha.indexOf(id) === -1);
}

/**
 * R>=2: só é possível inserir no MIOLO (0 < slot < len), com o objeto ainda no banco.
 * Nunca bloqueia por tempero — só por posição/âncoras.
 */
export function podeInserir(estado: EstadoComp, objetoId: string, slotIndex: number): boolean {
  if (estado.rodada < 2) return false;
  if (estado.banco.indexOf(objetoId) === -1) return false;
  if (estado.linha.indexOf(objetoId) !== -1) return false;
  return slotIndex > 0 && slotIndex < estado.linha.length;
}

/** Insere 1 objeto no miolo. Se a posição for inválida, devolve o estado inalterado. */
export function inserir(estado: EstadoComp, objetoId: string, slotIndex: number): EstadoComp {
  if (!podeInserir(estado, objetoId, slotIndex)) return estado;
  const linha = estado.linha.slice();
  linha.splice(slotIndex, 0, objetoId);
  const novo: EstadoComp = { ...estado, linha };
  novo.banco = bancoDaRodada(novo);
  return novo;
}

/**
 * R1: coloca e ORDENA os 3 escolhidos (na ordem recebida) e TRAVA as pontas.
 * Filtra para ids válidos do banco, sem duplicatas, no máximo `escolhe` (3).
 */
export function ordenarR1(estado: EstadoComp, ordemIds: string[]): EstadoComp {
  const rodada1 = estado.cenario.rodadas.find((r) => r.n === 1);
  const limite = (rodada1 && rodada1.escolhe) || 3;
  const banco = bancoDaRodada({ ...estado, linha: [] });
  const linha: string[] = [];
  for (const id of ordemIds || []) {
    if (banco.indexOf(id) !== -1 && linha.indexOf(id) === -1 && linha.length < limite) {
      linha.push(id);
    }
  }
  const novo: EstadoComp = { ...estado, linha, pontasTravadas: true };
  novo.banco = bancoDaRodada(novo);
  return novo;
}

/**
 * Tece a história para ler no portão: abertura + contas (na ordem da linha, com tempero
 * e conectivos de miolo) + desfecho (só quando é a última rodada). O texto CRESCE a cada
 * rodada.
 *
 * ORDEM DE CONSUMO DO RNG (FIXA — parte do contrato de replay, §3):
 *   1. variante da abertura;
 *   2. para cada slot da linha, em ordem: (a) variante da célula resolvida;
 *      (b) SE o slot é miolo E há pool de conectivos no nível: escolha do conectivo;
 *   3. desfecho: variante do convergente, OU variante de cada eco selecionado.
 * Garantias: replay perfeito (mesma linha+nível ⇒ mesmo texto); arranjo diferente ⇒
 * variantes/conectivos diferentes; preview T4 ≡ commit T5 por construção.
 */
export function montar(estado: EstadoComp, nivel: unknown): string {
  const nk = nivelKey(nivel);
  const cenario = estado.cenario;
  const rng = mulberry32(fnv1a(cenario.id + "|" + estado.linha.join(",") + "|" + nk));
  const partes: string[] = [];
  const abertura = escolherVariante(cenario.moldura.abertura[nk], rng);
  if (abertura) partes.push(abertura);
  const pool = (cenario.moldura.conectivos && cenario.moldura.conectivos[nk]) || [];
  let conectivoAnterior = "";
  for (let i = 0; i < estado.linha.length; i++) {
    const id = estado.linha[i];
    let conta = contaComTempera(cenario, id, estado.linha, nk, rng);
    const ehMiolo = i > 0 && i < estado.linha.length - 1;
    if (conta && ehMiolo && pool.length) {
      const con = escolherConectivo(pool, rng, conectivoAnterior);
      conectivoAnterior = con;
      if (con) conta = con + " " + conta;
    }
    if (conta) partes.push(conta);
  }
  if (estaNaUltimaRodada(estado)) {
    const fim = textoDesfecho(estado, nk, rng);
    if (fim) partes.push(fim);
  }
  return partes.join(" ");
}

/**
 * Chamada após uma leitura bem-sucedida no portão. Se ainda há rodadas, avança e
 * atualiza o banco (revela +1). Se a última rodada acabou de ser lida, marca convergiu.
 */
export function abrirProximaRodada(estado: EstadoComp): EstadoComp {
  if (estado.rodada >= totalRodadas(estado.cenario)) {
    return { ...estado, convergiu: true };
  }
  const rodada = estado.rodada + 1;
  const novo: EstadoComp = { ...estado, rodada, historiaTexto: "" };
  novo.banco = bancoDaRodada(novo);
  return novo;
}

/** true quando a rodada final já foi lida (história convergiu → Pote). */
export function convergiu(estado: EstadoComp): boolean {
  return !!estado.convergiu;
}
