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
import { limitesDoPlano, excedeTetoPerfis } from "./tenant/tiposTenant.js";
import {
  criarRepositorioTenant,
  novoTenant,
  vincularConta,
  ERRO_FORA_DE_ESCOPO,
} from "./tenant/repositorioTenant.js";
import {
  validarGrafoAutoral,
  listarCenarios,
  salvarRascunho,
  versionarCenario,
  publicarCenario,
} from "./validar_grafo.js";
import {
  CONFIG_IA_PADRAO,
  validarConfigIA,
  iaEfetivaDisponivel,
  carregarConfigIA,
  salvarConfigIA,
  type ConfigIaTenant,
} from "./ia_config.js";
import {
  FLAGS_PADRAO,
  definirFlag,
  killSwitch,
  killSwitchAtivo,
  aplicarFlagsAosModos,
  carregarFlags,
  salvarFlags,
} from "./flags.js";
import { modosPadrao } from "../core/modos.js";
import grafoQuintal from "../dados/quintal_grafo.json" with { type: "json" };

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

// ─── tenants · seam com escopo (04-03) ───────────────────────────────────────
console.log("\n=== SA_TENANT · tenants, planos e isolamento por escopo ===");
{
  const st = new ArmazemMem();
  const raiz = criarRepositorioTenant("todos", st);

  const tA = novoTenant("Escola Modelo", AGORA);
  const tB = novoTenant("Família Silva", AGORA + 1);
  assert(tA.planoId === "gratis" && tA.ativo === true, "tenant novo nasce no plano mais restritivo e ativo (regra 7)");
  await raiz.salvarTenant(tA);
  await raiz.salvarTenant(tB);
  assert((await raiz.obterLimitesEfetivos(tA.id)).iaPermitida === false, "tenant novo nasce com IA desligada pelo plano");

  assert((await raiz.listarTenants("todos")).length === 2, "operador raiz lista todos os tenants");
  const restrito = criarRepositorioTenant([tA.id], st);
  const vistos = await restrito.listarTenants("todos");
  assert(vistos.length === 1 && vistos[0].id === tA.id, "escopo restrito só vê o próprio tenant (isolamento)");
  assert((await restrito.obterTenant(tB.id)) === null, "obterTenant fora do escopo devolve null (não revela existência)");

  let recusou = false;
  try { await restrito.salvarTenant({ ...tB, nome: "invadido" }); } catch (e) { recusou = String(e).includes(ERRO_FORA_DE_ESCOPO); }
  assert(recusou, "salvarTenant fora do escopo recusa com erro neutro");
  assert((await raiz.obterTenant(tB.id))?.nome === "Família Silva", "…e NÃO grava nada (dados do outro tenant intactos)");

  let recusouCriar = false;
  try { await restrito.salvarTenant(novoTenant("Novo da plataforma", AGORA + 2)); } catch { recusouCriar = true; }
  assert(recusouCriar, "criar tenant novo exige escopo todos (operador raiz)");

  assert((await raiz.listarPlanos()).length === 3, "catálogo tem 3 planos (gratis/familia/escola)");
  await raiz.salvarTenant({ ...tA, planoId: "escola" });
  assert((await raiz.obterLimitesEfetivos(tA.id)).maxPerfis === 40, "trocar o plano muda os limites efetivos");
  assert((await raiz.obterLimitesEfetivos("ten_inexistente")).maxPerfis === 1, "tenant desconhecido cai nos limites do gratis (fail-closed)");

  const familia = limitesDoPlano("familia");
  assert(excedeTetoPerfis(4, familia) && !excedeTetoPerfis(3, familia), "rebaixar não destrói: só a criação acima do teto é bloqueada");

  await raiz.salvarTenant({ ...tA, planoId: "escola", ativo: false });
  const suspenso = await raiz.obterTenant(tA.id);
  assert(!!suspenso && suspenso.ativo === false && suspenso.nome === "Escola Modelo" && suspenso.planoId === "escola", "suspender preserva nome e plano (suspender ≠ apagar)");

  st.setItem("pipoca.admin.tenants.v1", JSON.stringify([{ esquema: "outra.coisa.v9", tenant: tA }, "lixo", { esquema: "pipoca.tenant.v1", tenant: tB }]));
  assert((await raiz.listarTenants("todos")).length === 1, "envelopes inválidos/corrompidos são ignorados em silêncio");

  const c1 = vincularConta("mae@familia.dev", tA.id, st);
  const c2 = vincularConta("mae@familia.dev", tB.id, st);
  assert(c1.id === c2.id && c2.tenants.length === 2, "vincularConta agrega tenants na mesma conta (sem PII de criança)");
}

