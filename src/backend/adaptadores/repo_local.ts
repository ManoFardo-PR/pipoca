/**
 * [repo_local.ts] — Alias/re-export do RepositorioLocalStorage sob o caminho de
 *   adaptador que o doc 06-03 cataloga.
 *
 * PAPEL: backend (adaptador local · alias)
 * POR QUE EXISTE: dar ao repo local (que o app usa desde o MVP) o nome/caminho
 *   de adaptador no catálogo 06-03, sem duplicar código.
 * ENTRA: nada.
 * SAI: re-export de RepositorioLocalStorage.
 * CHAMA: core/persistencia/RepositorioLocalStorage.
 * É CHAMADO POR: backend.test.ts (em produção o app usa o local via
 *   core/persistencia/index.ts:criarRepositorio, não por este alias).
 * RODA POR: boot do app/admin (bundle); cliente das Edge Functions.
 *
 * — detalhe preservado —
 * Pipoca — Repositório local (alias) · doc fase06-06-03
 * ------------------------------------------------------
 * O adaptador local É o RepositorioLocalStorage que o app usa desde o MVP
 * (envelopes validados por schema, LGPD no apagar). Este arquivo só dá a
 * ele o nome/caminho que o doc 06-03 cataloga entre os adaptadores.
 */

export { RepositorioLocalStorage } from "../../core/persistencia/RepositorioLocalStorage.js";
