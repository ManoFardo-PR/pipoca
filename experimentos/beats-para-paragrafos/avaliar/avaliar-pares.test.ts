/**
 * Experimento B1.5 — testes do Script 2 (avaliador), sem rede.
 * Formato dos demais testes do repo: assert local + throw no fim.
 * Execute com: bun run avaliar/avaliar-pares.test.ts
 */

import quintalRaw from "../../../docs/quintal.v3.json" with { type: "json" };
import type { CenarioV2 } from "../../../src/core/composicao.js";
import { gerarTestemunha, TEXTO_ESPERADO_TESTEMUNHA } from "../linha-aleatoria.js";
import { avaliarCamada1 } from "./camada1-fidelidade.js";
import { julgarPar, type Transporte } from "./camada2-juiz.js";
import { montarGrade, montarParaLeitura, montarReprovados } from "./relatorios.js";
import type { HistoriaBase, Par, ParAvaliado, RespostaLLM } from "../tipos.js";

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

function baseFake(overrides: Partial<HistoriaBase> = {}): HistoriaBase {
  return {
    id: "h1",
    seed: 1,
    partidaId: "p1",
    objetosDaLinha: ["vagalume", "frasco", "folha"],
    rodada: 1,
    nivel: "n2",
    modos: { desfecho: "convergente" },
    texto: "Uma faísca. Acende. Um pote. De vidro. Uma folha. Cai.",
    geracaoLocal: { inicio: "i", fim: "f", duracaoMs: 1 },
    ...overrides,
  };
}

function respostaFake(overrides: Partial<RespostaLLM> = {}): RespostaLLM {
  return {
    historiaId: "h1",
    ok: true,
    textoLimpo: "texto",
    modelo: "m",
    temperatura: 0.4,
    tentativas: 1,
    palavras: { original: 1, limpo: 1 },
    chamadaLLM: { inicio: "i", fim: "f", duracaoMs: 1 },
    ...overrides,
  };
}

