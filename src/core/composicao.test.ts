/**
 * Pipoca — Testes do motor de composição A+ (composicao.test.ts)
 * ---------------------------------------------------------------
 * Os 7 blocos do contrato grafo-autoral-v3 §6. Rodam sem IA, ASR ou UI.
 * Execute com: bun run src/core/composicao.test.ts
 */

import {
  montar,
  mioloAtual,
  podeCompor,
  compor,
  type CenarioV2,
  type EstadoComp,
  type ModosComp,
  type TextoV3,
} from "./composicao.js";
import { lintGrafoV3 } from "./lint_grafo.js";
// Compat v2 AUTOCONTIDA: a fixture golden carrega o grafo v2 integral no campo
// `grafo` (o quintal.v2.json de runtime foi arquivado em old/dados/ na Etapa D
// da implantação do A+ — o teste de compat v2≡v3 do leitor existe para sempre
// sem depender de arquivo de runtime).
import golden from "./fixtures/composicao_golden_v2.json" with { type: "json" };
import goldenV3 from "./fixtures/composicao_golden_v3.json" with { type: "json" };
import quintalV3Raw from "../../docs/quintal.v3.json" with { type: "json" };

const quintalRaw = golden.grafo;

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

/** Célula de 1 variante com o mesmo texto nos 4 níveis. */
function celula(marca: string): TextoV3 {
  return { n1: marca, n2: marca, n3: marca, n4: marca };
}

/** Célula com 3 variantes reais nos 4 níveis. */
function celulaVariantes(prefixo: string): TextoV3 {
  const pool = [`${prefixo}-v1.`, `${prefixo}-v2.`, `${prefixo}-v3.`];
  return { n1: pool, n2: pool, n3: pool, n4: pool };
}

/** EstadoComp literal — montar só lê cenario/linha/rodada/modos. */
function estadoDe(cenario: CenarioV2, linha: string[], rodada: number, modos: ModosComp): EstadoComp {
  return {
    cenarioId: cenario.id,
    rodada,
    banco: [],
    linha,
    pontasTravadas: true,
    historiaTexto: "",
    convergiu: false,
    cenario,
    modos,
  };
}

/** Mini-grafo v3 com variantes reais e conectivos (blocos 1 e 2). */
function miniVariantes(): CenarioV2 {
  const ids = ["a", "b", "c", "d", "e", "f"];
  return {
    id: "mini_v3",
    moldura: {
      abertura: celulaVariantes("ABRE"),
      conectivos: {
        n1: ["Aí,", "Então,"],
        n2: ["Aí,", "Então,", "Depois,"],
        n3: ["Foi então que", "Pouco depois,"],
        n4: ["Foi então que", "Pouco depois,"],
      },
      desfecho: { convergente: celulaVariantes("FIM") },
    },
    rodadas: [{ n: 1, revela: ids, escolhe: ids.length }],
    objetos: Object.fromEntries(ids.map((id) => [id, { conta: celulaVariantes("OBJ" + id.toUpperCase()) }])),
  };
}

/** Mini-grafo de conectivos com marcadores únicos e pool de 2 (bloco 6). */
function miniConectivos(): CenarioV2 {
  const ids = ["a", "b", "c", "d", "e", "f"];
  return {
    id: "mini_con",
    moldura: {
      abertura: celula("ABRE."),
      conectivos: { n2: ["Aí,", "Então,"] },
      desfecho: { convergente: celula("FIM.") },
    },
    rodadas: [{ n: 1, revela: ids, escolhe: ids.length }],
    objetos: Object.fromEntries(ids.map((id) => [id, { conta: celula(`OBJ_${id.toUpperCase()}.`) }])),
  };
}

/** Grafo de 3 objetos onde `b` tem UM tempero com a condição sob teste (bloco 3). */
function grafoCond(se: string | string[]): CenarioV2 {
  return {
    id: "cond",
    moldura: { abertura: celula("ABRE."), desfecho: { convergente: celula("FIM.") } },
    rodadas: [{ n: 1, revela: ["a", "b", "c"], escolhe: 3 }],
    objetos: {
      a: { conta: celula("A_BASE.") },
      b: { conta: celula("B_BASE."), tempera: [{ se, entao: celula("B_TEMP.") }] },
      c: { conta: celula("C_BASE.") },
    },
  };
}

