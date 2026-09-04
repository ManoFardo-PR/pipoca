/**
 * [repo_sincronizado.ts] — Repositório "remoto com fallback local": leitura
 *   sempre do local, escrita local+espelho remoto fire-and-forget, apagar com
 *   tombstone.
 *
 * PAPEL: backend (adaptador composto local+remoto)
 * POR QUE EXISTE: fazer o remoto espelhar o local sem nunca quebrar o offline —
 *   o localStorage segue sendo a BASE (a criança nunca vê erro).
 * ENTRA: dois RepositorioPersistencia (local = base, remoto = espelho); também
 *   expõe lerTombstones/removerTombstone/adicionarTombstone (chave
 *   pipoca.sync.apagados.v1).
 * SAI: RepositorioPersistencia composto; tombstones persistidos.
 * CHAMA: core/perfil, core/estado, core/historias, core/persistencia (tipos).
 * É CHAMADO POR: backend.ts (criarRepositorioSincronizado), sync.ts (tombstones),
 *   backend.test.ts.
 * RODA POR: boot do app (bundle); cliente das Edge Functions.
 * CUIDADO: leitura SEMPRE do local; escrita = local await + remoto
 *   fire-and-forget com catch EXPLÍCITO (unhandled rejection viraria pageerror
 *   no e2e). apagar deixa TOMBSTONE se o remoto falhar (offline), drenado no
 *   próximo sync — senão o perfil ressuscitaria na próxima puxada (LGPD, 06-03).
 *   Histórias SEM tombstone por item (a poda remota é DELETE por filtro
 *   idempotente).
 *
 * — detalhe preservado —
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
import { mesclarHistorias, normalizarHistorias } from "../../core/historias.js";
import { criarEvento } from "../../core/telemetria.js";
import type { RepositorioPersistencia } from "../../core/persistencia/index.js";
import { enfileirarRemoto, type OpFilaRemota } from "./fila_remota.js";

// ─── D1 · notificação da mescla de histórias ─────────────────────────────────
// O app (estado.js) registra aqui um callback; quando uma leitura reativa traz
// história nova/atualizada do remoto, o repo grava no LOCAL (sem eco ao remoto)
// e avisa — a T3 já recarrega no App.subscribe.
let _aoMesclarHistorias: ((perfilId: string) => void) | null = null;
export function aoMesclarHistorias(fn: ((perfilId: string) => void) | null): void {
  _aoMesclarHistorias = fn;
}

/** Um registro diverge do outro? (carimbo, favorita ou texto — o que a mescla decide.) */
function historiaDiverge(a: HistoriaSalva | undefined, b: HistoriaSalva): boolean {
  if (!a) return true;
  return (
    (a.atualizadoEm || 0) !== (b.atualizadoEm || 0) ||
    a.favorita !== b.favorita ||
    a.texto !== b.texto
  );
}

/**
 * Aplica no LOCAL a mescla local×remoto (D1/D-07): grava só o que entrou ou
 * mudou — SEM eco ao remoto (evita loop de upsert). Devolve quantos gravou.
 * Usada pela leitura reativa (abaixo) e pelo sincronizarInicial (sync.ts).
 */
export async function aplicarMesclaHistorias(
  local: RepositorioPersistencia,
  perfilId: string,
  locais: HistoriaSalva[],
  remotas: HistoriaSalva[],
  agora: number
): Promise<number> {
  if (!local.salvarHistoria || !remotas.length) return 0;
  const mescla = normalizarHistorias(mesclarHistorias(locais, remotas), agora);
  const antes = new Map(locais.map((h) => [h.id, h]));
  let gravadas = 0;
  for (const h of mescla) {
    if (!historiaDiverge(antes.get(h.id), h)) continue;
    await local.salvarHistoria(perfilId, h); // passa pela poda preventiva de quota
    gravadas++;
  }
  return gravadas;
}

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

