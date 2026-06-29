/**
 * src/core/a11y.ts — Helpers de estilo derivados de A11yPrefs
 * Puro, sem UI, sem estado. Telas chamam estes helpers em renderVals().
 *
 * Mapeamento do protótipo:
 *   a11y.dyslexia    → fonte Atkinson Hyperlegible
 *   a11y.syllable    → silabar() das palavras do portão
 *   a11y.contrast    → tinta/realce de alto contraste
 *   a11y.reduceMotion → desliga parallax/respiração/animação
 *   a11y.textScale   → tamanho do texto de leitura
 */

import type { A11yPrefs } from "./estado.js";

export type { A11yPrefs };

/**
 * Retorna o CSS de fonte para o texto de leitura (Tela 5).
 */
export function estiloLeitura(a11y: A11yPrefs): string {
  const fonte = a11y.dyslexia
    ? "'Atkinson Hyperlegible', sans-serif"
    : "'Nunito', sans-serif";
  const spacing = a11y.dyslexia ? "0.06em" : "0.01em";
  const size = Math.round(46 * (a11y.textScale ?? 1));
  return `font-family:${fonte};letter-spacing:${spacing};font-size:${size}px;`;
}

/**
 * Paleta de tinta e realce adaptada ao contraste.
 */
export function paletaContraste(a11y: A11yPrefs): { tinta: string; realce: string; realceStuck: string } {
  return a11y.contrast
    ? { tinta: "#1a1008", realce: "#fbd98f", realceStuck: "#f5d27a" }
    : { tinta: "#3a2c20", realce: "#fce6bf", realceStuck: "#fbe6b8" };
}

/**
 * CSS de transição/animação: vazio se reduceMotion, valor padrão se não.
 */
export function transicao(a11y: A11yPrefs, css: string): string {
  return a11y.reduceMotion ? "" : css;
}

/**
 * CSS de opacidade e transform para parallax/respiração de cenas.
 * Retorna string vazia se reduceMotion (cenas estáticas).
 */
export function animacaoCena(a11y: A11yPrefs): string {
  return a11y.reduceMotion ? "" : "animation:pipFloat 4s ease-in-out infinite;";
}
