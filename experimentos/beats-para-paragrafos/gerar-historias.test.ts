/**
 * Experimento B1.5 — testes do Script 1 (gerador), sem rede.
 * Formato dos demais testes do repo: assert local + throw no fim.
 * RODA POR: bun run experimentos/beats-para-paragrafos/gerar-historias.test.ts (rodado à mão — fora de `bun run test`)
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import quintalRaw from "../../docs/quintal.v3.json" with { type: "json" };
import type { CenarioV2, NivelKey } from "../../src/core/composicao.js";
import { criarRng } from "./rng.js";
import { montarMatriz } from "./matriz-amostragem.js";
import { gerarPartida, gerarTestemunha } from "./linha-aleatoria.js";
import { limparTextoComGemini, type Transporte } from "./gemini-cliente.js";
import {
  resolverCaminhos,
  garantirDiretorios,
  escreverMeta,
  escreverHistoriasBase,
  escreverRespostasLLM,
  escreverMonitoramentoLote,
  atualizarConsolidado,
} from "./persistencia.js";
import type { HistoriaBase } from "./tipos.js";

let passou = 0;
let falhou = 0;
function assert(condicao: boolean, mensagem: string): void {
  if (condicao) {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  } else {
    console.error(`  ✗ ${mensagem}`);
    falhou++;
  }
}

const cenario = (quintalRaw as unknown as { cenario: CenarioV2 }).cenario;

console.log("\n=== gerarPartida — mecânica real com escolhas aleatórias ===");
{
  const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];
  for (let i = 0; i < 20; i++) {
    const nivel = NIVEIS[i % NIVEIS.length]!;
    const { rng } = criarRng("teste-partida", `p${i}`);
    const snapshots = gerarPartida(cenario, nivel, rng);
    assert(snapshots.length === 4, `partida ${i}: 4 snapshots (rodadas 1..4)`);
    assert(
      snapshots.map((s) => s.objetosDaLinha.length).join(",") === "3,4,5,6",
      `partida ${i}: linha cresce 3→6`
    );
    const pontaInicial = snapshots[0]!.objetosDaLinha[0];
    const pontaFinal = snapshots[0]!.objetosDaLinha[snapshots[0]!.objetosDaLinha.length - 1];
    const travouInicio = snapshots.every((s) => s.objetosDaLinha[0] === pontaInicial);
    const travouFim = snapshots.every((s) => s.objetosDaLinha[s.objetosDaLinha.length - 1] === pontaFinal);
    assert(travouInicio && travouFim, `partida ${i}: pontas travadas após R1`);
    assert(
      snapshots.every((s) => s.texto.length > 0 && !s.texto.includes("undefined")),
      `partida ${i}: texto não-vazio e sem "undefined"`
    );
  }

  const { rng: rngA } = criarRng("replay-seed", "x");
  const a = gerarPartida(cenario, "n2", rngA);
  const { rng: rngB } = criarRng("replay-seed", "x");
  const b = gerarPartida(cenario, "n2", rngB);
  assert(JSON.stringify(a) === JSON.stringify(b), "mesma seed → mesmas escolhas e mesmo texto (replay determinístico)");
}

console.log("\n=== gerarTestemunha — reconstrução fixa da tira real ===");
{
  const snap = gerarTestemunha(cenario);
  assert(
    snap.objetosDaLinha.join(",") === "vagalume,frasco,lua,gato,vento,folha",
    "linha final é exatamente a tira real"
  );
  assert(snap.rodada === 4 && snap.nivel === "n3" && snap.modos.desfecho === "convergente", "rodada/nível/desfecho corretos");
  assert(typeof snap.texto === "string" && snap.texto.length > 0, "texto não-vazio");
}

console.log("\n=== montarMatriz — cobertura da grade ===");
{
  const specs = montarMatriz(6);
  assert(specs.length === 24, "6 partidas × 4 níveis = 24");
  const porNivel = new Map<string, number>();
  for (const s of specs) porNivel.set(s.nivel, (porNivel.get(s.nivel) ?? 0) + 1);
  assert([...porNivel.values()].every((n) => n === 6), "6 partidas por nível");
  assert(new Set(specs.map((s) => s.partidaId)).size === specs.length, "ids de partida únicos");
}

console.log("\n=== gemini-cliente — transporte fake, sem rede ===");
{
  function transporteFake(sequenciaRespostas: Array<{ status: number; corpo: unknown }>): Transporte {
    let i = 0;
    return async () => {
      const r = sequenciaRespostas[Math.min(i, sequenciaRespostas.length - 1)]!;
      i++;
      return { status: r.status, json: async () => r.corpo };
    };
  }
  const respostaOk = (texto: string) => ({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ texto_limpo: texto }) }] } }],
  });

  {
    const t = transporteFake([{ status: 200, corpo: respostaOk("Era uma vez, a Joana viu uma faísca.") }]);
    const r = await limparTextoComGemini("Uma faísca. Acende.", "n2", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t });
    assert(r.ok === true && r.textoLimpo === "Era uma vez, a Joana viu uma faísca.", "sucesso: retorna texto_limpo");
    assert(r.tentativas === 1, "sucesso: 1 tentativa");
  }

  {
    const t = transporteFake([{ status: 200, corpo: { promptFeedback: { blockReason: "SAFETY" } } }]);
    const r = await limparTextoComGemini("x", "n1", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t });
    assert(r.ok === false && (r.erro ?? "").startsWith("bloqueio_seguranca"), "promptFeedback.blockReason vira falha registrada");
  }

  {
    const t = transporteFake([{ status: 200, corpo: { candidates: [{ finishReason: "SAFETY" }] } }]);
    const r = await limparTextoComGemini("x", "n1", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t });
    assert(r.ok === false && r.erro === "recusa_seguranca", "finishReason SAFETY vira falha registrada");
  }

  {
    const t = transporteFake([
      { status: 429, corpo: {} },
      { status: 200, corpo: respostaOk("texto ok") },
    ]);
    const r = await limparTextoComGemini("x", "n1", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t, atrasoRetryMs: 1 });
    assert(r.ok === true && r.tentativas === 2, "HTTP 429 → retry único → sucesso");
  }

  {
    const t = transporteFake([
      { status: 500, corpo: {} },
      { status: 500, corpo: {} },
    ]);
    const r = await limparTextoComGemini("x", "n1", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t, atrasoRetryMs: 1 });
    assert(r.ok === false && r.erro === "http_500" && r.tentativas === 2, "HTTP 500 persistente → falha após 1 retry, sem 3ª tentativa");
  }

  {
    const t = transporteFake([
      { status: 200, corpo: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "não é json" }] } }] } },
    ]);
    const r = await limparTextoComGemini("x", "n1", { modelo: "m", chave: "k", temperatura: 0.4, transporte: t });
    assert(r.ok === false && r.erro === "resposta_invalida" && r.tentativas === 1, "JSON malformado → falha sem retry");
  }

  {
    const t = transporteFake([{ status: 200, corpo: respostaOk("um dois tres quatro cinco seis sete oito nove dez onze doze treze") }]);
    const r = await limparTextoComGemini("um dois tres quatro cinco seis sete oito nove dez", "n2", {
      modelo: "m",
      chave: "k",
      temperatura: 0.4,
      transporte: t,
    });
    assert(r.palavras.original === 10 && r.palavras.limpo === 13, "contagem de palavras original/limpo");
    assert(r.palavras.excedeuTeto === true, "13/10 = +30% > teto de 25% → excedeuTeto");
  }
}

console.log("\n=== persistencia — escrita incremental e reconstrução do consolidado ===");
{
  const dir = await mkdtemp(join(tmpdir(), "b15-"));
  try {
    const caminhos = resolverCaminhos(dir);
    await garantirDiretorios(caminhos);
    await escreverMeta(caminhos, {
      seedBase: "s",
      totalHistorias: 2,
      tamanhoLote: 2,
      modelo: "m",
      temperatura: 0.4,
      iniciadoEm: new Date().toISOString(),
    });

    const historiaFake = (id: string): HistoriaBase => ({
      id,
      seed: 1,
      partidaId: "p",
      objetosDaLinha: ["vagalume"],
      rodada: 1,
      nivel: "n1",
      modos: { desfecho: "convergente" },
      texto: "texto",
      geracaoLocal: { inicio: "i", fim: "f", duracaoMs: 1 },
    });
    await escreverHistoriasBase(caminhos, 1, [historiaFake("h1"), historiaFake("h2")]);
    await escreverRespostasLLM(caminhos, 1, [
      {
        historiaId: "h1",
        ok: true,
        textoLimpo: "x",
        modelo: "m",
        temperatura: 0.4,
        tentativas: 1,
        palavras: { original: 1, limpo: 1, razaoCrescimento: 0, excedeuTeto: false },
        chamadaLLM: { inicio: "i", fim: "f", duracaoMs: 5 },
      },
    ]);
    await escreverMonitoramentoLote(caminhos, {
      lote: 1,
      geradoEm: new Date().toISOString(),
      historias: [
        { historiaId: "h1", geracaoLocalMs: 1, chamadaLLMMs: 5, ok: true },
        { historiaId: "h2", geracaoLocalMs: 2, chamadaLLMMs: 0, ok: false, erro: "http_500" },
      ],
    });
    const consolidadoParcial = await atualizarConsolidado(caminhos);
    assert(consolidadoParcial.totalHistoriasProcessadas === 2 && consolidadoParcial.totalLotes === 1, "consolidado reflete 1 lote em disco");
    assert(consolidadoParcial.porFase.chamadaLLM.erros === 1, "consolidado conta erros por fase");

    await escreverMonitoramentoLote(caminhos, {
      lote: 2,
      geradoEm: new Date().toISOString(),
      historias: [{ historiaId: "h3", geracaoLocalMs: 3, chamadaLLMMs: 7, ok: true }],
    });
    const consolidadoFinal = await atualizarConsolidado(caminhos);
    assert(
      consolidadoFinal.totalHistoriasProcessadas === 3 && consolidadoFinal.totalLotes === 2,
      "consolidado recalcula a partir de TODOS os lote-*.json em disco, não só o estado em memória"
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