// D2 (D-06): classifica a falha remota — só a transitória merece retry curto.
function ehTransitorio(e: unknown): boolean {
  const m = String((e as Error | undefined)?.message ?? e ?? "");
  const http = /HTTP (\d{3})/.exec(m);
  if (http) {
    const s = Number(http[1]);
    return s >= 500 || s === 429 || s === 408;
  }
  if (/sem sessão/i.test(m)) return false; // deslogado: repetir agora não resolve
  return true; // rede caída/timeout/desconhecido
}

let _avisouLeituraRemota = false;
function _avisarLeituraUmaVez(e: unknown): void {
  if (_avisouLeituraRemota) return;
  _avisouLeituraRemota = true;
  console.info(
    "[pipoca.sync] leitura remota de histórias indisponível (offline/sem sessão) — seguimos no local",
    String((e as Error | undefined)?.message ?? e ?? "")
  );
}

export function criarRepositorioSincronizado(
  local: RepositorioPersistencia,
  remoto: RepositorioPersistencia,
  opcoes?: { atrasosRetryMs?: number[] }
): RepositorioPersistencia {
  const atrasos = (opcoes && opcoes.atrasosRetryMs) || [1000, 4000];
  const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function tentarRemoto(exec: () => Promise<unknown>): Promise<void> {
    let ultimo: unknown;
    for (let i = 0; i <= atrasos.length; i++) {
      try {
        await exec();
        return;
      } catch (e) {
        ultimo = e;
        if (!ehTransitorio(e) || i === atrasos.length) break;
        await dormir(atrasos[i]!);
      }
    }
    throw ultimo;
  }

  // D2 (D-06): fim do catch vazio — retry curto (transitório), depois warn
  // ESTRUTURADO + item na fila persistente (drenada no sincronizarInicial) +
  // rastro de telemetria LOCAL (espelho_falhou fica fora do painel da T8).
  function espelhar(op: OpFilaRemota, perfilId: string, id: string, payload: unknown, exec: () => Promise<unknown>): void {
    tentarRemoto(exec).catch((e: unknown) => {
      const erro = String((e as Error | undefined)?.message ?? e ?? "");
      console.warn("[pipoca.sync] espelho remoto falhou — item na fila", { op, perfilId, id, erro });
      try {
        enfileirarRemoto({ op, perfilId, id, payload, ultimoErro: erro });
      } catch {
        /* storage indisponível — o warn acima é o rastro que sobra */
      }
      try {
        local.registrarTelemetria(criarEvento("espelho_falhou", perfilId, { op, erro }, Date.now()))
          .catch((e2: unknown) =>
            console.warn("[pipoca.sync] rastro local da falha não gravou (o warn acima fica)",
              String((e2 as Error | undefined)?.message ?? e2 ?? "")));
      } catch {
        /* rastro é best-effort; nunca derruba a escrita local já feita */
      }
    });
  }

  return {
    // leituras: o local é a fonte (o remoto entra pela sincronização inicial)
    carregarPerfis: () => local.carregarPerfis(),
    carregarSave: (perfilId: string) => local.carregarSave(perfilId),
    carregarTelemetria: (perfilId: string) => local.carregarTelemetria(perfilId),

    async salvarPerfil(p: Perfil): Promise<void> {
      await local.salvarPerfil(p);
      espelhar("salvarPerfil", p.id, p.id, p, () => remoto.salvarPerfil(p));
    },
    async salvarSave(perfilId: string, estado: EstadoApp): Promise<void> {
      await local.salvarSave(perfilId, estado);
      espelhar("salvarSave", perfilId, perfilId, estado, () => remoto.salvarSave(perfilId, estado));
    },
    async registrarTelemetria(evento: EventoTelemetria): Promise<void> {
      await local.registrarTelemetria(evento);
      espelhar("registrarTelemetria", evento.perfilId, evento.tipo + ":" + evento.ts, evento,
        () => remoto.registrarTelemetria(evento));
    },
    // Retenção de telemetria: sem este repasse, a borda (feature-detection em
    // estado.js) deixava de podar ATÉ o local quando o backend era o remoto.
    async podarTelemetria(perfilId: string, agora: number, retencaoDias?: number): Promise<number> {
      const removidos = local.podarTelemetria ? await local.podarTelemetria(perfilId, agora, retencaoDias) : 0;
      if (remoto.podarTelemetria) {
        // D2: poda é idempotente e refeita a cada borda — warn basta, sem fila.
        remoto.podarTelemetria(perfilId, agora, retencaoDias).catch((e: unknown) =>
          console.warn("[pipoca.sync] poda remota de telemetria falhou (refeita na próxima borda)",
            { perfilId, erro: String((e as Error | undefined)?.message ?? e ?? "") }));
      }
      return removidos;
    },
    async apagarPerfil(perfilId: string): Promise<void> {
      await local.apagarPerfil(perfilId);
      adicionarTombstone(perfilId); // só sai da fila quando o remoto confirmar
      remoto
        .apagarPerfil(perfilId)
        .then(() => removerTombstone(perfilId))
        // D2: o TOMBSTONE é a fila deste caso (LGPD) — warn documenta a espera.
        .catch((e: unknown) =>
          console.warn("[pipoca.sync] apagar remoto falhou — tombstone fica na fila",
            { perfilId, erro: String((e as Error | undefined)?.message ?? e ?? "") }));
    },

    // ─── Histórias salvas: local base + espelho fire-and-forget ─────────────
    // SEM tombstone por item: a poda remota é um DELETE por filtro idempotente
    // (re-executado a cada borda); apagar tudo já tem o tombstone de perfil.
    // D1 (ML-1 sync/D-07): leitura REATIVA — devolve o local JÁ (offline nunca
    // espera a rede) e, em paralelo, busca o remoto; chegando história nova ou
    // mais recente (desempate por atualizadoEm), grava no local sem eco e avisa.
    carregarHistorias(perfilId: string): Promise<HistoriaSalva[]> {
      const locais = local.carregarHistorias ? local.carregarHistorias(perfilId) : Promise.resolve([]);
      if (remoto.carregarHistorias) {
        Promise.all([locais, remoto.carregarHistorias(perfilId)])
          .then(([l, r]) => aplicarMesclaHistorias(local, perfilId, l, r, Date.now()))
          .then((gravadas) => {
            if (gravadas > 0 && _aoMesclarHistorias) _aoMesclarHistorias(perfilId);
          })
          .catch(_avisarLeituraUmaVez); // offline/sem sessão: o local já respondeu (aviso 1× por sessão)
      }
      return locais;
    },
    async salvarHistoria(perfilId: string, historia: HistoriaSalva): Promise<void> {
      if (local.salvarHistoria) await local.salvarHistoria(perfilId, historia);
      if (remoto.salvarHistoria) {
        espelhar("salvarHistoria", perfilId, historia.id, historia, () => remoto.salvarHistoria!(perfilId, historia));
      }
    },
    async apagarHistoria(perfilId: string, historiaId: string): Promise<void> {
      if (local.apagarHistoria) await local.apagarHistoria(perfilId, historiaId);
      if (remoto.apagarHistoria) {
        espelhar("apagarHistoria", perfilId, historiaId, null, () => remoto.apagarHistoria!(perfilId, historiaId));
      }
    },
    async podarHistorias(perfilId: string, agora: number): Promise<number> {
      const removidas = local.podarHistorias ? await local.podarHistorias(perfilId, agora) : 0;
      if (remoto.podarHistorias) {
        // D2: poda por filtro é idempotente (refeita a cada borda) — warn basta.
        remoto.podarHistorias(perfilId, agora).catch((e: unknown) =>
          console.warn("[pipoca.sync] poda remota de histórias falhou (refeita na próxima borda)",
            { perfilId, erro: String((e as Error | undefined)?.message ?? e ?? "") }));
      }
      return removidas;
    },
  };
}
