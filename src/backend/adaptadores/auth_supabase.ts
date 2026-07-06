/**
 * Pipoca — Auth Supabase (GoTrue via REST) · doc fase06-06-02
 * ------------------------------------------------------------
 * `ServicoAuth` sobre a API de auth do Supabase SEM SDK: requisições puras
 * pelo `Transporte` injetável (testável offline com fake). Só a anon key
 * (pública) chega ao cliente — RLS protege os dados no servidor.
 *
 * Contrato síncrono de `sessaoAtual()`: a sessão vive ESPELHADA em
 * `pipoca.backend.sessao.v1` (tokens + validade) e, para a família, também
 * nos espelhos locais que o boot do app já lê (`pipoca.conta.v1` /
 * `pipoca.sessao-conta.v1`) — o caminho síncrono do boot não muda.
 * O access_token expira (~1h): `obterToken()` renova sob demanda via
 * refresh_token e REGRAVA o espelho (consumido pelo repo remoto a cada
 * request — nunca capturado em closure).
 *
 * Família: password grant; credencial inexistente → signup automático
 * (espelha o 1º uso do stub; exige "Confirm email" OFF no projeto).
 * Operador: SEM signup automático; além do login, o uid precisa existir na
 * tabela `operadores` (RLS: select próprio) — senão erro NEUTRO e logout.
 */

import type { Transporte } from "../../ia/provedor.js";
import { transportePadrao } from "../../ia/provedor.js";
import { criarSessao, DURACAO_SESSAO_MS } from "../../core/contaFamilia.js";
import { limparSessaoConta, salvarConta, salvarSessaoConta } from "../../servicos/conta_repo.js";
import {
  ERRO_CRIAR_CONTA,
  ERRO_LOGIN_NEUTRO,
  type CredenciaisLogin,
  type ServicoAuth,
  type SessaoAuth,
} from "../auth.js";

export const CHAVE_SESSAO_BACKEND = "pipoca.backend.sessao.v1";
const ERRO_CONFIRMACAO = "Quase lá! Confirme o e-mail que enviamos e tente entrar de novo.";

interface SessaoBackend {
  access_token: string;
  refresh_token: string;
  expiraTokenEm: number; // epoch ms do access_token
  validaAte: number; // janela da sessão (30d) — governa sessaoAtual()
  uid: string;
  tipo: "familia" | "superadmin";
  email?: string;
  tenantId?: string;
}

export interface OpcoesAuthSupabase {
  url: string;
  anonKey: string;
  transporte?: Transporte;
  agora?: () => number;
}

/** ServicoAuth + utilitários que o repo remoto consome (token sob demanda). */
export interface AuthSupabase extends ServicoAuth {
  obterToken(): Promise<string | null>;
  renovarSessao(): Promise<void>;
}

function storage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | null {
  try {
    const g = globalThis as unknown as { localStorage?: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
    return g.localStorage || null;
  } catch {
    return null;
  }
}

function lerSessaoBackend(): SessaoBackend | null {
  const st = storage();
  if (!st) return null;
  try {
    const raw = st.getItem(CHAVE_SESSAO_BACKEND);
    const s = raw ? (JSON.parse(raw) as SessaoBackend) : null;
    if (
      s &&
      typeof s.access_token === "string" &&
      typeof s.refresh_token === "string" &&
      typeof s.uid === "string" &&
      typeof s.validaAte === "number" &&
      (s.tipo === "familia" || s.tipo === "superadmin")
    ) {
      return s;
    }
  } catch {
    /* corrompido → null */
  }
  return null;
}

function gravarSessaoBackend(s: SessaoBackend | null): void {
  const st = storage();
  if (!st) return;
  try {
    if (s) st.setItem(CHAVE_SESSAO_BACKEND, JSON.stringify(s));
    else st.removeItem(CHAVE_SESSAO_BACKEND);
  } catch {
    /* degradação silenciosa */
  }
}

interface RespostaToken {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string } | null;
}

