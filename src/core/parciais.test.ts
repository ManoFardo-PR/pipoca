/**
 * Pipoca — Testes dos parciais concluídos (núcleo canônico)
 * ----------------------------------------------------------
 * Cobre: telemetria (03-01), captura (03-01), retenção (03-03),
 * acesso/PIN (02-03), modos.autorizarIA + fábrica (02-08), migração (06-03).
 * Execute com: bun run src/core/parciais.test.ts
 */

import { criarEvento, validarEvento } from "./telemetria.js";
import type { EventoTelemetria, DadosLeituraConfirmada } from "./telemetria.js";
import {
  capturarLeituraConfirmada,
  capturarObjetoDestravado,
  capturarSessaoEncerrada,
} from "./captura.js";
import { podarPorRetencao } from "../servicos/telemetria_repo.js";
import { acessoInicial, definirPin, verificarPin, MAX_TENTATIVAS, LOCKOUT_MS } from "./acesso.js";
import { modosPadrao, autorizarIA } from "./modos.js";
import { MODO_PADRAO, TELA_CRIANCA, aplicarGuarda, podeNavegar, aoPassarPortao, aoVoltarParaCrianca } from "./modoApp.js";
import { entrarFamilia, sessaoValida } from "./contaFamilia.js";
import { montarEstadoOnboarding } from "./onboarding.js";
import { definirVerificacao, definirDesfecho } from "./modos.js";
import { exportarDados, apagarDados } from "./lgpd.js";
import { definirBlocoFoco, normalizarLimites } from "./limites.js";
import { CARDAPIO_PADRAO, normalizarCardapio, normalizarCenariosLiberados } from "./cardapio.js";
import { criarMotor } from "../motores/fabrica.js";
import { validarGrafo } from "./grafo/validarGrafo.js";
import { estadoInicial } from "./estado.js";
import { criarPerfil } from "./perfil.js";
import type { Perfil } from "./perfil.js";
import type { EstadoApp } from "./estado.js";
import type { RepositorioPersistencia } from "./persistencia/index.js";
import grafoRaw from "../dados/quintal_grafo.json" with { type: "json" };

