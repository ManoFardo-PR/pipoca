import {
  ESQUEMA_GRAFO,
  type GrafoAutoral,
  type Fragmento4,
  type PapelNoFim,
} from "./tipos.js";

const PAPEIS_VALIDOS: PapelNoFim[] = ["nucleo", "chave", "neutro"];
const NIVEIS = ["n1", "n2", "n3", "n4"] as const;
const RE_SE = /^(tem|nao_tem):\w+$/;

function assertFragmento4(obj: unknown, ctx: string): asserts obj is Fragmento4 {
  if (typeof obj !== "object" || obj === null) {
    throw new Error(`${ctx}: Fragmento4 deve ser um objeto`);
  }
  for (const n of NIVEIS) {
    const val = (obj as Record<string, unknown>)[n];
    if (typeof val !== "string" || val.trim() === "") {
      throw new Error(`${ctx}: campo "${n}" ausente ou vazio no Fragmento4`);
    }
  }
}

export function validarGrafo(json: unknown): GrafoAutoral {
  if (typeof json !== "object" || json === null) {
    throw new Error("validarGrafo: argumento deve ser um objeto");
  }
  const raw = json as Record<string, unknown>;

  if (raw["esquema"] !== ESQUEMA_GRAFO) {
    throw new Error(
      `validarGrafo: esquema inválido "${String(raw["esquema"])}" — esperado "${ESQUEMA_GRAFO}"`
    );
  }

  const niveis = raw["niveis"];
  if (typeof niveis !== "object" || niveis === null) {
    throw new Error("validarGrafo: campo 'niveis' ausente");
  }
  for (const n of NIVEIS) {
    const v = (niveis as Record<string, unknown>)[n];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(`validarGrafo: niveis.${n} ausente ou vazio`);
    }
  }

  if (typeof raw["regra_de_ouro"] !== "string") {
    throw new Error("validarGrafo: campo 'regra_de_ouro' ausente");
  }

  const cenario = raw["cenario"];
  if (typeof cenario !== "object" || cenario === null) {
    throw new Error("validarGrafo: campo 'cenario' ausente");
  }
  const cen = cenario as Record<string, unknown>;

  for (const campo of ["id", "nome", "personagem", "paleta"] as const) {
    if (typeof cen[campo] !== "string" || (cen[campo] as string).trim() === "") {
      throw new Error(`validarGrafo: cenario.${campo} ausente ou vazio`);
    }
  }

  assertFragmento4(cen["abertura"], "cenario.abertura");

  if (!Array.isArray(cen["objetos"])) {
    throw new Error("validarGrafo: cenario.objetos deve ser array");
  }
  const objetos = cen["objetos"] as unknown[];
  const idsVistos = new Set<string>();
  let nucleoCount = 0;

  for (const item of objetos) {
    if (typeof item !== "object" || item === null) {
      throw new Error("validarGrafo: cada objeto deve ser um objeto");
    }
    const o = item as Record<string, unknown>;

    if (typeof o["id"] !== "string" || (o["id"] as string).trim() === "") {
      throw new Error("validarGrafo: objeto sem 'id'");
    }
    const id = o["id"] as string;
    if (idsVistos.has(id)) {
      throw new Error(`validarGrafo: id duplicado "${id}"`);
    }
    idsVistos.add(id);

    if (typeof o["emoji"] !== "string" || (o["emoji"] as string).trim() === "") {
      throw new Error(`validarGrafo: objeto "${id}" sem 'emoji'`);
    }
    if (typeof o["nome"] !== "string" || (o["nome"] as string).trim() === "") {
      throw new Error(`validarGrafo: objeto "${id}" sem 'nome'`);
    }

    const papel = o["papel_no_fim"];
    if (!PAPEIS_VALIDOS.includes(papel as PapelNoFim)) {
      throw new Error(
        `validarGrafo: objeto "${id}" tem papel_no_fim inválido "${String(papel)}"`
      );
    }
    if (papel === "nucleo") nucleoCount++;

    assertFragmento4(o["gatilho"], `objeto "${id}".gatilho`);

    if (!Array.isArray(o["regras"])) {
      throw new Error(`validarGrafo: objeto "${id}".regras deve ser array`);
    }
    for (const regra of o["regras"] as unknown[]) {
      if (typeof regra !== "object" || regra === null) {
        throw new Error(`validarGrafo: regra em "${id}" deve ser objeto`);
      }
      const r = regra as Record<string, unknown>;
      if (typeof r["se"] !== "string" || !RE_SE.test(r["se"] as string)) {
        throw new Error(
          `validarGrafo: regra "${String(r["se"])}" em "${id}" não bate com padrão (tem|nao_tem):id`
        );
      }
      assertFragmento4(r["entao"], `objeto "${id}".regra.entao`);
    }
  }

  if (nucleoCount !== 1) {
    throw new Error(
      `validarGrafo: cenário deve ter exatamente 1 objeto nucleo, encontrado ${nucleoCount}`
    );
  }

  const desfechos = cen["desfechos"];
  if (typeof desfechos !== "object" || desfechos === null) {
    throw new Error("validarGrafo: cenario.desfechos ausente");
  }
  const des = desfechos as Record<string, unknown>;
  assertFragmento4(des["convergente"], "cenario.desfechos.convergente");

  if (!Array.isArray(des["aberto"])) {
    throw new Error("validarGrafo: cenario.desfechos.aberto deve ser array");
  }
  for (const a of des["aberto"] as unknown[]) {
    if (typeof a !== "object" || a === null) {
      throw new Error("validarGrafo: cada desfecho aberto deve ser objeto");
    }
    const ab = a as Record<string, unknown>;
    if (typeof ab["se_terminou_com"] !== "string") {
      throw new Error("validarGrafo: desfecho aberto sem 'se_terminou_com'");
    }
    if (!idsVistos.has(ab["se_terminou_com"] as string)) {
      throw new Error(
        `validarGrafo: desfecho aberto referencia id desconhecido "${String(ab["se_terminou_com"])}"`
      );
    }
    assertFragmento4(ab["fragmento"], `desfecho aberto "${String(ab["se_terminou_com"])}".fragmento`);
  }

  if (cen["ordem_canonica"] !== undefined) {
    if (!Array.isArray(cen["ordem_canonica"])) {
      throw new Error("validarGrafo: cenario.ordem_canonica deve ser array");
    }
    const ocIds = new Set<string>();
    for (const ocId of cen["ordem_canonica"] as unknown[]) {
      if (typeof ocId !== "string") {
        throw new Error("validarGrafo: ordem_canonica contém item não-string");
      }
      if (!idsVistos.has(ocId)) {
        throw new Error(
          `validarGrafo: ordem_canonica referencia id desconhecido "${ocId}"`
        );
      }
      if (ocIds.has(ocId)) {
        throw new Error(
          `validarGrafo: ordem_canonica tem id duplicado "${ocId}"`
        );
      }
      ocIds.add(ocId);
    }
  }

  return json as GrafoAutoral;
}
