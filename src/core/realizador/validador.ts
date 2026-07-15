/**
 * [validador.ts] — Validador de fidelidade do texto realizado: confere âncoras,
 *   corpo, gênero, comprimento e ritmo e devolve um veredito (pass/motivos/avisos).
 *
 * PAPEL: core-lógica (realizador · fase 12 · gate de fidelidade determinístico)
 * POR QUE EXISTE: o texto do LLM só chega à criança se for FIEL ao Pacote — este é o
 *   juiz determinístico (Camada 1 do experimento promovida a runtime) que a cascata
 *   consulta a cada tentativa.
 * ENTRA: PacoteComposicao, o texto realizado (string|undefined) e os parágrafos.
 * SAI: VereditoRealizador { pass, motivos, avisos, ritmoN1?, presencaPorBeat }.
 * CHAMA: compositor/pacote.ts:PacoteComposicao (tipo), prompt_template.ts:
 *   maximoPalavrasDoPacote.
 * É CHAMADO POR: realizador/cascata.ts (validar, a cada tentativa), realizador.test.ts.
 *   O tipo VereditoRealizador viaja para geracao/geracao.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes —
 *   `bun run src/core/realizador/realizador.test.ts` (dentro de `bun run test`).
 * CUIDADO: `pass = motivos.length === 0` — FAIL NUNCA chega à criança (a cascata troca
 *   de provedor / cai no fallback A+ v3); ritmo n1 é GATE (não só aviso); tempo verbal
 *   e parágrafos são AVISO, não bloqueiam; âncoras com sufixo `*` são PREFIXO de token
 *   (ex.: `gota*` casa gota/gotas/gotinha — correção do orvalho).
 *
 * — detalhe preservado —
 * Pipoca — Validador de fidelidade do realizador (validador.ts)
 * -------------------------------------------------------------
 * A Camada 1 do experimento PROMOVIDA a runtime (fase12-12-03). Porte de
 * `experimentos/fichas-para-historias/avaliar/camada1-fichas.ts` adaptado ao
 * PacoteComposicao: âncoras por beat do Pacote, presença POR BEAT (não fração
 * de sentenças), gênero bidirecional parametrizado, teto sobre o MÁXIMO
 * CANÔNICO de comprimento (herança 1), ritmo n1 como GATE, aviso de tempo
 * verbal. `pass = motivos.length === 0`; FAIL nunca chega à criança (12-04).
 *
 * Correção do orvalho (herança 4, evidência no PR da fase 12): os 12 FAILs de
 * âncora do orvalho no PR #21 eram todos "Gotas" (plural) — a âncora "gota"
 * como token EXATO não casava. Lista estreita, não omissão do modelo: agora
 * `gota*` (prefixo) captura gota/gotas/gotinha.
 */

import type { PacoteComposicao } from "../compositor/pacote.js";
import { maximoPalavrasDoPacote } from "./prompt_template.js";

export const LIMIAR_PONTOS_FINAIS_N1 = 12;
export const LIMIAR_MEDIA_FRASES_POR_BEAT_N1 = 2;
/** Tolerância sobre o MÁXIMO canônico do nível×rodada (tabela da herança 1). */
export const TETO_CRESCIMENTO = 0.25;

// AVISO (não gate) de tempo verbal: sufixos comuns de pretérito
// perfeito/imperfeito; stop-list mínima para presentes que terminam em "ou".
const SUFIXOS_PRETERITO = /(ava|avam|iam|ou|aram)$/;
const PRESENTES_EM_OU = new Set(["sou", "vou", "estou", "dou"]);
const LIMIAR_MARCAS_PRETERITO = 2;

