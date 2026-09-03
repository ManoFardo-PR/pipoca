/**
 * [run-geracao2-canonico.mjs] — Runner e2e da GERAÇÃO 2: dirige o app em /app com
 *   Playwright e um provedor FAKE no seam (Canon.geracao.realizadorRemoto),
 *   cobrindo o fluxo compor→realizar→validar→exibir→salvar sem rede nem chave.
 *
 * PAPEL: e2e (offline · fluxo da geração 2 com realizador fake)
 * POR QUE EXISTE: variante nova do e2e canônico (fase14-14-00) para o fluxo do
 *   realizador — prévia determinística no portão (zero LLM por MOVIMENTO),
 *   realização 1×/rodada na ENTRADA, salvo===lido, intermediárias+completa
 *   salvas, e os caminhos infelizes (edge fora do ar, teto) caindo no A+ v3 cru
 *   sem a criança ver erro. Cobre também a identidade pós-incidente (nome sempre).
 * ENTRA: env E2E_PORT (5139), PW_CORE/PW_CHROME (playwright-core e Chromium em
 *   cache), server.js; injeta PIPOCA_CONFIG={provedor:"local"} e
 *   tetoRealizacaoMs p/ não esperar os 8s reais.
 * SAI: relatório ✓/✗ no console + process.exit(1) se algum assert falhar.
 * CHAMA: node:child_process (spawn "node server.js"), node:net, node:fs (lê
 *   docs/quintal.v3.json p/ prova de vida), playwright-core (chromium); dirige
 *   window.PipocaApp/PipocaCanonico e injeta o fake em Canon.geracao.realizadorRemoto.
 * É CHAMADO POR: script npm `test:e2e:geracao2` (package.json); é um entrypoint.
 * RODA POR: `bun run test:e2e:geracao2`
 * CUIDADO: o realizador é SEMPRE um fake injetado no seam — nenhuma rede, nenhuma
 *   chave paga (o cliente é keyless; as chaves vivem só nas Edge Functions). Roda
 *   offline (PIPOCA_CONFIG local antes de tudo); caminhos ABSOLUTOS em
 *   PW_CORE/PW_CHROME; porta 5139 dedicada; depende do bundle buildado.
 *
 * — detalhe preservado —
 * Runner e2e da GERAÇÃO 2 (fase13 · fluxo compor→realizar→validar→exibir→salvar).
 * --------------------------------------------------------------------------------
 * Variante NOVA do e2e canônico (fase14-14-00: o canônico segue vivo como prova
 * de vida do v3 — este cobre o fluxo novo). Provedor FAKE injetado no seam
 * (`PipocaCanonico.geracao.realizadorRemoto`) — sem rede, sem chave.
 *
 * Verifica: (1) fichas v1 carregadas no boot ao lado do grafo; (2) prévia do
 * portão (T4) DETERMINÍSTICA com zero LLM por MOVIMENTO (D-13.2); (3) P2
 * (13-01:50 reconciliado): a realização dispara na ENTRADA do portão (1×/rodada)
 * e a T5 LÊ o texto REALIZADO; recebe o Pacote com o personagem do perfil
 * (gênero aditivo); (4) intermediárias por rodada + história completa salvas com
 * o texto LIDO, origem, pacoteOrigem e rodada (13-02) — salvo === lido; (5) o
 * leitor EXIBE o texto realizado; (6) caminho infeliz: realizador fora do ar ⇒
 * o portão CAI NO CRU (A+ v3 visível), origem sinalizada; (7) teto: fake que
 * estoura o teto (override e2e) ⇒ cru por 'teto' — a criança nunca vê erro;
 * (8) Plan03 · A1 — gate de consentimento: com IA desligada (cuidador não
 * autorizou OU kill-switch) o realizador NÃO é chamado e a origem diz
 * 'ia-desligada'. Por isso os blocos que ESPERAM o fake ligam a IA efetiva
 * (modos.iaLigada + flag global `ia`) depois de selecionar o perfil.
 *
 * Chromium via _harness.mjs (D7). Porta dedicada 5139.
 */
