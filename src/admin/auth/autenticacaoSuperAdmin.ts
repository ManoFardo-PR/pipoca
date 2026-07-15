/**
 * [autenticacaoSuperAdmin.ts] — autentica o operador: núcleo puro avaliarLogin
 *   (semeia credencial no 1º uso, compara hash, atrasa força-bruta) + seam RepositorioAdmin.
 *
 * PAPEL: admin (SA_LOGIN — auth do operador; MVP local, real na fase06)
 * POR QUE EXISTE: dar login ao operador da plataforma numa trilha SEPARADA da
 *   família, com barreira anti força-bruta e sem nunca guardar a senha em claro.
 * ENTRA: email/senha, RegistroCredencial persistido, agora e geradores de
 *   sal/token (injetados); localStorage (chaves "pipoca.admin.credencial.v1" e "…sessao.v1").
 * SAI: RepositorioAdmin (autenticar/carregarSessao/encerrarSessao),
 *   ResultadoAutenticacao, SessaoSuperAdmin, hashSenha/adminIdDoEmail/calcularAtrasoMs.
 * CHAMA: ./tiposAdmin (tipos), ./sessaoSuperAdmin:criarSessaoSuperAdmin.
 * É CHAMADO POR: bridge_admin.ts (PipocaAdminCanonico.auth), ../../backend/backend.ts
 *   (criarRepositorioAdmin), admin.test.ts.
 * RODA POR: boot do admin — bundled em pipoca.admin.bundle.js via `bun run build:admin`.
 * CUIDADO: erro NEUTRO — nunca distingue e-mail de senha (não vazar). A senha
 *   NUNCA é guardada nem retornada (só o hash FNV-1a com sal). É MVP local:
 *   FNV-1a NÃO é cripto; segurança real (senha no servidor, token do backend) é
 *   fase06. Date.now()/aleatório vivem só na borda (criarRepositorioAdmin), nunca
 *   no núcleo puro avaliarLogin.
 *
 * — detalhe preservado —
 * Pipoca — Autenticação do super admin (SA_LOGIN) · doc fase04-04-01
 * -------------------------------------------------------------------
 * Seam `RepositorioAdmin` + núcleo PURO `avaliarLogin` + implementação local (MVP).
 *
 * MVP local (espelha acesso.ts/contaFamilia.ts): 1º uso SEMEIA a credencial do
 * operador (hash FNV-1a com sal; a senha NUNCA é guardada nem retorna); depois
 * compara hash. Erro NEUTRO (não distingue e-mail de senha). Atraso progressivo
 * a partir de MAX_TENTATIVAS_ADMIN falhas (anti força-bruta, calmo).
 * Segurança real (senha só no servidor, token emitido pelo backend) é fase06.
 */

import type {
  CredencialSuperAdmin,
  SessaoSuperAdmin,
  StorageLike,
} from "./tiposAdmin.js";
import { criarSessaoSuperAdmin } from "./sessaoSuperAdmin.js";

/** Seam consumido pelas telas/estadoAdmin (trocável pelo backend na fase06). */
export interface RepositorioAdmin {
  autenticar(email: string, senha: string): Promise<SessaoSuperAdmin | null>;
  carregarSessao(): Promise<SessaoSuperAdmin | null>;
  encerrarSessao(): Promise<void>;
}

export const MAX_TENTATIVAS_ADMIN = 5;
export const ATRASO_BASE_MS = 5_000; // 5s por falha além da janela
export const ATRASO_TETO_MS = 60_000; // teto de 60s

/** Atraso anti força-bruta: 0 abaixo de MAX; depois (n−4)·base, clamp no teto. Puro. */
export function calcularAtrasoMs(tentativas: number): number {
  if (!Number.isFinite(tentativas) || tentativas < MAX_TENTATIVAS_ADMIN) return 0;
  return Math.min((tentativas - (MAX_TENTATIVAS_ADMIN - 1)) * ATRASO_BASE_MS, ATRASO_TETO_MS);
}

