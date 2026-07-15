/**
 * [sessaoSuperAdmin.ts] — cria e valida a sessão do operador e decide o que o
 *   escopo autoriza (tenant específico e áreas do hub SA_HOME).
 *
 * PAPEL: admin (sessão e escopo — puro, fail-closed)
 * POR QUE EXISTE: concentrar num só módulo puro as regras de validade da sessão
 *   e de autorização por escopo, para o guard e as telas confiarem numa fonte única.
 * ENTRA: adminId/escopo/token/agora (criar); SessaoSuperAdmin e agora (validar);
 *   escopo + tenantId/área (autorizar).
 * SAI: SessaoSuperAdmin, booleans de validade/autorização, DURACAO_SESSAO_ADMIN_MS.
 * CHAMA: ./tiposAdmin (SessaoSuperAdmin, TenantId — só tipos).
 * É CHAMADO POR: ./autenticacaoSuperAdmin.ts, ../rotasAdmin.ts,
 *   ../tenant/repositorioTenant.ts (escopoAutoriza), bridge_admin.ts,
 *   ../../backend/backend.ts, admin.test.ts.
 * RODA POR: boot do admin — bundled em pipoca.admin.bundle.js via `bun run build:admin`.
 * CUIDADO: fail-closed em toda dúvida — sessão/escopo inválidos nunca abrem porta.
 *   `agora` é injetado pela borda (nunca Date.now() aqui). Sessão vale 12h. Áreas
 *   conteudo/ia/iaGlobal/seguranca exigem escopo "todos" (operador raiz); só
 *   tenants abre para escopo restrito.
 *
 * — detalhe preservado —
 * Pipoca — Sessão e escopo do super admin (SA_LOGIN/SA_HOME) · docs fase04-04-01/02
 * ----------------------------------------------------------------------------------
 * Funções PURAS (`agora` injetado pela borda, nunca Date.now() aqui).
 * Fail-closed em toda dúvida: sessão/escopo inválidos nunca abrem porta.
 */

import type { SessaoSuperAdmin, TenantId } from "./tiposAdmin.js";

/** Duração da sessão administrativa: 12h (reautenticação diária do operador). */
export const DURACAO_SESSAO_ADMIN_MS = 12 * 3_600_000;

/** Áreas do hub (SA_HOME): cartões que distribuem para as telas SA_*. */
export type AreaAdminId = "tenants" | "conteudo" | "ia" | "iaGlobal" | "seguranca";

/** Cria a sessão do operador a partir de `agora` (epoch ms da borda). */
export function criarSessaoSuperAdmin(
  adminId: string,
  escopo: TenantId[] | "todos",
  agora: number,
  token: string,
  duracaoMs: number = DURACAO_SESSAO_ADMIN_MS
): SessaoSuperAdmin {
  return {
    adminId,
    papel: "super_admin",
    escopoTenants: escopo,
    emitidaEm: agora,
    expiraEm: agora + duracaoMs,
    token,
  };
}

/** A sessão administrativa ainda vale neste instante? (fail-closed) */
export function sessaoSuperAdminValida(s: SessaoSuperAdmin | null, agora: number): boolean {
  return (
    !!s &&
    s.papel === "super_admin" &&
    typeof s.expiraEm === "number" &&
    s.expiraEm > agora &&
    typeof s.token === "string" &&
    s.token.length > 0
  );
}

/** O escopo autoriza este tenant? "todos" → sim; lista → precisa incluir. */
export function escopoAutoriza(escopo: TenantId[] | "todos", tenantId: TenantId): boolean {
  if (escopo === "todos") return true;
  if (!Array.isArray(escopo)) return false; // entrada inválida → fecha
  return escopo.indexOf(tenantId) >= 0;
}

/**
 * O escopo dá acesso à área do hub? (SA_HOME, regra fail-closed)
 * MVP: `tenants` é acessível a qualquer sessão válida (vê só o próprio escopo);
 * `conteudo`/`ia`/`seguranca` operam a plataforma inteira → exigem escopo "todos".
 */
export function areaDisponivel(escopo: TenantId[] | "todos", area: AreaAdminId): boolean {
  if (escopo !== "todos" && !Array.isArray(escopo)) return false;
  if (area === "tenants") return true;
  return escopo === "todos";
}
