/**
 * Pipoca — Testes dos núcleos do super admin (fase04)
 * ----------------------------------------------------
 * Auth/sessão/escopo/guard (04-01/02) · tenants (04-03) · conteúdo (04-04) ·
 * IA (04-05) · flags (04-06). Rodam sem DOM: storage fake injetado (bun não
 * tem localStorage). Tempo sempre injetado.
 * Execute com: bun run src/admin/admin.test.ts
 */

import type { StorageLike } from "./auth/tiposAdmin.js";
import {
  criarSessaoSuperAdmin,
  sessaoSuperAdminValida,
  escopoAutoriza,
  areaDisponivel,
  DURACAO_SESSAO_ADMIN_MS,
} from "./auth/sessaoSuperAdmin.js";
import {
  avaliarLogin,
  calcularAtrasoMs,
  hashSenha,
  adminIdDoEmail,
  criarRepositorioAdmin,
  MAX_TENTATIVAS_ADMIN,
  type RegistroCredencial,
} from "./auth/autenticacaoSuperAdmin.js";
import {
  guardarRotaAdmin,
  ROTAS_ADMIN,
  TELA_SA_LOGIN,
  TELA_SA_HOME,
} from "./rotasAdmin.js";

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

/** Storage fake em memória (espelha a interface do localStorage). */
class ArmazemMem implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
  dump(): string { return JSON.stringify([...this.m.entries()]); }
  chaves(): string[] { return [...this.m.keys()]; }
}

const AGORA = 1_750_000_000_000; // epoch ms fixo (tempo injetado)
const sal = () => "sal-fixo";
let _tok = 0;
const token = () => "tok-" + (++_tok);

// ─── auth · avaliarLogin (04-01) ─────────────────────────────────────────────
console.log("\n=== SA_LOGIN · avaliarLogin (1º uso, hash, erro neutro) ===");
{
  const r1 = avaliarLogin(null, "op@pipoca.dev", "segredo123", AGORA, sal, token);
  assert(r1.registro !== null, "1º uso semeia a credencial (registro criado)");
  assert(!!r1.sessao && r1.sessao.escopoTenants === "todos", "1º uso emite sessão com escopo todos (operador raiz)");
  assert(!!r1.sessao && r1.sessao.papel === "super_admin", "papel da sessão é super_admin");
  assert(!JSON.stringify(r1.registro).includes("segredo123"), "senha NUNCA aparece em claro no registro persistido");
  assert(hashSenha("segredo123", "a") === hashSenha("segredo123", "a"), "hashSenha é determinístico");
  assert(hashSenha("segredo123", "a") !== hashSenha("segredo123", "b"), "sal diferente muda o hash");
  assert(adminIdDoEmail("Op@Pipoca.dev ") === adminIdDoEmail("op@pipoca.dev"), "adminId determinístico e normalizado do e-mail");
  assert(!!r1.sessao && r1.sessao.token.length > 0, "token da sessão não é vazio");

  const reg = r1.registro as RegistroCredencial;
  const ok = avaliarLogin(reg, "op@pipoca.dev", "segredo123", AGORA + 1000, sal, token);
  assert(!!ok.sessao, "senha certa → sessão emitida");
  assert(!!r1.sessao && !!ok.sessao && r1.sessao.token !== ok.sessao.token, "tokens diferem entre sessões");

  const err = avaliarLogin(reg, "op@pipoca.dev", "errada", AGORA + 2000, sal, token);
  assert(err.sessao === null, "senha errada → sem sessão (erro neutro fica na tela)");
  assert(err.registro !== null && err.registro.tentativas === 1, "senha errada incrementa tentativas");

  const fmt = avaliarLogin(null, "sem-arroba", "x", AGORA, sal, token);
  assert(fmt.sessao === null && fmt.registro === null, "e-mail sem formato não semeia credencial");
}

// ─── auth · atraso progressivo (04-01) ───────────────────────────────────────
console.log("\n=== SA_LOGIN · atraso progressivo (anti força-bruta) ===");
{
  assert(calcularAtrasoMs(0) === 0 && calcularAtrasoMs(4) === 0, "abaixo de MAX não há atraso");
  assert(calcularAtrasoMs(5) === 5_000, "5ª falha → 5s");
  assert(calcularAtrasoMs(6) === 10_000, "6ª falha → 10s (progressivo)");
  assert(calcularAtrasoMs(50) === 60_000, "atraso tem teto de 60s");

  let reg: RegistroCredencial | null = avaliarLogin(null, "op@pipoca.dev", "certa", AGORA, sal, token).registro;
  let aguarde = 0;
  for (let i = 0; i < MAX_TENTATIVAS_ADMIN; i++) {
    const r = avaliarLogin(reg, "op@pipoca.dev", "errada" + i, AGORA + i, sal, token);
    reg = r.registro;
    aguarde = r.aguardeMs;
  }
  assert(aguarde > 0, "a partir da 5ª falha aguardeMs > 0");
  const bloq = avaliarLogin(reg, "op@pipoca.dev", "certa", AGORA + MAX_TENTATIVAS_ADMIN, sal, token);
  assert(bloq.sessao === null && bloq.aguardeMs > 0, "durante o atraso, até a senha certa aguarda (recusa sem contar)");
  const depois = avaliarLogin(reg, "op@pipoca.dev", "certa", AGORA + 10 * 60_000, sal, token);
  assert(!!depois.sessao && depois.registro !== null && depois.registro.tentativas === 0, "após o atraso, acerto zera as tentativas");
}

