/**
 * [fila_remota.ts] — Fila persistente das escritas remotas que falharam (D2 ·
 *   D-06): quando o espelho falha mesmo após o retry, o item espera aqui
 *   (localStorage) e é drenado no próximo sincronizarInicial (boot/login).
 *
 * PAPEL: backend (fila de reenvio do espelho remoto)
 * POR QUE EXISTE: "catch vazio" tornava a perda invisível — a fila é o RASTRO
 *   durável (op, id, tentativas, último erro) e o caminho de recuperação.
 * ENTRA: itens de escrita (salvarPerfil/salvarSave/registrarTelemetria/
 *   salvarHistoria/apagarHistoria) com payload; um RepositorioPersistencia
 *   remoto na drenagem.
 * SAI: fila em `pipoca.fila-remota.v1`; drenarFilaRemota → {drenados, restantes}.
 * CHAMA: core/persistencia/chaves (gravarItem, quota-safe).
 * É CHAMADO POR: repo_sincronizado.ts (enfileirar após falha), sync.ts
 *   (drenagem no sincronizarInicial), backend.test.ts.
 * CUIDADO: teto de 50 itens (mais antigo cai) e teto de tentativas por item —
 *   a fila nunca cresce sem limite nem disputa a quota com saves/histórias.
 *   Dedupe por op+perfilId+id: a ÚLTIMA versão vence (não reenvia estado velho
 *   por cima do que o D1 já mesclou).
 */

import { gravarItem } from "../../core/persistencia/chaves.js";
import type { RepositorioPersistencia } from "../../core/persistencia/index.js";
import type { Perfil } from "../../core/perfil.js";
import type { EstadoApp, EventoTelemetria } from "../../core/estado.js";
import type { HistoriaSalva } from "../../core/historias.js";

export const CHAVE_FILA_REMOTA = "pipoca.fila-remota.v1";
export const TETO_FILA_REMOTA = 50;
/** Depois disto, o item sai da fila com aviso (um 4xx eterno não vive para sempre). */
export const MAX_TENTATIVAS_ITEM = 10;

export type OpFilaRemota =
  | "salvarPerfil"
  | "salvarSave"
  | "registrarTelemetria"
  | "salvarHistoria"
  | "apagarHistoria";

export interface ItemFilaRemota {
  op: OpFilaRemota;
  perfilId: string;
  /** Chave de dedupe dentro da op (id da história/perfil, ts do evento…). */
  id: string;
  payload: unknown;
  tentativas: number;
  ultimoErro: string;
  quando: number; // epoch ms do enfileiramento
}

const OPS: OpFilaRemota[] = ["salvarPerfil", "salvarSave", "registrarTelemetria", "salvarHistoria", "apagarHistoria"];

function storage(): { getItem(k: string): string | null } | null {
  try {
    const g = globalThis as unknown as { localStorage?: { getItem(k: string): string | null } };
    return g.localStorage || null;
  } catch {
    return null;
  }
}

export function lerFilaRemota(): ItemFilaRemota[] {
  const st = storage();
  if (!st) return [];
  try {
    const raw = st.getItem(CHAVE_FILA_REMOTA);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ItemFilaRemota => {
      const r = x as Record<string, unknown>;
      return (
        typeof x === "object" && x !== null &&
        OPS.includes(r["op"] as OpFilaRemota) &&
        typeof r["perfilId"] === "string" &&
        typeof r["id"] === "string" &&
        typeof r["tentativas"] === "number"
      );
    });
  } catch {
    return [];
  }
}

function gravarFila(itens: ItemFilaRemota[]): void {
  // gravarItem é quota-safe (false em vez de lançar); estourou → tenta sem o
  // mais antigo (a fila nunca derruba a escrita local que a originou).
  if (!gravarItem(CHAVE_FILA_REMOTA, itens) && itens.length > 1) {
    gravarItem(CHAVE_FILA_REMOTA, itens.slice(1));
  }
}

/** Enfileira (ou substitui — dedupe por op+perfilId+id) uma escrita que falhou. */
export function enfileirarRemoto(
  item: Omit<ItemFilaRemota, "tentativas" | "quando"> & { quando?: number }
): void {
  const chave = item.op + "|" + item.perfilId + "|" + item.id;
  const fila = lerFilaRemota().filter((x) => x.op + "|" + x.perfilId + "|" + x.id !== chave);
  fila.push({ ...item, tentativas: 0, quando: item.quando ?? Date.now() });
  gravarFila(fila.slice(-TETO_FILA_REMOTA)); // teto: os mais antigos caem
}

function executar(remoto: RepositorioPersistencia, item: ItemFilaRemota): Promise<unknown> {
  switch (item.op) {
    case "salvarPerfil":
      return remoto.salvarPerfil(item.payload as Perfil);
    case "salvarSave":
      return remoto.salvarSave(item.perfilId, item.payload as EstadoApp);
    case "registrarTelemetria":
      return remoto.registrarTelemetria(item.payload as EventoTelemetria);
    case "salvarHistoria":
      return remoto.salvarHistoria
        ? remoto.salvarHistoria(item.perfilId, item.payload as HistoriaSalva)
        : Promise.resolve();
    case "apagarHistoria":
      return remoto.apagarHistoria
        ? remoto.apagarHistoria(item.perfilId, item.id)
        : Promise.resolve();
  }
}

/**
 * Tenta reenviar cada item da fila ao remoto. Sucesso → sai da fila; falha →
 * tentativas++ (e sai com aviso ao passar do teto de tentativas). Sequencial
 * e best-effort: nunca lança.
 */
export async function drenarFilaRemota(
  remoto: RepositorioPersistencia
): Promise<{ drenados: number; restantes: number }> {
  const fila = lerFilaRemota();
  if (!fila.length) return { drenados: 0, restantes: 0 };
  const sobras: ItemFilaRemota[] = [];
  let drenados = 0;
  for (const item of fila) {
    try {
      await executar(remoto, item);
      drenados++;
    } catch (e) {
      const ultimoErro = String((e as Error)?.message || e);
      const tentativas = item.tentativas + 1;
      if (tentativas >= MAX_TENTATIVAS_ITEM) {
        console.warn("[pipoca.sync] item da fila remota DESCARTADO após " + tentativas + " tentativas", {
          op: item.op, perfilId: item.perfilId, id: item.id, ultimoErro,
        });
      } else {
        sobras.push({ ...item, tentativas, ultimoErro });
      }
    }
  }
  gravarFila(sobras);
  return { drenados, restantes: sobras.length };
}