// ─── conteúdo · validação dupla (04-04) ──────────────────────────────────────
console.log("\n=== SA_CONTENT · validarGrafoAutoral (schema + simulação) ===");
{
  const rOk = validarGrafoAutoral(grafoQuintal);
  assert(rOk.ok && rOk.erros.length === 0, "grafo do Quintal passa a validação dupla (0 erros)");

  const rEsq = validarGrafoAutoral({ ...grafoQuintal, esquema: "outra.coisa" });
  assert(!rEsq.ok && rEsq.erros.length > 0, "esquema errado é rejeitado com motivo");

  assert(!validarGrafoAutoral({}).ok, "objeto vazio é rejeitado");

  const comCiclo = JSON.parse(JSON.stringify(grafoQuintal));
  delete comCiclo.cenario.ordem_canonica;
  const [oA, oB] = comCiclo.cenario.objetos;
  oA.regras = [{ se: "tem:" + oB.id, entao: oA.gatilho }];
  oB.regras = [{ se: "tem:" + oA.id, entao: oB.gatilho }];
  const rCiclo = validarGrafoAutoral(comCiclo);
  assert(!rCiclo.ok && rCiclo.erros.some((e) => /ciclo/i.test(e)), "ciclo de dependência tem: vira erro com diagnóstico");

  const semRamos = JSON.parse(JSON.stringify(grafoQuintal));
  semRamos.cenario.desfechos.aberto = [];
  const rAviso = validarGrafoAutoral(semRamos);
  assert(rAviso.ok && rAviso.avisos.some((a) => /degrada/.test(a)), "desfecho aberto sem ramo vira AVISO (degrada p/ convergente), não erro");
}

// ─── conteúdo · biblioteca (04-04) ───────────────────────────────────────────
console.log("\n=== SA_CONTENT · rascunho → versão → publicação com teto ===");
{
  const st = new ArmazemMem();
  const v1 = salvarRascunho(grafoQuintal, "ten_escola", st);
  assert(v1.cenarioId === "quintal_anoitecer" && v1.versao === 1 && v1.publicadoEm === null, "salvarRascunho abre v1 rascunho com o cenarioId do grafo");

  let recusouSemId = false;
  try { salvarRascunho({ cenario: {} }, null, st); } catch { recusouSemId = true; }
  assert(recusouSemId, "grafo sem cenario.id não entra na biblioteca");

  const semTeto = publicarCenario("quintal_anoitecer", 1, AGORA, limitesDoPlano("gratis"), st);
  assert(!semTeto.ok && /teto|permite/.test(semTeto.motivo || ""), "plano gratis (0 customizados) recusa publicar com motivo");

  const pub = publicarCenario("quintal_anoitecer", 1, AGORA, limitesDoPlano("familia"), st);
  assert(pub.ok, "plano familia publica dentro do teto");
  assert(listarCenarios(st).find((c) => c.versao === 1)?.publicadoEm === AGORA, "publicação carimba publicadoEm");

  const v2 = versionarCenario("quintal_anoitecer", st);
  assert(!!v2 && v2.versao === 2 && v2.publicadoEm === null, "versionar clona a última como v2 rascunho");
  assert(listarCenarios(st).length === 2, "…preservando a v1 publicada");

  const invalido = JSON.parse(JSON.stringify(grafoQuintal));
  invalido.cenario.abertura = { n1: "só um nível" };
  salvarRascunho(invalido, "ten_escola", st); // atualiza o rascunho v2
  const pubInv = publicarCenario("quintal_anoitecer", 2, AGORA + 1, limitesDoPlano("familia"), st);
  assert(!pubInv.ok && /inválido/i.test(pubInv.motivo || ""), "grafo inválido não publica (motivo explícito)");

  // Teto por cenarioId distinto: 2º cenário do mesmo tenant no plano familia (teto 2) passa; 3º recusa.
  const outro = JSON.parse(JSON.stringify(grafoQuintal));
  outro.cenario.id = "quarto_noite";
  salvarRascunho(outro, "ten_escola", st);
  assert(publicarCenario("quarto_noite", 1, AGORA + 2, limitesDoPlano("familia"), st).ok, "2º cenário distinto ainda cabe no teto 2");
  const terceiro = JSON.parse(JSON.stringify(grafoQuintal));
  terceiro.cenario.id = "floresta_dia";
  salvarRascunho(terceiro, "ten_escola", st);
  assert(!publicarCenario("floresta_dia", 1, AGORA + 3, limitesDoPlano("familia"), st).ok, "3º cenário distinto estoura o teto 2 e recusa");

  const plataforma = JSON.parse(JSON.stringify(grafoQuintal));
  plataforma.cenario.id = "espaco_estrelas";
  salvarRascunho(plataforma, null, st);
  assert(publicarCenario("espaco_estrelas", 1, AGORA + 4, null, st).ok, "catálogo da plataforma (tenantId null) não tem teto");
}

