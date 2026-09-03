/**
 * [migracao.ts] — `migrar(de, para)` copia perfis, saves e histórias entre dois
 *   RepositorioPersistencia pelo seam (serve para qualquer par de adaptadores).
 *
 * PAPEL: backend (utilitário de portabilidade)
 * POR QUE EXISTE: portar dados entre adaptadores (local↔Supabase)
 *   usando os schemas congelados, operando só pelo seam.
 * ENTRA: dois RepositorioPersistencia (de, para).
 * SAI: ResultadoMigracao {perfis, saves}; grava no destino, não apaga a origem.
 * CHAMA: core/persistencia:RepositorioPersistencia (tipo).
 * É CHAMADO POR: sync.ts:sincronizarInicial (passo 3, push local→remoto),
 *   backend.test.ts.
 * RODA POR: boot do app/admin (bundle); cliente das Edge Functions.
 * CUIDADO: idempotente no destino (salvarPerfil/salvarSave sobrescrevem por id)
 *   e não apaga a origem — mas migrar() cru SOBRESCREVE a edição local se usado
 *   sozinho num pull; por isso sync.ts só o usa no PUSH (o pull só puxa ids
 *   ausentes). Histórias são best-effort e não travam a migração de perfis.
 *
 * — detalhe preservado —
 * Pipoca — Migração entre adaptadores de persistência · doc fase06-06-03
 * -----------------------------------------------------------------------
 * `migrar(de, para)` copia perfis e saves de um `RepositorioPersistencia` para outro,
 * usando os MESMOS schemas congelados (pipoca.perfil.v1 / pipoca.save.v1). Como opera
 * apenas pelo seam, funciona para qualquer par de adaptadores (local↔Supabase).
 *
 * Escopo atual: perfis + saves (o seam `RepositorioPersistencia` só expõe escrita de
 * telemetria, não leitura; a migração de telemetria entra junto do adaptador remoto real,
 * que depende da fachada `Backend` [[fase06-06-01]]).
 */

import type { RepositorioPersistencia } from "../core/persistencia/index.js";

export interface ResultadoMigracao {
  perfis: number; // perfis copiados
  saves: number; // saves copiados
}

/**
 * Lê tudo de `de` e grava em `para`. Idempotente no destino (salvarPerfil/salvarSave
 * sobrescrevem por id). Não apaga nada na origem.
 */
export async function migrar(
  de: RepositorioPersistencia,
  para: RepositorioPersistencia
): Promise<ResultadoMigracao> {
  const perfis = await de.carregarPerfis();
  let saves = 0;
  for (const p of perfis) {
    await para.salvarPerfil(p);
    const save = await de.carregarSave(p.id);
    if (save) {
      await para.salvarSave(p.id, save);
      saves++;
    }
    // histórias salvas (pós-fase06): upsert idempotente por id, quando ambos
    // os lados sabem lidar com elas (métodos aditivo-opcionais do seam)
    if (de.carregarHistorias && para.salvarHistoria) {
      try {
        for (const h of await de.carregarHistorias(p.id)) {
          await para.salvarHistoria(p.id, h);
        }
      } catch {
        /* histórias não podem travar a migração de perfis */
      }
    }
  }
  return { perfis: perfis.length, saves };
}
