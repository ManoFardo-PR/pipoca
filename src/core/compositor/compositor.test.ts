/**
 * Pipoca — Testes do compositor (compositor.test.ts)
 * --------------------------------------------------
 * Os 6 blocos obrigatórios de docs/plans02/fase11_a_mais_compositor/11-03:
 * determinismo (100×), ordem sagrada dos beats, teto/precedência D5, papéis,
 * falha explícita e golden. Blocos 1–5 usam catálogo mínimo em memória; o
 * bloco 6 usa as células canônicas/ilustrativas do exemplo do 11-00 — nenhum
 * bloco depende de docs/fichas/ no disco (por design, 11-03).
 * RODA POR: bun run src/core/compositor/compositor.test.ts (parte de `bun run test`)
 */

import type { FichaIdentidade, FichaRelacao, PorNivel } from "../fichas/tipos.js";
import { ESQUEMA_FICHAS_V1 } from "../fichas/tipos.js";
import type { CatalogoFichas, EstadoCompositor, PerfilCompositor } from "./pacote.js";
import { compor } from "./compor.js";
import { avaliarCondicao, casaSe, selecionarRelacoes } from "./gramatica.js";
// GOLDEN — política do 11-03: NUNCA regenerar para "fazer passar". Regeneração
// só com decisão registrada (novo esquema `.v2` ou correção documentada).
import golden from "../fixtures/pacote_golden_v1.json" with { type: "json" };

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

function assertLanca(fn: () => unknown, trecho: string, mensagem: string): void {
  try {
    fn();
    console.error(`  ✗ ${mensagem} (não lançou)`);
    falhou++;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.indexOf(trecho) !== -1) {
      console.log(`  ✓ ${mensagem}`);
      passou++;
    } else {
      console.error(`  ✗ ${mensagem} (erro sem "${trecho}": ${msg})`);
      falhou++;
    }
  }
}

// ─── Fixtures inline (catálogo mínimo em memória) ────────────────────────────

/** Célula com o mesmo texto marcado nos 4 níveis. */
function celula4(marca: string): PorNivel {
  return { n1: `${marca} n1`, n2: `${marca} n2`, n3: `${marca} n3`, n4: `${marca} n4` };
}

function identidade(id: string): FichaIdentidade {
  return {
    genero: "m",
    numero: "sg",
    descricao: celula4(`descricao de ${id}`),
    sensacao: { dominante: "visão", registro: "encanto", corpo: celula4(`corpo de ${id}`) },
  };
}

function catalogo(objetos: string[], relacoes: FichaRelacao[] = []): CatalogoFichas {
  const mapa: Record<string, FichaIdentidade> = {};
  for (const id of objetos) mapa[id] = identidade(id);
  return {
    objetos: { esquema: ESQUEMA_FICHAS_V1, objetos: mapa },
    relacoes: {
      esquema: ESQUEMA_FICHAS_V1,
      cenario: "quintal_anoitecer",
      objeto_x_objeto: relacoes,
      objeto_x_cenario: [],
    },
    cenarios: {
      esquema: ESQUEMA_FICHAS_V1,
      cenarios: {
        quintal_anoitecer: {
          nome: "Quintal ao anoitecer",
          descricao: "um quintal de teste",
          voz_do_contador: "o quintal fala baixinho",
          sensacao_no_personagem: celula4("sensacao do lugar"),
        },
      },
    },
  };
}

function estadoDe(linha: string[], extra?: Partial<EstadoCompositor>): EstadoCompositor {
  return { cenarioId: "quintal_anoitecer", linha, rodada: 2, desfecho: "aberto", ...extra };
}

const perfilBase: PerfilCompositor = { nome: "Joana", genero: "f", nivel: "n2" };

function relacao(se: string | string[], objeto: string, alvo: string, marca: string): FichaRelacao {
  return { se, objeto, alvo, interacao: celula4(marca) };
}

// ─── 1. Determinismo — 100 execuções byte-idênticas ──────────────────────────
console.log("=== BLOCO 1 — Determinismo: 100× byte-idêntico ===");
{
  const fichas = catalogo(
    ["a", "b", "c"],
    [relacao(["tem:b", "antes_de:b"], "a", "b", "r1"), relacao("tem:c", "b", "c", "r2")]
  );
  const estado = estadoDe(["a", "b", "c"]);
  const primeiro = JSON.stringify(compor(estado, fichas, perfilBase));
  let identicos = 0;
  for (let i = 0; i < 100; i++) {
    if (JSON.stringify(compor(estado, fichas, perfilBase)) === primeiro) identicos++;
  }
  assertEqual(identicos, 100, "mesma entrada ⇒ Pacote byte-idêntico em 100 execuções");
}

