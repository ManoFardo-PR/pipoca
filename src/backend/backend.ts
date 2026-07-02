/**
 * Pipoca — Fachada do backend trocável (fase06-06-01)
 * ----------------------------------------------------
 * `Backend { auth, repo, proxyIA }` + `obterBackend(config)`.
 *
 * LEI DO BACKEND: app/CORE/telas falam SÓ com `Backend`/`ServicoAuth`/
 * `RepositorioPersistencia`/`ProxyIA`; nenhum SDK ou URL de provedor fora
 * de `src/backend/adaptadores/`. Trocar de BaaS = trocar adaptador —
 * exatamente como Motor A ↔ Motor B na fábrica.
 *
 * Provedores: "local" (default, offline-first — delega aos núcleos que o
 * app já usa), "supabase" (REST puro via Transporte; adaptadores nas
 * etapas seguintes) e "firebase" (stub honesto; paridade em PARIDADE.md).
 * FAIL-SOFT: qualquer dúvida cai no local — a criança nunca vê erro.
 */

import type { Trecho } from "../core/grafo/tipos.js";
import type { RepositorioPersistencia } from "../core/persistencia/index.js";
import { criarRepositorio } from "../core/persistencia/index.js";
import { entrarFamilia as entrarFamiliaStub } from "../core/contaFamilia.js";
import { carregarSessaoConta, limparSessaoConta, salvarConta, salvarSessaoConta } from "../servicos/conta_repo.js";
import { sessaoValida } from "../core/contaFamilia.js";
import { criarRepositorioAdmin } from "../admin/auth/autenticacaoSuperAdmin.js";
import { sessaoSuperAdminValida } from "../admin/auth/sessaoSuperAdmin.js";
import type { SessaoSuperAdmin } from "../admin/auth/tiposAdmin.js";
import { ERRO_LOGIN_NEUTRO, type CredenciaisLogin, type ServicoAuth, type SessaoAuth } from "./auth.js";
import { configDoAmbiente, type ConfigBackend } from "./config.js";
import { criarAuthFirebase } from "./adaptadores/auth_firebase.js";
import { RepositorioFirebase } from "./adaptadores/repo_firebase.js";
import { criarAuthSupabase } from "./adaptadores/auth_supabase.js";
import { RepositorioSupabase } from "./adaptadores/repo_supabase.js";
import { criarRepositorioSincronizado } from "./adaptadores/repo_sincronizado.js";
import { escopoTenant } from "./tenant.js";

/** Contrato do doc 06-05 (ipsis litteris) — o cliente concreto chega na etapa do proxy. */
export interface ProxyIA {
  gerar(req: { prompt: string; schema: object; opts?: object }): Promise<Trecho>;
}

/** Fachada única (doc 06-01, ipsis litteris). */
export interface Backend {
  auth: ServicoAuth;
  repo: RepositorioPersistencia;
  proxyIA: ProxyIA;
}

/** Proxy indisponível: rejeita limpo — o orquestrador degrada p/ simulado → Motor A. */
function proxyIndisponivel(motivo: string): ProxyIA {
  return {
    gerar(): Promise<Trecho> {
      return Promise.reject(new Error(motivo));
    },
  };
}

// ─── Adaptador LOCAL (offline-first, regra 4 do 06-01) ───────────────────────
// Delega aos núcleos que o app JÁ usa (contaFamilia/conta_repo, repo local,
// credencial do operador) — byte-idêntico ao comportamento atual das telas.

/** Leitura SÍNCRONA da sessão do operador (espelho local do repo admin). */
function sessaoAdminLocal(): SessaoSuperAdmin | null {
  try {
    const raw = localStorage.getItem("pipoca.admin.sessao.v1");
    const s = raw ? (JSON.parse(raw) as SessaoSuperAdmin) : null;
    return s && sessaoSuperAdminValida(s, Date.now()) ? s : null;
  } catch {
    return null;
  }
}

export function criarAuthLocal(): ServicoAuth {
  const repoAdmin = criarRepositorioAdmin();
  return {
    async entrarFamilia(cred: CredenciaisLogin): Promise<SessaoAuth> {
      const r = entrarFamiliaStub(cred.email, cred.senha, Date.now());
      if (!r.ok || !r.conta || !r.sessao) throw new Error(r.erro || ERRO_LOGIN_NEUTRO);
      salvarConta(r.conta);
      salvarSessaoConta(r.sessao);
      return { uid: r.conta.id, tipo: "familia" };
    },
    async entrarSuperAdmin(cred: CredenciaisLogin): Promise<SessaoAuth> {
      const s = await repoAdmin.autenticar(cred.email, cred.senha);
      if (!s) throw new Error(ERRO_LOGIN_NEUTRO);
      return { uid: s.adminId, tipo: "superadmin", ...(s.escopoTenants !== "todos" && s.escopoTenants[0] ? { tenantId: s.escopoTenants[0] } : {}) };
    },
    async sair(): Promise<void> {
      // Sai do tipo ATIVO — nunca derruba a sessão do outro app na mesma origem.
      if (sessaoAdminLocal()) {
        await repoAdmin.encerrarSessao();
        return;
      }
      limparSessaoConta();
    },
    sessaoAtual(): SessaoAuth | null {
      const admin = sessaoAdminLocal();
      if (admin) return { uid: admin.adminId, tipo: "superadmin" };
      const fam = carregarSessaoConta();
      if (fam && sessaoValida(fam, Date.now())) return { uid: fam.contaId, tipo: "familia" };
      return null;
    },
  };
}

export function criarBackendLocal(): Backend {
  return {
    auth: criarAuthLocal(),
    repo: criarRepositorio(),
    proxyIA: proxyIndisponivel("ProxyIA indisponível no backend local — degradando para o provedor simulado."),
  };
}

function criarBackendFirebase(): Backend {
  return {
    auth: criarAuthFirebase(),
    repo: new RepositorioFirebase(),
    proxyIA: proxyIndisponivel("ProxyIA Firebase não configurado neste build."),
  };
}

// ─── Adaptador SUPABASE (REST puro — auth GoTrue + repo PostgREST) ───────────
// Remoto com fallback local: o repo é o SINCRONIZADO (local = base; o remoto
// espelha fire-and-forget). O ProxyIA concreto chega na etapa do proxy.

function criarBackendSupabase(cfg: ConfigBackend): Backend {
  const auth = criarAuthSupabase({ url: cfg.supabaseUrl as string, anonKey: cfg.supabaseAnonKey as string });
  const remoto = new RepositorioSupabase({
    url: cfg.supabaseUrl as string,
    anonKey: cfg.supabaseAnonKey as string,
    obterToken: () => auth.obterToken(),
    tenant: () => escopoTenant(auth.sessaoAtual()),
  });
  const repo = criarRepositorioSincronizado(criarRepositorio(), remoto);
  return {
    auth,
    repo,
    proxyIA: proxyIndisponivel("ProxyIA ainda não configurado neste build — degradando para o provedor simulado."),
  };
}

/**
 * Seleção do adaptador por config (06-01/06-06). A config vem LAZY do
 * ambiente (window.PIPOCA_CONFIG via pipoca.config.js) quando não é passada.
 */
export function obterBackend(config?: ConfigBackend): Backend {
  const cfg = config || configDoAmbiente();
  if (cfg.provedor === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    return criarBackendSupabase(cfg);
  }
  if (cfg.provedor === "firebase") return criarBackendFirebase();
  return criarBackendLocal();
}