export function criarAuthSupabase(op: OpcoesAuthSupabase): AuthSupabase {
  const transporte = op.transporte || transportePadrao();
  const agora = op.agora || (() => Date.now());
  const base = op.url.replace(/\/+$/, "");

  function cabecalhos(bearer?: string): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json", apikey: op.anonKey };
    if (bearer) h["Authorization"] = "Bearer " + bearer;
    return h;
  }

  async function chamarToken(rota: string, corpo: Record<string, unknown>): Promise<RespostaToken | null> {
    const resp = await transporte(base + rota, {
      method: "POST",
      headers: cabecalhos(),
      body: JSON.stringify(corpo),
    });
    if (resp.status !== 200) return null;
    return (await resp.json()) as RespostaToken;
  }

  /** Grava tokens + espelhos a partir de uma resposta de sessão do GoTrue. */
  function assentarSessao(r: RespostaToken, tipo: "familia" | "superadmin", tenantId?: string): SessaoAuth {
    const uid = (r.user && r.user.id) || "";
    const email = (r.user && r.user.email) || undefined;
    const t = agora();
    const sess: SessaoBackend = {
      access_token: r.access_token as string,
      refresh_token: (r.refresh_token as string) || "",
      expiraTokenEm: t + Math.max(30, (r.expires_in || 3600) - 60) * 1000, // margem de 60s
      validaAte: t + DURACAO_SESSAO_MS,
      uid,
      tipo,
      ...(email ? { email } : {}),
      ...(tenantId ? { tenantId } : {}),
    };
    gravarSessaoBackend(sess);
    if (tipo === "familia") {
      // espelhos que o boot síncrono do app já lê (compat total com o stub)
      salvarConta({ id: uid, email: email || "", criadaEm: t });
      salvarSessaoConta(criarSessao(uid, t));
    }
    return { uid, tipo, ...(tenantId ? { tenantId } : {}) };
  }

  /** O uid é operador? (linha em `operadores`, RLS de select próprio). */
  async function linhaDeOperador(uid: string, bearer: string): Promise<{ uid: string; escopo?: unknown } | null> {
    try {
      const resp = await transporte(base + "/rest/v1/operadores?select=uid,escopo&uid=eq." + encodeURIComponent(uid), {
        method: "GET",
        headers: cabecalhos(bearer),
      });
      if (resp.status !== 200) return null;
      const linhas = (await resp.json()) as Array<{ uid: string; escopo?: unknown }>;
      return Array.isArray(linhas) && linhas[0] ? linhas[0] : null;
    } catch {
      return null;
    }
  }

  async function renovar(): Promise<SessaoBackend | null> {
    const atual = lerSessaoBackend();
    if (!atual || !atual.refresh_token) return null;
    const r = await chamarToken("/auth/v1/token?grant_type=refresh_token", { refresh_token: atual.refresh_token });
    if (!r || !r.access_token) {
      // refresh recusado → sessão morta: limpa os espelhos (fail-closed)
      gravarSessaoBackend(null);
      if (atual.tipo === "familia") limparSessaoConta();
      return null;
    }
    const t = agora();
    const nova: SessaoBackend = {
      ...atual,
      access_token: r.access_token,
      refresh_token: (r.refresh_token as string) || atual.refresh_token,
      expiraTokenEm: t + Math.max(30, (r.expires_in || 3600) - 60) * 1000,
      validaAte: t + DURACAO_SESSAO_MS,
    };
    gravarSessaoBackend(nova);
    return nova;
  }

  return {
    async entrarFamilia(cred: CredenciaisLogin): Promise<SessaoAuth> {
      const email = (cred.email || "").trim().toLowerCase();
      const senha = cred.senha || "";
      if (!email || !senha) throw new Error(ERRO_LOGIN_NEUTRO);

      let r = await chamarToken("/auth/v1/token?grant_type=password", { email, password: senha });
      if (!r || !r.access_token) {
        // 1º uso: espelha o stub — cria a conta na hora (signup)
        const s = await chamarToken("/auth/v1/signup", { email, password: senha });
        if (s && s.access_token) r = s;
        else if (s && s.user && !s.access_token) throw new Error(ERRO_CONFIRMACAO);
        else throw new Error(ERRO_LOGIN_NEUTRO);
      }
      return assentarSessao(r, "familia");
    },

    async entrarSuperAdmin(cred: CredenciaisLogin): Promise<SessaoAuth> {
      const email = (cred.email || "").trim().toLowerCase();
      const senha = cred.senha || "";
      if (!email || !senha) throw new Error(ERRO_LOGIN_NEUTRO);

      // operador NUNCA nasce por signup automático
      const r = await chamarToken("/auth/v1/token?grant_type=password", { email, password: senha });
      if (!r || !r.access_token || !r.user || !r.user.id) throw new Error(ERRO_LOGIN_NEUTRO);

      const linha = await linhaDeOperador(r.user.id, r.access_token);
      if (!linha) {
        // logado mas não é operador → erro NEUTRO, sem deixar sessão para trás
        try {
          await transporte(base + "/auth/v1/logout", { method: "POST", headers: cabecalhos(r.access_token), body: "{}" });
        } catch {
          /* melhor esforço */
        }
        throw new Error(ERRO_LOGIN_NEUTRO);
      }
      const escopo = linha.escopo;
      const tenantId = Array.isArray(escopo) && typeof escopo[0] === "string" ? (escopo[0] as string) : undefined;
      return assentarSessao(r, "superadmin", tenantId);
    },

    async criarFamilia(cred: CredenciaisLogin): Promise<SessaoAuth | null> {
      const email = (cred.email || "").trim().toLowerCase();
      const senha = cred.senha || "";
      // GoTrue exige senha >= 6; barra ANTES da rede com a mensagem clara.
      if (!email || !email.includes("@") || senha.length < 6) throw new Error(ERRO_CRIAR_CONTA);

      const s = await chamarToken("/auth/v1/signup", { email, password: senha });
      if (s && s.access_token) return assentarSessao(s, "familia");
      // "Confirm email" ligado: o GoTrue devolve o user SEM sessão (também no
      // e-mail já registrado — resposta ofuscada de propósito, segue neutra).
      if (s && s.user) return null;
      throw new Error(ERRO_CRIAR_CONTA);
    },

    async recuperarSenha(email: string): Promise<void> {
      const e = (email || "").trim().toLowerCase();
      if (!e || !e.includes("@")) return;
      // Melhor esforço e SEMPRE neutro: falha de rede/limite não vaza pra tela.
      try {
        await transporte(base + "/auth/v1/recover", {
          method: "POST",
          headers: cabecalhos(),
          body: JSON.stringify({ email: e }),
        });
      } catch {
        /* neutro por contrato */
      }
    },

    async redefinirSenha(tokenRecuperacao: string, novaSenha: string): Promise<void> {
      if (!tokenRecuperacao) throw new Error("O link de redefinição venceu. Peça um novo e tente de novo.");
      if ((novaSenha || "").length < 6) throw new Error("A nova senha precisa de pelo menos 6 caracteres.");
      const resp = await transporte(base + "/auth/v1/user", {
        method: "PUT",
        headers: cabecalhos(tokenRecuperacao),
        body: JSON.stringify({ password: novaSenha }),
      });
      if (resp.status !== 200) {
        throw new Error("O link de redefinição venceu. Peça um novo e tente de novo.");
      }
    },

    // Trocar a senha LOGADO: mesma rota do redefinir, mas com o bearer da
    // SESSÃO ativa (obterToken renova sob demanda). Senha curta barra sem rede.
    async alterarSenha(novaSenha: string): Promise<void> {
      if ((novaSenha || "").length < 6) throw new Error("A nova senha precisa de pelo menos 6 caracteres.");
      const token = await this.obterToken();
      if (!token) throw new Error("A sessão venceu — entre de novo para trocar a senha.");
      const resp = await transporte(base + "/auth/v1/user", {
        method: "PUT",
        headers: cabecalhos(token),
        body: JSON.stringify({ password: novaSenha }),
      });
      if (resp.status !== 200) throw new Error("Não deu para trocar a senha agora. Tente de novo.");
    },

    // Trocar o e-mail LOGADO: o GoTrue envia confirmação ao NOVO endereço —
    // o e-mail só muda depois do clique (o espelho local segue no login seguinte).
    async alterarEmail(novoEmail: string): Promise<void> {
      const email = (novoEmail || "").trim().toLowerCase();
      if (!email || !email.includes("@")) throw new Error("Confira o novo e-mail, por favor.");
      const token = await this.obterToken();
      if (!token) throw new Error("A sessão venceu — entre de novo para trocar o e-mail.");
      const resp = await transporte(base + "/auth/v1/user", {
        method: "PUT",
        headers: cabecalhos(token),
        body: JSON.stringify({ email }),
      });
      if (resp.status !== 200) throw new Error("Não deu para trocar o e-mail agora. Tente de novo.");
    },

    async sair(): Promise<void> {
      const s = lerSessaoBackend();
      // Espelhos limpos PRIMEIRO (um reload imediato não pode ressuscitar a
      // sessão); o aviso ao servidor é melhor esforço.
      gravarSessaoBackend(null);
      if (!s || s.tipo === "familia") limparSessaoConta();
      if (s) {
        try {
          await transporte(base + "/auth/v1/logout", { method: "POST", headers: cabecalhos(s.access_token), body: "{}" });
        } catch {
          /* melhor esforço — offline não impede o logout local */
        }
      }
    },

    sessaoAtual(): SessaoAuth | null {
      const s = lerSessaoBackend();
      if (!s || s.validaAte <= agora()) return null;
      return { uid: s.uid, tipo: s.tipo, ...(s.tenantId ? { tenantId: s.tenantId } : {}) };
    },

    async obterToken(): Promise<string | null> {
      const s = lerSessaoBackend();
      if (!s || s.validaAte <= agora()) return null;
      if (s.expiraTokenEm > agora()) return s.access_token;
      const nova = await renovar();
      return nova ? nova.access_token : null;
    },

    async renovarSessao(): Promise<void> {
      await renovar();
    },
  };
}