// ─── IA por tenant (04-05) ───────────────────────────────────────────────────
console.log("\n=== SA_AI · config por tenant, gate triplo, sem chaves ===");
{
  const st = new ArmazemMem();
  const familia = limitesDoPlano("familia");
  const gratis = limitesDoPlano("gratis");
  const flagsIaOn = definirFlag(FLAGS_PADRAO, "ia", true);

  assert(!iaEfetivaDisponivel(CONFIG_IA_PADRAO, familia, flagsIaOn), "config padrão (sem provedor) → IA indisponível");

  const valida: ConfigIaTenant = { provedor: "claude", modelo: "claude-haiku-4-5", cotaMensal: 100, custoMaxMensal: 10, fallback: "gemini" };
  assert(validarConfigIA(valida).length === 0, "config completa é válida");
  assert(iaEfetivaDisponivel(valida, familia, flagsIaOn), "plano permite + config válida + flag ligada → IA disponível");
  assert(!iaEfetivaDisponivel(valida, gratis, flagsIaOn), "plano gratis (iaPermitida=false) barra mesmo com config válida");
  assert(!iaEfetivaDisponivel(valida, familia, FLAGS_PADRAO), "flag global de IA desligada barra (kill-switch)");
  assert(!iaEfetivaDisponivel({ ...valida, cotaMensal: 0 }, familia, flagsIaOn), "cota 0 → IA indisponível");

  const erros = validarConfigIA({ ...valida, cotaMensal: -1, fallback: "claude", modelo: "gpt-mini" });
  assert(erros.length >= 3, "cota negativa + fallback=provedor + modelo fora do catálogo → erros");
  assert(!JSON.stringify(valida).toLowerCase().includes("chave"), "a config não tem campo de chave (server-side, fase06)");

  salvarConfigIA("ten_a", valida, st);
  salvarConfigIA("ten_b", { ...valida, provedor: "gemini", modelo: "gemini-flash", fallback: null }, st);
  assert(carregarConfigIA("ten_a", st).provedor === "claude" && carregarConfigIA("ten_b", st).provedor === "gemini", "configs por tenant não se misturam");
  assert(carregarConfigIA("ten_novo", st).provedor === null, "tenant sem config carrega o padrão sem IA");
}

// ─── flags globais (04-06) ───────────────────────────────────────────────────
console.log("\n=== SA_SAFE · flags, kill-switch e efeito nos Modos ===");
{
  const st = new ArmazemMem();
  assert(FLAGS_PADRAO.ia === false && FLAGS_PADRAO.fala === false, "defaults seguros: IA e fala nascem desligadas");

  const ligada = definirFlag(FLAGS_PADRAO, "ia", true);
  assert(ligada.ia === true && FLAGS_PADRAO.ia === false, "definirFlag é puro (não muta o original)");

  const morta = killSwitch(ligada, "ia");
  assert(morta.ia === false && killSwitchAtivo(morta, "ia"), "killSwitch força o recurso a desligado");
  assert(killSwitchAtivo(FLAGS_PADRAO, "recurso_desconhecido"), "recurso desconhecido conta como desligado (fail-closed)");

  const modosComIa = { ...modosPadrao, iaLigada: true };
  assert(aplicarFlagsAosModos(modosComIa, FLAGS_PADRAO).iaLigada === false, "IA global desligada IGNORA Modos.iaLigada");
  const aplicado = aplicarFlagsAosModos(modosComIa, ligada);
  assert(aplicado.iaLigada === true && aplicado.desfecho === modosPadrao.desfecho, "IA global ligada respeita o cuidador (demais campos intactos)");

  // fase05 · kill-switch de FALA degrada a verificação (o portão nunca fica sem caminho)
  const modosComFala = { ...modosPadrao, verificacao: "fala" as const, iaLigada: true };
  const falaMorta = aplicarFlagsAosModos(modosComFala, ligada); // `ligada` tem ia:true, fala ainda false
  assert(falaMorta.verificacao === "cuidador", "fala global desligada degrada verificacao fala→cuidador");
  assert(falaMorta.iaLigada === true, "…sem mexer na IA autorizada pelo cuidador");
  const tudoLigado = definirFlag(ligada, "fala", true);
  assert(aplicarFlagsAosModos(modosComFala, tudoLigado).verificacao === "fala", "fala global ligada respeita a escolha do cuidador");
  assert(aplicarFlagsAosModos({ ...modosPadrao, verificacao: "auto" as const }, FLAGS_PADRAO).verificacao === "auto", "kill-switch de fala não toca verificações que não são fala");
  assert(modosComFala.verificacao === "fala", "aplicarFlagsAosModos é puro (não muta a intenção original)");

  st.setItem("pipoca.admin.flags.v1", "{corrompido");
  assert(carregarFlags(st).ia === false, "storage corrompido volta aos defaults seguros");
  salvarFlags(morta, st);
  assert(carregarFlags(st).ia === false && carregarFlags(st).telemetria === true, "salvar/carregar preserva o mapa (com defaults por baixo)");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
