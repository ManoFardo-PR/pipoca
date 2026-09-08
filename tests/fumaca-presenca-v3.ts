/**
 * [fumaca-presenca-v3.ts] — Fumaça de presença da protagonista: para CADA cenário
 *   disponível no manifesto, monta 30 arranjos × 4 níveis × 2 modos pela mecânica
 *   real do A+ v3 e afere a Lei 1 (a protagonista aparece em ≥60% dos slots do miolo).
 *
 * PAPEL: fumaça (offline · régua do centro gravitacional, Oficina A2)
 * POR QUE EXISTE: guarda de qualidade autoral — garante que TODO grafo publicado
 *   (disponivel:true em docs/cenarios.index.json) mantém a protagonista presente
 *   no miolo em toda combinação, além de montagem não-vazia, sem "undefined" e
 *   replay determinístico.
 * ENTRA: docs/cenarios.index.json + cada grafo com disponivel:true; nenhuma env,
 *   nenhuma rede.
 * SAI: resumo no console (cenários, histórias, pior presença, falhas) +
 *   process.exit(1) se alguma história ficar abaixo do limiar de 60% (ou se o
 *   manifesto não tiver NENHUM cenário disponível — a régua nunca some em silêncio).
 * CHAMA: src/core/composicao.js:{iniciar, ordenarR1, abrirProximaRodada, inserir,
 *   montar} — o Motor A+ v3, chamado como funções puras.
 * É CHAMADO POR: scripts npm `test:presenca` e `test` (package.json); é um
 *   entrypoint (nenhum módulo o importa).
 * RODA POR: `bun run test:presenca` (também em `bun run test`)
 * CUIDADO: lê os grafos PUBLICADOS pelo manifesto — regenerar um grafo pode
 *   derrubar a régua de 60%; TERMOS_CORPO é a definição compartilhada de
 *   "presença" e o NOME vem de cenario.personagem de cada grafo. Sem rede, sem chave.
 *
 * — detalhe preservado —
 * Pipoca — Fumaça de presença da protagonista (Oficina A2 · centro gravitacional)
 * -------------------------------------------------------------------------------
 * Para cada cenário disponível, monta 30 arranjos × 4 níveis × 2 modos pela
 * MECÂNICA REAL (iniciar → ordenarR1 → abrirProximaRodada → inserir) e verifica,
 * por história montada:
 *   1. montagem não-vazia e sem "undefined";
 *   2. replay determinístico (montar() === montar());
 *   3. Lei 1 (régua do centro gravitacional): a protagonista (nome ou corpo)
 *      aparece em pelo menos 60% dos slots do miolo — contagem simples por
 *      lista de termos, beat identificado pela variante presente no texto.
 * Execute com: bun run tests/fumaca-presenca-v3.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  iniciar,
  ordenarR1,
  abrirProximaRodada,
  inserir,
  montar,
  type CenarioV2,
  type EstadoComp,
  type NivelKey,
} from "../src/core/composicao.js";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];
const LIMIAR = 0.6;
const ARRANJOS = 30;

// Termos de CORPO que contam como presença da protagonista (compartilhados por
// todos os cenários); o NOME entra por cenário, derivado de cenario.personagem.
const TERMOS_CORPO = new Set([
  "ela", "dela", "nela",
  "pé", "pés", "mão", "mãos", "palma", "dedo", "dedos",
  "olho", "olhos", "olhar", "peito", "cabelo", "cabelos",
  "rosto", "queixo", "respiração", "pele",
  "braço", "braços", "ombro", "ombros", "pescoço", "nuca", "coração",
]);

/** TERMOS do cenário: corpo compartilhado + palavras do nome ("a Joana" → "joana"). */
function termosDe(cenario: CenarioV2): Set<string> {
  const termos = new Set(TERMOS_CORPO);
  const nome = String((cenario as { personagem?: unknown }).personagem ?? "");
  for (const p of nome.toLowerCase().split(/[^\p{L}-]+/u)) {
    if (p.length > 2) termos.add(p); // artigos ("a", "o") ficam de fora
  }
  return termos;
}

function temProtagonista(texto: string, termos: Set<string>): boolean {
  const palavras = texto.toLowerCase().split(/[^\p{L}-]+/u);
  return palavras.some((p) => termos.has(p));
}

/** Todas as variantes de texto que a célula pode contribuir no nível (conta + temperos). */
function candidatosDe(cenario: CenarioV2, objetoId: string, nivel: NivelKey): string[] {
  const obj = cenario.objetos[objetoId];
  if (!obj) return [];
  const sacos: unknown[] = [obj.conta?.[nivel]];
  for (const t of obj.tempera ?? []) sacos.push(t.entao?.[nivel]);
  const out: string[] = [];
  for (const s of sacos) {
    if (typeof s === "string") out.push(s);
    else if (Array.isArray(s)) for (const v of s) if (typeof v === "string") out.push(v);
  }
  return out;
}

/** O beat pode entrar rebaixado (minúscula pós-conectivo) — testa as duas formas. */
function beatNaHistoria(historia: string, candidato: string): boolean {
  if (historia.includes(candidato)) return true;
  const rebaixado = candidato.charAt(0).toLowerCase() + candidato.slice(1);
  return historia.includes(rebaixado);
}

