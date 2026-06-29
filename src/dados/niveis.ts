import type { Fragmento4, Nivel } from "../core/grafo/tipos.js";

export type { Nivel };

export const ROTULOS_NIVEL: Record<Nivel, string> = {
  n1: "Primeiras palavras — sílabas e palavras soltas",
  n2: "Frases curtas — uma linha",
  n3: "Pequenos textos — frases ligadas",
  n4: "Parágrafos — histórias mais longas",
};

export function fragmentoDoNivel(f: Fragmento4, nivel: Nivel): string {
  return f[nivel];
}
