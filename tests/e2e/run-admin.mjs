/**
 * [run-admin.mjs] — Runner e2e da PLATAFORMA DO OPERADOR (super admin): sobe o
 *   server, dirige /admin.html com Playwright e prova isolamento, guard
 *   fail-closed, 1º uso do SA_LOGIN, tenants, conteúdo, ConfigIA sem chaves e
 *   kill-switch persistente.
 *
 * PAPEL: e2e (offline · admin bundle num Chromium headless)
 * POR QUE EXISTE: garante que o admin (pipoca.admin.bundle.js + src/admin/
 *   estadoAdmin.js + telas SA_*) sobe ISOLADO do app da criança e que os núcleos
 *   do operador funcionam ponta-a-ponta — sem jamais tocar os dados da família.
 * ENTRA: env E2E_ADMIN_PORT (5138), PW_CORE/PW_CHROME (playwright-core e Chromium
 *   em cache), server.js; injeta PIPOCA_CONFIG={provedor:"local"}.
 * SAI: relatório ✓/✗ no console + process.exit(1) se algum assert falhar.
 * CHAMA: node:child_process (spawn "node server.js"), node:net (espera a porta),
 *   playwright-core (chromium); dirige window.PipocaAdmin/PipocaAdminCanonico.
 * É CHAMADO POR: script npm `test:e2e:admin` (package.json); é um entrypoint
 *   (nenhum módulo o importa).
 * RODA POR: `bun run test:e2e:admin`
 * CUIDADO: roda SEMPRE offline (PIPOCA_CONFIG local injetado antes de tudo);
 *   Chromium via _harness.mjs (D7: devDependency + `npm run e2e:install`;
 *   PW_CORE/PW_CHROME só como override); porta 5138 dedicada (5137 é do e2e
 *   canônico, 5000 é outro dev server). SA_AI é keyless — nenhuma chave de IA.
 *
 * — detalhe preservado —
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
import { chromium, executavelChromium, bootServer } from "./_harness.mjs";

const PORT = Number(process.env.E2E_ADMIN_PORT) || 5138;
const BASE = `http://localhost:${PORT}`;

let passou = 0, falhou = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); passou++; }
  else { console.error(`  ✗ ${msg}`); falhou++; }
};

const server = await bootServer(PORT);
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: executavelChromium() });
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
  // B11: glossário de produto — "Contas e planos" (sem "tenant" no texto visível).
  const cartoes = await page.evaluate(() =>
    ["Contas e planos", "Biblioteca de conteúdo", "Configuração de IA", "Segurança e feature flags"]
      .every((t) => new RegExp(t, "i").test(document.body.innerText)));
  assert(cartoes, "os 4 cartões de área montam no hub");

  console.log("\n=== SA_TENANT · criar conta nasce no Freemium (60 dias de Família) ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(3));
  await page.waitForFunction(() => /Contas e planos/i.test(document.body.innerText), { timeout: 8000 });
  await page.fill('[aria-label="Nome da conta"]', "Escola Modelo");
  await page.locator("button", { hasText: "Criar" }).first().click();
  await page.waitForFunction(() => /Escola Modelo/.test(document.body.innerText), { timeout: 5000 });
  const tenant = await page.evaluate(() => {
    const envs = JSON.parse(localStorage.getItem("pipoca.admin.tenants.v1") || "[]");
    return {
      esquema: (envs[0] || {}).esquema,
      plano: (envs[0] || { tenant: {} }).tenant.planoId,
      naTela: /Freemium/i.test(document.body.innerText),
      relogio: /dia\(s\) restante\(s\)/i.test(document.body.innerText),
    };
  });
  assert(tenant.esquema === "pipoca.tenant.v1", "tenant persiste em envelope pipoca.tenant.v1");
  assert(tenant.plano === "freemium" && tenant.naTela, "tenant novo nasce no Freemium (60 dias de Família grátis)");
  assert(tenant.relogio, "a tela mostra os dias restantes do Freemium");

  console.log("\n=== SA_CONTENT · validação dupla na tela ===");
  await page.evaluate(() => window.PipocaAdmin.irParaTela(4));
  await page.waitForFunction(() => /Biblioteca de conteúdo/i.test(document.body.innerText), { timeout: 8000 });
  const invalido = await page.evaluate(() => window.PipocaAdminCanonico.conteudo.validarGrafoAutoral({}));
  assert(invalido.ok === false && invalido.erros.length > 0, "grafo vazio é rejeitado com motivo");
  await page.locator("button", { hasText: "Carregar exemplo do Quintal" }).click();
  await page.waitForTimeout(300);
  await page.locator("button", { hasText: "Validar agora" }).click();
  await page.waitForFunction(() => /Cenário válido/i.test(document.body.innerText), { timeout: 5000 });
  assert(true, "exemplo do Quintal passa a validação dupla na tela");

  console.log("\n=== SA_AI · sem chaves no cliente + gate do plano ===");
  // Rebaixa o tenant p/ Grátis (iaPermitida=false) para exercitar o gate —
  // o Freemium de nascença permite IA, então o gate não apareceria.
  await page.evaluate(async () => {
    const A = window.PipocaAdmin;
    const envs = JSON.parse(localStorage.getItem("pipoca.admin.tenants.v1") || "[]");
    const t = envs[0].tenant;
    await A.repoTenant.salvarTenant({ ...t, planoId: "gratis" });
  });
  await page.evaluate(() => window.PipocaAdmin.irParaTela(5));
  await page.waitForFunction(() => /Configuração de IA/i.test(document.body.innerText), { timeout: 8000 });
  const ia = await page.evaluate(() => ({
    semInputChave: ![...document.querySelectorAll("input")].some((i) => /chave|key/i.test(i.getAttribute("aria-label") || i.placeholder || "")),
    notaServidor: /fica no servidor/i.test(document.body.innerText),
    gatePlano: /não permite IA/i.test(document.body.innerText),
  }));
  assert(ia.semInputChave, "não existe input de chave na tela (server-side, fase06)");
  assert(ia.notaServidor, "a tela explica que chaves/teste de conexão são do servidor");
  assert(ia.gatePlano, "tenant rebaixado a Grátis bloqueia o formulário de IA (gate do plano)");
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