/** true se o tempero de `b` (condição `se`) casou para a linha dada. */
function temperoAtivo(se: string | string[], linha: string[]): boolean {
  return montar(estadoDe(grafoCond(se), linha, 1, {}), "n2").includes("B_TEMP.");
}

/** Grafo de ecos: se_comecou_com / se_terminou_com / composto (bloco 4). */
function grafoEcos(maxEcos?: number): CenarioV2 {
  return {
    id: "ecos",
    moldura: {
      abertura: celula("ABRE."),
      desfecho: {
        convergente: celula("CONV."),
        max_ecos: maxEcos,
        aberto: [
          { se_comecou_com: "a", fragmento: celula("ECO_A.") },
          { se_terminou_com: "c", fragmento: celula("ECO_C.") },
          { se_comecou_com: "a", se_terminou_com: "c", fragmento: celula("ECO_AC.") },
        ],
      },
    },
    rodadas: [{ n: 1, revela: ["a", "b", "c"], escolhe: 3 }],
    objetos: { a: { conta: celula("A.") }, b: { conta: celula("B.") }, c: { conta: celula("C.") } },
  };
}

// ─── 1. Determinismo ─────────────────────────────────────────────────────────
console.log("\n=== BLOCO 1 — Determinismo: mesma linha + nível ⇒ texto idêntico (100×) ===");
{
  const g = miniVariantes();
  const linha = ["a", "b", "c", "d", "e", "f"];
  for (const nivel of ["n1", "n2", "n3", "n4"] as const) {
    const primeiro = montar(estadoDe(g, linha, 1, { desfecho: "convergente" }), nivel);
    let iguais = true;
    for (let i = 0; i < 100; i++) {
      if (montar(estadoDe(g, linha, 1, { desfecho: "convergente" }), nivel) !== primeiro) iguais = false;
    }
    assert(iguais && primeiro.length > 0, `replay ${nivel}: 100 montagens idênticas`);
  }
}

// ─── 2. Sensibilidade ────────────────────────────────────────────────────────
console.log("\n=== BLOCO 2 — Sensibilidade: mesmos objetos, ordens distintas ⇒ textos distintos ===");
{
  const g = miniVariantes();
  const rA = montar(estadoDe(g, ["a", "b", "c", "d", "e", "f"], 1, {}), "n2");
  const rB = montar(estadoDe(g, ["f", "b", "c", "d", "e", "a"], 1, {}), "n2");
  const rC = montar(estadoDe(g, ["a", "c", "b", "d", "e", "f"], 1, {}), "n2");
  assert(rA !== rB, "pontas trocadas ⇒ texto distinto");
  assert(rA !== rC, "miolo permutado ⇒ texto distinto");
  assert(!rA.includes("undefined") && !rB.includes("undefined"), "sem undefined nos textos");
}