// ─── 2. Ordem sagrada — beats ≡ linha, sempre ────────────────────────────────
console.log("\n=== BLOCO 2 — Ordem sagrada: beats ≡ ordem da linha ===");
{
  const fichas = catalogo(["a", "b", "c", "d", "e"]);
  const linhaR1 = ["c", "a", "b"];
  const pacoteR1 = compor(estadoDe(linhaR1, { rodada: 1 }), fichas, perfilBase);
  assertEqual(
    pacoteR1.beats.map((b) => b.objeto).join(","),
    linhaR1.join(","),
    "R1: ordem dos beats ≡ linha (nunca reordena, nem alfabético)"
  );
  // Linha após inserções de rodadas 2+ no miolo: pontas preservadas.
  const linhaR4 = ["c", "d", "a", "e", "b"];
  const pacoteR4 = compor(estadoDe(linhaR4, { rodada: 4 }), fichas, perfilBase);
  assertEqual(
    pacoteR4.beats.map((b) => b.objeto).join(","),
    linhaR4.join(","),
    "R4 (miolo inserido): ordem dos beats ≡ linha"
  );
}

// ─── 3. Teto e precedência de relações (D5) + gramática ──────────────────────
console.log("\n=== BLOCO 3 — Teto/precedência D5 + semântica das condições ===");
{
  const linha = ["a", "b", "c"];

  // Semântica das condições (espelho do v3, composicao.ts:200-231).
  assert(avaliarCondicao("tem:b", "a", linha), "tem: casa com alvo presente na linha");
  assert(!avaliarCondicao("tem:a", "a", linha), "guarda do tem:: nunca casa com o próprio objeto");
  assert(!avaliarCondicao("tem:z", "a", linha), "tem: não casa com alvo fora da linha");
  assert(avaliarCondicao("nao_tem:z", "a", linha), "nao_tem: casa quando o alvo está ausente");
  assert(!avaliarCondicao("nao_tem:b", "a", linha), "nao_tem: não casa quando o alvo está presente");
  assert(avaliarCondicao("pos:inicio", "a", linha), "pos:inicio casa para linha[0]");
  assert(avaliarCondicao("pos:fim", "c", linha), "pos:fim casa para a última posição");
  assert(avaliarCondicao("pos:miolo", "b", linha), "pos:miolo casa para posição interior");
  assert(!avaliarCondicao("pos:miolo", "a", linha), "pos:miolo não casa para a abertura");
  assert(avaliarCondicao("antes_de:b", "a", linha), "antes_de: casa na ordem correta");
  assert(!avaliarCondicao("antes_de:z", "a", linha), "antes_de: exige AMBOS na linha");
  assert(avaliarCondicao("depois_de:a", "b", linha), "depois_de: casa na ordem correta");
  assert(!avaliarCondicao("depois_de:b", "a", linha), "depois_de: não casa na ordem invertida");
  assert(!avaliarCondicao("func:brilha", "a", linha), "func:* (reservado) nunca casa");
  assert(!avaliarCondicao("qualquer:coisa", "a", linha), "condição desconhecida nunca casa, nunca lança");
  assert(!casaSe([], "a", linha), "se em array VAZIO nunca casa");
  assert(casaSe(["tem:b", "antes_de:b"], "a", linha), "se em array = E lógico (todas casam)");
  assert(!casaSe(["tem:b", "depois_de:b"], "a", linha), "se em array = E lógico (uma falha ⇒ não casa)");

  // 0 / 1 / 2 / 3+ candidatas.
  assertEqual(selecionarRelacoes([], linha).length, 0, "0 candidatas ⇒ nenhuma relação");
  assertEqual(
    selecionarRelacoes([relacao("tem:b", "a", "b", "x")], linha).length,
    1,
    "1 candidata ⇒ 1 relação"
  );
  assertEqual(
    selecionarRelacoes(
      [relacao("tem:b", "a", "b", "x"), relacao("tem:c", "b", "c", "y")],
      linha
    ).length,
    2,
    "2 candidatas ⇒ 2 relações (teto exato)"
  );
  const quatro = [
    relacao("tem:b", "a", "b", "simples-1"),
    relacao(["tem:c", "antes_de:c"], "a", "c", "dupla"),
    relacao("tem:c", "b", "c", "simples-2"),
    relacao(["tem:a", "depois_de:a", "pos:fim"], "c", "a", "tripla"),
  ];
  const vencedoras = selecionarRelacoes(quatro, linha);
  assertEqual(vencedoras.length, 2, "3+ candidatas ⇒ teto de 2 por Pacote");
  assertEqual(
    vencedoras.map((r) => r.interacao.n1).join(","),
    "tripla n1,dupla n1",
    "vencem as 2 de MAIOR especificidade (nº de condições no se)"
  );
  const empate = selecionarRelacoes(
    [
      relacao("tem:b", "a", "b", "primeira"),
      relacao("tem:c", "a", "c", "segunda"),
      relacao("tem:a", "b", "a", "terceira"),
    ],
    linha
  );
  assertEqual(
    empate.map((r) => r.interacao.n1).join(","),
    "primeira n1,segunda n1",
    "empate de especificidade ⇒ desempate pela ordem do array"
  );
  assertEqual(
    selecionarRelacoes([relacao("nao_tem:z", "a", "z", "orfa")], linha).length,
    0,
    "guarda defensiva: relação com alvo fora da linha nunca entra"
  );

  // Teto por PACOTE, não por beat: 3 candidatas do MESMO objeto ⇒ 2 no beat.
  const fichas = catalogo(
    ["a", "b", "c"],
    [
      relacao(["tem:b", "antes_de:b"], "a", "b", "a-dupla"),
      relacao("tem:b", "a", "b", "a-simples-1"),
      relacao("tem:c", "a", "c", "a-simples-2"),
    ]
  );
  const pacote = compor(estadoDe(linha), fichas, perfilBase);
  assertEqual(
    pacote.beats[0].relacoes.length,
    2,
    "teto é por Pacote (não por beat): 3 candidatas do mesmo objeto ⇒ 2 no beat"
  );
  assertEqual(
    pacote.beats[0].relacoes.map((r) => r.interacao).join(","),
    "a-dupla n2,a-simples-1 n2",
    "relações do beat já resolvidas no nível, com alvo explícito e sem se"
  );
  assertEqual(pacote.beats[0].relacoes[0].alvo, "b", "alvo explícito preservado (D4)");
}

