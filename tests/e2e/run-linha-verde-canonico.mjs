/**
 * Runner e2e da LINHA VERDE CANÔNICA (TRILHA Marco M-A).
 * --------------------------------------------------------
 * Aponta para "/" (index.html): entry fino que carrega pipoca.bundle.js +
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

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.motor && !!window.PipocaApp.ordem && !!window.PipocaApp.repo,
    { timeout: 15000 }
  );

  console.log("\n=== Boot do app canônico (/) + seam ===");
  assert(
    (await page.evaluate(() => window.PIPOCA_CONFIG && window.PIPOCA_CONFIG.provedor)) === "local",
    "fase06: backend local forçado no e2e (config injetada vence o pipoca.config.js)"
  );
  const r = await page.evaluate(() => {
    const motor = window.PipocaApp.motor, ordem = window.PipocaApp.ordem;
    return {
      temCanon: !!window.PipocaCanonico,
      temRepo: !!window.PipocaApp.repo && typeof window.PipocaApp.repo.carregarPerfis === "function",
      temDesfecho: typeof motor.desfecho === "function",
      aberturaN3: motor.abertura("n3").texto,
      frascoRule: motor.aoAdicionarObjeto(["vagalume"], "frasco", "n3").texto,
      validarParcial: ordem.validar(["vagalume", "frasco"]).ok,
      validarForaDeOrdem: ordem.validar(["frasco", "vagalume"]).ok,
    };
  });
  assert(r.temCanon, "window.PipocaCanonico presente (bundle carregado)");
  assert(r.temRepo, "window.PipocaApp.repo exposto (seam de persistência)");
  assert(r.temDesfecho, "motor.desfecho existe → motor da fábrica canônica (não stub)");
  assert(/Quando a noite chegou/.test(r.aberturaN3), "abertura n3 sai do grafo");
  assert(/casinha de vidro/.test(r.frascoRule), "regra tem:vagalume avaliada pelo motor");
  assert(r.validarParcial === true, "ValidadorOrdem aceita ordem parcial consistente");
  assert(r.validarForaDeOrdem === false, "ValidadorOrdem rejeita dependência fora de ordem");

  console.log("\n=== Narrativa cresce pelo seam (abertura → 3 objetos → desfecho) ===");
  const linhas = await page.evaluate(() => {
    const motor = window.PipocaApp.motor, ordem = window.PipocaApp.ordem;
    const ids = ordem.ordemCanonica();
    const out = [motor.abertura("n3").texto];
    const hist = [];
    for (const id of ids) { out.push(motor.aoAdicionarObjeto(hist, id, "n3").texto); hist.push(id); }
    out.push(motor.desfecho(hist, "convergente", "n3").texto);
    return out;
  });
  assert(linhas.length >= 5, `narrativa acumula ${linhas.length} trechos (abertura + 3 + desfecho)`);
  assert(linhas.every((t) => typeof t === "string" && t.length > 0), "nenhum trecho vazio/undefined");
  assert(/acendeu a noite toda/.test(linhas[linhas.length - 1]), "última linha é o desfecho convergente");

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

  // ── fase05 · Motor B (MVP local): fail-closed da plataforma + intenção do cuidador ──
  // FLAGS_PADRAO tem ia:false (fail-closed): sem seed, o Motor B nunca sobe.
  const faseMotorB = await page.evaluate(async () => {
    const App = window.PipocaApp;
    // cuidador autoriza, plataforma ainda fechada → segue no A
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) });
    const soCuidador = App.estado.motorAtivo;
    // plataforma libera (SA_SAFE) → a borda remonta na hora, sem reload
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: true, fala: true, conteudoCustomizado: true, telemetria: true }));
    App.setState({ modos: Object.assign({}, App.estado.modos) });
    const comFlag = App.estado.motorAtivo;
    if (App.motor && App.motor.aquecer) await App.motor.aquecer([], "n2");
    const aberturaB = App.motor ? App.motor.abertura("n2").texto : "";
    // kill-switch derruba mesmo com o cuidador autorizando — e NÃO apaga a intenção
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: false, fala: false, conteudoCustomizado: true, telemetria: true }));
    App.setState({ modos: Object.assign({}, App.estado.modos) });
    return {
      soCuidador,
      comFlag,
      aberturaB,
      aposKill: App.estado.motorAtivo,
      aberturaA: App.motor ? App.motor.abertura("n2").texto : "",
      intencaoPreservada: App.estado.modos.iaLigada === true,
    };
  });
  assert(faseMotorB.soCuidador === "A", "fase05: cuidador autorizou mas plataforma fechada (fail-closed) → Motor A");
  assert(faseMotorB.comFlag === "B", "fase05: flag da plataforma + autorização do cuidador → Motor B na hora (sem reload)");
  assert(faseMotorB.aberturaB.indexOf("✨") === 0, "fase05: abertura aquecida vem da IA simulada (texto ≠ grafo)");
  assert(faseMotorB.aposKill === "A" && faseMotorB.intencaoPreservada, "fase05: kill-switch volta p/ Motor A SEM apagar a intenção do cuidador");
  assert(faseMotorB.aberturaA.indexOf("✨") !== 0, "fase05: de volta ao Motor A, o texto é o autoral do grafo");
  await page.evaluate(() => localStorage.removeItem("pipoca.admin.flags.v1"));

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
    const A = { id: "uxA", nome: "Ana", idade: 7, nivel: "n2", avatarId: "lua" };
    const B = { id: "uxB", nome: "Bia", idade: 8, nivel: "n3", avatarId: "tuca" };
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
