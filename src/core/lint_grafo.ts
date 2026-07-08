/**
 * Pipoca — Lint autoral do grafo (contrato grafo-autoral-v3 §6.7)
 * ----------------------------------------------------------------
 * Fiscaliza o CONTEÚDO autorado (células, metadados, pools) — puro, sem I/O.
 * Quem decide falhar o build é o chamador.
 *
 * ERROS (só para grafos com esquema `.v3` — o v2 publicado não é re-auditado):
 *   • célula sem os 4 níveis (n1..n4);
 *   • array de variantes vazio;
 *   • objeto sem `genero`/`numero` (metadado sem fiscalização vira decoração — §1.5);
 *   • conectivo de n1 com mais de 1 palavra (alta decodificabilidade — §1.4).
 * AVISOS (v2 e v3):
 *   • condição `func:*` (namespace RESERVADO — aceita, nunca casa);
 *   • condição desconhecida (nunca casa no runtime);
 *   • variante de conta/tempero que ABRE por marcador inicial (pools + lista base +
 *     `moldura.marcadores_iniciais`) — o realizador suprime o conectivo no miolo
 *     (§4, regra 2); o aviso orienta a próxima oficina, não bloqueia.
 */

import { comecaComMarcador, marcadoresIniciais } from "./composicao.js";
import type { CenarioV2, CondicaoV3, NivelKey, TextoV3 } from "./composicao.js";

export interface ResultadoLint {
  erros: string[];
  avisos: string[];
}

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];

const CONDICOES_CONHECIDAS = /^(tem:.+|nao_tem:.+|pos:(inicio|miolo|fim)|antes_de:.+|depois_de:.+)$/;

/** Checa uma célula (TextoV3): 4 níveis presentes, nenhum array vazio, nenhum texto vazio. */
function lintCelula(celula: TextoV3 | undefined, onde: string, erros: string[]): void {
  for (const nk of NIVEIS) {
    const t = celula && celula[nk];
    if (t === undefined || t === null) {
      erros.push(`${onde}: falta o nível ${nk}`);
      continue;
    }
    const pool = Array.isArray(t) ? t : [t];
    if (pool.length === 0) erros.push(`${onde}.${nk}: array de variantes vazio`);
    else if (pool.some((v) => !String(v || "").trim())) erros.push(`${onde}.${nk}: variante vazia`);
  }
}

/**
 * AVISO da lapidação da costura (§4/§6.7): variante de conta/tempera que ABRE por um
 * marcador inicial. No runtime o conectivo é suprimido nesse slot (regra 2), então é
 * um sinal ao autor — não um erro. Só faz sentido para células de miolo (conta/tempera).
 */
function avisarMarcadorInicial(
  celula: TextoV3 | undefined,
  marcadores: Set<string>,
  onde: string,
  avisos: string[],
): void {
  for (const nk of NIVEIS) {
    const t = celula && celula[nk];
    if (t === undefined || t === null) continue;
    const pool = Array.isArray(t) ? t : [t];
    for (const v of pool) {
      if (comecaComMarcador(String(v || ""), marcadores)) {
        avisos.push(`${onde}.${nk}: variante \`${v}\` abre por marcador — o conectivo será suprimido no miolo`);
      }
    }
  }
}

function lintCondicao(cond: CondicaoV3, onde: string, avisos: string[]): void {
  const c = String(cond || "");
  if (c.indexOf("func:") === 0) {
    avisos.push(`${onde}: condição \`${c}\` usa o namespace RESERVADO func:* (nunca casa no v3)`);
  } else if (!CONDICOES_CONHECIDAS.test(c)) {
    avisos.push(`${onde}: condição desconhecida \`${c}\` (nunca casa)`);
  }
}

/**
 * Lint do cenário. `esquema` (ex.: "pipoca.grafo-autoral.v3") decide o rigor:
 * regras de ERRO só valem para `.v3`; os AVISOS de condição valem para v2 e v3.
 */
export function lintGrafoV3(cenario: CenarioV2, esquema?: string): ResultadoLint {
  const ehV3 = /\.v3$/.test(String(esquema || ""));
  const erros: string[] = [];
  const avisos: string[] = [];
  const errosV3 = ehV3 ? erros : []; // v2: regras de erro não se aplicam (descartadas)

  // Moldura: abertura + desfecho convergente + fragmentos de eco são células.
  lintCelula(cenario.moldura && cenario.moldura.abertura, "moldura.abertura", errosV3);
  const d = cenario.moldura && cenario.moldura.desfecho;
  lintCelula(d && d.convergente, "moldura.desfecho.convergente", errosV3);
  for (let i = 0; i < ((d && d.aberto) || []).length; i++) {
    lintCelula(d!.aberto![i].fragmento, `moldura.desfecho.aberto[${i}].fragmento`, errosV3);
  }

  // Conectivos: pool de n1 só aceita entradas de 1 palavra (§1.4).
  const conectivosN1 = (cenario.moldura && cenario.moldura.conectivos && cenario.moldura.conectivos.n1) || [];
  for (const con of conectivosN1) {
    if (String(con).trim().split(/\s+/).length > 1) {
      errosV3.push(`moldura.conectivos.n1: \`${con}\` tem mais de 1 palavra (n1 exige alta decodificabilidade)`);
    }
  }

  // Objetos: conta + temperas (células) · genero/numero (metadados) · condições.
  const marcadores = marcadoresIniciais(cenario);
  for (const [id, obj] of Object.entries(cenario.objetos || {})) {
    lintCelula(obj.conta, `objetos.${id}.conta`, errosV3);
    avisarMarcadorInicial(obj.conta, marcadores, `objetos.${id}.conta`, avisos);
    if (obj.genero !== "m" && obj.genero !== "f") errosV3.push(`objetos.${id}: falta \`genero\` ("m"|"f")`);
    if (obj.numero !== "sg" && obj.numero !== "pl") errosV3.push(`objetos.${id}: falta \`numero\` ("sg"|"pl")`);
    (obj.tempera || []).forEach((t, i) => {
      lintCelula(t.entao, `objetos.${id}.tempera[${i}].entao`, errosV3);
      avisarMarcadorInicial(t.entao, marcadores, `objetos.${id}.tempera[${i}].entao`, avisos);
      const conds = Array.isArray(t.se) ? t.se : [t.se];
      for (const c of conds) lintCondicao(c, `objetos.${id}.tempera[${i}].se`, avisos);
    });
  }

  return { erros, avisos };
}
