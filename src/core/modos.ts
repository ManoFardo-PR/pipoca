/**
 * [modos.ts] — Modos de narrativa (MODES): Palco/Ateliê, verificação do portão, desfecho
 *   e iaLigada — com padrões, normalização, mutadores e validação.
 *
 * PAPEL: core-lógica (modos que governam a experiência de narrativa)
 * POR QUE EXISTE: reunir num só tipo as escolhas do cuidador que moldam a apresentação e o
 *   fluxo (não a fronteira criança/cuidador, que é modoApp.ts).
 * ENTRA: Modos, raw (normalizar/validar), flags (autorizarIA/definirVerificacao/definirDesfecho).
 * SAI: Modos normalizado/alternado (imutável), lista de erros de validação, modosPadrao.
 * CHAMA: ./estado.js:ModoDesfecho (tipo).
 * É CHAMADO POR: src/core/onboarding.ts, src/core/telemetria.ts (tipo Verificacao),
 *   src/dados/schemas.ts, src/app/bridge.ts, src/admin/{bridge_admin,flags,admin.test}.ts,
 *   src/backend/backend.test.ts, src/core/parciais.test.ts, old/motores/fabrica.ts (legado).
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: iaLigada tem default seguro = false; a fábrica lê esta flag (Motor A vs B) e, sem
 *   provedor configurado (fase04-04-05), permanece em Motor A na prática. `Modos` (config de
 *   narrativa) ≠ `ModoApp` (criança/cuidador, modoApp.ts).
 *
 * — detalhe preservado —
 * Pipoca — Modos (MODES)
 * -----------------------
 * Centraliza os modos que governam a experiência.
 * Palco vs Ateliê: variações de apresentação da mesma mecânica.
 * Verificacao: define o fluxo do portão.
 * iaLigada: decide Motor A vs B na fábrica.
 *
 * Mapeamento do protótipo:
 *   heroVariant A/B → palco: "Palco" | "Ateliê"
 *   ob.verify       → verificacao
 *   (novo)          → desfecho: "convergente" | "aberto"
 *   (novo, false)   → iaLigada
 */

import type { ModoDesfecho } from "./estado.js";

export type { ModoDesfecho };

export type VariantePalco = "Palco" | "Ateliê";
export type Verificacao = "cuidador" | "auto" | "fala";

export interface Modos {
  palco: VariantePalco;
  desfecho: ModoDesfecho;
  verificacao: Verificacao;
  iaLigada: boolean;
}

/** Modos padrão do MVP. */
export const modosPadrao: Modos = {
  palco: "Palco",
  desfecho: "convergente",
  verificacao: "cuidador",
  iaLigada: false,
};

const PALCOS_VALIDOS: VariantePalco[] = ["Palco", "Ateliê"];
const VERIFICACOES_VALIDAS: Verificacao[] = ["cuidador", "auto", "fala"];
const DESFECHOS_VALIDOS: ModoDesfecho[] = ["convergente", "aberto"];

export function normalizarModos(raw: unknown): Modos {
  if (typeof raw !== "object" || raw === null) return { ...modosPadrao };
  const r = raw as Record<string, unknown>;
  return {
    palco: (PALCOS_VALIDOS as string[]).includes(r["palco"] as string)
      ? (r["palco"] as VariantePalco)
      : modosPadrao.palco,
    desfecho: (DESFECHOS_VALIDOS as string[]).includes(r["desfecho"] as string)
      ? (r["desfecho"] as ModoDesfecho)
      : modosPadrao.desfecho,
    verificacao: (VERIFICACOES_VALIDAS as string[]).includes(r["verificacao"] as string)
      ? (r["verificacao"] as Verificacao)
      : modosPadrao.verificacao,
    iaLigada: typeof r["iaLigada"] === "boolean" ? r["iaLigada"] : false,
  };
}

/** Alterna palco sem afetar as demais configurações. */
export function alternarPalco(modos: Modos): Modos {
  return {
    ...modos,
    palco: modos.palco === "Palco" ? "Ateliê" : "Palco",
  };
}

/**
 * Autoriza (ou não) a geração por IA (Motor B) para a criança — ação `autorizarIA` (PC_AI).
 * Default seguro = desligado; a fábrica ([[fase00-00-19]]) lê esta flag. Sem provedor
 * configurado ([[fase04-04-05]]), a fábrica permanece em Motor A na prática.
 */
export function autorizarIA(modos: Modos, on: boolean): Modos {
  return { ...modos, iaLigada: !!on };
}

/** Define o modo de verificação do portão (cuidador/auto/fala) — PC_RULES. */
export function definirVerificacao(modos: Modos, verificacao: Verificacao): Modos {
  return { ...modos, verificacao };
}

/** Define o modo de desfecho (convergente/aberto) — PC_RULES. */
export function definirDesfecho(modos: Modos, desfecho: ModoDesfecho): Modos {
  return { ...modos, desfecho };
}

/** Valida um objeto Modos candidato. Retorna lista de erros. */
export function validarModos(m: unknown): string[] {
  const erros: string[] = [];
  if (typeof m !== "object" || m === null) return ["modos deve ser objeto"];
  const r = m as Record<string, unknown>;
  if (!(PALCOS_VALIDOS as string[]).includes(r["palco"] as string)) erros.push("palco inválido");
  if (!(DESFECHOS_VALIDOS as string[]).includes(r["desfecho"] as string)) erros.push("desfecho inválido");
  if (!(VERIFICACOES_VALIDAS as string[]).includes(r["verificacao"] as string)) erros.push("verificacao inválida");
  if (typeof r["iaLigada"] !== "boolean") erros.push("iaLigada deve ser boolean");
  return erros;
}
