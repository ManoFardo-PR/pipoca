/**
 * Pipoca — Histórias salvas (pós-fase06)
 * ----------------------------------------
 * Toda história CONCLUÍDA é guardada automaticamente por até 20 dias; a que
 * a criança favorita (coração) fica para sempre. O texto é CAPTURADO na
 * convergência (fonte fiel mesmo se a IA um dia tecer a linha verde); a
 * linha/nível/desfecho viajam junto para re-derivação futura.
 *
 * Este módulo é PURO (tipos, validação, retenção, título) — sem localStorage,
 * sem Date.now(): `agora` vem sempre da borda. A gravação concreta vive no
 * RepositorioLocalStorage (espelho Supabase pelo repo sincronizado).
 */

import type { Nivel, ModoDesfecho } from "./grafo/tipos.js";
import type { PacoteComposicao } from "./compositor/pacote.js";

export const ESQUEMA_HISTORIAS = "pipoca.historias.v1";

/** Retenção das histórias NÃO favoritas (dias). Favorita = para sempre. */
export const RETENCAO_HISTORIAS_DIAS = 20;

/** Teto de não-favoritas por criança (as mais antigas saem primeiro). */
export const MAX_NAO_FAVORITAS = 30;

/**
 * Teto PRÓPRIO das intermediárias não-favoritas (fase13-13-02, regra-semente:
 * "intermediárias contam separado e são podadas primeiro") — o teto das
 * completas nunca é consumido por intermediárias.
 */
export const MAX_INTERMEDIARIAS_NAO_FAVORITAS = 30;

const MS_POR_DIA = 86_400_000;
const NIVEIS = ["n1", "n2", "n3", "n4"];
const DESFECHOS = ["convergente", "aberto"];

/**
 * Origem do texto (fase12-12-04: sempre sinalizada; fase13-13-02: salva junto).
 * Shape espelhado de OrigemGeracao (src/core/geracao/geracao.ts) — cópia
 * estrutural deliberada para este módulo seguir PURO e sem dependência do
 * módulo de geração.
 */
export interface OrigemHistoria {
  fonte: "llm" | "fallback-a-mais";
  rota?: string;
  provedor?: string;
  modelo?: string;
  motivo?: string;
}

export interface HistoriaSalva {
  id: string;
  cenarioId: string;
  texto: string; // capturado na convergência (geração 2: texto realizado)
  linha: string[]; // ids dos objetos, em ordem
  nivel: Nivel;
  desfecho: ModoDesfecho;
  titulo: string;
  emoji: string;
  criadaEm: number; // epoch ms — PRESERVADO ao (des)favoritar
  favorita: boolean;
  // ─── Campos ADITIVOS OPCIONAIS no pipoca.historias.v1 (fase13-13-02) ───────
  // Registros v1 antigos (sem eles) seguem válidos SEM migração; leitores
  // antigos ignoram. `.v2` fica reservado para mudança que QUEBRE o shape.
  /** Qual caminho gerou o texto (LLM ou fallback A+ v3). */
  origem?: OrigemHistoria;
  /** O Pacote que gerou o texto — unidade de evidência (Pacote, texto); null = não houve. */
  pacoteOrigem?: PacoteComposicao | null;
  /** Rodada em que o texto foi lido (1..4). */
  rodada?: number;
  /** true = registro intermediário (um portão lido); ausente/false = história completa. */
  intermediaria?: boolean;
}

export interface EnvelopeHistoriaV1 {
  esquema: "pipoca.historias.v1";
  historia: HistoriaSalva;
}

/** Saneia a origem aditiva: shape mínimo válido passa; qualquer outro cai fora. */
function sanearOrigem(raw: unknown): OrigemHistoria | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (r["fonte"] !== "llm" && r["fonte"] !== "fallback-a-mais") return undefined;
  const origem: OrigemHistoria = { fonte: r["fonte"] };
  for (const campo of ["rota", "provedor", "modelo", "motivo"] as const) {
    if (typeof r[campo] === "string") origem[campo] = r[campo] as string;
  }
  return origem;
}

/** Saneia o Pacote de origem: só o objeto com o esquema v1 passa (senão cai fora). */
function sanearPacoteOrigem(raw: unknown): PacoteComposicao | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (r["esquema"] !== "pipoca.pacote-composicao.v1") return undefined;
  return raw as PacoteComposicao;
}

/**
 * Valida uma HistoriaSalva crua. REJEITADOR por item (corrompido é descartado
 * em silêncio, como validarEvento) — exceto `favorita`, saneada para boolean,
 * e os campos ADITIVOS do fase13-13-02 (origem/pacoteOrigem/rodada/
 * intermediaria), saneados: malformados caem fora SEM derrubar o registro
 * (retrocompatibilidade por design). Devolve a história normalizada ou null.
 */
