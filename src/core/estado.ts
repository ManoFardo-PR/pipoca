/**
 * [estado.ts] — Estado CORE (EstadoApp): os tipos-raiz do app, o estadoInicial e os
 *   seletores derivados. Fonte única de verdade de toda a app.
 *
 * PAPEL: core-lógica (modelo de estado do app · fonte única de verdade)
 * POR QUE EXISTE: reunir num só lugar o shape do EstadoApp (perfil, sessão, história,
 *   economia, modos, a11y, slices do cuidador) e as derivações puras sobre ele.
 * ENTRA: EstadoApp + patch parcial (patchEstado); MotorNarrativa para derivar as linhas.
 * SAI: EstadoApp imutável, seletores (perfilAtivo, nivelAtivo, storyLines), estadoInicial;
 *   re-exporta tipos de economia/limites/cardapio/telemetria/grafo.
 * CHAMA: ../core/grafo/tipos.js:{Nivel,ModoDesfecho,MotorNarrativa}, ./economia.js:Economia,
 *   ./limites.js:Limites, ./cardapio.js:ItemCardapio, ./telemetria.js (re-export).
 * É CHAMADO POR: src/app/bridge.ts, src/dados/schemas.ts, src/core/onboarding.ts,
 *   src/core/modos.ts, src/core/captura.ts, src/core/a11y.ts, src/core/perfil.ts, os
 *   repositórios (src/core/persistencia/, src/backend/adaptadores/) e os testes.
 * RODA POR: boot do app (via pipoca.bundle.js); testes em `bun run src/core/parciais.test.ts` (dentro de `bun run test`).
 * CUIDADO: HistoriaState.objetos é a fonte de verdade da história (lei-do-contrato). storyLines
 *   REQUER o motor para gerar os trechos. patchEstado é imutável (spread). O tipo HistoriaState é
 *   definido aqui E também (mesmo shape) em historia.ts — coexistem. Slices do cuidador (limites/
 *   cardapio/cenariosLiberados) usam null = "não configurado" → a borda aplica o padrão;
 *   coletaTelemetria segue ligada por padrão (PC_PRIV usa `!== false`).
 *
 * — detalhe preservado —
 * Pipoca — Estado CORE (EstadoApp)
 * ---------------------------------
 * Fonte única de verdade para toda a app.
 * Mapeamento do protótipo → canônico:
 *   screen       → tela
 *   ob           → perfil + modos + sessao.blocoMin
 *   fireflies    → economia.vagalumes
 *   saved        → economia.poupado
 *   strip/tray   → historia (objetos/bandeja derivada)
 *   heroVariant  → modos.palco
 *   a11y         → a11y
 *   gateStage / readWord → estado local da Tela 5
 */

import type { Nivel, ModoDesfecho, MotorNarrativa } from "../core/grafo/tipos.js";

export type { Nivel, ModoDesfecho };

// --- Preferências de acessibilidade ---
export interface A11yPrefs {
  textScale: 1 | 1.2 | 1.45;
  dyslexia: boolean;
  syllable: boolean;
  contrast: boolean;
  reduceMotion: boolean;
}

// --- Tipos de modo ---
export type VariantePalco = "Palco" | "Ateliê";
export type Verificacao = "cuidador" | "auto" | "fala";

// --- Perfil da criança ---
export interface Perfil {
  id: string;
  nome: string;
  idade: number;
  nivel: Nivel;
  avatarId: string;
  /** Aditivo opcional no pipoca.perfil.v1 (fase13-13-01); ausente = legado. */
  genero?: "m" | "f";
}

// --- Sessão / bloco de foco ---
export interface Sessao {
  perfilId: string;
  blocoMin: 10 | 15 | 20 | 25;
  iniciadaEm: number;
  restanteSeg: number;
}

// --- Estado da história ---
export interface HistoriaState {
  cenarioId: string;
  objetos: string[];
  aberta: boolean;
}

// --- Economia de vaga-lumes (tipo canônico em src/core/economia.ts) ---
import type { Economia } from "./economia.js";
export type { Economia };

// --- Modos governados pelo Controle Parental ---
export interface Modos {
  palco: VariantePalco;
  desfecho: ModoDesfecho;
  verificacao: Verificacao;
  iaLigada: boolean;
}

// --- Configurações do cuidador que viajam no save de cada criança ---
// Slices ADITIVO-OPCIONAIS do pipoca.save.v1 (schemas.ts): ausente/null =
// "não configurado" → a tela normaliza para o padrão (cardapio.ts/limites.ts).
import type { Limites } from "./limites.js";
import type { ItemCardapio } from "./cardapio.js";
export type { Limites, ItemCardapio };

// --- Estado raiz da app ---
export interface EstadoApp {
  tela: number;
  perfil: Perfil | null;
  sessao: Sessao | null;
  historia: HistoriaState;
  economia: Economia;
  modos: Modos;
  a11y: A11yPrefs;
  limites?: Limites | null;
  cardapio?: ItemCardapio[] | null;
  cenariosLiberados?: string[] | null;
  coletaTelemetria?: boolean | null;
}

// --- Evento de telemetria (tipo canônico em src/core/telemetria.ts — doc fase03-03-01) ---
export type {
  EventoTelemetria,
  TipoEventoTelemetria,
  DadosTelemetria,
} from "./telemetria.js";

// --- Estado inicial canônico ---
export const estadoInicial: EstadoApp = {
  tela: 1,
  perfil: null,
  sessao: null,
  historia: {
    cenarioId: "",
    objetos: [],
    aberta: true,
  },
  economia: {
    vagalumes: 0,
    poupado: 0,
  },
  modos: {
    palco: "Palco",
    desfecho: "convergente",
    verificacao: "cuidador",
    iaLigada: false,
  },
  a11y: {
    textScale: 1,
    dyslexia: false,
    syllable: false,
    contrast: false,
    reduceMotion: false,
  },
  // Slices por criança: null = "não configurado" (a borda aplica o padrão);
  // coleta segue ligada por padrão (PC_PRIV usa `!== false`).
  limites: null,
  cardapio: null,
  cenariosLiberados: null,
  coletaTelemetria: true,
};

// --- Seletores derivados ---

/** Retorna o perfil ativo ou null. */
export function perfilAtivo(estado: EstadoApp): Perfil | null {
  return estado.perfil;
}

/** Retorna o nível do perfil ativo, ou n1 como fallback seguro. */
export function nivelAtivo(estado: EstadoApp): Nivel {
  return estado.perfil?.nivel ?? "n1";
}

/**
 * Deriva as linhas da história a partir dos objetos commitados.
 * Requer o motor para gerar os trechos de cada objeto.
 */
export function storyLines(
  estado: EstadoApp,
  motor: MotorNarrativa
): string[] {
  const nivel = nivelAtivo(estado);
  const linhas: string[] = [motor.abertura(nivel).texto];
  const historia: string[] = [];
  for (const id of estado.historia.objetos) {
    const t = motor.aoAdicionarObjeto(historia, id, nivel);
    historia.push(id);
    if (t.texto) linhas.push(t.texto);
  }
  return linhas;
}

/** Aplica um patch parcial ao estado, retornando um novo objeto (imutável). */
export function patchEstado(
  estado: EstadoApp,
  patch: Partial<EstadoApp>
): EstadoApp {
  return { ...estado, ...patch };
}