/** FNV-1a (32-bit) sobre sal+senha, em hex — mesmo gesto de barreira do acesso.ts. */
export function hashSenha(senha: string, sal: string): string {
  const s = String(sal) + String(senha);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Id opaco e determinístico do operador a partir do e-mail (FNV-1a; não-cripto). */
export function adminIdDoEmail(email: string): string {
  const e = String(email).trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < e.length; i++) {
    h ^= e.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "adm_" + (h >>> 0).toString(16);
}

/** Registro persistido: credencial + contadores da janela de tentativas. */
export interface RegistroCredencial {
  credencial: CredencialSuperAdmin;
  tentativas: number;
  bloqueioAte: number; // epoch ms (0 = livre)
}

export interface ResultadoAutenticacao {
  sessao: SessaoSuperAdmin | null;
  registro: RegistroCredencial | null; // novo estado a persistir (1º uso cria)
  aguardeMs: number; // >0 → atraso progressivo em vigor
}

const FORMATO_EMAIL = /.+@.+\..+/;

/**
 * Núcleo PURO do login. 1º uso (registro null): valida formato, semeia a
 * credencial e emite sessão com escopo "todos" (operador raiz). Depois: compara
 * hash+sal; falha incrementa tentativas e, a partir de MAX, impõe atraso
 * progressivo via `bloqueioAte`. Nunca vê/retorna a senha em claro além dos
 * parâmetros; nunca distingue e-mail de senha no resultado (erro neutro na tela).
 */
export function avaliarLogin(
  registro: RegistroCredencial | null,
  email: string,
  senha: string,
  agora: number,
  gerarSal: () => string,
  gerarToken: () => string
): ResultadoAutenticacao {
  const e = String(email || "").trim().toLowerCase();
  const s = String(senha || "");
  if (!e || !s.trim() || !FORMATO_EMAIL.test(e)) {
    return { sessao: null, registro, aguardeMs: 0 };
  }

  // 1º uso: semeia a credencial (MVP local — aviso visível na tela).
  if (!registro) {
    const sal = gerarSal();
    const novo: RegistroCredencial = {
      credencial: { email: e, senhaHash: hashSenha(s, sal), sal },
      tentativas: 0,
      bloqueioAte: 0,
    };
    return {
      sessao: criarSessaoSuperAdmin(adminIdDoEmail(e), "todos", agora, gerarToken()),
      registro: novo,
      aguardeMs: 0,
    };
  }

  // Atraso progressivo em vigor: recusa sem contar tentativa.
  if (registro.bloqueioAte > 0 && agora < registro.bloqueioAte) {
    return { sessao: null, registro, aguardeMs: registro.bloqueioAte - agora };
  }

  const confere =
    e === registro.credencial.email &&
    hashSenha(s, registro.credencial.sal) === registro.credencial.senhaHash;

  if (confere) {
    return {
      sessao: criarSessaoSuperAdmin(adminIdDoEmail(e), "todos", agora, gerarToken()),
      registro: { ...registro, tentativas: 0, bloqueioAte: 0 },
      aguardeMs: 0,
    };
  }

  const tentativas = registro.tentativas + 1;
  const atraso = calcularAtrasoMs(tentativas);
  return {
    sessao: null,
    registro: { ...registro, tentativas, bloqueioAte: atraso > 0 ? agora + atraso : 0 },
    aguardeMs: atraso,
  };
}

// ─── Borda: implementação local do seam (localStorage; fase06 troca) ─────────

const CHAVE_CREDENCIAL = "pipoca.admin.credencial.v1";
const CHAVE_SESSAO = "pipoca.admin.sessao.v1";

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function lerJson<T>(armazem: StorageLike, chave: string): T | null {
  try {
    const raw = armazem.getItem(chave);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function gravarJson(armazem: StorageLike, chave: string, valor: unknown): void {
  try {
    armazem.setItem(chave, JSON.stringify(valor));
  } catch {
    /* degradação silenciosa (padrão dos stores) */
  }
}

/** Liga o núcleo puro ao storage. `Date.now()`/aleatório vivem SÓ aqui (borda). */
export function criarRepositorioAdmin(armazem?: StorageLike): RepositorioAdmin {
  const st = armazem ?? storagePadrao();
  const aleatorio = () =>
    Math.random().toString(36).slice(2) + (Date.now() % 0xffffff).toString(36);
  return {
    async autenticar(email: string, senha: string): Promise<SessaoSuperAdmin | null> {
      if (!st) return null;
      const registro = lerJson<RegistroCredencial>(st, CHAVE_CREDENCIAL);
      const r = avaliarLogin(registro, email, senha, Date.now(), aleatorio, () => aleatorio() + aleatorio());
      if (r.registro && r.registro !== registro) gravarJson(st, CHAVE_CREDENCIAL, r.registro);
      if (r.sessao) gravarJson(st, CHAVE_SESSAO, r.sessao);
      return r.sessao;
    },
    async carregarSessao(): Promise<SessaoSuperAdmin | null> {
      if (!st) return null;
      const s = lerJson<SessaoSuperAdmin>(st, CHAVE_SESSAO);
      if (!s || typeof s !== "object" || s.papel !== "super_admin") return null;
      return s;
    },
    async encerrarSessao(): Promise<void> {
      if (!st) return;
      try {
        st.removeItem(CHAVE_SESSAO); // só a sessão — a credencial permanece
      } catch {
        /* silencioso */
      }
    },
  };
}
