/**
 * Pipoca — Repositório Supabase (PostgREST via REST) · doc fase06-06-03
 * ----------------------------------------------------------------------
 * `RepositorioPersistencia` sobre as tabelas `perfis`/`saves`/`telemetria`
 * SEM SDK: requisições puras pelo `Transporte` injetável. Os MESMOS
 * envelopes do repo local viajam na coluna `dados`/`evento` (jsonb) e são
 * revalidados na leitura pelos validadores canônicos — schema corrompido
 * no servidor é descartado em silêncio, como no local.
 *
 * Segurança: o token de acesso é RELIDO a cada request (`obterToken()`
 * renova sob demanda — nunca capturado em closure); a coluna `dono` NUNCA
 * é enviada (default `auth.uid()` no banco + RLS `dono = auth.uid()`
 * fecham spoofing); `tenant_id` vem de `escopoTenant(sessaoAtual())`.
 * LGPD: `apagarPerfil` remove perfil + save + telemetria no servidor.
 */

import type { Perfil } from "../../core/perfil.js";
import type { EstadoApp, EventoTelemetria } from "../../core/estado.js";
import type { RepositorioPersistencia } from "../../core/persistencia/index.js";
import { validarEnvelopePerfil, validarEnvelopeSave } from "../../dados/schemas.js";
import { validarEvento } from "../../core/telemetria.js";
import type { Transporte } from "../../ia/provedor.js";
import { transportePadrao } from "../../ia/provedor.js";

export interface OpcoesRepoSupabase {
  url: string;
  anonKey: string;
  /** Token do usuário logado, renovado sob demanda (auth_supabase.obterToken). */
  obterToken: () => Promise<string | null>;
  /** Tenant efetivo da sessão (escopoTenant) — vai na coluna tenant_id. */
  tenant?: () => string | null;
  transporte?: Transporte;
}

export class RepositorioSupabase implements RepositorioPersistencia {
  private readonly op: OpcoesRepoSupabase;
  private readonly transporte: Transporte;
  private readonly base: string;

  constructor(op: OpcoesRepoSupabase) {
    this.op = op;
    this.transporte = op.transporte || transportePadrao();
    this.base = op.url.replace(/\/+$/, "") + "/rest/v1";
  }

  /** Request autenticada — token relido A CADA chamada. */
  private async req(caminho: string, metodo: string, corpo?: unknown, prefer?: string): Promise<unknown> {
    const token = await this.op.obterToken();
    if (!token) throw new Error("Sem sessão para o repositório remoto.");
    const headers: Record<string, string> = {
      apikey: this.op.anonKey,
      Authorization: "Bearer " + token,
      "content-type": "application/json",
    };
    if (prefer) headers["Prefer"] = prefer;
    const resp = await this.transporte(this.base + caminho, {
      method: metodo,
      headers,
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error("Supabase: HTTP " + resp.status + " em " + metodo + " " + caminho);
    }
    try {
      return await resp.json();
    } catch {
      return null; // 204/return=minimal sem corpo
    }
  }

  async carregarPerfis(): Promise<Perfil[]> {
    const linhas = (await this.req("/perfis?select=dados", "GET")) as Array<{ dados?: unknown }>;
    const validos: Perfil[] = [];
    for (const l of Array.isArray(linhas) ? linhas : []) {
      const p = validarEnvelopePerfil(l ? l.dados : null);
      if (p !== null) validos.push(p);
    }
    return validos;
  }

  async salvarPerfil(p: Perfil): Promise<void> {
    const tenant = this.op.tenant ? this.op.tenant() : null;
    await this.req(
      "/perfis?on_conflict=id",
      "POST",
      [{ id: p.id, ...(tenant ? { tenant_id: tenant } : {}), dados: { esquema: "pipoca.perfil.v1", perfil: { ...p } } }],
      "resolution=merge-duplicates,return=minimal"
    );
  }

  async carregarSave(perfilId: string): Promise<EstadoApp | null> {
    const linhas = (await this.req("/saves?select=dados&perfil_id=eq." + encodeURIComponent(perfilId), "GET")) as Array<{ dados?: unknown }>;
    const l = Array.isArray(linhas) ? linhas[0] : null;
    return l ? validarEnvelopeSave(l.dados) : null;
  }

  async salvarSave(perfilId: string, estado: EstadoApp): Promise<void> {
    await this.req(
      "/saves?on_conflict=perfil_id",
      "POST",
      [{ perfil_id: perfilId, dados: { esquema: "pipoca.save.v1", perfilId, estado } }],
      "resolution=merge-duplicates,return=minimal"
    );
  }

  async registrarTelemetria(evento: EventoTelemetria): Promise<void> {
    await this.req("/telemetria", "POST", [{ perfil_id: evento.perfilId, evento }], "return=minimal");
  }

  async carregarTelemetria(perfilId: string): Promise<EventoTelemetria[]> {
    const linhas = (await this.req(
      "/telemetria?select=evento&perfil_id=eq." + encodeURIComponent(perfilId) + "&order=criado_em.asc",
      "GET"
    )) as Array<{ evento?: unknown }>;
    const out: EventoTelemetria[] = [];
    for (const l of Array.isArray(linhas) ? linhas : []) {
      if (l && validarEvento(l.evento)) out.push(l.evento as EventoTelemetria);
    }
    return out;
  }

  async apagarPerfil(perfilId: string): Promise<void> {
    const id = encodeURIComponent(perfilId);
    await this.req("/telemetria?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
    await this.req("/saves?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
    await this.req("/perfis?id=eq." + id, "DELETE", undefined, "return=minimal");
  }
}
