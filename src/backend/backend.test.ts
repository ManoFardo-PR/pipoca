/**
 * Pipoca — Testes da fase06 (backend trocável) · `bun run src/backend/backend.test.ts`
 * -------------------------------------------------------------------------------------
 * Grupos por doc: config/fachada (06-01/06-06) · escopoTenant (06-04) ·
 * auth (06-02) · repositórios/sync (06-03) · proxy (06-05).
 * 100% OFFLINE: storage fake global + Transporte fake (padrão da fase05).
 */

import { CONFIG_LOCAL, configDoAmbiente, normalizarConfigBackend } from "./config.js";
import { escopoTenant } from "./tenant.js";
import { criarAuthLocal, criarBackendLocal, espelharConfigIA, obterBackend } from "./backend.js";
import { CHAVE_SESSAO_BACKEND, criarAuthSupabase } from "./adaptadores/auth_supabase.js";
import { RepositorioSupabase } from "./adaptadores/repo_supabase.js";
import { RepositorioLocalStorage } from "./adaptadores/repo_local.js";
import {
  adicionarTombstone,
  CHAVE_TOMBSTONES,
  criarRepositorioSincronizado,
  lerTombstones,
} from "./adaptadores/repo_sincronizado.js";
import { sincronizarInicial } from "./sync.js";
import { migrar } from "./migracao.js";
import { criarProxyIA, provedorViaProxy } from "./proxy_ia.js";
import { criarOrquestrador } from "../ia/orquestrador.js";
import type { RepositorioPersistencia } from "../core/persistencia/index.js";
import { criarPerfil, type Perfil } from "../core/perfil.js";
import { estadoInicial, type EstadoApp, type EventoTelemetria } from "../core/estado.js";
import { criarEvento } from "../core/telemetria.js";
import type { Transporte } from "../ia/provedor.js";

// ─── storage fake GLOBAL (conta_repo/criarRepositorioAdmin leem localStorage) ─
class ArmazemMem {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  limpar(): void {
    this.m.clear();
  }
  chaves(): string[] {
    return [...this.m.keys()];
  }
  dump(): string {
    return JSON.stringify([...this.m.entries()]);
  }
}
const armazem = new ArmazemMem();
(globalThis as unknown as { localStorage: unknown }).localStorage = armazem;

let passou = 0;
let falhou = 0;
function assert(condicao: boolean, mensagem: string): void {
  if (condicao) {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  } else {
    console.error(`  ✗ ${mensagem}`);
    falhou++;
  }
}

console.log("\n=== ConfigBackend (06-06) — normalização fail-safe ===");
{
  assert(normalizarConfigBackend(null).provedor === "local", "null → local");
  assert(normalizarConfigBackend({}).provedor === "local", "objeto vazio → local");
  assert(normalizarConfigBackend({ provedor: "supabase" }).provedor === "local", "supabase SEM url/anon → local (fail-safe)");
  const ok = normalizarConfigBackend({ provedor: "supabase", supabaseUrl: "https://x.supabase.co/", supabaseAnonKey: "anon" });
  assert(ok.provedor === "supabase" && ok.supabaseUrl === "https://x.supabase.co", "supabase completo → supabase (barra final aparada)");
  assert(normalizarConfigBackend({ provedor: "firebase" }).provedor === "firebase", "firebase → firebase (stub)");
  assert(normalizarConfigBackend({ provedor: "marciano" }).provedor === "local", "provedor desconhecido → local");
  assert(CONFIG_LOCAL.provedor === "local", "CONFIG_LOCAL é local");

  const g = globalThis as unknown as { PIPOCA_CONFIG?: unknown };
  delete g.PIPOCA_CONFIG;
  assert(configDoAmbiente().provedor === "local", "ambiente sem PIPOCA_CONFIG → local");
  g.PIPOCA_CONFIG = { provedor: "supabase", supabaseUrl: "https://y.supabase.co", supabaseAnonKey: "k" };
  assert(configDoAmbiente().provedor === "supabase", "leitura é LAZY: config setada depois do load é vista");
  delete g.PIPOCA_CONFIG;
}

console.log("\n=== escopoTenant (06-04) ===");
{
  assert(escopoTenant(null) === null, "sem sessão → null");
  assert(escopoTenant({ uid: "u1", tipo: "familia" }) === "familia:u1", "família sem tenant → tenant sintético familia:<uid>");
  assert(escopoTenant({ uid: "u1", tipo: "familia", tenantId: "ten_x" }) === "ten_x", "tenantId explícito vence");
  assert(escopoTenant({ uid: "op", tipo: "superadmin" }) === null, "superadmin sem tenant próprio → null");
}

