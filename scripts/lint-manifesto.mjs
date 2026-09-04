/**
 * [lint-manifesto.mjs] — Lint do PIPELINE DE AUTORIA (Plan03 · E6): valida o
 *   manifesto de cenários e roda os lints de conteúdo (grafo + fichas) em TODOS
 *   os cenários disponíveis, com as âncoras do validador conferidas por objeto.
 *
 * PAPEL: ferramenta de processo (gate de conteúdo · roda no CI via lint:conteudo)
 * POR QUE EXISTE: "adicionar um cenário" precisa ser verificado por máquina —
 *   manifesto apontando para arquivo inexistente, id duplicado, ficha sem nível,
 *   objeto sem âncora no validador: tudo isso deve falhar ANTES do merge.
 * ENTRA: docs/cenarios.index.json (ou um caminho alternativo via argv[2], usado
 *   pelo teste de sabotagem do E6) + os arquivos que ele aponta + os catálogos
 *   globais docs/fichas/{objetos,cenarios}.v1.json.
 * SAI: relatório no console; exit 1 se houver ERRO (avisos não bloqueiam).
 * CHAMA: src/core/lint_grafo.ts:lintGrafoV3, src/core/fichas/lint_fichas.ts:lintFichas,
 *   src/core/realizador/validador.ts:ANCORAS_POR_OBJETO, src/core/cenas.ts:galeriaCenas.
 * É CHAMADO POR: `npm run lint:conteudo` (package.json) e o CI (D8/E6).
 * RODA POR: `bun run scripts/lint-manifesto.mjs` (BUN — importa .ts do core).
 * CUIDADO: cenário `disponivel:false` só passa pelas checagens estruturais do
 *   manifesto (grafo/relacoes null são legítimos); objeto do grafo SEM âncora em
 *   ANCORAS_POR_OBJETO é ERRO — e âncora nova exige espelhar na edge (E2 acusa).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { lintGrafoV3 } from "../src/core/lint_grafo.ts";
import { lintFichas } from "../src/core/fichas/lint_fichas.ts";
import { ANCORAS_POR_OBJETO } from "../src/core/realizador/validador.ts";
import { galeriaCenas } from "../src/core/cenas.ts";

const RAIZ = path.resolve(path.join(import.meta.dirname, ".."));
const CAMINHO_MANIFESTO = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(RAIZ, "docs", "cenarios.index.json");
const ESQUEMA_MANIFESTO = "pipoca.cenarios-index.v1";
const ESQUEMA_GRAFO_V3 = "pipoca.grafo-autoral.v3";

const erros = [];
const avisos = [];
const lerJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));
// Caminhos do manifesto são relativos à raiz servida ("./docs/…").
const resolver = (rel) => path.join(RAIZ, String(rel).replace(/^\.\//, ""));

// ── 1 · Manifesto: esquema, ids únicos, campos, arquivos existem ─────────────
let manifesto = null;
try {
  manifesto = lerJson(CAMINHO_MANIFESTO);
} catch (e) {
  console.error(`✗ manifesto ilegível (${CAMINHO_MANIFESTO}): ${e.message}`);
  process.exit(1);
}
if (manifesto.esquema !== ESQUEMA_MANIFESTO) {
  erros.push(`manifesto: esquema "${manifesto.esquema}" ≠ ${ESQUEMA_MANIFESTO}`);
}
const cenarios = Array.isArray(manifesto.cenarios) ? manifesto.cenarios : [];
if (!Array.isArray(manifesto.cenarios) || cenarios.length === 0) {
  erros.push("manifesto: lista `cenarios` ausente ou vazia");
}
const svgsValidos = new Set(galeriaCenas().map((c) => c.key));
const idsVistos = new Set();
for (const c of cenarios) {
  const rot = `manifesto[${c && c.id ? c.id : "?"}]`;
  if (!c || typeof c !== "object") { erros.push(`${rot}: entrada malformada`); continue; }
  for (const campo of ["id", "nome", "descricao", "svg"]) {
    if (typeof c[campo] !== "string" || !c[campo].trim()) erros.push(`${rot}: campo \`${campo}\` ausente ou vazio`);
  }
  if (typeof c.disponivel !== "boolean") erros.push(`${rot}: \`disponivel\` deve ser boolean`);
  if (idsVistos.has(c.id)) erros.push(`${rot}: id DUPLICADO no manifesto`);
  idsVistos.add(c.id);
  if (c.svg && !svgsValidos.has(c.svg)) {
    erros.push(`${rot}: svg "${c.svg}" não existe em Canon.cenas (galeriaCenas)`);
  }
  if (c.disponivel === true) {
    for (const campo of ["grafo", "relacoes"]) {
      if (typeof c[campo] !== "string" || !c[campo].trim()) {
        erros.push(`${rot}: disponível mas \`${campo}\` é null/vazio`);
      } else if (!existsSync(resolver(c[campo]))) {
        erros.push(`${rot}: \`${campo}\` aponta para arquivo INEXISTENTE (${c[campo]})`);
      }
    }
  }
}

// ── 2 · Catálogos globais (uma vez) ──────────────────────────────────────────
let objetosRaw = null, cenariosRaw = null;
try { objetosRaw = lerJson(path.join(RAIZ, "docs", "fichas", "objetos.v1.json")); }
catch (e) { erros.push(`docs/fichas/objetos.v1.json ilegível: ${e.message}`); }
try { cenariosRaw = lerJson(path.join(RAIZ, "docs", "fichas", "cenarios.v1.json")); }
catch (e) { erros.push(`docs/fichas/cenarios.v1.json ilegível: ${e.message}`); }

// ── 3 · Por cenário DISPONÍVEL: grafo (lint v3) + fichas + âncoras ───────────
const disponiveis = cenarios.filter((c) => c && c.disponivel === true && typeof c.grafo === "string" && existsSync(resolver(c.grafo)));
for (const c of disponiveis) {
  const rot = `cenario ${c.id}`;
  let grafo = null;
  try { grafo = lerJson(resolver(c.grafo)); }
  catch (e) { erros.push(`${rot}: grafo ilegível: ${e.message}`); continue; }
  if (grafo.esquema !== ESQUEMA_GRAFO_V3) erros.push(`${rot}: esquema do grafo "${grafo.esquema}" ≠ ${ESQUEMA_GRAFO_V3}`);
  if (!grafo.cenario || typeof grafo.cenario !== "object") { erros.push(`${rot}: grafo sem \`cenario\``); continue; }
  if (grafo.cenario.id !== c.id) erros.push(`${rot}: id do grafo ("${grafo.cenario.id}") ≠ id do manifesto`);

  const rg = lintGrafoV3(grafo.cenario, grafo.esquema);
  rg.erros.forEach((e) => erros.push(`${rot} · grafo: ${e}`));
  rg.avisos.forEach((a) => avisos.push(`${rot} · grafo: ${a}`));

  // Âncoras do validador: TODO objeto do grafo precisa de ≥1 âncora (repo↔edge, E2).
  for (const objId of Object.keys(grafo.cenario.objetos || {})) {
    const anc = ANCORAS_POR_OBJETO[objId];
    if (!Array.isArray(anc) || anc.length === 0) {
      erros.push(`${rot}: objeto "${objId}" SEM âncora em ANCORAS_POR_OBJETO (validador.ts — espelhar também na edge)`);
    }
  }

  // Fichas: catálogos globais + relações deste cenário.
  if (c.relacoes && existsSync(resolver(c.relacoes)) && objetosRaw && cenariosRaw) {
    let relacoesRaw = null;
    try { relacoesRaw = lerJson(resolver(c.relacoes)); }
    catch (e) { erros.push(`${rot}: relações ilegíveis: ${e.message}`); continue; }
    const rf = lintFichas(objetosRaw, relacoesRaw, cenariosRaw);
    rf.erros.forEach((e) => erros.push(`${rot} · fichas: ${e}`));
    rf.avisos.forEach((a) => avisos.push(`${rot} · fichas: ${a}`));
    if (relacoesRaw && relacoesRaw.cenario !== c.id) {
      erros.push(`${rot}: \`cenario\` das relações ("${relacoesRaw.cenario}") ≠ id do manifesto`);
    }
  }
}

// ── Relatório ────────────────────────────────────────────────────────────────
console.log(`lint-manifesto: ${cenarios.length} cenário(s) no manifesto · ${disponiveis.length} disponível(is) lintado(s)`);
for (const a of avisos) console.log(`  ⚠ ${a}`);
if (erros.length) {
  for (const e of erros) console.error(`  ✗ ${e}`);
  console.error(`\n✗ lint-manifesto: ${erros.length} erro(s) — corrija antes do merge.`);
  process.exit(1);
}
console.log(`✓ lint-manifesto: 0 erros (${avisos.length} aviso(s) — exigem olhar humano, não bloqueiam)`);
