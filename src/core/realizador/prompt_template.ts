/**
 * [prompt_template.ts] — Monta o prompt (system+user) do realizador 100% a partir do
 *   Pacote: MÉTODO (as 3 leis + proibições + few-shot) no system, MATÉRIA no user.
 *
 * PAPEL: core-lógica (realizador · fase 12 · montagem de prompt)
 * POR QUE EXISTE: concentra AQUI o método editorial (leis, proibições parametrizadas
 *   pela identidade do Pacote, few-shot por nível, tabela de comprimento canônico) sem
 *   nunca tocar fichas/gramática/BD — a montagem é função pura do Pacote.
 * ENTRA: PacoteComposicao.
 * SAI: PromptRealizador { system, user }; + helpers exportados (rodadaDoPacote,
 *   maximoPalavrasDoPacote, personalizarExemplo) e tabelas (MAXIMO_PALAVRAS,
 *   FEWSHOT_POR_NIVEL, DESCRICAO_NIVEL).
 * CHAMA: composicao.ts:NivelKey (tipo), compositor/pacote.ts:PacoteComposicao (tipo).
 * É CHAMADO POR: realizador/realizar.ts (montarPromptRealizador), validador.ts
 *   (maximoPalavrasDoPacote), cascata.ts (tipo PromptRealizador), realizador.test.ts,
 *   backend/proxy_realizador.ts, functions/realizador/index.ts (edge).
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/realizador/realizador.test.ts` (dentro de `bun run test`).
 * CUIDADO: as saídas few-shot são VERBATIM do PR #21 — PROIBIDO reescrever (edição é
 *   privilégio do autor, D-12.2); `personalizarExemplo` só troca NOME e tokens de
 *   gênero (adjetivos concordam com substantivos, não se tocam); a rodada é DERIVADA
 *   de beats.length (o contrato v1 não carrega rodada); MAXIMO_PALAVRAS usa "Máximo"
 *   deliberadamente (a instrução branda foi ignorada em 291 casos).
 *
 * — detalhe preservado —
 * Pipoca — Template de prompt do realizador (prompt_template.ts)
 * --------------------------------------------------------------
 * Montagem 100% derivada do PacoteComposicao — nunca acessa fichas, gramática
 * ou BD (fase12-12-01). O Pacote carrega MATÉRIA; este template carrega MÉTODO:
 * as 3 leis editoriais vivem AQUI (D-11.1), nunca no Pacote.
 * Linhagem do formato: prompt-semente validado do experimento
 * (`experimentos/beats-para-paragrafos/gemini-cliente.ts:41-52`) + bloco de
 * matéria do experimento fichas→histórias (ciclo 1 do PR #21).
 */

import type { NivelKey } from "../composicao.js";
import type { PacoteComposicao } from "../compositor/pacote.js";

/** Régua de nível (verbatim do experimento, `gemini-cliente.ts:34-39`). */
export const DESCRICAO_NIVEL: Record<NivelKey, string> = {
  n1: "Primeiras palavras — sílabas e palavras soltas",
  n2: "Frases curtas — uma linha",
  n3: "Pequenos textos — frases ligadas",
  n4: "Parágrafos — histórias mais longas",
};

/**
 * Tabela CANÔNICA de comprimento (herança 1 da fase 10 — TRILHA, "Fechamento
 * da fase 10"). Norma do golden v3 ±20%; default datado 2026-07-10, AJUSTÁVEL
 * PELO VEREDITO DE VOZ. Pontas propostas: R1n1=31 · R1n2=55 · R1n3=91 ·
 * R1n4=200 · R4n1=71 · R4n2=122 · R4n3=193 · R4n4=403; R2/R3 interpolados
 * linearmente. Índices 0..3 = rodadas R1..R4. A instrução usa "Máximo", não
 * "cerca de" — a instrução branda foi ignorada em 291 casos (PR #21).
 */
