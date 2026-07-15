/**
 * Pipoca — Testes do realizador (realizador.test.ts)
 * --------------------------------------------------
 * Blocos: montagem de prompt (12-01), validador (12-03, casos dispara/passa
 * reaproveitados do experimento), política de falha com provedores FAKE
 * (12-04) e golden do prompt (Pacote-golden da fase 11 ⇒ prompt congelado;
 * política "nunca regenerar para passar"). Sem rede.
 * RODA POR: bun run src/core/realizador/realizador.test.ts (parte de `bun run test`)
 */

import { montar, type CenarioV2, type EstadoComp } from "../composicao.js";
import { ESQUEMA_PACOTE_COMPOSICAO_V1, type PacoteComposicao } from "../compositor/pacote.js";
import {
  FEWSHOT_POR_NIVEL,
  MAXIMO_PALAVRAS,
  maximoPalavrasDoPacote,
  montarPromptRealizador,
  rodadaDoPacote,
} from "./prompt_template.js";
import { validar } from "./validador.js";
import {
  realizarComCascata,
  segmentarParagrafos,
  ErroRealizacaoEsgotada,
  type OpcoesRealizar,
} from "./cascata.js";
import { realizar } from "./realizar.js";
import {
  ErroProvedorRealizador,
  ErroRecusaRealizador,
  type ProvedorRealizador,
} from "./provedor_realizador.js";
import pacoteGolden from "../fixtures/pacote_golden_v1.json" with { type: "json" };
// GOLDEN — política do 11-03/12-01: NUNCA regenerar para "fazer passar".
// EXCEÇÃO REGISTRADA (P3, censo A1/C1): o golden foi regenerado UMA vez ao
// parametrizar o few-shot pela identidade do Pacote (personalizarExemplo) — o
// exemplo antes fixo em Pietro passou a falar do personagem-golden (Joana, f),
// eliminando o prior de nome/gênero. Mudança MECÂNICA (prosa verbatim), não uma
// reescrita para "passar"; decisão do autor no PR de correção da geração 2.
import promptGolden from "../fixtures/prompt_golden_v1.json" with { type: "json" };
import quintalV3Raw from "../../../docs/quintal.v3.json" with { type: "json" };

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

function assertEqual<T>(real: T, esperado: T, mensagem: string): void {
  const ok = real === esperado;
  if (!ok) {
    console.error(`  ✗ ${mensagem}`);
    console.error(`    esperado: ${JSON.stringify(esperado)}`);
    console.error(`    recebido: ${JSON.stringify(real)}`);
    falhou++;
  } else {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  }
}

// ─── Fixtures inline ─────────────────────────────────────────────────────────

const golden = pacoteGolden as unknown as PacoteComposicao;

/** Pacote mínimo para os testes unitários (matéria dummy; contrato real). */
function pacoteDe(
  linha: string[],
  extra?: Partial<Pick<PacoteComposicao, "nivel" | "personagem" | "eco" | "restricoes">>
): PacoteComposicao {
  return {
    esquema: ESQUEMA_PACOTE_COMPOSICAO_V1,
    cenario: {
      id: "quintal_anoitecer",
      descricao: "um quintal de teste",
      voz_do_contador: "o quintal fala baixinho",
      sensacao_no_personagem: "o friozinho bom da noite",
    },
    personagem: { nome: "Joana", genero: "f" },
    nivel: "n2",
    beats: linha.map((objeto, i) => ({
      objeto,
      papel: i === 0 ? "abertura" : i === linha.length - 1 ? "fecho" : "miolo",
      descricao: `descricao de ${objeto}`,
      corpo: `corpo de ${objeto}`,
      relacoes: [],
    })),
    eco: null,
    restricoes: { paragrafos: 2, palavras_max_por_paragrafo: 40 },
    ...extra,
  };
}

