/**
 * [run-linha-verde-canonico.mjs] — Runner e2e da LINHA VERDE CANÔNICA: sobe o
 *   server, dirige o app da criança em /app com Playwright e verifica o caminho
 *   ponta-a-ponta (boot, composição A+ v3, telas T2–T7 e os fluxos M-B).
 *
 * PAPEL: e2e (offline · prova de vida do bundle real num Chromium headless)
 * POR QUE EXISTE: garante que o app montado (pipoca.bundle.js + src/app/estado.js
 *   + telas .dc.html) sobe e caminha ponta-a-ponta — pega regressões de
 *   integração que os unit tests não veem (PINGATE/KIDMODE/onboarding, flags,
 *   fala, login, save por perfil, histórias salvas, conta & segurança).
 * ENTRA: env E2E_PORT (5137), PW_CORE/PW_CHROME (playwright-core e Chromium em
 *   cache), server.js servindo o repo; injeta PIPOCA_CONFIG={provedor:"local"}.
 * SAI: relatório ✓/✗ no console + process.exit(1) se algum assert falhar.
 * CHAMA: node:child_process (spawn "node server.js"), node:net (espera a porta),
 *   node:fs (lê docs/quintal.v3.json p/ prova de vida do v3), playwright-core
 *   (chromium); dirige window.PipocaApp/PipocaCanonico/PipocaRoteador do bundle.
 * É CHAMADO POR: scripts npm `test:e2e` e `test:e2e:canonico` (package.json);
 *   é um entrypoint (nenhum módulo o importa).
 * RODA POR: `bun run test:e2e:canonico`
 * CUIDADO: roda SEMPRE offline — PIPOCA_CONFIG local é injetado ANTES de qualquer
 *   script e vence o pipoca.config.js commitado; depende de caminhos ABSOLUTOS
 *   de máquina (PW_CORE/PW_CHROME em C:/Users/mfard/...), sobrescrevíveis por env,
 *   e do bundle BUILDADO (bun run build:app). Cliente keyless: nenhuma chave de IA.
 *
 * — detalhe preservado —
 * Runner e2e da LINHA VERDE CANÔNICA (TRILHA Marco M-A).
 * --------------------------------------------------------
 * Aponta para "/app" (index.html — a raiz "/" virou a landing pública, Task #18):
 * entry fino que carrega pipoca.bundle.js +
 * src/app/estado.js e compõe Shell + TELAS CANÔNICAS (src/telas/*.dc.html)
 * por componente-irmão (fetch on-demand). O antigo entry duplicado app.html
 * foi aposentado (old/app.html).
 *
 * Verifica: (1) boot + seam canônico (motor da fábrica, não stub); (2) narrativa
 * cresce (abertura + trechos + desfecho); (3) cada tela T2–T7 MONTA de verdade
 * (texto-marcador aparece no DOM) ao navegar; (4) sem erros de página.
 *
 * Usa playwright-core em cache (registry offline). Porta dedicada 5137.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";

const require = createRequire(import.meta.url);
const PW_CORE =
  process.env.PW_CORE ||
  "C:/Users/mfard/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core";
const { chromium } = require(PW_CORE);

const PORT = Number(process.env.E2E_PORT) || 5137;
const BASE = `http://localhost:${PORT}`;

let passou = 0, falhou = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); passou++; }
  else { console.error(`  ✗ ${msg}`); falhou++; }
};

function esperarPorta(port, timeoutMs = 15000) {
  const inicio = Date.now();
  return new Promise((resolve, reject) => {
    const tentar = () => {
      const s = net.connect(port, "localhost");
      s.on("connect", () => { s.end(); resolve(); });
      s.on("error", () => {
        s.destroy();
        if (Date.now() - inicio > timeoutMs) reject(new Error("timeout esperando o server"));
        else setTimeout(tentar, 200);
      });
    };
    tentar();
  });
}

// Marcadores de montagem por tela (texto sempre visível quando a tela renderiza).
const MARCADORES = {
  2: /ler hoje|Oi!|Carregando/i,
  3: /história acontece hoje|Favorito de hoje|Quintal/i,
  4: /história até agora|Ateliê|Quintal/i,
  5: /luzinha|Uma|palavra|confirmar/i,
  6: /Você leu/i,
  7: /agrado|dividir o que você/i,
};

const server = spawn("node", ["server.js"], { stdio: "ignore", env: { ...process.env, PORT: String(PORT) } });
let browser;
try {
  await esperarPorta(PORT);
  const EXEC =
    process.env.PW_CHROME ||
    "C:/Users/mfard/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage();
  // fase06 · o e2e roda SEMPRE offline: força o backend "local" ANTES de
  // qualquer script da página (o pipoca.config.js commitado respeita via ||).
  await page.addInitScript(() => {
    window.PIPOCA_CONFIG = { provedor: "local" };
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  const consoleErr = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleErr.push(m.type() + ": " + m.text()); });
  const http404 = [];
  page.on("response", (r) => { if (r.status() >= 400) http404.push(r.status() + " " + r.url()); });

  // O app da criança vive em /app (a raiz é a landing pública desde a Task #18).
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.cenarioV2 && !!window.PipocaApp.repo,
    { timeout: 15000 }
  );

  console.log("\n=== Boot do app canônico (/) + seam da composição A+ (grafo v3) ===");
  assert(
    (await page.evaluate(() => window.PIPOCA_CONFIG && window.PIPOCA_CONFIG.provedor)) === "local",
    "fase06: backend local forçado no e2e (config injetada vence o pipoca.config.js)"
  );
  const r = await page.evaluate(() => {
    const Canon = window.PipocaCanonico, App = window.PipocaApp;
    App.iniciarComposicao();
    const compR1 = App.estado.comp;
    const inserirNaR1 = App.podeInserirComposicao(compR1.banco[0], 1);
    App.ordenarR1Composicao(compR1.banco.slice(0, 3));
    App.abrirProximaRodadaComposicao(); // R2 revela +1
    const comp = App.estado.comp;
    const novo = comp.banco[0];
    return {
      temCanon: !!Canon,
      temRepo: !!App.repo && typeof App.repo.carregarPerfis === "function",
      esquema: Canon.composicao && Canon.composicao.esquema,
      cenarioId: App.cenarioV2 && App.cenarioV2.id,
      bancoR1: compR1.banco.length,
      inserirNaR1,
      pontasTravadas: comp.pontasTravadas === true,
      inserirNaPonta: App.podeInserirComposicao(novo, 0),
      inserirNoMiolo: App.podeInserirComposicao(novo, 1),
      textoR2: App.montarComposicao("n3"),
    };
  });
  assert(r.temCanon, "window.PipocaCanonico presente (bundle carregado)");
  assert(r.temRepo, "window.PipocaApp.repo exposto (seam de persistência)");
  assert(r.esquema === "pipoca.grafo-autoral.v3", "seam declara o esquema ativo pipoca.grafo-autoral.v3");
  assert(r.cenarioId === "quintal_anoitecer", "grafo v3 do Quintal fetchado e ativo (cenarioV2)");
  assert(r.bancoR1 === 4, "R1 revela 4 objetos no banco");
  assert(r.inserirNaR1 === false, "R1 não aceita inserção avulsa (só ordenar 3)");
  assert(r.pontasTravadas, "após ordenar R1, as pontas travam (âncoras)");
  assert(r.inserirNaPonta === false, "R2 recusa inserir na ponta (âncora travada)");
  assert(r.inserirNoMiolo === true, "R2 aceita inserir no miolo");
  assert(typeof r.textoR2 === "string" && r.textoR2.length > 0 && !r.textoR2.includes("undefined"), "montar tece texto sem undefined");

  console.log("\n=== Narrativa CRESCE pela composição (R1 → R4 → desfecho) e replay é determinístico ===");
  const cresce = await page.evaluate(() => {
    const App = window.PipocaApp;
    App.iniciarComposicao();
    App.ordenarR1Composicao(App.estado.comp.banco.slice(0, 3));
    const tamanhos = [App.montarComposicao("n3").length];
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      App.abrirProximaRodadaComposicao();
      if (App.composicaoConvergiu()) break;
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let inseriu = false;
      for (let slot = 1; slot < comp.linha.length && !inseriu; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) inseriu = App.inserirComposicao(objeto, slot);
      }
      if (!inseriu) break;
      tamanhos.push(App.montarComposicao("n3").length);
    }
    const final1 = App.montarComposicao("n3");
    const final2 = App.montarComposicao("n3");
    return { tamanhos, linha: App.estado.comp.linha.length, replayIgual: final1 === final2, final: final1 };
  });
  assert(cresce.linha === 6, "linha final com 6 objetos (R1 ordena 3 + R2-R4 inserem 3)");
  assert(
    cresce.tamanhos.every((t, i) => i === 0 || t > cresce.tamanhos[i - 1]),
    `o texto cresce a cada rodada (${cresce.tamanhos.join(" → ")} chars)`
  );
  assert(cresce.replayIgual, "replay determinístico: montar 2× devolve o mesmo texto");
  assert(cresce.final.length > cresce.tamanhos[0], "texto final (com desfecho) maior que o da R1");

  console.log("\n=== Telas T2–T7 MONTAM de verdade (componente-irmão) ===");
  // Semeia o estado para as telas renderizarem conteúdo real.
  await page.evaluate(() => {
    window.PipocaApp.setState({
      perfil: { id: "p1", nome: "Joana", idade: 7, nivel: "n3", avatarId: "pingo" },
      historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
      gateObjId: "vagalume", gateTrecho: "Uma luzinha piscando no escuro.",
      gatePalavraIdx: 0, gateStage: "reading", gateEarned: 3,
      economia: { vagalumes: 3, poupado: 0 },
    });
  });
  for (const n of [2, 3, 4, 5, 6, 7]) {
    await page.evaluate((tela) => {
      if (window.PipocaRoteador) window.PipocaRoteador.irParaTela(tela);
      window.PipocaApp.setState({ tela });
    }, n);
    let montou = true;
    try {
      await page.waitForFunction(
        (re) => new RegExp(re.source, re.flags).test(document.body.innerText),
        { timeout: 4000 },
        { source: MARCADORES[n].source, flags: MARCADORES[n].flags }
      );
    } catch { montou = false; }
    const telaAtual = await page.evaluate(() => window.PipocaApp.estado.tela);
    assert(telaAtual === n && montou, `tela ${n} ativa e montada no slot do Shell`);
  }

  console.log("\n=== M-B · PINGATE (1º uso) + KIDMODE + Onboarding cria perfil ===");
  // 1º uso determinístico: zera só o PIN salvo e os perfis (acesso é lido fresco do
  // localStorage a cada chamada — sem reload, mantendo o app "quente").
  await page.evaluate(() => { localStorage.removeItem("pipoca.acesso.v1"); });

  const digitar = async (pin) => {
    for (const d of pin.split("")) { await page.locator(`[aria-label="${d}"]`).first().click(); await page.waitForTimeout(40); }
  };

  // Abre o portão (T1) e cria o PIN no 1º uso → entra no hub do cuidador (PC_HOME, tela 10).
  const estrutura = () => page.evaluate(() => ({
    brand: /Pipoca/.test(document.body.innerText),
    nbtn: document.querySelectorAll('button').length,
    itLen: document.body.innerText.length,
    bodyHTML: document.body.innerHTML.replace(/\s+/g, ' ').slice(0, 600),
  }));
  const ePosLoop = await estrutura();
  console.log("  [estrutura pos-loop tela7] itLen=" + ePosLoop.itLen + " nbtn=" + ePosLoop.nbtn);
  await page.evaluate(() => { window.PipocaRoteador.irParaTela(2); window.PipocaApp.setState({ tela: 2 }); });
  await page.waitForTimeout(1200);
  const e2 = await estrutura();
  console.log("  [estrutura T2] brand=" + e2.brand + " nbtn=" + e2.nbtn + " itLen=" + e2.itLen + " body=" + JSON.stringify(e2.bodyHTML));
  await page.evaluate(() => { window.PipocaRoteador.irParaTela(1); window.PipocaApp.setState({ tela: 1 }); });
  await page.waitForTimeout(1200);
  const e1 = await estrutura();
  console.log("  [estrutura T1] brand=" + e1.brand + " nbtn=" + e1.nbtn + " tree=" + JSON.stringify(e1.tree));
  await page.waitForTimeout(300);
  const dbg = await page.evaluate(() => ({
    txt: document.body.innerText.slice(0, 160),
    aria1: !!document.querySelector('[aria-label="1"]'),
    nbtn: document.querySelectorAll('button').length,
    hostTela: window.PipocaApp && window.PipocaApp.estado && window.PipocaApp.estado.tela,
    rootHTML: ((document.querySelector('#dc-root') || document.body).innerHTML || '').replace(/\s+/g, ' ').slice(0, 320),
  }));
  console.log("  [debug PINGATE] aria1=" + dbg.aria1 + " nbtn=" + dbg.nbtn + " hostTela=" + dbg.hostTela + " txt=" + JSON.stringify(dbg.txt));
  console.log("  [debug rootHTML] " + JSON.stringify(dbg.rootHTML));
  console.log("  [debug console] " + (consoleErr.length ? consoleErr.slice(-6).join(" || ") : "nenhum"));
  console.log("  [debug pageerror] " + (erros.length ? erros.slice(-3).join(" || ") : "nenhum"));
  console.log("  [debug http>=400] " + (http404.length ? http404.join(" || ") : "nenhum"));
  await digitar("1234");
  await page.waitForTimeout(250);
  const posPin = await page.evaluate(() => ({
    tela: window.PipocaApp.estado.tela,
    temPin: window.PipocaCanonico.acesso.temPin(),
    modo: window.PipocaApp.estado.modoApp,
  }));
  assert(posPin.temPin === true, "PINGATE 1º uso cria o PIN (acesso.ts)");
  assert(posPin.tela === 10, "após criar o PIN entra no hub do cuidador (PC_HOME, tela 10)");
  assert(posPin.modo === "cuidador", "KIDMODE: modoApp vira cuidador ao passar o portão");

  // Onboarding monta perfil e persiste no repo (seam), aterrissando na criança (T2).
  await page.waitForFunction(() => /Configurar a leitura/.test(document.body.innerText), { timeout: 4000 });
  await page.fill('[aria-label="Nome da criança"]', "Tião");
  // fase13 pós-incidente: gênero é OBRIGATÓRIO no onboarding (identidade real).
  await page.locator("button", { hasText: "Um menino" }).first().click();
  await page.locator("button", { hasText: "Tudo pronto" }).first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 2 && !!window.PipocaApp.estado.perfil, { timeout: 4000 });
  const posOb = await page.evaluate(async () => {
    const perfis = await window.PipocaApp.repo.carregarPerfis();
    return {
      nPerfis: perfis.length,
      perfilNome: window.PipocaApp.estado.perfil && window.PipocaApp.estado.perfil.nome,
      modo: window.PipocaApp.estado.modoApp,
    };
  });
  assert(posOb.nPerfis >= 1, "onboarding persiste o perfil no repo (seam salvarPerfil)");
  assert(posOb.perfilNome === "Tião", "perfil ativo passa a ser o recém-criado");
  assert(posOb.modo === "crianca", "conclui no modo criança (KIDMODE volta)");

  // PIN errado mantém no portão (sem entrar).
  await page.evaluate(() => window.PipocaApp.abrirPortao());
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 1, { timeout: 4000 });
  await digitar("0000");
  await page.waitForTimeout(250);
  assert((await page.evaluate(() => window.PipocaApp.estado.tela)) === 1, "PIN errado mantém no portão do cuidador");

  // KIDMODE: no modo criança, navegar a uma superfície adulta (10) é barrado p/ T2.
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); window.PipocaApp.setState({ tela: 10 }); });
  await page.waitForTimeout(150);
  assert((await page.evaluate(() => window.PipocaApp.estado.tela)) === 2, "KIDMODE barra acesso direto ao hub adulto (redireciona a T2)");

  // ── fase05 · kill-switches da plataforma: fail-closed + intenção do cuidador ──
  // O motor v1/B foi arquivado na implantação do A+ v3; o que segue vivo é a
  // POLÍTICA: flags da plataforma aplicadas na borda de consumo
  // (Canon.flags.aplicarFlagsAosModos), sem jamais reescrever a intenção.
  const faseFlags = await page.evaluate(() => {
    const App = window.PipocaApp, F = window.PipocaCanonico.flags;
    const efetivos = () => F.aplicarFlagsAosModos(App.estado.modos, F.carregarFlags());
    // cuidador autoriza, plataforma ainda fechada (FLAGS_PADRAO ia:false) → fail-closed
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) });
    const soCuidador = efetivos().iaLigada;
    // plataforma libera (SA_SAFE) → o efetivo liga na hora, sem reload
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: true, fala: true, conteudoCustomizado: true, telemetria: true }));
    const comFlag = efetivos().iaLigada;
    // kill-switch derruba mesmo com o cuidador autorizando — e NÃO apaga a intenção
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: false, fala: false, conteudoCustomizado: true, telemetria: true }));
    return {
      soCuidador,
      comFlag,
      aposKill: efetivos().iaLigada,
      intencaoPreservada: App.estado.modos.iaLigada === true,
    };
  });
  assert(faseFlags.soCuidador === false, "fase05: cuidador autorizou mas plataforma fechada (fail-closed) → IA efetiva OFF");
  assert(faseFlags.comFlag === true, "fase05: flag da plataforma + autorização do cuidador → IA efetiva ON na hora (sem reload)");
  assert(faseFlags.aposKill === false && faseFlags.intencaoPreservada, "fase05: kill-switch derruba a IA efetiva SEM apagar a intenção do cuidador");
  await page.evaluate(() => {
    localStorage.removeItem("pipoca.admin.flags.v1");
    window.PipocaApp.setState({ modos: Object.assign({}, window.PipocaApp.estado.modos, { iaLigada: false }) });
  });

  // ── fase05 · modo fala (ASR): sem reconhecimento no aparelho o portão NÃO quebra ──
  // Removemos a Web Speech API para forçar o caminho real de indisponibilidade.
  await page.evaluate(() => {
    try { delete window.SpeechRecognition; } catch (_) {}
    try { delete window.webkitSpeechRecognition; } catch (_) {}
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: false, fala: true, conteudoCustomizado: true, telemetria: true }));
    const App = window.PipocaApp;
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: false, verificacao: "fala" }) });
    // T5 isolada com um trecho de leitura; comp nulo faz o commit só creditar e avançar.
    App.setState({ tela: 5, gateTrecho: "A luzinha piscou no quintal.", gateStage: "reading", gatePendente: null, comp: null });
  });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 5, { timeout: 4000 });
  assert(
    (await page.evaluate(() => window.PipocaApp.estado.modos.verificacao)) === "fala",
    "fase05: cuidador escolhe verificação pela voz (intenção gravada)"
  );
  await page.locator("button", { hasText: "Continuar a história" }).first().click();
  await page.waitForFunction(() => /Ler em voz alta/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "fase05: modo fala monta o botão de leitura em voz alta (T5)");
  await page.locator("button", { hasText: "Ler em voz alta" }).first().click();
  await page.waitForFunction(() => /Vamos confirmar de outro jeito/i.test(document.body.innerText), { timeout: 8000 });
  assert(true, "fase05: sem reconhecimento, aparece o fallback acolhedor (sem culpar a criança)");
  await page.locator("button", { hasText: "Leu sozinho" }).first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 6, { timeout: 4000 });
  assert(true, "fase05: o portão avança pelo caminho do cuidador — sem microfone NÃO quebra");
  await page.evaluate(() => localStorage.removeItem("pipoca.admin.flags.v1"));

  // ── fase06 · login pelo seam: local funciona; backend inacessível degrada NEUTRO ──
  const fase06Login = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const okLocal = await App.entrarNaConta("casa06@pipoca.dev", "segredo-e2e");
    // backend remoto MORTO (porta fechada): erro neutro, sem quebrar o app
    window.PIPOCA_CONFIG = { provedor: "supabase", supabaseUrl: "http://127.0.0.1:9", supabaseAnonKey: "x" };
    const okRemotoMorto = await App.entrarNaConta("casa06@pipoca.dev", "segredo-e2e");
    window.PIPOCA_CONFIG = { provedor: "local" };
    return {
      local: !!(okLocal && okLocal.ok === true),
      remotoMorto: !!(okRemotoMorto && okRemotoMorto.ok === false && typeof okRemotoMorto.erro === "string"),
    };
  });
  assert(fase06Login.local, "fase06: login da família pelo seam (backend local) funciona");
  assert(fase06Login.remotoMorto, "fase06: backend inacessível → erro NEUTRO, app não quebra (fail-soft)");

  // ── UX por perfil (etapa 2) · save por criança: trocar zera, voltar hidrata,
  // reload persiste. O flush na borda grava o save ANTES da troca.
  console.log("\n=== UX por perfil · save por criança (troca + hidratação + reload) ===");
  const uxSave = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    // Com genero definido (fase13 pós-incidente): perfil sem gênero dispara o
    // overlay pedir-uma-vez — coberto no e2e da geração 2, não aqui.
    const A = { id: "uxA", nome: "Ana", idade: 7, nivel: "n2", avatarId: "lua", genero: "f" };
    const B = { id: "uxB", nome: "Bia", idade: 8, nivel: "n3", avatarId: "tuca", genero: "f" };
    await App.repo.salvarPerfil(A);
    await App.repo.salvarPerfil(B);
    App.selecionarPerfil(A, 3);
    await espera(30); // hidratação resolve em microtask (repo local)
    App.setState({
      economia: { vagalumes: 7, poupado: 2 },
      cardapio: [{ id: "pipoca", label: "Pipoca no cinema", icon: "🍿", cost: 4 }],
    });
    App.selecionarPerfil(B, 3); // a borda drena o save da Ana ANTES da troca
    await espera(30);
    const poteB = App.estado.economia.vagalumes;
    const cardapioB = App.estado.cardapio;
    App.selecionarPerfil(A, 3);
    await espera(30);
    const saveA = await App.repo.carregarSave("uxA");
    return {
      poteB,
      cardapioB,
      poteA: App.estado.economia.vagalumes,
      poupadoA: App.estado.economia.poupado,
      cardapioA: App.estado.cardapio && App.estado.cardapio[0] && App.estado.cardapio[0].id,
      saveOk: !!saveA && saveA.economia.vagalumes === 7
        && !!saveA.cardapio && saveA.cardapio[0].id === "pipoca",
      projecaoMinima: !!saveA && saveA.tela === 2 && saveA.sessao === null
        && !("comp" in saveA) && !("gateTrecho" in saveA),
    };
  });
  assert(uxSave.poteB === 0 && uxSave.cardapioB === null, "trocar de criança ZERA pote/config (B não herda da A)");
  assert(uxSave.poteA === 7 && uxSave.poupadoA === 2, "voltar à criança A hidrata o pote do save dela");
  assert(uxSave.cardapioA === "pipoca", "cardápio configurado da A volta do save");
  assert(uxSave.saveOk === true, "flush na borda gravou o save da A no repo (pipoca.save.v1)");
  assert(uxSave.projecaoMinima === true, "projeção mínima: tela 2, sessao null; comp/gate NÃO vazam pro save");

  // Reload: o save por perfil sobrevive (persistência de verdade).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.repo,
    { timeout: 15000 }
  );
  const uxReload = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const perfis = await App.repo.carregarPerfis();
    const A = perfis.find((p) => p.id === "uxA");
    if (!A) return { ok: false };
    App.selecionarPerfil(A, 3);
    await new Promise((r) => setTimeout(r, 50));
    return {
      ok: true,
      pote: App.estado.economia.vagalumes,
      cardapio: App.estado.cardapio && App.estado.cardapio[0] && App.estado.cardapio[0].id,
    };
  });
  assert(
    !!uxReload.ok && uxReload.pote === 7 && uxReload.cardapio === "pipoca",
    "reload: pote e cardápio da criança persistem (save por perfil)"
  );

  // ── UX por perfil (etapa 3) · as telas da criança CONSOMEM a config ──
  // T7 lista o cardápio configurado (não mais hardcoded); T3 governa a grade
  // pelos cenários liberados (quintal em destaque segue sempre jogável).
  console.log("\n=== UX por perfil · telas consomem a config (T7 cardápio, T3 cenários) ===");
  await page.evaluate(() => {
    window.PipocaApp.setState({
      tela: 7,
      cardapio: [
        { id: "pipoca", label: "Pipoca no cinema", icon: "🍿", cost: 4 },
        { id: "gibi", label: "Gibi novo", icon: "📚", cost: 9 },
      ],
    });
  });
  await page.waitForFunction(
    () => /Pipoca no cinema/.test(document.body.innerText) && /Gibi novo/.test(document.body.innerText),
    { timeout: 4000 }
  );
  const t7Config = await page.evaluate(() => ({
    marcador: /agrado|dividir o que você/i.test(document.body.innerText),
    itemAntigo: /30 min de parque/.test(document.body.innerText),
  }));
  assert(t7Config.marcador, "T7 mantém os marcadores do pote (agrado/dividir)");
  assert(!t7Config.itemAntigo, "T7 lista o cardápio CONFIGURADO, não o hardcoded");

  await page.evaluate(() => { window.PipocaApp.setState({ tela: 3, cenariosLiberados: null }); });
  await page.waitForFunction(
    () => (document.body.innerText.match(/Em breve/g) || []).length === 4,
    { timeout: 4000 }
  );
  const t3Padrao = await page.evaluate(() => (document.body.innerText.match(/Em breve/g) || []).length);
  await page.evaluate(() => { window.PipocaApp.setState({ cenariosLiberados: ["quintal_anoitecer", "quarto"] }); });
  await page.waitForFunction(() => /Novo!/.test(document.body.innerText), { timeout: 4000 });
  const t3Liberado = await page.evaluate(() => ({
    emBreve: (document.body.innerText.match(/Em breve/g) || []).length,
    quintal: /Favorito de hoje/i.test(document.body.innerText),
  }));
  assert(t3Padrao === 4, "T3 padrão: 4 cenários da grade em 'Em breve' (só o quintal liberado)");
  assert(t3Liberado.emBreve === 3 && t3Liberado.quintal, "T3 obedece cenariosLiberados (quarto liberado vira 'Novo!'; quintal segue em destaque)");
  await page.evaluate(() => { window.PipocaApp.setState({ cenariosLiberados: null, cardapio: null }); });

  // ── UX por perfil (etapa 4) · prefs por chip: gravar no perfil NÃO-ativo vai
  // pro save dele sem tocar o estado vivo; no ATIVO muda o vivo (fonte única).
  console.log("\n=== UX por perfil · prefs por criança (chips do cuidador) ===");
  const uxPrefs = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const vivoAntes = App.estado.modos.verificacao;
    await App.gravarPrefsPerfil("uxB", {
      modos: { palco: "Palco", desfecho: "aberto", verificacao: "auto", iaLigada: false },
    });
    const vivoDepois = App.estado.modos.verificacao;
    const prefsB = await App.lerPrefsPerfil("uxB");
    await App.gravarPrefsPerfil("uxA", {
      modos: Object.assign({}, App.estado.modos, { verificacao: "auto" }),
    });
    return {
      naoAtivoNaoVaza: vivoDepois === vivoAntes,
      prefsB: prefsB.modos.verificacao + ":" + prefsB.modos.desfecho,
      vivoAtivo: App.estado.modos.verificacao,
    };
  });
  assert(uxPrefs.naoAtivoNaoVaza, "gravar prefs de perfil NÃO-ativo não muda o estado vivo");
  assert(uxPrefs.prefsB === "auto:aberto", "prefs do não-ativo foram pro save dele (lerPrefsPerfil confirma)");
  assert(uxPrefs.vivoAtivo === "auto", "gravar prefs do perfil ATIVO muda o vivo (telas/motor reagem)");

  // Chips das crianças aparecem na tela do cuidador (T14 Regras & IA).
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 8, { timeout: 4000 });
  assert(true, "pós-PIN aterrissa na Evolução da leitura (T8) — o hub fica a um toque");
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 14 }); });
  await page.waitForFunction(() => /Quem confirma a leitura/i.test(document.body.innerText), { timeout: 4000 });
  const uxChips = await page.evaluate(() => ({
    ana: /Ana/.test(document.body.innerText),
    bia: /Bia/.test(document.body.innerText),
  }));
  assert(uxChips.ana && uxChips.bia, "T14 mostra os chips das crianças (configuração independente)");
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });

  // ── UX por perfil (etapa 5) · dashboards: saldos por criança no hub (T11) e
  // cartão do pote no painel de evolução (T8).
  console.log("\n=== UX por perfil · dashboards (T11 saldos, T8 pote) ===");
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 8, { timeout: 4000 });
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 11 }); });
  await page.waitForFunction(() => /guardados/i.test(document.body.innerText), { timeout: 4000 });
  const t11Saldos = await page.evaluate(() => ({
    ana: /Ana/.test(document.body.innerText),
    saldoAna: /✨\s*7/.test(document.body.innerText),
  }));
  assert(t11Saldos.ana && t11Saldos.saldoAna, "T11 resume os potes por criança (Ana com ✨ 7)");
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 8 }); });
  await page.waitForFunction(() => /Pote de vaga-lumes/i.test(document.body.innerText), { timeout: 4000 });
  const t8Pote = await page.evaluate(() => /✨\s*7/.test(document.body.innerText));
  assert(t8Pote, "T8 mostra o cartão do pote com o saldo da criança do chip");
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });

  // ── UX por perfil (etapa 6) · engrenagem → "Sou o adulto" → PIN → painel →
  // voltar RETOMA a leitura onde estava (telaCriancaAnterior), composição intacta.
  console.log("\n=== UX por perfil · engrenagem → cuidador → retomada da leitura ===");
  await page.evaluate(() => {
    const App = window.PipocaApp;
    App.iniciarComposicao();
    App.setState({ tela: 5, gateTrecho: "A luzinha piscou de novo.", gateStage: "reading", gatePendente: null });
  });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 5, { timeout: 4000 });
  const compAntes = await page.evaluate(() =>
    JSON.stringify(window.PipocaApp.estado.comp && window.PipocaApp.estado.comp.linha)
  );
  // ⚙ abre o modal "Do meu jeito"; o rodapé leva ao portão
  await page.evaluate(() => { window.PipocaApp.setState({ showA11y: true }); });
  await page.waitForFunction(() => /Sou o adulto/i.test(document.body.innerText), { timeout: 4000 });
  await page.locator("button", { hasText: "Sou o adulto" }).first().click();
  await page.waitForFunction(
    () => window.PipocaApp.estado.tela === 1 && !window.PipocaApp.estado.showA11y,
    { timeout: 4000 }
  );
  assert(true, "⚙ → 'Sou o adulto' fecha o modal e abre o PINGATE");
  // PIN certo → hub do cuidador; "Para a criança" → volta pra T5, não pra T2
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 8, { timeout: 4000 });
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 5, { timeout: 4000 });
  const volta = await page.evaluate(() => ({
    modo: window.PipocaApp.estado.modoApp,
    comp: JSON.stringify(window.PipocaApp.estado.comp && window.PipocaApp.estado.comp.linha),
  }));
  assert(volta.modo === "crianca", "voltar do painel RETOMA a T5 no modo criança (não cai na T2)");
  assert(volta.comp === compAntes && volta.comp !== "null", "a composição da leitura segue intacta na volta");
  // Cancelar o PIN também devolve à mesma tela (aoVoltarParaCrianca é a mesma porta).
  await page.evaluate(() => { window.PipocaApp.abrirPortao(); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 1, { timeout: 4000 });
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 5, { timeout: 4000 });
  assert(true, "cancelar o PIN devolve à mesma tela da leitura (retomada sem perdas)");
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 2 }); });

  // ── Conta da família · cadastro explícito + recuperação de senha (T9) ──
  console.log("\n=== Conta da família · criar conta + recuperar senha ===");
  const uxConta = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const cria = await App.criarConta("nova-casa@pipoca.dev", "segredo123");
    const rec = await App.recuperarSenha("qualquer@x.dev");
    return { criaOk: !!(cria && cria.ok), recOk: !!(rec && rec.ok) };
  });
  assert(uxConta.criaOk, "criarConta pelo seam (backend local) cria conta + sessão");
  assert(uxConta.recOk, "recuperarSenha SEMPRE resolve ok (postura neutra, nunca lança)");

  // UI: a T9 mostra os dois caminhos e o cadastro pela tela entra direto.
  await page.evaluate(() => { window.PipocaApp.sairDaConta(); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 9, { timeout: 4000 });
  await page.waitForFunction(
    () => /Criar conta da família/i.test(document.body.innerText) && /Esqueci a senha/i.test(document.body.innerText),
    { timeout: 4000 }
  );
  assert(true, "T9 mostra 'Criar conta da família' e 'Esqueci a senha'");
  await page.locator("button", { hasText: "Criar conta da família" }).first().click();
  await page.waitForFunction(() => /Confirme a senha/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "modo criar conta monta (com confirmação de senha)");
  await page.fill('[aria-label="E-mail da família"]', "casa-ui@pipoca.dev");
  await page.fill('[aria-label="Senha"]', "segredo123");
  await page.fill('[aria-label="Confirme a senha"]', "segredo123");
  await page.locator("button", { hasText: "Criar conta" }).first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 2, { timeout: 4000 });
  assert(true, "cadastro pela UI entra direto (backend local) e aterrissa na T2");

  // ── Histórias salvas · captura automática na convergência + releitura +
  // favoritar + retenção de 20 dias (favorita fica). ──
  console.log("\n=== Histórias salvas · convergência → T3 → releitura → 💛 → retenção ===");
  const uxHist = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const perfis = await App.repo.carregarPerfis();
    const A = perfis.find((p) => p.id === "uxA");
    App.selecionarPerfil(A, 3);
    await espera(30);
    // percorre a composição inteira pelo seam (R1 + inserções) até convergir
    App.iniciarComposicao();
    App.ordenarR1Composicao(App.estado.comp.banco.slice(0, 3));
    App.abrirProximaRodadaComposicao();
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let inseriu = false;
      for (let slot = 0; slot <= comp.linha.length && !inseriu; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) inseriu = App.inserirComposicao(objeto, slot);
      }
      if (!inseriu) break;
      App.abrirProximaRodadaComposicao();
    }
    await espera(30); // captura fire-and-forget aterrissa
    const chave = "pipoca.historias.v1:uxA";
    const envs = JSON.parse(localStorage.getItem(chave) || "[]");
    const h = envs.length ? envs[envs.length - 1].historia : null;
    return {
      convergiu: App.composicaoConvergiu(),
      capturada: !!h && typeof h.texto === "string" && h.texto.length > 40 && h.linha.length >= 3,
      idNoEstado: App.estado.ultimaHistoriaSalvaId === (h && h.id),
      titulo: h ? h.titulo : "",
      texto: h ? h.texto : "",
    };
  });
  assert(uxHist.convergiu, "a composição converge pelo seam (história completa)");
  assert(uxHist.capturada, "história COMPLETA capturada automaticamente na convergência (texto + linha)");
  assert(uxHist.idNoEstado, "ultimaHistoriaSalvaId aponta a captura (coração da T6)");

  // Prova de vida do v3 (grafo ativo = docs/quintal.v3.json): a história capturada
  // começa por uma variante autorada da abertura e o miolo carrega conectivos.
  {
    const grafoV3 = JSON.parse(readFileSync(new URL("../../docs/quintal.v3.json", import.meta.url), "utf8"));
    const moldura = grafoV3.cenario.moldura;
    const aberturas = Object.values(moldura.abertura).flatMap((t) => (Array.isArray(t) ? t : [t]));
    const conectivos = Object.values(moldura.conectivos || {}).flat();
    assert(
      aberturas.some((a) => uxHist.texto.startsWith(a)),
      "v3 vivo: a história começa com uma variante autorada da abertura"
    );
    assert(
      conectivos.some((c) => uxHist.texto.includes(" " + c + " ")),
      "v3 vivo: o miolo da história carrega conectivo do pool do nível"
    );
  }

  // T3 mostra a faixa e o cartão; tap abre o leitor com o texto completo
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 3 }); });
  await page.waitForFunction(() => /Minhas histórias/i.test(document.body.innerText), { timeout: 4000 });
  await page.waitForFunction(
    (t) => document.body.innerText.indexOf(t) >= 0,
    uxHist.titulo,
    { timeout: 4000 }
  );
  assert(true, "T3 lista o cartão da história recém-terminada");
  // C2: o cartão virou <button> (sem botão aninhado); o coração é irmão.
  await page.locator("button", { hasText: uxHist.titulo }).first().click();
  await page.waitForFunction(() => /Guardar para sempre/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "tap no cartão abre o leitor (modal) da história");

  // favoritar no leitor → envelope com favorita:true
  await page.locator("button", { hasText: "Guardar para sempre" }).first().click();
  await page.waitForFunction(() => /Guardada para sempre/i.test(document.body.innerText), { timeout: 4000 });
  const favOk = await page.evaluate(() => {
    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:uxA") || "[]");
    return envs.some((e) => e.historia && e.historia.favorita === true);
  });
  assert(favOk, "💛 no leitor grava favorita:true no envelope (criadaEm preservado)");
  await page.locator('[aria-label="Fechar"]').first().click();
  await page.waitForFunction(() => !window.PipocaApp.estado.leitorHistoria, { timeout: 4000 });

  // retenção: forja 2 histórias de 21 dias (1 favorita) → a poda tira SÓ a não-favorita
  const uxRetencao = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const DIA = 86400000;
    const chave = "pipoca.historias.v1:uxA";
    const mk = (id, fav) => ({
      esquema: "pipoca.historias.v1",
      historia: {
        id, cenarioId: "quintal_anoitecer", texto: "História antiga de teste. Fim.",
        linha: ["vagalume"], nivel: "n2", desfecho: "convergente",
        titulo: "Antiga " + id, emoji: "🌙",
        criadaEm: Date.now() - 21 * DIA, favorita: fav,
      },
    });
    const arr = JSON.parse(localStorage.getItem(chave) || "[]");
    arr.push(mk("antiga-solta", false), mk("antiga-do-coracao", true));
    localStorage.setItem(chave, JSON.stringify(arr));
    const removidas = await App.repo.podarHistorias("uxA", Date.now());
    const ids = JSON.parse(localStorage.getItem(chave) || "[]").map((e) => e.historia.id);
    return { removidas, soltaSumiu: !ids.includes("antiga-solta"), coracaoFicou: ids.includes("antiga-do-coracao") };
  });
  assert(uxRetencao.removidas >= 1 && uxRetencao.soltaSumiu, "poda de 20 dias remove a história antiga NÃO favorita");
  assert(uxRetencao.coracaoFicou, "a favorita de 21 dias fica PARA SEMPRE (retenção não a toca)");

  // ── Conta & segurança (T16) · trocar PIN exige o atual; senha/e-mail pelo seam ──
  console.log("\n=== Conta & segurança (T16) · PIN, senha e e-mail ===");
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 8, { timeout: 4000 });
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 16 }); });
  await page.waitForFunction(() => /Conta & segurança|PIN do portão/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "T16 monta (Conta & segurança) a partir do hub");
  const uxConta16 = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const errado = App.trocarPin("0000", "4321");
    const certo = App.trocarPin("1234", "4321");
    // confirma que o novo PIN vale e devolve ao original (não suja os outros testes)
    const volta = App.trocarPin("4321", "1234");
    const senha = await App.alterarSenha("nova-senha-9");
    const email = await App.alterarEmail("casa-trocada@pipoca.dev");
    return {
      erradoRecusa: !!(errado && !errado.ok),
      certoTroca: !!(certo && certo.ok),
      voltaOk: !!(volta && volta.ok),
      senhaOk: !!(senha && senha.ok), // modo local: no-op honesto
      emailOk: !!(email && email.ok),
      espelho: (App.emailDaConta && App.emailDaConta()) || "",
    };
  });
  assert(uxConta16.erradoRecusa, "trocar PIN com o atual ERRADO recusa (lockout do portão vale aqui)");
  assert(uxConta16.certoTroca && uxConta16.voltaOk, "trocar PIN com o atual certo troca de verdade");
  assert(uxConta16.senhaOk, "alterarSenha pelo seam resolve (backend local: no-op honesto)");
  assert(uxConta16.emailOk && uxConta16.espelho === "casa-trocada@pipoca.dev", "alterarEmail atualiza o espelho da conta (modo local)");
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });

  // ── Plan03 · B5 (ML-3) · saídas da criança: T3 → T2 (trocar leitor) e T3 → T7 (pote)
  // com 1 toque e sem portão; ⚙ "Do meu jeito" em T2 e T6; guarda KIDMODE intocada.
  console.log("\n=== Plan03 · B5 · saídas da criança (T3→T2, T3→T7, ⚙ em T2/T6, KIDMODE) ===");
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); window.PipocaApp.setState({ tela: 3 }); });
  await page.waitForFunction(() => /Favorito de hoje/i.test(document.body.innerText), { timeout: 4000 });
  await page.locator('[aria-label="Trocar quem está lendo"]').first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 2, { timeout: 4000 });
  assert(true, "B5: tocar o avatar/saudação da T3 leva à T2 (trocar de leitor) sem portão");
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 3 }); });
  await page.waitForFunction(() => /Favorito de hoje/i.test(document.body.innerText), { timeout: 4000 });
  const alvosSaida = await page.evaluate(() => ["Trocar quem está lendo", "Ver meu pote de vaga-lumes"].map((a) => {
    const el = document.querySelector(`[aria-label="${a}"]`); const r = el ? el.getBoundingClientRect() : { width: 0, height: 0 };
    return Math.round(r.height);
  }));
  assert(alvosSaida.every((h) => h >= 48), `B5: as duas saídas da T3 têm ≥48px de altura (${alvosSaida.join("/")})`);
  await page.locator('[aria-label="Ver meu pote de vaga-lumes"]').first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 7, { timeout: 4000 });
  const t7SemComp = await page.evaluate(() => ({ comp: !!window.PipocaApp.estado.comp, texto: document.body.innerText }));
  assert(true, "B5: tocar o saldo da T3 leva ao pote (T7) sem portão");
  assert(t7SemComp.comp || /Voltar para as histórias|Escolher outra história/.test(t7SemComp.texto), "B5: na T7 sem história em curso a primária volta às histórias (não abre a T4 do nada)");
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 6 }); });
  await page.waitForFunction(() => /Você leu/i.test(document.body.innerText), { timeout: 4000 });
  const gearT6 = await page.evaluate(() => { const g = document.querySelector('[aria-label="Do meu jeito"]'); const r = g ? g.getBoundingClientRect() : null; return r ? Math.round(Math.min(r.width, r.height)) : 0; });
  assert(gearT6 >= 48, `B5: a T6 tem ⚙ "Do meu jeito" com alvo ≥48px (${gearT6})`);
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 2 }); });
  await page.waitForFunction(() => /Quem vai ler hoje/i.test(document.body.innerText), { timeout: 4000 });
  await page.locator('[aria-label="Do meu jeito"]').first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.showA11y === true, { timeout: 4000 });
  assert(true, "B5: a T2 abre o painel 'Do meu jeito' (ajustes sem portão)");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !window.PipocaApp.estado.showA11y, { timeout: 4000 });
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 11 }); });
  await page.waitForTimeout(150);
  assert((await page.evaluate(() => window.PipocaApp.estado.tela)) === 2, "B5: guarda KIDMODE intocada — setState({tela:11}) sem portão ainda redireciona à T2");

  // ── Plan03 · B7 · T4 no FLUXO REAL: R1 pela UI (3 toques), 4º toque avisa, ler → T5,
  // ← preserva o arranjo (voltar sem perdas), instrução nunca pede o impossível.
  console.log("\n=== Plan03 · B7 · T4 palco: alvos 48, feedback, voltar sem perdas ===");
  await page.evaluate(() => { const App = window.PipocaApp; App.iniciarComposicao(); App.setState({ rascunhoT4: null, gatePendente: null, tela: 4 }); });
  await page.waitForFunction(() => /Monte sua cena/.test(document.body.innerText), { timeout: 4000 });
  const bancoR1 = await page.evaluate(() => window.PipocaApp.estado.comp.banco.length);
  assert(/Escolha 3 coisas/.test(await page.evaluate(() => document.body.innerText)) && bancoR1 >= 3, `B7: R1 real nasce com banco ${bancoR1} e pede 3 (nunca mais do que há)`);
  for (let i = 0; i < 3; i++) { await page.locator("button.pip-chip").first().click(); await page.waitForTimeout(80); }
  const aposTres = await page.evaluate(() => ({ chips: document.querySelectorAll("button.pip-chip").length, setas: document.querySelectorAll('[aria-label="Mover para a esquerda"]').length, h: Math.round((document.querySelector('[aria-label="Tirar"]') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }));
  assert(aposTres.setas === 3 && aposTres.h >= 48, `B7: 3 peças colocadas com setas/✕ de ≥48px (${aposTres.h}px)`);
  await page.locator("button.pip-chip").first().click({ force: true }); // 4º toque (chip aria-disabled): deve AVISAR, não engolir
  await page.waitForTimeout(120);
  const aviso4 = await page.evaluate(() => (document.querySelector('[role="status"]') || {}).textContent || "");
  assert(/Já tem 3/.test(aviso4), `B7: 4º toque avisa em role=status ("${aviso4.trim()}")`);
  await page.locator("button", { hasText: "Ler em voz alta" }).first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 5, { timeout: 4000 });
  await page.locator('[aria-label="Voltar"]').first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 4 && /Monte sua cena/.test(document.body.innerText), { timeout: 4000 });
  await page.waitForTimeout(200);
  const aposVoltar = await page.evaluate(() => ({ setas: document.querySelectorAll('[aria-label="Mover para a esquerda"]').length, texto: document.body.innerText }));
  assert(aposVoltar.setas === 3 && /Prontinho/.test(aposVoltar.texto), "B7: voltar da T5 preserva o arranjo (3 peças seguem na cena; CTA pronto)");
  await page.evaluate(() => { window.PipocaApp.setState({ rascunhoT4: null, gatePendente: null, tela: 2 }); });

  assert(erros.length === 0, `sem erros de página ao navegar (erros: ${erros.length ? erros.join(" | ") : "nenhum"})`);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
} catch (e) {
  console.error("ERRO no runner e2e:", e);
  falhou++;
} finally {
  if (browser) await browser.close();
  server.kill();
}

process.exit(falhou > 0 ? 1 : 0);
