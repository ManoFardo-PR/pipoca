/**
 * Pipoca — Biblioteca de conteúdo (SA_CONTENT) · doc fase04-04-04
 * ----------------------------------------------------------------
 * Curadoria de grafos autorais (`pipoca.grafo-autoral.v1`): validação DUPLA
 * (schema via núcleo + simulação Motor A/ValidadorOrdem nos 4 níveis) e
 * biblioteca com rascunho → versão → publicação. Publicar cenário de tenant
 * respeita o teto `cenariosCustomizados` do plano (seam 04-03).
 * Reusa os núcleos canônicos — nada de lógica de grafo duplicada aqui.
 */

import type { StorageLike, TenantId } from "./auth/tiposAdmin.js";
import type { LimitesPlano } from "./tenant/tiposTenant.js";
import type { GrafoAutoral, Nivel } from "../core/grafo/tipos.js";
import { validarGrafo } from "../core/grafo/validarGrafo.js";
import { criarMotor } from "../motores/fabrica.js";
import { criarValidadorOrdem } from "../motores/validador_ordem.js";
import { modosPadrao } from "../core/modos.js";

export interface ResultadoValidacaoGrafo {
  ok: boolean;
  erros: string[];
  avisos: string[];
}

const NIVEIS: Nivel[] = ["n1", "n2", "n3", "n4"];

/**
 * Validação dupla do doc 04-04:
 * 1) schema (validarGrafo do núcleo — motivo vira erro);
 * 2) dependências (ciclo em `tem:` → erro via ValidadorOrdem);
 * 3) simulação Motor A nos 4 níveis: abertura, cada objeto na ordem canônica e
 *    os desfechos convergente E aberto — trecho vazio é erro;
 * 4) desfecho aberto sem ramo para algum objeto → AVISO (degrada p/ convergente).
 */
export function validarGrafoAutoral(json: unknown): ResultadoValidacaoGrafo {
  const erros: string[] = [];
  const avisos: string[] = [];

  let grafo: GrafoAutoral;
  try {
    grafo = validarGrafo(json);
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
    return { ok: false, erros, avisos };
  }

  let ordemIds: string[] = [];
  try {
    const ordem = criarValidadorOrdem(grafo.cenario);
    ordemIds = ordem.ordemCanonica();
  } catch (e) {
    erros.push("dependências: " + (e instanceof Error ? e.message : String(e)));
    return { ok: false, erros, avisos };
  }

  try {
    const { motor } = criarMotor(grafo.cenario, { ...modosPadrao });
    for (const nivel of NIVEIS) {
      if (!motor.abertura(nivel).texto) erros.push(`abertura vazia no nível ${nivel}`);
      const historia: string[] = [];
      for (const id of ordemIds) {
        const t = motor.aoAdicionarObjeto(historia, id, nivel);
        if (!t.texto) erros.push(`trecho vazio para "${id}" no nível ${nivel}`);
        historia.push(id);
      }
      if (!motor.desfecho(historia, "convergente", nivel).texto) {
        erros.push(`desfecho convergente vazio no nível ${nivel}`);
      }
      if (!motor.desfecho(historia, "aberto", nivel).texto) {
        erros.push(`desfecho aberto vazio no nível ${nivel}`);
      }
    }
  } catch (e) {
    erros.push("simulação: " + (e instanceof Error ? e.message : String(e)));
  }

  const comRamo = new Set(grafo.cenario.desfechos.aberto.map((d) => d.se_terminou_com));
  const semRamo = grafo.cenario.objetos.map((o) => o.id).filter((id) => !comRamo.has(id));
  if (semRamo.length > 0) {
    avisos.push(
      `desfecho aberto sem ramo para: ${semRamo.join(", ")} — nesses finais a história degrada para o desfecho convergente`
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
