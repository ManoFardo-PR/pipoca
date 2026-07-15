/**
 * [prompt.ts] — prompt base (system) e montador puro do prompt de usuário do
 *   Motor B, para pedir UM Trecho no nível certo espelhando o grafo autoral.
 *
 * PAPEL: core-lógica (orquestração de IA · GERAÇÃO 1 · Motor B AIMODEL)
 * POR QUE EXISTE: transforma o estado da história (objetos, nível, modo de
 *   desfecho) numa instrução de LLM determinística e segura, com o tom do
 *   cenário, sem lógica de rede.
 * ENTRA: MontarPromptContext (tipo, historia[], objetoId?, nivel, modoDesfecho,
 *   grafo) — função pura, sem Date/aleatório.
 * SAI: PROMPT_BASE (system fixo), descricaoNivel (espelho por nível) e
 *   montarPrompt(ctx) → string do prompt de usuário.
 * CHAMA: ../core/grafo/tipos.js:{GrafoAutoral, ModoDesfecho, Nivel, Objeto} (tipos).
 * É CHAMADO POR: ia/ia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; `bun run src/ia/ia.test.ts`
 *   (dentro de `bun run test`).
 * CUIDADO: cliente KEYLESS — nenhuma chave de provedor vive aqui (nem em src/):
 *   a credencial mora nos secrets da Edge Function proxy-ia. A segurança do
 *   próprio prompt é SABOR; a barreira dura é guardrails.ts. Sem Date/aleatório
 *   (determinismo de borda). Este montarPrompt (Motor B) ≠ montarPromptRealizador
 *   de core/realizador/prompt_template.ts.
 *
 * — detalhe preservado —
 * Pipoca — Prompt base do Motor B (AIMODEL) · doc fase05-05-02
 * -------------------------------------------------------------
 * `PROMPT_BASE` (system) + `montarPrompt(ctx)` PURA: mapeia
 * (historia, objeto, nivel, modoDesfecho) na instrução de UM `Trecho`
 * { texto, ehFinal } no nível pedido, espelhando o tom do grafo autoral
 * (cenário, personagem, paleta, níveis). Segurança infantil no próprio
 * prompt (regra 5 do doc); a barreira dura é o guardrails.ts (05-08).
 * Sem Date/aleatório — determinismo de borda (regra 8).
 *
 * Nota de caminho: o doc cita src/motores/ia/promptBase.ts + niveisPrompt.ts;
 * consolidado aqui (descricaoNivel vive neste módulo) — registrado no selo.
 */

import type { GrafoAutoral, ModoDesfecho, Nivel, Objeto } from "../core/grafo/tipos.js";

export type TipoPedido = "abertura" | "objeto" | "desfecho";

export interface MontarPromptContext {
  tipo: TipoPedido;
  historia: string[]; // ids dos objetos commitados, em ordem
  objetoId?: string; // só em tipo="objeto"
  nivel: Nivel;
  modoDesfecho: ModoDesfecho;
  grafo: GrafoAutoral; // fonte do tom e dos níveis
}

/** Descrição padrão de cada nível — usada quando GrafoAutoral.niveis não descrever. */
export const descricaoNivel: Record<Nivel, string> = {
  n1: "pré-leitor: frases mínimas, palavras curtas e concretas, ritmo de cantiga",
  n2: "leitor inicial: frases curtas e diretas, vocabulário do dia a dia",
  n3: "leitor em prática: frases um pouco mais longas, com uma imagem poética simples",
  n4: "leitor fluente: frases mais ricas, ainda curtas o bastante para o portão de leitura",
};

/** System prompt fixo: papel, tom e o bloco de segurança infantil (regra 5). */
export const PROMPT_BASE = [
  "Você é o narrador do Pipoca, um app de leitura para crianças de 3 a 12 anos.",
  "Sua voz é calma, acolhedora e encantada com as coisas pequenas do mundo.",
  "",
  "REGRAS DE SEGURANÇA (obrigatórias, sem exceção):",
  "- Conteúdo sempre adequado a crianças de 3 a 12 anos.",
  "- Proibido: violência gráfica, medo extremo, temas adultos, marcas comerciais, links, endereços, telefones ou qualquer dado pessoal.",
  "- Tom acolhedor, nunca condescendente nem clínico; nunca envergonhe a criança.",
  "- Se o pedido levar a conteúdo inseguro, recuse e reformule para algo seguro e gentil.",
  "",
  "FORMATO DA RESPOSTA:",
  'Responda SOMENTE com um JSON no formato Trecho: { "texto": string, "ehFinal": boolean }.',
  "Sem markdown, sem comentários, sem nada fora do JSON.",
].join("\n");