// ─── 3. Gramática de condições ───────────────────────────────────────────────
console.log("\n=== BLOCO 3 — Gramática: cada condição, AND, precedência, func:* ===");
{
  assert(temperoAtivo("tem:c", ["a", "b", "c"]), "tem:c casa quando c está na linha");
  assert(!temperoAtivo("tem:c", ["a", "b"]), "tem:c não casa sem c");
  assert(!temperoAtivo("tem:b", ["a", "b", "c"]), "tem:<próprio id> nunca casa (guarda v2)");

  assert(temperoAtivo("nao_tem:c", ["a", "b"]), "nao_tem:c casa quando c ausente");
  assert(!temperoAtivo("nao_tem:c", ["a", "b", "c"]), "nao_tem:c não casa com c presente");

  assert(temperoAtivo("pos:inicio", ["b", "a", "c"]), "pos:inicio casa com b na frente");
  assert(!temperoAtivo("pos:inicio", ["a", "b", "c"]), "pos:inicio não casa com b no miolo");
  assert(temperoAtivo("pos:fim", ["a", "c", "b"]), "pos:fim casa com b no fim");
  assert(!temperoAtivo("pos:fim", ["a", "b", "c"]), "pos:fim não casa com b no miolo");
  assert(temperoAtivo("pos:miolo", ["a", "b", "c"]), "pos:miolo casa com b no interior");
  assert(!temperoAtivo("pos:miolo", ["b", "a", "c"]), "pos:miolo não casa com b na ponta");

  assert(temperoAtivo("antes_de:c", ["a", "b", "c"]), "antes_de:c casa com b antes de c");
  assert(!temperoAtivo("antes_de:c", ["c", "b", "a"]), "antes_de:c não casa com b depois de c");
  assert(!temperoAtivo("antes_de:c", ["a", "b"]), "antes_de:c não casa com c ausente");
  assert(temperoAtivo("depois_de:a", ["a", "b", "c"]), "depois_de:a casa com b depois de a");
  assert(!temperoAtivo("depois_de:a", ["b", "a", "c"]), "depois_de:a não casa com b antes de a");
  assert(!temperoAtivo("depois_de:a", ["b", "c"]), "depois_de:a não casa com a ausente");

  assert(!temperoAtivo("func:chamada", ["a", "b", "c"]), "func:* (reservado) nunca casa");
  assert(!temperoAtivo("qualquer:coisa", ["a", "b", "c"]), "condição desconhecida nunca casa (nem lança)");

  assert(temperoAtivo(["tem:c", "pos:fim"], ["a", "c", "b"]), "AND: todas casam ⇒ casa");
  assert(!temperoAtivo(["tem:c", "pos:inicio"], ["a", "c", "b"]), "AND: uma falha ⇒ não casa");

  // Precedência: temperos na ordem do array, primeiro que casa vence.
  const gPrec = grafoCond("tem:c");
  gPrec.objetos.b.tempera = [
    { se: "tem:c", entao: celula("PRIMEIRO.") },
    { se: "tem:a", entao: celula("SEGUNDO.") },
  ];
  const rPrec = montar(estadoDe(gPrec, ["a", "b", "c"], 1, {}), "n2");
  assert(rPrec.includes("PRIMEIRO.") && !rPrec.includes("SEGUNDO."), "precedência: primeiro tempero que casa vence");

  // Regra v2 preservada: tempero que casa mas não tem o nível ⇒ segue para o próximo.
  const gNivel = grafoCond("tem:c");
  gNivel.objetos.b.tempera = [
    { se: "tem:c", entao: { n1: "SO_N1." } },
    { se: "tem:a", entao: celula("COMPLETO.") },
  ];
  const rNivel = montar(estadoDe(gNivel, ["a", "b", "c"], 1, {}), "n2");
  assert(rNivel.includes("COMPLETO."), "tempero sem o nível pedido cede a vez (regra v2)");
}

// ─── 4. Ecos no desfecho ─────────────────────────────────────────────────────
console.log("\n=== BLOCO 4 — Ecos: se_comecou_com, composto, max_ecos, fallback ===");
{
  const aberto: ModosComp = { desfecho: "aberto" };

  const r1 = montar(estadoDe(grafoEcos(), ["a", "b", "c"], 1, aberto), "n2");
  assert(r1.includes("ECO_A."), "se_comecou_com:a ecoa a âncora inicial");
  assert(!r1.includes("ECO_C.") && !r1.includes("CONV."), "max_ecos default 1: apenas o primeiro eco");

  const r2 = montar(estadoDe(grafoEcos(2), ["a", "b", "c"], 1, aberto), "n2");
  assert(r2.includes("ECO_A.") && r2.includes("ECO_C."), "max_ecos:2 concatena dois ecos na ordem do array");
  assert(!r2.includes("ECO_AC."), "max_ecos:2 respeita o teto (composto fica de fora)");

  const r3 = montar(estadoDe(grafoEcos(3), ["a", "b", "c"], 1, aberto), "n2");
  assert(r3.includes("ECO_A.") && r3.includes("ECO_C.") && r3.includes("ECO_AC."), "max_ecos:3 inclui o eco composto");
  assert(r3.indexOf("ECO_A.") < r3.indexOf("ECO_C.") && r3.indexOf("ECO_C.") < r3.indexOf("ECO_AC."), "ecos na ordem do array");

  const gComposto = grafoEcos(1);
  gComposto.moldura.desfecho.aberto = [{ se_comecou_com: "a", se_terminou_com: "c", fragmento: celula("ECO_AC.") }];
  assert(
    montar(estadoDe(gComposto, ["a", "b", "c"], 1, aberto), "n2").includes("ECO_AC."),
    "composto início+fim casa quando ambos batem"
  );
  assert(
    montar(estadoDe(gComposto, ["c", "b", "a"], 1, aberto), "n2").includes("CONV."),
    "composto não casa ⇒ fallback convergente (comportamento v2)"
  );

  const rConv = montar(estadoDe(grafoEcos(3), ["a", "b", "c"], 1, { desfecho: "convergente" }), "n2");
  assert(rConv.includes("CONV.") && !rConv.includes("ECO_A."), "modo convergente ignora os ecos");
}

