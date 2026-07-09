/**
 * Experimento B1.5 — tabela de âncoras por objeto + termo-set da
 * protagonista, usados pela Camada 1 (gate factual). Cópias locais
 * deliberadas: as âncoras são específicas deste experimento (não existem em
 * nenhum outro lugar do repo), e TERMOS_PROTAGONISTA replica
 * tests/fumaca-presenca-v3.ts:31-37 (não exportado de lá — é interno àquele
 * gate de fumaça).
 */

/** Cada termo pode ter "*" no fim (== prefixo) ou ser uma frase (checada por substring). */
export const ANCORAS_POR_OBJETO: Record<string, string[]> = {
  vagalume: ["faísca", "luz", "lanterna*", "pisca*"],
  frasco: ["pote", "vidro", "frasco*", "tampa*"],
  gato: ["gato", "bicho", "olhos verdes"],
  lua: ["lua", "prata", "luar"],
  vento: ["vento", "brisa", "fresco*", "sopr*"],
  folha: ["folha", "folhas"],
  orvalho: ["orvalho", "gota", "gotinha", "grama molhada"],
};

export const TERMOS_PROTAGONISTA = new Set([
  "joana",
  "ela",
  "dela",
  "nela",
  "pé",
  "pés",
  "mão",
  "mãos",
  "palma",
  "dedo",
  "dedos",
  "olho",
  "olhos",
  "olhar",
  "peito",
  "cabelo",
  "cabelos",
  "rosto",
  "queixo",
  "respiração",
  "pele",
  "braço",
  "braços",
  "ombro",
  "ombros",
  "pescoço",
  "nuca",
  "coração",
]);

function normalizar(s: string): string {
  return s.toLowerCase();
}

/**
 * Mesmo tokenizador de tests/fumaca-presenca-v3.ts:40 — split por não-letra.
 * Exportado porque `\b` do regex JS NÃO reconhece letras acentuadas como
 * `\w` (ex.: em "então joana", o `\b` enxerga um limite de palavra depois do
 * "ã", tratando o "o" final como palavra isolada — `/\bo joana\b/` casaria
 * ali por engano). Qualquer checagem de palavra/bigrama deste experimento
 * deve tokenizar com esta função, nunca `\b` cru sobre texto em português.
 */
export function palavrasDe(texto: string): string[] {
  return normalizar(texto)
    .split(/[^\p{L}-]+/u)
    .filter((p) => p.length > 0);
}

export function contemAncora(texto: string, termos: string[]): boolean {
  const palavras = palavrasDe(texto);
  const textoNormalizado = normalizar(texto);
  return termos.some((termoOriginal) => {
    const termo = normalizar(termoOriginal.endsWith("*") ? termoOriginal.slice(0, -1) : termoOriginal);
    if (termo.includes(" ")) return textoNormalizado.includes(termo);
    return palavras.some((p) => p.startsWith(termo));
  });
}

export function temProtagonista(texto: string): boolean {
  return palavrasDe(texto).some((p) => TERMOS_PROTAGONISTA.has(p));
}

/**
 * Adaptação do limiar de 60% de tests/fumaca-presenca-v3.ts (lá medido por
 * SLOT do miolo). Na prosa já realizada pelo LLM não há mais slots
 * separáveis — a sentença é o análogo mais próximo (cada beat costuma virar
 * ~1 sentença na realização), então medimos a fração de SENTENÇAS com um
 * termo da protagonista.
 */
export function fracaoSentencasComProtagonista(texto: string): number {
  const sentencas = texto
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentencas.length === 0) return 0;
  const comProtagonista = sentencas.filter((s) => temProtagonista(s)).length;
  return comProtagonista / sentencas.length;
}
