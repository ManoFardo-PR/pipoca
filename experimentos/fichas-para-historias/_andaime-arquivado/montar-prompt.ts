/**
 * ⚠️ ANDAIME DESCARTÁVEL — SÓ DESTE EXPERIMENTO. ⚠️
 * Monta o prompt do realizador DIRETO das fichas (formato-semente registrado
 * em docs/plans02/fase12_b1_5_realizador/12-01: as 3 leis como método, as
 * quatro proibições parametrizadas, nível, restrições D-12.1). É PROIBIDO
 * promover este arquivo a src/core/realizador|geracao — o realizador de
 * produção nasce na fase 12/13 guiado pelos docs do plans02.
 */

import type { NivelKey } from "../../../src/core/composicao.js";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../../../src/core/fichas/tipos.js";
import type { EstadoExperimento, MaterialPrompt } from "../tipos.js";
import {
  PALAVRAS_POR_PARAGRAFO,
  alvoPalavras,
  derivarPapel,
  paragrafosPorRodada,
  selecionarRelacoes,
} from "./gramatica-andaime.js";

const DESCRICAO_NIVEL: Record<NivelKey, string> = {
  n1: "Primeiras palavras — sílabas e palavras soltas",
  n2: "Frases curtas — uma linha",
  n3: "Pequenos textos — frases ligadas",
  n4: "Parágrafos — histórias mais longas",
};

export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter((p) => p.length > 0).length;
}

export interface Catalogos {
  objetos: ArquivoObjetosV1;
  relacoes: ArquivoRelacoesV1;
  cenarios: ArquivoCenariosV1;
}

export function montarPromptFichas(estado: EstadoExperimento, catalogos: Catalogos): MaterialPrompt {
  const nivel = estado.nivel;
  const cenario = catalogos.cenarios.cenarios["quintal_anoitecer"];
  if (!cenario) throw new Error("cenário quintal_anoitecer ausente do catálogo");
  const [minPar, maxPar] = paragrafosPorRodada(estado.rodada);
  const palavrasPar = PALAVRAS_POR_PARAGRAFO[nivel];
  if (!palavrasPar) throw new Error(`nível sem teto de palavras: ${nivel}`);
  const artigoGenero = estado.genero === "f" ? "menina" : "menino";

  const relacoesAtivas = selecionarRelacoes(catalogos.relacoes.objeto_x_objeto, estado.linha);

  // ---------- user (MATÉRIA — só células de ficha, resolvidas no nível) ----------
  // Montado ANTES do system: o orçamento de palavras é proporcional ao
  // material (C-1), então palavrasMaterial precisa existir primeiro.
  const materialTextos: string[] = [];
  const linhasUser: string[] = [];
  linhasUser.push(`LUGAR: ${cenario.descricao}`);
  linhasUser.push(`VOZ DO LUGAR: ${cenario.voz_do_contador}`);
  linhasUser.push(`O QUE O LUGAR FAZ SENTIR: ${cenario.sensacao_no_personagem[nivel]}`);
  materialTextos.push(cenario.descricao, cenario.voz_do_contador, cenario.sensacao_no_personagem[nivel]);
  linhasUser.push(`PERSONAGEM: ${estado.personagem} (${artigoGenero})`);
  linhasUser.push("", "ELEMENTOS, NA ORDEM:");

  estado.linha.forEach((objetoId, i) => {
    const ficha = catalogos.objetos.objetos[objetoId];
    if (!ficha) throw new Error(`objeto sem ficha: ${objetoId}`);
    const papel = derivarPapel(i, estado.linha.length);
    const manifestacao = catalogos.relacoes.objeto_x_cenario.find((m) => m.objeto === objetoId);
    linhasUser.push(`${i + 1}. ${objetoId} (${papel})`);
    if (manifestacao) {
      linhasUser.push(`   ONDE: ${manifestacao.manifestacao[nivel]}`);
      materialTextos.push(manifestacao.manifestacao[nivel]);
    }
    linhasUser.push(`   O QUE É: ${ficha.descricao[nivel]}`);
    linhasUser.push(`   CORPO: ${ficha.sensacao.corpo[nivel]}`);
    materialTextos.push(ficha.descricao[nivel], ficha.sensacao.corpo[nivel]);
    for (const ativa of relacoesAtivas) {
      if (ativa.relacao.objeto !== objetoId) continue;
      linhasUser.push(`   INTERAÇÃO (com ${ativa.relacao.alvo}): ${ativa.relacao.interacao[nivel]}`);
      materialTextos.push(ativa.relacao.interacao[nivel]);
    }
  });

  const user = linhasUser.join("\n");
  const palavrasMaterial = contarPalavras(materialTextos.join(" "));
  const alvo = alvoPalavras(palavrasMaterial, nivel, estado.rodada);

  // ---------- system (MÉTODO — as 3 leis vivem aqui, D-11.1) ----------
  const paragrafosTxt = minPar === maxPar ? `${minPar} parágrafo(s)` : `${minPar} ou ${maxPar} parágrafos`;
  const linhasSystem = [
    "Escreva uma história infantil curta a partir do MATERIAL abaixo.",
    `O corpo de ${estado.personagem} guia cada cena: use os gestos dados em CORPO, não invente emoções abstratas.`,
    "O lugar é o contador: a voz do lugar abre e costura a história.",
    "Plante a vontade na abertura; feche colhendo essa vontade no corpo.",
    "NÃO invente acontecimentos, objetos, personagens ou falas.",
    "NÃO remova nenhum elemento. NÃO mude a ordem dos elementos.",
    `NÃO troque o nome (${estado.personagem}), o gênero (${artigoGenero}) ou a idade.`,
    "Escreva no tempo PRESENTE (a história acontece agora), como nos exemplos do produto.",
    `Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.`,
  ];
  if (nivel === "n1") {
    linhasSystem.push(
      "Nível n1: frases bem curtas, UMA sensação de corpo por elemento, poucos pontos finais — mas nunca texto picado sem ligação."
    );
  } else {
    linhasSystem.push('Uma frase pode unir-se à outra com "e", "mas", "então", "depois". Menos pontos finais, sem frases picadas.');
  }
  linhasSystem.push(
    `Escreva em ${paragrafosTxt} (separados por uma linha em branco). Alvo: cerca de ${alvo} palavras no total.`,
    "Devolva só o texto final."
  );
  const system = linhasSystem.join("\n");

  return {
    system,
    user,
    palavrasMaterial,
    alvoPalavras: alvo,
    relacoesAtivas,
    paragrafosAlvo: [minPar, maxPar],
    palavrasPorParagrafo: palavrasPar,
  };
}
