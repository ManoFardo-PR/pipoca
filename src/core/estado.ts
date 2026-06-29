/**
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

// --- Economia de vaga-lumes ---
export interface Economia {
  vagalumes: number;
  poupado: number;
  objetosCreditados: string[];
}

// --- Modos governados pelo Controle Parental ---
export interface Modos {
  palco: VariantePalco;
  desfecho: ModoDesfecho;
  verificacao: Verificacao;
  iaLigada: boolean;
}

// --- Estado raiz da app ---
export interface EstadoApp {
  tela: number;
  perfil: Perfil | null;
  sessao: Sessao | null;
  historia: HistoriaState;
  economia: Economia;
  modos: Modos;
  a11y: A11yPrefs;
}

// --- Evento de telemetria (stub mínimo — detalhe em fase03) ---
export interface EventoTelemetria {
  tipo: "leitura_confirmada" | "sessao_iniciada" | "sessao_encerrada" | "historia_concluida" | "objeto_destravado";
  perfilId: string;
  ts: number;
  dados: Record<string, unknown>;
}

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
    objetosCreditados: [],
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
