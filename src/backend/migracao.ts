/**
 * Pipoca — Migração entre adaptadores de persistência · doc fase06-06-03
 * -----------------------------------------------------------------------
 * `migrar(de, para)` copia perfis e saves de um `RepositorioPersistencia` para outro,
 * usando os MESMOS schemas congelados (pipoca.perfil.v1 / pipoca.save.v1). Como opera
 * apenas pelo seam, funciona para qualquer par de adaptadores (local↔Supabase↔Firebase).
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
  }
  return { perfis: perfis.length, saves };
}
