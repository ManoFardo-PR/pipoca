/**
 * Pipoca — Tipos de tenant e plano (SA_TENANT) · doc fase04-04-03
 * ----------------------------------------------------------------
 * Modelo multi-tenant: contas, tenants e planos com limites efetivos.
 * Defaults SEGUROS: tenant novo nasce no plano mais restritivo (IA desligada
 * pelo plano); rebaixar plano nunca destrói dados (só bloqueia criação acima
 * do teto); suspender ≠ apagar.
 */

import type { TenantId } from "../auth/tiposAdmin.js";

export type { TenantId };

export type IdPlano = "gratis" | "familia" | "escola";

export interface LimitesPlano {
  maxPerfis: number; // teto de Perfil por tenant
  iaPermitida: boolean; // tenant pode habilitar o motor de IA?
  cenariosCustomizados: number; // grafos autorais próprios (teto de publicação)
  retencaoTelemetriaDias: number; // janela de telemetria (LGPD)
}

export interface Plano {
  id: IdPlano;
  nome: string;
  limites: LimitesPlano;
}

export interface Tenant {
  id: TenantId;
  nome: string;
  planoId: IdPlano;
  ativo: boolean; // false = suspenso (dados preservados)
  criadoEm: number; // epoch ms (borda)
}

export interface Conta {
  id: string;
  email: string;
  tenants: TenantId[];
}

/** Catálogo fixo do MVP (fase06 move para o backend). 90d alinha com a retenção da fase03. */
export const PLANOS_PADRAO: Plano[] = [
  { id: "gratis",  nome: "Grátis",  limites: { maxPerfis: 1,  iaPermitida: false, cenariosCustomizados: 0,  retencaoTelemetriaDias: 30 } },
  { id: "familia", nome: "Família", limites: { maxPerfis: 4,  iaPermitida: true,  cenariosCustomizados: 2,  retencaoTelemetriaDias: 90 } },
  { id: "escola",  nome: "Escola",  limites: { maxPerfis: 40, iaPermitida: true,  cenariosCustomizados: 10, retencaoTelemetriaDias: 180 } },
];

/** Tenant novo nasce aqui (regra 7 do doc): o mais restritivo, IA desligada pelo plano. */
export const PLANO_MAIS_RESTRITIVO: IdPlano = "gratis";

/** Limites de um plano do catálogo; desconhecido → limites do mais restritivo (fail-closed). */
export function limitesDoPlano(planoId: string): LimitesPlano {
  const p = PLANOS_PADRAO.find((x) => x.id === planoId);
  const base = p ?? (PLANOS_PADRAO.find((x) => x.id === PLANO_MAIS_RESTRITIVO) as Plano);
  return { ...base.limites };
}

/**
 * Rebaixamento não-destrutivo (regra 4): criar +1 perfil excederia o teto?
 * Perfis existentes acima do teto são preservados; só a criação é bloqueada.
 */
export function excedeTetoPerfis(contagemAtual: number, limites: LimitesPlano): boolean {
  return contagemAtual + 1 > limites.maxPerfis;
}
