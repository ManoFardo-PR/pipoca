/**
 * [camada1-fichas.ts] — gate determinístico de fidelidade do experimento
 *   (Camada 1): confere presença por beat, gênero, teto de crescimento e ritmo
 *   n1 do texto realizado.
 *
 * PAPEL: experimento (arquivado)
 * POR QUE EXISTE: era a Camada 1 do ciclo 1 (avaliação sem LLM) — hoje LEGADO
 *   preservado como registro: esta é a LINHAGEM que foi promovida ao validador
 *   canônico de produção (src/core/realizador/validador.ts, que cita este
 *   arquivo como origem). NÃO está mais no caminho ativo.
 * ENTRA: EstadoExperimento, palavrasMaterial, alvoPalavras, paragrafosAlvo e o
 *   texto realizado.
 * SAI: VereditoCamada1Fichas { pass, motivos, avisos, ritmoN1?, presencaPorBeat };
 *   exporta ANCORAS_POR_OBJETO.
 * CHAMA: só tipos de ../tipos.js (EstadoExperimento, VereditoCamada1Fichas);
 *   lógica self-contained.
 * É CHAMADO POR: ninguém no caminho ativo (andaime arquivado). Sua semântica
 *   vive hoje em src/core/realizador/validador.ts (herdeiro de produção).
 * RODA POR: offline — não roda no fluxo atual; historicamente parte da
 *   avaliação do ciclo 1.
 * CUIDADO: legado preservado como REGISTRO, fora do caminho ativo — superado
 *   pelo validador canônico de produção que nasceu daqui. Offline (gate
 *   determinístico, sem rede/API).
 *
 * — detalhe preservado —
 * Experimento fichas→histórias — Camada 1: gate DETERMINÍSTICO de fidelidade,
 * adaptado às fichas (linhagem: ../beats-para-paragrafos/avaliar/camada1-fidelidade.ts,
 * com as mudanças fixadas em docs/plans02/fase12_b1_5_realizador/12-03):
 *  1. presença POR BEAT (não fração de sentenças — a lição dos 3 falsos-FAIL);
 *  2. personagem PARAMETRIZADO e gênero BIDIRECIONAL (veredito A-1);
 *  3. base do teto de crescimento = material textual do prompt (as fichas);
 *  4. ritmo n1 promovido a GATE (≤12 pontos finais; ≤2 frases/beat).
 */

import type { EstadoExperimento, VereditoCamada1Fichas } from "../tipos.js";

const LIMIAR_PONTOS_FINAIS_N1 = 12;
const LIMIAR_MEDIA_FRASES_POR_BEAT_N1 = 2;
// Tolerância sobre o ALVO calculado (C-1/C-3 da recalibração): o texto pode
// passar até 25% do alvoPalavras registrado na geração — não mais sobre o
// material bruto, que estrangulava as células de material grande.
const TETO_CRESCIMENTO = 0.25;

// AVISO (não gate) de tempo verbal (C-3): sufixos comuns de pretérito
// perfeito/imperfeito. Limiar-semente calibrável; stop-list mínima para
// presentes que terminam em "ou".
const SUFIXOS_PRETERITO = /(ava|avam|iam|ou|aram)$/;
const PRESENTES_EM_OU = new Set(["sou", "vou", "estou", "dou"]);
const LIMIAR_MARCAS_PRETERITO = 2;

// Termos-âncora por objeto (linhagem: termos-nucleo.ts:11-19 do experimento-beats;
// origem futura possível: derivar das próprias fichas — registrado no 12-03).
// Convenção: sufixo "*" = prefixo de token; espaço = substring; senão token exato.
export const ANCORAS_POR_OBJETO: Record<string, string[]> = {
  vagalume: ["faísca", "luz", "lanterna*", "pisca*", "vaga-lume"],
  frasco: ["pote", "vidro", "frasco*", "tampa*"],
  gato: ["gato", "bicho", "olhos verdes"],
  lua: ["lua", "prata", "luar"],
  vento: ["vento", "brisa", "fresco*", "sopr*"],
  folha: ["folha", "folhas"],
  orvalho: ["orvalho", "gota", "gotinha", "grama molhada"],
};

// Marcas de corpo/protagonista (linhagem: termos-nucleo.ts:21-50 do experimento-beats).
const TERMOS_CORPO = [
  "ela", "ele", "dela", "dele", "pé", "pés", "mão", "mãos", "palma", "dedo", "dedos",
  "olho", "olhos", "olhar", "peito", "cabelo", "cabelos", "rosto", "queixo",
  "respiração", "pele", "braço", "braços", "ombro", "ombros", "pescoço", "nuca", "coração",
];

// Flexões predicativas com gênero (mesma semente/heurística do A2 do lint de fichas).
const ADJ_F = ["quieta", "sozinha", "descalça", "atenta", "agachada"];
const ADJ_M = ["quieto", "sozinho", "descalço", "atento", "agachado"];

const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s: string): string[] => norm(s).split(/[^a-z0-9-]+/).filter(Boolean);
const sentencas = (s: string): string[] => s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
const contarPalavras = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const pareceVerbo = (p: string): boolean => /(ar|er|ir|ndo)$/.test(p) && p.length > 3;

function contemAncora(texto: string, ancoras: string[]): boolean {
  const t = norm(texto);
  const toks = tokens(texto);
  return ancoras.some((a) => {
    const an = norm(a);
    if (an.endsWith("*")) {
      const prefixo = an.slice(0, -1);
      return toks.some((tk) => tk.startsWith(prefixo));
    }
    if (an.includes(" ")) return t.includes(an);
    return toks.includes(an);
  });
}

function temMarcaDeCorpo(texto: string, nomeNorm: string): boolean {
  const toks = tokens(texto);
  if (toks.includes(nomeNorm)) return true;
  return TERMOS_CORPO.some((termo) => toks.includes(norm(termo)));
}