/** Texto FIEL ao Pacote-golden (âncoras + corpo na janela + Joana + ≤55×1.25 palavras). */
const TEXTO_FIEL_GOLDEN = [
  "O quintal sussurra segredos. Joana sente a grama fria e quer ver. Uma luz pisca no fundo e os olhos de Joana seguem a pisca.",
  "Joana segura o pote de vidro com as duas mãos. O vento pula o muro e a pele de Joana sente o fresco.",
].join("\n\n");

/** Texto INFIEL: não menciona o vento (âncora ausente ⇒ FAIL). */
const TEXTO_INFIEL_GOLDEN = [
  "O quintal sussurra segredos. Joana sente a grama fria. Uma luz pisca no fundo e os olhos de Joana seguem a pisca.",
  "Joana segura o pote de vidro com as duas mãos e espia o mundo.",
].join("\n\n");

type PassoFake =
  | { tipo: "texto"; texto: string }
  | { tipo: "recusa" }
  | { tipo: "transitorio" }
  | { tipo: "fatal" };

function provedorFake(nome: string, passos: PassoFake[], contador: { n: number }): ProvedorRealizador {
  let i = 0;
  return {
    nome,
    modeloPadrao: `${nome}-modelo`,
    async gerarTexto() {
      contador.n++;
      const passo = passos[Math.min(i, passos.length - 1)]!;
      i++;
      if (passo.tipo === "recusa") throw new ErroRecusaRealizador("SAFETY fake");
      if (passo.tipo === "transitorio") throw new ErroProvedorRealizador("http_503", true);
      if (passo.tipo === "fatal") throw new ErroProvedorRealizador("http_400", false);
      return { texto: passo.texto, metadados: { modelo: `${nome}-modelo`, tentativas: 1, duracaoMs: 1 } };
    },
  };
}

