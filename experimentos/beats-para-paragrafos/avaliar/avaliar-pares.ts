/**
 * Experimento B1.5 — Script 2 (avaliador). Lê historias-base + respostas-llm
 * LOTE A LOTE (mesmo nome de arquivo nas duas pastas), roda Camada 1 (gate
 * factual, sempre) e Camada 2 (juiz LLM, só nos pares que passaram a Camada
 * 1), e grava um arquivo agregado por lote — história-base + resposta do
 * LLM + veredito do avaliador juntos, pra leitura humana direta — em
 * saida/historias-base/agregados/, além da grade/relatórios de sempre em
 * saida/avaliacao/. Lê OPENAI_API_KEY/OPENAI_MODEL do .env da RAIZ do repo
 * (ver carregar-env.ts) ou do shell. Execute com: bun run avaliar/avaliar-pares.ts
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgregadoHistoria, ArquivoHistoriasBase, ArquivoRespostasLLM, Par, ParAvaliado } from "../tipos.js";
import { carregarEnv } from "../carregar-env.js";
import { escreverAgregados, garantirDiretorios, resolverCaminhos } from "../persistencia.js";
import { avaliarCamada1 } from "./camada1-fidelidade.js";
import { julgarPar } from "./camada2-juiz.js";
import { montarGrade, montarParaLeitura, montarReprovados } from "./relatorios.js";

carregarEnv(join(import.meta.dir, "..", "..", "..", ".env"));

const RAIZ_SAIDA = join(import.meta.dir, "..", "saida");
// gpt-5.4-mini — confirmado em developers.openai.com/api/docs/models (jul/2026):
// modelo mini atual, custo-benefício bom pra avaliação com schema JSON.
const OPENAI_MODEL_PADRAO = "gpt-5.4-mini";

async function main(): Promise<void> {
  const chaveEnv = process.env.OPENAI_API_KEY;
  if (!chaveEnv) {
    console.error("OPENAI_API_KEY não definida.");
    process.exit(1);
    return;
  }
  const chave: string = chaveEnv;

  const modelo = process.env.OPENAI_MODEL ?? OPENAI_MODEL_PADRAO;
  const temperatura = Number(process.env.OPENAI_TEMPERATURE ?? 0.1);

  const caminhos = resolverCaminhos(RAIZ_SAIDA);
  await garantirDiretorios(caminhos);

  const arquivosBase = (await readdir(caminhos.historiasBase)).filter((f) => f.endsWith(".json")).sort();
  const todosAvaliados: ParAvaliado[] = [];

  for (const arquivo of arquivosBase) {
    const dadosBase = JSON.parse(await readFile(join(caminhos.historiasBase, arquivo), "utf8")) as ArquivoHistoriasBase;

    let dadosResp: ArquivoRespostasLLM;
    try {
      dadosResp = JSON.parse(await readFile(join(caminhos.respostasLlm, arquivo), "utf8")) as ArquivoRespostasLLM;
    } catch {
      console.warn(`[avaliar-pares] sem respostas-llm/${arquivo} correspondente — pulando lote ${dadosBase.lote}`);
      continue;
    }
    const porId = new Map(dadosResp.respostas.map((r) => [r.historiaId, r]));

    const agregadosDoLote: AgregadoHistoria[] = [];
    for (const base of dadosBase.historias) {
      const resposta = porId.get(base.id);
      if (!resposta) {
        console.warn(`[avaliar-pares] história "${base.id}" sem resposta correspondente — pulando`);
        continue;
      }
      const par: Par = { base, resposta };
      const camada1 = avaliarCamada1(par);
      let avaliado: ParAvaliado = { par, camada1 };

      if (camada1.pass) {
        const resultado = await julgarPar(par.base.nivel, par.base.texto, par.resposta.textoLimpo ?? "", {
          modelo,
          chave,
          temperatura,
        });
        if (resultado.ok && resultado.veredito) {
          avaliado = { par, camada1, camada2: resultado.veredito };
          console.log(`[avaliar-pares] ${base.id}: Camada 1 ok, julgado pela Camada 2`);
        } else {
          console.warn(`[avaliar-pares] juiz falhou em "${base.id}": ${resultado.erro}`);
        }
      } else {
        console.log(`[avaliar-pares] ${base.id}: reprovado na Camada 1 (${camada1.motivos.length} motivo(s))`);
      }

      todosAvaliados.push(avaliado);
      agregadosDoLote.push({
        ...base,
        respostaLLM: resposta,
        avaliacao: { camada1: avaliado.camada1, camada2: avaliado.camada2 },
      });
    }

    await escreverAgregados(caminhos, { lote: dadosBase.lote, tamanho: agregadosDoLote.length, historias: agregadosDoLote });
    console.log(`[avaliar-pares] lote ${dadosBase.lote}: agregado gravado (${agregadosDoLote.length} histórias).`);
  }

  console.log(`[avaliar-pares] ${todosAvaliados.length} pares avaliados no total.`);

  const grade = montarGrade(todosAvaliados);
  const paraLeitura = montarParaLeitura(todosAvaliados);
  const reprovados = montarReprovados(todosAvaliados);

  const dirAvaliacao = join(RAIZ_SAIDA, "avaliacao");
  await mkdir(dirAvaliacao, { recursive: true });
  await writeFile(join(dirAvaliacao, "grade.json"), JSON.stringify(grade, null, 2), "utf8");
  await writeFile(join(dirAvaliacao, "para-leitura.md"), paraLeitura, "utf8");
  await writeFile(join(dirAvaliacao, "reprovados.md"), reprovados, "utf8");

  console.log("[avaliar-pares] concluído. Ver saida/avaliacao/ e saida/historias-base/agregados/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
