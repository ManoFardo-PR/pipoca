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

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
