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
import {
  validarHistoriaSalva,
  dentroDaRetencaoHistoria,
  normalizarHistorias,
  tituloDaHistoria,
  dataRelativa,
  MAX_NAO_FAVORITAS,
} from "./historias.js";
import {
  resumir,
  gerarSeries,
  calcularEngajamento,
  filtrarPorPeriodo,
  chaveDia,
  TETO_MINUTOS_SESSAO,
} from "./agregadosTelemetria.js";
import { acessoInicial, definirPin, verificarPin, MAX_TENTATIVAS, LOCKOUT_MS } from "./acesso.js";
import { modosPadrao, autorizarIA } from "./modos.js";
import { MODO_PADRAO, TELA_CRIANCA, aplicarGuarda, podeNavegar, aoPassarPortao, aoVoltarParaCrianca } from "./modoApp.js";
import { entrarFamilia, sessaoValida } from "./contaFamilia.js";
import { montarEstadoOnboarding } from "./onboarding.js";
import { definirVerificacao, definirDesfecho } from "./modos.js";
import { exportarDados, apagarDados } from "./lgpd.js";
import { definirBlocoFoco, normalizarLimites } from "./limites.js";
import { CARDAPIO_PADRAO, normalizarCardapio, normalizarCenariosLiberados } from "./cardapio.js";
import { estadoInicial } from "./estado.js";
import { criarPerfil } from "./perfil.js";
import type { Perfil } from "./perfil.js";
import type { EstadoApp } from "./estado.js";
import type { RepositorioPersistencia } from "./persistencia/index.js";

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
  async carregarTelemetria(id: string): Promise<EventoTelemetria[]> { return this.telemetria.filter((e) => e.perfilId === id); }
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
    carregarTelemetria: async () => [],
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