export const MAXIMO_PALAVRAS: Record<NivelKey, [number, number, number, number]> = {
  n1: [31, 44, 58, 71],
  n2: [55, 77, 100, 122],
  n3: [91, 125, 159, 193],
  n4: [200, 268, 335, 403],
};

/**
 * Rodada derivada do PRÓPRIO Pacote (o contrato v1 não carrega rodada; a
 * montagem é 100% derivada dele — 12-01). No jogo real a linha tem 3 objetos
 * na R1 e ganha 1 por rodada: R1=3 beats … R4=6. Decisão-semente registrada
 * no PR da fase 12.
 */
export function rodadaDoPacote(pacote: PacoteComposicao): 1 | 2 | 3 | 4 {
  const r = pacote.beats.length - 2;
  return (r < 1 ? 1 : r > 4 ? 4 : r) as 1 | 2 | 3 | 4;
}

/** Máximo canônico de palavras para este Pacote (nível × rodada derivada). */
export function maximoPalavrasDoPacote(pacote: PacoteComposicao): number {
  return MAXIMO_PALAVRAS[pacote.nivel][rodadaDoPacote(pacote) - 1];
}

export interface ExemploFewShot {
  /** Entrada compacta: a linha de elementos + personagem do estado de origem. */
  entrada: string;
  /** Saída VERBATIM do PR #21 — editar é privilégio do autor (D-12.2). */
  saida: string;
}

/**
 * Few-shot POR NÍVEL (D-12.2, herança 2): exemplos minerados VERBATIM dos
 * artefatos do PR #21 (aprovados na Camada 1 + juiz), selecionados por
 * aderência à banda canônica do nível e nota. PROIBIDO reescrever — o veto/
 * edição é do autor na Parada de Voz. Gap registrado: o n1 tem só 1 candidato
 * dentro da banda (31–71 palavras); o outro aprovado (r4-n1-m-p04) tem 82.
 */
