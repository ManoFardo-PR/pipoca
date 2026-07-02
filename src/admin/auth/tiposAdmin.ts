/**
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
