/**
 * [avatares.ts] — definições e desenho SVG dos 5 avatares da Tela 2
 *   (Pingo, Fubá, Cacau, Lua, Tuca).
 *
 * PAPEL: app-ui (módulo-fonte de dados de tela)
 * POR QUE EXISTE: guarda a definição canônica de cada avatar (cor de fundo,
 *   tipo de orelha, cor do pelo) e a função que monta o SVG. Portado do
 *   protótipo Pipoca.dc.html (linhas 683–709). IDs canônicos: "pingo" | "fubá"
 *   | "cacau" | "lua" | "tuca".
 * ENTRA: _avatarSVG recebe um AvatarDef (id, name, bg, ear, fur).
 * SAI: _avatarDefs() → AvatarDef[]; _avatarSVG(d) → string SVG do avatar.
 * CHAMA: nada — módulo puro, self-contained.
 * É CHAMADO POR: NENHUM importador (analise-modularidade: "avatares.ts sem
 *   imports"). As telas .dc.html NÃO importam este arquivo — Tela2/Tela3/Tela7
 *   carregam cópias INLINE de _avatarDefs/_avatarSVG (dc-runtime: telas
 *   self-contained). Este .ts é a fonte-de-verdade espelhada.
 * RODA POR: não roda por comando próprio — módulo-fonte TS; a mesma lógica vive
 *   inline nas telas .dc.html.
 * CUIDADO: definições DUPLICADAS — mexer aqui NÃO altera as telas (que têm cópia
 *   inline); manter em sincronia com Tela2/Tela3/Tela7 à mão.
 */

export interface AvatarDef {
  id: string;
  name: string;
  bg: string;
  ear: string;
  fur: string;
}

export function _avatarDefs(): AvatarDef[] {
  return [
    { id: "pingo", name: "Pingo", bg: "#3f6f9e", ear: "pup",  fur: "#5b86ad" },
    { id: "fubá",  name: "Fubá",  bg: "#d98a4e", ear: "fox",  fur: "#e6a063" },
    { id: "cacau", name: "Cacau", bg: "#7a9a5b", ear: "bear", fur: "#93b074" },
    { id: "lua",   name: "Lua",   bg: "#9c7cb0", ear: "cat",  fur: "#b196c2" },
    { id: "tuca",  name: "Tuca",  bg: "#5fa9b8", ear: "bird", fur: "#7cc0cd" },
  ];
}

export function _avatarSVG(d: AvatarDef): string {
  const ears: Record<string, string> = {
    pup:  `<path d='M22 30 Q14 8 34 26 Z' fill='${d.fur}'/><path d='M86 30 Q94 8 74 26 Z' fill='${d.fur}'/>`,
    fox:  `<path d='M24 26 L20 4 L42 20 Z' fill='${d.fur}'/><path d='M84 26 L88 4 L66 20 Z' fill='${d.fur}'/>`,
    bear: `<circle cx='28' cy='22' r='13' fill='${d.fur}'/><circle cx='80' cy='22' r='13' fill='${d.fur}'/>`,
    cat:  `<path d='M26 28 L20 6 L40 22 Z' fill='${d.fur}'/><path d='M82 28 L88 6 L68 22 Z' fill='${d.fur}'/>`,
    bird: `<path d='M54 6 q8 -4 6 8' stroke='${d.fur}' stroke-width='5' fill='none' stroke-linecap='round'/>`,
  };
  const ear = ears[d.ear] ?? "";
  return `<svg viewBox='0 0 108 108' width='108' height='108' xmlns='http://www.w3.org/2000/svg'>`
    + ear
    + `<circle cx='54' cy='60' r='42' fill='${d.bg}'/>`
    + `<circle cx='54' cy='66' r='30' fill='rgba(255,255,255,.16)'/>`
    + `<circle cx='42' cy='56' r='5.5' fill='#2b2118'/><circle cx='66' cy='56' r='5.5' fill='#2b2118'/>`
    + `<circle cx='44' cy='54' r='1.8' fill='#fff'/><circle cx='68' cy='54' r='1.8' fill='#fff'/>`
    + `<path d='M46 72 Q54 80 62 72' stroke='#2b2118' stroke-width='4' fill='none' stroke-linecap='round'/>`
    + `<circle cx='36' cy='66' r='5' fill='rgba(255,140,90,.35)'/><circle cx='72' cy='66' r='5' fill='rgba(255,140,90,.35)'/>`
    + `</svg>`;
}
