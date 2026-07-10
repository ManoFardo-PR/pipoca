// Lint determinístico das fichas — regras do docs/plans02/fase10_modelo_de_fichas/10-05.
// ERRO bloqueia o lote; AVISO exige olhar humano (a validação célula a célula é a parada dura).
// Determinístico e sem rede: só código, nenhuma chamada a LLM.
// Precedente: src/core/lint_grafo.ts (lint do grafo v3, 0 erros como gate de teste).
import { ESQUEMA_FICHAS_V1 } from "./tipos.js";

export interface ResultadoLintFichas {
  erros: string[];
  avisos: string[];
}

const NIVEIS = ["n1", "n2", "n3", "n4"] as const;

// A1 — lista-semente aprovada (D6, 2026-07-09); expansível pela leitura em voz alta do Manoel.
const SEMENTE_A1 = ["rodopiando", "atravessa", "silhueta", "reluzente", "esvoaçante"];
// A1 — regra de dígrafo (D6): qualquer palavra com nh/lh/ch em descricao.n1 e corpo.n1.
const DIGRAFOS_A1 = ["nh", "lh", "ch"];
// A1 — allow-list NOMINAL (veredito da Parada Dura 1, 2026-07-10): imagens canônicas da PoC
// ("luzinha", "olhos" — vocabulário-núcleo do mapa sensorial) e "folha" (o próprio nome do
// objeto). A regra de dígrafo segue VIVA para palavras novas; isto não a desliga.
const ALLOW_A1 = ["luzinha", "olhos", "folha"];

// A2 — flexão de gênero da protagonista (veredito da Parada Dura 1, 2026-07-10): a ficha é
// NEUTRA; gênero vem do personagem e quem flexiona é o realizador. Lista-semente expansível.
// Formas adjetivas: só acusam em posição PREDICATIVA (após verbo/gerúndio ou no início) —
// "ficar quieta" acusa; "gato quieto" e "pés descalços" flexionam com o substantivo e passam.
const ADJETIVOS_A2 = [
  "quieta", "quieto", "quietas", "quietos",
  "sozinha", "sozinho", "sozinhas", "sozinhos",
  "descalça", "descalço", "descalças", "descalços",
  "atenta", "atento", "atentas", "atentos",
  "agachada", "agachado", "agachadas", "agachados",
];
// Pronomes de posse/referência pessoal: acusam sempre (não há leitura neutra).
const PRONOMES_A2 = ["pra ela", "pra ele", "dela", "dele"];

const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SEMENTE_NORM = SEMENTE_A1.map(norm);
const ALLOW_A1_NORM = ALLOW_A1.map(norm);
const ADJ_A2_NORM = ADJETIVOS_A2.map(norm);

const ehVazio = (v: unknown): boolean => typeof v !== "string" || v.trim() === "";

const palavrasDe = (texto: string): string[] =>
  norm(texto).split(/[^a-z0-9-]+/).filter(Boolean);

function checarNiveis(obj: unknown, rotulo: string, erros: string[]): void {
  if (typeof obj !== "object" || obj === null) {
    erros.push(`E1: ${rotulo}: campo por-nível ausente ou malformado`);
    return;
  }
  const rec = obj as Record<string, unknown>;
  for (const n of NIVEIS) {
    if (!(n in rec)) erros.push(`E1: ${rotulo}: falta ${n}`);
    else if (ehVazio(rec[n])) erros.push(`E3: ${rotulo}.${n}: campo vazio`);
  }
}

function avisosA1(texto: string, rotulo: string, avisos: string[]): void {
  for (const p of palavrasDe(texto)) {
    if (ALLOW_A1_NORM.includes(p)) continue;
    if (SEMENTE_NORM.includes(p)) {
      avisos.push(`A1: ${rotulo}: palavra da lista-semente ("${p}")`);
      continue;
    }
    const d = DIGRAFOS_A1.find((dg) => p.includes(dg));
    if (d) avisos.push(`A1: ${rotulo}: palavra com dígrafo ${d} ("${p}")`);
  }
}

// Palavra "verbal" para a heurística do A2: infinitivo (-ar/-er/-ir) ou gerúndio (-ndo).
const pareceVerbo = (p: string): boolean => /(ar|er|ir|ndo)$/.test(p) && p.length > 3;

function avisosA2(texto: string, rotulo: string, avisos: string[]): void {
  const t = norm(texto);
  for (const pron of PRONOMES_A2) {
    if (new RegExp(`(^|[^a-z0-9-])${norm(pron)}($|[^a-z0-9-])`).test(t)) {
      avisos.push(`A2: ${rotulo}: referência com gênero à protagonista ("${pron}")`);
    }
  }
  const palavras = palavrasDe(texto);
  for (let i = 0; i < palavras.length; i++) {
    if (!ADJ_A2_NORM.includes(palavras[i])) continue;
    const anterior = i > 0 ? palavras[i - 1] : "";
    // Posição predicativa: início de texto ou após palavra verbal ("ficar quieta",
    // "esperando quieto"). Após substantivo ("gato quieto", "pés descalços"), passa.
    if (anterior === "" || pareceVerbo(anterior)) {
      avisos.push(`A2: ${rotulo}: flexão de gênero em posição predicativa ("${palavras[i]}")`);
    }
  }
}

