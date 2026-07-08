/**
 * Experimento B1.5 — PRNG seedado próprio, só para as ESCOLHAS ESTRUTURAIS
 * deste experimento (nível/desfecho/ordem/slots). As versões fnv1a/mulberry32
 * de src/core/composicao.ts não são exportadas — são internas à renderização
 * de texto (variantes por linha+nível), não a este uso. Mesmo algoritmo
 * (domínio público), cópia local deliberada para não acoplar ao motor.
 */

export type Rng = () => number;

function fnv1aLocal(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32Local(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deriva um seed numérico determinístico a partir de (seedBase, id). */
export function criarRng(seedBase: number | string, id: string): { seed: number; rng: Rng } {
  const seed = fnv1aLocal(`${seedBase}:${id}`);
  return { seed, rng: mulberry32Local(seed) };
}

/** Fisher–Yates — shuffle completo e uniforme. */
export function embaralhar<T>(arr: T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function indiceAleatorio(tamanho: number, rng: Rng): number {
  return Math.floor(rng() * tamanho);
}