// ─── 1. Montagem de prompt (12-01) ───────────────────────────────────────────
console.log("=== BLOCO 1 — Montagem: campos do Pacote → instruções ===");
{
  const prompt = montarPromptRealizador(golden);
  assert(prompt.user.includes("LUGAR: um quintal de casa ao cair da noite"), "cenario.descricao vira LUGAR");
  assert(prompt.user.includes("VOZ DO LUGAR: o quintal fala baixinho"), "voz_do_contador vira VOZ DO LUGAR");
  assert(prompt.user.includes("O QUE O LUGAR FAZ SENTIR: o friozinho bom"), "sensacao_no_personagem no bloco do lugar (D-11.2)");
  assert(prompt.user.includes("PERSONAGEM: Joana (menina)"), "personagem nome+gênero na matéria");
  assert(prompt.user.includes("1. vagalume (abertura)") && prompt.user.includes("3. vento (fecho)"), "beats na ordem, com papel");
  assert(prompt.user.includes("INTERAÇÃO (com frasco): a faísca entra no pote"), "relações resolvidas entram como INTERAÇÃO");
  assert(prompt.system.includes("O corpo de Joana guia cada cena"), "Lei 1 parametrizada (corpo é o centro)");
  assert(prompt.system.includes("O lugar é o contador"), "Lei 2 (cenário como contador)");
  assert(prompt.system.includes("Plante a vontade na abertura"), "Lei 3 (desejo plantado, corpo colhido)");
  assert(prompt.system.includes("NÃO troque o nome (Joana), o gênero (menina)"), "proibições parametrizadas — nunca 'Joana' fixo no template");
  assert(prompt.system.includes("tempo PRESENTE"), "achado do ciclo 1: tempo presente");
  assert(prompt.system.includes('Não use "ele" ou "ela" para objetos'), "achado do ciclo 1: regra de anáfora");
  assert(prompt.system.includes("Máximo 55 palavras no total"), "tabela canônica: golden (3 beats ⇒ R1, n2) ⇒ máximo 55 — 'Máximo', nunca 'cerca de'");
  assert(!prompt.system.includes("cerca de"), "instrução branda 'cerca de' banida (evidência do PR #21)");
  assert(prompt.system.includes("2 parágrafos"), "restricoes.paragrafos vira instrução de segmentação (D-12.1)");
  assert(prompt.system.includes("Termine ecoando vagalume"), "eco não-nulo vira instrução de eco");
  assert(prompt.system.includes("EXEMPLOS do nível n2"), "few-shot do nível certo (D-12.2)");
  assert(!prompt.system.includes(FEWSHOT_POR_NIVEL.n1[0]!.saida.slice(0, 40)), "few-shot de OUTRO nível não vaza (exemplo de um envenena o outro)");

  const pietroN1 = pacoteDe(["vagalume", "folha", "vento"], {
    nivel: "n1",
    personagem: { nome: "Pietro", genero: "m" },
    restricoes: { paragrafos: 1, palavras_max_por_paragrafo: 25 },
  });
  const promptN1 = montarPromptRealizador(pietroN1);
  assert(promptN1.system.includes("NÃO troque o nome (Pietro), o gênero (menino)"), "proibições com Pietro/menino");
  assert(promptN1.system.includes("no máximo 2 frases por elemento"), "regras de fusão do n1 (achados do ciclo 1)");
  assert(promptN1.system.includes("repetição coesiva"), "n1: repetição coesiva bem-vinda");
  assert(promptN1.system.includes("máximo 1 fragmento exclamativo") || promptN1.system.includes("No máximo 1 fragmento exclamativo"), "n1: máx. 1 fragmento exclamativo");
  assert(!promptN1.system.includes('"e", "mas", "então", "depois"'), "instrução genérica de fusão SUBSTITUÍDA no n1 (12-05)");
  assert(promptN1.system.includes("Máximo 31 palavras no total"), "n1×R1 ⇒ máximo canônico 31");
  assert(!promptN1.system.includes("Termine ecoando"), "eco nulo ⇒ instrução AUSENTE");
  const soN2 = montarPromptRealizador(pacoteDe(["vagalume", "folha", "vento"])).system;
  assert(soN2.includes('"e", "mas", "então", "depois"'), "n2+: conectivos do semente");

  // Derivação de rodada e tabela (decisões 1 e 2 do PR).
  assertEqual(rodadaDoPacote(pacoteDe(["a", "b", "c"])), 1, "3 beats ⇒ R1");
  assertEqual(rodadaDoPacote(pacoteDe(["a", "b", "c", "d", "e", "f"])), 4, "6 beats ⇒ R4");
  assertEqual(rodadaDoPacote(pacoteDe(["a"])), 1, "1 beat ⇒ clamp R1");
  assertEqual(rodadaDoPacote(pacoteDe(["a", "b", "c", "d", "e", "f", "g", "h"])), 4, "8 beats ⇒ clamp R4");
  assertEqual(MAXIMO_PALAVRAS.n4[3], 403, "ponta canônica R4n4 = 403");
  assertEqual(
    maximoPalavrasDoPacote(pacoteDe(["a", "b", "c", "d", "e", "f"], { nivel: "n1" })),
    71,
    "R4n1 = 71 (ponta proposta)"
  );
}

