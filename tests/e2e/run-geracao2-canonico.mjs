/**
 * Runner e2e da GERAÇÃO 2 (fase13 · fluxo compor→realizar→validar→exibir→salvar).
 * --------------------------------------------------------------------------------
 * Variante NOVA do e2e canônico (fase14-14-00: o canônico segue vivo como prova
 * de vida do v3 — este cobre o fluxo novo). Provedor FAKE injetado no seam
 * (`PipocaCanonico.geracao.realizadorRemoto`) — sem rede, sem chave.
 *
 * Verifica: (1) fichas v1 carregadas no boot ao lado do grafo; (2) prévia do
 * portão DETERMINÍSTICA com zero LLM por movimento (D-13.2); (3) realização
 * dispara SÓ no commit, em background, e recebe o Pacote com o personagem do
 * perfil (gênero aditivo); (4) intermediárias por rodada + história completa
 * salvas com texto realizado, origem, pacoteOrigem e rodada (13-02); (5) o
 * leitor EXIBE o texto realizado; (6) caminho infeliz: realizador fora do ar
 * ⇒ fallback A+ v3 local, origem sinalizada — a criança nunca vê erro.
 *
 * Usa playwright-core em cache (registry offline). Porta dedicada 5139.
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

const PORT = Number(process.env.E2E_PORT) || 5139;
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
  await page.addInitScript(() => {
    window.PIPOCA_CONFIG = { provedor: "local" }; // e2e SEMPRE offline
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));

  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !!window.PipocaCanonico && !!window.PipocaApp && !!window.PipocaApp.cenarioV2 && !!window.PipocaApp.repo,
    { timeout: 15000 }
  );

  console.log("\n=== Boot · fichas v1 ao lado do grafo + seam do módulo de geração ===");
  await page.waitForFunction(() => window.PipocaApp.fichasProntas === true, { timeout: 10000 });
  const boot = await page.evaluate(() => {
    const Canon = window.PipocaCanonico;
    return {
      temGeracao: !!Canon.geracao && typeof Canon.geracao.gerar === "function",
      rotaPadrao: Canon.geracao ? Canon.geracao.ROTA_PADRAO : null,
      concordanciaPadrao: Canon.geracao ? Canon.geracao.GENERO_CONCORDANCIA_PADRAO : null,
      composicaoIntacta: !!Canon.composicao && typeof Canon.composicao.montar === "function",
    };
  });
  assert(boot.temGeracao, "PipocaCanonico.geracao exposto no bundle (novo sub-objeto do seam)");
  assert(boot.composicaoIntacta, "PipocaCanonico.composicao segue intacto (prévia/fallback)");
  assert(
    boot.rotaPadrao && ["n1", "n2", "n3", "n4"].every((n) => boot.rotaPadrao[n] === "realizador"),
    "política de rota padrão: realizador em todos os níveis"
  );
  assert(
    boot.concordanciaPadrao === "f",
    "default de concordância (f, com o NOME REAL) registrado para perfis sem gênero — regra pós-incidente"
  );
  assert(true, "fichas v1 carregadas no boot (fichasProntas)");

  console.log("\n=== Caminho feliz · fake realizador: prévia determinística, LLM só no commit ===");
  const feliz = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const Canon = window.PipocaCanonico;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));

    // Perfil com GÊNERO (aditivo, 13-01) — o Pacote deve carregá-lo.
    const perfil = Canon.perfil.criarPerfil("g2-feliz", {
      nome: "Pietro", idade: 8, nivel: "n2", avatarId: "pingo", genero: "m",
    });
    await App.repo.salvarPerfil(perfil);
    App.selecionarPerfil(perfil);
    await espera(30);

    // Provedor FAKE no seam: registra o Pacote recebido e devolve texto realizado.
    const registro = { chamadas: 0, pacotes: [] };
    const TEXTO_FAKE = "Pietro pisa na grama fria. A história realizada chega pronta do faz-de-conta.";
    Canon.geracao.realizadorRemoto = () => async (pacote) => {
      registro.chamadas++;
      registro.pacotes.push(pacote);
      return {
        texto: TEXTO_FAKE,
        paragrafos: [TEXTO_FAKE],
        veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} },
        origem: { fonte: "llm", provedor: "fake-e2e", modelo: "fake-1" },
        metadados: { chamadas: 1, duracaoMs: 1 },
      };
    };

    App.iniciarComposicao();
    const banco = App.estado.comp.banco.slice(0, 3);

    // Prévia (T4) é determinística e NÃO chama o realizador (zero LLM por movimento).
    const pendenteR1 = { tipo: "r1", ordem: banco };
    const previa1 = App.preverComposicao(pendenteR1, "n2");
    const previa2 = App.preverComposicao(pendenteR1, "n2");
    const chamadasAntesDoCommit = registro.chamadas;

    // Commit da R1 (fluxo da T5) → dispara em background → próxima rodada.
    App.aplicarComposicao(pendenteR1);
    App.abrirProximaRodadaComposicao();

    // R2..R4 pelo mesmo fluxo de commit (pendente "insere", como o portão faz).
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let pendente = null;
      for (let slot = 0; slot <= comp.linha.length && !pendente; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) pendente = { tipo: "insere", objetoId: objeto, slot };
      }
      if (!pendente) break;
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
    }
    await espera(150); // capturas fire-and-forget aterrissam (fake resolve na hora)

    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-feliz") || "[]").map((e) => e.historia);
    const completa = envs.find((h) => h && h.intermediaria !== true);
    const intermediarias = envs.filter((h) => h && h.intermediaria === true);
    return {
      previaDeterministica: previa1 === previa2 && previa1.length > 0,
      chamadasAntesDoCommit,
      chamadas: registro.chamadas,
      pacoteComPietro: registro.pacotes.every(
        (p) => p && p.esquema === "pipoca.pacote-composicao.v1" &&
          p.personagem.nome === "Pietro" && p.personagem.genero === "m"
      ),
      convergiu: App.composicaoConvergiu(),
      totalRegistros: envs.length,
      intermediarias: intermediarias.length,
      rodadasIntermediarias: intermediarias.map((h) => h.rodada).sort(),
      completaOk: !!completa && completa.texto.indexOf("faz-de-conta") >= 0,
      completaOrigem: completa ? completa.origem : null,
      completaPacote: !!completa && !!completa.pacoteOrigem &&
        completa.pacoteOrigem.esquema === "pipoca.pacote-composicao.v1",
      completaRodada: completa ? completa.rodada : null,
      titulo: completa ? completa.titulo : "",
      idNoEstado: !!completa && App.estado.ultimaHistoriaSalvaId === completa.id,
    };
  });
  assert(feliz.previaDeterministica, "prévia do portão é determinística (A+ v3, byte-igual no repeat)");
  assert(feliz.chamadasAntesDoCommit === 0, "ZERO chamadas de LLM por movimento — realização só no commit (D-13.2)");
  assert(feliz.convergiu, "a composição converge pelo fluxo de commit (T4→T5)");
  assert(feliz.chamadas === 4, "4 commits de rodada = 4 realizações em background (uma por portão)");
  assert(feliz.pacoteComPietro, "todo Pacote carrega o personagem do PERFIL (Pietro, m) — gênero aditivo vivo");
  assert(feliz.intermediarias === 3 && feliz.totalRegistros === 4, "3 intermediárias + 1 completa salvas (13-02)");
  assert(
    String(feliz.rodadasIntermediarias) === "1,2,3" && feliz.completaRodada === 4,
    "marcador de rodada correto (intermediárias R1–R3; completa R4)"
  );
  assert(feliz.completaOk, "a história completa salva o TEXTO REALIZADO (veio do fake, não do A+)");
  assert(
    !!feliz.completaOrigem && feliz.completaOrigem.fonte === "llm" &&
      feliz.completaOrigem.provedor === "fake-e2e" && feliz.completaOrigem.rota === "realizador",
    "origem sinalizada na história salva (llm · fake-e2e · rota realizador)"
  );
  assert(feliz.completaPacote, "pacoteOrigem salvo junto do texto (unidade de evidência da geração 2)");
  assert(feliz.idNoEstado, "ultimaHistoriaSalvaId aponta a completa (coração da T6)");

  // ── EXIBIR: o leitor mostra o texto realizado (T3 → cartão → modal) ──
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 3 }); });
  await page.waitForFunction(
    (t) => document.body.innerText.indexOf(t) >= 0,
    feliz.titulo,
    { timeout: 4000 }
  );
  await page.locator("div[role='button']", { hasText: feliz.titulo }).first().click();
  await page.waitForFunction(() => /faz-de-conta/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "o leitor EXIBE o texto realizado pela geração 2 (compor→realizar→validar→exibir→salvar)");
  await page.locator('[aria-label="Fechar"]').first().click();

  console.log("\n=== Caminho infeliz · realizador fora do ar ⇒ fallback A+ v3 local ===");
  const infeliz = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const Canon = window.PipocaCanonico;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const perfil = Canon.perfil.criarPerfil("g2-infeliz", {
      nome: "Aurora", idade: 7, nivel: "n2", avatarId: "lua", genero: "f",
    });
    await App.repo.salvarPerfil(perfil);
    App.selecionarPerfil(perfil);
    await espera(30);

    // Edge "fora do ar": o remoto lança — o fallback NÃO depende do edge (13-03).
    Canon.geracao.realizadorRemoto = () => async () => { throw new Error("edge fora do ar (e2e)"); };

    App.iniciarComposicao();
    App.aplicarComposicao({ tipo: "r1", ordem: App.estado.comp.banco.slice(0, 3) });
    App.abrirProximaRodadaComposicao();
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let pendente = null;
      for (let slot = 0; slot <= comp.linha.length && !pendente; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) pendente = { tipo: "insere", objetoId: objeto, slot };
      }
      if (!pendente) break;
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
    }
    await espera(150);
    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-infeliz") || "[]").map((e) => e.historia);
    const completa = envs.find((h) => h && h.intermediaria !== true);
    return {
      convergiu: App.composicaoConvergiu(),
      capturada: !!completa && typeof completa.texto === "string" && completa.texto.length > 40,
      origem: completa ? completa.origem : null,
      texto: completa ? completa.texto : "",
    };
  });
  assert(infeliz.convergiu && infeliz.capturada, "com o edge fora do ar a história ainda é capturada (nunca tela vazia)");
  assert(
    !!infeliz.origem && infeliz.origem.fonte === "fallback-a-mais",
    "origem sinaliza o fallback A+ v3 (fonte fallback-a-mais)"
  );
  {
    // Prova de vida do v3 no caminho infeliz: o texto é do motor de reserva.
    const grafoV3 = JSON.parse(readFileSync(new URL("../../docs/quintal.v3.json", import.meta.url), "utf8"));
    const aberturas = Object.values(grafoV3.cenario.moldura.abertura).flatMap((t) => (Array.isArray(t) ? t : [t]));
    assert(
      aberturas.some((a) => infeliz.texto.startsWith(a)),
      "v3 vivo como RESERVA: o texto do fallback começa com abertura autorada do grafo"
    );
  }

  assert(erros.length === 0, "sem erros de página no fluxo da geração 2 (erros: " + (erros.join(" | ") || "nenhum") + ")");
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) process.exit(1);
