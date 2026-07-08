/**
 * Experimento B1.5 — Script 2 (avaliador). Lê historias-base + respostas-llm,
 * junta por id em pares, roda Camada 1 (gate factual, sempre) e Camada 2
 * (juiz LLM, só nos pares que passaram a Camada 1). Execute com:
 * OPENAI_API_KEY=xxx OPENAI_MODEL=xxx bun run avaliar/avaliar-pares.ts
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArquivoHistoriasBase, ArquivoRespostasLLM, HistoriaBase, Par, ParAvaliado, RespostaLLM } from "../tipos.js";
import { avaliarCamada1 } from "./camada1-fidelidade.js";
import { julgarPar } from "./camada2-juiz.js";
import { montarGrade, montarParaLeitura, montarReprovados } from "./relatorios.js";

const RAIZ_SAIDA = join(import.meta.dir, "..", "saida");

async function lerHistoriasBase(dir: string): Promise<HistoriaBase[]> {
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const historias: HistoriaBase[] = [];
  for (const arquivo of arquivos) {
    const bruto = await readFile(join(dir, arquivo), "utf8");
    const parsed = JSON.parse(bruto) as ArquivoHistoriasBase;
    historias.push(...parsed.historias);
  }
  return historias;
}

async function lerRespostasLLM(dir: string): Promise<RespostaLLM[]> {
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const respostas: RespostaLLM[] = [];
  for (const arquivo of arquivos) {
    const bruto = await readFile(join(dir, arquivo), "utf8");
    const parsed = JSON.parse(bruto) as ArquivoRespostasLLM;
    respostas.push(...parsed.respostas);
  }
  return respostas;
}

function montarPares(historias: HistoriaBase[], respostas: RespostaLLM[]): Par[] {
  const porId = new Map(respostas.map((r) => [r.historiaId, r]));
  const pares: Par[] = [];
  for (const base of historias) {
    const resposta = porId.get(base.id);
    if (!resposta) {
      console.warn(`[avaliar-pares] história "${base.id}" sem resposta correspondente — pulando`);
      continue;
    }
    pares.push({ base, resposta });
  }
  return pares;
}

async function main(): Promise<void> {
  const chaveEnv = process.env.OPENAI_API_KEY;
  if (!chaveEnv) {
    console.error("OPENAI_API_KEY não definida.");
    process.exit(1);
    return;
  }
  const chave: string = chaveEnv;

  const modeloEnv = process.env.OPENAI_MODEL;
  if (!modeloEnv) {
    console.error("OPENAI_MODEL não definida — confirme o id exato do modelo antes de rodar (ver README: não há default validado contra a API real).");
    process.exit(1);
    return;
  }
  const modelo: string = modeloEnv;
  const temperatura = Number(process.env.OPENAI_TEMPERATURE ?? 0.1);

  const historias = await lerHistoriasBase(join(RAIZ_SAIDA, "historias-base"));
  const respostas = await lerRespostasLLM(join(RAIZ_SAIDA, "respostas-llm"));
  const pares = montarPares(historias, respostas);
  console.log(`[avaliar-pares] ${pares.length} pares carregados.`);

  const avaliados: ParAvaliado[] = [];
  let julgados = 0;
  for (const par of pares) {
    const camada1 = avaliarCamada1(par);
    if (!camada1.pass) {
      avaliados.push({ par, camada1 });
      console.log(`[avaliar-pares] ${par.base.id}: reprovado na Camada 1 (${camada1.motivos.length} motivo(s))`);
      continue;
    }

    const resultado = await julgarPar(par.base.nivel, par.base.texto, par.resposta.textoLimpo ?? "", {
      modelo,
      chave,
      temperatura,
    });
    if (!resultado.ok || !resultado.veredito) {
      console.warn(`[avaliar-pares] juiz falhou em "${par.base.id}": ${resultado.erro}`);
      avaliados.push({ par, camada1 });
      continue;
    }
    avaliados.push({ par, camada1, camada2: resultado.veredito });
    julgados++;
    console.log(`[avaliar-pares] ${par.base.id}: Camada 1 ok, julgado pela Camada 2 (${julgados} até agora)`);
  }

  const grade = montarGrade(avaliados);
  const paraLeitura = montarParaLeitura(avaliados);
  const reprovados = montarReprovados(avaliados);

  const dirAvaliacao = join(RAIZ_SAIDA, "avaliacao");
  await mkdir(dirAvaliacao, { recursive: true });
  await writeFile(join(dirAvaliacao, "grade.json"), JSON.stringify(grade, null, 2), "utf8");
  await writeFile(join(dirAvaliacao, "para-leitura.md"), paraLeitura, "utf8");
  await writeFile(join(dirAvaliacao, "reprovados.md"), reprovados, "utf8");

  console.log(`[avaliar-pares] concluído: ${avaliados.length} pares avaliados. Ver saida/avaliacao/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
