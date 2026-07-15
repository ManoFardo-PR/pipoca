/**
 * [fumaca-presenca-v3.ts] — Fumaça de presença da protagonista: monta 30 arranjos
 *   × 4 níveis × 2 modos pela mecânica real do A+ v3 e afere a Lei 1 (a
 *   protagonista aparece em ≥60% dos slots do miolo).
 *
 * PAPEL: fumaça (offline · régua do centro gravitacional, Oficina A2)
 * POR QUE EXISTE: guarda de qualidade autoral — garante que o grafo publicado
 *   (docs/quintal.v3.json) mantém a protagonista presente no miolo em toda
 *   combinação, além de montagem não-vazia, sem "undefined" e replay determinístico.
 * ENTRA: docs/quintal.v3.json (grafo ativo); nenhuma env, nenhuma rede.
 * SAI: resumo no console (histórias, pior presença, falhas) + process.exit(1) se
 *   alguma história ficar abaixo do limiar de 60%.
 * CHAMA: src/core/composicao.js:{iniciar, ordenarR1, abrirProximaRodada, inserir,
 *   montar} — o Motor A+ v3, chamado como funções puras.
 * É CHAMADO POR: scripts npm `test:presenca` e `test` (package.json); é um
 *   entrypoint (nenhum módulo o importa).
 * RODA POR: `bun run test:presenca` (também em `bun run test`)
 * CUIDADO: lê o grafo PUBLICADO (docs/quintal.v3.json) — regenerar o grafo pode
 *   derrubar a régua de 60%; a lista TERMOS (nome/corpo) é a definição de
 *   "presença" e precisa acompanhar o vocabulário do grafo. Sem rede, sem chave.
 *
 * — detalhe preservado —
 * Pipoca — Fumaça de presença da protagonista (Oficina A2 · centro gravitacional)
 * -------------------------------------------------------------------------------
 * Monta 30 arranjos × 4 níveis × 2 modos pela MECÂNICA REAL (iniciar → ordenarR1
 * → abrirProximaRodada → inserir) sobre o grafo ativo (docs/quintal.v3.json) e
 * verifica, por história montada:
 *   1. montagem não-vazia e sem "undefined";
 *   2. replay determinístico (montar() === montar());
 *   3. Lei 1 (régua do centro gravitacional): a protagonista (nome ou corpo)
 *      aparece em pelo menos 60% dos slots do miolo — contagem simples por
 *      lista de termos, beat identificado pela variante presente no texto.
 * Execute com: bun run tests/fumaca-presenca-v3.ts
 */

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
import quintalRaw from "../docs/quintal.v3.json" with { type: "json" };

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];
const LIMIAR = 0.6;

// Termos que contam como presença da protagonista (nome, pronome ou corpo).
const TERMOS = new Set([
  "joana", "ela", "dela", "nela",
  "pé", "pés", "mão", "mãos", "palma", "dedo", "dedos",
  "olho", "olhos", "olhar", "peito", "cabelo", "cabelos",
  "rosto", "queixo", "respiração", "pele",
  "braço", "braços", "ombro", "ombros", "pescoço", "nuca", "coração",
]);

function temProtagonista(texto: string): boolean {
  const palavras = texto.toLowerCase().split(/[^\p{L}-]+/u);
  return palavras.some((p) => TERMOS.has(p));
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

/** Permutações de 3 elementos escolhidos entre os 4 revelados na R1 (4P3 = 24). */
function permutacoesR1(ids: string[], escolhe: number): string[][] {
  const out: string[][] = [];
  const rec = (atual: string[]) => {
    if (atual.length === escolhe) { out.push(atual.slice()); return; }
    for (const id of ids) if (!atual.includes(id)) { atual.push(id); rec(atual); atual.pop(); }
  };
  rec([]);
  return out;
}

const cenario = quintalRaw.cenario as unknown as CenarioV2;
const rodada1 = cenario.rodadas.find((r) => r.n === 1);
const perms = permutacoesR1(rodada1?.revela ?? [], rodada1?.escolhe ?? 3);

const ARRANJOS = 30;
let falhas = 0;
let historias = 0;
let piorPresenca = 1;

for (let i = 0; i < ARRANJOS; i++) {
  const ordem = perms[i % perms.length];
  for (const modo of ["convergente", "aberto"] as const) {
    // Mecânica real: R1 ordena; R2..R4 inserem no miolo em posição variada.
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
    if (est.linha.length !== 6) {
      console.error(`  ✗ arranjo ${i} (${modo}): linha final com ${est.linha.length} objetos (esperado 6)`);
      falhas++;
      continue;
    }

    for (const nivel of NIVEIS) {
      historias++;
      const txt = montar(est, nivel);
      if (!txt) { console.error(`  ✗ arranjo ${i} (${modo}, ${nivel}): montagem vazia`); falhas++; continue; }
      if (txt.includes("undefined")) { console.error(`  ✗ arranjo ${i} (${modo}, ${nivel}): "undefined" na montagem`); falhas++; continue; }
      if (montar(est, nivel) !== txt) { console.error(`  ✗ arranjo ${i} (${modo}, ${nivel}): replay quebrado`); falhas++; continue; }

      // Presença da protagonista por slot do miolo.
      let comEla = 0;
      let semBeat = 0;
      for (const objetoId of est.linha) {
        const presentes = candidatosDe(cenario, objetoId, nivel).filter((c) => beatNaHistoria(txt, c));
        if (presentes.length === 0) { semBeat++; continue; }
        if (presentes.some(temProtagonista)) comEla++;
      }
      if (semBeat > 0) {
        console.error(`  ✗ arranjo ${i} (${modo}, ${nivel}): ${semBeat} beat(s) não identificados no texto`);
        falhas++;
        continue;
      }
      const presenca = comEla / est.linha.length;
      if (presenca < piorPresenca) piorPresenca = presenca;
      if (presenca < LIMIAR) {
        console.error(
          `  ✗ arranjo ${i} (${modo}, ${nivel}): protagonista em ${comEla}/${est.linha.length} slots ` +
          `(${Math.round(presenca * 100)}% < ${LIMIAR * 100}%) · linha=[${est.linha.join(",")}]`
        );
        falhas++;
      }
    }
  }
}

console.log(
  `\nFumaça de presença: ${historias} histórias (${ARRANJOS} arranjos × 2 modos × ${NIVEIS.length} níveis) · ` +
  `pior presença: ${Math.round(piorPresenca * 100)}% · falhas: ${falhas}`
);
if (falhas > 0) {
  console.error("FALHOU");
  process.exit(1);
}
console.log("OK");
