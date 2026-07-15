/**
 * [cardapio.ts] — Modelo canônico do cardápio de recompensas + cenários liberados,
 *   com defaults seguros e normalização do que vem do save/edição do cuidador.
 *
 * PAPEL: core-lógica (cardápio de recompensas + cenários liberados · PC_RULES)
 * POR QUE EXISTE: dar um shape único ao menu que a Tela 7 resgata e o Controle Parental
 *   edita (antes inline na tela), tolerando dados ausentes/corrompidos.
 * ENTRA: raw desconhecido (ItemCardapio[]/string[] vindos do save ou da edição do cuidador).
 * SAI: ItemCardapio[] normalizado (CARDAPIO_PADRAO se vazio/inválido) e string[] de cenários
 *   liberados (CENARIOS_PADRAO = ["quintal_anoitecer"]); validarItemCardapio (type guard).
 * CHAMA: nada externo.
 * É CHAMADO POR: src/core/estado.ts (tipo ItemCardapio), src/dados/schemas.ts,
 *   src/app/bridge.ts, src/core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: normalização silenciosa — lista vazia/inválida cai para CARDAPIO_PADRAO /
 *   CENARIOS_PADRAO. Sem dark patterns; custos (cost) transparentes.
 *
 * — detalhe preservado —
 * Pipoca — Cardápio de recompensas e cenários liberados (PC_RULES) · doc fase02-02-07
 * -----------------------------------------------------------------------------------
 * Modelo canônico do cardápio que a Tela 7 ([[fase01-01-11]]) resgata e que o Controle
 * Parental edita. Extrai o menu antes inline na Tela 7. Sem dark patterns; custos transparentes.
 */

export interface ItemCardapio {
  id: string;
  label: string;
  icon: string;
  cost: number;
}

/** Cardápio padrão (defaults seguros do protótipo). */
export const CARDAPIO_PADRAO: ItemCardapio[] = [
  { id: "parque", label: "30 min de parque", icon: "🛝", cost: 6 },
  { id: "jantar", label: "Escolher o jantar", icon: "🍝", cost: 4 },
  { id: "historia", label: "História extra antes de dormir", icon: "📖", cost: 3 },
  { id: "bike", label: "Passeio de bike", icon: "🚲", cost: 8 },
  { id: "tela", label: "Tempo de tela", icon: "📺", cost: 5 },
  { id: "amigo", label: "Brincar com um amigo", icon: "🤝", cost: 5 },
];

export function validarItemCardapio(it: unknown): it is ItemCardapio {
  if (!it || typeof it !== "object") return false;
  const r = it as Record<string, unknown>;
  return (
    typeof r["id"] === "string" && (r["id"] as string).length > 0 &&
    typeof r["label"] === "string" && (r["label"] as string).length > 0 &&
    typeof r["icon"] === "string" &&
    typeof r["cost"] === "number" && (r["cost"] as number) >= 0
  );
}

/** Normaliza um cardápio candidato; vazio/inválido → CARDAPIO_PADRAO. */
export function normalizarCardapio(raw: unknown): ItemCardapio[] {
  if (!Array.isArray(raw)) return [...CARDAPIO_PADRAO];
  const itens = raw.filter(validarItemCardapio);
  return itens.length > 0 ? itens : [...CARDAPIO_PADRAO];
}

/** Cenários liberados para a galeria (T3). Default: o quintal. */
export const CENARIOS_PADRAO: string[] = ["quintal_anoitecer"];

export function normalizarCenariosLiberados(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...CENARIOS_PADRAO];
  const ids = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  return ids.length > 0 ? ids : [...CENARIOS_PADRAO];
}
