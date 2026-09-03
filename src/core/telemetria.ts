/**
 * [telemetria.ts] — Tipo canônico EventoTelemetria + união discriminada dos payloads +
 *   fábrica pura (criarEvento) e type guard (validarEvento).
 *
 * PAPEL: core-lógica (telemetria de progresso · TELE · tipos + fábrica)
 * POR QUE EXISTE: dar um formato único e privado por construção aos eventos de progresso, que
 *   captura.ts monta, os repositórios gravam e agregadosTelemetria.ts resume.
 * ENTRA: tipo, perfilId, dados (payload por tipo), agora (epoch ms da borda).
 * SAI: EventoTelemetria (esquema pipoca.telemetria.v1); validarEvento (guard).
 * CHAMA: ./grafo/tipos.js:Nivel, ./modos.js:Verificacao (tipos).
 * É CHAMADO POR: src/core/captura.ts, src/core/agregadosTelemetria.ts, src/core/estado.ts
 *   (re-export), src/servicos/telemetria_repo.ts, os repositórios (RepositorioLocalStorage,
 *   repo_supabase), src/app/bridge.ts e os testes.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: nenhuma função chama Date.now() — o `ts` entra SEMPRE via `agora` (criarEvento LANÇA
 *   se `agora` não for número finito). PRIVADO POR CONSTRUÇÃO (LGPD): `dados` só carrega métricas
 *   e ids opacos (perfilId/cenarioId/objetoId/nivel/verificacao) — NUNCA texto lido nem PII.
 *
 * — detalhe preservado —
 * Pipoca — Telemetria de progresso (TELE) · doc dono fase03-03-01
 * ----------------------------------------------------------------
 * Tipo canônico `EventoTelemetria` + união discriminada dos payloads + fábrica pura.
 *
 * DISCIPLINA DE TEMPO (lei do contrato): nenhuma função aqui chama `Date.now()`.
 * O `ts` entra SEMPRE pelo parâmetro `agora`, injetado na borda (CORE/telas).
 *
 * PRIVADO POR CONSTRUÇÃO (LGPD): `dados` só carrega métricas de progresso e ids
 * opacos (perfilId/cenarioId/objetoId/nivel/verificacao). Nunca texto lido nem PII.
 */

import type { Nivel } from "./grafo/tipos.js";
import type { Verificacao } from "./modos.js";

export const ESQUEMA_TELEMETRIA = "pipoca.telemetria.v1";

export type TipoEventoTelemetria =
  | "leitura_confirmada"
  | "sessao_iniciada"
  | "sessao_encerrada"
  | "historia_concluida"
  | "objeto_destravado"
  | "espelho_falhou"; // D2: sinal de INFRA (push remoto falhou) — fora do painel

// --- payloads por tipo (união discriminada pelo `tipo` no nível do evento) ---
export interface DadosLeituraConfirmada {
  palavras: number; // nº de palavras do Trecho lido
  cenarioId: string;
  nivel: Nivel;
  verificacao: Verificacao; // como foi confirmada (cuidador|auto|fala)
  objetoId?: string; // objeto que destravou (se houver)
}
export interface DadosSessaoIniciada { cenarioId?: string; blocoMin: 10 | 15 | 20 | 25; }
/** D2: rastro local de uma escrita remota que falhou (op do repo + último erro). */
export interface DadosEspelhoFalhou { op: string; erro: string; }
export interface DadosSessaoEncerrada { minutos: number; palavras: number; historias: number; }
export interface DadosHistoriaConcluida { cenarioId: string; nivel: Nivel; objetos: number; palavras: number; }
export interface DadosObjetoDestravado { cenarioId: string; objetoId: string; nivel: Nivel; }

export type DadosTelemetria =
  | DadosLeituraConfirmada
  | DadosSessaoIniciada
  | DadosSessaoEncerrada
  | DadosHistoriaConcluida
  | DadosObjetoDestravado
  | DadosEspelhoFalhou;

export interface EventoTelemetria {
  esquema: "pipoca.telemetria.v1";
  tipo: TipoEventoTelemetria;
  perfilId: string;
  ts: number; // epoch ms — INJETADO fora do motor (borda CORE)
  dados: DadosTelemetria;
}

const TIPOS_VALIDOS: TipoEventoTelemetria[] = [
  "leitura_confirmada",
  "sessao_iniciada",
  "sessao_encerrada",
  "historia_concluida",
  "objeto_destravado",
  "espelho_falhou",
];

/**
 * Fábrica pura de evento. `agora` é a única fonte de tempo, vinda da borda.
 * @throws se `agora` não for um número finito (tempo precisa vir da borda).
 */
export function criarEvento(
  tipo: TipoEventoTelemetria,
  perfilId: string,
  dados: DadosTelemetria,
  agora: number
): EventoTelemetria {
  if (typeof agora !== "number" || !Number.isFinite(agora)) {
    throw new Error("criarEvento: `agora` (ts) deve ser número finito injetado pela borda");
  }
  return { esquema: ESQUEMA_TELEMETRIA, tipo, perfilId, ts: agora, dados };
}

/** Validação leve do evento (esquema, tipo, perfilId, ts, dados coerente). */
export function validarEvento(e: unknown): e is EventoTelemetria {
  if (typeof e !== "object" || e === null) return false;
  const r = e as Record<string, unknown>;
  if (r["esquema"] !== ESQUEMA_TELEMETRIA) return false;
  if (!TIPOS_VALIDOS.includes(r["tipo"] as TipoEventoTelemetria)) return false;
  if (typeof r["perfilId"] !== "string" || r["perfilId"].length === 0) return false;
  if (typeof r["ts"] !== "number" || !Number.isFinite(r["ts"])) return false;
  if (typeof r["dados"] !== "object" || r["dados"] === null) return false;
  return true;
}
