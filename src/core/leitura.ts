/**
 * src/core/leitura.ts — Tokenização e detecção de palavras difíceis
 * Puro, sem UI, sem TTS. Substitui o _gateWords() hardcoded do protótipo.
 *
 * Regras:
 *   - tokenizarTrecho: quebra texto em palavras preservando pontuação anexa
 *   - ehPalavraDificil: heurística neutra (dígrafos, compostos, comprimento)
 *     → "trupé" não significa "errada"; é só "precisa de atenção"
 */

/**
 * Tokeniza o texto de um Trecho em palavras (preservando pontuação anexa).
 * "A Joana, curiosa." → ["A", "Joana,", "curiosa."]
 */
export function tokenizarTrecho(texto: string): string[] {
  if (!texto || typeof texto !== "string") return [];
  return texto
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Heurística neutra para palavras que merecem atenção extra.
 * Critérios (sem conceito de "errado"):
 *   - comprimento > 7 letras
 *   - hífen composto (ex.: "vaga-lume")
 *   - dígrafos específicos do Português: lh, nh, rr, ss, ão, ãe, etc.
 *   - palavras com acento circunflexo (mais raras no nível n1/n2)
 */
export function ehPalavraDificil(palavra: string): boolean {
  const limpa = palavra.replace(/[.,!?;:"""''()\-]/g, "").toLowerCase();
  if (limpa.length === 0) return false;

  if (limpa.length > 7) return true;
  if (palavra.includes("-")) return true;

  const digrafos = ["lh", "nh", "rr", "ss", "ão", "ãe", "ões", "oem"];
  for (const d of digrafos) {
    if (limpa.includes(d)) return true;
  }

  const acentos = /[âêôáéíóúãõ]/;
  if (acentos.test(limpa) && limpa.length > 5) return true;

  return false;
}

/**
 * Separa sílabas inserindo · entre elas.
 * Implementação simplificada para MVP (heurística baseada em vogais).
 * Ex.: "Joana" → "Joa·na", "vaga" → "va·ga"
 */
export function silabar(palavra: string): string {
  const limpa = palavra.replace(/[.,!?;:"""''()]/g, "");
  const pontuacao = palavra.slice(limpa.length);

  if (limpa.length <= 2) return palavra;

  const resultado: string[] = [];
  const vogais = /[aeiouáéíóúâêôãõàü]/i;
  let silaba = "";
  let contVogais = 0;

  for (let i = 0; i < limpa.length; i++) {
    const c = limpa[i];
    silaba += c;
    if (vogais.test(c)) {
      contVogais++;
      if (contVogais >= 1 && i < limpa.length - 1 && !vogais.test(limpa[i + 1] ?? "")) {
        resultado.push(silaba);
        silaba = "";
        contVogais = 0;
      }
    }
  }
  if (silaba) resultado.push(silaba);

  return (resultado.length > 1 ? resultado.join("\u00b7") : limpa) + pontuacao;
}