function flexoesPredicativasOpostas(texto: string, genero: "f" | "m"): string[] {
  const opostas = (genero === "f" ? ADJ_M : ADJ_F).map(norm);
  const toks = tokens(texto);
  const achadas: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (!opostas.includes(toks[i]!)) continue;
    const anterior = i > 0 ? toks[i - 1]! : "";
    if (anterior === "" || pareceVerbo(anterior)) achadas.push(toks[i]!);
  }
  return achadas;
}

export function avaliarCamada1Fichas(
  estado: EstadoExperimento,
  palavrasMaterial: number,
  alvoPalavras: number,
  paragrafosAlvo: [number, number],
  texto: string | undefined
): VereditoCamada1Fichas {
  const motivos: string[] = [];
  const avisos: string[] = [];
  const presencaPorBeat: Record<string, boolean> = {};

  if (typeof texto !== "string" || texto.trim() === "") {
    return { pass: false, motivos: ["texto realizado ausente ou vazio"], avisos, presencaPorBeat };
  }

  const frases = sentencas(texto);

  // 1. Cobertura de núcleo + presença POR BEAT
  for (const objetoId of estado.linha) {
    const ancoras = ANCORAS_POR_OBJETO[objetoId];
    if (!ancoras) {
      avisos.push(`objeto "${objetoId}" sem tabela de âncoras — cobertura não verificada`);
      continue;
    }
    const idx = frases.findIndex((f) => contemAncora(f, ancoras));
    if (idx === -1) {
      motivos.push(`objeto "${objetoId}" sem âncora no texto realizado`);
      presencaPorBeat[objetoId] = false;
      continue;
    }
    const janela = frases.slice(Math.max(0, idx - 1), idx + 2).join(" ");
    const coberto = temMarcaDeCorpo(janela, norm(estado.personagem));
    presencaPorBeat[objetoId] = coberto;
    if (!coberto) motivos.push(`beat "${objetoId}" sem marca de corpo/personagem na janela da âncora`);
  }

  // 2. Gênero bidirecional (nome parametrizado)
  const toks = tokens(texto);
  const nomeNorm = norm(estado.personagem);
  if (!toks.includes(nomeNorm)) motivos.push(`nome da protagonista ("${estado.personagem}") ausente`);
  const artigoOposto = estado.genero === "f" ? "o" : "a";
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i] === artigoOposto && toks[i + 1] === nomeNorm) {
      motivos.push(`artigo do gênero oposto antes do nome ("${artigoOposto} ${estado.personagem}")`);
      break;
    }
  }
  const palavraOposta = estado.genero === "f" ? "menino" : "menina";
  if (toks.includes(palavraOposta)) motivos.push(`palavra do gênero oposto ("${palavraOposta}")`);
  for (const flexao of flexoesPredicativasOpostas(texto, estado.genero)) {
    motivos.push(`flexão predicativa do gênero oposto ("${flexao}")`);
  }

  // 3. Teto de crescimento — base = ALVO registrado na geração (C-3; era o
  // material bruto antes da recalibração). Tolerância de +25% sobre o alvo.
  const palavrasTexto = contarPalavras(texto);
  const base = alvoPalavras > 0 ? alvoPalavras : palavrasMaterial;
  const razao = base > 0 ? (palavrasTexto - base) / base : 0;
  if (razao > TETO_CRESCIMENTO) {
    motivos.push(
      `crescimento de ${Math.round(razao * 100)}% sobre o alvo de ${base} palavras (teto ${TETO_CRESCIMENTO * 100}%)`
    );
  }

  // 4. Parágrafos (D-12.1: instrução ao LLM; desvio é AVISO para calibração)
  const paragrafos = texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const [minPar, maxPar] = paragrafosAlvo;
  if (paragrafos.length < minPar || paragrafos.length > maxPar) {
    avisos.push(`parágrafos fora do alvo: ${paragrafos.length} (alvo ${minPar}–${maxPar})`);
  }

  // 5. Tempo verbal — AVISO (C-3): o registro do produto é PRESENTE; marcas
  // de pretérito acima do limiar entram no relatório para a leitura decidir.
  const marcasPreterito = toks.filter((tk) => SUFIXOS_PRETERITO.test(tk) && !PRESENTES_EM_OU.has(tk)).length;
  if (marcasPreterito >= LIMIAR_MARCAS_PRETERITO) {
    avisos.push(`tempo passado: ${marcasPreterito} marcas de pretérito (limiar ${LIMIAR_MARCAS_PRETERITO})`);
  }

  // 6. Ritmo n1 — GATE no runtime da geração 2 (12-03, evolução deliberada)
  let ritmoN1: VereditoCamada1Fichas["ritmoN1"];
  if (estado.nivel === "n1") {
    const pontosFinais = (texto.match(/\./g) || []).length;
    const mediaFrasesPorBeat = estado.linha.length > 0 ? pontosFinais / estado.linha.length : 0;
    const ok = pontosFinais <= LIMIAR_PONTOS_FINAIS_N1 && mediaFrasesPorBeat <= LIMIAR_MEDIA_FRASES_POR_BEAT_N1;
    ritmoN1 = { pontosFinais, mediaFrasesPorBeat, ok };
    if (!ok) {
      motivos.push(
        `ritmo n1 estourado: ${pontosFinais} pontos finais, ${mediaFrasesPorBeat.toFixed(1)} frases/beat (tetos ${LIMIAR_PONTOS_FINAIS_N1}/${LIMIAR_MEDIA_FRASES_POR_BEAT_N1})`
      );
    }
  }

  return { pass: motivos.length === 0, motivos, avisos, ritmoN1, presencaPorBeat };
}