function acharObjeto(grafo: GrafoAutoral, id: string): Objeto | undefined {
  return grafo.cenario.objetos.find((o) => o.id === id);
}

function nomeLegivel(grafo: GrafoAutoral, id: string): string {
  const o = acharObjeto(grafo, id);
  return o ? `${o.emoji} ${o.nome}` : id;
}

/**
 * Monta o prompt de usuário de UMA chamada (função pura — regra 8).
 * Pede o fragmento em UM único nível (regra 2) e marca ehFinal conforme
 * o tipo (regra 4): true somente em desfecho.
 */
export function montarPrompt(ctx: MontarPromptContext): string {
  const { tipo, historia, objetoId, nivel, modoDesfecho, grafo } = ctx;
  const cen = grafo.cenario;
  const linhas: string[] = [];

  // Tom autoral (regra 1); sem personagem/paleta degrada para tom neutro acolhedor.
  const personagem = cen.personagem || "uma criança curiosa";
  const paleta = cen.paleta ? `paleta "${cen.paleta}"` : "tom neutro acolhedor";
  linhas.push(`CENÁRIO: "${cen.nome}" — personagem: ${personagem}; ${paleta}.`);

  // Um nível por vez (regra 2) + regra de ouro (regra 3: texto curto p/ o portão).
  // O wrapper da fábrica usa niveis-identidade ("n1"→"n1"): nesse caso a
  // descrição vem do espelho local (descricaoNivel).
  const bruta = grafo.niveis ? grafo.niveis[nivel] : "";
  const desc = bruta && bruta !== nivel ? bruta : descricaoNivel[nivel];
  linhas.push(`NÍVEL DE LEITURA: ${nivel} — ${desc}.`);
  linhas.push("Escreva o texto SOMENTE neste nível (um único fragmento, nunca os quatro).");
  linhas.push("O texto precisa ser curto o bastante para a criança ler no portão antes do próximo objeto.");

  if (historia.length === 0) {
    linhas.push("HISTÓRIA ATÉ AGORA: nenhuma — este é o comecinho.");
  } else {
    linhas.push(
      "HISTÓRIA ATÉ AGORA (objetos na ordem): " + historia.map((id) => nomeLegivel(grafo, id)).join(" → ") + "."
    );
  }

  if (tipo === "abertura") {
    linhas.push("PEDIDO: escreva a ABERTURA da história, apresentando o cenário e o personagem.");
    linhas.push('Marque "ehFinal": false.');
  } else if (tipo === "objeto") {
    const obj = objetoId ? acharObjeto(grafo, objetoId) : undefined;
    if (obj) {
      linhas.push(
        `PEDIDO: a criança acabou de colocar o objeto ${obj.emoji} "${obj.nome}" na história` +
          (historia.length === 0 ? " (é o primeiro objeto)" : "") +
          `. Escreva o trecho que esse objeto desperta, coerente com o papel dele no fim ("${obj.papel_no_fim}").`
      );
    } else {
      linhas.push(`PEDIDO: a criança colocou um objeto novo ("${objetoId || "?"}"). Escreva um trecho gentil que o acolha na história.`);
    }
    linhas.push('Marque "ehFinal": false.');
  } else {
    const ultimo = historia[historia.length - 1];
    const temRamo = !!ultimo && cen.desfechos.aberto.some((d) => d.se_terminou_com === ultimo);
    if (modoDesfecho === "aberto" && temRamo && ultimo) {
      linhas.push(`PEDIDO: escreva o DESFECHO ABERTO da história, amarrado ao último objeto (${nomeLegivel(grafo, ultimo)}).`);
    } else if (modoDesfecho === "aberto") {
      // Espelha a degradação do Motor A: aberto sem ramo → convergente acolhedor.
      linhas.push("PEDIDO: escreva um DESFECHO convergente e acolhedor — o último objeto não tem ramo próprio, e a história se fecha com o mesmo carinho.");
    } else {
      linhas.push("PEDIDO: escreva o DESFECHO CONVERGENTE da história, fechando o dia com aconchego.");
    }
    linhas.push('Marque "ehFinal": true.');
  }

  linhas.push('Responda SOMENTE com o JSON do Trecho: { "texto": string, "ehFinal": boolean }.');
  return linhas.join("\n");
}
