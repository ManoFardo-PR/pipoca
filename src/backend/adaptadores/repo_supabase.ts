/**
 * [repo_supabase.ts] — Adaptador RepositorioPersistencia sobre PostgREST
 *   (perfis/saves/telemetria/historias) via REST puro, sem SDK.
 *
 * PAPEL: backend (adaptador repo · Supabase/PostgREST)
 * POR QUE EXISTE: espelhar os dados no servidor com os MESMOS envelopes do repo
 *   local, revalidados na leitura (schema corrompido é descartado em silêncio).
 * ENTRA: OpcoesRepoSupabase {url, anonKey, obterToken, tenant?, transporte?};
 *   Perfil/EstadoApp/EventoTelemetria/HistoriaSalva.
 * SAI: dados persistidos no PostgREST; leituras revalidadas pelos validadores
 *   canônicos.
 * CHAMA: dados/schemas:validarEnvelopePerfil/Save, core/telemetria:validarEvento,
 *   core/historias (validador/constantes),
 *   servicos/telemetria_repo:RETENCAO_DIAS_PADRAO, ia/provedor:transportePadrao.
 * É CHAMADO POR: backend.ts (criarBackendSupabase), backend.test.ts.
 * RODA POR: boot do app (bundle); cliente das Edge Functions.
 * CUIDADO: o token é RELIDO a cada request (obterToken renova sob demanda —
 *   nunca capturado em closure). A coluna `dono` NUNCA é enviada (default
 *   auth.uid() + RLS dono=auth.uid() fecham spoofing); tenant_id vem de
 *   escopoTenant. LGPD: apagarPerfil apaga telemetria+historias+saves+perfil no
 *   servidor. podarTelemetria/podarHistorias devolvem 0 (return=minimal não
 *   conta — o local reporta). Nenhuma chave de provedor aqui (só a anon key
 *   pública).
 *
 * — detalhe preservado —
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
import type { HistoriaSalva } from "../../core/historias.js";
import {
  ESQUEMA_HISTORIAS,
  RETENCAO_HISTORIAS_DIAS,
  validarHistoriaSalva,
} from "../../core/historias.js";
import { RETENCAO_DIAS_PADRAO } from "../../servicos/telemetria_repo.js";
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

  /**
   * Retenção remota de telemetria: DELETE por filtro, idempotente (padrão de
   * `podarHistorias`). O local poda por `evento.ts` (relógio do cliente) e o
   * remoto por `criado_em` (relógio do servidor) — divergência de minutos numa
   * janela de 90 dias é aceitável.
   */
  async podarTelemetria(
    perfilId: string,
    agora: number,
    retencaoDias: number = RETENCAO_DIAS_PADRAO
  ): Promise<number> {
    const limite = new Date(agora - retencaoDias * 86_400_000).toISOString();
    await this.req(
      "/telemetria?perfil_id=eq." + encodeURIComponent(perfilId)
        + "&criado_em=lt." + encodeURIComponent(limite),
      "DELETE",
      undefined,
      "return=minimal"
    );
    return 0; // return=minimal não conta — o local reporta
  }

  // ─── Histórias salvas (pós-fase06) — tabela `historias` ───────────────────
  // `favorita`/`criada_em` são COLUNAS (além do envelope em `dados`) para a
  // retenção remota ser um DELETE por filtro — idempotente, sem tombstones.

  async carregarHistorias(perfilId: string): Promise<HistoriaSalva[]> {
    const linhas = (await this.req(
      "/historias?select=dados&perfil_id=eq." + encodeURIComponent(perfilId) + "&order=criada_em.desc",
      "GET"
    )) as Array<{ dados?: { historia?: unknown } }>;
    const out: HistoriaSalva[] = [];
    for (const l of Array.isArray(linhas) ? linhas : []) {
      const h = validarHistoriaSalva(l && l.dados ? l.dados.historia : null);
      if (h !== null) out.push(h);
    }
    return out;
  }

  async salvarHistoria(perfilId: string, historia: HistoriaSalva): Promise<void> {
    await this.req(
      "/historias?on_conflict=id",
      "POST",
      [{
        id: historia.id,
        perfil_id: perfilId,
        favorita: historia.favorita === true,
        criada_em: new Date(historia.criadaEm).toISOString(),
        dados: { esquema: ESQUEMA_HISTORIAS, historia: { ...historia } },
      }],
      "resolution=merge-duplicates,return=minimal"
    );
  }

  async apagarHistoria(perfilId: string, historiaId: string): Promise<void> {
    await this.req(
      "/historias?perfil_id=eq." + encodeURIComponent(perfilId) + "&id=eq." + encodeURIComponent(historiaId),
      "DELETE",
      undefined,
      "return=minimal"
    );
  }

  /** Retenção remota: apaga SÓ as não-favoritas mais velhas que 20 dias. */
  async podarHistorias(perfilId: string, agora: number): Promise<number> {
    const limite = new Date(agora - RETENCAO_HISTORIAS_DIAS * 86_400_000).toISOString();
    await this.req(
      "/historias?perfil_id=eq." + encodeURIComponent(perfilId)
        + "&favorita=eq.false&criada_em=lt." + encodeURIComponent(limite),
      "DELETE",
      undefined,
      "return=minimal"
    );
    return 0; // o PostgREST com return=minimal não conta — o local reporta
  }

  async apagarPerfil(perfilId: string): Promise<void> {
    const id = encodeURIComponent(perfilId);
    await this.req("/telemetria?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
    await this.req("/historias?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
    await this.req("/saves?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
    await this.req("/perfis?id=eq." + id, "DELETE", undefined, "return=minimal");
  }
}
