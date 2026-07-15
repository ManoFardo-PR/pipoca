/**
 * [captura.ts] — Pontos de captura de telemetria: montam o EventoTelemetria a partir
 *   do EstadoApp + contexto e o despacham ao repositório (fire-and-forget).
 *
 * PAPEL: core-lógica (pontos de captura de telemetria · TELE)
 * POR QUE EXISTE: registrar progresso (leitura confirmada, objeto destravado, borda de
 *   sessão, história concluída) sem que a persistência jamais trave a leitura/recompensa.
 * ENTRA: EstadoApp, palavras/objetoId/resumo, agora (epoch ms da borda), RepositorioPersistencia,
 *   jaEmitidos? (Set para idempotência).
 * SAI: boolean (capturou?) + efeito: repo.registrarTelemetria(evento) disparado sem await.
 * CHAMA: ./telemetria.js:criarEvento (+ tipos Dados*), ./estado.js:EstadoApp,
 *   ./persistencia/index.js:RepositorioPersistencia.
 * É CHAMADO POR: src/app/bridge.ts, src/core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: fire-and-forget — falha de persistência NUNCA trava a UI (rejeição engolida de
 *   propósito). Sem perfil ativo → não captura. `agora` sempre da borda (nada de Date.now()).
 *   Não importa motor algum (lei do contrato). capturarObjetoDestravado é idempotente via
 *   `jaEmitidos` (Set compartilhado) contra re-render/voltar de tela.
 *
 * — detalhe preservado —
 * Pipoca — Pontos de captura de telemetria (TELE) · doc fase03-03-01
 * -------------------------------------------------------------------
 * Funções puras que montam um `EventoTelemetria` a partir do `EstadoApp` + contexto
 * e o entregam a `RepositorioPersistencia.registrarTelemetria`.
 *
 * REGRAS:
 *  - `agora` (ts) vem SEMPRE da borda; nada de `Date.now()` aqui.
 *  - Fire-and-forget: falha de persistência NUNCA trava a UI (a leitura/recompensa segue).
 *  - Sem perfil ativo → não captura (precondição `perfilId`).
 *  - Não importa motor algum: telemetria observa o estado, não a narrativa (lei do contrato).
 */

import type { EstadoApp } from "./estado.js";
import type { RepositorioPersistencia } from "./persistencia/index.js";
import {
  criarEvento,
  type DadosLeituraConfirmada,
  type DadosObjetoDestravado,
  type DadosSessaoIniciada,
  type DadosSessaoEncerrada,
  type DadosHistoriaConcluida,
  type EventoTelemetria,
} from "./telemetria.js";

/** Despacha sem deixar a rejeição escapar (fire-and-forget). */
function despachar(repo: RepositorioPersistencia, evento: EventoTelemetria): void {
  try {
    void Promise.resolve(repo.registrarTelemetria(evento)).catch(() => {});
  } catch {
    /* registrarTelemetria síncrono que lança — engolido de propósito */
  }
}

/** Portão: leitura confirmada ([[fase01-01-06]] / [[fase01-01-08]]). */
export function capturarLeituraConfirmada(
  estado: EstadoApp,
  palavras: number,
  objetoId: string | undefined,
  agora: number,
  repo: RepositorioPersistencia
): boolean {
  if (!estado.perfil) return false;
  const dados: DadosLeituraConfirmada = {
    palavras,
    cenarioId: estado.historia.cenarioId,
    nivel: estado.perfil.nivel,
    verificacao: estado.modos.verificacao,
    ...(objetoId ? { objetoId } : {}),
  };
  despachar(repo, criarEvento("leitura_confirmada", estado.perfil.id, dados, agora));
  return true;
}

/**
 * Recompensa: objeto destravado ([[fase01-01-10]]).
 * Idempotente por objeto: passe um `jaEmitidos` (Set) compartilhado para evitar duplicar
 * em re-render/voltar de tela — alinhado ao `creditarVagalumes` idempotente.
 */
export function capturarObjetoDestravado(
  estado: EstadoApp,
  objetoId: string,
  agora: number,
  repo: RepositorioPersistencia,
  jaEmitidos?: Set<string>
): boolean {
  if (!estado.perfil) return false;
  if (jaEmitidos && jaEmitidos.has(objetoId)) return false;
  const dados: DadosObjetoDestravado = {
    cenarioId: estado.historia.cenarioId,
    objetoId,
    nivel: estado.perfil.nivel,
  };
  despachar(repo, criarEvento("objeto_destravado", estado.perfil.id, dados, agora));
  if (jaEmitidos) jaEmitidos.add(objetoId);
  return true;
}

/** Borda da sessão: início do bloco de foco ([[fase00-00-08]]). */
export function capturarSessaoIniciada(
  estado: EstadoApp,
  agora: number,
  repo: RepositorioPersistencia
): boolean {
  if (!estado.perfil || !estado.sessao) return false;
  const dados: DadosSessaoIniciada = {
    ...(estado.historia.cenarioId ? { cenarioId: estado.historia.cenarioId } : {}),
    blocoMin: estado.sessao.blocoMin,
  };
  despachar(repo, criarEvento("sessao_iniciada", estado.perfil.id, dados, agora));
  return true;
}

/**
 * Borda da sessão: término do bloco ([[fase00-00-08]]).
 * `minutos` derivado de `Sessao.iniciadaEm` e `agora` (ambos epoch ms da borda).
 * `palavras`/`historias` vêm acumulados pelo chamador (padrão 0).
 */
export function capturarSessaoEncerrada(
  estado: EstadoApp,
  resumo: { palavras?: number; historias?: number },
  agora: number,
  repo: RepositorioPersistencia
): boolean {
  if (!estado.perfil || !estado.sessao) return false;
  const minutos = Math.max(0, Math.round((agora - estado.sessao.iniciadaEm) / 60000));
  const dados: DadosSessaoEncerrada = {
    minutos,
    palavras: resumo.palavras ?? 0,
    historias: resumo.historias ?? 0,
  };
  despachar(repo, criarEvento("sessao_encerrada", estado.perfil.id, dados, agora));
  return true;
}

/**
 * Desfecho: história concluída quando `HistoriaState.aberta` vira `false` ([[fase00-00-09]]).
 * `palavras` (soma dos trechos) vem do chamador, que tem acesso ao texto — captura não importa motor.
 */
export function capturarHistoriaConcluida(
  estado: EstadoApp,
  palavras: number,
  agora: number,
  repo: RepositorioPersistencia
): boolean {
  if (!estado.perfil) return false;
  const dados: DadosHistoriaConcluida = {
    cenarioId: estado.historia.cenarioId,
    nivel: estado.perfil.nivel,
    objetos: estado.historia.objetos.length,
    palavras,
  };
  despachar(repo, criarEvento("historia_concluida", estado.perfil.id, dados, agora));
  return true;
}