export const FEWSHOT_POR_NIVEL: Record<NivelKey, ExemploFewShot[]> = {
  n1: [
    {
      // r1-n1-f-p05 · t0.2 · 53 palavras · juiz 4/4.5/4
      entrada: "ELEMENTOS: vagalume → folha → vento · PERSONAGEM: Joana (menina)",
      saida:
        "O quintal sussurra segredos, Joana quer ver tudo. A grama fria toca seu pé. Uma luz pisca no fundo, os olhos de Joana seguem. Uma folha desce rodando, o dedo de Joana segue. O vento pula o muro, a pele de Joana sente o fresco. O quintal conta tudo, Joana sente os segredos.",
    },
  ],
  n2: [
    {
      // r1-n2-f-p03 · t0.7 · 73 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: vagalume → vento → frasco · PERSONAGEM: Joana (menina)",
      saida:
        "O quintal sussurra segredos. Joana sente a grama fria, quer ver tudo. Seus olhos seguem o vaga-lume piscando no fundo. Ela chega perto na ponta dos pés, e a faísca entra no pote, vira sua lanterninha. O vento pula o muro e corre, fresco, mexendo em tudo. A pele de Joana arrepia, o cabelo mexe. Ela segura o pote de vidro frio e liso com as duas mãos, espiando o mundo lá dentro.",
    },
    {
      // r2-n2-m-p04 · t0.2 · 87 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: folha → frasco → gato → vento · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos. A grama fria no pé de Pietro faz a vontade de ver tudo. Uma folha solta do galho, desce rodando. O dedo de Pietro acompanha, os olhos dançam. Um pote frio e liso espera na grama. Pietro o segura, espia o mundo. Um gato quieto aparece na cerca, olhos verdes. Pietro silencia, prende a respiração. O gato vê a folha, pula, brincando. O vento pula o muro, corre, fresco. A pele de Pietro arrepia, o cabelo mexe. O quintal continua a sussurrar segredos.",
    },
  ],
  n3: [
    {
      // r2-n3-m-p04 · t0.7 · 146 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: vento → vagalume → gato → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos; a grama fria nos pés de Pietro traz vontade de descobrir. O vento rola pelo muro, corre no quintal, fresco de longe, mexe de leve. Os braços de Pietro arrepiam, o cabelo mexe. No canto escuro, luzinha acende e apaga; vaga-lume pisca devagar como estrela. Os olhos de Pietro seguem a pisca, querendo perto.\n\nNa cerca, gato aparece sem barulho, quieto feito sombra, olhos verdes acesos feito lanternas. Pietro fica em silêncio, prende a respiração, troca olhar com o gato, que espia a luzinha. Então, Pietro vê pote de vidro escondido na grama, frio e liso feito pedra de rio, que entorta o mundo. Ele o segura com as duas mãos, fecha um olho para espiar. A faísca do vaga-lume entra no pote, piscando lá dentro — uma lanterninha viva pra carregar. Pietro agora tem um segredo do quintal, guardado bem perto.",
    },
    {
      // r2-n3-m-p06 · t0.7 · 146 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: vagalume → folha → gato → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos, um por um. A grama fria nos pés de Pietro traz a vontade de descobrir. No canto escuro, um vaga-lume acende e apaga, estrelinha pra brincar. Os olhos de Pietro seguem a pisca, e ele na ponta dos pés quer chegar perto. A faísca entra no pote de vidro, virando lanterninha viva. Uma folha se solta do galho alto, descendo rodando no ar. O dedo de Pietro acompanha cada volta, sua mão aberta, esperando. Na cerca, um gato aparece sem barulho, quieto feito sombra, olhos verdes acesos. Pietro fica em silêncio, prende a respiração, e troca um olhar demorado. O gato espia a luzinha piscando, movendo a cabeça. Um pote de vidro, frio e liso feito pedra de rio, está na grama, entortando o mundo. Pietro o segura com as duas mãos, fecha um olho e espia, colhendo os segredos do quintal.",
    },
  ],
  n4: [
    {
      // r1-n4-m-p02 · t0.4 · 146 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: folha → vagalume → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos, e a grama fria nos pés de Pietro faz seu coração bater forte de vontade de saber. Do galho alto, uma folha se despede e desce no ar escuro, rodando leve. O dedo de Pietro acompanha as voltas, e sua mão se abre feito ninho, esperando a folha pousar. No canto escuro perto da cerca, uma luzinha acende e apaga, um vaga-lume. Os olhos de Pietro seguem a pisca, e a vontade o move na ponta dos pés, prendendo a respiração, até um pote de vidro na grama. A faísca entra no pote frio e liso, piscando lá dentro, presa e livre, uma lanterninha viva. Pietro o segura com as duas mãos, ergue contra a luz, fecha um olho e espia o mundo que entorta e brilha, pequeno e curvo, e a vontade de saber se colhe no brilho da lanterninha viva.",
    },
    {
      // r2-n4-m-p02 · t0.2 · 187 palavras · juiz 4.5/4/4.2
      entrada: "ELEMENTOS: frasco → vento → gato → vagalume · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos para quem vem ver, e a grama fria nos pés descalços de Pietro faz seu coração bater forte de vontade de saber. Ele segura um pote de vidro com as duas mãos, erguendo-o contra a luz, e fecha um olho para espiar o mundo que entorta lá dentro, virando devagar. O pote vazio parece à espera, e Pietro sente a certeza boa de que a noite ainda vai mandar uma coisinha brilhante para morar ali.\n\nO vento chega rolando por cima do muro, balançando a grama e cheirando a terra molhada. A pele dos braços de Pietro arrepia, ele fecha os olhos e respira fundo, deixando o vento passar como se fosse noite. Em cima da cerca, um gato já está sentado, e Pietro fica em silêncio, prendendo a respiração, trocando um olhar demorado e piscando devagar de volta. No canto do quintal, uma luzinha acende e apaga, flutuando. Os olhos de Pietro seguem a pisca, e a vontade de chegar perto o guia, então a faísca roda no ar, encontra o pote e entra devagarinho, piscando quentinha, como quem chega em casa.",
    },
  ],
};

