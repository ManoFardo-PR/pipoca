/**
 * [cenas.ts] — SVGs dos 5 ambientes da Tela 3 (quintal, quarto, floresta,
 *   espaço, fundo do mar) + metadados da galeria.
 *
 * PAPEL: app-ui (módulo-fonte de dados de tela)
 * POR QUE EXISTE: guarda o desenho SVG de cada ambiente e os metadados da
 *   galeria (nome, descrição, badge, cenarioId, disponível). Portado do
 *   protótipo Pipoca.dc.html (linhas 721–784). Só o Quintal está disponível
 *   (cenarioId "quintal_anoitecer"); os outros 4 são "Em breve".
 * ENTRA: _scene(key) recebe uma CenaKey ("quintal" | "quarto" | "floresta" |
 *   "espaco" | "fundomar").
 * SAI: _scene(key) → string SVG (cai em "quintal" se a chave não existir);
 *   _envData() → EnvData[] da galeria.
 * CHAMA: nada — módulo puro, self-contained.
 * É CHAMADO POR: NENHUM importador (analise-modularidade: "cenas.ts sem
 *   imports"). A Tela3 (.dc.html) NÃO importa — carrega cópia INLINE de _scene
 *   (dc-runtime: telas self-contained). Este .ts é a fonte-de-verdade espelhada.
 * RODA POR: não roda por comando próprio — módulo-fonte TS; a mesma lógica vive
 *   inline na Tela3 .dc.html.
 * CUIDADO: definição DUPLICADA — mexer aqui NÃO altera a Tela3 (cópia inline);
 *   sincronizar à mão. Os SVGs são injetados via _inject(el, _scene(key)) —
 *   nunca por {{ }} (subárvore imperativa, fora da interpolação do dc-runtime).
 */

export type CenaKey = "quintal" | "quarto" | "floresta" | "espaco" | "fundomar";