console.log("\n=== Histórias salvas — validador, retenção 20d e favoritas ===");
{
  const DIA = 86_400_000;
  const agora = 100 * DIA;
  const mkH = (id: string, diasAtras: number, favorita = false, extras: Record<string, unknown> = {}) => ({
    id, cenarioId: "quintal_anoitecer", texto: "Era uma noite mansa. Fim.",
    linha: ["vagalume", "frasco"], nivel: "n2", desfecho: "convergente",
    titulo: "A história de o vaga-lume", emoji: "🌟",
    criadaEm: agora - diasAtras * DIA, favorita, ...extras,
  });

  // validador — rejeitador por item, favorita saneada
  assert(validarHistoriaSalva(mkH("h1", 0)) !== null, "história válida passa");
  assert(validarHistoriaSalva(null) === null, "null → descartada");
  assert(validarHistoriaSalva(mkH("", 0)) === null, "id vazio → descartada");
  assert(validarHistoriaSalva(mkH("h1", 0, false, { texto: "  " })) === null, "texto vazio → descartada");
  assert(validarHistoriaSalva(mkH("h1", 0, false, { nivel: "n9" })) === null, "nível inválido → descartada");
  assert(validarHistoriaSalva(mkH("h1", 0, false, { linha: ["a", 7] })) === null, "linha com não-string → descartada");
  assert(validarHistoriaSalva(mkH("h1", 0, false, { criadaEm: "ontem" })) === null, "criadaEm não-número → descartada");
  const saneada = validarHistoriaSalva(mkH("h1", 0, false, { favorita: "sim", emoji: "" }));
  assert(saneada !== null && saneada.favorita === false && saneada.emoji === "✨", "favorita/emoji malformados → SANEADAS (não rejeitam)");

  // retenção: 20 dias; favorita fica PARA SEMPRE; limite exato conta como dentro
  assert(dentroDaRetencaoHistoria(validarHistoriaSalva(mkH("h", 19))!, agora), "19 dias → dentro");
  assert(dentroDaRetencaoHistoria(validarHistoriaSalva(mkH("h", 20))!, agora), "exatamente 20 dias → ainda dentro (>= limite)");
  assert(!dentroDaRetencaoHistoria(validarHistoriaSalva(mkH("h", 21))!, agora), "21 dias → fora");
  assert(dentroDaRetencaoHistoria(validarHistoriaSalva(mkH("h", 300, true))!, agora), "favorita de 300 dias → fica para sempre");

  // normalizarHistorias: valida + dedupe (última vence) + poda + ordena + teto
  const bruta = [
    mkH("velha", 25), // cai (fora da retenção)
    mkH("fav-velha", 25, true), // fica (favorita)
    mkH("dupe", 10, false, { texto: "primeira versão." }),
    mkH("dupe", 10, true, { texto: "versão favoritada." }), // última vence
    "lixo", mkH("quebrada", 1, false, { titulo: "" }), // descartadas
    mkH("nova", 1), mkH("media", 5),
  ];
  const norm = normalizarHistorias(bruta, agora);
  assert(norm.length === 4, "sobram 4: fav-velha + dupe(favoritada) + nova + media");
  assert(!norm.some((h) => h.id === "velha"), "não-favorita de 25 dias foi podada");
  const dupe = norm.find((h) => h.id === "dupe");
  assert(!!dupe && dupe.favorita && /favoritada/.test(dupe.texto), "dedupe por id: a ÚLTIMA ocorrência vence");
  assert(norm[0]!.id === "nova" && norm[0]!.criadaEm >= norm[norm.length - 1]!.criadaEm, "ordenada por criadaEm desc");

  // teto de não-favoritas: as mais novas ficam; favoritas nunca contam pro teto
  const monte: unknown[] = [];
  for (let i = 0; i < MAX_NAO_FAVORITAS + 5; i++) monte.push(mkH("m" + i, 0, false, { criadaEm: agora - i * 1000 }));
  monte.push(mkH("fav", 10, true));
  const comTeto = normalizarHistorias(monte, agora);
  assert(comTeto.filter((h) => !h.favorita).length === MAX_NAO_FAVORITAS, "teto de " + MAX_NAO_FAVORITAS + " não-favoritas");
  assert(comTeto.some((h) => h.id === "fav"), "favorita não conta pro teto e sobrevive");
  assert(!comTeto.some((h) => h.id === "m" + (MAX_NAO_FAVORITAS + 4)), "as mais ANTIGAS caem primeiro");

  // título e data relativa
  assert(tituloDaHistoria({ nome: "a Lua" }) === "A história de a Lua", "título usa o nome do último objeto");
  assert(tituloDaHistoria(null) === "Minha história no Quintal", "sem objeto → título fallback");
  assert(dataRelativa(agora, agora) === "hoje" && dataRelativa(agora - DIA, agora) === "ontem"
    && dataRelativa(agora - 3 * DIA, agora) === "há 3 dias", "data relativa calorosa (hoje/ontem/há N dias)");
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

console.log("\n=== Modos (02-08) — autorizarIA (intenção do cuidador) ===");
{
  // A fábrica de motores v1 foi arquivada na implantação do A+ (old/motores/);
  // a flag segue viva como INTENÇÃO do cuidador, consumida pelas bordas de
  // flags (aplicarFlagsAosModos) — a IA em runtime volta como realizador v3.
  assert(modosPadrao.iaLigada === false, "default seguro: iaLigada=false");
  const ligado = autorizarIA(modosPadrao, true);
  assert(ligado.iaLigada === true && modosPadrao.iaLigada === false, "autorizarIA liga sem mutar o original");
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

console.log("\n=== Agregados do painel (PC_DASH 03-02) — resumir / gerarSeries / engajamento ===");
{
  const D = 86_400_000;
  const mkL = (dia: number, palavras: number, cenario = "quintal_anoitecer"): EventoTelemetria =>
    ({ esquema: "pipoca.telemetria.v1", tipo: "leitura_confirmada", perfilId: "p1", ts: dia * D, dados: { palavras, cenarioId: cenario, nivel: "n2", verificacao: "cuidador" } });
  const mkS = (dia: number, minutos: number): EventoTelemetria =>
    ({ esquema: "pipoca.telemetria.v1", tipo: "sessao_encerrada", perfilId: "p1", ts: dia * D, dados: { minutos, palavras: 0, historias: 0 } });
  const mkH = (dia: number): EventoTelemetria =>
    ({ esquema: "pipoca.telemetria.v1", tipo: "historia_concluida", perfilId: "p1", ts: dia * D, dados: { cenarioId: "quintal_anoitecer", nivel: "n2", objetos: 3, palavras: 20 } });

  const agora = 100 * D + 1;
  const eventos: EventoTelemetria[] = [
    mkL(98, 5), mkL(99, 7), mkL(100, 6), mkL(50, 4),
    mkS(100, 10), mkS(100, 999), mkH(100),
  ];

  // --- período / janela ---
  assert(filtrarPorPeriodo(eventos, "semana", agora).length === 6, "semana (7d) exclui o evento do dia 50");
  assert(filtrarPorPeriodo(eventos, "tudo", agora).length === 7, "tudo não filtra por janela");

  // --- resumir (tudo) ---
  const rt = resumir(eventos, "tudo", agora);
  assert(rt.palavras === 22, "palavras = soma de leitura_confirmada (5+7+6+4)");
  assert(rt.minutos === 10 + TETO_MINUTOS_SESSAO, "minutos clampa outlier (999→teto) e soma (10+60)");
  assert(rt.historias === 1, "histórias = contagem de historia_concluida");
  assert(rt.diasAtivos === 4, "diasAtivos = dias distintos com evento (50,98,99,100)");
  assert(rt.sequenciaDias === 3, "sequenciaDias = maior cadeia de dias seguidos lendo (98-99-100)");

  // --- resumir (semana) exclui o dia 50 ---
  const rs = resumir(eventos, "semana", agora);
  assert(rs.palavras === 18 && rs.diasAtivos === 3, "semana ignora o dia 50 (palavras 18, 3 dias)");

  // --- séries ---
  const s = gerarSeries(eventos, "tudo", agora);
  assert(s.minutosPorDia.length === 1 && s.minutosPorDia[0]!.valor === 70, "minutosPorDia agrega o dia 100 (70)");
  assert(s.palavrasPorDia.length === 4 && s.palavrasPorDia[0]!.rotulo === chaveDia(50 * D), "palavrasPorDia ordenado começa no dia 50");
  assert(s.historiasPorSemana.length === 1 && s.historiasPorSemana[0]!.valor === 1, "historiasPorSemana agrupa por semana");
  assert(s.engajamentoPorDia.every((p) => p.valor >= 0 && p.valor <= 1), "engajamentoPorDia normalizado em 0..1");

  // --- engajamento: heurística calorosa, não nota ---
  const diaCheio: EventoTelemetria[] = [
    mkL(100, 6, "quintal_anoitecer"), mkL(100, 6, "floresta"), mkL(100, 6, "espaco"),
    mkL(100, 6, "fundomar"), mkL(100, 6, "quarto"),
  ];
  assert(calcularEngajamento(diaCheio, chaveDia(100 * D)) === 1, "dia cheio (5 leituras, 3+ cenários) → engajamento 1");
  assert(calcularEngajamento(eventos, chaveDia(7 * D)) === 0, "dia sem leitura → engajamento 0 (sem culpa)");
  const parcial = calcularEngajamento([mkL(100, 6)], chaveDia(100 * D));
  assert(parcial > 0 && parcial < 1, "1 leitura, 1 cenário → engajamento parcial (0<v<1)");

  // --- vazio / read-only ---
  const vazio = resumir([], "tudo", agora);
  assert(vazio.minutos === 0 && vazio.palavras === 0 && vazio.sequenciaDias === 0, "sem telemetria → zeros coerentes (estado vazio)");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
