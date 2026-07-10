/**
 * Experimento fichas→histórias — Script 2 (avaliador), CICLO 2 (fase 12):
 * lê os lotes de saida/geracao/ (registros do realizador REAL — o veredito da
 * Camada 1 já vem do validador de produção, `src/core/realizador/validador.ts`)
 * e roda o juiz LLM (OpenAI, modelo ≠ gerador, só nos aprovados). Artefatos da
 * Parada de Voz: grade.json · para-leitura.md · reprovados.md · consolidado.md.
 * A grade do ciclo 1 (andaime, PR #21) vive em saida/avaliacao/_ciclo1-pr21/.
 * Uso: bun run experimentos/fichas-para-historias/avaliar/avaliar.ts
 * Env: OPENAI_API_KEY, OPENAI_MODEL (default gpt-4o-mini). Sem a chave, a
 * grade sai só com a Camada 1 e a limitação fica registrada no cabeçalho.
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { carregarEnv } from "../../beats-para-paragrafos/carregar-env.js";
import { julgarPar } from "../../beats-para-paragrafos/avaliar/camada2-juiz.js";
import type { VereditoCamada2 } from "../../beats-para-paragrafos/tipos.js";
import type {
  ArquivoLoteRealizacao,
  CelulaGrade,
  RegistroRealizacao,
  VereditoCamada1Fichas,
} from "../tipos.js";

interface Avaliado {
  registro: RegistroRealizacao;
  c1: VereditoCamada1Fichas;
  c2?: VereditoCamada2;
}

async function main(): Promise<void> {
  carregarEnv(join(import.meta.dir, "..", "..", "..", ".env"));
  const dirGeracao = join(import.meta.dir, "..", "saida", "geracao");
  const dirAvaliacao = join(import.meta.dir, "..", "saida", "avaliacao");
  await mkdir(dirAvaliacao, { recursive: true });

  let nomes: string[] = [];
  try {
    // readdir NÃO recursivo por design: subpastas (_ciclo1-pr21/, _amostra/,
    // _pre-recalibracao/, _micro/) ficam fora da grade.
    nomes = (await readdir(dirGeracao)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.error("Nada em saida/geracao/ — rode o gerador primeiro.");
    process.exitCode = 1;
    return;
  }
  if (nomes.length === 0) {
    console.error("Nenhum lote do ciclo 2 em saida/geracao/ — rode o gerador primeiro.");
    process.exitCode = 1;
    return;
  }

  const avaliados: Avaliado[] = [];
  for (const nome of nomes) {
    const lote = JSON.parse(await readFile(join(dirGeracao, nome), "utf8")) as ArquivoLoteRealizacao;
    for (const registro of lote.registros) {
      // O veredito vem do validador de PRODUÇÃO, gravado na geração (ciclo 2).
      const c1: VereditoCamada1Fichas = registro.veredito ?? {
        pass: false,
        motivos: [`resposta do LLM sem sucesso (${registro.resposta.erro ?? "erro desconhecido"})`],
        avisos: [],
        presencaPorBeat: {},
      };
      avaliados.push({ registro, c1 });
    }
  }
  console.log(`Camada 1: ${avaliados.filter((a) => a.c1.pass).length}/${avaliados.length} aprovados`);

  // Camada 2 — juiz OpenAI, só nos aprovados. "textoBase" do juiz = resumo do Pacote.
  const chave = process.env["OPENAI_API_KEY"];
  const modeloJuiz = process.env["OPENAI_MODEL"] || "gpt-4o-mini";
  let limitacaoJuiz = "";
  if (chave) {
    for (const a of avaliados) {
      if (!a.c1.pass || !a.registro.resposta.texto) continue;
      const base = `(Pacote de fichas — máximo canônico ${a.registro.pacote.maximoPalavras} palavras; rodada R${a.registro.estado.rodada}; linha: ${a.registro.estado.linha.join("→")})`;
      const r = await julgarPar(a.registro.estado.nivel, base, a.registro.resposta.texto, {
        modelo: modeloJuiz,
        chave,
        temperatura: 0.2,
      });
      if (r.ok && r.veredito) a.c2 = r.veredito;
      else console.warn(`   juiz falhou em ${a.registro.estado.id}: ${r.erro}`);
    }
  } else {
    limitacaoJuiz = "OPENAI_API_KEY ausente — grade SÓ com Camada 1 (limitação registrada).";
    console.warn(limitacaoJuiz);
  }

  // ---------- grade.json (rodada × nível × gênero × temperatura) ----------
  const celulas = new Map<string, Avaliado[]>();
  for (const a of avaliados) {
    const e = a.registro.estado;
    const k = `R${e.rodada}|${e.nivel}|${e.genero}|${e.temperatura}`;
    (celulas.get(k) ?? celulas.set(k, []).get(k)!).push(a);
  }
  const grade: CelulaGrade[] = [...celulas.entries()].map(([k, grupo]) => {
    const e = grupo[0]!.registro.estado;
    const pass = grupo.filter((a) => a.c1.pass).length;
    const comC2 = grupo.filter((a) => a.c2);
    const media =
      comC2.length > 0
        ? {
            fluidez: comC2.reduce((s, a) => s + a.c2!.fluidez, 0) / comC2.length,
            adequacao: comC2.reduce((s, a) => s + a.c2!.adequacao, 0) / comC2.length,
            naturalidade: comC2.reduce((s, a) => s + a.c2!.naturalidade, 0) / comC2.length,
          }
        : undefined;
    return {
      rodada: e.rodada,
      nivel: e.nivel,
      genero: e.genero,
      temperatura: e.temperatura,
      total: grupo.length,
      passCamada1: pass,
      percentualPass: Math.round((pass / grupo.length) * 100),
      mediaCamada2: media,
      _chave: k,
    } as CelulaGrade & { _chave: string };
  });
  grade.sort((a, b) => a.rodada - b.rodada || a.nivel.localeCompare(b.nivel) || a.genero.localeCompare(b.genero));
  await writeFile(
    join(dirAvaliacao, "grade.json"),
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        ciclo: "2 — realizador real (fase 12)",
        totalPares: avaliados.length,
        passCamada1: avaliados.filter((a) => a.c1.pass).length,
        limitacao: limitacaoJuiz || undefined,
        celulas: grade,
      },
      null,
      2
    ),
    "utf8"
  );

  // ---------- para-leitura.md (aprovados, PIORES primeiro, n1 destacado) ----------
  const aprovados = avaliados.filter((a) => a.c1.pass);
  const notaMedia = (a: Avaliado) =>
    a.c2 ? (a.c2.fluidez + a.c2.adequacao + a.c2.naturalidade) / 3 : -1;
  aprovados.sort((a, b) => notaMedia(a) - notaMedia(b));
  const bloco = (a: Avaliado) => {
    const e = a.registro.estado;
    const nota = a.c2
      ? `fluidez ${a.c2.fluidez} · adequação ${a.c2.adequacao} · naturalidade ${a.c2.naturalidade} — ${a.c2.comentarioCurto}`
      : "(sem juiz)";
    const avisos = a.c1.avisos.length ? `\n> avisos: ${a.c1.avisos.join(" · ")}` : "";
    return `### ${e.id} — ${e.personagem} · R${e.rodada}×${e.nivel} · t${e.temperatura}${e.testemunha ? " · TESTEMUNHA" : ""}\n> ${nota}${avisos}\n\n${a.registro.resposta.texto ?? ""}\n`;
  };
  const n1s = aprovados.filter((a) => a.registro.estado.nivel === "n1");
  const demais = aprovados.filter((a) => a.registro.estado.nivel !== "n1");
  await writeFile(
    join(dirAvaliacao, "para-leitura.md"),
    [
      "# Para leitura em voz alta — CICLO 2, realizador real (aprovados na Camada 1, piores notas primeiro)",
      limitacaoJuiz ? `\n> ⚠ ${limitacaoJuiz}` : "",
      "\n## n1 — O PONTO SENSÍVEL (o CRITÉRIO do 12-05 decide aqui)\n",
      ...n1s.map(bloco),
      "\n## Demais níveis\n",
      ...demais.map(bloco),
    ].join("\n"),
    "utf8"
  );

  // ---------- reprovados.md (motivo a motivo) ----------
  const reprovados = avaliados.filter((a) => !a.c1.pass);
  await writeFile(
    join(dirAvaliacao, "reprovados.md"),
    [
      `# Reprovados na Camada 1 — CICLO 2 — ${reprovados.length}/${avaliados.length}`,
      "",
      ...reprovados.map((a) => {
        const e = a.registro.estado;
        return `## ${e.id} — ${e.personagem} · R${e.rodada}×${e.nivel} · t${e.temperatura}\n${a.c1.motivos.map((m) => `- ${m}`).join("\n")}\n\n${a.registro.resposta.texto ?? "(sem texto)"}\n`;
      }),
    ].join("\n"),
    "utf8"
  );

  // ---------- consolidado.md (monitoramento: chamadas, erros, duração, tokens, custo) ----------
  // Preços-SEMENTE do gemini-2.5-flash (USD por 1M tokens) — calibráveis.
  const PRECO_ENTRADA_USD_1M = 0.3;
  const PRECO_SAIDA_USD_1M = 2.5;
  const porTemperatura = new Map<number, RegistroRealizacao[]>();
  for (const a of avaliados) {
    const t = a.registro.resposta.temperatura;
    (porTemperatura.get(t) ?? porTemperatura.set(t, []).get(t)!).push(a.registro);
  }
  const linhaMonitor = (rotulo: string, grupo: RegistroRealizacao[]): string => {
    const erros = grupo.filter((r) => !r.resposta.ok).length;
    const chamadasLlm = grupo.reduce((s, r) => s + r.resposta.chamadas, 0);
    const duracaoMin = grupo.reduce((s, r) => s + r.resposta.duracaoMs, 0) / 60000;
    const comTokens = grupo.filter((r) => r.resposta.tokens);
    const entrada = comTokens.reduce((s, r) => s + r.resposta.tokens!.entrada, 0);
    const saida = comTokens.reduce((s, r) => s + r.resposta.tokens!.saida, 0);
    const custo = (entrada / 1e6) * PRECO_ENTRADA_USD_1M + (saida / 1e6) * PRECO_SAIDA_USD_1M;
    const tokensTxt =
      comTokens.length > 0
        ? `${entrada} entrada · ${saida} saída${comTokens.length < grupo.length ? ` (${grupo.length - comTokens.length} sem usageMetadata)` : ""} | ~US$ ${custo.toFixed(4)}`
        : "indisponíveis | custo n/d";
    return `| ${rotulo} | ${grupo.length} | ${erros} (${Math.round((erros / Math.max(grupo.length, 1)) * 100)}%) | ${chamadasLlm} | ${duracaoMin.toFixed(1)} min | ${tokensTxt} |`;
  };
  const todos = avaliados.map((a) => a.registro);
  await writeFile(
    join(dirAvaliacao, "consolidado.md"),
    [
      "# Consolidado de monitoramento — CICLO 2 (realizador real)",
      "",
      `Gerado em ${new Date().toISOString()}. Subpastas (_ciclo1-pr21/, _amostra/, _pre-recalibracao/, _micro/) fora.`,
      `Custo estimado com preços-semente do gemini-2.5-flash (US$ ${PRECO_ENTRADA_USD_1M}/1M entrada · US$ ${PRECO_SAIDA_USD_1M}/1M saída).`,
      "",
      "| grupo | estados | erros de provedor | chamadas LLM | duração | tokens / custo |",
      "|---|---|---|---|---|---|",
      ...[...porTemperatura.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, grupo]) => linhaMonitor(`t=${t}`, grupo)),
      linhaMonitor("TOTAL", todos),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `Artefatos da Parada de Voz em saida/avaliacao/: grade.json · para-leitura.md · reprovados.md · consolidado.md`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
