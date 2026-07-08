/**
 * Experimento B1.5 — Script 1 (gerador). Monta a matriz de amostragem
 * (rodada×nível) via a mecânica real do motor A+, planta o
 * estado-testemunha, e manda cada história pro Gemini "realizar" o texto.
 * Execute com: GEMINI_API_KEY=xxx bun run gerar-historias.ts
 */

import { join } from "node:path";
import quintalRaw from "../../docs/quintal.v3.json" with { type: "json" };
import type { CenarioV2 } from "../../src/core/composicao.js";
import { criarRng } from "./rng.js";
import { montarMatriz, ID_TESTEMUNHA } from "./matriz-amostragem.js";
import { gerarPartida, gerarTestemunha, TEXTO_ESPERADO_TESTEMUNHA } from "./linha-aleatoria.js";
import { limparTextoComGemini } from "./gemini-cliente.js";
import {
  resolverCaminhos,
  garantirDiretorios,
  escreverMeta,
  escreverHistoriasBase,
  escreverRespostasLLM,
  escreverMonitoramentoLote,
  atualizarConsolidado,
} from "./persistencia.js";
import type { HistoriaBase, RespostaLLM, TempoHistoriaLote } from "./tipos.js";

const cenario = (quintalRaw as unknown as { cenario: CenarioV2 }).cenario;

const PLAYTHROUGHS_POR_NIVEL = Number(process.env.PLAYTHROUGHS_POR_NIVEL ?? 6);
const TAMANHO_LOTE = Number(process.env.TAMANHO_LOTE ?? 10);
const MODELO = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const TEMPERATURA = Number(process.env.GEMINI_TEMPERATURE ?? 0.4);
const SEED_BASE = process.env.SEED_BASE ?? String(Date.now());
const RAIZ_SAIDA = join(import.meta.dir, "saida");

async function main(): Promise<void> {
  const chaveEnv = process.env.GEMINI_API_KEY;
  if (!chaveEnv) {
    console.error("GEMINI_API_KEY não definida.");
    process.exit(1);
    return;
  }
  const chave: string = chaveEnv;

  const caminhos = resolverCaminhos(RAIZ_SAIDA);
  await garantirDiretorios(caminhos);

  const historias: HistoriaBase[] = [];

  for (const spec of montarMatriz(PLAYTHROUGHS_POR_NIVEL)) {
    const inicio = new Date();
    const t0 = performance.now();
    const { seed, rng } = criarRng(SEED_BASE, spec.partidaId);
    const snapshots = gerarPartida(cenario, spec.nivel, rng);
    const duracaoTotal = performance.now() - t0;
    const fim = new Date();
    const duracaoPorSnapshot = duracaoTotal / snapshots.length;

    for (const snap of snapshots) {
      historias.push({
        id: `${spec.partidaId}-r${snap.rodada}`,
        seed,
        partidaId: spec.partidaId,
        objetosDaLinha: snap.objetosDaLinha,
        rodada: snap.rodada,
        nivel: snap.nivel,
        modos: snap.modos,
        texto: snap.texto,
        geracaoLocal: { inicio: inicio.toISOString(), fim: fim.toISOString(), duracaoMs: duracaoPorSnapshot },
      });
    }
  }

  {
    const inicio = new Date();
    const t0 = performance.now();
    const snap = gerarTestemunha(cenario);
    const duracaoMs = performance.now() - t0;
    const fim = new Date();
    if (snap.texto !== TEXTO_ESPERADO_TESTEMUNHA) {
      console.warn(
        "[gerar-historias] o texto do estado-testemunha diverge do citado em docs/revisao-quintal-v3-A2.md " +
          "— o grafo pode ter evoluído desde a revisão. Aviso de calibração, não um erro."
      );
    }
    historias.push({
      id: ID_TESTEMUNHA,
      seed: 0,
      partidaId: ID_TESTEMUNHA,
      objetosDaLinha: snap.objetosDaLinha,
      rodada: snap.rodada,
      nivel: snap.nivel,
      modos: snap.modos,
      texto: snap.texto,
      geracaoLocal: { inicio: inicio.toISOString(), fim: fim.toISOString(), duracaoMs },
    });
  }

  await escreverMeta(caminhos, {
    seedBase: SEED_BASE,
    totalHistorias: historias.length,
    tamanhoLote: TAMANHO_LOTE,
    modelo: MODELO,
    temperatura: TEMPERATURA,
    iniciadoEm: new Date().toISOString(),
  });

  const totalLotes = Math.ceil(historias.length / TAMANHO_LOTE);
  for (let lote = 1; lote <= totalLotes; lote++) {
    const inicioIdx = (lote - 1) * TAMANHO_LOTE;
    const historiasDoLote = historias.slice(inicioIdx, inicioIdx + TAMANHO_LOTE);
    await escreverHistoriasBase(caminhos, lote, historiasDoLote);

    const respostas: RespostaLLM[] = [];
    const tempos: TempoHistoriaLote[] = [];
    for (const h of historiasDoLote) {
      const inicio = new Date();
      const t0 = performance.now();
      const resultado = await limparTextoComGemini(h.texto, h.nivel, { modelo: MODELO, chave, temperatura: TEMPERATURA });
      const duracaoMs = performance.now() - t0;
      const fim = new Date();

      respostas.push({
        historiaId: h.id,
        ok: resultado.ok,
        textoLimpo: resultado.textoLimpo,
        erro: resultado.erro,
        modelo: MODELO,
        temperatura: TEMPERATURA,
        tentativas: resultado.tentativas,
        palavras: resultado.palavras,
        chamadaLLM: { inicio: inicio.toISOString(), fim: fim.toISOString(), duracaoMs },
      });
      tempos.push({
        historiaId: h.id,
        geracaoLocalMs: h.geracaoLocal.duracaoMs,
        chamadaLLMMs: duracaoMs,
        ok: resultado.ok,
        erro: resultado.erro,
        excedeuTeto: resultado.palavras.excedeuTeto,
      });

      await escreverRespostasLLM(caminhos, lote, respostas);
      console.log(`[gerar-historias] ${h.id}: ${resultado.ok ? "ok" : "erro:" + resultado.erro}`);
    }

    await escreverMonitoramentoLote(caminhos, { lote, geradoEm: new Date().toISOString(), historias: tempos });
    await atualizarConsolidado(caminhos);
    console.log(`[gerar-historias] lote ${lote}/${totalLotes} concluído.`);
  }

  console.log(`[gerar-historias] concluído: ${historias.length} histórias em ${totalLotes} lotes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
