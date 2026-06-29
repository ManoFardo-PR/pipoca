/**
 * Runner standalone do e2e da linha verde (Marco 1), para ambientes sem `@playwright/test`
 * instalado (registry offline). Usa o `playwright-core` em cache. Em CI, prefira:
 *   npx playwright test  (roda tests/e2e/linha-verde.spec.ts)
 *
 * Sobe server.js, dirige chromium headless e roda as invariantes de convergência.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import net from "node:net";

const require = createRequire(import.meta.url);
const PW_CORE =
  process.env.PW_CORE ||
  "C:/Users/mfard/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core";
const { chromium } = require(PW_CORE);

const PORT = 5000;
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

const server = spawn("node", ["server.js"], { stdio: "ignore" });
let browser;
try {
  await esperarPorta(PORT);
  const EXEC =
    process.env.PW_CHROME ||
    "C:/Users/mfard/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.motor && !!window.PipocaApp.ordem,
    { timeout: 15000 }
  );

  console.log("\n=== Invariantes de convergência (app usa o seam canônico) ===");
  const r = await page.evaluate(() => {
    const motor = window.PipocaApp.motor, ordem = window.PipocaApp.ordem;
    return {
      temCanon: !!window.PipocaCanonico,
      temDesfecho: typeof motor.desfecho === "function",
      aberturaN3: motor.abertura("n3").texto,
      frascoRule: motor.aoAdicionarObjeto(["vagalume"], "frasco", "n3").texto,
      validarParcial: ordem.validar(["vagalume", "frasco"]).ok,
      validarForaDeOrdem: ordem.validar(["frasco", "vagalume"]).ok,
      desfechoConv: motor.desfecho(["vagalume", "frasco", "vento"], "convergente", "n3").texto,
    };
  });
  assert(r.temCanon, "window.PipocaCanonico presente (bundle carregado)");
  assert(r.temDesfecho, "motor.desfecho existe → motor veio da fábrica canônica (não do stub inline)");
  assert(/Quando a noite chegou/.test(r.aberturaN3), "abertura n3 sai do grafo");
  assert(/casinha de vidro/.test(r.frascoRule), "regra tem:vagalume avaliada pelo motor canônico");
  assert(r.validarParcial === true, "ValidadorOrdem aceita ordem parcial consistente (['vagalume','frasco'])");
  assert(r.validarForaDeOrdem === false, "ValidadorOrdem rejeita dependência fora de ordem");
  assert(/acendeu a noite toda/.test(r.desfechoConv), "desfecho convergente sai do grafo");

  console.log("\n=== Playthrough da narrativa pelo seam (abertura → 3 objetos → desfecho) ===");
  const linhas = await page.evaluate(() => {
    const motor = window.PipocaApp.motor, ordem = window.PipocaApp.ordem;
    const ids = ordem.ordemCanonica();
    const out = [motor.abertura("n3").texto];
    const hist = [];
    for (const id of ids) { out.push(motor.aoAdicionarObjeto(hist, id, "n3").texto); hist.push(id); }
    out.push(motor.desfecho(hist, "convergente", "n3").texto);
    return out;
  });
  const todo = linhas.join(" ");
  assert(/luzinha piscando/.test(todo), "vagalume (gatilho) presente");
  assert(/casinha de vidro/.test(todo), "frasco (regra) presente");
  assert(/vaga-lume estava seguro/.test(todo), "vento (regra tem:frasco) presente");
  assert(/acendeu a noite toda/.test(linhas[linhas.length - 1]), "última linha é o desfecho");
  assert(linhas.every((t) => typeof t === "string" && t.length > 0), "nenhuma linha vazia/undefined");

  console.log("\n=== Telas T2–T7 montam sem erro pelo roteador ===");
  await page.evaluate(() => {
    window.PipocaApp.setState({
      perfil: { id: "p1", nome: "Joana", idade: 7, nivel: "n3", avatarId: "pingo" },
      _perfis: [{ id: "p1", nome: "Joana", avatarId: "pingo", nivel: "n3" }],
      historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
      gateObjId: "vagalume", gateTrecho: "Uma luzinha piscando no escuro.",
      gatePalavraIdx: 0, gateStage: "reading", gateEarned: 3,
    });
  });
  for (const n of [2, 3, 4, 5, 6, 7]) {
    await page.evaluate((tela) => {
      if (window.PipocaRoteador) window.PipocaRoteador.irParaTela(tela);
      window.PipocaApp.setState({ tela });
    }, n);
    await page.waitForTimeout(120);
    const telaAtual = await page.evaluate(() => window.PipocaApp.estado.tela);
    assert(telaAtual === n, `tela ${n} ativa`);
  }
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