console.log("\n=== obterBackend (06-01) — fachada e adaptador local ===");
{
  armazem.limpar();
  const b = obterBackend({ provedor: "local" });
  assert(!!b.auth && !!b.repo && !!b.proxyIA, "fachada devolve { auth, repo, proxyIA }");

  let proxyRejeitou = false;
  await b.proxyIA.gerar({ prompt: "x", schema: {} }).catch(() => {
    proxyRejeitou = true;
  });
  assert(proxyRejeitou, "proxyIA local rejeita limpo (orquestrador degrada p/ simulado)");

  // config supabase → adaptadores REST reais (sem sessão em storage → null; sem rede aqui)
  const bSupa = obterBackend({ provedor: "supabase", supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "k" });
  assert(!!bSupa.auth && bSupa.auth.sessaoAtual() === null && typeof bSupa.repo.carregarPerfis === "function", "config supabase → backend supabase montado, sem sessão no boot limpo");

  const bFire = obterBackend({ provedor: "firebase" });
  let fireErro = "";
  await bFire.auth.entrarFamilia({ email: "a@b.c", senha: "x" }).catch((e: Error) => {
    fireErro = e.message;
  });
  assert(/não configurado/i.test(fireErro), "firebase é stub honesto: erro limpo de não configurado");
  assert(bFire.auth.sessaoAtual() === null, "firebase stub: sessaoAtual null");
}

console.log("\n=== auth LOCAL (06-02) — delega ao stub da família + credencial do operador ===");
{
  armazem.limpar();
  const auth = criarBackendLocal().auth;

  assert(auth.sessaoAtual() === null, "sem nada no storage → sessaoAtual null");

  let erroFormato = "";
  await auth.entrarFamilia({ email: "sem-arroba", senha: "123" }).catch((e: Error) => {
    erroFormato = e.message;
  });
  assert(erroFormato.length > 0, "e-mail inválido → rejeita com mensagem do stub");

  const fam = await auth.entrarFamilia({ email: "casa@pipoca.dev", senha: "segredo" });
  assert(fam.tipo === "familia" && fam.uid.indexOf("fam_") === 0, "login família → SessaoAuth tipo familia");
  assert(armazem.getItem("pipoca.conta.v1") !== null && armazem.getItem("pipoca.sessao-conta.v1") !== null, "espelhos locais gravados (conta + sessão)");
  assert(armazem.dump().indexOf("segredo") < 0, "a senha NUNCA aparece no storage");
  const s1 = auth.sessaoAtual();
  assert(!!s1 && s1.tipo === "familia" && s1.uid === fam.uid, "sessaoAtual() sync devolve a sessão da família");

  await auth.sair();
  assert(auth.sessaoAtual() === null, "sair() limpa a sessão da família");
  assert(armazem.getItem("pipoca.conta.v1") !== null, "…mas preserva a conta cadastrada (logout ≠ apagar)");

  const admin = await auth.entrarSuperAdmin({ email: "operador@pipoca.dev", senha: "mvp-local" });
  assert(admin.tipo === "superadmin", "1º uso do operador semeia credencial → SessaoAuth tipo superadmin");
  const s2 = auth.sessaoAtual();
  assert(!!s2 && s2.tipo === "superadmin", "sessaoAtual().tipo separa operador de família (critério 06-02)");
  await auth.sair();
  assert(auth.sessaoAtual() === null && armazem.getItem("pipoca.admin.credencial.v1") !== null, "sair() do operador limpa a sessão e preserva a credencial");
}

// ─── Etapa 2 · Auth Supabase via GoTrue REST (06-02) ─────────────────────────

interface RotaFake {
  casa: (url: string, metodo: string) => boolean;
  responder: (corpo: unknown) => { status: number; json: unknown };
}

function transporteRotas(rotas: RotaFake[]) {
  const chamadas: Array<{ url: string; metodo: string; corpo: unknown; headers: Record<string, string> }> = [];
  const t: Transporte = async (url, init) => {
    const corpo = init.body ? (JSON.parse(init.body) as unknown) : null;
    chamadas.push({ url, metodo: init.method, corpo, headers: init.headers });
    for (const r of rotas) {
      if (r.casa(url, init.method)) {
        const res = r.responder(corpo);
        return { status: res.status, json: async () => res.json };
      }
    }
    return { status: 404, json: async () => ({}) };
  };
  return { t, chamadas };
}

const URL_SUPA = "https://proj.supabase.co";
const SESSAO_OK = {
  access_token: "tok1",
  refresh_token: "ref1",
  expires_in: 3600,
  user: { id: "uid-1", email: "casa@pipoca.dev" },
};