// ─── 5. Compat golden v2 ─────────────────────────────────────────────────────
console.log("\n=== BLOCO 5 — Compat golden: leitor v3 reproduz o texto v2 byte a byte ===");
{
  const quintal = quintalRaw.cenario as unknown as CenarioV2;
  for (const caso of golden.casos) {
    const est = estadoDe(quintal, caso.linha, caso.rodada, caso.modos as ModosComp);
    assertEqual(
      montar(est, caso.nivel),
      caso.texto,
      `golden R${caso.rodada} ${caso.nivel} ${(caso.modos as ModosComp).desfecho} [${caso.linha.join(",")}]`
    );
  }
}

// ─── 6. Conectivos ───────────────────────────────────────────────────────────
console.log("\n=== BLOCO 6 — Conectivos: só no miolo, sem repetição consecutiva, ausentes sem pool ===");
{
  const g = miniConectivos();
  const linhas = [
    ["a", "b", "c", "d", "e", "f"],
    ["f", "e", "d", "c", "b", "a"],
    ["b", "d", "a", "f", "c", "e"],
  ];
  for (const linha of linhas) {
    const r = montar(estadoDe(g, linha, 1, {}), "n2");
    const primeiro = `OBJ_${linha[0].toUpperCase()}.`;
    const ultimo = `OBJ_${linha[linha.length - 1].toUpperCase()}.`;
    assert(
      !new RegExp(`(Aí,|Então,) ${primeiro.replace(".", "\\.")}`).test(r) &&
        !new RegExp(`(Aí,|Então,) ${ultimo.replace(".", "\\.")}`).test(r),
      `âncoras sem conectivo [${linha.join(",")}]`
    );
    const miolosOk = linha.slice(1, -1).every((id) =>
      new RegExp(`(Aí,|Então,) OBJ_${id.toUpperCase()}\\.`).test(r)
    );
    assert(miolosOk, `todos os slots de miolo com conectivo [${linha.join(",")}]`);
    const seq = [...r.matchAll(/(Aí,|Então,)/g)].map((m) => m[1]);
    assert(seq.length === linha.length - 2, `um conectivo por slot de miolo [${linha.join(",")}]`);
    assert(seq.every((c, i) => i === 0 || c !== seq[i - 1]), `sem repetição consecutiva [${linha.join(",")}]`);
  }
  const rN1 = montar(estadoDe(g, ["a", "b", "c", "d", "e", "f"], 1, {}), "n1");
  assert(!/Aí,|Então,/.test(rN1), "nível sem pool declarado ⇒ sem conectivo");
  const rSem = montar(estadoDe(grafoCond("tem:c"), ["a", "b", "c"], 1, {}), "n2");
  assert(!/Aí,|Então,/.test(rSem), "grafo sem conectivos (v2) ⇒ nenhum conectivo");
}

