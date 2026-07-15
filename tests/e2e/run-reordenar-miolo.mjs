/**
 * [run-reordenar-miolo.mjs] — Runner de integração de TELA (sem navegador):
 *   instancia os componentes reais T4/T5 (.dc.html) sobre o seam+motor reais e
 *   prova que reordenar o miolo muda a história lida no portão, com as pontas fixas.
 *
 * PAPEL: e2e (integração de tela · offline, SEM Playwright)
 * POR QUE EXISTE: cobre o CAMINHO DA TELA (rascunho do miolo → prévia → commit)
 *   que antes só existia por raciocínio manual; o motor já tem unit tests — aqui
 *   é a costura T4→T5 rodando sobre o seam real.
 * ENTRA: lê do disco pipoca.bundle.js, src/app/estado.js, src/telas/
 *   Tela4Heroi.dc.html e Tela5Portao.dc.html, docs/quintal.v3.json.
 * SAI: relatório ok/falha no console + process.exit(1) se algum assert falhar.
 * CHAMA: node:fs (readFileSync), node:url, node:path; eval do bundle
 *   (expõe globalThis.PipocaCanonico/PipocaApp) + shims mínimos de
 *   localStorage/fetch/window; dirige App.* e os componentes extraídos dos .dc.html.
 * É CHAMADO POR: script npm `test:e2e:reordenar` (package.json); é um entrypoint.
 * RODA POR: `bun run test:e2e:reordenar`
 * CUIDADO: NÃO usa Playwright (indisponível/offline no ambiente do agente) — roda
 *   os componentes reais das telas via eval do bundle + shims de browser; depende
 *   de pipoca.bundle.js estar BUILDADO (bun run build:app). Sem rede, sem chave.
 *
 * — detalhe preservado —
 * Runner de integração da TELA — "reordenar o meio muda a história lida".
 * ---------------------------------------------------------------------------
 * O motor (compor/podeCompor/montar) já está coberto por unit tests. Este
 * runner cobre o CAMINHO DA TELA, que só existia por raciocínio manual:
 *
 *   T4 (Tela4Heroi) · rascunho local do miolo (mioloDraft/novoId) → escolher a
 *   peça nova, colocar no meio, reordenar com ◀ ▶ → lerEmVozAlta monta um
 *   pendente { tipo:"compor" } + prévia (sem consumir a rodada) →
 *   T5 (Tela5Portao) · _commit aplica de verdade → texto lido.
 *
 * NÃO usa navegador (playwright indisponível/offline no ambiente do agente).
 * Em vez disso instancia os COMPONENTES REAIS das telas (o <script> dentro dos
 * .dc.html) sobre uma base DCLogic mínima e os liga ao seam REAL (src/app/
 * estado.js) + motor REAL (pipoca.bundle.js). Assim exercita a mesma lógica de
 * rascunho/prévia/commit que a criança dispara na UI.
 *
 * Verifica:
 *  (1) chega à Rodada 2, escolhe a peça nova, coloca no meio e reordena o miolo;
 *  (2) reordenar o miolo MUDA o texto lido no portão (prévia reflete a ordem);
 *  (3) as pontas (1ª/última) permanecem fixas — nunca entram no miolo — e a tela
 *      as marca como âncora (selo "🔒 âncora" no template, travada=true no render);
 *  (4) voltar de T5 sem ler NÃO perde a peça nova nem a reordenação (nada é
 *      aplicado antes de ler);
 *  (5) ao ler no portão, o commit aplica a ordem final e o texto tecido do estado
 *      passa a ser exatamente o que foi lido.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lerRaiz = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

let passou = 0, falhou = 0;
const assert = (cond, msg) => {
  if (cond) { console.log(`  ✓ ${msg}`); passou++; }
  else { console.error(`  ✗ ${msg}`); falhou++; }
};

// ─── Shims mínimos do "browser" (o seam roda como <script> no index.html) ────
const _ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => { _ls.set(k, String(v)); },
  removeItem: (k) => { _ls.delete(k); },
  clear: () => { _ls.clear(); },
};
// fetch só serve o grafo v3 do disco (estado.js faz fetch("./docs/quintal.v3.json")).
globalThis.fetch = async (url) => {
  const rel = String(url).replace(/^\.\//, "");
  const texto = lerRaiz(rel);
  return { ok: true, status: 200, async json() { return JSON.parse(texto); }, async text() { return texto; } };
};
globalThis.window = globalThis;
globalThis.PipocaRoteador = { irParaTela() {} };
// speechSynthesis/SpeechSynthesisUtterance ausentes de propósito: T5 degrada.

// ─── Carrega o motor real (globalThis.PipocaCanonico) e o seam real (PipocaApp) ─
const evalGlobal = (0, eval);
evalGlobal(lerRaiz("pipoca.bundle.js"));
evalGlobal(lerRaiz("src/app/estado.js"));

const App = globalThis.PipocaApp;
if (!App) { console.error("FATAL: PipocaApp não subiu"); process.exit(1); }

// Espera o grafo v3 (fetch assíncrono no boot do seam) ficar pronto.
await (async () => {
  for (let i = 0; i < 50 && !App.cenarioV2; i++) await new Promise((r) => setTimeout(r, 10));
})();

// ─── Instancia os COMPONENTES REAIS das telas sobre uma DCLogic mínima ───────
class DCLogic {
  setState(patch) { this.state = Object.assign({}, this.state, patch); }
}
function componenteDe(relHtml) {
  const html = lerRaiz(relHtml);
  const abre = html.indexOf(">", html.indexOf("data-dc-script")) + 1;
  const fecha = html.lastIndexOf("</script>");
  const corpo = html.slice(abre, fecha);
  const fab = new Function("DCLogic", "window", "PipocaRoteador", corpo + "\nreturn Component;");
  const Cls = fab(DCLogic, globalThis, globalThis.PipocaRoteador);
  return new Cls();
}

console.log("\n=== Boot do motor + seam (grafo v3 do Quintal) ===");
assert(!!globalThis.PipocaCanonico, "pipoca.bundle.js expôs PipocaCanonico (motor real)");
assert(!!App.cenarioV2 && App.cenarioV2.id === "quintal_anoitecer", "grafo v3 do Quintal carregado pelo seam");

// Perfil ativo define o nível tecido (n3 puxa conectivos autorais no miolo).
App.setState({ perfil: { id: "t22", nome: "Teste", idade: 8, nivel: "n3", avatarId: "pingo" } });

// ─── Rodada 1 → 2 (pelo seam, como o portão faz após a 1ª leitura) ───────────
App.iniciarComposicao();
const bancoR1 = App.estado.comp.banco.slice(0, 3);
App.ordenarR1Composicao(bancoR1);
const linhaR1 = App.estado.comp.linha.slice();
App.abrirProximaRodadaComposicao(); // revela +1 → Rodada 2

console.log("\n=== Rodada 2: a tela T4 monta o rascunho do miolo ===");
assert(App.estado.comp.rodada === 2, "seam avançou para a Rodada 2");
const ancoraIni = linhaR1[0];
const ancoraFim = linhaR1[linhaR1.length - 1];

const t4 = componenteDe("src/telas/Tela4Heroi.dc.html");
t4.componentDidMount(); // dispara _sync → mioloDraft = interior da linha, novoId=null
const mioloInicial = App.estado.comp.linha.slice(1, App.estado.comp.linha.length - 1);
assert(
  JSON.stringify(t4.state.mioloDraft) === JSON.stringify(mioloInicial) && t4.state.novoId === null,
  "T4 inicia o rascunho do miolo a partir do interior da linha (novoId=null)"
);

// A criança escolhe a peça nova (banco[0]) e coloca no início do miolo.
const novo = App.estado.comp.banco[0];
t4._selecionarObj(novo);
assert(t4.state.selObj === novo, "T4: peça nova selecionada no banco");
t4._colocarNoMiolo(0);
assert(
  t4.state.novoId === novo && t4.state.mioloDraft[0] === novo,
  "T4: peça nova colocada no meio (entra no rascunho, vira reordenável)"
);

// ── (A) Prévia com a ORDEM 1 ──────────────────────────────────────────────
t4.lerEmVozAlta(); // monta gatePendente + prévia (sem consumir a rodada) e vai p/ T5
const ordemA = t4.state.mioloDraft.slice();
const pendA = App.estado.gatePendente;
const textoA = App.estado.gateTrecho;
assert(!!pendA && pendA.tipo === "compor", "T4: lerEmVozAlta monta um pendente { tipo:'compor' }");
assert(
  JSON.stringify(pendA.ordemMiolo) === JSON.stringify(ordemA) && pendA.objetoId === novo,
  "o pendente carrega a ORDEM do miolo do rascunho (não a linha antiga)"
);
assert(typeof textoA === "string" && textoA.length > 0 && !textoA.includes("undefined"),
  "prévia (ordem 1) tece texto real, sem undefined");
assert(App.estado.tela === 5, "T4 encaminha para o portão (T5)");

// As pontas NUNCA entram no miolo (âncoras travadas).
assert(
  !pendA.ordemMiolo.includes(ancoraIni) && !pendA.ordemMiolo.includes(ancoraFim),
  "as pontas (âncoras) nunca entram na ordem do miolo"
);

// ── (B) Voltar de T5 SEM ler não pode perder peça nova nem reordenação ──────
const compAntesVoltar = JSON.stringify(App.estado.comp.linha);
const t5 = componenteDe("src/telas/Tela5Portao.dc.html");
t5.voltarCena(); // descarta o pendente, volta pra T4 — nada aplicado
assert(App.estado.gatePendente === null && App.estado.tela === 4, "voltar de T5 descarta o pendente e volta à T4");
assert(JSON.stringify(App.estado.comp.linha) === compAntesVoltar, "voltar sem ler NÃO consome a rodada (linha intacta)");
assert(
  t4.state.novoId === novo && JSON.stringify(t4.state.mioloDraft) === JSON.stringify(ordemA),
  "voltar sem ler PRESERVA a peça nova e a ordem no rascunho da tela"
);

// ── (C) Reordena o miolo com ◀ ▶ e lê de novo → texto tem que mudar ─────────
t4._moverMiolo(novo, +1); // move a peça nova uma casa à frente (▶)
const ordemB = t4.state.mioloDraft.slice();
assert(JSON.stringify(ordemB) !== JSON.stringify(ordemA), "◀ ▶ reordenou o miolo (nova ordem de trabalho)");
t4.lerEmVozAlta();
const pendB = App.estado.gatePendente;
const textoB = App.estado.gateTrecho;
assert(JSON.stringify(pendB.ordemMiolo) === JSON.stringify(ordemB), "o novo pendente reflete a ordem reordenada");
assert(textoB !== textoA, "reordenar o miolo MUDA o texto lido no portão (prévia reflete a ordem final)");
assert(!textoB.includes("undefined"), "prévia (ordem 2) tece texto real, sem undefined");

// ── (D) As pontas continuam fixas e a TELA as marca como âncora ─────────────
console.log("\n=== Pontas fixas + selo 🔒 âncora ===");
const html4 = lerRaiz("src/telas/Tela4Heroi.dc.html");
assert(/🔒 âncora/.test(html4), "template da T4 tem o selo '🔒 âncora'");
assert(
  /value="\{\{ cell\.travada \}\}"[\s\S]*?🔒 âncora/.test(html4),
  "o selo '🔒 âncora' só aparece quando a célula é travada (âncora)"
);
const cells = t4.renderVals().linhaCells;
const prim = cells[0], ult = cells[cells.length - 1];
assert(prim.travada === true && ult.travada === true, "renderVals marca a 1ª e a última célula como travadas (âncora)");
assert(prim.editavel !== true && ult.editavel !== true, "as pontas não expõem controles de mover (◀ ▶)");
assert(prim.emoji === App.objetoMetaV2(ancoraIni).emoji && ult.emoji === App.objetoMetaV2(ancoraFim).emoji,
  "as pontas renderizadas são as mesmas âncoras do início da história");
const celulaNova = cells.find((c) => c.editavel === true && c.podeTirar === true);
assert(!!celulaNova && typeof celulaNova.mover_esq === "function" && typeof celulaNova.mover_dir === "function",
  "a peça nova do miolo expõe os controles ◀ ▶ (reordenável)");

// ── (E) Ler no portão aplica a ordem final: o texto do estado = o texto lido ─
console.log("\n=== Commit no portão: o estado passa a tecer a ordem lida ===");
const t5b = componenteDe("src/telas/Tela5Portao.dc.html");
t5b._commit(); // aplica o pendente (compor) + abre a próxima rodada + credita
const linhaFinal = App.estado.comp.linha;
assert(
  linhaFinal[0] === ancoraIni && linhaFinal[linhaFinal.length - 1] === ancoraFim,
  "após o commit, as pontas seguem sendo as âncoras (nunca se moveram)"
);
const mioloFinal = linhaFinal.slice(1, linhaFinal.length - 1);
assert(JSON.stringify(mioloFinal) === JSON.stringify(ordemB), "o miolo aplicado é exatamente a ordem final reordenada na tela");
assert(App.montarComposicao("n3") === textoB, "o texto tecido do estado após o commit é EXATAMENTE o que a criança leu (ordem B)");
assert(App.estado.gatePendente === null && App.estado.tela === 6, "o portão avança (T6) e limpa o pendente após ler");

// ─── Resultado ───────────────────────────────────────────────────────────────
console.log(`\n${falhou === 0 ? "✅" : "❌"} reordenar-miolo: ${passou} ok, ${falhou} falha(s)`);
process.exit(falhou === 0 ? 0 : 1);