console.log("\n=== auth Supabase (06-02) — login da família ===");
{
  armazem.limpar();
  let relogio = 1_750_000_000_000;
  const { t, chamadas } = transporteRotas([
    { casa: (u, m) => u.indexOf("grant_type=password") >= 0 && m === "POST", responder: () => ({ status: 200, json: SESSAO_OK }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t, agora: () => relogio });

  const s = await auth.entrarFamilia({ email: "Casa@Pipoca.dev", senha: "segredo123" });
  assert(s.tipo === "familia" && s.uid === "uid-1", "password grant ok → SessaoAuth familia com uid do GoTrue");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) !== null, "tokens gravados em pipoca.backend.sessao.v1");
  assert(armazem.getItem("pipoca.conta.v1") !== null && armazem.getItem("pipoca.sessao-conta.v1") !== null, "espelhos locais gravados (boot síncrono não muda)");
  assert(armazem.dump().indexOf("segredo123") < 0, "senha nunca aparece no storage");
  const h = chamadas[0]!.headers;
  assert(h["apikey"] === "anon-k" && !("Authorization" in h), "chamada de login leva apikey (pública) e NENHUM bearer/segredo");
  assert(JSON.stringify(h).toLowerCase().indexOf("service") < 0, "nenhuma service key no cliente");

  const atual = auth.sessaoAtual();
  assert(!!atual && atual.tipo === "familia" && atual.uid === "uid-1", "sessaoAtual() é síncrona e devolve a sessão");
  const nChamadas = chamadas.length;
  const tok = await auth.obterToken();
  assert(tok === "tok1" && chamadas.length === nChamadas, "obterToken com token válido não vai à rede");

  relogio += 31 * 86_400_000; // janela de 30 dias vencida
  assert(auth.sessaoAtual() === null, "sessão além da janela → sessaoAtual null (fail-closed)");
}

console.log("\n=== auth Supabase — refresh sob demanda ===");
{
  armazem.limpar();
  let relogio = 1_750_000_000_000;
  const { t, chamadas } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
    { casa: (u) => u.indexOf("grant_type=refresh_token") >= 0, responder: () => ({ status: 200, json: { ...SESSAO_OK, access_token: "tok2", refresh_token: "ref2" } }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t, agora: () => relogio });
  await auth.entrarFamilia({ email: "casa@pipoca.dev", senha: "x1" });

  relogio += 2 * 3_600_000; // access_token venceu, sessão ainda válida
  const tok = await auth.obterToken();
  assert(tok === "tok2", "token vencido → refresh renova e devolve o novo");
  assert((armazem.getItem(CHAVE_SESSAO_BACKEND) || "").indexOf("tok2") >= 0, "refresh REGRAVA o espelho (repo relê a cada request)");
  assert(chamadas.some((c) => c.url.indexOf("grant_type=refresh_token") >= 0), "refresh de fato foi à rota certa");
}

console.log("\n=== auth Supabase — refresh recusado limpa a sessão ===");
{
  armazem.limpar();
  let relogio = 1_750_000_000_000;
  const { t } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
    { casa: (u) => u.indexOf("grant_type=refresh_token") >= 0, responder: () => ({ status: 401, json: { error: "invalid" } }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t, agora: () => relogio });
  await auth.entrarFamilia({ email: "casa@pipoca.dev", senha: "x1" });
  relogio += 2 * 3_600_000;
  const tok = await auth.obterToken();
  assert(tok === null, "refresh recusado → sem token");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) === null && armazem.getItem("pipoca.sessao-conta.v1") === null, "sessão morta limpa backend + espelho da família (fail-closed)");
}

console.log("\n=== auth Supabase — 1º uso (signup) e erros neutros ===");
{
  armazem.limpar();
  const { t } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 400, json: { error: "invalid_grant" } }) },
    { casa: (u) => u.indexOf("/auth/v1/signup") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t });
  const s = await auth.entrarFamilia({ email: "nova@pipoca.dev", senha: "x1" });
  assert(s.tipo === "familia", "credencial inexistente → signup automático (1º uso, espelha o stub)");

  armazem.limpar();
  const { t: tPend } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 400, json: {} }) },
    { casa: (u) => u.indexOf("/auth/v1/signup") >= 0, responder: () => ({ status: 200, json: { user: { id: "u2" } } }) },
  ]);
  let msgPend = "";
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tPend })
    .entrarFamilia({ email: "pendente@x.dev", senha: "x1" })
    .catch((e: Error) => {
      msgPend = e.message;
    });
  assert(/confirme o e-mail/i.test(msgPend), "signup sem sessão (confirmação ligada) → mensagem clara");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) === null, "…e nenhuma sessão fica para trás");

  const { t: tFalha } = transporteRotas([
    { casa: () => true, responder: () => ({ status: 400, json: {} }) },
  ]);
  let msgNeutra = "";
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tFalha })
    .entrarFamilia({ email: "x@y.z", senha: "errada" })
    .catch((e: Error) => {
      msgNeutra = e.message;
    });
  assert(/não foi possível entrar/i.test(msgNeutra), "login+signup falham → erro NEUTRO (não distingue e-mail de senha)");
}