// ─── 7. Lint autoral ─────────────────────────────────────────────────────────
console.log("\n=== BLOCO 7 — Lint: erros v3, avisos v2/v3 ===");
{
  const V3 = "pipoca.grafo-autoral.v3";
  const V2 = "pipoca.grafo-autoral.v2";

  const valido = (): CenarioV2 => ({
    id: "lint_ok",
    moldura: {
      abertura: celula("ABRE."),
      conectivos: { n1: ["Aí,", "Então,"], n2: ["De repente,"] },
      desfecho: { convergente: celula("FIM."), aberto: [{ se_terminou_com: "a", fragmento: celula("ECO.") }] },
    },
    rodadas: [{ n: 1, revela: ["a"], escolhe: 1 }],
    objetos: { a: { genero: "m", numero: "sg", conta: celula("A."), tempera: [{ se: "tem:b", entao: celula("T.") }] } },
  });

  const rOk = lintGrafoV3(valido(), V3);
  assert(rOk.erros.length === 0 && rOk.avisos.length === 0, "grafo v3 completo passa limpo");

  const semNivel = valido();
  semNivel.objetos.a.conta = { n1: "A.", n2: "A.", n4: "A." }; // falta n3
  assert(lintGrafoV3(semNivel, V3).erros.some((e) => e.includes("n3")), "célula sem os 4 níveis ⇒ erro");

  const arrayVazio = valido();
  arrayVazio.objetos.a.conta = { n1: [], n2: "A.", n3: "A.", n4: "A." };
  assert(lintGrafoV3(arrayVazio, V3).erros.some((e) => e.includes("vazio")), "array de variantes vazio ⇒ erro");

  const semMeta = valido();
  delete semMeta.objetos.a.genero;
  delete semMeta.objetos.a.numero;
  const rMeta = lintGrafoV3(semMeta, V3);
  assert(
    rMeta.erros.some((e) => e.includes("genero")) && rMeta.erros.some((e) => e.includes("numero")),
    "objeto sem genero/numero ⇒ erro"
  );

  const conectivoLongo = valido();
  conectivoLongo.moldura.conectivos = { n1: ["De repente,"] };
  assert(
    lintGrafoV3(conectivoLongo, V3).erros.some((e) => e.includes("mais de 1 palavra")),
    "conectivo n1 com mais de 1 palavra ⇒ erro"
  );

  const comFunc = valido();
  comFunc.objetos.a.tempera = [{ se: "func:chamada", entao: celula("T.") }];
  assert(lintGrafoV3(comFunc, V3).avisos.some((a) => a.includes("func:")), "func:* ⇒ aviso (v3)");
  assert(lintGrafoV3(comFunc, V2).avisos.some((a) => a.includes("func:")), "func:* ⇒ aviso também no v2");

  const desconhecida = valido();
  desconhecida.objetos.a.tempera = [{ se: "qualquer:coisa", entao: celula("T.") }];
  assert(lintGrafoV3(desconhecida, V3).avisos.some((a) => a.includes("desconhecida")), "condição desconhecida ⇒ aviso");

  const v2Incompleto = valido();
  delete v2Incompleto.objetos.a.genero;
  assert(lintGrafoV3(v2Incompleto, V2).erros.length === 0, "regras de erro não se aplicam a grafo v2");

  const quintal = quintalRaw.cenario as unknown as CenarioV2;
  const rQuintal = lintGrafoV3(quintal, V2);
  assert(rQuintal.erros.length === 0 && rQuintal.avisos.length === 0, "quintal.v2.json publicado passa sem erros nem avisos");
}

// ─── 8. Golden v3 — o grafo ATIVO (docs/quintal.v3.json) congelado ───────────
console.log("\n=== BLOCO 8 — Golden v3: grafo ativo reproduzido byte a byte + lint 0/0 ===");
{
  const quintalV3 = quintalV3Raw.cenario as unknown as CenarioV2;
  for (const caso of goldenV3.casos) {
    const est = estadoDe(quintalV3, caso.linha, caso.rodada, caso.modos as ModosComp);
    assertEqual(
      montar(est, caso.nivel),
      caso.texto,
      `golden v3 R${caso.rodada} ${caso.nivel} ${(caso.modos as ModosComp).desfecho} [${caso.linha.join(",")}]`
    );
  }
  const rV3 = lintGrafoV3(quintalV3, quintalV3Raw.esquema);
  assert(
    rV3.erros.length === 0 && rV3.avisos.length === 0,
    "quintal.v3.json publicado passa o lint sem erros nem avisos"
  );
}

