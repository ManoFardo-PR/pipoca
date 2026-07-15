/**
 * [tiposAdmin.ts] — tipos base do super admin: credencial, sessão, escopo,
 *   TenantId e o StorageLike injetável.
 *
 * PAPEL: admin (tipos — sem runtime)
 * POR QUE EXISTE: manter a trilha do operador totalmente separada da família em
 *   nível de TIPO, sem contaminar EstadoApp com campos administrativos.
 * ENTRA: nada (só declarações de tipo/interface).
 * SAI: PapelAdmin, TenantId, CredencialSuperAdmin, SessaoSuperAdmin, StorageLike.
 * CHAMA: nada (só tipos).
 * É CHAMADO POR: praticamente todo src/admin (autenticacaoSuperAdmin,
 *   sessaoSuperAdmin, rotasAdmin, flags, ia_config, ia_global, validar_grafo,
 *   tenant/*) e ../../backend/backend.ts, admin.test.ts.
 * RODA POR: boot do admin — bundled em pipoca.admin.bundle.js via `bun run
 *   build:admin` (tipos apagados na compilação).
 * CUIDADO: StorageLike é injetável DE PROPÓSITO — nunca referenciar `localStorage`
 *   no top-level de módulo (bun/testes não têm). Credencial/sessão/storage do
 *   operador jamais se misturam com os da casa (HH_LOGIN).
 *
 * — detalhe preservado —
 * Pipoca — Tipos do super admin (SA_LOGIN) · doc fase04-04-01
 * ------------------------------------------------------------
 * Trilha SEPARADA da família (HH_LOGIN): credencial, sessão e escopo do operador
 * da plataforma. Nunca compartilha credencial/sessão/storage com a casa.
 * `EstadoApp` NÃO ganha campos administrativos (lei do seam).
 */

export type PapelAdmin = "super_admin";

export type TenantId = string;

export interface CredencialSuperAdmin {
  email: string;
  senhaHash: string; // FNV-1a(sal + senha) — MVP local; auth real é fase06 (ServicoAuth)
  sal: string;
}

export interface SessaoSuperAdmin {
  adminId: string;
  papel: PapelAdmin;
  escopoTenants: TenantId[] | "todos"; // "todos" só para o operador raiz
  emitidaEm: number; // epoch ms (borda)
  expiraEm: number; // epoch ms — expirou → reautenticar
  token: string; // opaco ao cliente
}

/**
 * Storage injetável: localStorage na borda (browser), Map nos testes (bun não
 * tem localStorage — nunca referenciar `localStorage` no top-level de módulo).
 */
export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