console.log("\n=== auth Supabase — criar conta explícita + recuperar/redefinir senha ===");
{
  armazem.limpar();
  const { t, chamadas } = transporteRotas([
    { casa: (u) => u.indexOf("/auth/v1/signup") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
    { casa: (u) => u.indexOf("/auth/v1/recover") >= 0, responder: () => ({ status: 200, json: {} }) },
    { casa: (u, m) => u.indexOf("/auth/v1/user") >= 0 && m === "PUT", responder: () => ({ status: 200, json: { id: "uid-1" } }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t });

  const criada = await auth.criarFamilia!({ email: "Nova@Casa.dev", senha: "segredo123" });
  assert(!!criada && criada.tipo === "familia" && criada.uid === "uid-1", "criarFamilia com sessão → SessaoAuth familia");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) !== null && armazem.getItem("pipoca.conta.v1") !== null, "cadastro grava tokens + espelhos (igual ao login)");
  assert(chamadas.some((c) => c.url.indexOf("/auth/v1/signup") >= 0), "cadastro usa a rota de signup do GoTrue");

  // senha curta barra ANTES da rede, com mensagem clara
  const nAntes = chamadas.length;
  let msgCurta = "";
  await auth.criarFamilia!({ email: "a@b.c", senha: "12345" }).catch((e: Error) => { msgCurta = e.message; });
  assert(/6 caracteres/.test(msgCurta) && chamadas.length === nAntes, "senha < 6 → erro claro SEM ir à rede");

  // confirmação de e-mail ligada: user sem sessão → null, nada gravado
  armazem.limpar();
  const { t: tPend } = transporteRotas([
    { casa: (u) => u.indexOf("/auth/v1/signup") >= 0, responder: () => ({ status: 200, json: { user: { id: "u9" } } }) },
  ]);
  const pend = await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tPend })
    .criarFamilia!({ email: "pend@x.dev", senha: "segredo123" });
  assert(pend === null && armazem.getItem(CHAVE_SESSAO_BACKEND) === null, "confirmação pendente → null e NENHUMA sessão gravada");

  // recuperar senha: rota certa com apikey, e NUNCA lança (nem com a rede morta)
  await auth.recuperarSenha!("Quem@Esqueceu.dev");
  const rec = chamadas.find((c) => c.url.indexOf("/auth/v1/recover") >= 0);
  assert(!!rec && (rec.corpo as { email?: string }).email === "quem@esqueceu.dev" && rec.headers["apikey"] === "anon-k", "recuperarSenha → POST /recover com e-mail normalizado + apikey");
  const { t: tMorto } = transporteRotas([]);
  let lancou = false;
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tMorto })
    .recuperarSenha!("x@y.dev")
    .catch(() => { lancou = true; });
  assert(!lancou, "recuperarSenha é neutra: rede falhando não vaza erro pra tela");

  // redefinir senha: PUT /user com o bearer do LINK de recuperação
  await auth.redefinirSenha!("tok-recovery", "novaSenha9");
  const red = chamadas.find((c) => c.url.indexOf("/auth/v1/user") >= 0 && c.metodo === "PUT");
  assert(!!red && red.headers["Authorization"] === "Bearer tok-recovery", "redefinirSenha usa o token de recuperação como bearer");
  const { t: t401 } = transporteRotas([
    { casa: (u, m) => u.indexOf("/auth/v1/user") >= 0 && m === "PUT", responder: () => ({ status: 401, json: {} }) },
  ]);
  let msgVencido = "";
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t401 })
    .redefinirSenha!("tok-velho", "novaSenha9")
    .catch((e: Error) => { msgVencido = e.message; });
  assert(/venceu/i.test(msgVencido), "link vencido/recusado → mensagem clara para pedir novo link");

  // adaptador LOCAL: cadastro explícito delega ao stub (cria conta + sessão)
  armazem.limpar();
  const local = criarAuthLocal();
  const sLocal = await local.criarFamilia!({ email: "casa-nova@pipoca.dev", senha: "segredo" });
  assert(!!sLocal && sLocal.tipo === "familia" && local.sessaoAtual() !== null, "local: criarFamilia delega ao stub (conta + sessão na hora)");
  let lancouLocal = false;
  await local.recuperarSenha!("casa-nova@pipoca.dev").catch(() => { lancouLocal = true; });
  assert(!lancouLocal, "local: recuperarSenha resolve neutro (sem servidor de e-mail)");
}

console.log("\n=== auth Supabase — sair ===");
{
  armazem.limpar();
  const { t, chamadas } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
    { casa: (u) => u.indexOf("/auth/v1/logout") >= 0, responder: () => ({ status: 204, json: {} }) },
  ]);
  const auth = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: t });
  await auth.entrarFamilia({ email: "casa@pipoca.dev", senha: "x1" });
  await auth.sair();
  const logout = chamadas.find((c) => c.url.indexOf("/auth/v1/logout") >= 0);
  assert(!!logout && logout.headers["Authorization"] === "Bearer tok1", "logout avisa o servidor com o bearer");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) === null && armazem.getItem("pipoca.sessao-conta.v1") === null, "sair limpa tokens + espelho da sessão");
  assert(armazem.getItem("pipoca.conta.v1") !== null, "a conta cadastrada permanece (logout ≠ apagar)");
}

