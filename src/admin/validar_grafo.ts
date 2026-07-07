/**
 * Pipoca — Biblioteca de conteúdo (SA_CONTENT) · doc fase04-04-04
 * ----------------------------------------------------------------
 * Curadoria de grafos autorais (`pipoca.grafo-autoral.v3`): validação DUPLA
 * (lint autoral do núcleo + fumaça de montagem da composição A+ pela mecânica
 * real, nos 4 níveis e nos 2 modos de desfecho) e biblioteca com rascunho →
 * versão → publicação. Publicar cenário de tenant respeita o teto
 * `cenariosCustomizados` do plano (seam 04-03).
 * Reusa os núcleos canônicos — nada de lógica de grafo duplicada aqui.
 */

import type { StorageLike, TenantId } from "./auth/tiposAdmin.js";
import type { LimitesPlano } from "./tenant/tiposTenant.js";
import {
  iniciar,
  ordenarR1,
  inserir,
  abrirProximaRodada,
  montar,
  ESQUEMA_COMPOSICAO_V3,
  type CenarioV2,
  type NivelKey,
} from "../core/composicao.js";
import { lintGrafoV3 } from "../core/lint_grafo.js";

export interface ResultadoValidacaoGrafo {
  ok: boolean;
  erros: string[];
  avisos: string[];
}

const NIVEIS: NivelKey[] = ["n1", "n2", "n3", "n4"];

/**
 * Validação dupla do doc 04-04 (evoluída para o v3 na implantação do Motor A+):
 * 1) envelope: `esquema` = pipoca.grafo-autoral.v3 + `cenario` com id/moldura/
 *    rodadas/objetos — forma errada vira erro;
 * 2) lint autoral do núcleo (`lintGrafoV3`): células/variantes/metadados/
 *    conectivos → erros; condições reservadas/desconhecidas → avisos;
 * 3) fumaça de montagem pela mecânica real (R1 ordena, R2+ insere no miolo):
 *    montar nos 4 níveis × {convergente, aberto} — texto vazio/replay quebrado
 *    é erro;
 * 4) objeto sem eco no desfecho aberto (nem se_comecou_com nem se_terminou_com)
 *    → AVISO (nesses finais degrada para o convergente).
 */
export function validarGrafoAutoral(json: unknown): ResultadoValidacaoGrafo {
  const erros: string[] = [];
  const avisos: string[] = [];

  const env = json as { esquema?: unknown; cenario?: CenarioV2 } | null;
  if (!env || typeof env !== "object") {
    return { ok: false, erros: ["o grafo precisa ser um objeto JSON"], avisos };
  }
  if (env.esquema !== ESQUEMA_COMPOSICAO_V3) {
    erros.push(`esquema esperado: "${ESQUEMA_COMPOSICAO_V3}" (recebido: ${JSON.stringify(env.esquema ?? null)})`);
  }
  const cenario = env.cenario;
  if (!cenario || typeof cenario !== "object" || !cenario.id || !cenario.moldura || !Array.isArray(cenario.rodadas) || !cenario.objetos) {
    erros.push("cenario incompleto: precisa de id, moldura, rodadas e objetos");
    return { ok: false, erros, avisos };
  }

  const lint = lintGrafoV3(cenario, String(env.esquema ?? ""));
  erros.push(...lint.erros);
  avisos.push(...lint.avisos);

  // Fumaça de montagem: percorre as rodadas do cenário pela mecânica real.
  try {
    for (const modo of ["convergente", "aberto"] as const) {
      let est = iniciar(cenario, { desfecho: modo });
      const rodada1 = cenario.rodadas.find((r) => r.n === 1);
      const escolhe = (rodada1 && rodada1.escolhe) || 3;
      est = ordenarR1(est, est.banco.slice(0, escolhe));
      if (est.linha.length === 0) {
        erros.push("a rodada 1 não revela objetos suficientes para ordenar");
        break;
      }
      for (let r = 2; r <= cenario.rodadas.length; r++) {
        est = abrirProximaRodada(est);
        const obj = est.banco[0];
        if (obj) est = inserir(est, obj, 1);
      }
      for (const nivel of NIVEIS) {
        const txt = montar(est, nivel);
        if (!txt) erros.push(`montagem vazia (${modo}, ${nivel})`);
        else if (txt.indexOf("undefined") !== -1) erros.push(`"undefined" na montagem (${modo}, ${nivel})`);
        else if (montar(est, nivel) !== txt) erros.push(`replay quebrado (${modo}, ${nivel})`);
      }
    }
  } catch (e) {
    erros.push("fumaça de montagem: " + (e instanceof Error ? e.message : String(e)));
  }

  const aberto = (cenario.moldura.desfecho && cenario.moldura.desfecho.aberto) || [];
  const comEco = new Set<string>();
  for (const a of aberto) {
    if (a.se_terminou_com) comEco.add(a.se_terminou_com);
    if (a.se_comecou_com) comEco.add(a.se_comecou_com);
  }
  const semEco = Object.keys(cenario.objetos).filter((id) => !comEco.has(id));
  if (semEco.length > 0) {
    avisos.push(
      `desfecho aberto sem eco para: ${semEco.join(", ")} — nesses finais a história degrada para o desfecho convergente`
    );
  }

  return { ok: erros.length === 0, erros, avisos };
}

