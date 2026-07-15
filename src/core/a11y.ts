/**
 * [a11y.ts] — Helpers puros que traduzem A11yPrefs em CSS concreto (fonte,
 *   paleta de contraste, transição, animação de cena).
 *
 * PAPEL: core-lógica (helpers de estilo · puro, sem UI, sem estado)
 * POR QUE EXISTE: separar a decisão de acessibilidade (o que a criança/cuidador
 *   ligou) da string CSS que a tela aplica — evita espalhar `if a11y.x` pelas telas.
 * ENTRA: A11yPrefs (textScale 1|1.2|1.45, dyslexia, syllable, contrast, reduceMotion).
 * SAI: strings CSS — estiloLeitura (fonte/spacing/size), paletaContraste
 *   (tinta/realce/realceStuck), transicao(css), animacaoCena.
 * CHAMA: nada em runtime — só importa o tipo A11yPrefs de ./estado.js (re-exportado).
 * É CHAMADO POR: src/app/bridge.ts (que serve as telas .dc.html em renderVals()).
 * RODA POR: boot do app (via pipoca.bundle.js); coberto de forma transversal em `bun run test`.
 * CUIDADO: reduceMotion → transicao/animacaoCena devolvem "" (cena estática) — o
 *   chamador não deve supor um valor. Estes helpers só devolvem CSS; quem aplica é a tela.
 *
 * — detalhe preservado —
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