console.log("\n=== auth Supabase — operador (06-02) ===");
{
  armazem.limpar();
  const comOperador = (linhas: unknown[]) =>
    transporteRotas([
      { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 200, json: SESSAO_OK }) },
      { casa: (u) => u.indexOf("/rest/v1/operadores") >= 0, responder: () => ({ status: 200, json: linhas }) },
      { casa: (u) => u.indexOf("/auth/v1/logout") >= 0, responder: () => ({ status: 204, json: {} }) },
    ]);

  const { t: tOp } = comOperador([{ uid: "uid-1", escopo: "todos" }]);
  const authOp = criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tOp });
  const op = await authOp.entrarSuperAdmin({ email: "op@pipoca.dev", senha: "x1" });
  assert(op.tipo === "superadmin" && op.uid === "uid-1", "login + linha em operadores → tipo superadmin");
  const atual = authOp.sessaoAtual();
  assert(!!atual && atual.tipo === "superadmin", "sessaoAtual().tipo separa operador de família (critério 06-02)");

  armazem.limpar();
  const { t: tNaoOp } = comOperador([]);
  let msgNaoOp = "";
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tNaoOp })
    .entrarSuperAdmin({ email: "intruso@x.dev", senha: "x1" })
    .catch((e: Error) => {
      msgNaoOp = e.message;
    });
  assert(/não foi possível entrar/i.test(msgNaoOp), "logado mas SEM linha de operador → erro neutro");
  assert(armazem.getItem(CHAVE_SESSAO_BACKEND) === null, "…e nenhuma sessão fica para trás");

  const { t: tErrada, chamadas: chErrada } = transporteRotas([
    { casa: (u) => u.indexOf("grant_type=password") >= 0, responder: () => ({ status: 400, json: {} }) },
  ]);
  let msgErrada = "";
  await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tErrada })
    .entrarSuperAdmin({ email: "op@x.dev", senha: "errada" })
    .catch((e: Error) => {
      msgErrada = e.message;
    });
  assert(/não foi possível entrar/i.test(msgErrada), "senha errada do operador → erro neutro");
  assert(!chErrada.some((c) => c.url.indexOf("/signup") >= 0), "operador NUNCA nasce por signup automático");

  armazem.limpar();
  const { t: tEscopo } = comOperador([{ uid: "uid-1", escopo: ["ten_escola"] }]);
  const opEscopo = await criarAuthSupabase({ url: URL_SUPA, anonKey: "anon-k", transporte: tEscopo }).entrarSuperAdmin({ email: "op@x.dev", senha: "x1" });
  assert(opEscopo.tenantId === "ten_escola", "escopo restrito vira tenantId na SessaoAuth");
}

// ─── Etapa 3 · Repo Supabase (PostgREST) + sincronizado + sync (06-03) ───────

/** PostgREST fake COM ESTADO: upsert/select/delete nas 3 tabelas. */
function servidorSupabaseFake() {
  const perfis = new Map<string, { id: string; tenant_id?: string; dados: unknown }>();
  const saves = new Map<string, { perfil_id: string; dados: unknown }>();
  const telemetria: Array<{ perfil_id: string; evento: unknown }> = [];
  const chamadas: Array<{ url: string; metodo: string; headers: Record<string, string> }> = [];
  const ok = (json: unknown, status = 200) => ({ status, json: async () => json });

  const t: Transporte = async (url, init) => {
    chamadas.push({ url, metodo: init.method, headers: init.headers });
    const u = new URL(url);
    const tabela = u.pathname.split("/").pop() || "";
    const corpo = init.body ? (JSON.parse(init.body) as unknown) : null;
    const eq = (param: string): string | null => {
      const v = u.searchParams.get(param);
      return v && v.indexOf("eq.") === 0 ? v.slice(3) : null;
    };
    if (init.method === "GET") {
      if (tabela === "perfis") return ok([...perfis.values()].map((r) => ({ dados: r.dados })));
      if (tabela === "saves") {
        const id = eq("perfil_id");
        const r = id ? saves.get(id) : undefined;
        return ok(r ? [{ dados: r.dados }] : []);
      }
      if (tabela === "telemetria") {
        const id = eq("perfil_id");
        return ok(telemetria.filter((x) => x.perfil_id === id).map((x) => ({ evento: x.evento })));
      }
    }
    if (init.method === "POST") {
      const linhas = (Array.isArray(corpo) ? corpo : [corpo]) as Array<Record<string, unknown>>;
      if (tabela === "perfis") for (const l of linhas) perfis.set(l["id"] as string, l as never);
      if (tabela === "saves") for (const l of linhas) saves.set(l["perfil_id"] as string, l as never);
      if (tabela === "telemetria") for (const l of linhas) telemetria.push(l as never);
      return ok(null, 201);
    }
    if (init.method === "DELETE") {
      if (tabela === "perfis") {
        const id = eq("id");
        if (id) perfis.delete(id);
      }
      if (tabela === "saves") {
        const id = eq("perfil_id");
        if (id) saves.delete(id);
      }
      if (tabela === "telemetria") {
        const id = eq("perfil_id");
        for (let i = telemetria.length - 1; i >= 0; i--) if (telemetria[i]!.perfil_id === id) telemetria.splice(i, 1);
      }
      return ok(null, 204);
    }
    return ok({}, 404);
  };
  return { t, perfis, saves, telemetria, chamadas };
}