// ─── 2. Validador (12-03) — cada regra dispara e passa ──────────────────────
console.log("\n=== BLOCO 2 — Validador: dispara/passa por regra ===");
{
  const vFiel = validar(golden, TEXTO_FIEL_GOLDEN, segmentarParagrafos(TEXTO_FIEL_GOLDEN));
  assert(vFiel.pass, `texto fiel ao golden PASSA (motivos: ${vFiel.motivos.join("; ") || "nenhum"})`);
  assert(vFiel.presencaPorBeat["vagalume"] === true && vFiel.presencaPorBeat["vento"] === true, "presença POR BEAT registrada");

  const vInfiel = validar(golden, TEXTO_INFIEL_GOLDEN, segmentarParagrafos(TEXTO_INFIEL_GOLDEN));
  assert(!vInfiel.pass && vInfiel.motivos.some((m) => m.includes('objeto "vento" sem âncora')), "âncora ausente ⇒ FAIL nomeado");

  assert(!validar(golden, "", []).pass, "texto vazio ⇒ FAIL");

  // Orvalho (herança 4): "Gotas" plural agora casa via gota*.
  const pacoteOrvalho = pacoteDe(["orvalho"], { restricoes: { paragrafos: 1, palavras_max_por_paragrafo: 40 } });
  const vOrvalho = validar(pacoteOrvalho, "Gotas brilham na grama e o pé de Joana sente o frio.", ["x"]);
  assert(!vOrvalho.motivos.some((m) => m.includes("orvalho")), 'correção do orvalho: "Gotas" (plural) casa via prefixo gota*');

  // Gênero bidirecional.
  const base = pacoteDe(["vagalume"], { restricoes: { paragrafos: 1, palavras_max_por_paragrafo: 40 } });
  const comCorpo = "e os olhos de Joana seguem a luz.";
  assert(
    validar(base, `O menino vê a luz ${comCorpo}`, ["x"]).motivos.some((m) => m.includes('palavra do gênero oposto ("menino")')),
    "menino num Pacote f ⇒ FAIL"
  );
  assert(
    validar(base, `A luz pisca e o Joana vê ${comCorpo}`, ["x"]).motivos.some((m) => m.includes("artigo do gênero oposto")),
    "artigo oposto antes do nome ⇒ FAIL"
  );
  assert(
    validar(base, `Quieto, Joana segue a luz com os olhos.`, ["x"]).motivos.some((m) => m.includes("flexão predicativa")),
    "flexão predicativa oposta ⇒ FAIL"
  );
  const pietro = pacoteDe(["vagalume"], {
    personagem: { nome: "Pietro", genero: "m" },
    restricoes: { paragrafos: 1, palavras_max_por_paragrafo: 40 },
  });
  assert(
    validar(pietro, `A menina vê a luz e os olhos de Pietro seguem.`, ["x"]).motivos.some((m) => m.includes('("menina")')),
    "bidirecional: menina num Pacote m ⇒ FAIL"
  );

  // Crescimento sobre o MÁXIMO CANÔNICO (n1×R1=31; teto 31×1.25=38.75).
  const n1 = pacoteDe(["vagalume", "folha", "vento"], { nivel: "n1", restricoes: { paragrafos: 1, palavras_max_por_paragrafo: 25 } });
  const curto = "A luz pisca e os olhos de Joana seguem. A folha desce e o dedo de Joana segue. O vento pula o muro e a pele de Joana sente.";
  const vCurto = validar(n1, curto, [curto]);
  assert(!vCurto.motivos.some((m) => m.includes("crescimento")), "texto dentro do máximo canônico ⇒ sem motivo de crescimento");
  const longo = curto + " " + "palavra ".repeat(20).trim() + ".";
  assert(
    validar(n1, longo, [longo]).motivos.some((m) => m.includes("crescimento") && m.includes("máximo canônico de 31")),
    "texto acima de 31×1.25 ⇒ FAIL de crescimento citando o máximo canônico"
  );

  // Ritmo n1 — GATE.
  const picado =
    "A luz pisca. Os olhos de Joana seguem. A folha desce. O dedo segue. O vento pula. A pele sente. O quintal fala.";
  assert(
    validar(n1, picado, [picado]).motivos.some((m) => m.includes("ritmo n1 estourado")),
    "7 pontos / 3 beats ⇒ ritmo n1 REPROVA (gate)"
  );
  assert(vCurto.ritmoN1 !== undefined && vCurto.ritmoN1.ok, "ritmoN1 reportado e ok no texto curto");
  assert(validar(golden, TEXTO_FIEL_GOLDEN, ["a", "b"]).ritmoN1 === undefined, "ritmo n1 não se aplica fora do n1");

  // Avisos: parágrafos e tempo verbal.
  assert(
    validar(golden, TEXTO_FIEL_GOLDEN, [TEXTO_FIEL_GOLDEN]).avisos.some((a) => a.includes("parágrafos fora do alvo: 1")),
    "desvio de parágrafos ⇒ AVISO (não gate)"
  );
  const passado = TEXTO_FIEL_GOLDEN.replace("sussurra segredos", "sussurrou segredos").replace("pula o muro", "pulou o muro");
  const vPassado = validar(golden, passado, segmentarParagrafos(passado));
  assert(vPassado.avisos.some((a) => a.includes("tempo passado")), "pretérito acima do limiar ⇒ AVISO de tempo verbal");
  assert(vPassado.pass, "tempo verbal é aviso, não gate");
}

