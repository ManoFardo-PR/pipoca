/**
 * Pipoca — Privacidade e dados / LGPD (PC_PRIV) · doc fase02-02-09
 * ----------------------------------------------------------------
 * Exportar e apagar os dados de um perfil, operando pelo seam `RepositorioPersistencia`.
 * Minimização: só nome/apelido, idade e progresso (os schemas pipoca.perfil.v1 / pipoca.save.v1).
 * Apagar é o direito LGPD: remove perfil + save + telemetria (via `repo.apagarPerfil`).
 */

import type { RepositorioPersistencia } from "./persistencia/index.js";
import {
  criarEnvelopePerfil,
  criarEnvelopeSave,
  type EnvelopePerfilV1,
  type EnvelopeSaveV1,
} from "../dados/schemas.js";

export interface ExportacaoDados {
  esquema: "pipoca.export.v1";
  exportadoEm: number; // epoch ms (borda)
  perfil: EnvelopePerfilV1 | null;
  save: EnvelopeSaveV1 | null;
}

/** Exporta os dados de um perfil como JSON dos schemas congelados. `agora` vem da borda. */
export async function exportarDados(
  perfilId: string,
  repo: RepositorioPersistencia,
  agora: number
): Promise<ExportacaoDados> {
  const perfis = await repo.carregarPerfis();
  const perfil = perfis.find((p) => p.id === perfilId) ?? null;
  const estado = await repo.carregarSave(perfilId);
  return {
    esquema: "pipoca.export.v1",
    exportadoEm: agora,
    perfil: perfil ? criarEnvelopePerfil(perfil) : null,
    save: estado ? criarEnvelopeSave(perfilId, estado) : null,
  };
}

/** Apaga todos os dados do perfil (LGPD). Sem resíduos: perfil + save + telemetria. */
export async function apagarDados(perfilId: string, repo: RepositorioPersistencia): Promise<void> {
  await repo.apagarPerfil(perfilId);
}
