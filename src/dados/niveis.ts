/**
 * [niveis.ts] — rótulos legíveis dos níveis e helper para pegar o fragmento
 *   certo de um texto de 4 níveis (base da rota por nível da criança).
 *
 * PAPEL: core-lógica (dados canônicos · modelo de níveis LEVELS, fase00-00-15)
 * POR QUE EXISTE: dá um lugar único para os rótulos amigáveis de cada nível
 *   (n1..n4) e para extrair o fragmento do nível pedido, sem espalhar strings
 *   e índices pelo app.
 * ENTRA: um Nivel ("n1".."n4") e, em fragmentoDoNivel, um Fragmento4.
 * SAI: ROTULOS_NIVEL (texto por nível) e fragmentoDoNivel(f, nivel) → f[nivel];
 *   reexporta o tipo Nivel.
 * CHAMA: ../core/grafo/tipos.js:Fragmento4, ../core/grafo/tipos.js:Nivel.
 * É CHAMADO POR: sem importadores em código hoje — módulo de dados canônicos de
 *   Nivel, citado no doc do grafo (core/grafo/tipos.ts) e na fase00-00-15.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes.
 */

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