// Termos-âncora por objeto (linhagem: termos-nucleo.ts do experimento-beats →
// camada1-fichas.ts do experimento-fichas; origem futura possível: derivar das
// próprias fichas — registrado no 12-03).
// Convenção: sufixo "*" = prefixo de token; espaço = substring; senão token exato.
export const ANCORAS_POR_OBJETO: Record<string, string[]> = {
  vagalume: ["faísca", "luz", "lanterna*", "pisca*", "vaga-lume"],
  frasco: ["pote", "vidro", "frasco*", "tampa*"],
  gato: ["gato", "bicho", "olhos verdes"],
  lua: ["lua", "prata", "luar"],
  vento: ["vento", "brisa", "fresco*", "sopr*"],
  folha: ["folha", "folhas"],
  orvalho: ["orvalho", "gota*", "gotinha", "grama molhada"],
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

/** Shape canônico do 12-00/12-03 (+ presencaPorBeat, herdado da Camada 1 das fichas). */
export interface VereditoRealizador {
  pass: boolean;
  motivos: string[];
  avisos: string[];
  ritmoN1?: { pontosFinais: number; mediaFrasesPorBeat: number; ok: boolean };
  presencaPorBeat: Record<string, boolean>;
}

export function validar(
  pacote: PacoteComposicao,
  texto: string | undefined,
  paragrafos: string[]
): VereditoRealizador {
  const motivos: string[] = [];
  const avisos: string[] = [];
  const presencaPorBeat: Record<string, boolean> = {};

  if (typeof texto !== "string" || texto.trim() === "") {
    return { pass: false, motivos: ["texto realizado ausente ou vazio"], avisos, presencaPorBeat };
  }

  const frases = sentencas(texto);

  // 1. Cobertura de núcleo + presença POR BEAT (12-03: régua por beat, não por sentença)
  for (const beat of pacote.beats) {
    const ancoras = ANCORAS_POR_OBJETO[beat.objeto];
    if (!ancoras) {
      avisos.push(`objeto "${beat.objeto}" sem tabela de âncoras — cobertura não verificada`);
      continue;
    }
    const idx = frases.findIndex((f) => contemAncora(f, ancoras));
    if (idx === -1) {
      motivos.push(`objeto "${beat.objeto}" sem âncora no texto realizado`);
      presencaPorBeat[beat.objeto] = false;
      continue;
    }
    const janela = frases.slice(Math.max(0, idx - 1), idx + 2).join(" ");
    const coberto = temMarcaDeCorpo(janela, norm(pacote.personagem.nome));
    presencaPorBeat[beat.objeto] = coberto;
    if (!coberto) motivos.push(`beat "${beat.objeto}" sem marca de corpo/personagem na janela da âncora`);
  }

  // 2. Gênero bidirecional (nome/gênero parametrizados pelo Pacote)
  const toks = tokens(texto);
  const nomeNorm = norm(pacote.personagem.nome);
  const genero = pacote.personagem.genero;
  if (!toks.includes(nomeNorm)) motivos.push(`nome da protagonista ("${pacote.personagem.nome}") ausente`);
  const artigoOposto = genero === "f" ? "o" : "a";
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i] === artigoOposto && toks[i + 1] === nomeNorm) {
      motivos.push(`artigo do gênero oposto antes do nome ("${artigoOposto} ${pacote.personagem.nome}")`);
      break;
    }
  }
  const palavraOposta = genero === "f" ? "menino" : "menina";
  if (toks.includes(palavraOposta)) motivos.push(`palavra do gênero oposto ("${palavraOposta}")`);
  for (const flexao of flexoesPredicativasOpostas(texto, genero)) {
    motivos.push(`flexão predicativa do gênero oposto ("${flexao}")`);
  }

  // 3. Teto de crescimento — base = MÁXIMO CANÔNICO do nível×rodada (herança 1;
  // no experimento a base era o alvo proporcional ao material).
  const palavrasTexto = contarPalavras(texto);
  const maximo = maximoPalavrasDoPacote(pacote);
  const razao = (palavrasTexto - maximo) / maximo;
  if (razao > TETO_CRESCIMENTO) {
    motivos.push(
      `crescimento de ${Math.round(razao * 100)}% sobre o máximo canônico de ${maximo} palavras (teto ${TETO_CRESCIMENTO * 100}%)`
    );
  }

  // 4. Parágrafos (D-12.1: segmentação é do LLM por instrução; desvio é AVISO)
  if (paragrafos.length !== pacote.restricoes.paragrafos) {
    avisos.push(`parágrafos fora do alvo: ${paragrafos.length} (alvo ${pacote.restricoes.paragrafos})`);
  }

  // 5. Tempo verbal — AVISO: o registro do produto é PRESENTE.
  const marcasPreterito = toks.filter((tk) => SUFIXOS_PRETERITO.test(tk) && !PRESENTES_EM_OU.has(tk)).length;
  if (marcasPreterito >= LIMIAR_MARCAS_PRETERITO) {
    avisos.push(`tempo passado: ${marcasPreterito} marcas de pretérito (limiar ${LIMIAR_MARCAS_PRETERITO})`);
  }

  // 6. Ritmo n1 — GATE (12-03: evolução deliberada da métrica informativa)
  let ritmoN1: VereditoRealizador["ritmoN1"];
  if (pacote.nivel === "n1") {
    const pontosFinais = (texto.match(/\./g) || []).length;
    const beats = pacote.beats.length;
    const mediaFrasesPorBeat = beats > 0 ? pontosFinais / beats : 0;
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
