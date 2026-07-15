/**
 * [relatorios.ts] — formata os 3 artefatos de decisão do avaliador B1.5 a
 *   partir dos pares avaliados: a grade rodada×nível e dois markdowns de
 *   leitura humana.
 *
 * PAPEL: experimento (B1.5 · offline)
 * POR QUE EXISTE: transformar a lista de ParAvaliado numa visão de decisão —
 *   onde a fidelidade cai (grade), o que ler primeiro (piores em fluidez) e por
 *   que cada reprovado caiu (insumo para endurecer o gerador).
 * ENTRA: ParAvaliado[] (base + resposta + veredito das duas camadas).
 * SAI: Grade (objeto) via montarGrade; strings markdown via montarParaLeitura
 *   e montarReprovados. Funções puras — não escrevem em disco.
 * CHAMA: src/core/composicao.js (tipo NivelKey), ../tipos.js.
 * É CHAMADO POR: avaliar-pares.ts (montarGrade, montarParaLeitura,
 *   montarReprovados); avaliar-pares.test.ts.
 * RODA POR: importado por avaliar-pares.ts (dentro do avaliador).
 *
 * — detalhe preservado —
 * Experimento B1.5 — monta os 3 artefatos de decisão do avaliador:
 * grade.json (matriz rodada×nível), para-leitura.md (aprovados, piores
 * primeiro) e reprovados.md (motivos, insumo para endurecer o gerador).
 */

import type { NivelKey } from "../../../src/core/composicao.js";
import type { CelulaGrade, Grade, ParAvaliado } from "../tipos.js";

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];
const RODADAS = [1, 2, 3, 4];

function media(valores: number[]): number {
  return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
}

export function montarGrade(avaliados: ParAvaliado[]): Grade {
  const celulas: CelulaGrade[] = [];
  for (const rodada of RODADAS) {
    for (const nivel of NIVEIS) {
      const doCel = avaliados.filter((a) => a.par.base.rodada === rodada && a.par.base.nivel === nivel);
      const passCamada1 = doCel.filter((a) => a.camada1.pass).length;
      const comCamada2 = doCel.filter((a) => a.camada2);
      const mediaCamada2 =
        comCamada2.length > 0
          ? {
              fluidez: media(comCamada2.map((a) => a.camada2!.fluidez)),
              adequacao: media(comCamada2.map((a) => a.camada2!.adequacao)),
              naturalidade: media(comCamada2.map((a) => a.camada2!.naturalidade)),
            }
          : undefined;
      celulas.push({
        rodada,
        nivel,
        totalPares: doCel.length,
        passCamada1,
        percentualPass: doCel.length > 0 ? passCamada1 / doCel.length : 0,
        mediaCamada2,
      });
    }
  }
  return { geradoEm: new Date().toISOString(), celulas };
}

export function montarParaLeitura(avaliados: ParAvaliado[]): string {
  const aprovados = avaliados.filter((a) => a.camada1.pass && a.camada2);
  aprovados.sort((a, b) => a.camada2!.fluidez - b.camada2!.fluidez);

  const linhas = ["# Pares aprovados na Camada 1 — piores em fluidez primeiro", ""];
  for (const a of aprovados) {
    linhas.push(`## ${a.par.base.id} — rodada ${a.par.base.rodada}, ${a.par.base.nivel}`);
    linhas.push(
      `fluidez ${a.camada2!.fluidez} · adequação ${a.camada2!.adequacao} · naturalidade ${a.camada2!.naturalidade}`
    );
    linhas.push(`> ${a.camada2!.comentarioCurto}`);
    linhas.push("");
    linhas.push(`**Base:** ${a.par.base.texto}`);
    linhas.push("");
    linhas.push(`**Realizado:** ${a.par.resposta.textoLimpo}`);
    linhas.push("");
  }
  return linhas.join("\n");
}

export function montarReprovados(avaliados: ParAvaliado[]): string {
  const reprovados = avaliados.filter((a) => !a.camada1.pass);

  const linhas = ["# Reprovados na Camada 1", ""];
  for (const a of reprovados) {
    linhas.push(`## ${a.par.base.id} — rodada ${a.par.base.rodada}, ${a.par.base.nivel}`);
    linhas.push("Motivos:");
    for (const m of a.camada1.motivos) linhas.push(`- ${m}`);
    if (a.camada1.avisos.length > 0) {
      linhas.push("Avisos:");
      for (const av of a.camada1.avisos) linhas.push(`- ${av}`);
    }
    linhas.push("");
    linhas.push(`**Base:** ${a.par.base.texto}`);
    linhas.push("");
    linhas.push(`**Realizado:** ${a.par.resposta.textoLimpo ?? "(sem texto)"}`);
    linhas.push("");
  }
  return linhas.join("\n");
}