import { readFileSync } from "node:fs";
import { chromium, executavelChromium, bootServer } from "./_harness.mjs";

const PORT = Number(process.env.E2E_PORT) || 5139;
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

  console.log("\n=== Caminho feliz · fake realizador: prévia determinística; o PORTÃO lê o realizado (P2) ===");
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
    // A1 · o gate de consentimento exige IA EFETIVA (cuidador + plataforma).
    localStorage.setItem("pipoca.admin.flags.v1", JSON.stringify({ ia: true, fala: false, conteudoCustomizado: true, telemetria: true }));
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) });

    // Provedor FAKE no seam: registra o Pacote recebido e devolve texto realizado
    // em 3 PARÁGRAFOS (linha em branco), como o realizador real (fim do paredão).
    const registro = { chamadas: 0, pacotes: [] };
    const PARAGRAFOS_FAKE = [
      "Pietro pisa na grama fria.",
      "A história realizada chega pronta do faz-de-conta.",
      "E respira em três blocos separados.",
    ];
    const TEXTO_FAKE = PARAGRAFOS_FAKE.join("\n\n");
    Canon.geracao.realizadorRemoto = () => async (pacote) => {
      registro.chamadas++;
      registro.pacotes.push(pacote);
      return {
        texto: TEXTO_FAKE,
        paragrafos: PARAGRAFOS_FAKE.slice(),
        veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} },
        origem: { fonte: "llm", provedor: "fake-e2e", modelo: "fake-1" },
        metadados: { chamadas: 1, duracaoMs: 1 },
      };
    };

    // Portão de uma rodada (fluxo T4→T5): prepararLeituraPortao DISPARA a
    // realização na ENTRADA e abre a T5; espera a corrida (fake resolve rápido)
    // trocar gateStage p/ 'reading'; então commita (aplicar + próxima rodada),
    // como faz o _commit da T5. Devolve o gateTrecho LIDO no portão.
    const portao = async (pendente, objetoId) => {
      App.prepararLeituraPortao(pendente, objetoId);
      let g = 0;
      while (App.estado.gateStage !== "reading" && g++ < 400) await espera(5);
      const gateTrecho = App.estado.gateTrecho;
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
      return gateTrecho;
    };

    App.iniciarComposicao();
    const banco = App.estado.comp.banco.slice(0, 3);

    // Prévia (T4) é determinística e NÃO chama o realizador (zero LLM por MOVIMENTO).
    const pendenteR1 = { tipo: "r1", ordem: banco };
    const previa1 = App.preverComposicao(pendenteR1, "n2");
    const previa2 = App.preverComposicao(pendenteR1, "n2");
    const chamadasAntesDoPortao = registro.chamadas;

    // Portão R1: a T5 deve LER o texto REALIZADO (não a prévia crua).
    const gateTrechoR1 = await portao(pendenteR1, banco[banco.length - 1]);

    // R2..R4 pelo mesmo fluxo de portão (pendente "insere").
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let pendente = null;
      for (let slot = 0; slot <= comp.linha.length && !pendente; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) pendente = { tipo: "insere", objetoId: objeto, slot };
      }
      if (!pendente) break;
      await portao(pendente, objeto);
    }
    await espera(150); // capturas fire-and-forget aterrissam (fake resolve na hora)

    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-feliz") || "[]").map((e) => e.historia);
    const completa = envs.find((h) => h && h.intermediaria !== true);
    const intermediarias = envs.filter((h) => h && h.intermediaria === true);
    return {
      previaDeterministica: previa1 === previa2 && previa1.length > 0,
      chamadasAntesDoPortao,
      gateLeuRealizado: gateTrechoR1 === TEXTO_FAKE,
      salvoIgualLido: !!completa && completa.texto === gateTrechoR1,
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
      completaTextoVerbatim: !!completa && completa.texto === TEXTO_FAKE,
      completaParagrafos: !!completa && Array.isArray(completa.paragrafos)
        ? completa.paragrafos.length : 0,
      completaOrigem: completa ? completa.origem : null,
      completaPacote: !!completa && !!completa.pacoteOrigem &&
        completa.pacoteOrigem.esquema === "pipoca.pacote-composicao.v1",
      completaRodada: completa ? completa.rodada : null,
      titulo: completa ? completa.titulo : "",
      idNoEstado: !!completa && App.estado.ultimaHistoriaSalvaId === completa.id,
    };
  });
  assert(feliz.previaDeterministica, "prévia do portão é determinística (A+ v3, byte-igual no repeat)");
  assert(feliz.chamadasAntesDoPortao === 0, "ZERO LLM por MOVIMENTO — a prévia da T4 não chama o realizador (D-13.2)");
  assert(feliz.gateLeuRealizado, "P2: o PORTÃO (T5) LÊ o texto REALIZADO — gateTrecho === texto do fake (com Pietro), não a prévia crua");
  assert(feliz.salvoIgualLido, "salvo === lido: a história salva é exatamente o texto lido no portão");
  assert(feliz.convergiu, "a composição converge pelo fluxo de portão (T4→T5)");
  assert(feliz.chamadas === 4, "4 entradas de portão = 4 realizações (uma por rodada, na entrada — não no commit)");
  assert(feliz.pacoteComPietro, "todo Pacote carrega o personagem do PERFIL (Pietro, m) — gênero aditivo vivo");
  assert(feliz.intermediarias === 3 && feliz.totalRegistros === 4, "3 intermediárias + 1 completa salvas (13-02)");
  assert(
    String(feliz.rodadasIntermediarias) === "1,2,3" && feliz.completaRodada === 4,
    "marcador de rodada correto (intermediárias R1–R3; completa R4)"
  );
  assert(feliz.completaOk, "a história completa salva o TEXTO REALIZADO (veio do fake, não do A+)");
  assert(feliz.completaTextoVerbatim, "o texto com \\n\\n é salvo VERBATIM (as quebras sobrevivem à persistência)");
  assert(feliz.completaParagrafos === 3, "paragrafos do realizador salvos no registro (3 blocos — fim do paredão)");
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
  // C2: o cartão da estante virou <button> (coração é irmão).
  await page.locator("button", { hasText: feliz.titulo }).first().click();
  await page.waitForFunction(() => /faz-de-conta/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "o leitor EXIBE o texto realizado pela geração 2 (compor→realizar→validar→exibir→salvar)");

  // Fim do paredão: o leitor renderiza um <p> POR PARÁGRAFO (não um bloco único).
  const blocos = await page.evaluate(() => {
    const ps = [...document.querySelectorAll("p")].filter((p) =>
      /grama fria|faz-de-conta|blocos separados/.test(p.textContent || ""));
    return {
      total: ps.length,
      algumColado: ps.some((p) =>
        /grama fria/.test(p.textContent || "") && /faz-de-conta/.test(p.textContent || "")),
    };
  });
  assert(blocos.total === 3 && !blocos.algumColado,
    "o leitor renderiza 3 <p> separados (um por parágrafo) — fim do paredão");
  await page.locator('[aria-label="Fechar"]').first().click();

  // Registro ANTIGO (sem `paragrafos`): o leitor deriva os blocos do texto
  // por linha em branco — todo o histórico salvo ganha o conserto.
  await page.evaluate(() => {
    const App = window.PipocaApp;
    App.setState({ leitorHistoria: {
      id: "legada-e2e", cenarioId: "quintal_anoitecer",
      texto: "Bloco legado um da colheita.\n\nBloco legado dois da colheita.",
      linha: ["vagalume"], nivel: "n2", desfecho: "convergente",
      titulo: "História legada", emoji: "🌾", criadaEm: Date.now(), favorita: false,
    } });
  });
  await page.waitForFunction(() => /colheita/.test(document.body.innerText), { timeout: 4000 });
  const blocosLegado = await page.evaluate(() => {
    const ps = [...document.querySelectorAll("p")].filter((p) =>
      /colheita/.test(p.textContent || ""));
    return {
      total: ps.length,
      algumColado: ps.some((p) => /legado um/.test(p.textContent || "") && /legado dois/.test(p.textContent || "")),
    };
  });
  assert(blocosLegado.total === 2 && !blocosLegado.algumColado,
    "registro antigo SEM paragrafos ainda renderiza — 2 blocos derivados do \\n\\n do texto");
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
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) }); // A1: IA efetiva

    // Edge "fora do ar": o remoto lança — o fallback NÃO depende do edge (13-03).
    Canon.geracao.realizadorRemoto = () => async () => { throw new Error("edge fora do ar (e2e)"); };

    const portao = async (pendente, objetoId) => {
      const previa = App.preverComposicao(pendente, App.estado.perfil.nivel || "n2");
      App.prepararLeituraPortao(pendente, objetoId);
      let g = 0;
      while (App.estado.gateStage !== "reading" && g++ < 400) await espera(5);
      const gateTrecho = App.estado.gateTrecho;
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
      return { previa, gateTrecho };
    };

    App.iniciarComposicao();
    const banco = App.estado.comp.banco.slice(0, 3);
    const r1 = await portao({ tipo: "r1", ordem: banco }, banco[banco.length - 1]);
    let guarda = 0;
    while (!App.composicaoConvergiu() && guarda++ < 10) {
      const comp = App.estado.comp;
      const objeto = comp.banco[0];
      let pendente = null;
      for (let slot = 0; slot <= comp.linha.length && !pendente; slot++) {
        if (App.podeInserirComposicao(objeto, slot)) pendente = { tipo: "insere", objetoId: objeto, slot };
      }
      if (!pendente) break;
      await portao(pendente, objeto);
    }
    await espera(150);
    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-infeliz") || "[]").map((e) => e.historia);
    const completa = envs.find((h) => h && h.intermediaria !== true);
    return {
      convergiu: App.composicaoConvergiu(),
      capturada: !!completa && typeof completa.texto === "string" && completa.texto.length > 40,
      origem: completa ? completa.origem : null,
      texto: completa ? completa.texto : "",
      portaoLeuCru: r1.gateTrecho === r1.previa && r1.previa.length > 0,
    };
  });
  assert(infeliz.convergiu && infeliz.capturada, "com o edge fora do ar a história ainda é capturada (nunca tela vazia)");
  assert(infeliz.portaoLeuCru, "P2 portão-cai-no-cru: o remoto lança ⇒ a T5 LÊ a prévia A+ crua (gateTrecho === prévia)");
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

  console.log("\n=== Teto · fake que NUNCA resolve ⇒ cru por 'teto' (override de e2e) ===");
  const teto = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const Canon = window.PipocaCanonico;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    // Override do teto p/ não esperar 8s reais no e2e (P2 · _tetoMs).
    window.PIPOCA_CONFIG = Object.assign(window.PIPOCA_CONFIG || {}, { tetoRealizacaoMs: 300 });
    const perfil = Canon.perfil.criarPerfil("g2-teto", {
      nome: "Theo", idade: 7, nivel: "n2", avatarId: "pingo", genero: "m",
    });
    await App.repo.salvarPerfil(perfil);
    App.selecionarPerfil(perfil);
    await espera(30);
    App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) }); // A1: IA efetiva
    // Realizador que NUNCA resolve → só o teto encerra a espera.
    Canon.geracao.realizadorRemoto = () => () => new Promise(() => {});
    App.iniciarComposicao();
    const banco = App.estado.comp.banco.slice(0, 3);
    const pendente = { tipo: "r1", ordem: banco };
    const previa = App.preverComposicao(pendente, "n2");
    const t0 = Date.now();
    App.prepararLeituraPortao(pendente, banco[banco.length - 1]);
    let g = 0;
    while (App.estado.gateStage !== "reading" && g++ < 600) await espera(10);
    const dt = Date.now() - t0;
    const gateTrecho = App.estado.gateTrecho;
    App.aplicarComposicao(pendente);
    App.abrirProximaRodadaComposicao();
    await espera(80);
    const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-teto") || "[]").map((e) => e.historia);
    const reg = envs.find((h) => h);
    // Restaura o teto para não afetar os cenários seguintes.
    delete window.PIPOCA_CONFIG.tetoRealizacaoMs;
    return {
      caiuNoCru: gateTrecho === previa && previa.length > 0,
      dentroDoTeto: dt >= 250 && dt < 3000,
      origem: reg ? reg.origem : null,
    };
  });
  assert(teto.caiuNoCru, "teto estourado ⇒ a T5 LÊ a prévia A+ crua (gateTrecho === prévia)");
  assert(teto.dentroDoTeto, "a espera respeitou o teto configurável (~300ms via PIPOCA_CONFIG.tetoRealizacaoMs)");
  assert(
    !!teto.origem && teto.origem.fonte === "fallback-a-mais" && /teto/.test(teto.origem.motivo || ""),
    "origem do cru por teto: fallback-a-mais com motivo contendo 'teto' (P1 — motivo real salvo)"
  );

  console.log("\n=== Identidade do personagem · regra pós-incidente (nome SEMPRE; pedir-uma-vez) ===");
  // Fake que captura a identidade de cada Pacote realizado (janela global,
  // lida entre os evaluates) — cobre os 3 cenários exigidos pela correção.
  const idSetup = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const Canon = window.PipocaCanonico;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__identidades = [];
    Canon.geracao.realizadorRemoto = () => async (pacote) => {
      window.__identidades.push({ nome: pacote.personagem.nome, genero: pacote.personagem.genero });
      return {
        texto: "Texto realizado de identidade.",
        paragrafos: ["Texto realizado de identidade."],
        veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} },
        origem: { fonte: "llm", provedor: "fake-e2e", modelo: "fake-1" },
        metadados: { chamadas: 1, duracaoMs: 1 },
      };
    };
    window.__jogarRodada = async () => {
      // A1: selecionar perfil hidrata os modos do save (iaLigada volta a false) —
      // liga a IA efetiva antes de cada rodada que ESPERA o fake.
      App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: true }) });
      App.iniciarComposicao();
      const banco = App.estado.comp.banco.slice(0, 3);
      const pendente = { tipo: "r1", ordem: banco };
      // P2: a realização dispara na ENTRADA do portão (não no commit).
      App.prepararLeituraPortao(pendente, banco[banco.length - 1]);
      let g = 0;
      while (App.estado.gateStage !== "reading" && g++ < 400) await espera(5);
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
      await espera(80);
    };
    // (a) pass-through no sentido f (o sentido m já é o g2-feliz acima, 4 rodadas)
    const aurora = Canon.perfil.criarPerfil("id-aurora", { nome: "Aurora", idade: 7, nivel: "n2", avatarId: "lua", genero: "f" });
    await App.repo.salvarPerfil(aurora);
    App.selecionarPerfil(aurora);
    await espera(30);
    const overlayComGenero = App.estado.pedirGenero === true;
    await window.__jogarRodada();
    // (b)/(c) perfil LEGADO sem gênero (o perfil do incidente) — ativação pede
    const pietro = Canon.perfil.criarPerfil("id-pietro", { nome: "Pietro", idade: 8, nivel: "n2", avatarId: "pingo" });
    await App.repo.salvarPerfil(pietro);
    // B5 (Plan03): o pedir-uma-vez abre na CHEGADA à T3 (destino 3), nunca sobre T4–T7.
    App.selecionarPerfil(pietro, 3);
    await espera(30);
    return {
      overlayComGenero,
      identidadeF: window.__identidades[0] || null,
      overlaySemGenero: App.estado.pedirGenero === true,
    };
  });
  assert(idSetup.overlayComGenero === false, "perfil COM gênero não dispara o pedir-uma-vez");
  assert(
    !!idSetup.identidadeF && idSetup.identidadeF.nome === "Aurora" && idSetup.identidadeF.genero === "f",
    "pass-through f: Pacote com o personagem do perfil (Aurora, f) — os dois sentidos cobertos"
  );
  assert(idSetup.overlaySemGenero, "perfil legado SEM gênero dispara o pedir-uma-vez na ativação");
  await page.waitForFunction(() => /quem vive as aventuras/i.test(document.body.innerText), { timeout: 4000 });
  assert(true, "overlay PedirGenero visível (padrão da casa, nome da criança no texto)");

  // (c) fluxo SEM resposta: "Depois" fecha; a geração usa o NOME REAL + concordância f.
  await page.locator('[aria-label="Depois"]').first().click();
  const semResposta = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const fechou = App.estado.pedirGenero === false;
    await window.__jogarRodada();
    return { fechou, identidade: window.__identidades[1] || null };
  });
  assert(semResposta.fechou, "'Depois' fecha o overlay sem escolher");
  assert(
    !!semResposta.identidade && semResposta.identidade.nome === "Pietro" && semResposta.identidade.genero === "f",
    "INCIDENTE corrigido no fluxo real: sem resposta ⇒ história do PIETRO com concordância f (nunca Joana)"
  );

  // (b) pedir-uma-vez de verdade: nova ativação pergunta de novo; a escolha PERSISTE.
  // B5: a rodada deixou a criança na T5 — o overlay NÃO pode aparecer ali; só ao chegar à T3.
  const semOverlayForaDaT3 = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const perfis = await App.repo.carregarPerfis();
    App.selecionarPerfil(perfis.find((p) => p.id === "id-pietro")); // sem destino: fica onde está
    await new Promise((r) => setTimeout(r, 60));
    return { tela: App.estado.tela, overlay: App.estado.pedirGenero === true };
  });
  assert(semOverlayForaDaT3.overlay === false, `B5: reativar fora da T3 (tela ${semOverlayForaDaT3.tela}) NÃO abre o pedir-uma-vez`);
  await page.evaluate(() => { window.PipocaApp.setState({ tela: 3 }); });
  await page.waitForFunction(() => window.PipocaApp.estado.pedirGenero === true, { timeout: 4000 });
  assert(true, "sem escolha persistida, a próxima ativação pergunta de novo — na chegada à T3 (B5)");
  await page.locator("button", { hasText: "Um menino" }).first().click();
  const escolha = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    await espera(50); // persistência fire-and-forget aterrissa
    const envs = JSON.parse(localStorage.getItem("pipoca.perfil.v1") || "[]");
    const env = envs.find((e) => e.perfil && e.perfil.id === "id-pietro");
    await window.__jogarRodada();
    const perfis = await App.repo.carregarPerfis();
    App.selecionarPerfil(perfis.find((p) => p.id === "id-pietro"), 3); // B5: chega à T3
    await espera(30);
    return {
      estadoVivo: App.estado.perfil && App.estado.perfil.genero,
      persistido: env && env.perfil.genero,
      identidade: window.__identidades[2] || null,
    };
  });
  assert(escolha.persistido === "m", "a escolha PERSISTE no envelope pipoca.perfil.v1 (genero: m)");
  assert(escolha.estadoVivo === "m", "o estado vivo reflete a escolha na hora");
  assert(
    !!escolha.identidade && escolha.identidade.nome === "Pietro" && escolha.identidade.genero === "m",
    "próxima geração usa Pietro, m — identidade completa do perfil"
  );
  const naoPerguntaMais = await page.evaluate(() => window.PipocaApp.estado.pedirGenero !== true);
  assert(naoPerguntaMais, "com o gênero persistido, a ativação seguinte NÃO pergunta mais (pediu UMA vez)");

  console.log("\n=== Plan03 · A1 · Gate de consentimento: IA desligada ⇒ realizador NÃO é chamado ===");
  const reqsRealizador = [];
  page.on("request", (r) => { if (/functions\/v1\/realizador/.test(r.url())) reqsRealizador.push(r.url()); });
  const gate = await page.evaluate(async () => {
    const App = window.PipocaApp;
    const Canon = window.PipocaCanonico;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const perfil = Canon.perfil.criarPerfil("g2-gate", {
      nome: "Nina", idade: 7, nivel: "n2", avatarId: "lua", genero: "f",
    });
    await App.repo.salvarPerfil(perfil);
    App.selecionarPerfil(perfil);
    await espera(30);
    const TEXTO_CONSENTIDO = "Texto realizado com consentimento.";
    const registro = { chamadas: 0 };
    Canon.geracao.realizadorRemoto = () => async () => {
      registro.chamadas++;
      return {
        texto: TEXTO_CONSENTIDO, paragrafos: [TEXTO_CONSENTIDO],
        veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} },
        origem: { fonte: "llm", provedor: "fake-e2e", modelo: "fake-1" },
        metadados: { chamadas: 1, duracaoMs: 1 },
      };
    };
    const flags = (ia) => localStorage.setItem("pipoca.admin.flags.v1",
      JSON.stringify({ ia, fala: false, conteudoCustomizado: true, telemetria: true }));
    const cuidador = (on) => App.setState({ modos: Object.assign({}, App.estado.modos, { iaLigada: on }) });
    const rodada = async () => {
      App.iniciarComposicao();
      const banco = App.estado.comp.banco.slice(0, 3);
      const pendente = { tipo: "r1", ordem: banco };
      const previa = App.preverComposicao(pendente, "n2");
      const antes = registro.chamadas;
      App.prepararLeituraPortao(pendente, banco[banco.length - 1]);
      let g = 0;
      while (App.estado.gateStage !== "reading" && g++ < 400) await espera(5);
      const gateTrecho = App.estado.gateTrecho;
      App.aplicarComposicao(pendente);
      App.abrirProximaRodadaComposicao();
      await espera(80);
      const envs = JSON.parse(localStorage.getItem("pipoca.historias.v1:g2-gate") || "[]").map((e) => e.historia);
      const ultimo = envs[envs.length - 1];
      return { chamadas: registro.chamadas - antes, leuCru: gateTrecho === previa && previa.length > 0, gateTrecho, origem: ultimo ? ultimo.origem : null };
    };
    // (a) cuidador NÃO autorizou (default iaLigada:false), plataforma liberada.
    flags(true); cuidador(false);
    const semCuidador = await rodada();
    // (b) cuidador autorizou, mas o kill-switch da plataforma está ativo.
    cuidador(true); flags(false);
    const comKill = await rodada();
    // (c) os dois ligados ⇒ o realizador volta a ser chamado (comportamento anterior).
    flags(true); cuidador(true);
    const ligada = await rodada();
    localStorage.removeItem("pipoca.admin.flags.v1");
    return { semCuidador, comKill, ligada, textoConsentido: TEXTO_CONSENTIDO };
  });
  assert(gate.semCuidador.chamadas === 0 && gate.semCuidador.leuCru,
    "cuidador NÃO autorizou ⇒ ZERO chamadas ao realizador; a T5 lê o A+ cru (nada da criança sai do aparelho)");
  assert(!!gate.semCuidador.origem && gate.semCuidador.origem.fonte === "fallback-a-mais" && gate.semCuidador.origem.motivo === "ia-desligada",
    "origem salva = fallback-a-mais com motivo 'ia-desligada' (consentimento ≠ falha)");
  assert(gate.comKill.chamadas === 0 && gate.comKill.leuCru && !!gate.comKill.origem && gate.comKill.origem.motivo === "ia-desligada",
    "kill-switch da plataforma ⇒ ZERO chamadas mesmo com o cuidador autorizando (fail-closed)");
  assert(gate.ligada.chamadas === 1 && gate.ligada.gateTrecho === gate.textoConsentido,
    "cuidador + plataforma ligados ⇒ o realizador é chamado 1× e a T5 lê o realizado (comportamento preservado)");
  assert(reqsRealizador.length === 0, "nenhuma requisição a /functions/v1/realizador saiu do navegador (page.on('request'))");

  assert(erros.length === 0, "sem erros de página no fluxo da geração 2 (erros: " + (erros.join(" | ") || "nenhum") + ")");
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) process.exit(1);