function checarEsquema(raw: unknown, arquivo: string, erros: string[]): boolean {
  if (typeof raw !== "object" || raw === null) {
    erros.push(`${arquivo}: arquivo malformado (não é objeto)`);
    return false;
  }
  const esq = (raw as Record<string, unknown>).esquema;
  if (esq !== ESQUEMA_FICHAS_V1) {
    erros.push(`${arquivo}: esquema desconhecido ("${String(esq)}" ≠ ${ESQUEMA_FICHAS_V1})`);
    return false;
  }
  return true;
}

/**
 * Lint dos três catálogos do pipoca.fichas.v1.
 * Recebe o JSON cru (unknown) de cada arquivo — validação estrutural é parte do lint.
 */
export function lintFichas(
  objetosRaw: unknown,
  relacoesRaw: unknown,
  cenariosRaw: unknown,
): ResultadoLintFichas {
  const erros: string[] = [];
  const avisos: string[] = [];

  // ---------- objetos.v1 (camada 1) ----------
  const okObjetos = checarEsquema(objetosRaw, "objetos.v1", erros);
  const objetos: Record<string, unknown> =
    okObjetos && typeof (objetosRaw as Record<string, unknown>).objetos === "object" && (objetosRaw as Record<string, unknown>).objetos !== null
      ? ((objetosRaw as Record<string, unknown>).objetos as Record<string, unknown>)
      : {};
  const ids = Object.keys(objetos);
  if (okObjetos && ids.length === 0) erros.push("objetos.v1: catálogo vazio");

  for (const id of ids) {
    const f = objetos[id] as Record<string, unknown>;
    if (typeof f !== "object" || f === null) {
      erros.push(`objetos.v1.${id}: ficha malformada`);
      continue;
    }
    // E2 — genero/numero obrigatórios
    if (f.genero !== "m" && f.genero !== "f") erros.push(`E2: objetos.${id}: genero ausente ou inválido`);
    if (f.numero !== "sg" && f.numero !== "pl") erros.push(`E2: objetos.${id}: numero ausente ou inválido`);
    // E1/E3 — 4 níveis em descricao e sensacao.corpo, nada vazio
    checarNiveis(f.descricao, `objetos.${id}.descricao`, erros);
    const sensacao = (f.sensacao ?? {}) as Record<string, unknown>;
    if (ehVazio(sensacao.dominante)) erros.push(`E3: objetos.${id}.sensacao.dominante: campo vazio`);
    if (ehVazio(sensacao.registro)) erros.push(`E3: objetos.${id}.sensacao.registro: campo vazio`);
    checarNiveis(sensacao.corpo, `objetos.${id}.sensacao.corpo`, erros);
    // E4 — n1 do corpo com UMA sensação (heurística: sem ";")
    const corpo = (sensacao.corpo ?? {}) as Record<string, unknown>;
    if (typeof corpo.n1 === "string" && corpo.n1.includes(";")) {
      erros.push(`E4: objetos.${id}.sensacao.corpo.n1: mais de uma sensação no n1 (contém ";")`);
    }
    // E5 — tolerância a vizinho: a descricao não menciona o ID de outro objeto do catálogo
    const descricao = (f.descricao ?? {}) as Record<string, unknown>;
    for (const n of NIVEIS) {
      const txt = descricao[n];
      if (typeof txt !== "string") continue;
      const palavras = palavrasDe(txt);
      for (const outro of ids) {
        if (outro === id) continue;
        if (palavras.includes(norm(outro))) {
          erros.push(`E5: objetos.${id}.descricao.${n}: menciona outro objeto do catálogo ("${outro}")`);
        }
      }
    }
    // A1 — decodificação difícil no n1 (aviso, não bloqueia)
    if (typeof descricao.n1 === "string") avisosA1(descricao.n1, `objetos.${id}.descricao.n1`, avisos);
    if (typeof corpo.n1 === "string") avisosA1(corpo.n1, `objetos.${id}.sensacao.corpo.n1`, avisos);
    // A2 — flexão de gênero da protagonista (aviso; ficha é neutra)
    for (const n of NIVEIS) {
      if (typeof descricao[n] === "string") avisosA2(descricao[n] as string, `objetos.${id}.descricao.${n}`, avisos);
      if (typeof corpo[n] === "string") avisosA2(corpo[n] as string, `objetos.${id}.sensacao.corpo.${n}`, avisos);
    }
  }

  // ---------- cenarios.v1 (camada 3) ----------
  const okCenarios = checarEsquema(cenariosRaw, "cenarios.v1", erros);
  const cenarios: Record<string, unknown> =
    okCenarios && typeof (cenariosRaw as Record<string, unknown>).cenarios === "object" && (cenariosRaw as Record<string, unknown>).cenarios !== null
      ? ((cenariosRaw as Record<string, unknown>).cenarios as Record<string, unknown>)
      : {};
  for (const cid of Object.keys(cenarios)) {
    const c = cenarios[cid] as Record<string, unknown>;
    if (typeof c !== "object" || c === null) {
      erros.push(`cenarios.v1.${cid}: ficha malformada`);
      continue;
    }
    if (ehVazio(c.nome)) erros.push(`E3: cenarios.${cid}.nome: campo vazio`);
    if (ehVazio(c.descricao)) erros.push(`E3: cenarios.${cid}.descricao: campo vazio`);
    if (ehVazio(c.voz_do_contador)) erros.push(`E3: cenarios.${cid}.voz_do_contador: campo vazio`);
    checarNiveis(c.sensacao_no_personagem, `cenarios.${cid}.sensacao_no_personagem`, erros);
    if (typeof c.descricao === "string") avisosA2(c.descricao, `cenarios.${cid}.descricao`, avisos);
    if (typeof c.voz_do_contador === "string") avisosA2(c.voz_do_contador, `cenarios.${cid}.voz_do_contador`, avisos);
    const snp = (c.sensacao_no_personagem ?? {}) as Record<string, unknown>;
    for (const n of NIVEIS) {
      if (typeof snp[n] === "string") avisosA2(snp[n] as string, `cenarios.${cid}.sensacao_no_personagem.${n}`, avisos);
    }
  }

  // ---------- relacoes.<cenario>.v1 (camada 2) ----------
  const okRelacoes = checarEsquema(relacoesRaw, "relacoes.v1", erros);
  if (okRelacoes) {
    const r = relacoesRaw as Record<string, unknown>;
    if (ehVazio(r.cenario)) erros.push("E3: relacoes.cenario: campo vazio");
    else if (Object.keys(cenarios).length > 0 && !(String(r.cenario) in cenarios)) {
      erros.push(`relacoes.cenario: cenário "${String(r.cenario)}" fora do catálogo de cenários`);
    }
    const oxo = Array.isArray(r.objeto_x_objeto) ? r.objeto_x_objeto : [];
    if (!Array.isArray(r.objeto_x_objeto)) erros.push("relacoes.objeto_x_objeto: lista ausente ou malformada");
    oxo.forEach((rel: unknown, i: number) => {
      const rr = rel as Record<string, unknown>;
      const rot = `relacoes.objeto_x_objeto[${i}]`;
      if (typeof rr !== "object" || rr === null) {
        erros.push(`${rot}: entrada malformada`);
        return;
      }
      // se não-vazio (string ou array com ≥1 condição não-vazia)
      const se = rr.se;
      const seOk =
        (typeof se === "string" && se.trim() !== "") ||
        (Array.isArray(se) && se.length > 0 && se.every((c) => typeof c === "string" && c.trim() !== ""));
      if (!seOk) erros.push(`${rot}: condição "se" ausente ou vazia (array vazio nunca casa)`);
      // objeto e alvo presentes E no catálogo (D4: alvo sempre explícito)
      if (ehVazio(rr.objeto)) erros.push(`${rot}: "objeto" ausente`);
      else if (!ids.includes(String(rr.objeto))) erros.push(`${rot}: objeto "${String(rr.objeto)}" fora do catálogo`);
      if (ehVazio(rr.alvo)) erros.push(`${rot}: "alvo" ausente (D4 exige alvo explícito)`);
      else if (!ids.includes(String(rr.alvo))) erros.push(`${rot}: alvo "${String(rr.alvo)}" fora do catálogo`);
      if (!ehVazio(rr.objeto) && !ehVazio(rr.alvo) && rr.objeto === rr.alvo) {
        erros.push(`${rot}: objeto e alvo idênticos (a guarda do tem: proíbe auto-relação)`);
      }
      checarNiveis(rr.interacao, `${rot}.interacao`, erros);
      const inter = (rr.interacao ?? {}) as Record<string, unknown>;
      for (const n of NIVEIS) {
        if (typeof inter[n] === "string") avisosA2(inter[n] as string, `${rot}.interacao.${n}`, avisos);
      }
    });
    const oxc = Array.isArray(r.objeto_x_cenario) ? r.objeto_x_cenario : [];
    if (!Array.isArray(r.objeto_x_cenario)) erros.push("relacoes.objeto_x_cenario: lista ausente ou malformada");
    oxc.forEach((m: unknown, i: number) => {
      const mm = m as Record<string, unknown>;
      const rot = `relacoes.objeto_x_cenario[${i}]`;
      if (typeof mm !== "object" || mm === null) {
        erros.push(`${rot}: entrada malformada`);
        return;
      }
      if (ehVazio(mm.objeto)) erros.push(`${rot}: "objeto" ausente`);
      else if (!ids.includes(String(mm.objeto))) erros.push(`${rot}: objeto "${String(mm.objeto)}" fora do catálogo`);
      checarNiveis(mm.manifestacao, `${rot}.manifestacao`, erros);
      const man = (mm.manifestacao ?? {}) as Record<string, unknown>;
      for (const n of NIVEIS) {
        if (typeof man[n] === "string") avisosA2(man[n] as string, `${rot}.manifestacao.${n}`, avisos);
      }
    });
  }

  return { erros, avisos };
}
