/**
 * [camada1-fidelidade.ts] — Camada 1 do avaliador B1.5: gate factual
 *   determinístico (código puro, sem IA) que compara o texto realizado com a
 *   história-base e devolve pass + motivos/avisos.
 *
 * PAPEL: experimento (B1.5 · gate factual · OFFLINE)
 * POR QUE EXISTE: proteger a fidelidade (cobertura dos objetos, presença da
 *   protagonista, nome/gênero, teto de crescimento) ANTES de gastar o juiz LLM
 *   pago — é a fonte de verdade sobre fidelidade e o protótipo do validador de
 *   runtime do B1.5.
 * ENTRA: um Par { base, resposta } (history-base + resposta do LLM).
 * SAI: VereditoCamada1 { pass, motivos, avisos, ritmoN1? }.
 * CHAMA: termos-nucleo.ts:{ANCORAS_POR_OBJETO,contemAncora,
 *   fracaoSentencasComProtagonista,palavrasDe}; ../tipos.js.
 * É CHAMADO POR: avaliar-pares.ts:avaliarCamada1; avaliar-pares.test.ts.
 * RODA POR: importado por avaliar-pares.ts; nos testes,
 *   `bun run experimentos/beats-para-paragrafos/avaliar/avaliar-pares.test.ts`.
 * CUIDADO: OFFLINE/grátis e determinístico — nenhuma IA. É o gate que decide se
 *   a Camada 2 (juiz LLM pago) roda. Tokeniza com palavrasDe, nunca `\b` cru:
 *   o `\b` do regex JS não reconhece acentos e casaria falso positivo em PT.
 *
 * — detalhe preservado —
 * Experimento B1.5 — Camada 1: gate factual determinístico (código, sem
 * IA). Protótipo do validador de runtime do B1.5 — fonte de verdade sobre
 * fidelidade; a Camada 2 (juiz LLM) só roda em cima do que passa aqui.
 */

import { ANCORAS_POR_OBJETO, contemAncora, fracaoSentencasComProtagonista, palavrasDe } from "./termos-nucleo.js";
import type { Par, VereditoCamada1 } from "../tipos.js";

const LIMIAR_PRESENCA = 0.6;
const TETO_CRESCIMENTO = 0.25;
const LIMIAR_PONTOS_FINAIS_N1 = 12;
const LIMIAR_MEDIA_FRASES_POR_BEAT_N1 = 2;

function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter((p) => p.length > 0).length;
}

function contarPontosFinais(texto: string): number {
  return (texto.match(/\./g) || []).length;
}

export function avaliarCamada1(par: Par): VereditoCamada1 {
  const { base, resposta } = par;
  const motivos: string[] = [];
  const avisos: string[] = [];

  if (!resposta.ok || !resposta.textoLimpo) {
    return { pass: false, motivos: [`resposta do LLM sem sucesso (${resposta.erro ?? "sem texto"})`], avisos: [] };
  }
  const textoLimpo = resposta.textoLimpo;

  // Cobertura de núcleo — cada objeto da linha precisa deixar uma marca.
  for (const objeto of base.objetosDaLinha) {
    const ancoras = ANCORAS_POR_OBJETO[objeto];
    if (!ancoras) {
      avisos.push(`objeto "${objeto}" sem tabela de âncoras — cobertura não verificada`);
      continue;
    }
    if (!contemAncora(textoLimpo, ancoras)) {
      motivos.push(`objeto "${objeto}" sem âncora encontrada no texto realizado`);
    }
  }

  // Presença da protagonista (Lei 1), adaptada para sentenças (ver termos-nucleo.ts).
  const presenca = fracaoSentencasComProtagonista(textoLimpo);
  if (presenca < LIMIAR_PRESENCA) {
    motivos.push(`presença da protagonista em ${Math.round(presenca * 100)}% das sentenças (limiar ${LIMIAR_PRESENCA * 100}%)`);
  }

  // Nome/gênero. Tokenizado (não `\b` cru): `\b` do regex JS não reconhece
  // letras acentuadas como \w, então em "então joana" ele enxerga um limite
  // de palavra depois do "ã" e `/\bo joana\b/` casaria por engano no "o"
  // final de "então" — falso positivo real, visto no smoke test em produção.
  const palavrasLimpoTokens = palavrasDe(textoLimpo);
  const nomePresente = palavrasLimpoTokens.includes("joana");
  if (!nomePresente) {
    motivos.push('nome da protagonista ("Joana") ausente do texto realizado');
  }
  const temMenino = palavrasLimpoTokens.includes("menino");
  const temArtigoMasculinoAntesDoNome = palavrasLimpoTokens.some(
    (p, i) => p === "o" && palavrasLimpoTokens[i + 1] === "joana"
  );
  if (temArtigoMasculinoAntesDoNome || temMenino) {
    motivos.push("indício de troca de gênero da protagonista");
  }

  // Teto de crescimento — recomputado aqui de forma independente do gerador.
  const palavrasOriginal = contarPalavras(base.texto);
  const palavrasLimpo = contarPalavras(textoLimpo);
  const razaoCrescimento = palavrasOriginal > 0 ? (palavrasLimpo - palavrasOriginal) / palavrasOriginal : 0;
  if (razaoCrescimento > TETO_CRESCIMENTO) {
    motivos.push(`crescimento de ${Math.round(razaoCrescimento * 100)}% acima do teto de ${TETO_CRESCIMENTO * 100}%`);
  }

  // Sem evento novo grosseiro — heurística, só aviso.
  const nomesConhecidos = new Set(["joana", ...base.objetosDaLinha.map((o) => o.toLowerCase())]);
  const nomesProprios = textoLimpo.match(/(?<!^)(?<=[a-zà-ÿ,;:—-]\s)[A-ZÀ-Ý][a-zà-ÿ]+/gu) || [];
  for (const nome of nomesProprios) {
    if (!nomesConhecidos.has(nome.toLowerCase())) {
      avisos.push(`nome próprio fora do elenco conhecido: "${nome}"`);
    }
  }
  const baseTinhaAspas = /["“”«»]/.test(base.texto);
  const limpoTemAspas = /["“”«»]/.test(textoLimpo);
  if (limpoTemAspas && !baseTinhaAspas) {
    avisos.push("fala entre aspas apareceu no texto realizado sem existir no texto base");
  }

  // Ritmo n1 — métrica separada, não mistura com o gate de conteúdo.
  let ritmoN1: VereditoCamada1["ritmoN1"];
  if (base.nivel === "n1") {
    const pontosFinais = contarPontosFinais(textoLimpo);
    const mediaFrasesPorBeat = base.objetosDaLinha.length > 0 ? pontosFinais / base.objetosDaLinha.length : 0;
    ritmoN1 = {
      pontosFinais,
      mediaFrasesPorBeat,
      ok: pontosFinais <= LIMIAR_PONTOS_FINAIS_N1 && mediaFrasesPorBeat <= LIMIAR_MEDIA_FRASES_POR_BEAT_N1,
    };
  }

  return { pass: motivos.length === 0, motivos, avisos, ritmoN1 };
}
