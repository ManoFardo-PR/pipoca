/**
 * Pipoca — Guard de rotas do admin (SA_*) · doc fase04-04-01 (rotas de 04-02/03)
 * -------------------------------------------------------------------------------
 * Puro e fail-closed: sem `SessaoSuperAdmin` válida (ou tela desconhecida), toda
 * navegação cai em SA_LOGIN. O login é sempre alcançável. `agora` vem da borda.
 */

import type { SessaoSuperAdmin } from "./auth/tiposAdmin.js";
import { sessaoSuperAdminValida } from "./auth/sessaoSuperAdmin.js";

export const TELA_SA_LOGIN = 1;
export const TELA_SA_HOME = 2;
export const TELA_SA_TENANT = 3;
export const TELA_SA_CONTENT = 4;
export const TELA_SA_AI = 5;
export const TELA_SA_SAFE = 6;

/** Mapa nó da arquitetura → tela interna do admin. */
export const ROTAS_ADMIN: Record<string, number> = {
  SA_LOGIN: TELA_SA_LOGIN,
  SA_HOME: TELA_SA_HOME,
  SA_TENANT: TELA_SA_TENANT,
  SA_CONTENT: TELA_SA_CONTENT,
  SA_AI: TELA_SA_AI,
  SA_SAFE: TELA_SA_SAFE,
};

const TELAS_VALIDAS = [
  TELA_SA_LOGIN,
  TELA_SA_HOME,
  TELA_SA_TENANT,
  TELA_SA_CONTENT,
  TELA_SA_AI,
  TELA_SA_SAFE,
];

/** Devolve a tela permitida: destino se a sessão vale; senão SA_LOGIN (fail-closed). */
export function guardarRotaAdmin(
  telaDestino: number,
  sessao: SessaoSuperAdmin | null,
  agora: number
): number {
  if (telaDestino === TELA_SA_LOGIN) return TELA_SA_LOGIN;
  if (TELAS_VALIDAS.indexOf(telaDestino) < 0) return TELA_SA_LOGIN;
  return sessaoSuperAdminValida(sessao, agora) ? telaDestino : TELA_SA_LOGIN;
}
