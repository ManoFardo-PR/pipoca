/**
 * [capturar-regras-ia.mjs] — Prova visual do A2 (Plan03): a Regras (T14) rolada até o
 *   cartão "Histórias com IA" nos 3 estados do toggle — Indisponível (sem edge),
 *   Indisponível (kill-switch da plataforma), Desligada e Ligada (edge presente) — e
 *   asserts leves de honestidade (texto sem "Motor", gesto inerte quando indisponível,
 *   gesto real grava modos.iaLigada quando pronto).
 *
 * PAPEL: ferramenta de processo + smoke (sai 1 se um assert falhar)
 * ENTRA: --out <dir> (padrão docs/auditorias/screenshots/A2-regras), env E2E_SHOT_PORT
 *   (5139), PW_CORE/PW_CHROME (mesmos dos runners e2e).
 * SAI: 4 PNGs 1280×800 + relatório ✓/✗.
 * CHAMA: node server.js, playwright-core; dirige window.PipocaApp/PipocaCanonico
 *   (injeta um realizadorRemoto FAKE no seam para simular a edge — sem rede, sem chave).
 * RODA POR: `node tests/e2e/capturar-regras-ia.mjs`
 * CUIDADO: offline (PIPOCA_CONFIG local); contexto novo (PIN nasce 1234 no 1º uso).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, executavelChromium, bootServer } from "./_harness.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = path.resolve(arg("--out", path.join("docs", "auditorias", "screenshots", "A2-regras")));
const PORT = Number(process.env.E2E_SHOT_PORT) || 5139;
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

let passou = 0, falhou = 0;
const assert = (cond, msg) => { if (cond) { console.log(`  ✓ ${msg}`); passou++; } else { console.error(`  ✗ ${msg}`); falhou++; } };

const server = await bootServer(PORT);
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: executavelChromium() });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => { window.PIPOCA_CONFIG = { provedor: "local" }; });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.repo, { timeout: 15000 });

  // 1º uso: PIN 1234 → onboarding cria o perfil → T2; depois portão → hub → Regras (T14).
  await page.evaluate(() => { localStorage.removeItem("pipoca.acesso.v1"); window.PipocaRoteador.irParaTela(1); window.PipocaApp.setState({ tela: 1 }); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 1, { timeout: 5000 });
  for (const d of "1234") { await page.locator(`[aria-label="${d}"]`).first().click(); await page.waitForTimeout(40); }
  await page.waitForFunction(() => /Configurar a leitura/.test(document.body.innerText), { timeout: 5000 });
  await page.fill('[aria-label="Nome da criança"]', "Tião");
  await page.locator("button", { hasText: "Um menino" }).first().click();
  await page.locator("button", { hasText: "Tudo pronto" }).first().click();
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 2 && !!window.PipocaApp.estado.perfil, { timeout: 5000 });
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await page.waitForFunction(() => window.PipocaApp.estado.tela === 11, { timeout: 5000 }); // C6: pós-PIN → hub
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 14 }); });
  await page.waitForFunction(() => /Histórias com IA/.test(document.body.innerText), { timeout: 5000 });

  const estadoToggle = () => page.evaluate(() => {
    const sw = document.querySelector('[aria-label="Autorizar IA para a criança"]');
    const cartao = sw ? sw.closest("div").parentElement : null;
    const texto = cartao ? cartao.innerText : "";
    // O rótulo de estado é o irmão imediatamente antes do switch (a descrição também
    // contém "Desligada"/"Ligada" como palavras — por isso não se busca no texto todo).
    const rotuloEl = sw ? sw.previousElementSibling : null;
    return {
      rotulo: rotuloEl ? rotuloEl.textContent.trim() : "",
      checked: sw ? sw.getAttribute("aria-checked") : null,
      disabled: sw ? sw.getAttribute("aria-disabled") : null,
      texto,
      iaLigada: !!(window.PipocaApp.estado.modos && window.PipocaApp.estado.modos.iaLigada),
    };
  });
  // Rola o CONTÊINER da Regras (div com overflow-y:auto) até o fim — o cartão de IA é o último.
  const rolarAteIA = () => page.evaluate(() => {
    let el = document.querySelector('[aria-label="Autorizar IA para a criança"]');
    while (el && el !== document.body) {
      const ov = getComputedStyle(el).overflowY;
      if ((ov === "auto" || ov === "scroll") && el.scrollHeight > el.clientHeight) { el.scrollTop = el.scrollHeight; return true; }
      el = el.parentElement;
    }
    window.scrollTo(0, document.body.scrollHeight);
    return false;
  });
  const foto = async (nome) => { await rolarAteIA(); await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, nome) }); console.log(`  → ${nome}`); };
  const rerender = () => page.evaluate(() => { window.PipocaApp.setState({}); });

  console.log("\n=== A2 · estado 1: backend local, sem edge ⇒ Indisponível ===");
  let e = await estadoToggle();
  assert(e.rotulo === "Indisponível" && e.disabled === "true", `sem realizador remoto: rótulo "Indisponível", switch aria-disabled (rótulo="${e.rotulo}")`);
  assert(/ainda não está disponível nesta casa/.test(e.texto), "motivo antes do gesto: 'ainda não está disponível nesta casa'");
  if (!/ainda não está disponível nesta casa/.test(e.texto)) console.log("  [texto do cartão] " + JSON.stringify(e.texto));
  assert(!/Motor [AB]/.test(e.texto) && !/Sem provedor/.test(e.texto), "sem jargão (Motor A/B) e sem aviso pós-gesto");
  assert(/O que a IA recebe/.test(e.texto), "consentimento informado: diz o que a IA recebe");
  // force: o Playwright recusa clicar em aria-disabled — aqui o clique É o teste (gesto inerte).
  await page.locator('[aria-label="Autorizar IA para a criança"]').click({ force: true });
  await page.waitForTimeout(150);
  e = await estadoToggle();
  assert(e.iaLigada === false && e.rotulo === "Indisponível", "gesto no toggle indisponível é inerte (modos.iaLigada segue false)");
  await foto("T14-ia-1-indisponivel-sem-edge.png");

  console.log("\n=== A2 · estado 2: edge presente (fake) + kill-switch ⇒ Indisponível (plataforma) ===");
  await page.evaluate(() => {
    window.PipocaCanonico.geracao.realizadorRemoto = () => async () => ({ texto: "x", paragrafos: ["x"], veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} }, origem: { fonte: "llm", provedor: "fake", modelo: "fake" }, metadados: { chamadas: 1, duracaoMs: 1 } });
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: false, fala: false, conteudoCustomizado: true, telemetria: true }));
  });
  await rerender(); await page.waitForTimeout(200);
  e = await estadoToggle();
  assert(e.rotulo === "Indisponível" && /Desligada pela plataforma/.test(e.texto), "kill-switch ⇒ Indisponível com motivo 'Desligada pela plataforma'");
  await foto("T14-ia-2-indisponivel-kill-switch.png");

  console.log("\n=== A2 · estado 3: edge presente + plataforma liberada ⇒ Desligada (toggle ativo) ===");
  await page.evaluate(() => { localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: true, fala: false, conteudoCustomizado: true, telemetria: true })); });
  await rerender(); await page.waitForTimeout(200);
  e = await estadoToggle();
  assert(e.rotulo === "Desligada" && e.disabled === "false" && e.checked === "false", `pronto ⇒ "Desligada", switch ativo (rótulo="${e.rotulo}")`);
  await foto("T14-ia-3-desligada.png");

  console.log("\n=== A2 · estado 4: gesto real ⇒ Ligada (modos.iaLigada=true — o gate A1 passa a permitir) ===");
  await page.locator('[aria-label="Autorizar IA para a criança"]').click();
  await page.waitForFunction(() => !!(window.PipocaApp.estado.modos && window.PipocaApp.estado.modos.iaLigada), { timeout: 5000 });
  await page.waitForTimeout(200);
  e = await estadoToggle();
  assert(e.rotulo === "Ligada" && e.checked === "true" && e.iaLigada === true, "ligar grava modos.iaLigada=true e o rótulo vira 'Ligada'");
  const efetiva = await page.evaluate(() => window.PipocaCanonico.flags.iaEfetivamenteLigada
    ? window.PipocaCanonico.flags.iaEfetivamenteLigada(window.PipocaApp.estado.modos, window.PipocaCanonico.flags.carregarFlags())
    : window.PipocaCanonico.flags.aplicarFlagsAosModos(window.PipocaApp.estado.modos, window.PipocaCanonico.flags.carregarFlags()).iaLigada);
  assert(efetiva === true, "IA efetiva (A1) = true após o gesto com a plataforma liberada");
  await foto("T14-ia-4-ligada.png");
  await page.evaluate(() => localStorage.removeItem("pipoca.admin.flags.v1"));
  assert(erros.length === 0, `sem erros de página (${erros.length ? erros.join(" | ") : "nenhum"})`);
} catch (e) {
  console.error("ERRO no harness A2:", e);
  falhou++;
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
process.exit(falhou > 0 ? 1 : 0);