/** Repo em memória com espião de chamadas (p/ sincronizado/sync). */
function repoMem(nome: string) {
  const perfis = new Map<string, Perfil>();
  const saves = new Map<string, EstadoApp>();
  const eventos: EventoTelemetria[] = [];
  const chamadas: string[] = [];
  let falhar = false;
  const repo: RepositorioPersistencia = {
    async carregarPerfis() {
      chamadas.push(nome + ".carregarPerfis");
      if (falhar) throw new Error("offline");
      return [...perfis.values()];
    },
    async salvarPerfil(p) {
      chamadas.push(nome + ".salvarPerfil:" + p.id);
      if (falhar) throw new Error("offline");
      perfis.set(p.id, { ...p });
    },
    async carregarSave(id) {
      chamadas.push(nome + ".carregarSave:" + id);
      if (falhar) throw new Error("offline");
      return saves.get(id) || null;
    },
    async salvarSave(id, e) {
      chamadas.push(nome + ".salvarSave:" + id);
      if (falhar) throw new Error("offline");
      saves.set(id, e);
    },
    async registrarTelemetria(ev) {
      chamadas.push(nome + ".registrarTelemetria");
      if (falhar) throw new Error("offline");
      eventos.push(ev);
    },
    async carregarTelemetria(id) {
      chamadas.push(nome + ".carregarTelemetria:" + id);
      if (falhar) throw new Error("offline");
      return eventos.filter((e) => e.perfilId === id);
    },
    async apagarPerfil(id) {
      chamadas.push(nome + ".apagarPerfil:" + id);
      if (falhar) throw new Error("offline");
      perfis.delete(id);
      saves.delete(id);
    },
  };
  return { repo, perfis, saves, eventos, chamadas, setFalhar: (f: boolean) => (falhar = f) };
}

const PERFIL_A = criarPerfil("p-aaa", { nome: "Aline", idade: 7, nivel: "n2", avatarId: "lua" });
const PERFIL_B = criarPerfil("p-bbb", { nome: "Bento", idade: 9, nivel: "n3", avatarId: "pingo" });

console.log("\n=== repo Supabase (06-03) — PostgREST via REST ===");
{
  const srv = servidorSupabaseFake();
  const tokens = ["tokA", "tokB", "tokC", "tokD", "tokE", "tokF", "tokG", "tokH", "tokI", "tokJ"];
  let nTok = 0;
  const repo = new RepositorioSupabase({
    url: "https://proj.supabase.co",
    anonKey: "anon-k",
    obterToken: async () => tokens[Math.min(nTok++, tokens.length - 1)] as string,
    tenant: () => "familia:uid-1",
    transporte: srv.t,
  });

  await repo.salvarPerfil(PERFIL_A);
  const primeira = srv.chamadas[0]!;
  assert(primeira.url.indexOf("/rest/v1/perfis?on_conflict=id") >= 0, "salvarPerfil faz upsert com on_conflict=id");
  assert((primeira.headers["Prefer"] || "").indexOf("merge-duplicates") >= 0, "Prefer resolution=merge-duplicates no upsert");
  assert(primeira.headers["Authorization"] === "Bearer tokA" && primeira.headers["apikey"] === "anon-k", "request autenticada com bearer + apikey");
  const linhaPerfil = srv.perfis.get("p-aaa")!;
  assert(!("dono" in linhaPerfil), "coluna dono NUNCA é enviada (default auth.uid() + RLS fecham spoofing)");
  assert(linhaPerfil.tenant_id === "familia:uid-1", "tenant_id aplicado por escopoTenant");

  const perfis = await repo.carregarPerfis();
  assert(perfis.length === 1 && perfis[0]!.nome === "Aline", "round-trip do perfil (envelope revalidado na leitura)");
  const segunda = srv.chamadas[1]!;
  assert(segunda.headers["Authorization"] === "Bearer tokB", "token é RELIDO a cada request (nunca capturado em closure)");

  await repo.salvarSave("p-aaa", estadoInicial);
  const save = await repo.carregarSave("p-aaa");
  assert(!!save && save.tela === estadoInicial.tela, "round-trip do save (envelope pipoca.save.v1)");
  assert((await repo.carregarSave("p-inexistente")) === null, "save inexistente → null");

  const ev = criarEvento("sessao_iniciada", "p-aaa", { blocoMin: 15 }, 1_750_000_000_000);
  await repo.registrarTelemetria(ev);
  const eventos = await repo.carregarTelemetria("p-aaa");
  assert(eventos.length === 1 && eventos[0]!.tipo === "sessao_iniciada", "round-trip da telemetria (validada na leitura)");

  srv.perfis.set("corrompido", { id: "corrompido", dados: { esquema: "outro", perfil: null } });
  const soValidos = await repo.carregarPerfis();
  assert(soValidos.length === 1, "envelope corrompido no servidor é descartado em silêncio");
  srv.perfis.delete("corrompido");

  await repo.apagarPerfil("p-aaa");
  assert(!srv.perfis.has("p-aaa") && !srv.saves.has("p-aaa") && srv.telemetria.length === 0, "apagarPerfil (LGPD) limpa as 3 tabelas no servidor");

  let semSessao = false;
  const repoSemToken = new RepositorioSupabase({ url: "https://x.supabase.co", anonKey: "k", obterToken: async () => null, transporte: srv.t });
  await repoSemToken.salvarPerfil(PERFIL_A).catch(() => {
    semSessao = true;
  });
  assert(semSessao, "sem sessão → operação remota rejeita (o sincronizado engole)");
}