// ─── 9. Reposicionar o miolo nas rodadas (compor) ────────────────────────────
console.log("\n=== BLOCO 9 — Compor R>=2: inserir a peça nova + reordenar o miolo, pontas fixas ===");
{
  // Cenário com 2 rodadas: R1 revela [a,b,c,z], R2 revela [d]. reveladosAte(2)
  // = [a,b,c,z,d]; com a linha [a,b,c] fixada, o banco tem [z,d].
  const g: CenarioV2 = {
    id: "compor",
    moldura: { abertura: celula("ABRE."), desfecho: { convergente: celula("FIM.") } },
    rodadas: [
      { n: 1, revela: ["a", "b", "c", "z"], escolhe: 3 },
      { n: 2, revela: ["d"], escolhe: 1 },
    ],
    objetos: {
      a: { conta: celula("A.") },
      b: { conta: celula("B.") },
      c: { conta: celula("C.") },
      d: { conta: celula("D.") },
      z: { conta: celula("Z.") },
    },
  };
  // Estado R2 fixado: linha [a,b,c] (a,c âncoras · b miolo), banco [z,d].
  const est: EstadoComp = {
    cenarioId: g.id, rodada: 2, banco: ["z", "d"], linha: ["a", "b", "c"],
    pontasTravadas: true, historiaTexto: "", convergiu: false, cenario: g, modos: {},
  };

  assertEqual(mioloAtual(est).join(","), "b", "miolo atual = interior entre as âncoras");

  assert(podeCompor(est, "d", ["b", "d"]), "compor válido: nova peça d após o miolo b");
  assert(podeCompor(est, "d", ["d", "b"]), "compor válido: nova peça d antes do miolo b");
  assert(!podeCompor(est, "d", ["b"]), "inválido: ordemMiolo sem a peça nova");
  assert(!podeCompor(est, "d", ["b", "d", "b"]), "inválido: id repetido no miolo");
  assert(!podeCompor(est, "d", ["a", "b", "d"]), "inválido: âncora não entra no miolo");
  assert(!podeCompor(est, "z2", ["b", "z2"]), "inválido: peça fora do banco");
  assert(!podeCompor(est, "a", ["b", "a"]), "inválido: peça já na linha (âncora)");
  assert(!podeCompor({ ...est, rodada: 1 }, "d", ["b", "d"]), "inválido: R1 não usa compor");
  assert(!podeCompor({ ...est, pontasTravadas: false }, "d", ["b", "d"]), "inválido: pontas não travadas");

  const r1 = compor(est, "d", ["b", "d"]);
  assertEqual(r1.linha.join(","), "a,b,d,c", "compor [b,d]: linha = a,b,d,c (pontas fixas)");
  const r2 = compor(est, "d", ["d", "b"]);
  assertEqual(r2.linha.join(","), "a,d,b,c", "compor [d,b]: linha = a,d,b,c (pontas fixas)");
  assertEqual(r1.linha[0], "a", "âncora inicial preservada");
  assertEqual(r1.linha[r1.linha.length - 1], "c", "âncora final preservada");
  assertEqual(compor(est, "d", ["b"]).linha.join(","), "a,b,c", "compor inválido devolve estado inalterado");
  assert(r1.banco.indexOf("d") === -1, "após compor, a peça nova sai do banco");

  // Sensibilidade: permutar o miolo muda o texto tecido.
  assert(montar(r1, "n2") !== montar(r2, "n2"), "miolo em ordem distinta ⇒ história distinta");

  // Reordenar o miolo já existente (R3): 2 peças no interior, âncoras fixas.
  const estR3: EstadoComp = {
    cenarioId: g.id, rodada: 3, banco: ["e"], linha: ["a", "b", "d", "c"],
    pontasTravadas: true, historiaTexto: "", convergiu: false,
    cenario: { ...g, rodadas: [...g.rodadas, { n: 3, revela: ["e"], escolhe: 1 }],
      objetos: { ...g.objetos, e: { conta: celula("E.") } } }, modos: {},
  };
  assertEqual(mioloAtual(estR3).join(","), "b,d", "R3 miolo atual = b,d");
  assert(podeCompor(estR3, "e", ["d", "e", "b"]), "R3: reordenar b,d e inserir e é válido");
  assertEqual(compor(estR3, "e", ["d", "e", "b"]).linha.join(","), "a,d,e,b,c", "R3: linha final respeita miolo escolhido, pontas fixas");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
