/**
 * src/servicos/asr.ts — ASR · modo Fala (fase05-05-09)
 * -----------------------------------------------------
 * `ServicoASR` abstrai o reconhecimento de fala (Web Speech API) atrás do
 * mesmo padrão de serviço injetável do irmão tts.ts.
 *
 * Regras:
 *   - Telas dependem de ServicoASR, nunca de SpeechRecognition diretamente.
 *   - Avalia PARTICIPAÇÃO, não perfeição: qualquer fala detectada conta
 *     (baixa confiança AINDA conta) — nunca envergonha a criança.
 *   - Indisponível / sem permissão / erro / timeout → resolve
 *     { participou: false, confianca: 0 } — NUNCA rejeita, não quebra o
 *     portão (a tela oferece o caminho do cuidador sem culpar a criança).
 *   - O global é lido LAZY dentro de ouvir() (nada capturado no boot).
 *   - Sem áudio armazenado (LGPD): só transcript/confiança em memória,
 *     nada persiste.
 */

export interface ResultadoFala {
  participou: boolean;
  confianca: number; // 0..1
}

export interface OuvirOpts {
  lang?: string;
  duracaoMaxMs?: number; // teto de escuta; estourou → não-participação gentil
}

export interface ServicoASR {
  ouvir(opts?: OuvirOpts): Promise<ResultadoFala>;
}

/** Superfície mínima do SpeechRecognition que o serviço usa (injetável nos testes). */
export interface ReconhecimentoLike {
  lang: string;
  interimResults?: boolean;
  maxAlternatives?: number;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop?(): void;
  abort?(): void;
}

export interface DepsASR {
  criarReconhecimento?: () => ReconhecimentoLike | null;
  duracaoMaxMs?: number;
}

/** Núcleo puro: mapeia o que a API devolveu em participação (testável sem DOM). */
export function avaliarParticipacao(transcricao: string, confianca?: number): ResultadoFala {
  const falou = typeof transcricao === "string" && transcricao.trim().length > 0;
  if (!falou) return { participou: false, confianca: 0 };
  const c = typeof confianca === "number" && confianca >= 0 && confianca <= 1 ? confianca : 0.3;
  return { participou: true, confianca: c }; // baixa confiança ainda conta
}

/** Há reconhecimento de fala neste aparelho? (gate da opção "Pela voz" nas Regras) */
export function asrDisponivel(): boolean {
  try {
    const g = globalThis as unknown as Record<string, unknown>;
    return !!(g["SpeechRecognition"] || g["webkitSpeechRecognition"]);
  } catch {
    return false;
  }
}

function reconhecimentoDoNavegador(): ReconhecimentoLike | null {
  try {
    const g = globalThis as unknown as Record<string, unknown>;
    const Ctor = (g["SpeechRecognition"] || g["webkitSpeechRecognition"]) as
      | (new () => ReconhecimentoLike)
      | undefined;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

export function criarServicoASR(deps?: DepsASR): ServicoASR {
  const fabricaRec = (deps && deps.criarReconhecimento) || reconhecimentoDoNavegador;
  const duracaoPadrao = (deps && deps.duracaoMaxMs) || 6000;

  return {
    ouvir(opts?: OuvirOpts): Promise<ResultadoFala> {
      return new Promise((resolve) => {
        let terminado = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const fim = (r: ResultadoFala) => {
          if (terminado) return;
          terminado = true;
          if (timer) clearTimeout(timer);
          resolve(r);
        };

        let rec: ReconhecimentoLike | null = null;
        try {
          rec = fabricaRec();
        } catch {
          rec = null;
        }
        // Sem microfone/API não quebra o portão: não-participação gentil.
        if (!rec) {
          fim({ participou: false, confianca: 0 });
          return;
        }

        try {
          rec.lang = (opts && opts.lang) || "pt-BR";
          if ("interimResults" in rec) rec.interimResults = false;
          if ("maxAlternatives" in rec) rec.maxAlternatives = 1;

          rec.onresult = (ev: unknown) => {
            try {
              const r = ev as { results?: Array<Array<{ transcript?: string; confidence?: number }>> };
              const alt = r && r.results && r.results[0] ? r.results[0][0] : undefined;
              const transcricao = alt && typeof alt.transcript === "string" ? alt.transcript : "";
              fim(avaliarParticipacao(transcricao, alt ? alt.confidence : undefined));
            } catch {
              fim({ participou: false, confianca: 0 });
            }
            try {
              if (rec && rec.stop) rec.stop();
            } catch {
              /* silencioso */
            }
          };
          rec.onerror = () => fim({ participou: false, confianca: 0 });
          rec.onend = () => fim({ participou: false, confianca: 0 }); // terminou sem resultado

          const teto = (opts && opts.duracaoMaxMs) || duracaoPadrao;
          timer = setTimeout(() => {
            try {
              const parar = rec && (rec.abort || rec.stop);
              if (rec && parar) parar.call(rec);
            } catch {
              /* silencioso */
            }
            fim({ participou: false, confianca: 0 });
          }, teto);

          rec.start();
        } catch {
          fim({ participou: false, confianca: 0 });
        }
      });
    },
  };
}

/** Instância singleton pronta para injeção nas telas (irmã do tts). */
export const asr: ServicoASR = criarServicoASR();