// ─── 4. Papéis por posição e rodada ──────────────────────────────────────────
console.log("\n=== BLOCO 4 — papel: abertura/miolo/fecho por posição, em toda rodada ===");
{
  const fichas = catalogo(["a", "b", "c", "d", "e"]);
  for (const rodada of [1, 2, 3, 4] as const) {
    const pacote = compor(estadoDe(["a", "b", "c", "d", "e"], { rodada }), fichas, perfilBase);
    assertEqual(
      pacote.beats.map((b) => b.papel).join(","),
      "abertura,miolo,miolo,miolo,fecho",
      `R${rodada}: linha[0]=abertura, última=fecho, resto=miolo`
    );
  }
  const um = compor(estadoDe(["a"], { rodada: 1 }), fichas, perfilBase);
  assertEqual(um.beats.map((b) => b.papel).join(","), "abertura", "linha de 1 objeto ⇒ beat único abertura");
  assert(um.eco !== null && um.eco.abre_com === um.eco.fecha_com, "linha de 1 + desfecho aberto ⇒ eco com abre_com = fecha_com (legal)");
  const dois = compor(estadoDe(["a", "b"], { rodada: 1 }), fichas, perfilBase);
  assertEqual(
    dois.beats.map((b) => b.papel).join(","),
    "abertura,fecho",
    "linha de 2 objetos ⇒ abertura + fecho (miolo vazio é legal)"
  );
}

// ─── 5. Falha explícita — nunca Pacote parcial, nunca silêncio ───────────────
console.log("\n=== BLOCO 5 — falha explícita: ficha/nível/perfil/cenário/esquema ===");
{
  const fichas = catalogo(["a", "b"]);
  assertLanca(
    () => compor(estadoDe(["a", "fantasma"]), fichas, perfilBase),
    'objeto sem ficha no catálogo — "fantasma"',
    "objeto sem ficha ⇒ erro nomeado com o id do objeto"
  );

  const semNivel = catalogo(["a"]);
  delete (semNivel.objetos.objetos.a.descricao as Partial<PorNivel>).n3;
  assertLanca(
    () => compor(estadoDe(["a"]), semNivel, { ...perfilBase, nivel: "n3" }),
    'objeto "a", campo "descricao", nível "n3"',
    "nível ausente ⇒ erro com objeto+campo+nível (nunca degradar de nível)"
  );

  assertLanca(
    () => compor(estadoDe(["a"]), fichas, { ...perfilBase, nivel: "n9" as "n1" }),
    "perfil sem nível válido",
    "perfil sem nível válido ⇒ erro explícito ANTES de compor"
  );
  assertLanca(
    () => compor(estadoDe(["a"], { cenarioId: "praia" }), fichas, perfilBase),
    'cenário sem ficha no catálogo — "praia"',
    "cenário ausente ⇒ erro nomeado"
  );
  assertLanca(
    () => compor(estadoDe([]), fichas, perfilBase),
    "linha vazia",
    "linha vazia ⇒ erro explícito (Pacote exige ao menos 1 beat)"
  );
  const esquemaErrado = catalogo(["a"]);
  (esquemaErrado.objetos as { esquema: string }).esquema = "pipoca.fichas.v9";
  assertLanca(
    () => compor(estadoDe(["a"]), esquemaErrado, perfilBase),
    "esquema desconhecido",
    "esquema desconhecido ⇒ rejeição explícita (evolução .vN)"
  );
}