export interface PromptRealizador {
  system: string;
  user: string;
}

/** Rótulo de gênero usado nas proibições e no bloco de matéria. */
function rotuloGenero(genero: "m" | "f"): string {
  return genero === "f" ? "menina" : "menino";
}

/**
 * Parametriza um exemplo few-shot pela IDENTIDADE do personagem do Pacote (A1,
 * censo C1: o few-shot fixo — n1/n2 em "Joana (menina)" — plantava um prior de
 * nome/gênero conflitante ao gerar p/ outro personagem). A troca é MECÂNICA e a
 * prosa segue VERBATIM (D-12.2): a identidade-fonte é lida do próprio campo
 * `entrada` ("PERSONAGEM: <nome> (<rótulo>)") e só o NOME e os tokens que
 * dependem do GÊNERO DO PERSONAGEM (rótulo menina/menino, pronomes ela/ele,
 * dela/dele) são trocados — adjetivos concordam com substantivos (pés, olhos),
 * não com o personagem, então não se tocam. Alvo === fonte ⇒ no-op.
 */
export function personalizarExemplo(ex: ExemploFewShot, nomeAlvo: string, generoAlvo: "m" | "f"): ExemploFewShot {
  const m = ex.entrada.match(/PERSONAGEM:\s*([^()]+?)\s*\((menina|menino)\)/);
  if (!m) return ex; // sem personagem reconhecível — não mexe
  const nomeFonte = m[1].trim();
  const generoFonte: "m" | "f" = m[2] === "menina" ? "f" : "m";
  const trocar = (s: string): string => {
    let out = s.replace(new RegExp("\\b" + nomeFonte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), nomeAlvo);
    if (generoFonte !== generoAlvo) {
      const pares: Array<[string, string]> = generoAlvo === "m"
        ? [["menina", "menino"], ["Ela", "Ele"], ["ela", "ele"], ["Dela", "Dele"], ["dela", "dele"]]
        : [["menino", "menina"], ["Ele", "Ela"], ["ele", "ela"], ["Dele", "Dela"], ["dele", "dela"]];
      for (const [de, para] of pares) out = out.replace(new RegExp("\\b" + de + "\\b", "g"), para);
    }
    return out;
  };
  return { entrada: trocar(ex.entrada), saida: trocar(ex.saida) };
}

