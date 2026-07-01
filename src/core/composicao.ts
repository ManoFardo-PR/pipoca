/**
 * Pipoca — Motor de COMPOSIÇÃO AUTORAL v2 (linha verde) · esquema pipoca.grafo-autoral.v2
 * -------------------------------------------------------------------------------------
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
 *   • Tempero é SABOR, nunca PORTÃO: `tem:X` enriquece a frase quando X coexiste na linha;
 *     jamais bloqueia uma escolha.
 *   • Portão perdoador: leitura imperfeita → dica calorosa (fora deste motor); sem punição.
 *
 * Funções PURAS: nenhum estado de módulo. O grafo do cenário viaja dentro do EstadoComp
 * (`cenario`) para que toda função leia o que precisa a partir do próprio estado.
 */

// ─── Tipos do grafo v2 (docs/quintal.v2.json) ───────────────────────────────
export type NivelKey = "n1" | "n2" | "n3" | "n4";
type Texto = Record<string, string>;

export interface TemperaV2 {
  se: string; // ex.: "tem:frasco"
  entao: Texto;
}
export interface ObjetoV2 {
  emoji?: string;
  nome?: string;
  papel_no_fim?: string;
  registro?: string;
  conta: Texto;
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
  se_terminou_com: string;
  fragmento: Texto;
}
export interface MolduraV2 {
  abertura: Texto;
  desfecho: { convergente: Texto; aberto?: DesfechoAbertoV2[] };
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

// ─── Helpers internos ───────────────────────────────────────────────────────
function nivelKey(nivel: unknown): NivelKey {
  const s = String(nivel ?? "").trim().toLowerCase();
  if (s === "n1" || s === "n2" || s === "n3" || s === "n4") return s as NivelKey;
  const d = s.replace(/[^0-9]/g, "");
  if (d === "1" || d === "2" || d === "3" || d === "4") return ("n" + d) as NivelKey;
  return "n2";
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

/** Conta do objeto no nível pedido, aplicando o primeiro tempero satisfeito pela linha. */
function contaComTempera(
  cenario: CenarioV2,
  objId: string,
  linha: string[],
  nivel: NivelKey
): string {
  const obj = cenario.objetos[objId];
  if (!obj) return "";
  const temperas = obj.tempera || [];
  for (const t of temperas) {
    const cond = String(t.se || "");
    if (cond.indexOf("tem:") === 0) {
      const alvo = cond.slice(4);
      if (alvo !== objId && linha.indexOf(alvo) !== -1) {
        const txt = t.entao && t.entao[nivel];
        if (txt) return txt;
      }
    }
  }
  return obj.conta[nivel] || "";
}

/** Fragmento de desfecho: convergente por padrão; aberto casa com o último objeto da linha. */
function textoDesfecho(estado: EstadoComp, nivel: NivelKey): string {
  const d = estado.cenario.moldura.desfecho;
  if (estado.modos && estado.modos.desfecho === "aberto" && d.aberto && d.aberto.length) {
    const ultimo = estado.linha[estado.linha.length - 1];
    const match = d.aberto.find((a) => a.se_terminou_com === ultimo);
    if (match && match.fragmento[nivel]) return match.fragmento[nivel];
  }
  return d.convergente[nivel] || "";
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
 * Tece a história para ler no portão: abertura + contas (na ordem da linha, com tempero)
 * + desfecho (só quando é a última rodada). O texto CRESCE a cada rodada.
 */
export function montar(estado: EstadoComp, nivel: unknown): string {
  const nk = nivelKey(nivel);
  const partes: string[] = [];
  const abertura = estado.cenario.moldura.abertura[nk];
  if (abertura) partes.push(abertura);
  for (const id of estado.linha) {
    const conta = contaComTempera(estado.cenario, id, estado.linha, nk);
    if (conta) partes.push(conta);
  }
  if (estaNaUltimaRodada(estado)) {
    const fim = textoDesfecho(estado, nk);
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
