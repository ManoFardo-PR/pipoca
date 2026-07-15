/**
 * [lgpd.ts] — Direitos LGPD do perfil: exportar (JSON dos schemas congelados) e apagar
 *   todos os dados, operando pelo seam RepositorioPersistencia.
 *
 * PAPEL: core-lógica (privacidade e dados / LGPD · PC_PRIV)
 * POR QUE EXISTE: dar ao cuidador o direito de levar embora (exportar) e apagar sem resíduos
 *   os dados de uma criança, com minimização de PII.
 * ENTRA: perfilId, repo (RepositorioPersistencia), agora (epoch ms da borda).
 * SAI: ExportacaoDados (perfil + save + histórias, esquema pipoca.export.v1) / apagamento total.
 * CHAMA: ./persistencia/index.js:RepositorioPersistencia, ./historias.js:HistoriaSalva,
 *   ../dados/schemas.js:{criarEnvelopePerfil,criarEnvelopeSave}.
 * É CHAMADO POR: src/app/bridge.ts, src/core/persistencia/persistencia.test.ts,
 *   src/core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: minimização — só nome/apelido, idade e progresso. apagarDados delega a
 *   repo.apagarPerfil (remove perfil + save + telemetria + histórias, sem resíduos). O export
 *   NUNCA quebra por causa das histórias (try/catch). `agora` da borda.
 *
 * — detalhe preservado —
 * Pipoca — Privacidade e dados / LGPD (PC_PRIV) · doc fase02-02-09
 * ----------------------------------------------------------------
 * Exportar e apagar os dados de um perfil, operando pelo seam `RepositorioPersistencia`.
 * Minimização: só nome/apelido, idade e progresso (os schemas pipoca.perfil.v1 / pipoca.save.v1).
 * Apagar é o direito LGPD: remove perfil + save + telemetria (via `repo.apagarPerfil`).
 */

import type { RepositorioPersistencia } from "./persistencia/index.js";
import type { HistoriaSalva } from "./historias.js";
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
  /** Aditivo (pós-fase06): histórias salvas da criança (texto incluído). */
  historias: HistoriaSalva[];
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
  let historias: HistoriaSalva[] = [];
  try {
    if (repo.carregarHistorias) historias = await repo.carregarHistorias(perfilId);
  } catch {
    /* export nunca quebra por causa das histórias */
  }
  return {
    esquema: "pipoca.export.v1",
    exportadoEm: agora,
    perfil: perfil ? criarEnvelopePerfil(perfil) : null,
    save: estado ? criarEnvelopeSave(perfilId, estado) : null,
    historias,
  };
}

/** Apaga todos os dados do perfil (LGPD). Sem resíduos: perfil + save + telemetria + histórias. */
export async function apagarDados(perfilId: string, repo: RepositorioPersistencia): Promise<void> {
  await repo.apagarPerfil(perfilId);
}