console.log("\n=== camada1-fidelidade — caso ideal (deve passar) ===");
{
  const base = baseFake({
    texto: "Uma faísca acende. Um pote de vidro brilha. Uma folha cai no chão.",
  });
  const resposta = respostaFake({
    textoLimpo: "A Joana viu a faísca acender, achou um pote de vidro, e olhou a folha cair.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === true, "caso ideal: pass === true");
  assert(veredito.motivos.length === 0, "caso ideal: sem motivos de reprovação");
  assert(veredito.avisos.length === 0, "caso ideal: sem avisos");
}

console.log("\n=== camada1-fidelidade — cobertura de núcleo ===");
{
  const base = baseFake({ objetosDaLinha: ["vagalume", "frasco", "gato"] });
  const resposta = respostaFake({
    textoLimpo: "A Joana viu a faísca acender e achou um pote de vidro na grama.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === false, "objeto sem âncora no texto → pass false");
  assert(
    veredito.motivos.some((m) => m.includes("gato")),
    "motivo cita o objeto sem âncora (gato)"
  );
}

console.log("\n=== camada1-fidelidade — objeto sem tabela de âncoras (aviso, não reprova) ===");
{
  const base = baseFake({ objetosDaLinha: ["borboleta"], texto: "Uma borboleta voa no quintal." });
  const resposta = respostaFake({ textoLimpo: "A Joana viu a borboleta voar." });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === true, "objeto desconhecido não reprova sozinho");
  assert(
    veredito.avisos.some((a) => a.includes("borboleta")),
    "aviso sinaliza objeto sem tabela de âncoras"
  );
}

console.log("\n=== camada1-fidelidade — presença da protagonista ===");
{
  const base = baseFake({
    texto: "Uma faísca acende. Um pote de vidro brilha. Uma folha cai no chão.",
  });
  const resposta = respostaFake({
    textoLimpo:
      "A Joana viu a faísca. O pote de vidro brilhou sozinho na grama. A folha caiu rodando bem devagar no ar.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === false, "protagonista em só 1 de 3 sentenças (33% < 60%) → pass false");
  assert(
    veredito.motivos.some((m) => m.includes("presença")),
    "motivo cita presença da protagonista"
  );
}

console.log("\n=== camada1-fidelidade — teto de crescimento ===");
{
  const base = baseFake({ texto: "Uma faísca acende no escuro." });
  const resposta = respostaFake({
    textoLimpo:
      "A Joana, deslumbrada e maravilhada, observou atentamente uma faísca pequena e brilhante acender lentamente ali no fundo escuro do quintal silencioso.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === false, "crescimento muito acima do teto → pass false");
  assert(
    veredito.motivos.some((m) => m.includes("crescimento")),
    "motivo cita o crescimento acima do teto"
  );
}

console.log("\n=== camada1-fidelidade — nome/gênero ===");
{
  const base = baseFake({ texto: "Uma faísca acende. Um pote de vidro. Uma folha cai." });

  const semNome = respostaFake({
    textoLimpo: "Ela viu uma faísca acender. Ela achou um pote de vidro. Ela olhou a folha cair.",
  });
  const veredito1 = avaliarCamada1({ base, resposta: semNome });
  assert(veredito1.pass === false, "nome ausente (só pronomes) → pass false");
  assert(
    veredito1.motivos.some((m) => m.toLowerCase().includes("nome")),
    "motivo cita nome ausente"
  );

  const generoTrocado = respostaFake({
    textoLimpo: "O Joana era um menino curioso que viu a faísca, o pote de vidro e a folha.",
  });
  const veredito2 = avaliarCamada1({ base, resposta: generoTrocado });
  assert(veredito2.pass === false, '"o Joana"/"menino" → indício de troca de gênero → pass false');
  assert(
    veredito2.motivos.some((m) => m.includes("gênero")),
    "motivo cita indício de troca de gênero"
  );
}

console.log("\n=== camada1-fidelidade — aviso de nome próprio fora do elenco ===");
{
  const base = baseFake({ objetosDaLinha: ["vagalume"], texto: "Uma faísca acende." });
  const resposta = respostaFake({
    textoLimpo: "A Joana encontrou o Marcelo perto da faísca que acendia no escuro.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(
    veredito.avisos.some((a) => a.includes("Marcelo")),
    "aviso sinaliza nome próprio fora do elenco conhecido"
  );
}

console.log("\n=== camada1-fidelidade — aviso de aspas novas ===");
{
  const base = baseFake({ objetosDaLinha: ["vagalume"], texto: "Uma faísca acende." });
  const resposta = respostaFake({
    textoLimpo: 'A Joana disse "oi" pra faísca que acendia no escuro.',
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(
    veredito.avisos.some((a) => a.includes("aspas")),
    "aviso sinaliza fala entre aspas nova"
  );
}

console.log("\n=== camada1-fidelidade — ritmo n1 (métrica separada, não bloqueia pass) ===");
{
  const base = baseFake({
    objetosDaLinha: ["vagalume"],
    nivel: "n1",
    texto:
      "Uma faísca. Acende. Ela viu. Ela chega perto. Ela sorri. Ela para. Ela olha. Uma luz. Pisca. Ela gosta. Ela sente. Ela fica. Ela dorme.",
  });
  const resposta = respostaFake({
    textoLimpo:
      "Uma faísca. Acende. A Joana viu. Ela chega perto. Ela sorri. Ela para. Ela olha. Uma luz. Pisca. Ela gosta. Ela sente. Ela fica. Ela dorme.",
  });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.ritmoN1 !== undefined, "n1 calcula métrica de ritmo");
  assert(veredito.ritmoN1!.pontosFinais > 12, "13 sentenças curtas → pontosFinais acima do limiar");
  assert(veredito.ritmoN1!.ok === false, "ritmoN1.ok === false quando excede o limiar");
  assert(veredito.pass === true, "ritmo ruim NÃO bloqueia pass — é métrica separada do gate de conteúdo");
}

console.log("\n=== camada1-fidelidade — integração com o estado-testemunha real ===");
{
  const cenario = (quintalRaw as unknown as { cenario: CenarioV2 }).cenario;
  const snap = gerarTestemunha(cenario);
  const base = baseFake({
    objetosDaLinha: snap.objetosDaLinha,
    rodada: snap.rodada,
    nivel: snap.nivel,
    modos: snap.modos,
    texto: snap.texto,
  });
  // Reusa o próprio texto do motor como "realizado" (crescimento zero, todas as
  // âncoras já presentes na tira real) — garante que o gate não reprova o
  // próprio exemplo-régua do projeto.
  const resposta = respostaFake({ textoLimpo: TEXTO_ESPERADO_TESTEMUNHA });
  const veredito = avaliarCamada1({ base, resposta });
  assert(veredito.pass === true, "a tira real (sem alteração) passa pela Camada 1");
  assert(veredito.motivos.length === 0, "a tira real não gera motivos de reprovação");
}

console.log("\n=== camada2-juiz — transporte fake, sem rede ===");
{
  function transporteFake(status: number, corpo: unknown): Transporte {
    return async () => ({ status, json: async () => corpo });
  }
  const vereditoOk = { fluidez: 4, adequacao: 5, naturalidade: 3, comentario_curto: "boa prosa" };

  {
    const t = transporteFake(200, { choices: [{ message: { content: JSON.stringify(vereditoOk) } }] });
    const r = await julgarPar("n2", "base", "limpo", { modelo: "m", chave: "k", temperatura: 0.1, transporte: t });
    assert(r.ok === true && r.veredito?.fluidez === 4 && r.veredito?.comentarioCurto === "boa prosa", "sucesso: retorna veredito");
  }

  {
    const t = transporteFake(200, { choices: [{ message: { refusal: "não posso avaliar isso" } }] });
    const r = await julgarPar("n2", "base", "limpo", { modelo: "m", chave: "k", temperatura: 0.1, transporte: t });
    assert(r.ok === false && (r.erro ?? "").startsWith("recusa:"), "refusal vira falha registrada");
  }

  {
    const t = transporteFake(500, {});
    const r = await julgarPar("n2", "base", "limpo", { modelo: "m", chave: "k", temperatura: 0.1, transporte: t });
    assert(r.ok === false && r.erro === "http_500", "HTTP não-200 vira falha (sem retry na Camada 2)");
  }

  {
    const t = transporteFake(200, { choices: [{ message: { content: "não é json" } }] });
    const r = await julgarPar("n2", "base", "limpo", { modelo: "m", chave: "k", temperatura: 0.1, transporte: t });
    assert(r.ok === false && r.erro === "resposta_invalida", "JSON malformado vira falha");
  }
}

console.log("\n=== relatorios — grade / para-leitura / reprovados ===");
{
  const parA: Par = { base: baseFake({ id: "a", rodada: 1, nivel: "n1" }), resposta: respostaFake({ historiaId: "a" }) };
  const parB: Par = { base: baseFake({ id: "b", rodada: 1, nivel: "n1" }), resposta: respostaFake({ historiaId: "b" }) };
  const parC: Par = { base: baseFake({ id: "c", rodada: 2, nivel: "n3" }), resposta: respostaFake({ historiaId: "c" }) };

  const avaliados: ParAvaliado[] = [
    {
      par: parA,
      camada1: { pass: true, motivos: [], avisos: [] },
      camada2: { fluidez: 4, adequacao: 4, naturalidade: 4, comentarioCurto: "ok" },
    },
    {
      par: parB,
      camada1: { pass: true, motivos: [], avisos: [] },
      camada2: { fluidez: 2, adequacao: 3, naturalidade: 3, comentarioCurto: "picado" },
    },
    { par: parC, camada1: { pass: false, motivos: ["objeto sem âncora"], avisos: [] } },
  ];

  const grade = montarGrade(avaliados);
  const celulaR1N1 = grade.celulas.find((c) => c.rodada === 1 && c.nivel === "n1")!;
  assert(celulaR1N1.totalPares === 2 && celulaR1N1.passCamada1 === 2, "célula R1×n1: 2 pares, 2 pass");
  assert(celulaR1N1.percentualPass === 1, "célula R1×n1: 100% pass");
  assert(Math.abs((celulaR1N1.mediaCamada2?.fluidez ?? -1) - 3) < 1e-9, "célula R1×n1: média de fluidez (4+2)/2=3");

  const celulaR2N3 = grade.celulas.find((c) => c.rodada === 2 && c.nivel === "n3")!;
  assert(celulaR2N3.totalPares === 1 && celulaR2N3.passCamada1 === 0, "célula R2×n3: 1 par, 0 pass");
  assert(celulaR2N3.mediaCamada2 === undefined, "célula R2×n3: sem Camada 2 (nenhum pass)");

  const paraLeitura = montarParaLeitura(avaliados);
  const idxB = paraLeitura.indexOf("## b");
  const idxA = paraLeitura.indexOf("## a");
  assert(idxB >= 0 && idxA >= 0 && idxB < idxA, "para-leitura.md: pior fluidez (b, nota 2) vem antes (a, nota 4)");
  assert(!paraLeitura.includes("## c"), "para-leitura.md: só lista pares aprovados na Camada 1");

  const reprovados = montarReprovados(avaliados);
  assert(reprovados.includes("## c") && reprovados.includes("objeto sem âncora"), "reprovados.md: lista o par reprovado com o motivo");
  assert(!reprovados.includes("## a") && !reprovados.includes("## b"), "reprovados.md: não lista os pares aprovados");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
