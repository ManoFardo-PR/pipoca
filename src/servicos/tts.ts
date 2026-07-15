/**
 * [tts.ts] — serviço de fala (Text-to-Speech) que abstrai window.speechSynthesis
 *   atrás de ServicoTTS, para narrar o texto à criança.
 *
 * PAPEL: core-lógica (serviço injetável · TTS)
 * POR QUE EXISTE: as telas não devem falar com speechSynthesis direto; este
 *   serviço centraliza voz/ritmo e some em silêncio onde não há Web Speech API.
 * ENTRA: falar(texto, opts? {lang?, rate?, pitch?}).
 * SAI: efeito colateral — fala o texto (void); singleton `tts` pronto p/ injeção.
 * CHAMA: window.speechSynthesis / SpeechSynthesisUtterance (browser); sem imports.
 * É CHAMADO POR: app/bridge.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes.
 * CUIDADO: ausência de Web Speech API → no-op silencioso (não quebra o portão/leitura).
 *   Voz pt-BR preferida → qualquer pt → padrão. rate 0.82, pitch 1.05 (igual ao protótipo).
 *
 * — detalhe preservado —
 * src/servicos/tts.ts
 * Serviço de TTS — abstrai window.speechSynthesis atrás de ServicoTTS.
 * Portado do _speak inline do Pipoca.dc.html (protótipo).
 *
 * Regras:
 *   - Telas dependem de ServicoTTS, nunca de speechSynthesis diretamente.
 *   - Ausência de Web Speech API → no-op silencioso (não quebra o portão).
 *   - Voz pt-BR preferida; fallback para qualquer voz pt; fallback para padrão.
 *   - rate 0.82, pitch 1.05 (igual ao protótipo).
 */

export interface ServicoTTS {
  falar(texto: string, opts?: { lang?: string; rate?: number; pitch?: number }): void;
}

class ServicoTTSWebSpeech implements ServicoTTS {
  falar(texto: string, opts?: { lang?: string; rate?: number; pitch?: number }): void {
    try {
      const synth = (typeof window !== 'undefined') ? window.speechSynthesis : null;
      if (!synth) return;

      synth.cancel();

      const u = new SpeechSynthesisUtterance(texto);
      u.lang  = opts?.lang  ?? 'pt-BR';
      u.rate  = opts?.rate  ?? 0.82;
      u.pitch = opts?.pitch ?? 1.05;

      const vozes = synth.getVoices();
      const voz =
        vozes.find(v => /pt[-_]?BR/i.test(v.lang)) ||
        vozes.find(v => /pt/i.test(v.lang));
      if (voz) u.voice = voz;

      synth.speak(u);
    } catch (_) {
      /* no-op — ausência de TTS não deve quebrar a leitura */
    }
  }
}

/** Instância singleton pronta para injeção nas telas via props/contexto. */
export const tts: ServicoTTS = new ServicoTTSWebSpeech();