console.log("\n=== migrar(local → supabase) preserva perfis/saves (critério 06-03) ===");
{
  armazem.limpar();
  const local = new RepositorioLocalStorage();
  await local.salvarPerfil(PERFIL_A);
  await local.salvarPerfil(PERFIL_B);
  await local.salvarSave("p-aaa", estadoInicial);
  const srv = servidorSupabaseFake();
  const remoto = new RepositorioSupabase({ url: "https://proj.supabase.co", anonKey: "k", obterToken: async () => "tok", transporte: srv.t });
  const res = await migrar(local, remoto);
  assert(res.perfis === 2 && res.saves === 1, "migrar copia 2 perfis + 1 save");
  assert(srv.perfis.has("p-aaa") && srv.perfis.has("p-bbb") && srv.saves.has("p-aaa"), "dados chegam às tabelas remotas");
}

console.log("\n=== repo sincronizado (06-03) — local base + espelho fail-soft ===");
{
  armazem.limpar();
  const local = repoMem("local");
  const remoto = repoMem("remoto");
  const sinc = criarRepositorioSincronizado(local.repo, remoto.repo);

  await sinc.salvarPerfil(PERFIL_A);
  await new Promise((r) => setTimeout(r, 0)); // deixa o fire-and-forget assentar
  assert(local.perfis.has("p-aaa") && remoto.perfis.has("p-aaa"), "escrita vai ao local E espelha no remoto");

  remoto.setFalhar(true);
  let resolveu = false;
  await sinc.salvarPerfil(PERFIL_B).then(() => {
    resolveu = true;
  });
  await new Promise((r) => setTimeout(r, 0));
  assert(resolveu && local.perfis.has("p-bbb"), "remoto OFFLINE não quebra a escrita (fail-soft, catch explícito)");

  remoto.chamadas.length = 0;
  await sinc.carregarPerfis();
  await sinc.carregarSave("p-aaa");
  assert(remoto.chamadas.length === 0, "leituras vêm SÓ do local (remoto nem é consultado)");

  await sinc.apagarPerfil("p-bbb");
  await new Promise((r) => setTimeout(r, 0));
  assert(!local.perfis.has("p-bbb"), "apagar remove do local na hora");
  assert(lerTombstones().indexOf("p-bbb") >= 0, "remoto offline → TOMBSTONE fica na fila (LGPD não se perde)");

  remoto.setFalhar(false);
  await sinc.apagarPerfil("p-aaa");
  await new Promise((r) => setTimeout(r, 0));
  assert(!remoto.perfis.has("p-aaa") && lerTombstones().indexOf("p-aaa") < 0, "remoto ok → apaga lá e o tombstone sai da fila");
}

console.log("\n=== sincronizarInicial (06-03) — união com preferência local ===");
{
  armazem.limpar();
  const local = repoMem("local");
  const remoto = repoMem("remoto");

  // remoto tem: p-aaa (versão VELHA, nome remoto) + p-bbb (só remoto, com save)
  await remoto.repo.salvarPerfil({ ...PERFIL_A, nome: "Aline Remota Velha" });
  await remoto.repo.salvarPerfil(PERFIL_B);
  await remoto.repo.salvarSave("p-bbb", estadoInicial);
  // local tem: p-aaa EDITADA agora + tombstone de p-ccc (apagada offline)
  await local.repo.salvarPerfil({ ...PERFIL_A, nome: "Aline Editada Local" });
  await remoto.repo.salvarPerfil(criarPerfil("p-ccc", { nome: "Cacau", idade: 5, nivel: "n1", avatarId: "cacau" }));
  adicionarTombstone("p-ccc");

  const res = await sincronizarInicial(local.repo, remoto.repo);
  assert(res.apagadosDrenados === 1 && !remoto.perfis.has("p-ccc"), "tombstone drenado ANTES da puxada (perfil apagado não ressuscita)");
  assert(lerTombstones().length === 0, "fila de tombstones esvaziada");
  assert(local.perfis.get("p-aaa")!.nome === "Aline Editada Local", "id existente localmente NÃO é sobrescrito (local vence)");
  assert(local.perfis.has("p-bbb") && local.saves.has("p-bbb"), "id só remoto é puxado com o save junto");
  assert(remoto.perfis.get("p-aaa")!.nome === "Aline Editada Local", "push local→remoto leva a edição local (upsert)");
  assert(res.puxados === 1 && res.empurrados === 2, "contadores do sync corretos");
  assert(armazem.getItem(CHAVE_TOMBSTONES) === null, "storage de tombstones limpo no fim");
}

// ─── Etapa 5 · ProxyIA cliente (06-05, lado cliente) ─────────────────────────

