/**
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
import { lerTombstones, removerTombstone } from "./adaptadores/repo_sincronizado.js";

export interface ResultadoSync {
  apagadosDrenados: number;
  puxados: number;
  empurrados: number;
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

  // 2 · puxa só o que não existe localmente (união, local vence)
  const [locais, remotos] = await Promise.all([local.carregarPerfis(), remoto.carregarPerfis()]);
  const idsLocais = new Set(locais.map((p) => p.id));
  let puxados = 0;
  for (const p of remotos) {
    if (idsLocais.has(p.id)) continue;
    await local.salvarPerfil(p);
    const save = await remoto.carregarSave(p.id);
    if (save) await local.salvarSave(p.id, save);
    puxados++;
  }

  // 3 · empurra tudo que é local (upsert no remoto — local vence no mesmo id)
  const res = await migrar(local, remoto);
  return { apagadosDrenados, puxados, empurrados: res.perfis };
}
