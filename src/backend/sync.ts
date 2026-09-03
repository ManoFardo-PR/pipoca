/**
 * [sync.ts] — Sincronização inicial local↔remoto no login/boot: drena
 *   tombstones, puxa os ids ausentes e empurra o local (união com preferência
 *   local).
 *
 * PAPEL: backend (sincronização de perfis)
 * POR QUE EXISTE: convergir dados entre aparelhos sem sobrescrever a edição
 *   local; os ids de perfil são UUIDs estáveis entre aparelhos.
 * ENTRA: dois RepositorioPersistencia (local = base, remoto = espelho).
 * SAI: ResultadoSync {apagadosDrenados, puxados, empurrados}.
 * CHAMA: migracao.ts:migrar (push), adaptadores/repo_sincronizado:
 *   lerTombstones/removerTombstone, core/persistencia:RepositorioPersistencia
 *   (tipo).
 * É CHAMADO POR: backend.ts (criarBackendSupabase → sincronizar), app/bridge.ts,
 *   backend.test.ts.
 * RODA POR: boot do app (bundle, fire-and-forget na borda); cliente das Edge
 *   Functions.
 * CUIDADO: ORDEM importa — tombstones PRIMEIRO (LGPD: apagar vence; senão
 *   perfis apagados offline ressuscitariam no pull). O pull de PERFIS/SAVES só
 *   puxa ids AUSENTES localmente (nunca sobrescreve edição local); só o push usa
 *   migrar() cru (upsert, local vence no mesmo id). HISTÓRIAS (D1 · D-07) são
 *   mescladas para TODOS os perfis, com desempate por atualizadoEm — troca de
 *   aparelho com perfil já presente não some com as histórias do banco. Limite
 *   MVP: edição concorrente do MESMO perfil em dois aparelhos na mesma janela
 *   fica com o último push. Histórias/telemetria não travam o sync.
 *
 * — detalhe preservado —
 * Pipoca — Sincronização inicial local↔remoto · doc fase06-06-03
 * ----------------------------------------------------------------
 * Roda no login/boot com sessão válida (borda, fire-and-forget com catch).
 * Política "união com preferência local" — os ids de perfil são UUIDs
 * estáveis entre aparelhos:
 *   1. drena TOMBSTONES (perfis apagados offline → apaga no remoto antes
 *      de puxar, senão ressuscitariam);
 *   2. puxa do remoto SÓ os ids ausentes localmente (nunca sobrescreve
 *      edição local — migrar() cru faria isso);
 *   3. empurra local→remoto integral via migrar() (upsert; local vence).
 * Limite documentado do MVP: edição concorrente do MESMO perfil em dois
 * aparelhos na mesma janela fica com a versão do último push.
 */

import type { RepositorioPersistencia } from "../core/persistencia/index.js";
import { migrar } from "./migracao.js";
import { lerTombstones, removerTombstone, aplicarMesclaHistorias } from "./adaptadores/repo_sincronizado.js";
import { drenarFilaRemota } from "./adaptadores/fila_remota.js";

export interface ResultadoSync {
  apagadosDrenados: number;
  puxados: number;
  empurrados: number;
  /** D2: itens da fila remota (escritas que falharam) reenviados neste sync. */
  filaDrenada?: number;
}

export async function sincronizarInicial(
  local: RepositorioPersistencia,
  remoto: RepositorioPersistencia
): Promise<ResultadoSync> {
  // 1 · tombstones primeiro (LGPD: apagar vence)
  let apagadosDrenados = 0;
  for (const id of lerTombstones()) {
    try {
      await remoto.apagarPerfil(id);
      removerTombstone(id);
      apagadosDrenados++;
    } catch {
      /* segue na fila para a próxima */
    }
  }

  // 1b · drena a FILA REMOTA (D2/D-06: escritas que falharam offline) antes da
  // puxada — o remoto fica com o estado mais novo antes da mescla de histórias.
  const fila = await drenarFilaRemota(remoto);

  // 2 · puxa só o que não existe localmente (união, local vence)
  const [locais, remotos] = await Promise.all([local.carregarPerfis(), remoto.carregarPerfis()]);
  const idsLocais = new Set(locais.map((p) => p.id));
  let puxados = 0;
  for (const p of remotos) {
    const ausente = !idsLocais.has(p.id);
    if (ausente) {
      await local.salvarPerfil(p);
      const save = await remoto.carregarSave(p.id);
      if (save) await local.salvarSave(p.id, save);
      // telemetria só para perfil AUSENTE (sem risco de duplicar eventos:
      // migrar() não empurra eventos e perfis presentes ficam de fora).
      try {
        for (const ev of await remoto.carregarTelemetria(p.id)) {
          await local.registrarTelemetria(ev);
        }
      } catch {
        /* telemetria não trava o sync de perfis */
      }
      puxados++;
    }
    // Histórias: para TODOS os perfis remotos (D1 · ML-1 sync/D-07) — antes só
    // os ausentes puxavam, e trocar de aparelho com o perfil já presente
    // "sumia" com as histórias do banco. A mescla desempata por atualizadoEm
    // e grava no LOCAL sem eco (aplicarMesclaHistorias).
    if (remoto.carregarHistorias && local.salvarHistoria) {
      try {
        const remotas = await remoto.carregarHistorias(p.id);
        const loc = ausente || !local.carregarHistorias ? [] : await local.carregarHistorias(p.id);
        await aplicarMesclaHistorias(local, p.id, loc, remotas, Date.now());
      } catch {
        /* histórias não podem travar o sync de perfis */
      }
    }
  }

  // 3 · empurra tudo que é local (upsert no remoto — local vence no mesmo id)
  const res = await migrar(local, remoto);
  return { apagadosDrenados, puxados, empurrados: res.perfis, filaDrenada: fila.drenados };
}