// ─── 3. Cascata (12-04) — provedores fake ────────────────────────────────────
console.log("\n=== BLOCO 3 — Cascata: provedor/fidelidade/teto/fallback/origem ===");
{
  const prompt = montarPromptRealizador(golden);
  const opcoes: OpcoesRealizar = { temperatura: 0.4 };

  // Sucesso no 1º provedor.
  {
    const c = { n: 0 };
    const r = await realizarComCascata(golden, prompt, [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c)], opcoes);
    assert(r.veredito.pass && r.origem.fonte === "llm" && r.origem.provedor === "alpha", "sucesso ⇒ origem llm/alpha");
    assertEqual(r.metadados.chamadas, 1, "1 chamada no sucesso direto");
    assertEqual(r.paragrafos.length, 2, "paragrafos segmentados pela linha em branco");
  }
  // Recusa pula o provedor (não repete).
  {
    const c1 = { n: 0 }, c2 = { n: 0 };
    const r = await realizarComCascata(
      golden, prompt,
      [provedorFake("alpha", [{ tipo: "recusa" }], c1), provedorFake("beta", [{ tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c2)],
      opcoes
    );
    assert(r.origem.provedor === "beta" && c1.n === 1, "recusa ⇒ pula direto ao próximo (1 chamada no recusado)");
  }
  // 5xx transitório ⇒ retry curto no MESMO provedor.
  {
    const c = { n: 0 };
    const r = await realizarComCascata(
      golden, prompt,
      [provedorFake("alpha", [{ tipo: "transitorio" }, { tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c)],
      opcoes
    );
    assert(r.origem.provedor === "alpha" && c.n === 2, "5xx ⇒ retry 1× no mesmo provedor, depois sucesso");
  }
  // Erro fatal (400) não retenta no mesmo.
  {
    const c1 = { n: 0 }, c2 = { n: 0 };
    const r = await realizarComCascata(
      golden, prompt,
      [provedorFake("alpha", [{ tipo: "fatal" }], c1), provedorFake("beta", [{ tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c2)],
      opcoes
    );
    assert(c1.n === 1 && r.origem.provedor === "beta", "erro não-transitório ⇒ sem retry, próximo da cascata");
  }
  // FAIL de fidelidade ⇒ próximo provedor (1 tentativa por provedor).
  {
    const c1 = { n: 0 }, c2 = { n: 0 };
    const r = await realizarComCascata(
      golden, prompt,
      [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_INFIEL_GOLDEN }], c1), provedorFake("beta", [{ tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c2)],
      opcoes
    );
    assert(c1.n === 1 && r.veredito.pass && r.origem.provedor === "beta", "fidelidade FAIL ⇒ 1 tentativa e próximo provedor");
  }
  // Teto global de 4 chamadas.
  {
    const contadores = [0, 1, 2, 3, 4].map(() => ({ n: 0 }));
    const provedores = contadores.map((c, i) => provedorFake(`p${i}`, [{ tipo: "texto", texto: TEXTO_INFIEL_GOLDEN }], c));
    let erro: unknown;
    try {
      await realizarComCascata(golden, prompt, provedores, opcoes);
    } catch (e) {
      erro = e;
    }
    const total = contadores.reduce((s, c) => s + c.n, 0);
    assertEqual(total, 4, "teto GLOBAL de 4 chamadas de LLM (5º provedor nunca chamado)");
    assert(erro instanceof ErroRealizacaoEsgotada, "cascata esgotada sem fallback ⇒ erro explícito de aplicação");
    assert(
      erro instanceof ErroRealizacaoEsgotada && erro.ultima !== undefined && erro.ultima.veredito.pass === false,
      "erro carrega a última tentativa (calibração) — FAIL nunca sai como sucesso"
    );
  }
  // Fallback final = A+ v3 (montar chamado como função; composicao.ts intocado).
  {
    const quintal = (quintalV3Raw as { cenario: unknown }).cenario as CenarioV2;
    const estadoFallback: EstadoComp = {
      cenarioId: quintal.id,
      rodada: 1,
      banco: [],
      linha: ["vagalume", "frasco", "vento"],
      pontasTravadas: true,
      historiaTexto: "",
      convergiu: false,
      cenario: quintal,
      modos: { desfecho: "convergente" },
    };
    const c = { n: 0 };
    const r = await realizarComCascata(
      golden, prompt,
      [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_INFIEL_GOLDEN }], c)],
      { ...opcoes, estadoFallback: { estado: estadoFallback, nivel: "n2" } }
    );
    assert(r.origem.fonte === "fallback-a-mais", "cascata esgotada + estadoFallback ⇒ origem fallback-a-mais");
    assert(r.texto.length > 0 && r.texto === montar(estadoFallback, "n2"), "texto do fallback = montar() do v3 (determinístico)");
    assert(r.veredito.pass && r.veredito.avisos.some((a) => a.includes("fallback A+ v3")), "fallback é fiel por construção, com aviso de origem");
  }
}

// ─── 4. realizar() — fronteiras (12-00) ──────────────────────────────────────
console.log("\n=== BLOCO 4 — realizar(): esquema, provedores, shape ===");
{
  let erroEsquema: unknown;
  try {
    await realizar({ ...golden, esquema: "pipoca.pacote-composicao.v9" } as unknown as PacoteComposicao);
  } catch (e) {
    erroEsquema = e;
  }
  assert(erroEsquema instanceof Error && erroEsquema.message.includes("esquema desconhecido"), "esquema desconhecido ⇒ rejeição explícita");

  let erroSemProvedor: unknown;
  try {
    await realizar(golden, {});
  } catch (e) {
    erroSemProvedor = e;
  }
  assert(erroSemProvedor instanceof Error && erroSemProvedor.message.includes("nenhum provedor configurado"), "sem provedor e sem fallback ⇒ erro explícito");

  const c = { n: 0 };
  const r = await realizar(golden, { provedores: [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL_GOLDEN }], c)] });
  assert(
    typeof r.texto === "string" && Array.isArray(r.paragrafos) && typeof r.veredito.pass === "boolean" && r.origem.fonte === "llm" && typeof r.metadados.chamadas === "number",
    "shape completo: { texto, paragrafos, veredito, origem, metadados }"
  );
}

// ─── 5. Golden do prompt — congelado ─────────────────────────────────────────
console.log("\n=== BLOCO 5 — Golden: prompt do Pacote-golden byte a byte ===");
{
  const prompt = montarPromptRealizador(golden);
  assertEqual(
    JSON.stringify(prompt, null, 2),
    JSON.stringify(promptGolden, null, 2),
    "montarPromptRealizador(Pacote-golden) ≡ prompt_golden_v1.json (nunca regenerar para passar)"
  );
}

// ─── Total ───────────────────────────────────────────────────────────────────
console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) {
  throw new Error(`${falhou} teste(s) falharam`);
}
