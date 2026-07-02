/**
 * Pipoca — Testes da fase06 (backend trocável) · `bun run src/backend/backend.test.ts`
 * -------------------------------------------------------------------------------------
 * Grupos por doc: config/fachada (06-01/06-06) · escopoTenant (06-04) ·
 * auth (06-02) · repositórios/sync (06-03) · proxy (06-05).
 * 100% OFFLINE: storage fake global + Transporte fake (padrão da fase05).
 */

import { CONFIG_LOCAL, configDoAmbiente, normalizarConfigBackend } from "./config.js";
import { escopoTenant } from "./tenant.js";
import { criarBackendLocal, obterBackend } from "./backend.js";
import { CHAVE_SESSAO_BACKEND, criarAuthSupabase } from "./adaptadores/auth_supabase.js";
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

  // supabase ainda sem adaptadores neste build → degrada p/ local (offline-first)
  const bSupa = obterBackend({ provedor: "supabase", supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "k" });
  assert(!!bSupa.auth && bSupa.auth.sessaoAtual() === null, "config supabase sem adaptadores → backend funcional (local) sem sessão");

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

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