/** Permutações de `escolhe` elementos entre os revelados na R1 (ex.: 4P3 = 24). */
function permutacoesR1(ids: string[], escolhe: number): string[][] {
  const out: string[][] = [];
  const rec = (atual: string[]) => {
    if (atual.length === escolhe) { out.push(atual.slice()); return; }
    for (const id of ids) if (!atual.includes(id)) { atual.push(id); rec(atual); atual.pop(); }
  };
  rec([]);
  return out;
}

interface EntradaManifesto { id: string; grafo: string | null; disponivel?: boolean }
const manifesto = JSON.parse(
  readFileSync(join(RAIZ, "docs", "cenarios.index.json"), "utf8"),
) as { cenarios: EntradaManifesto[] };
const ativos = (manifesto.cenarios ?? []).filter(
  (c) => c && c.disponivel === true && typeof c.grafo === "string",
);
if (ativos.length === 0) {
  console.error("✗ manifesto sem NENHUM cenário disponível — a régua de presença não pode rodar");
  process.exit(1);
}

let falhas = 0;
let historias = 0;
let piorPresenca = 1;

for (const entrada of ativos) {
  const bruto = JSON.parse(readFileSync(join(RAIZ, entrada.grafo as string), "utf8"));
  const cenario = bruto.cenario as CenarioV2;
  const termos = termosDe(cenario);
  const rodada1 = cenario.rodadas.find((r) => r.n === 1);
  const perms = permutacoesR1(rodada1?.revela ?? [], rodada1?.escolhe ?? 3);
  const linhaEsperada = cenario.rodadas.reduce((s, r) => s + (r.escolhe ?? 0), 0);
  const rotulo = entrada.id;

  for (let i = 0; i < ARRANJOS; i++) {
    const ordem = perms[i % perms.length];
    for (const modo of ["convergente", "aberto"] as const) {
      // Mecânica real: R1 ordena; R2.. inserem no miolo em posição variada.
      let est: EstadoComp = iniciar(cenario, { desfecho: modo });
      est = ordenarR1(est, ordem);
      for (let r = 2; r <= cenario.rodadas.length; r++) {
        est = abrirProximaRodada(est);
        const obj = est.banco[0];
        if (!obj) continue;
        const slots = Math.max(1, est.linha.length - 1);
        const slot = 1 + ((i + r) % slots);
        const antes = est.linha.length;
        est = inserir(est, obj, slot);
        if (est.linha.length === antes) est = inserir(est, obj, 1);
      }
      if (est.linha.length !== linhaEsperada) {
        console.error(`  ✗ ${rotulo} · arranjo ${i} (${modo}): linha final com ${est.linha.length} objetos (esperado ${linhaEsperada})`);
        falhas++;
        continue;
      }

      for (const nivel of NIVEIS) {
        historias++;
        const txt = montar(est, nivel);
        if (!txt) { console.error(`  ✗ ${rotulo} · arranjo ${i} (${modo}, ${nivel}): montagem vazia`); falhas++; continue; }
        if (txt.includes("undefined")) { console.error(`  ✗ ${rotulo} · arranjo ${i} (${modo}, ${nivel}): "undefined" na montagem`); falhas++; continue; }
        if (montar(est, nivel) !== txt) { console.error(`  ✗ ${rotulo} · arranjo ${i} (${modo}, ${nivel}): replay quebrado`); falhas++; continue; }

        // Presença da protagonista por slot do miolo.
        let comEla = 0;
        let semBeat = 0;
        for (const objetoId of est.linha) {
          const presentes = candidatosDe(cenario, objetoId, nivel).filter((c) => beatNaHistoria(txt, c));
          if (presentes.length === 0) { semBeat++; continue; }
          if (presentes.some((c) => temProtagonista(c, termos))) comEla++;
        }
        if (semBeat > 0) {
          console.error(`  ✗ ${rotulo} · arranjo ${i} (${modo}, ${nivel}): ${semBeat} beat(s) não identificados no texto`);
          falhas++;
          continue;
        }
        const presenca = comEla / est.linha.length;
        if (presenca < piorPresenca) piorPresenca = presenca;
        if (presenca < LIMIAR) {
          console.error(
            `  ✗ ${rotulo} · arranjo ${i} (${modo}, ${nivel}): protagonista em ${comEla}/${est.linha.length} slots ` +
            `(${Math.round(presenca * 100)}% < ${LIMIAR * 100}%) · linha=[${est.linha.join(",")}]`
          );
          falhas++;
        }
      }
    }
  }
}

console.log(
  `\nFumaça de presença: ${historias} histórias (${ativos.length} cenário(s) × ${ARRANJOS} arranjos × 2 modos × ${NIVEIS.length} níveis) · ` +
  `pior presença: ${Math.round(piorPresenca * 100)}% · falhas: ${falhas}`
);
if (falhas > 0) {
  console.error("FALHOU");
  process.exit(1);
}
console.log("OK");
