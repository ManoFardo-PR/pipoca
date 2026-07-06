/**
 * Pipoca — Repositório sincronizado (local base + espelho remoto) · fase06-06-03
 * -------------------------------------------------------------------------------
 * "Remoto com fallback local": o localStorage continua sendo a BASE — sem
 * rede/sessão tudo funciona como sempre (fail-soft; a criança nunca vê erro).
 *
 *   leitura  → SEMPRE do local;
 *   escrita  → local com await + espelho remoto fire-and-forget (catch
 *              EXPLÍCITO: unhandled rejection viraria pageerror no e2e);
 *   apagar   → local + remoto; remoto falhando (offline) deixa TOMBSTONE
 *              em `pipoca.sync.apagados.v1`, drenado no próximo sync —
 *              sem isso o perfil apagado "ressuscitaria" na próxima puxada
 *              (requisito LGPD do doc 06-03).
 */

import type { Perfil } from "../../core/perfil.js";
import type { EstadoApp, EventoTelemetria } from "../../core/estado.js";
import type { HistoriaSalva } from "../../core/historias.js";
import type { RepositorioPersistencia } from "../../core/persistencia/index.js";

export const CHAVE_TOMBSTONES = "pipoca.sync.apagados.v1";

function storage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null {
  try {
    const g = globalThis as unknown as { localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
    return g.localStorage || null;
  } catch {
    return null;
  }
}

export function lerTombstones(): string[] {
  const st = storage();
  if (!st) return [];
  try {
    const raw = st.getItem(CHAVE_TOMBSTONES);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function gravarTombstones(ids: string[]): void {
  const st = storage();
  if (!st) return;
  try {
    if (ids.length) st.setItem(CHAVE_TOMBSTONES, JSON.stringify(ids));
    else st.removeItem(CHAVE_TOMBSTONES);
  } catch {
    /* degradação silenciosa */
  }
}

export function adicionarTombstone(id: string): void {
  const atuais = lerTombstones();
  if (atuais.indexOf(id) < 0) gravarTombstones([...atuais, id]);
}

export function removerTombstone(id: string): void {
  gravarTombstones(lerTombstones().filter((x) => x !== id));
}

export function criarRepositorioSincronizado(
  local: RepositorioPersistencia,
  remoto: RepositorioPersistencia
): RepositorioPersistencia {
  return {
    // leituras: o local é a fonte (o remoto entra pela sincronização inicial)
    carregarPerfis: () => local.carregarPerfis(),
    carregarSave: (perfilId: string) => local.carregarSave(perfilId),
    carregarTelemetria: (perfilId: string) => local.carregarTelemetria(perfilId),

    async salvarPerfil(p: Perfil): Promise<void> {
      await local.salvarPerfil(p);
      remoto.salvarPerfil(p).catch(() => {});
    },
    async salvarSave(perfilId: string, estado: EstadoApp): Promise<void> {
      await local.salvarSave(perfilId, estado);
      remoto.salvarSave(perfilId, estado).catch(() => {});
    },
    async registrarTelemetria(evento: EventoTelemetria): Promise<void> {
      await local.registrarTelemetria(evento);
      remoto.registrarTelemetria(evento).catch(() => {});
    },
    // Retenção de telemetria: sem este repasse, a borda (feature-detection em
    // estado.js) deixava de podar ATÉ o local quando o backend era o remoto.
    async podarTelemetria(perfilId: string, agora: number, retencaoDias?: number): Promise<number> {
      const removidos = local.podarTelemetria ? await local.podarTelemetria(perfilId, agora, retencaoDias) : 0;
      if (remoto.podarTelemetria) remoto.podarTelemetria(perfilId, agora, retencaoDias).catch(() => {});
      return removidos;
    },
    async apagarPerfil(perfilId: string): Promise<void> {
      await local.apagarPerfil(perfilId);
      adicionarTombstone(perfilId); // só sai da fila quando o remoto confirmar
      remoto
        .apagarPerfil(perfilId)
        .then(() => removerTombstone(perfilId))
        .catch(() => {});
    },

    // ─── Histórias salvas: local base + espelho fire-and-forget ─────────────
    // SEM tombstone por item: a poda remota é um DELETE por filtro idempotente
    // (re-executado a cada borda); apagar tudo já tem o tombstone de perfil.
    carregarHistorias: (perfilId: string) =>
      local.carregarHistorias ? local.carregarHistorias(perfilId) : Promise.resolve([]),
    async salvarHistoria(perfilId: string, historia: HistoriaSalva): Promise<void> {
      if (local.salvarHistoria) await local.salvarHistoria(perfilId, historia);
      if (remoto.salvarHistoria) remoto.salvarHistoria(perfilId, historia).catch(() => {});
    },
    async apagarHistoria(perfilId: string, historiaId: string): Promise<void> {
      if (local.apagarHistoria) await local.apagarHistoria(perfilId, historiaId);
      if (remoto.apagarHistoria) remoto.apagarHistoria(perfilId, historiaId).catch(() => {});
    },
    async podarHistorias(perfilId: string, agora: number): Promise<number> {
      const removidas = local.podarHistorias ? await local.podarHistorias(perfilId, agora) : 0;
      if (remoto.podarHistorias) remoto.podarHistorias(perfilId, agora).catch(() => {});
      return removidas;
    },
  };
}