console.log("\n=== ProxyIA cliente (06-05) — bearer do usuário, servidor decide ===");
{
  armazem.limpar();
  const trechoOk = { texto: "✨ vindo do servidor", ehFinal: false };
  const { t, chamadas } = transporteRotas([
    { casa: (u) => u.indexOf("/functions/v1/proxy-ia") >= 0, responder: () => ({ status: 200, json: trechoOk }) },
  ]);
  const proxy = criarProxyIA({
    url: URL_SUPA,
    anonKey: "anon-k",
    obterToken: async () => "tok-user",
    tenantId: () => "familia:u1",
    transporte: t,
  });
  const trecho = await proxy.gerar({ prompt: "conte a abertura", schema: { type: "object" }, opts: { system: "s" } });
  assert(trecho.texto.indexOf("servidor") >= 0 && trecho.ehFinal === false, "200 → Trecho validado");
  const c = chamadas[0]!;
  assert(c.headers["Authorization"] === "Bearer tok-user" && c.headers["apikey"] === "anon-k", "bearer do USUÁRIO + anon key — nenhuma chave de provedor no cliente");
  const corpo = c.corpo as Record<string, unknown>;
  assert(
    corpo["prompt"] === "conte a abertura" && corpo["tenantId"] === "familia:u1" && !("provedor" in corpo) && !("modelo" in corpo),
    "o cliente NÃO escolhe provedor/modelo (o servidor decide pela config_ia)"
  );

  const { t: t503 } = transporteRotas([{ casa: () => true, responder: () => ({ status: 503, json: { erro: "nao_configurado" } }) }]);
  let degradou = false;
  await criarProxyIA({ url: URL_SUPA, anonKey: "k", obterToken: async () => "tok", transporte: t503 })
    .gerar({ prompt: "x", schema: {} })
    .catch(() => {
      degradou = true;
    });
  assert(degradou, "qualquer não-200 → throw (o orquestrador degrada p/ simulado)");

  const { t: tNunca, chamadas: cNunca } = transporteRotas([{ casa: () => true, responder: () => ({ status: 200, json: trechoOk }) }]);
  let semSessao = false;
  await criarProxyIA({ url: URL_SUPA, anonKey: "k", obterToken: async () => null, transporte: tNunca })
    .gerar({ prompt: "x", schema: {} })
    .catch(() => {
      semSessao = true;
    });
  assert(semSessao && cNunca.length === 0, "sem sessão → rejeita SEM ir à rede");

  const proxyFalho = criarProxyIA({ url: URL_SUPA, anonKey: "k", obterToken: async () => "tok", transporte: t503 });
  const simuladinho = {
    async gerar() {
      return { texto: "✨ do simulado", ehFinal: false };
    },
  };
  const cadeia = criarOrquestrador([provedorViaProxy(proxyFalho), simuladinho]);
  const viaCadeia = await cadeia.gerar("conte a abertura", {});
  assert(viaCadeia.texto.indexOf("simulado") >= 0, "proxy falho na cadeia → simulado atende (a criança nunca fica sem história)");

  const bSupa = obterBackend({ provedor: "supabase", supabaseUrl: URL_SUPA, supabaseAnonKey: "k" });
  let proxySemSessao = false;
  await bSupa.proxyIA.gerar({ prompt: "x", schema: {} }).catch(() => {
    proxySemSessao = true;
  });
  assert(proxySemSessao, "backend supabase SEM sessão → proxy rejeita sem rede (fail-soft)");
}

// ─── Etapa 6 · espelho remoto da ConfigIA (SA_AI → config_ia) ────────────────

console.log("\n=== espelharConfigIA (06-05) — só operador, só supabase ===");
{
  armazem.limpar();
  const cfgSupa = { provedor: "supabase" as const, supabaseUrl: URL_SUPA, supabaseAnonKey: "anon-k" };
  assert((await espelharConfigIA("ten_x", { a: 1 }, { provedor: "local" })) === false, "backend local → no-op silencioso (false)");
  assert((await espelharConfigIA("ten_x", { a: 1 }, cfgSupa)) === false, "sem sessão de operador → NÃO espelha");

  const agora = Date.now();
  armazem.setItem(
    CHAVE_SESSAO_BACKEND,
    JSON.stringify({
      access_token: "tokOp",
      refresh_token: "r1",
      expiraTokenEm: agora + 3_600_000,
      validaAte: agora + 86_400_000,
      uid: "op-1",
      tipo: "superadmin",
    })
  );
  const { t, chamadas } = transporteRotas([
    { casa: (u) => u.indexOf("/rest/v1/config_ia") >= 0, responder: () => ({ status: 201, json: null }) },
  ]);
  const ok = await espelharConfigIA("ten_x", { provedor: "deepseek", cotaMensal: 50 }, cfgSupa, t);
  assert(ok === true && chamadas[0]!.headers["Authorization"] === "Bearer tokOp", "operador logado → upsert em config_ia com o bearer dele");
  assert(chamadas[0]!.url.indexOf("on_conflict=tenant_id") >= 0, "upsert idempotente por tenant_id");
  armazem.limpar();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
