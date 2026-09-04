/**
 * [capturar-telas.mjs] — Harness de screenshots "antes/depois" (Plan03): sobe o server,
 *   semeia estado pelos seams do app e do admin e fotografa cada tela em 2 viewports
 *   (1280×800 tablet · 390×844 celular). Também grava uma sonda de alvos de toque.
 *
 * PAPEL: ferramenta de processo (prova visual; NÃO é teste — não falha por conteúdo)
 * POR QUE EXISTE: a varredura 2026-08-26 capturou 33 telas com um script descartado;
 *   a Onda B exige screenshots antes/depois conferidos antes de cada merge (CRU = ao vivo).
 * ENTRA: --out <dir> (padrão docs/auditorias/screenshots/<rotulo>), --rotulo <antes|depois>,
 *   env E2E_SHOT_PORT (5139), PW_CORE/PW_CHROME (mesmos dos runners e2e).
 * SAI: <dir>/<tela>-<WxH>.png por tela, <dir>/sondas.json (alvos <48px por tela a 1280)
 *   e <dir>/INDEX.md (lista com tamanhos). Código de saída 0 se capturou tudo.
 * CHAMA: node server.js (spawn), playwright-core; dirige window.PipocaApp /
 *   PipocaRoteador (app) e window.PipocaAdmin (admin) — mesmo boot de
 *   run-linha-verde-canonico.mjs e run-admin.mjs.
 * RODA POR: `node tests/e2e/capturar-telas.mjs --rotulo antes`
 * CUIDADO: offline (PIPOCA_CONFIG local injetado); contexto novo = localStorage limpo, o
 *   PIN nasce "1234" no 1º uso. Depende do bundle BUILDADO. Não commitar todos os PNGs —
 *   docs/auditorias/screenshots/.gitignore whitelista os essenciais.
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, executavelChromium, bootServer } from "./_harness.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ROTULO = arg("--rotulo", "antes");
const OUT = path.resolve(arg("--out", path.join("docs", "auditorias", "screenshots", ROTULO)));
const PORT = Number(process.env.E2E_SHOT_PORT) || 5139;
const BASE = `http://localhost:${PORT}`;
const VIEWPORTS = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];
const MIN_ALVO = 48;

mkdirSync(OUT, { recursive: true });

const capturas = [];
const sondas = {};
let falhas = 0;

// Fotografa a tela atual nos 2 viewports e sonda alvos pequenos a 1280.
async function foto(page, nome, opts = {}) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(opts.espera ?? 700);
    const arquivo = `${nome}-${vp.width}x${vp.height}.png`;
    try {
      await page.screenshot({ path: path.join(OUT, arquivo), fullPage: false });
      const kb = Math.round(statSync(path.join(OUT, arquivo)).size / 1024);
      capturas.push({ nome, arquivo, kb });
      console.log(`  ✓ ${arquivo} (${kb} KB)`);
    } catch (e) { falhas++; console.error(`  ✗ ${arquivo}: ${e.message}`); }
    if (vp.width === 1280) {
      sondas[nome] = await page.evaluate((min) => {
        const els = [...document.querySelectorAll('button, [role="button"], a[href], input, [role="switch"], [role="checkbox"]')];
        return els.map((el) => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), rotulo: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40) };
        }).filter((a) => a.w > 0 && a.h > 0 && (a.w < min || a.h < min));
      }, MIN_ALVO);
    }
  }
}

const irTela = (page, n) => page.evaluate((tela) => {
  if (window.PipocaRoteador) window.PipocaRoteador.irParaTela(tela);
  window.PipocaApp.setState({ tela });
}, n);
const esperarTela = (page, n) => page.waitForFunction((t) => window.PipocaApp.estado.tela === t, n, { timeout: 5000 }).catch(() => { console.warn(`  ! tela ${n} não confirmou em 5s (fotografa mesmo assim)`); });
const esperarTexto = (page, re) => page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re, { timeout: 5000 }).catch(() => { console.warn(`  ! texto /${re}/ não apareceu em 5s`); });

const server = await bootServer(PORT);
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: executavelChromium() });

  // ── App da família (/app) ──────────────────────────────────────────────────
  console.log(`\n=== App da família (/app) → ${OUT} ===`);
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.PIPOCA_CONFIG = { provedor: "local" }; });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.cenarioV2 && !!window.PipocaApp.repo, { timeout: 15000 });

  // T1 portão no 1º uso (sem PIN) → digitar 1234 cria o PIN e cai no Onboarding (T10).
  await page.evaluate(() => localStorage.removeItem("pipoca.acesso.v1"));
  await irTela(page, 1); await esperarTela(page, 1);
  await foto(page, "T01-portao");
  for (const d of "1234") { await page.locator(`[aria-label="${d}"]`).first().click(); await page.waitForTimeout(40); }
  await esperarTela(page, 10); await esperarTexto(page, "Configurar a leitura");
  await foto(page, "T10-onboarding");
  await page.fill('[aria-label="Nome da criança"]', "Tião");
  await page.locator("button", { hasText: "Um menino" }).first().click();
  await page.locator("button", { hasText: "Tudo pronto" }).first().click();
  await esperarTela(page, 2);

  // Semeia 2 perfis com gênero, pote, cardápio e 2 histórias completas (seam).
  const seed = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const A = { id: "shotA", nome: "Ana", idade: 7, nivel: "n2", avatarId: "lua", genero: "f" };
    const B = { id: "shotB", nome: "Bia", idade: 8, nivel: "n3", avatarId: "tuca", genero: "f" };
    await App.repo.salvarPerfil(A); await App.repo.salvarPerfil(B);
    App.selecionarPerfil(A, 3); await espera(40);
    App.setState({
      economia: { vagalumes: 7, poupado: 2 },
      cardapio: [{ id: "pipoca", label: "Pipoca no cinema", icon: "🍿", cost: 4 }, { id: "gibi", label: "Gibi novo", icon: "📚", cost: 9 }],
    });
    let historias = 0;
    for (let k = 0; k < 2; k++) {
      App.iniciarComposicao();
      App.ordenarR1Composicao(App.estado.comp.banco.slice(0, 3));
      App.abrirProximaRodadaComposicao();
      let guarda = 0;
      while (!App.composicaoConvergiu() && guarda++ < 10) {
        const comp = App.estado.comp; const objeto = comp.banco[0]; let inseriu = false;
        for (let slot = 0; slot <= comp.linha.length && !inseriu; slot++) if (App.podeInserirComposicao(objeto, slot)) inseriu = App.inserirComposicao(objeto, slot);
        if (!inseriu) break;
        App.abrirProximaRodadaComposicao();
      }
      await espera(40);
      if (App.composicaoConvergiu()) historias++;
    }
    return { historias, perfil: App.estado.perfil && App.estado.perfil.nome };
  });
  console.log(`  semeado: perfil ${seed.perfil}, ${seed.historias} história(s) completa(s)`);

  await irTela(page, 2); await esperarTela(page, 2); await esperarTexto(page, "ler hoje|Oi");
  await foto(page, "T02-entrada");
  await irTela(page, 3); await esperarTela(page, 3); await esperarTexto(page, "Favorito de hoje|Quintal");
  await foto(page, "T03-cenarios");
  await page.evaluate(() => { window.PipocaApp.setState({ showA11y: true }); });
  await esperarTexto(page, "Sou o adulto");
  await foto(page, "T03-painel-a11y");
  await page.evaluate(() => { window.PipocaApp.setState({ showA11y: false }); });
  await page.evaluate(() => { window.PipocaApp.iniciarComposicao(); });
  await irTela(page, 4); await esperarTela(page, 4); await esperarTexto(page, "história até agora|Ateliê|Quintal");
  await foto(page, "T04-palco");
  // T4 em R2 com a peça nova colocada no meio (prova do B7: setas 48px, selo, lacunas).
  await page.evaluate(() => {
    const App = window.PipocaApp;
    App.ordenarR1Composicao(App.estado.comp.banco.slice(0, 3));
    App.abrirProximaRodadaComposicao();
    App.setState({ tela: 3 });
  });
  await page.waitForTimeout(200);
  await irTela(page, 4); await esperarTela(page, 4); await esperarTexto(page, "cresceu");
  await page.evaluate(() => { const b = [...document.querySelectorAll("button.pip-chip")][0]; if (b) b.click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { const g = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "+"); if (g) g.click(); });
  await page.waitForTimeout(250);
  await foto(page, "T04-palco-r2");
  await page.evaluate(() => { window.PipocaApp.iniciarComposicao(); });
  await page.evaluate(() => {
    window.PipocaApp.setState({
      historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
      gateObjId: "vagalume", gateTrecho: "Uma luzinha piscando no escuro.",
      gatePalavraIdx: 0, gateStage: "reading", gateEarned: 3, gatePendente: null,
    });
  });
  await irTela(page, 5); await esperarTela(page, 5); await esperarTexto(page, "luzinha|palavra|confirmar");
  await foto(page, "T05-portao-leitura");
  await irTela(page, 6); await esperarTela(page, 6); await esperarTexto(page, "Você leu");
  await foto(page, "T06-recompensa");
  await irTela(page, 7); await esperarTela(page, 7); await esperarTexto(page, "agrado|dividir");
  await foto(page, "T07-pote");

  // Telas adultas: pelo portão (PIN 1234) → T8; depois setState no modo cuidador.
  await page.evaluate(() => { window.PipocaApp.verificarPinCuidador("1234"); });
  await esperarTela(page, 11); // C6: pós-PIN → hub
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 8 }); });
  await esperarTela(page, 8); await esperarTexto(page, "Pote de vaga-lumes|Evolução");
  await foto(page, "T08-evolucao");
  const adultas = [[11, "T11-hub-cuidador", "guardados|Cuidador"], [12, "T12-perfis", "Perfis|Ana"], [13, "T13-limites", "Limites|minutos"], [14, "T14-regras-ia", "Quem confirma a leitura"], [15, "T15-privacidade", "Privacidade"], [16, "T16-conta", "Conta & segurança|PIN do portão"]];
  for (const [n, nome, re] of adultas) {
    await page.evaluate((t) => { window.PipocaApp.setState({ tela: t }); }, n);
    await esperarTela(page, n); await esperarTexto(page, re);
    await foto(page, nome);
  }
  await page.evaluate(() => { window.PipocaApp.aoVoltarParaCrianca(); });
  await page.evaluate(() => { window.PipocaApp.sairDaConta(); });
  await esperarTela(page, 9); await esperarTexto(page, "Criar conta da família");
  await foto(page, "T09-login");
  console.log(`  erros de página no app: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  await ctx.close();

  // ── Admin (/admin.html) ────────────────────────────────────────────────────
  console.log("\n=== Admin (/admin.html) ===");
  const ctxA = await browser.newContext({ viewport: VIEWPORTS[0], deviceScaleFactor: 1 });
  const pa = await ctxA.newPage();
  await pa.addInitScript(() => { window.PIPOCA_CONFIG = { provedor: "local" }; });
  const errosA = [];
  pa.on("pageerror", (e) => errosA.push(String(e)));
  await pa.goto(BASE + "/admin.html", { waitUntil: "domcontentloaded" });
  await pa.waitForFunction(() => !!window.PipocaAdminCanonico && !!window.PipocaAdmin, { timeout: 15000 });
  await pa.waitForFunction(() => /Operador da plataforma/i.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await foto(pa, "adm1-login");
  await pa.fill('[aria-label="E-mail do operador"]', "operador@pipoca.dev");
  await pa.fill('[aria-label="Senha do operador"]', "senha-mvp-local");
  await pa.locator("button", { hasText: "Entrar" }).first().click();
  await pa.waitForFunction(() => window.PipocaAdmin.estado.telaAdmin === 2, { timeout: 5000 });
  await pa.waitForFunction(() => /Painel da plataforma/i.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await foto(pa, "adm2-home");
  await pa.evaluate(() => window.PipocaAdmin.irParaTela(3));
  await pa.waitForFunction(() => /Contas e planos/i.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await pa.fill('[aria-label="Nome da conta"]', "Escola Modelo");
  await pa.locator("button", { hasText: "Criar" }).first().click();
  await pa.waitForFunction(() => /Escola Modelo/.test(document.body.innerText), { timeout: 5000 }).catch(() => {});
  await foto(pa, "adm3-tenants");
  const admTelas = [[4, "adm4-conteudo", "Biblioteca de conteúdo"], [5, "adm5-config-ia", "Configuração de IA"], [6, "adm6-seguranca", "Segurança e feature flags"], [7, "adm7-ia-global", "IA|modelo"]];
  for (const [n, nome, re] of admTelas) {
    await pa.evaluate((t) => window.PipocaAdmin.irParaTela(t), n);
    await pa.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re, { timeout: 8000 }).catch(() => console.warn(`  ! /${re}/ não apareceu`));
    await foto(pa, nome);
  }
  console.log(`  erros de página no admin: ${errosA.length ? errosA.join(" | ") : "nenhum"}`);
  await ctxA.close();
} catch (e) {
  console.error("ERRO no harness de screenshots:", e);
  falhas++;
} finally {
  if (browser) await browser.close();
  server.kill();
}

// Índice + sonda (o índice vai pro git mesmo quando os PNGs não vão).
writeFileSync(path.join(OUT, "sondas.json"), JSON.stringify({ esquema: "pipoca.sonda-alvos.v1", rotulo: ROTULO, minimo: MIN_ALVO, viewport: "1280x800", quando: new Date().toISOString(), telas: sondas }, null, 2) + "\n");
const linhas = [`# Screenshots "${ROTULO}" — ${new Date().toISOString().slice(0, 10)}`, "", `Gerado por \`node tests/e2e/capturar-telas.mjs --rotulo ${ROTULO}\` (${capturas.length} PNGs, viewport 1280×800 e 390×844, backend local).`, "Só os essenciais (T2, T3, T4, T5, T7, adm2) são commitados; os demais ficam locais — regenerar com o comando acima.", "", "| Arquivo | KB | Alvos <48px (a 1280) |", "|---|---|---|"];
for (const c of capturas) linhas.push(`| ${c.arquivo} | ${c.kb} | ${c.arquivo.includes("1280x800") ? (sondas[c.nome] || []).length : ""} |`);
writeFileSync(path.join(OUT, "INDEX.md"), linhas.join("\n") + "\n");
console.log(`\nTotal: ${capturas.length} PNG(s) em ${OUT} · falhas: ${falhas}`);
process.exit(falhas > 0 ? 1 : 0);