export function montarPromptRealizador(pacote: PacoteComposicao): PromptRealizador {
  const nivel = pacote.nivel;
  const nome = pacote.personagem.nome;
  const genero = rotuloGenero(pacote.personagem.genero);
  const maximo = maximoPalavrasDoPacote(pacote);

  // ---------- user (MATÉRIA — só o Pacote, já resolvido no nível) ----------
  const linhasUser: string[] = [];
  linhasUser.push(`LUGAR: ${pacote.cenario.descricao}`);
  linhasUser.push(`VOZ DO LUGAR: ${pacote.cenario.voz_do_contador}`);
  linhasUser.push(`O QUE O LUGAR FAZ SENTIR: ${pacote.cenario.sensacao_no_personagem}`);
  linhasUser.push(`PERSONAGEM: ${nome} (${genero})`);
  linhasUser.push("", "ELEMENTOS, NA ORDEM:");
  pacote.beats.forEach((beat, i) => {
    linhasUser.push(`${i + 1}. ${beat.objeto} (${beat.papel})`);
    linhasUser.push(`   O QUE É: ${beat.descricao}`);
    linhasUser.push(`   CORPO: ${beat.corpo}`);
    // E1 (ML-5): sentimento/sentido das fichas — matéria aditiva, só quando veio.
    if (beat.sentimento) linhasUser.push(`   SENTIMENTO: ${beat.sentimento}`);
    if (beat.sentido) linhasUser.push(`   SENTIDO: ${beat.sentido}`);
    for (const relacao of beat.relacoes) {
      linhasUser.push(`   INTERAÇÃO (com ${relacao.alvo}): ${relacao.interacao}`);
    }
  });

  // ---------- system (MÉTODO — as 3 leis vivem aqui, D-11.1) ----------
  const linhasSystem = [
    "Escreva uma história infantil curta a partir do MATERIAL abaixo.",
    // Lei 1 — o corpo da criança é o centro.
    `O corpo de ${nome} guia cada cena: use os gestos dados em CORPO, não invente emoções abstratas.`,
    // Lei 2 — o cenário é o contador (voz_do_contador + sensacao_no_personagem, D-11.2).
    "O lugar é o contador: a voz do lugar abre e costura a história.",
    // Lei 3 — desejo plantado, corpo colhido.
    "Plante a vontade na abertura; feche colhendo essa vontade no corpo.",
    // E1 (ML-5) — o sentimento é CLIMA, não rótulo: sem copiar a palavra.
    ...(pacote.beats.some((b) => b.sentimento || b.sentido)
      ? ["Use o SENTIMENTO de cada elemento como clima da cena, SEM escrever essa palavra; o SENTIDO diz qual percepção guia (visão, tato, som…)."]
      : []),
    // As quatro proibições, parametrizadas pelo Pacote (nunca "Joana" fixo).
    "NÃO invente acontecimentos, objetos, personagens ou falas.",
    "NÃO remova nenhum elemento. NÃO mude a ordem dos elementos.",
    `NÃO troque o nome (${nome}), o gênero (${genero}) ou a idade.`,
    // Achados do ciclo 1 (herança 3): presente + anáfora.
    "Escreva no tempo PRESENTE (a história acontece agora), como nos exemplos abaixo.",
    `Não use "ele" ou "ela" para objetos — repita o nome do objeto.`,
    `Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.`,
  ];
  if (nivel === "n1") {
    // Regras de fusão do n1 (achados do ciclo 1 + fase12-12-05).
    linhasSystem.push(
      "Nível n1: frases bem curtas, UMA sensação de corpo por elemento.",
      'Integre a sensação de corpo na frase do evento com "e" — no máximo 2 frases por elemento.',
      "Repetir o nome do objeto ou da personagem é bem-vindo (repetição coesiva).",
      "No máximo 1 fragmento exclamativo em todo o texto."
    );
  } else {
    linhasSystem.push(
      'Uma frase pode unir-se à outra com "e", "mas", "então", "depois". Menos pontos finais, sem frases picadas.'
    );
  }

  // Few-shot do nível (D-12.2) — só o nível pedido; exemplo de um envenena o
  // outro. Parametrizado pela identidade do Pacote (A1/C1): o few-shot passa a
  // falar do MESMO personagem que se pede — sem prior de nome/gênero conflitante.
  const exemplos = FEWSHOT_POR_NIVEL[nivel];
  if (exemplos.length > 0) {
    linhasSystem.push("", `EXEMPLOS do nível ${nivel} (siga o tom, o ritmo e o comprimento):`);
    exemplos.forEach((exemploBruto, i) => {
      const exemplo = personalizarExemplo(exemploBruto, nome, pacote.personagem.genero);
      linhasSystem.push(`EXEMPLO ${i + 1} — ${exemplo.entrada}`, exemplo.saida, "");
    });
  }

  // Eco: instrução AUSENTE quando nulo (12-01 — mais seguro que condicional).
  if (pacote.eco !== null) {
    linhasSystem.push(`Termine ecoando ${pacote.eco.abre_com} com as próprias palavras.`);
  }

  const paragrafosTxt =
    pacote.restricoes.paragrafos === 1 ? "1 parágrafo" : `${pacote.restricoes.paragrafos} parágrafos`;
  linhasSystem.push(
    `Escreva em ${paragrafosTxt} (separados por uma linha em branco). Máximo ${maximo} palavras no total.`,
    "Devolva só o texto final."
  );

  return { system: linhasSystem.join("\n"), user: linhasUser.join("\n") };
}