// ─── 6. Golden — o Pacote-exemplo do 11-00 congelado ─────────────────────────
console.log("\n=== BLOCO 6 — Golden: exemplo do 11-00 byte a byte ===");
{
  // Catálogo em memória com as células CANÔNICAS/ILUSTRATIVAS do exemplo do
  // 11-00 (linha vagalume→frasco→vento, n2). As duas relações do vagalume
  // reproduzem a linhagem real: nesta linha `depois_de:frasco` NÃO casa
  // (vagalume vem ANTES) — vence a candidata `tem:frasco`, como anotado no doc.
  const enche = (n2: string): PorNivel => ({ n1: n2, n2, n3: n2, n4: n2 });
  const fichasGolden: CatalogoFichas = {
    objetos: {
      esquema: ESQUEMA_FICHAS_V1,
      objetos: {
        vagalume: {
          genero: "m",
          numero: "sg",
          descricao: enche("um vaga-lume que acende e apaga"),
          sensacao: {
            dominante: "visão",
            registro: "encanto silencioso",
            corpo: enche("os olhos seguem a pisca; chegar perto na ponta dos pés"),
          },
        },
        frasco: {
          genero: "m",
          numero: "sg",
          descricao: enche("um pote de vidro limpinho, que deixa ver o que mora dentro"),
          sensacao: {
            dominante: "tato",
            registro: "cuidado curioso",
            corpo: enche("segurar o pote com as duas mãos; espiar através do vidro"),
          },
        },
        vento: {
          genero: "m",
          numero: "sg",
          descricao: enche("um vento fresco que passa e mexe em tudo de leve"),
          sensacao: {
            dominante: "tato",
            registro: "frescor",
            corpo: enche("a pele dos braços arrepia; o cabelo mexe"),
          },
        },
      },
    },
    relacoes: {
      esquema: ESQUEMA_FICHAS_V1,
      cenario: "quintal_anoitecer",
      objeto_x_objeto: [
        {
          se: ["tem:frasco", "depois_de:frasco"],
          objeto: "vagalume",
          alvo: "frasco",
          interacao: enche("a faísca acha o pote; entra"),
        },
        {
          se: "tem:frasco",
          objeto: "vagalume",
          alvo: "frasco",
          interacao: enche("a faísca entra no pote e vira uma lanterninha só dela"),
        },
      ],
      objeto_x_cenario: [],
    },
    cenarios: {
      esquema: ESQUEMA_FICHAS_V1,
      cenarios: {
        quintal_anoitecer: {
          nome: "Quintal ao anoitecer",
          descricao:
            "um quintal de casa ao cair da noite: muro baixo, grama, uma árvore e a primeira estrela",
          voz_do_contador: "o quintal fala baixinho, como quem sussurra segredos só pra ela",
          sensacao_no_personagem: enche(
            "o friozinho bom de estar acordada na hora em que o quintal acorda"
          ),
        },
      },
    },
  };
  // `paragrafos: 2` do exemplo corresponde, sob D-12.1, a rodada ≥ 2 — o estado
  // do golden fixa rodada 2 (decisão registrada no PR da fase 11).
  const estadoGolden: EstadoCompositor = {
    cenarioId: "quintal_anoitecer",
    linha: ["vagalume", "frasco", "vento"],
    rodada: 2,
    desfecho: "aberto",
  };
  const pacoteGolden = compor(estadoGolden, fichasGolden, {
    nome: "Joana",
    genero: "f",
    nivel: "n2",
  });
  assertEqual(
    JSON.stringify(pacoteGolden, null, 2),
    JSON.stringify(golden, null, 2),
    "compor reproduz o golden do 11-00 byte a byte (pacote_golden_v1.json)"
  );
  assertEqual(
    pacoteGolden.beats[0].relacoes[0].interacao,
    "a faísca entra no pote e vira uma lanterninha só dela",
    "a candidata tem:frasco vence (depois_de:frasco não casa nesta linha)"
  );

  // Convergente ⇒ eco null (valor legal, campo sempre presente).
  const convergente = compor({ ...estadoGolden, desfecho: "convergente" }, fichasGolden, {
    nome: "Joana",
    genero: "f",
    nivel: "n2",
  });
  assert(convergente.eco === null, "desfecho convergente ⇒ eco: null");
  assert("eco" in convergente, "eco sempre presente no Pacote (null é valor legal)");
}

// ─── Total ───────────────────────────────────────────────────────────────────
console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) {
  throw new Error(`${falhou} teste(s) falharam`);
}
