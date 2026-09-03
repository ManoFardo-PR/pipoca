/**
 * [paridade-edge.mjs] — Verificador de PARIDADE cliente↔edge (Plan03 · E2, DM-D):
 *   as edges são self-contained por decisão (espelham tabelas do src/); este
 *   script compara os literais espelhados e FALHA (exit 1) se divergirem —
 *   fim da deriva silenciosa (o MODELO_PADRAO já divergiu uma vez, PS-12).
 *
 * PAPEL: ferramenta de processo (roda no CI — D8: `npm run check:paridade`)
 * ENTRA: nada (lê os arquivos do repo).
 * SAI: tabela OK/DIVERGE por item; exit 1 em qualquer divergência.
 * CHAMA: node:fs (leitura); extração por texto (initializer balanceado após o
 *   `=`), normalizada (sem comentários/espaços/anotações) — robusta a
 *   formatação, sem executar código das edges.
 * RODA POR: `npm run check:paridade` (CI) e à mão.
 * CUIDADO: ao criar uma NOVA tabela espelhada, registre o par AQUI — o script
 *   só protege o que conhece. Renomeou uma constante? Atualize o par.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ler = (rel) => readFileSync(path.join(RAIZ, rel), "utf8");

/** Extrai o INITIALIZER de `const NOME (: tipo)? = <init>;` balanceando (), {} e []. */
function initializerDe(codigo, nome, arquivo) {
  const re = new RegExp(`(?:export\\s+)?const\\s+${nome}\\b[^=]*=`, "m");
  const m = re.exec(codigo);
  if (!m) throw new Error(`constante ${nome} não encontrada em ${arquivo}`);
  let i = m.index + m[0].length;
  let fim = i;
  let prof = 0;
  let emStr = null; // caractere de aspas quando dentro de string
  for (; fim < codigo.length; fim++) {
    const ch = codigo[fim];
    const antes = codigo[fim - 1];
    if (emStr) {
      if (ch === emStr && antes !== "\\") emStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { emStr = ch; continue; }
    if (ch === "/" && codigo[fim + 1] === "/") { // comentário de linha
      while (fim < codigo.length && codigo[fim] !== "\n") fim++;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") prof++;
    if (ch === ")" || ch === "}" || ch === "]") prof--;
    if (ch === ";" && prof <= 0) break;
    if (ch === "/" && prof === 0 && emStr === null && codigo.slice(m.index + m[0].length, fim).trim() === "" ) {
      // regex literal como initializer (ex.: /https?:\/\//i): consome até a barra de fechamento
      fim++;
      while (fim < codigo.length && !(codigo[fim] === "/" && codigo[fim - 1] !== "\\")) fim++;
      while (fim + 1 < codigo.length && /[a-z]/i.test(codigo[fim + 1])) fim++; // flags
      fim++;
      break;
    }
  }
  return codigo.slice(i, fim);
}

/** Normaliza um initializer para comparação: sem comentários, espaços e ruído de tipo. */
function normalizar(init) {
  return init
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, "")
    .replace(/asconst/g, "")
    .replace(/,\}/g, "}")
    .replace(/,\]/g, "]");
}