let passou = 0;
let falhou = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ✓ ${msg}`); passou++; }
  else { console.error(`  ✗ ${msg}`); falhou++; }
}

// --- repo em memória p/ captura/migração ---
class RepoMem implements RepositorioPersistencia {
  perfis = new Map<string, Perfil>();
  saves = new Map<string, EstadoApp>();
  telemetria: EventoTelemetria[] = [];
  async carregarPerfis(): Promise<Perfil[]> { return [...this.perfis.values()]; }
  async salvarPerfil(p: Perfil): Promise<void> { this.perfis.set(p.id, { ...p }); }
  async carregarSave(id: string): Promise<EstadoApp | null> { return this.saves.get(id) ?? null; }
  async salvarSave(id: string, e: EstadoApp): Promise<void> { this.saves.set(id, e); }
  async registrarTelemetria(ev: EventoTelemetria): Promise<void> { this.telemetria.push(ev); }
  async apagarPerfil(id: string): Promise<void> {
    this.perfis.delete(id);
    this.saves.delete(id);
    this.telemetria = this.telemetria.filter((e) => e.perfilId !== id);
  }
}

const perfil: Perfil = criarPerfil("p1", { nome: "Joana", idade: 7, nivel: "n2", avatarId: "pingo" });
const estado: EstadoApp = {
  ...estadoInicial,
  perfil,
  historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
};

console.log("\n=== Telemetria (03-01) — criarEvento / validarEvento ===");
{
  const dados: DadosLeituraConfirmada = { palavras: 6, cenarioId: "quintal_anoitecer", nivel: "n2", verificacao: "cuidador" };
  const ev = criarEvento("leitura_confirmada", "p1", dados, 1000);
  assert(ev.esquema === "pipoca.telemetria.v1", "esquema fixo pipoca.telemetria.v1");
  assert(ev.ts === 1000, "ts vem do parâmetro `agora` (injetado fora do motor)");
  assert(validarEvento(ev), "evento válido passa em validarEvento");
  assert(!validarEvento({ ...ev, tipo: "xpto" }), "tipo inválido reprovado");
  let lancou = false;
  try { criarEvento("leitura_confirmada", "p1", dados, Number.NaN); } catch { lancou = true; }
  assert(lancou, "criarEvento lança com `agora` não-finito");
}

console.log("\n=== Captura (03-01) — pontos de captura ===");
{
  const repo = new RepoMem();
  const ok = capturarLeituraConfirmada(estado, 6, "vagalume", 2000, repo);
  assert(ok && repo.telemetria.length === 1, "leitura_confirmada capturada");
  assert(repo.telemetria[0]!.tipo === "leitura_confirmada", "tipo correto");
  assert((repo.telemetria[0]!.dados as DadosLeituraConfirmada).verificacao === "cuidador", "verificacao vinda dos modos");

  const semPerfil = capturarLeituraConfirmada({ ...estado, perfil: null }, 6, undefined, 2000, repo);
  assert(!semPerfil && repo.telemetria.length === 1, "sem perfil → não captura");

  // idempotência por objeto
  const ledger = new Set<string>();
  const a = capturarObjetoDestravado(estado, "vagalume", 3000, repo, ledger);
  const b = capturarObjetoDestravado(estado, "vagalume", 3000, repo, ledger);
  assert(a && !b, "objeto_destravado idempotente (2ª chamada não emite)");

  // minutos derivado na borda
  const repo2 = new RepoMem();
  const est2: EstadoApp = { ...estado, sessao: { perfilId: "p1", blocoMin: 15, iniciadaEm: 0, restanteSeg: 0 } };
  capturarSessaoEncerrada(est2, { palavras: 12, historias: 1 }, 120000, repo2);
  const enc = repo2.telemetria[0]!;
  assert(enc.tipo === "sessao_encerrada" && (enc.dados as { minutos: number }).minutos === 2, "minutos = round((agora-iniciadaEm)/60000)");
}

console.log("\n=== Captura — fire-and-forget (falha não trava UI) ===");
{
  const repoRuim: RepositorioPersistencia = {
    carregarPerfis: async () => [],
    salvarPerfil: async () => {},
    carregarSave: async () => null,
    salvarSave: async () => {},
    registrarTelemetria: () => Promise.reject(new Error("offline")),
    apagarPerfil: async () => {},
  };
  let lancou = false;
  let r = false;
  try { r = capturarLeituraConfirmada(estado, 6, undefined, 4000, repoRuim); } catch { lancou = true; }
  assert(!lancou && r, "captura não lança mesmo com repo que rejeita");
}

console.log("\n=== Retenção (03-03) — podarPorRetencao ===");
{
  const agora = 100 * 86_400_000; // dia 100
  const mk = (dia: number): EventoTelemetria =>
    ({ esquema: "pipoca.telemetria.v1", tipo: "objeto_destravado", perfilId: "p1", ts: dia * 86_400_000, dados: { cenarioId: "q", objetoId: "x", nivel: "n2" } });
  const eventos = [mk(5), mk(50), mk(99)];
  const mantidos = podarPorRetencao(eventos, agora, 90);
  assert(mantidos.length === 2, "retenção 90d remove o evento do dia 5, mantém 50 e 99");
  assert(mantidos.every((e) => e.ts >= agora - 90 * 86_400_000), "todos os mantidos dentro da janela");
}

console.log("\n=== Acesso (02-03) — PIN + lockout suave ===");
{
  let st = definirPin(acessoInicial, "1234");
  assert(st.pinHash !== null, "definirPin grava hash");
  assert(verificarPin(st, "1234", 0).ok, "PIN correto → ok");
  assert(!verificarPin(st, "0000", 0).ok, "PIN errado → not ok");

  // acumula erros até o lockout
  let agora = 0;
  for (let i = 0; i < MAX_TENTATIVAS - 1; i++) { st = verificarPin(st, "0000", agora).estado; }
  const r = verificarPin(st, "0000", agora);
  assert(r.bloqueado === true, `lockout ativa após ${MAX_TENTATIVAS} erros`);
  st = r.estado;
  assert(verificarPin(st, "1234", agora + 1).bloqueado, "PIN correto durante lockout ainda é recusado");
  const depois = verificarPin(st, "1234", agora + LOCKOUT_MS + 1);
  assert(depois.ok, "após o lockout expirar, PIN correto volta a abrir");
}

console.log("\n=== Modos (02-08) — autorizarIA + fábrica respeita a flag ===");
{
  assert(modosPadrao.iaLigada === false, "default seguro: iaLigada=false");
  const ligado = autorizarIA(modosPadrao, true);
  assert(ligado.iaLigada === true && modosPadrao.iaLigada === false, "autorizarIA liga sem mutar o original");

  const grafo = validarGrafo(grafoRaw);
  const a = criarMotor(grafo.cenario, modosPadrao);
  const b = criarMotor(grafo.cenario, ligado);
  assert(typeof a.motor.abertura === "function" && typeof a.ordem.validar === "function", "fábrica (iaLigada=false) devolve motor+ordem");
  assert(typeof b.motor.abertura === "function", "fábrica (iaLigada=true) devolve motor (fallback Motor A no MVP)");
}

console.log("\n=== Migração (06-03) — migrar(de, para) ===");
{
  const de = new RepoMem();
  const para = new RepoMem();
  const p2: Perfil = criarPerfil("p2", { nome: "Léo", idade: 9, nivel: "n3", avatarId: "lua" });
  // usar await dentro de IIFE async
  await (async () => {
    await de.salvarPerfil(perfil);
    await de.salvarPerfil(p2);
    await de.salvarSave("p1", estado);
    const { migrar } = await import("../backend/migracao.js");
    const res = await migrar(de, para);
    assert(res.perfis === 2, "migrar copia os 2 perfis");
    assert(res.saves === 1, "migrar copia o save existente (p1)");
    assert((await para.carregarPerfis()).length === 2, "destino tem os perfis");
    assert((await para.carregarSave("p1"))?.historia.objetos[0] === "vagalume", "save preservado no destino");
  })();
}

console.log("\n=== Modo do app (KIDMODE 02-02) — guarda de superfícies adultas ===");
{
  const ADULTAS = [1, 8, 9];
  assert(MODO_PADRAO === "crianca", "modo padrão = crianca");
  assert(podeNavegar("crianca", 2, ADULTAS) === true, "crianca pode ir à T2");
  assert(podeNavegar("crianca", 8, ADULTAS) === false, "crianca não acessa superfície adulta (8)");
  assert(aplicarGuarda("crianca", 8, ADULTAS) === TELA_CRIANCA, "rota adulta no modo criança redireciona à T2");
  assert(aplicarGuarda("crianca", 4, ADULTAS) === 4, "rota infantil passa direto");
  assert(podeNavegar("cuidador", 8, ADULTAS) === true, "cuidador acessa superfície adulta");
  assert(aoPassarPortao() === "cuidador", "PINGATE → cuidador");
  assert(aoVoltarParaCrianca() === "crianca", "voltar/recarregar → crianca");
}

console.log("\n=== Conta/sessão da família (HH_LOGIN 02-01) ===");
{
  assert(entrarFamilia("", "x", 1000).ok === false, "login com e-mail vazio → erro acolhedor");
  assert(entrarFamilia("semarroba", "senha", 1000).ok === false, "e-mail sem formato → erro");
  const r = entrarFamilia("Casa@Exemplo.com", "segredo", 1000);
  assert(r.ok === true && !!r.conta && !!r.sessao, "login válido cria conta + sessão");
  assert(r.conta!.email === "casa@exemplo.com", "e-mail normalizado (lowercase)");
  assert(r.sessao!.expiraEm > 1000, "sessão tem expiração futura");
  assert(sessaoValida(r.sessao!, 1000) === true, "sessão válida logo após login");
  assert(sessaoValida(r.sessao!, r.sessao!.expiraEm + 1) === false, "sessão expirada → inválida");
  assert(sessaoValida(null, 1000) === false, "sessão nula → inválida");
  const r2 = entrarFamilia("casa@exemplo.com", "outra", 2000);
  assert(r2.conta!.id === r.conta!.id, "id de conta determinístico por e-mail");
}

console.log("\n=== Onboarding (PC_HOME 02-04) — monta PERF/MODES/SESS ===");
{
  const est = montarEstadoOnboarding({ id: "p9", nome: "Bia", idade: 6, nivel: "n2", avatarId: "cacau", modos: { desfecho: "aberto" }, blocoMin: 20 }, 5000);
  assert(est.perfil?.id === "p9" && est.perfil?.nome === "Bia", "perfil montado");
  assert(est.perfil?.nivel === "n2", "nivel aplicado");
  assert(est.modos.desfecho === "aberto", "modos parcial mesclado");
  assert(est.modos.iaLigada === false, "default seguro mantido (iaLigada=false)");
  assert(est.sessao?.blocoMin === 20 && est.sessao?.restanteSeg === 1200, "sessão iniciada com o bloco");
  assert(est.tela === 2, "aterrissa no modo criança (T2)");
  const def = montarEstadoOnboarding({ id: "p10", nome: "", idade: 99, nivel: "nX", avatarId: "zzz" }, 0);
  assert(def.perfil?.idade === 12, "idade fora de range é clampada (criarPerfil)");
  assert(def.sessao?.blocoMin === 15, "blocoMin padrão = 15");
}

console.log("\n=== PC_RULES (02-07) — setters de modos + cardápio + cenários ===");
{
  const m = definirVerificacao(modosPadrao, "auto");
  assert(m.verificacao === "auto" && modosPadrao.verificacao === "cuidador", "definirVerificacao sem mutar original");
  assert(definirDesfecho(modosPadrao, "aberto").desfecho === "aberto", "definirDesfecho aplica");
  assert(CARDAPIO_PADRAO.length >= 3 && CARDAPIO_PADRAO.every((i) => i.cost >= 0), "cardápio padrão coerente");
  assert(normalizarCardapio([]).length === CARDAPIO_PADRAO.length, "cardápio vazio → padrão");
  assert(normalizarCardapio([{ id: "x", label: "X", icon: "✨", cost: 2 }]).length === 1, "cardápio válido preservado");
  assert(normalizarCardapio([{ id: "", label: "", icon: "", cost: -1 }]).length === CARDAPIO_PADRAO.length, "itens inválidos → padrão");
  assert(normalizarCenariosLiberados([]).includes("quintal_anoitecer"), "cenários vazios → quintal");
}

console.log("\n=== PC_LIM (02-06) — bloco de foco + tempo de tela ===");
{
  const sess = { perfilId: "p1", blocoMin: 15 as const, iniciadaEm: 0, restanteSeg: 900 };
  const nova = definirBlocoFoco(sess, 25, 10000);
  assert(nova.blocoMin === 25 && nova.restanteSeg === 1500 && nova.iniciadaEm === 10000, "definirBlocoFoco reinicia o timer");
  assert(normalizarLimites({ blocoMin: 20, tempoDeTelaMin: 45 }).tempoDeTelaMin === 45, "tempo de tela válido");
  assert(normalizarLimites({ blocoMin: 99, tempoDeTelaMin: -5 }).blocoMin === 15, "blocoMin inválido → padrão");
  assert(normalizarLimites({ tempoDeTelaMin: 0 }).tempoDeTelaMin === null, "tempo de tela <=0 → null (sem limite)");
}

console.log("\n=== PC_PRIV (02-09) — exportar / apagar (LGPD) ===");
{
  await (async () => {
    const repo = new RepoMem();
    await repo.salvarPerfil(perfil);
    await repo.salvarSave("p1", estado);
    await repo.registrarTelemetria(criarEvento("objeto_destravado", "p1", { cenarioId: "q", objetoId: "vagalume", nivel: "n2" }, 1));
    const exp = await exportarDados("p1", repo, 12345);
    assert(exp.esquema === "pipoca.export.v1" && exp.exportadoEm === 12345, "exportação tem esquema + timestamp");
    assert(exp.perfil?.perfil.id === "p1" && exp.save?.perfilId === "p1", "exporta perfil + save (schemas)");
    const expVazio = await exportarDados("inexistente", repo, 1);
    assert(expVazio.perfil === null && expVazio.save === null, "exportar sem dados → coerente (nulls)");
    await apagarDados("p1", repo);
    assert((await repo.carregarPerfis()).length === 0, "apagar remove o perfil");
    assert((await repo.carregarSave("p1")) === null, "apagar remove o save");
    assert(repo.telemetria.length === 0, "apagar remove a telemetria (sem resíduos)");
  })();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
