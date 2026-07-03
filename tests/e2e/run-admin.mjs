/**
 * Runner e2e da PLATAFORMA DO OPERADOR (fase04 · admin.html).
 * ------------------------------------------------------------
 * Aponta para "/admin.html": entry fino que carrega pipoca.admin.bundle.js +
 * src/admin/estadoAdmin.js e compõe AdminShell + telas SA_* (src/admin/**)
 * por componente-irmão. Independente do app da criança ("/"): o runner prova
 * o ISOLAMENTO (window.PipocaApp/PipocaCanonico ausentes; chaves da família
 * intactas), o guard fail-closed, o 1º uso do SA_LOGIN, tenants, a validação
 * de conteúdo, a ConfigIA sem chaves e o kill-switch persistente.
 *
 * Usa playwright-core em cache (registry offline). Porta dedicada 5138
 * (5137 é do e2e canônico; 5000 é outro dev server).
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import net from "node:net";

const require = createRequire(import.meta.url);
const PW_CORE =
  process.env.PW_CORE ||
  "C:/Users/mfard/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core";
const { chromium } = require(PW_CORE);

const PORT = Number(process.env.E2E_ADMIN_PORT) || 5138;
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
  // qualquer script (sobrevive ao reload; o pipoca.config.js respeita via ||).
  await page.addInitScript(() => {
    window.PIPOCA_CONFIG = { provedor: "local" };
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));

  await page.goto(BASE + "/admin.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.PipocaAdminCanonico && !!window.PipocaAdmin, { timeout: 15000 });

  console.log("\n=== Boot do admin (/admin.html) + isolamento ===");
  const boot = await page.evaluate(() => ({
    isolado: typeof window.PipocaApp === "undefined" && typeof window.PipocaCanonico === "undefined",
    familiaAntes: JSON.stringify({
      perfil: localStorage.getItem("pipoca.perfil.v1"),
      acesso: localStorage.getItem("pipoca.acesso.v1"),
      conta: localStorage.getItem("pipoca.conta.v1"),
    }),
    tela: window.PipocaAdmin.estado.telaAdmin,
  }));
  assert(boot.isolado, "o admin NÃO carrega o app da criança (sem PipocaApp/PipocaCanonico)");
  assert(boot.tela === 1, "sem sessão, o boot cai no SA_LOGIN (tela 1)");
  assert(
    (await page.evaluate(() => window.PIPOCA_CONFIG && window.PIPOCA_CONFIG.provedor)) === "local",
    "fase06: backend local forçado no e2e (config injetada vence o pipoca.config.js)"
  );
  await page.waitForFunction(() => /Operador da plataforma/i.test(document.body.innerText), { timeout: 8000 });
  assert(true, "SA_LOGIN monta (marcador visível)");

  console.log("\n=== Guard fail-closed + 1º uso do operador ===");
  const guard = await page.evaluate(() => {
    window.PipocaAdmin.setState({ telaAdmin: 3 });
    return window.PipocaAdmin.estado.telaAdmin;
  });
  assert(guard === 1, "sem sessão, setState({telaAdmin:3}) fecha para o login");

  await page.fill('[aria-label="E-mail do operador"]', "operador@pipoca.dev");
  await page.fill('[aria-label="Senha do operador"]', "senha-mvp-local");
  await page.locator("button", { hasText: "Entrar" }).first().click();
  await page.waitForFunction(() => window.PipocaAdmin.estado.telaAdmin === 2, { timeout: 5000 });
  const posLogin = await page.evaluate(() => ({
    temCred: localStorage.getItem("pipoca.admin.credencial.v1") !== null,
    temSessao: localStorage.getItem("pipoca.admin.sessao.v1") !== null,
    senhaEmClaro: JSON.stringify(Object.entries(localStorage)).includes("senha-mvp-local"),
    escopo: window.PipocaAdmin.estado.sessao.escopoTenants,
  }));
  assert(posLogin.temCred, "1º uso semeia a credencial do operador (local, MVP)");
  assert(!posLogin.senhaEmClaro, "a senha digitada NUNCA aparece em claro no storage");
  assert(posLogin.escopo === "todos", "operador raiz entra com escopo todos");

  console.log("\n=== SA_HOME · hub com 4 áreas ===");
  await page.waitForFunction(() => /Painel da plataforma/i.test(document.body.innerText), { timeout: 8000 });
  const cartoes = await page.evaluate(() =>
    ["tenants e planos", "Biblioteca de conteúdo", "Configuração de IA", "Segurança e feature flags"]
      .every((t) => new RegExp(t, "i").test(document.body.innerText)));
  assert(cartoes, "os 4 cartões de área montam no hub");

  console.log("\n=== SA_TENANT · criar tenant com defaults restritivos ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(3));
  await page.waitForFunction(() => /Tenants e planos/i.test(document.body.innerText), { timeout: 8000 });
  await page.fill('[aria-label="Nome do tenant"]', "Escola Modelo");
  await page.locator("button", { hasText: "Criar" }).first().click();
  await page.waitForFunction(() => /Escola Modelo/.test(document.body.innerText), { timeout: 5000 });
  const tenant = await page.evaluate(() => {
    const envs = JSON.parse(localStorage.getItem("pipoca.admin.tenants.v1") || "[]");
    return { esquema: (envs[0] || {}).esquema, plano: (envs[0] || { tenant: {} }).tenant.planoId, naTela: /Grátis/i.test(document.body.innerText) };
  });
  assert(tenant.esquema === "pipoca.tenant.v1", "tenant persiste em envelope pipoca.tenant.v1");
  assert(tenant.plano === "gratis" && tenant.naTela, "tenant novo nasce no plano Grátis (restritivo, IA off)");

  console.log("\n=== SA_CONTENT · validação dupla na tela ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(4));
  await page.waitForFunction(() => /Biblioteca de conteúdo/i.test(document.body.innerText), { timeout: 8000 });
  const invalido = await page.evaluate(() => window.PipocaAdminCanonico.conteudo.validarGrafoAutoral({}));
  assert(invalido.ok === false && invalido.erros.length > 0, "grafo vazio é rejeitado com motivo");
  await page.locator("button", { hasText: "Carregar exemplo do Quintal" }).click();
  await page.waitForTimeout(300);
  await page.locator("button", { hasText: "Validar agora" }).click();
  await page.waitForFunction(() => /Grafo válido/i.test(document.body.innerText), { timeout: 5000 });
  assert(true, "exemplo do Quintal passa a validação dupla na tela");

  console.log("\n=== SA_AI · sem chaves no cliente + gate do plano ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(5));
  await page.waitForFunction(() => /Configuração de IA/i.test(document.body.innerText), { timeout: 8000 });
  const ia = await page.evaluate(() => ({
    semInputChave: ![...document.querySelectorAll("input")].some((i) => /chave|key/i.test(i.getAttribute("aria-label") || i.placeholder || "")),
    notaServidor: /fica no servidor/i.test(document.body.innerText),
    gatePlano: /não permite IA/i.test(document.body.innerText),
  }));
  assert(ia.semInputChave, "não existe input de chave na tela (server-side, fase06)");
  assert(ia.notaServidor, "a tela explica que chaves/teste de conexão são do servidor");
  assert(ia.gatePlano, "plano Grátis do tenant bloqueia o formulário de IA (gate do plano)");
  assert(
    await page.evaluate(() => /DeepSeek/i.test(document.body.innerText)),
    "fase06: DeepSeek aparece como 4º provedor na tela"
  );

  console.log("\n=== SA_SAFE · kill-switch com efeito e persistência ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(6));
  await page.waitForFunction(() => /Segurança e feature flags/i.test(document.body.innerText), { timeout: 8000 });
  const efeito = await page.evaluate(() => {
    const C = window.PipocaAdminCanonico;
    C.flags.salvarFlags(C.flags.definirFlag(C.flags.carregarFlags(), "ia", true));
    const ligada = C.flags.aplicarFlagsAosModos({ ...C.modos.modosPadrao, iaLigada: true }, C.flags.carregarFlags()).iaLigada;
    const flagsMortas = C.flags.killSwitch(C.flags.carregarFlags(), "ia");
    C.flags.salvarFlags(flagsMortas);
    const depois = C.flags.aplicarFlagsAosModos({ ...C.modos.modosPadrao, iaLigada: true }, flagsMortas).iaLigada;
    return { antes: ligada, depois };
  });
  assert(efeito.antes === true, "flag global de IA ligada respeita a autorização do cuidador");
  assert(efeito.depois === false, "kill-switch derruba a IA mesmo com o cuidador autorizando");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.PipocaAdminCanonico && !!window.PipocaAdmin, { timeout: 15000 });
  const persistiu = await page.evaluate(() => window.PipocaAdminCanonico.flags.carregarFlags().ia === false);
  assert(persistiu, "o kill-switch sobrevive ao reload (persistência local)");

  console.log("\n=== Sessão persistida + logout + isolamento final ===");
  await page.waitForFunction(() => window.PipocaAdmin.estado.telaAdmin === 2, { timeout: 8000 });
  assert(true, "com sessão persistida, o boot pós-reload cai direto no hub");
  await page.evaluate(() => window.PipocaAdmin.sairSuperAdmin());
  await page.waitForFunction(() => window.PipocaAdmin.estado.telaAdmin === 1, { timeout: 5000 });
  const fim = await page.evaluate(() => ({
    sessaoLimpa: localStorage.getItem("pipoca.admin.sessao.v1") === null,
    credencialFica: localStorage.getItem("pipoca.admin.credencial.v1") !== null,
    familiaDepois: JSON.stringify({
      perfil: localStorage.getItem("pipoca.perfil.v1"),
      acesso: localStorage.getItem("pipoca.acesso.v1"),
      conta: localStorage.getItem("pipoca.conta.v1"),
    }),
  }));
  assert(fim.sessaoLimpa && fim.credencialFica, "sair limpa a sessão e preserva a credencial");
  assert(fim.familiaDepois === boot.familiaAntes, "as chaves da família seguem intactas (login SA não toca dados da casa)");
  assert(erros.length === 0, `sem erros de página (${erros.length ? erros.join(" | ") : "nenhum"})`);
} catch (e) {
  console.error("ERRO no runner e2e admin:", e);
  falhou++;
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
process.exit(falhou > 0 ? 1 : 0);
