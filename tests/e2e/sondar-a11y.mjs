/**
 * [sondar-a11y.mjs] — Sonda e2e dos toggles de acessibilidade (Plan03 · B1): com
 *   "alto contraste" os CTAs seguem brancos e o texto corrido escurece; com "reduzir
 *   movimento" o token --pip-mov vale 0 na raiz do Shell (mecanismo por CLASSE).
 *   Grava screenshots de T3/T5/T7 com contraste ligado (prova visual de UI-C02).
 *
 * PAPEL: e2e (offline · sonda de a11y + prova visual; sai 1 se um assert falhar)
 * ENTRA: --out <dir> (padrão docs/auditorias/screenshots/B1-contraste), env E2E_SHOT_PORT
 *   (5139), PW_CORE/PW_CHROME (mesmos dos runners).
 * SAI: relatório ✓/✗ + 3 PNGs 1280×800.
 * CHAMA: node server.js, playwright-core; dirige window.PipocaApp (setState a11y).
 * RODA POR: `node tests/e2e/sondar-a11y.mjs`
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const require = createRequire(import.meta.url);
const PW_CORE = process.env.PW_CORE || "C:/Users/mfard/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core";
const EXEC = process.env.PW_CHROME || "C:/Users/mfard/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
const { chromium } = require(PW_CORE);

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = path.resolve(arg("--out", path.join("docs", "auditorias", "screenshots", "B1-contraste")));
const PORT = Number(process.env.E2E_SHOT_PORT) || 5139;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

let passou = 0, falhou = 0;
const assert = (cond, msg) => { if (cond) { console.log(`  ✓ ${msg}`); passou++; } else { console.error(`  ✗ ${msg}`); falhou++; } };

function esperarPorta(port, timeoutMs = 15000) {
  const inicio = Date.now();
  return new Promise((resolve, reject) => {
    const tentar = () => {
      const s = net.connect(port, "localhost");
      s.on("connect", () => { s.end(); resolve(); });
      s.on("error", () => { s.destroy(); if (Date.now() - inicio > timeoutMs) reject(new Error("timeout esperando o server")); else setTimeout(tentar, 200); });
    };
    tentar();
  });
}

const BRANCO = "rgb(255, 255, 255)";
const lum = (rgb) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb || ""); if (!m) return 1; return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255; };

const server = spawn("node", ["server.js"], { stdio: "ignore", env: { ...process.env, PORT: String(PORT) } });
let browser;
try {
  await esperarPorta(PORT);
  browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => { window.PIPOCA_CONFIG = { provedor: "local" }; });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.repo, { timeout: 15000 });

  // Semeia perfil + estado das 3 telas (mesmos seams do capturar-telas.mjs).
  await page.evaluate(async () => {
    const App = window.PipocaApp;
    const A = { id: "a11yA", nome: "Ana", idade: 7, nivel: "n2", avatarId: "lua", genero: "f" };
    await App.repo.salvarPerfil(A);
    App.selecionarPerfil(A, 3);
    await new Promise((r) => setTimeout(r, 40));
    App.setState({
      economia: { vagalumes: 7, poupado: 2 },
      cardapio: [{ id: "pipoca", label: "Pipoca no cinema", icon: "🍿", cost: 4 }, { id: "gibi", label: "Gibi novo", icon: "📚", cost: 9 }],
      historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
      gateObjId: "vagalume", gateTrecho: "Uma luzinha piscando no escuro.", gatePalavraIdx: 0, gateStage: "reading", gateEarned: 3, gatePendente: null,
    });
  });
  const irTela = async (n, re) => {
    await page.evaluate((t) => { window.PipocaRoteador.irParaTela(t); window.PipocaApp.setState({ tela: t }); }, n);
    await page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re, { timeout: 5000 });
    await page.waitForTimeout(300);
  };
  const a11y = (patch) => page.evaluate((p) => {
    const App = window.PipocaApp;
    App.setState({ a11y: Object.assign({}, App.estado.a11y, p) });
  }, patch);
  // Raiz do Shell = elemento que carrega as classes pip-*
  const sondaRaiz = () => page.evaluate(() => {
    const raiz = document.querySelector(".pip-contrast, .pip-reduce-motion") || document.querySelector("#dc-root > *") || document.body;
    const cs = getComputedStyle(raiz);
    return { classes: raiz.className, mov: cs.getPropertyValue("--pip-mov").trim(), tinta: cs.getPropertyValue("--pip-tinta").trim(), ctaTexto: cs.getPropertyValue("--pip-cta-texto").trim() };
  });
  // CTA = botão com rótulo dado; devolve cor computada do texto e do fundo.
  // Elemento MAIS INTERNO que contém o rótulo (o cartão da T3 é um <button> que envolve
  // o CTA como <span>; a cor que importa é a do texto, não a herdada pelo wrapper).
  const corDoBotao = (rotulo) => page.evaluate((r) => {
    const cands = [...document.querySelectorAll("button, button *")].filter((x) => (x.textContent || "").includes(r));
    if (!cands.length) return null;
    const b = cands.sort((a, c) => (a.textContent || "").length - (c.textContent || "").length)[0];
    const cs = getComputedStyle(b);
    return { color: cs.color, bg: cs.backgroundColor, bgImg: cs.backgroundImage, tag: b.tagName };
  }, rotulo);
  const corDoTexto = (trecho) => page.evaluate((t) => {
    const el = [...document.querySelectorAll("div, p, span")].find((x) => x.children.length === 0 && (x.textContent || "").includes(t));
    return el ? getComputedStyle(el).color : null;
  }, trecho);

  console.log("\n=== B1 · sem toggles: estado base ===");
  await irTela(3, "Favorito de hoje");
  let raiz = await sondaRaiz();
  assert(raiz.mov === "1", `--pip-mov = 1 na raiz sem reduzir-movimento (lido: "${raiz.mov}")`);
  const ctaBase = await corDoBotao("Brincar aqui");
  const textoBase = await corDoTexto("Escolha um lugar");
  assert(!!ctaBase && ctaBase.color === BRANCO, `CTA "Brincar aqui" branco no estado base (${ctaBase && ctaBase.color})`);

  console.log("\n=== B1 · alto contraste: CTAs brancos, texto corrido mais escuro ===");
  await a11y({ contrast: true });
  await page.waitForTimeout(250);
  raiz = await sondaRaiz();
  assert(/pip-contrast/.test(raiz.classes), "o Shell aplica a CLASSE pip-contrast na raiz");
  assert(raiz.tinta === "#1a1008", `token --pip-tinta escurece via classe (lido: "${raiz.tinta}")`);
  assert(raiz.ctaTexto === "#fff", `token --pip-cta-texto segue branco no contraste (lido: "${raiz.ctaTexto}")`);
  const ctaT3 = await corDoBotao("Brincar aqui");
  assert(!!ctaT3 && ctaT3.color === BRANCO, `T3 "Brincar aqui" continua branco (${ctaT3 && ctaT3.color})`);
  const textoT3 = await corDoTexto("Escolha um lugar");
  assert(!!textoT3 && lum(textoT3) < lum(textoBase), `T3 microcópia escurece (${textoBase} → ${textoT3})`);
  if (!(textoT3 && lum(textoT3) < lum(textoBase))) {
    const attr = await page.evaluate(() => { const el = [...document.querySelectorAll("p")].find((x) => /Escolha um lugar/.test(x.textContent || "")); return el ? el.getAttribute("style") : null; });
    console.log("  [style attr real] " + JSON.stringify(attr));
  }
  await page.screenshot({ path: path.join(OUT, "T03-cenarios-contraste-1280x800.png") });
  await irTela(5, "luzinha");
  const ctaT5 = await corDoBotao("Continuar a história");
  assert(!!ctaT5 && ctaT5.color === BRANCO, `T5 "Continuar a história" continua branco (${ctaT5 && ctaT5.color})`);
  await page.screenshot({ path: path.join(OUT, "T05-portao-contraste-1280x800.png") });
  await irTela(7, "agrado");
  const ctaT7 = await corDoBotao("Trocar");
  // B5: sem história em curso a primária da T7 é "Voltar para as histórias" (senão "Continuar lendo").
  const ctaT7b = (await corDoBotao("Continuar lendo")) || (await corDoBotao("Voltar para as histórias"));
  assert(!!ctaT7 && ctaT7.color === BRANCO && !!ctaT7b && ctaT7b.color === BRANCO, `T7 "Trocar" e a primária continuam brancos (${ctaT7 && ctaT7.color} / ${ctaT7b && ctaT7b.color})`);
  await page.screenshot({ path: path.join(OUT, "T07-pote-contraste-1280x800.png") });
  // Telas adultas: chip selecionado azul mantém texto branco (UI-A37)
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForTimeout(100);
  const semPin = await page.evaluate(() => window.PipocaApp.estado.tela);
  if (semPin !== 8) { // 1º uso: cria o PIN pelo portão
    await page.evaluate(() => { localStorage.removeItem("pipoca.acesso.v1"); window.PipocaApp.abrirPortao(); });
    await page.waitForFunction(() => window.PipocaApp.estado.tela === 1, { timeout: 5000 });
    for (const d of "1234") { await page.locator(`[aria-label="${d}"]`).first().click(); await page.waitForTimeout(40); }
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.PipocaApp.setState({ modoApp: "cuidador", tela: 14 }); });
  } else {
    await page.evaluate(() => { window.PipocaApp.setState({ tela: 14 }); });
  }
  await page.waitForFunction(() => /Quem confirma a leitura/i.test(document.body.innerText), { timeout: 5000 });
  const chipSel = await corDoBotao("Lemos juntos");
  assert(!!chipSel && chipSel.color === BRANCO, `T14 opção selecionada (azul) mantém texto branco (${chipSel && chipSel.color})`);
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });
  await a11y({ contrast: false });

  console.log("\n=== B1 · reduzir movimento: --pip-mov = 0 pelo token, não pelo !important ===");
  await a11y({ reduceMotion: true });
  await page.waitForTimeout(250);
  raiz = await sondaRaiz();
  assert(/pip-reduce-motion/.test(raiz.classes), "o Shell aplica a CLASSE pip-reduce-motion na raiz");
  assert(raiz.mov === "0", `--pip-mov = 0 dentro do Shell (lido: "${raiz.mov}")`);
  const dur = await page.evaluate(() => { const raiz = document.querySelector(".pip-reduce-motion"); return raiz ? getComputedStyle(raiz).getPropertyValue("--pip-dur-rapido").trim() : null; });
  assert(dur === "0s", `--pip-dur-rapido = 0s dentro do Shell (lido: "${dur}")`);
  // B3 · com reduzir-movimento ligado, NENHUMA animação/transição segue ativa nas telas
  // que têm animação infinita (T4 slot pulsando, T5 palavra "travada", T7 luzes do pote).
  const animacoesAtivas = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  await irTela(4, "Monte sua cena");
  const animT4 = await animacoesAtivas();
  await irTela(5, "luzinha");
  const animT5 = await animacoesAtivas();
  await irTela(7, "agrado");
  const animT7 = await animacoesAtivas();
  assert(animT4 === 0 && animT5 === 0 && animT7 === 0, `B3: getAnimations() em execução = 0 em T4/T5/T7 com reduzir-movimento (lido: ${animT4}/${animT5}/${animT7})`);
  await a11y({ reduceMotion: false });
  await page.waitForTimeout(200);
  raiz = await sondaRaiz();
  assert(raiz.mov === "1", `desligar devolve --pip-mov = 1 (lido: "${raiz.mov}")`);
  const animT7ligado = await animacoesAtivas();
  assert(animT7ligado > 0, `sem o toggle, a T7 volta a animar as luzes (animações ativas: ${animT7ligado})`);

  console.log("\n=== B3 · foco visível por teclado (Tab) em telas da criança e do cuidador ===");
  const anelDoFoco = () => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { tag: "body" };
    const cs = getComputedStyle(el);
    return { tag: el.tagName, rotulo: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor };
  });
  const tabAte = async (n) => { for (let i = 0; i < n; i++) await page.keyboard.press("Tab"); await page.waitForTimeout(60); return anelDoFoco(); };
  await irTela(3, "Favorito de hoje");
  await page.evaluate(() => { const b = document.querySelector("button"); if (b) b.blur(); document.body.focus(); });
  const focoT3 = await tabAte(1);
  assert(focoT3.tag !== "body" && focoT3.outlineStyle === "solid" && parseFloat(focoT3.outlineWidth) >= 3, `T3: 1º Tab foca <${focoT3.tag}> "${focoT3.rotulo}" com anel ${focoT3.outlineWidth} ${focoT3.outlineStyle} (${focoT3.outlineColor})`);
  await irTela(4, "Monte sua cena");
  const focoT4 = await tabAte(2);
  assert(focoT4.tag !== "body" && focoT4.outlineStyle === "solid", `T4: Tab mostra anel em <${focoT4.tag}> "${focoT4.rotulo}"`);
  await irTela(7, "agrado");
  const focoT7 = await tabAte(2);
  assert(focoT7.tag !== "body" && focoT7.outlineStyle === "solid", `T7: Tab mostra anel em <${focoT7.tag}> "${focoT7.rotulo}"`);
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { window.PipocaApp.setState({ modoApp: "cuidador", tela: 12 }); });
  await page.waitForFunction(() => /Perfis/i.test(document.body.innerText), { timeout: 5000 }).catch(() => {});
  const focoT12 = await tabAte(2);
  assert(focoT12.tag !== "body" && focoT12.outlineStyle === "solid", `T12 (cuidador): Tab mostra anel em <${focoT12.tag}> "${focoT12.rotulo}"`);
  const inputSemOutlineNone = await page.evaluate(() => {
    const inp = document.querySelector("input");
    if (!inp) return null;
    inp.focus();
    return getComputedStyle(inp).outlineStyle;
  });
  assert(inputSemOutlineNone === null || inputSemOutlineNone !== "none", `campo de texto focado por script mantém :focus-visible (outline-style: ${inputSemOutlineNone})`);
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });

  console.log("\n=== B4 · PainelA11y: dialog, switches, alvos ≥48px, Esc/foco/trap ===");
  const OUT_B4 = path.resolve(path.join("docs", "auditorias", "screenshots", "B4-painel"));
  mkdirSync(OUT_B4, { recursive: true });
  await irTela(3, "Favorito de hoje");
  // Abre pelo ⚙ real (clique de teclado: foco no ⚙ + Enter) para provar a devolução do foco.
  await page.evaluate(() => { const g = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "⚙"); if (g) g.focus(); });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'), { timeout: 5000 });
  await page.waitForTimeout(250);
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"][aria-modal="true"]');
    const tit = d && d.getAttribute("aria-labelledby") ? document.getElementById(d.getAttribute("aria-labelledby")) : null;
    const sw = [...d.querySelectorAll('[role="switch"]')].map((s) => { const r = s.getBoundingClientRect(); return { checked: s.getAttribute("aria-checked"), rotulo: s.getAttribute("aria-labelledby") ? (document.getElementById(s.getAttribute("aria-labelledby")) || {}).textContent : null, w: Math.round(r.width), h: Math.round(r.height) }; });
    const alvos = [...d.querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return { rotulo: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; });
    const pressed = [...d.querySelectorAll("[aria-pressed]")].map((b) => b.getAttribute("aria-pressed"));
    const hexInline = (d.innerHTML.match(/#[0-9a-fA-F]{3,6}\b/g) || []).length;
    return { tituloFocado: !!tit && document.activeElement === tit, tituloTexto: tit ? tit.textContent : null, sw, alvos, pressed, hexInline };
  });
  assert(dlg.tituloTexto === "Do meu jeito" && dlg.tituloFocado, `dialog rotulado por "${dlg.tituloTexto}" e foco inicial no título`);
  assert(dlg.sw.length === 4 && dlg.sw.every((s) => s.checked === "true" || s.checked === "false") && dlg.sw.every((s) => !!s.rotulo), `4 role=switch com aria-checked e nome acessível (${dlg.sw.map((s) => s.rotulo + "=" + s.checked).join(", ")})`);
  const pequenos = dlg.alvos.filter((a) => a.w < 48 || a.h < 48);
  assert(pequenos.length === 0, `todos os controles do painel ≥48px (${dlg.alvos.length} alvos; pequenos: ${pequenos.map((a) => a.rotulo + " " + a.w + "x" + a.h).join(", ") || "nenhum"})`);
  assert(dlg.pressed.length === 3 && dlg.pressed.filter((p) => p === "true").length === 1, `escala A/A+/A++ com aria-pressed (${dlg.pressed.join("/")})`);
  assert(dlg.hexInline === 0, `painel sem hex cru no DOM renderizado (${dlg.hexInline})`);
  // Teclado: Tab cíclico não escapa; Space no switch alterna; Esc fecha e devolve o foco ao ⚙.
  let dentro = true;
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Tab"); await page.waitForTimeout(30); const ok = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return !!d && d.contains(document.activeElement); }); if (!ok) { dentro = false; break; } }
  assert(dentro, "Tab ×14 mantém o foco dentro do painel (trap cíclico)");
  await page.evaluate(() => { const s = document.querySelector('[role="switch"][aria-labelledby="pip-a11y-con-rotulo"]'); if (s) s.focus(); });
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  const conDepois = await page.evaluate(() => { const s = document.querySelector('[role="switch"][aria-labelledby="pip-a11y-con-rotulo"]'); return { aria: s ? s.getAttribute("aria-checked") : null, estado: !!window.PipocaApp.estado.a11y.contrast, focoAinda: !!s && document.activeElement === s }; });
  assert(conDepois.aria === "true" && conDepois.estado === true, `Space no switch "Alto contraste" alterna (aria-checked=${conDepois.aria}, estado=${conDepois.estado})`);
  assert(conDepois.focoAinda, "o foco permanece no switch após o re-render do Shell");
  await page.screenshot({ path: path.join(OUT_B4, "T03-painel-a11y-1280x800.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_B4, "T03-painel-a11y-390x844.png") });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !window.PipocaApp.estado.showA11y, { timeout: 5000 });
  await page.waitForTimeout(150);
  const focoVoltou = await page.evaluate(() => (document.activeElement && (document.activeElement.textContent || "").trim()) === "⚙");
  assert(focoVoltou, "Esc fecha o painel e o foco volta ao ⚙ que abriu");
  await a11y({ contrast: false });
  assert(erros.length === 0, `sem erros de página (${erros.length ? erros.join(" | ") : "nenhum"})`);
} catch (e) {
  console.error("ERRO na sonda a11y:", e);
  falhou++;
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
process.exit(falhou > 0 ? 1 : 0);