export function validarHistoriaSalva(raw: unknown): HistoriaSalva | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["id"] !== "string" || r["id"].trim() === "") return null;
  if (typeof r["cenarioId"] !== "string" || r["cenarioId"] === "") return null;
  if (typeof r["texto"] !== "string" || r["texto"].trim() === "") return null;
  if (!Array.isArray(r["linha"]) || !r["linha"].every((x) => typeof x === "string")) return null;
  if (!NIVEIS.includes(r["nivel"] as string)) return null;
  if (!DESFECHOS.includes(r["desfecho"] as string)) return null;
  if (typeof r["titulo"] !== "string" || r["titulo"] === "") return null;
  if (typeof r["criadaEm"] !== "number" || !Number.isFinite(r["criadaEm"])) return null;
  const origem = sanearOrigem(r["origem"]);
  const pacoteOrigem = sanearPacoteOrigem(r["pacoteOrigem"]);
  const rodada =
    typeof r["rodada"] === "number" && Number.isInteger(r["rodada"]) && r["rodada"] >= 1 && r["rodada"] <= 4
      ? (r["rodada"] as number)
      : undefined;
  return {
    id: r["id"] as string,
    cenarioId: r["cenarioId"] as string,
    texto: r["texto"] as string,
    linha: (r["linha"] as string[]).slice(),
    nivel: r["nivel"] as Nivel,
    desfecho: r["desfecho"] as ModoDesfecho,
    titulo: r["titulo"] as string,
    emoji: typeof r["emoji"] === "string" && r["emoji"] !== "" ? (r["emoji"] as string) : "✨",
    criadaEm: r["criadaEm"] as number,
    favorita: r["favorita"] === true, // saneada, nunca rejeita
    ...(origem ? { origem } : {}),
    ...(pacoteOrigem ? { pacoteOrigem } : {}),
    ...(rodada !== undefined ? { rodada } : {}),
    ...(r["intermediaria"] === true ? { intermediaria: true } : {}),
  };
}

/** Dentro da retenção? Favorita fica PARA SEMPRE. */
export function dentroDaRetencaoHistoria(
  h: HistoriaSalva,
  agora: number,
  retencaoDias: number = RETENCAO_HISTORIAS_DIAS
): boolean {
  if (h.favorita) return true;
  return h.criadaEm >= agora - retencaoDias * MS_POR_DIA;
}

/**
 * Normaliza uma lista crua de histórias: valida item a item (corrompido cai),
 * dedupe por id (a ÚLTIMA ocorrência vence — é a mais recente gravada),
 * poda por retenção (favoritas isentas), ordena por criadaEm desc e aplica o
 * teto às NÃO favoritas (as mais novas ficam). Recalibração do fase13-13-02:
 * intermediárias contam SEPARADO (teto próprio) — nunca expulsam uma história
 * completa do teto dela. Pura.
 */
export function normalizarHistorias(lista: unknown[], agora: number): HistoriaSalva[] {
  const porId = new Map<string, HistoriaSalva>();
  for (const raw of Array.isArray(lista) ? lista : []) {
    const h = validarHistoriaSalva(raw);
    if (h) porId.set(h.id, h); // última vence
  }
  const vivas = [...porId.values()]
    .filter((h) => dentroDaRetencaoHistoria(h, agora))
    .sort((a, b) => b.criadaEm - a.criadaEm);
  const resultado: HistoriaSalva[] = [];
  let naoFavoritas = 0;
  let intermediarias = 0;
  for (const h of vivas) {
    if (!h.favorita) {
      if (h.intermediaria === true) {
        if (intermediarias >= MAX_INTERMEDIARIAS_NAO_FAVORITAS) continue;
        intermediarias++;
      } else {
        if (naoFavoritas >= MAX_NAO_FAVORITAS) continue; // teto: mais antigas caem
        naoFavoritas++;
      }
    }
    resultado.push(h);
  }
  return resultado;
}

/**
 * Título acolhedor derivado na captura (estável — nunca recalculado depois).
 * `ultimoObjeto` = { nome } do último objeto da linha (metadados do cenário).
 */
export function tituloDaHistoria(ultimoObjeto?: { nome?: string } | null): string {
  const nome = ultimoObjeto && ultimoObjeto.nome ? String(ultimoObjeto.nome).trim() : "";
  if (!nome) return "Minha história no Quintal";
  return "A história de " + nome;
}

/** Data relativa calorosa para os cartões ("hoje", "ontem", "há N dias"). */
export function dataRelativa(criadaEm: number, agora: number): string {
  const dias = Math.floor((agora - criadaEm) / MS_POR_DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return "há " + dias + " dias";
}

/** Envelope pronto para serializar. */
export function criarEnvelopeHistoria(historia: HistoriaSalva): EnvelopeHistoriaV1 {
  return { esquema: ESQUEMA_HISTORIAS, historia };
}