// ─── Biblioteca: rascunho → versão → publicação ──────────────────────────────

export interface CenarioVersionado {
  cenarioId: string;
  versao: number; // v1, v2, … (versionar clona a última como vN+1 rascunho)
  publicadoEm: number | null; // null = rascunho
  tenantId: TenantId | null; // null = catálogo da plataforma (sem teto)
  grafo: unknown; // JSON do grafo autoral
}

const CHAVE_CONTEUDO = "pipoca.admin.conteudo.v1";

function storagePadrao(): StorageLike | null {
  try {
    const g = globalThis as unknown as { localStorage?: StorageLike };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

function entradaValida(c: unknown): c is CenarioVersionado {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r["cenarioId"] === "string" && (r["cenarioId"] as string).length > 0 &&
    typeof r["versao"] === "number" &&
    (r["publicadoEm"] === null || typeof r["publicadoEm"] === "number") &&
    (r["tenantId"] === null || typeof r["tenantId"] === "string")
  );
}

function ler(st: StorageLike): CenarioVersionado[] {
  try {
    const raw = st.getItem(CHAVE_CONTEUDO);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(entradaValida);
  } catch {
    return [];
  }
}

function gravar(st: StorageLike, itens: CenarioVersionado[]): void {
  try {
    st.setItem(CHAVE_CONTEUDO, JSON.stringify(itens));
  } catch {
    /* degradação silenciosa */
  }
}

export function listarCenarios(armazem?: StorageLike): CenarioVersionado[] {
  const st = armazem ?? storagePadrao();
  return st ? ler(st) : [];
}

/** Envelope pipoca.conteudo.v1 → CenarioVersionado (ou null) — pull do espelho remoto. */
export function validarEnvelopeCenario(raw: unknown): CenarioVersionado | null {
  const env = raw as { esquema?: unknown; cenario?: unknown } | null;
  if (env && env.esquema === "pipoca.conteudo.v1" && entradaValida(env.cenario)) {
    return { ...env.cenario };
  }
  return null;
}

/**
 * Substituição INTEGRAL da chave local (pull do servidor — servidor vence).
 * Inválidos são filtrados; nunca lança.
 */
export function substituirCenariosLocais(itens: CenarioVersionado[], armazem?: StorageLike): void {
  const st = armazem ?? storagePadrao();
  if (!st) return;
  gravar(st, (Array.isArray(itens) ? itens : []).filter(entradaValida));
}

/** Extrai o id do cenário sem exigir grafo 100% válido (rascunho pode estar incompleto). */
function cenarioIdDe(grafo: unknown): string | null {
  const c = (grafo as { cenario?: { id?: unknown } } | null)?.cenario;
  return c && typeof c.id === "string" && c.id.length > 0 ? c.id : null;
}

/**
 * Salva/atualiza o RASCUNHO mais recente do cenário (upsert): sem versão
 * anterior → v1; com rascunho aberto → substitui o grafo; só publicadas →
 * abre vN+1 rascunho.
 */
export function salvarRascunho(
  grafo: unknown,
  tenantId: TenantId | null,
  armazem?: StorageLike
): CenarioVersionado {
  const st = armazem ?? storagePadrao();
  const cenarioId = cenarioIdDe(grafo);
  if (!cenarioId) throw new Error("O grafo precisa de cenario.id para entrar na biblioteca.");
  const itens = st ? ler(st) : [];
  const doCenario = itens.filter((c) => c.cenarioId === cenarioId);
  const rascunho = doCenario.filter((c) => c.publicadoEm === null).sort((a, b) => b.versao - a.versao)[0];
  let entrada: CenarioVersionado;
  if (rascunho) {
    entrada = { ...rascunho, grafo, tenantId };
    const resto = itens.filter((c) => !(c.cenarioId === cenarioId && c.versao === rascunho.versao));
    if (st) gravar(st, [...resto, entrada]);
  } else {
    const maiorVersao = doCenario.reduce((m, c) => Math.max(m, c.versao), 0);
    entrada = { cenarioId, versao: maiorVersao + 1, publicadoEm: null, tenantId, grafo };
    if (st) gravar(st, [...itens, entrada]);
  }
  return { ...entrada };
}

/** Clona a versão mais recente do cenário como vN+1 RASCUNHO (preserva as anteriores). */
export function versionarCenario(cenarioId: string, armazem?: StorageLike): CenarioVersionado | null {
  const st = armazem ?? storagePadrao();
  if (!st) return null;
  const itens = ler(st);
  const doCenario = itens.filter((c) => c.cenarioId === cenarioId).sort((a, b) => b.versao - a.versao);
  const ultima = doCenario[0];
  if (!ultima) return null;
  const nova: CenarioVersionado = {
    cenarioId,
    versao: ultima.versao + 1,
    publicadoEm: null,
    tenantId: ultima.tenantId,
    grafo: JSON.parse(JSON.stringify(ultima.grafo)),
  };
  gravar(st, [...itens, nova]);
  return { ...nova };
}

/**
 * Publica a versão indicada SÓ se `validarGrafoAutoral().ok`. Cenário de tenant
 * (`tenantId` ≠ null) respeita o teto `limites.cenariosCustomizados` contando os
 * cenarioId DISTINTOS já publicados do tenant (republicar o mesmo não conta).
 * Catálogo da plataforma (`tenantId` null) não tem teto.
 */
export function publicarCenario(
  cenarioId: string,
  versao: number,
  agora: number,
  limites: LimitesPlano | null,
  armazem?: StorageLike
): { ok: boolean; motivo?: string } {
  const st = armazem ?? storagePadrao();
  if (!st) return { ok: false, motivo: "Armazenamento indisponível." };
  const itens = ler(st);
  const entrada = itens.find((c) => c.cenarioId === cenarioId && c.versao === versao);
  if (!entrada) return { ok: false, motivo: "Versão não encontrada na biblioteca." };

  const r = validarGrafoAutoral(entrada.grafo);
  if (!r.ok) return { ok: false, motivo: "Grafo inválido: " + r.erros.join(" · ") };

  if (entrada.tenantId !== null && limites) {
    const publicadosDoTenant = new Set(
      itens
        .filter((c) => c.tenantId === entrada.tenantId && c.publicadoEm !== null && c.cenarioId !== cenarioId)
        .map((c) => c.cenarioId)
    );
    if (publicadosDoTenant.size + 1 > limites.cenariosCustomizados) {
      return {
        ok: false,
        motivo: `O plano permite ${limites.cenariosCustomizados} cenário(s) customizado(s) — teto atingido.`,
      };
    }
  }

  const atualizado: CenarioVersionado = { ...entrada, publicadoEm: agora };
  gravar(st, [...itens.filter((c) => !(c.cenarioId === cenarioId && c.versao === versao)), atualizado]);
  return { ok: true };
}
