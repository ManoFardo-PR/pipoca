/**
 * [onboarding.ts] — Núcleo do onboarding do cuidador: dos dados do formulário monta
 *   Perfil + Modos + Sessao e devolve o EstadoApp inicial do perfil.
 *
 * PAPEL: core-lógica (onboarding do cuidador · PC_HOME · puro e testável)
 * POR QUE EXISTE: reunir num só passo a criação coerente do estado de um perfil novo,
 *   aterrissando já no modo criança (T2) com padrões seguros.
 * ENTRA: DadosOnboarding (id, nome, idade, nivel, avatarId, genero?, modos?, blocoMin?), agora (borda).
 * SAI: Perfil normalizado (perfilDoOnboarding) / EstadoApp inicial (montarEstadoOnboarding:
 *   tela 2, perfil, modos, sessao).
 * CHAMA: ./perfil.js:criarPerfil, ./modos.js:{modosPadrao,normalizarModos}, ./sessao.js:iniciarSessao,
 *   ./estado.js:estadoInicial.
 * É CHAMADO POR: src/app/bridge.ts, src/core/parciais.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: puro — a TELA coleta os campos, chama isto, persiste via RepositorioPersistencia
 *   (salvarPerfil/salvarSave) e cria o PIN (acesso.ts). Modos parciais são mesclados SOBRE os
 *   padrões seguros (iaLigada=false etc.). Não toca motor/validador. `agora` da borda.
 *
 * — detalhe preservado —
 * Pipoca — Onboarding do cuidador (PC_HOME) · doc fase02-02-04
 * ------------------------------------------------------------
 * Núcleo do hub que prepara a sessão: monta Perfil + Modos + Sessao a partir dos dados do
 * formulário e devolve o EstadoApp inicial do perfil (aterrissando no modo criança / T2).
 *
 * Puro e testável (`agora` da borda). A TELA (a cargo do app) coleta os campos, chama isto,
 * persiste via `RepositorioPersistencia` (salvarPerfil/salvarSave) e cria o PIN (acesso.ts).
 * Não toca motor/validador.
 */

import type { Perfil } from "./perfil.js";
import { criarPerfil } from "./perfil.js";
import type { Modos } from "./modos.js";
import { modosPadrao, normalizarModos } from "./modos.js";
import type { BlocoMin } from "./sessao.js";
import { iniciarSessao } from "./sessao.js";
import type { EstadoApp } from "./estado.js";
import { estadoInicial } from "./estado.js";

export interface DadosOnboarding {
  id: string;
  nome: string;
  idade: number;
  nivel: string; // normalizado por criarPerfil (n1..n4)
  avatarId: string;
  /** Gênero do personagem — aditivo opcional (fase13-13-01); saneado por criarPerfil. */
  genero?: string;
  modos?: Partial<Modos>;
  blocoMin?: BlocoMin;
}

/** Bloco de foco padrão quando o cuidador não escolhe. */
export const BLOCO_PADRAO: BlocoMin = 15;

/** Só o Perfil normalizado a partir dos dados do onboarding. */
export function perfilDoOnboarding(dados: DadosOnboarding): Perfil {
  return criarPerfil(dados.id, {
    nome: dados.nome,
    idade: dados.idade,
    nivel: dados.nivel,
    avatarId: dados.avatarId,
    ...(dados.genero !== undefined ? { genero: dados.genero } : {}),
  });
}

/**
 * Monta o EstadoApp inicial do perfil recém-criado (PERF + MODES + SESS), aterrissando em T2
 * (modo criança). Modos parciais são mesclados sobre os padrões seguros (iaLigada=false etc.).
 */
export function montarEstadoOnboarding(dados: DadosOnboarding, agora: number): EstadoApp {
  const perfil = perfilDoOnboarding(dados);
  const modos: Modos = normalizarModos({ ...modosPadrao, ...(dados.modos ?? {}) });
  const blocoMin: BlocoMin = dados.blocoMin ?? BLOCO_PADRAO;
  const sessao = iniciarSessao(perfil.id, blocoMin, agora);
  return {
    ...estadoInicial,
    tela: 2, // KIDMODE → T2
    perfil,
    modos,
    sessao,
  };
}