// ─── auth · sessão (04-01) ───────────────────────────────────────────────────
console.log("\n=== SA_LOGIN · sessão de 12h + encerrarSessao ===");
{
  const s = criarSessaoSuperAdmin("adm_1", "todos", AGORA, "tok");
  assert(s.expiraEm === AGORA + DURACAO_SESSAO_ADMIN_MS, "expiraEm = agora + 12h");
  assert(sessaoSuperAdminValida(s, AGORA + 1000), "sessão vale antes de expirar");
  assert(!sessaoSuperAdminValida(s, s.expiraEm + 1), "sessão expira depois de expiraEm");
  assert(!sessaoSuperAdminValida(null, AGORA), "sessão nula nunca vale (fail-closed)");

  const st = new ArmazemMem();
  st.setItem("pipoca.perfil.v1", "[]"); // dado da família não pode ser tocado
  const repo = criarRepositorioAdmin(st);
  await repo.autenticar("op@pipoca.dev", "segredo123");
  await repo.encerrarSessao();
  assert(
    st.getItem("pipoca.admin.sessao.v1") === null &&
      st.getItem("pipoca.admin.credencial.v1") !== null &&
      st.getItem("pipoca.perfil.v1") === "[]",
    "encerrarSessao limpa SÓ a sessão admin (credencial e dados da família intactos)"
  );
  assert(!st.dump().includes("segredo123"), "storage inteiro nunca contém a senha em claro");
}

// ─── rotas · guard fail-closed (04-01/02) ────────────────────────────────────
console.log("\n=== rotasAdmin · guard fail-closed ===");
{
  const valida = criarSessaoSuperAdmin("adm_1", "todos", AGORA, "tok");
  const expirada = { ...valida, expiraEm: AGORA - 1 };
  for (const t of [2, 3, 4, 5, 6]) {
    assert(guardarRotaAdmin(t, null, AGORA) === TELA_SA_LOGIN, `sem sessão, tela ${t} cai no login`);
  }
  assert(guardarRotaAdmin(3, valida, AGORA) === 3, "sessão válida navega ao destino");
  assert(guardarRotaAdmin(4, expirada, AGORA) === TELA_SA_LOGIN, "sessão expirada cai no login");
  assert(guardarRotaAdmin(0, valida, AGORA) === TELA_SA_LOGIN && guardarRotaAdmin(99, valida, AGORA) === TELA_SA_LOGIN, "tela desconhecida cai no login (fail-closed)");
  assert(guardarRotaAdmin(TELA_SA_LOGIN, null, AGORA) === TELA_SA_LOGIN, "o login é sempre alcançável");
  assert(
    ROTAS_ADMIN.SA_LOGIN === 1 && ROTAS_ADMIN.SA_HOME === TELA_SA_HOME && ROTAS_ADMIN.SA_TENANT === 3 &&
      ROTAS_ADMIN.SA_CONTENT === 4 && ROTAS_ADMIN.SA_AI === 5 && ROTAS_ADMIN.SA_SAFE === 6,
    "ROTAS_ADMIN mapeia os 6 nós SA_*"
  );
}

// ─── escopo (04-01/02) ───────────────────────────────────────────────────────
console.log("\n=== escopo · escopoAutoriza + areaDisponivel ===");
{
  assert(escopoAutoriza("todos", "ten_x"), "escopo todos autoriza qualquer tenant");
  assert(escopoAutoriza(["ten_a", "ten_b"], "ten_a"), "lista restrita autoriza tenant incluso");
  assert(!escopoAutoriza(["ten_a"], "ten_b"), "lista restrita nega tenant de fora");
  assert(
    areaDisponivel("todos", "tenants") && areaDisponivel("todos", "conteudo") &&
      areaDisponivel("todos", "ia") && areaDisponivel("todos", "seguranca"),
    "escopo todos abre as 4 áreas do hub"
  );
  assert(areaDisponivel(["ten_a"], "tenants") && !areaDisponivel(["ten_a"], "seguranca"), "escopo parcial vê tenants mas não segurança (fail-closed)");
  assert(!escopoAutoriza(undefined as unknown as string[], "ten_a") && !areaDisponivel(undefined as unknown as string[], "tenants"), "entrada inválida fecha (fail-closed)");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