/** Para RegExp montada por concatenação de strings: só o PADRÃO resultante. */
function padraoDeRegexp(init) {
  const partes = [...init.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  if (partes.length) return partes.join("");
  return normalizar(init); // literal /.../: compara o texto normalizado
}

/** Extrai o corpo de uma FUNÇÃO nomeada (paridade intra-src da gramática). */
function corpoDeFuncao(codigo, nome, arquivo) {
  const re = new RegExp(`function\\s+${nome}\\s*\\(`, "m");
  const m = re.exec(codigo);
  if (!m) throw new Error(`função ${nome} não encontrada em ${arquivo}`);
  const abre = codigo.indexOf("{", m.index);
  let prof = 0;
  let fim = abre;
  for (; fim < codigo.length; fim++) {
    if (codigo[fim] === "{") prof++;
    if (codigo[fim] === "}") { prof--; if (prof === 0) break; }
  }
  return codigo.slice(abre, fim + 1);
}

// ─── Arquivos ────────────────────────────────────────────────────────────────
const GUARD = ler("src/core/seguranca/guardrails.ts");
const VALID = ler("src/core/realizador/validador.ts");
const PROMPT = ler("src/core/realizador/prompt_template.ts");
const COMPOS = ler("src/core/composicao.ts");
const GRAM = ler("src/core/compositor/gramatica.ts");
const IA_CFG = ler("src/admin/ia_config.ts");
const IA_GLB = ler("src/admin/ia_global.ts");
const ED_PROXY = ler("functions/proxy-ia/index.ts");
const ED_REAL = ler("functions/realizador/index.ts");
const ED_CHAVES = ler("functions/admin-chaves-ia/index.ts");

let falhas = 0;
function comparar(nomeItem, valores) {
  const [base, ...resto] = valores;
  const divergentes = resto.filter(([, v]) => v !== base[1]);
  if (divergentes.length === 0) {
    console.log(`  ✓ ${nomeItem} — ${valores.length} cópias idênticas`);
    return;
  }
  falhas++;
  console.error(`  ✗ ${nomeItem} DIVERGE:`);
  for (const [rotulo, v] of valores) console.error(`      [${rotulo}] ${v.slice(0, 160)}`);
}

console.log("=== Paridade cliente↔edge (E2 · DM-D) ===\n");

// 1 · guardrails — regex de termos + URL/EMAIL/TELEFONE (canônico → 2 edges)
comparar("RE_TERMOS (blocklist infantil)", [
  ["src/core/seguranca", padraoDeRegexp(initializerDe(GUARD, "RE_TERMOS_BLOQUEADOS", "guardrails.ts"))],
  ["edge proxy-ia", padraoDeRegexp(initializerDe(ED_PROXY, "RE_TERMOS", "proxy-ia"))],
  ["edge realizador", padraoDeRegexp(initializerDe(ED_REAL, "RE_TERMOS", "realizador"))],
]);
for (const nome of ["RE_URL", "RE_EMAIL", "RE_TELEFONE"]) {
  comparar(nome, [
    ["src/core/seguranca", normalizar(initializerDe(GUARD, nome, "guardrails.ts"))],
    ["edge proxy-ia", normalizar(initializerDe(ED_PROXY, nome, "proxy-ia"))],
    ["edge realizador", normalizar(initializerDe(ED_REAL, nome, "realizador"))],
  ]);
}

// 2 · tabelas do validador/prompt (canônico src → edge realizador)
const paresValidador = [
  ["MAXIMO_PALAVRAS", PROMPT, "prompt_template.ts"],
  ["TETO_CRESCIMENTO", VALID, "validador.ts"],
  ["LIMIAR_PONTOS_FINAIS_N1", VALID, "validador.ts"],
  ["LIMIAR_MEDIA_FRASES_POR_BEAT_N1", VALID, "validador.ts"],
  ["LIMIAR_MARCAS_PRETERITO", VALID, "validador.ts"],
  ["SUFIXOS_PRETERITO", VALID, "validador.ts"],
  ["PRESENTES_EM_OU", VALID, "validador.ts"],
  ["ANCORAS_POR_OBJETO", VALID, "validador.ts"],
  ["TERMOS_CORPO", VALID, "validador.ts"],
  ["ADJ_F", VALID, "validador.ts"],
  ["ADJ_M", VALID, "validador.ts"],
];
for (const [nome, codigoSrc, rotuloSrc] of paresValidador) {
  comparar(nome, [
    [rotuloSrc, normalizar(initializerDe(codigoSrc, nome, rotuloSrc))],
    ["edge realizador", normalizar(initializerDe(ED_REAL, nome, "realizador"))],
  ]);
}

// 3 · SECRET_POR_PROVEDOR — só nas edges (3 cópias entre si)
comparar("SECRET_POR_PROVEDOR", [
  ["edge admin-chaves-ia", normalizar(initializerDe(ED_CHAVES, "SECRET_POR_PROVEDOR", "admin-chaves-ia"))],
  ["edge proxy-ia", normalizar(initializerDe(ED_PROXY, "SECRET_POR_PROVEDOR", "proxy-ia"))],
  ["edge realizador", normalizar(initializerDe(ED_REAL, "SECRET_POR_PROVEDOR", "realizador"))],
]);

// 4 · PROVEDORES — admin (2× src) × edge admin-chaves-ia
comparar("PROVEDORES", [
  ["src/admin/ia_config", normalizar(initializerDe(IA_CFG, "PROVEDORES", "ia_config.ts"))],
  ["src/admin/ia_global", normalizar(initializerDe(IA_GLB, "PROVEDORES", "ia_global.ts"))],
  ["edge admin-chaves-ia", normalizar(initializerDe(ED_CHAVES, "PROVEDORES", "admin-chaves-ia"))],
]);

// 5 · gramática de condições — intra-src (v3 intocável × compositor espelhado)
comparar("avaliarCondicao (gramática v3 × compositor)", [
  ["src/core/composicao.ts", normalizar(corpoDeFuncao(COMPOS, "avaliarCondicao", "composicao.ts"))],
  ["src/core/compositor/gramatica.ts", normalizar(corpoDeFuncao(GRAM, "avaliarCondicao", "gramatica.ts"))],
]);

console.log("");
if (falhas > 0) {
  console.error(`PARIDADE QUEBRADA: ${falhas} item(ns) divergem — alinhe o espelho e redeploye a edge (E3).`);
  process.exit(1);
}
console.log("Paridade OK: todos os espelhos batem com o canônico.");
