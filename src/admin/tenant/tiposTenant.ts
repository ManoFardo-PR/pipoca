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

export type IdPlano = "gratis" | "freemium" | "familia" | "escola";

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
  /** Plano com prazo (Freemium: 60 dias a partir do criadoEm do tenant). */
  validadeDias?: number;
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
  { id: "gratis",   nome: "Grátis",   limites: { maxPerfis: 1,  iaPermitida: false, cenariosCustomizados: 0,  retencaoTelemetriaDias: 30 } },
  // Freemium: 60 dias com os LIMITES DO FAMÍLIA; expirado → limites do Grátis
  // (rebaixar não destrói — só a criação acima do teto é bloqueada).
  { id: "freemium", nome: "Freemium", validadeDias: 60, limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
  { id: "familia",  nome: "Família",  limites: { maxPerfis: 4,  iaPermitida: true,  cenariosCustomizados: 2,  retencaoTelemetriaDias: 90 } },
  { id: "escola",   nome: "Escola",   limites: { maxPerfis: 40, iaPermitida: true,  cenariosCustomizados: 10, retencaoTelemetriaDias: 180 } },
];

/** Fallback fail-closed (plano desconhecido/fora de escopo): o mais restritivo. */
export const PLANO_MAIS_RESTRITIVO: IdPlano = "gratis";

/** Tenant novo nasce aqui: Freemium — 60 dias de Família grátis p/ todo cadastro. */
export const PLANO_INICIAL: IdPlano = "freemium";

const MS_POR_DIA = 86_400_000;

/** Limites de um plano do catálogo; desconhecido → limites do mais restritivo (fail-closed). */
export function limitesDoPlano(planoId: string): LimitesPlano {
  const p = PLANOS_PADRAO.find((x) => x.id === planoId);
  const base = p ?? (PLANOS_PADRAO.find((x) => x.id === PLANO_MAIS_RESTRITIVO) as Plano);
  return { ...base.limites };
}

/**
 * Limites VIGENTES do tenant em `agora`: plano com validade (Freemium) vencida
 * — âncora = `criadoEm` do tenant — degrada para os limites do Grátis.
 * Nada é apagado: perfis acima do teto são preservados (regra 4).
 */
export function limitesVigentes(tenant: Tenant, agora: number): LimitesPlano {
  const p = PLANOS_PADRAO.find((x) => x.id === tenant.planoId);
  if (p && typeof p.validadeDias === "number" && agora > tenant.criadoEm + p.validadeDias * MS_POR_DIA) {
    return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
  }
  return limitesDoPlano(tenant.planoId);
}

/** Dias restantes de um plano com validade (null = plano sem prazo). */
export function diasRestantes(tenant: Tenant, agora: number): number | null {
  const p = PLANOS_PADRAO.find((x) => x.id === tenant.planoId);
  if (!p || typeof p.validadeDias !== "number") return null;
  const fim = tenant.criadoEm + p.validadeDias * MS_POR_DIA;
  return Math.max(0, Math.ceil((fim - agora) / MS_POR_DIA));
}

/**
 * Rebaixamento não-destrutivo (regra 4): criar +1 perfil excederia o teto?
 * Perfis existentes acima do teto são preservados; só a criação é bloqueada.
 */
export function excedeTetoPerfis(contagemAtual: number, limites: LimitesPlano): boolean {
  return contagemAtual + 1 > limites.maxPerfis;
}
