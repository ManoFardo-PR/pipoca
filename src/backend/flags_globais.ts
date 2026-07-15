/**
 * [flags_globais.ts] — Puxa as feature-flags globais (kill-switch) do servidor
 *   no boot/login da FAMÍLIA e grava na MESMA chave local que o app já lê.
 *
 * PAPEL: backend (leitura de flags no app da família)
 * POR QUE EXISTE: fazer o kill-switch do operador alcançar TODAS as famílias —
 *   antes as flags viviam só no navegador do operador.
 * ENTRA: ConfigBackend + Transporte opcionais; lê a linha `flags_admin`
 *   id='global' via REST autenticado (qualquer sessão autenticada lê).
 * SAI: FeatureFlags normalizadas (grava via salvarFlags — a mesma chave que
 *   _modosEfetivos lê) ou null.
 * CHAMA: config.ts, adaptadores/auth_supabase.ts,
 *   admin/flags:normalizarFlags/salvarFlags, ia/provedor:transportePadrao.
 * É CHAMADO POR: app/bridge.ts (exposto em Canon.backend; app/estado.js chama
 *   via Canon.backend.puxarFlagsGlobais), backend.test.ts.
 * RODA POR: boot do app (bundle); cliente das Edge Functions.
 * CUIDADO: fail-soft/fail-closed — sem provedor supabase/sessão/linha ou com
 *   erro → null e o local fica INTOCADO (offline, as últimas flags puxadas
 *   "grudam": desligar IA continua desligado sem rede — desejável). Módulo
 *   pequeno SEPARADO de espelho_admin.ts porque ESTE entra no bundle da criança.
 *
 * — detalhe preservado —
 * Pipoca — Flags globais no app da FAMÍLIA (pós-fase06, iteração 2)
 * -------------------------------------------------------------------
 * O kill-switch do SA_SAFE só valia no navegador do operador (as flags
 * viviam em localStorage). Com a tabela `flags_admin` (linha 'global',
 * leitura para qualquer autenticado), o app da criança PUXA as flags no
 * boot/login e grava na MESMA chave local que `_modosEfetivos()` já lê —
 * o kill-switch alcança todas as famílias na próxima sessão.
 *
 * Fail-soft/fail-closed: sem provedor supabase, sem sessão, sem linha ou
 * com erro → null e o local fica INTOCADO (offline, as últimas flags
 * puxadas "grudam" — desligar IA continua desligado sem rede: desejável).
 * Módulo pequeno e separado de espelho_admin.ts: este SIM entra no bundle
 * da criança.
 */

import type { FeatureFlags } from "../admin/flags.js";
import { normalizarFlags, salvarFlags } from "../admin/flags.js";
import { configDoAmbiente, type ConfigBackend } from "./config.js";
import { criarAuthSupabase } from "./adaptadores/auth_supabase.js";
import { transportePadrao, type Transporte } from "../ia/provedor.js";

export async function puxarFlagsGlobais(
  config?: ConfigBackend,
  transporte?: Transporte
): Promise<FeatureFlags | null> {
  const cfg = config || configDoAmbiente();
  if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    const auth = criarAuthSupabase({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      ...(transporte ? { transporte } : {}),
    });
    if (!auth.sessaoAtual()) return null; // família OU operador — qualquer sessão lê
    const token = await auth.obterToken();
    if (!token) return null;
    const t = transporte || transportePadrao();
    const resp = await t(
      cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/flags_admin?select=dados&id=eq.global",
      {
        method: "GET",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json",
        },
      }
    );
    if (resp.status < 200 || resp.status >= 300) return null;
    const json = (await resp.json()) as unknown;
    const linha = Array.isArray(json) ? (json[0] as { dados?: unknown } | undefined) : undefined;
    if (!linha || !linha.dados || typeof linha.dados !== "object") return null;
    const limpo = normalizarFlags(linha.dados);
    salvarFlags(limpo); // mesma chave que carregarFlags/_modosEfetivos leem
    return limpo;
  } catch {
    return null;
  }
}