export function _scene(key: CenaKey): string {
  const S: Record<string, string> = {
    quintal: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='qsky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fce7bd'/><stop offset='.55' stop-color='#f8d291'/><stop offset='1' stop-color='#f4ba74'/></linearGradient>
      <radialGradient id='qsun' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='#fff8e2'/><stop offset='.55' stop-color='#ffe49e'/><stop offset='1' stop-color='#ffe49e' stop-opacity='0'/></radialGradient>
      <filter id='qsoft' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='2.2'/></filter></defs>
      <rect width='400' height='300' fill='url(#qsky)'/>
      <circle cx='305' cy='86' r='74' fill='url(#qsun)'/><circle cx='305' cy='86' r='30' fill='#fff3d0'/>
      <path d='M0 208 Q120 168 240 203 T400 198 V300 H0 Z' fill='#c2d693' opacity='.92'/>
      <path d='M0 234 Q140 206 280 231 T400 229 V300 H0 Z' fill='#a6c372'/>
      <rect y='250' width='400' height='50' fill='#90b65d'/>
      <rect x='86' y='150' width='16' height='92' rx='6' fill='#9d6d43'/>
      <g filter='url(#qsoft)'><circle cx='94' cy='139' r='43' fill='#7da94f'/><circle cx='64' cy='155' r='28' fill='#8db75b'/><circle cx='122' cy='156' r='30' fill='#6f9a49'/><circle cx='98' cy='116' r='26' fill='#93bd60'/></g>
      <g fill='#c89c6c'><rect x='250' y='205' width='12' height='48' rx='3'/><rect x='285' y='205' width='12' height='48' rx='3'/><rect x='320' y='205' width='12' height='48' rx='3'/><rect x='355' y='205' width='12' height='48' rx='3'/></g>
      <rect x='245' y='214' width='128' height='8' rx='4' fill='#ba8c5b'/><rect x='245' y='234' width='128' height='8' rx='4' fill='#ba8c5b'/>
      <circle cx='172' cy='270' r='15' fill='#e27c50'/><path d='M158 266 Q172 259 186 266' stroke='#fff' stroke-width='3' fill='none' opacity='.7'/></svg>`,
    quarto: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='rw' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#e8d2e6'/><stop offset='1' stop-color='#efd9c8'/></linearGradient>
      <radialGradient id='rl' cx='.5' cy='.4' r='.6'><stop offset='0' stop-color='#ffe9b0' stop-opacity='.9'/><stop offset='1' stop-color='#ffe9b0' stop-opacity='0'/></radialGradient></defs>
      <rect width='400' height='300' fill='url(#rw)'/>
      <rect x='232' y='40' width='130' height='110' rx='12' fill='#3a3357'/><rect x='244' y='52' width='106' height='86' rx='7' fill='#2a2747'/>
      <circle cx='330' cy='74' r='15' fill='#f4ecd0'/><circle cx='324' cy='70' r='13' fill='#2a2747'/>
      <circle cx='270' cy='80' r='1.7' fill='#fff'/><circle cx='300' cy='110' r='1.5' fill='#fff'/><circle cx='258' cy='118' r='1.3' fill='#fff'/><circle cx='286' cy='66' r='1.4' fill='#fff'/>
      <rect y='196' width='400' height='104' fill='#d9b69a'/><rect y='196' width='400' height='9' fill='#c8a589'/>
      <rect x='34' y='150' width='150' height='62' rx='14' fill='#caa6c4'/><rect x='40' y='150' width='138' height='20' rx='10' fill='#d8bad3'/>
      <rect x='30' y='196' width='160' height='22' rx='6' fill='#7c8bbf'/>
      <circle cx='104' cy='150' r='18' fill='#fff6e6'/>
      <rect x='300' y='150' width='10' height='52' fill='#b98a63'/><path d='M285 150 h40 l-8 -22 h-24 Z' fill='url(#rl)'/><path d='M285 150 h40 l-8 -22 h-24 Z' fill='#f6d98c' opacity='.85'/>
      <ellipse cx='150' cy='250' rx='120' ry='20' fill='#c79f86' opacity='.5'/></svg>`,
    floresta: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='fs' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#dce8b8'/><stop offset='1' stop-color='#b9d391'/></linearGradient>
      <linearGradient id='fb' x1='0' y1='0' x2='.4' y2='1'><stop offset='0' stop-color='#fff4c4' stop-opacity='.7'/><stop offset='1' stop-color='#fff4c4' stop-opacity='0'/></linearGradient></defs>
      <rect width='400' height='300' fill='url(#fs)'/>
      <polygon points='40,300 90,300 65,60' fill='url(#fb)'/><polygon points='150,300 240,300 200,40' fill='url(#fb)' opacity='.7'/>
      <g fill='#5f8a44' opacity='.55'><path d='M30 300 V150 q40 -70 80 0 V300 Z'/><path d='M300 300 V160 q40 -80 80 0 V300 Z'/></g>
      <g fill='#487038'><path d='M-10 300 V190 q60 -90 130 0 V300 Z'/><path d='M250 300 V200 q70 -100 160 0 V300 Z'/></g>
      <rect x='120' y='150' width='20' height='150' rx='6' fill='#6e4a30'/>
      <g fill='#3f6b33'><circle cx='130' cy='130' r='52'/><circle cx='86' cy='160' r='34'/><circle cx='176' cy='162' r='36'/><circle cx='132' cy='98' r='30'/></g>
      <g fill='#54863f'><circle cx='118' cy='128' r='14'/><circle cx='150' cy='150' r='12'/><circle cx='100' cy='150' r='10'/></g>
      <path d='M0 286 q60 -26 120 0 t140 0 140 0 V300 H0 Z' fill='#3c6231'/>
      <g fill='#6fa24f'><path d='M40 290 q-10 -28 8 -40 q-2 26 14 34 Z'/><path d='M70 292 q14 -26 0 -42 q-4 24 -16 36 Z'/><path d='M330 292 q-12 -26 6 -40 q0 24 16 34 Z'/></g></svg>`,
    espaco: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='es' x1='0' y1='0' x2='.3' y2='1'><stop offset='0' stop-color='#2b2a55'/><stop offset='.6' stop-color='#3d3168'/><stop offset='1' stop-color='#5a3c6e'/></linearGradient>
      <radialGradient id='ep' cx='.38' cy='.35' r='.7'><stop offset='0' stop-color='#f0a972'/><stop offset='1' stop-color='#c46b56'/></radialGradient></defs>
      <rect width='400' height='300' fill='url(#es)'/>
      <g fill='#fff'><circle cx='40' cy='40' r='1.6'/><circle cx='90' cy='80' r='1'/><circle cx='150' cy='30' r='1.3'/><circle cx='210' cy='70' r='1'/><circle cx='340' cy='40' r='1.8'/><circle cx='300' cy='110' r='1.1'/><circle cx='60' cy='150' r='1.2'/><circle cx='370' cy='180' r='1.4'/><circle cx='120' cy='200' r='1'/><circle cx='250' cy='200' r='1.5'/></g>
      <g fill='#ffe9a8' opacity='.85'><circle cx='110' cy='95' r='2.4'/><circle cx='320' cy='70' r='2.2'/><circle cx='200' cy='150' r='2'/></g>
      <circle cx='150' cy='175' r='66' fill='url(#ep)'/><ellipse cx='150' cy='175' rx='104' ry='26' fill='none' stroke='#e8c98a' stroke-width='7' opacity='.7' transform='rotate(-18 150 175)'/>
      <circle cx='128' cy='158' r='12' fill='#d98a6e' opacity='.5'/><circle cx='176' cy='192' r='8' fill='#d98a6e' opacity='.4'/>
      <circle cx='322' cy='210' r='20' fill='#cfc0d8'/><circle cx='315' cy='204' r='6' fill='#b3a2bf' opacity='.6'/></svg>`,
    fundomar: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='ms' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6fc3c9'/><stop offset='.6' stop-color='#3f93a8'/><stop offset='1' stop-color='#2c6e87'/></linearGradient>
      <linearGradient id='mr' x1='0' y1='0' x2='.3' y2='1'><stop offset='0' stop-color='#cdeef0' stop-opacity='.55'/><stop offset='1' stop-color='#cdeef0' stop-opacity='0'/></linearGradient></defs>
      <rect width='400' height='300' fill='url(#ms)'/>
      <polygon points='60,0 110,0 80,300 40,300' fill='url(#mr)'/><polygon points='200,0 270,0 240,300 180,300' fill='url(#mr)' opacity='.7'/>
      <g fill='#2f7286'><path d='M0 300 V250 q40 -50 80 -10 q50 -60 100 -6 q40 -40 90 -2 q60 -36 130 4 V300 Z'/></g>
      <g><path d='M70 300 q-14 -60 6 -96 q18 36 4 96 Z' fill='#3f8a72'/><path d='M88 300 q10 -50 -4 -84 q22 30 12 84 Z' fill='#4f9c80'/></g>
      <g><path d='M320 300 q16 -64 -6 -104 q-20 40 -2 104 Z' fill='#4f9c80'/></g>
      <g transform='translate(250 110)'><ellipse cx='0' cy='0' rx='26' ry='17' fill='#f0a85a'/><polygon points='22,0 44,-14 44,14' fill='#e8923f'/><circle cx='-10' cy='-3' r='3' fill='#2b2118'/></g>
      <g transform='translate(120 170)'><ellipse cx='0' cy='0' rx='18' ry='12' fill='#e8d36a'/><polygon points='15,0 30,-10 30,10' fill='#d8c155'/><circle cx='-7' cy='-2' r='2.2' fill='#2b2118'/></g></svg>`,
  };
  return S[key] ?? S["quintal"];
}

/** Metadados dos ambientes para a galeria da Tela 3. */
export interface EnvData {
  key: CenaKey;
  name: string;
  desc: string;
  badge: string;
  cenarioId: string;
  disponivel: boolean;
}

export function _envData(): EnvData[] {
  return [
    { key: "quintal",  name: "O Quintal", desc: "Com um vaga-lume no quintal", badge: "", cenarioId: "quintal_anoitecer", disponivel: true },
    { key: "quarto",   name: "O Quarto",  desc: "Histórias antes de dormir",   badge: "Em breve", cenarioId: "", disponivel: false },
    { key: "floresta", name: "A Floresta",desc: "Uma aventura entre árvores",   badge: "Em breve", cenarioId: "", disponivel: false },
    { key: "espaco",   name: "O Espaço",  desc: "Entre estrelas e planetas",    badge: "Em breve", cenarioId: "", disponivel: false },
    { key: "fundomar", name: "O Fundo do Mar", desc: "Com peixes e corais",     badge: "Em breve", cenarioId: "", disponivel: false },
  ];
}
