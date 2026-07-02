/**
 * Pipoca — Ponte CORE → navegador (Marco 1 · convergência) · doc TRILHA-DE-IMPLEMENTACAO
 * -------------------------------------------------------------------------------------
 * Empacotado por `bun build --target=browser` em `pipoca.bundle.js`, carregado pelo
 * `index.html` ANTES do script da app. Expõe os módulos canônicos de `src/` em
 * `window.PipocaCanonico` para que o app que roda consuma o seam de verdade
 * (MotorNarrativa / ValidadorOrdem via fábrica), eliminando os stubs inline.
 *
 * LEI DO CONTRATO: o app fala com `criarMotor` (fábrica) e `validarGrafo`; nunca com
 * MotorGrafoAutoral/MotorIA diretamente.
 */

import { validarGrafo } from "../core/grafo/validarGrafo.js";
import { criarMotor } from "../motores/fabrica.js";
import type { GrafoAutoral } from "../core/grafo/tipos.js";
import type { ProvedorIA } from "../ia/provedor.js";
import { montarPrompt, PROMPT_BASE } from "../ia/prompt.js";
import { criarGuardrails, envolverComGuardrails } from "../ia/guardrails.js";
import { criarProvedorSimulado } from "../ia/simulado.js";
import { criarOrquestrador } from "../ia/orquestrador.js";
// fase05: consumo das flags da plataforma pelo runtime da criança (previsto na
// TRILHA). Módulo puro + storage versionado — NADA do runtime admin vem junto.
// Os adaptadores reais (claude/gemini/openai) ficam FORA do bundle da criança:
// o provedor do MVP é o simulado; a seleção por config chega com a fase06.
import { aplicarFlagsAosModos, carregarFlags, killSwitchAtivo } from "../admin/flags.js";

import {
  iniciar as compIniciar,
  bancoDaRodada as compBancoDaRodada,
  podeInserir as compPodeInserir,
  inserir as compInserir,
  ordenarR1 as compOrdenarR1,
  montar as compMontar,
  abrirProximaRodada as compAbrirProximaRodada,
  convergiu as compConvergiu,
} from "../core/composicao.js";

import {
  estadoInicial,
  patchEstado,
  perfilAtivo,
  nivelAtivo,
  storyLines,
} from "../core/estado.js";
import {
  economiaInicial,
  creditarVagalumes,
  gastarVagalumes,
  spendSuggest,
  saveSuggest,
  spendPct,
  normalizarEconomia,
} from "../core/economia.js";
import {
  historiaInicial,
  tiraInicial,
  commitarObjeto,
  textoPortao,
  derivarBandeja,
  resetHistoria,
  _placeInSlot,
  _returnToTray,
  _checkStory,
} from "../core/historia.js";
import { modosPadrao, alternarPalco, autorizarIA, normalizarModos, definirVerificacao, definirDesfecho } from "../core/modos.js";
import { exportarDados, apagarDados } from "../core/lgpd.js";
import { LIMITES_PADRAO, definirBlocoFoco, normalizarTempoDeTela, normalizarLimites } from "../core/limites.js";
import {
  CARDAPIO_PADRAO,
  normalizarCardapio,
  validarItemCardapio,
  CENARIOS_PADRAO,
  normalizarCenariosLiberados,
} from "../core/cardapio.js";
import {
  MODO_PADRAO,
  TELA_CRIANCA,
  ehAdulta,
  podeNavegar,
  aplicarGuarda,
  aoPassarPortao,
  aoVoltarParaCrianca,
} from "../core/modoApp.js";
import { criarPerfil } from "../core/perfil.js";
import { montarEstadoOnboarding, perfilDoOnboarding, BLOCO_PADRAO } from "../core/onboarding.js";
import { iniciarSessao, tick, encerrarSessao, formatarRestante } from "../core/sessao.js";
import { estiloLeitura, paletaContraste, transicao, animacaoCena } from "../core/a11y.js";
import { tokenizarTrecho, ehPalavraDificil, silabar } from "../core/leitura.js";
import { tts } from "../servicos/tts.js";
import { criarRepositorio } from "../core/persistencia/index.js";
import { criarEvento } from "../core/telemetria.js";
import {
  capturarLeituraConfirmada,
  capturarObjetoDestravado,
  capturarSessaoIniciada,
  capturarSessaoEncerrada,
  capturarHistoriaConcluida,
} from "../core/captura.js";
import {
  resumir,
  gerarSeries,
  calcularEngajamento,
  filtrarPorPeriodo,
  chaveDia,
  rotuloDia,
  TETO_MINUTOS_SESSAO,
} from "../core/agregadosTelemetria.js";
import { acessoInicial, definirPin, verificarPin } from "../core/acesso.js";
import { carregarAcesso, salvarAcesso, temPin } from "../servicos/acesso_repo.js";
import { entrarFamilia, criarSessao, sessaoValida, DURACAO_SESSAO_MS } from "../core/contaFamilia.js";
import {
  carregarConta,
  salvarConta,
  carregarSessaoConta,
  salvarSessaoConta,
  limparSessaoConta,
} from "../servicos/conta_repo.js";

const PipocaCanonico = {
  // --- narrativa (eixo 1 / seam) ---
  validarGrafo,
  criarMotor,

  // --- composição autoral v2 (linha verde T2→T7) ---
  composicao: {
    iniciar: compIniciar,
    bancoDaRodada: compBancoDaRodada,
    podeInserir: compPodeInserir,
    inserir: compInserir,
    ordenarR1: compOrdenarR1,
    montar: compMontar,
    abrirProximaRodada: compAbrirProximaRodada,
    convergiu: compConvergiu,
  },

  // --- CORE ---
  estado: { estadoInicial, patchEstado, perfilAtivo, nivelAtivo, storyLines },
  economia: {
    economiaInicial,
    creditarVagalumes,
    gastarVagalumes,
    spendSuggest,
    saveSuggest,
    spendPct,
    normalizarEconomia,
  },
  historia: {
    historiaInicial,
    tiraInicial,
    commitarObjeto,
    textoPortao,
    derivarBandeja,
    resetHistoria,
    _placeInSlot,
    _returnToTray,
    _checkStory,
  },
  modos: { modosPadrao, alternarPalco, autorizarIA, normalizarModos, definirVerificacao, definirDesfecho },
  modoApp: { MODO_PADRAO, TELA_CRIANCA, ehAdulta, podeNavegar, aplicarGuarda, aoPassarPortao, aoVoltarParaCrianca },
  limites: { LIMITES_PADRAO, definirBlocoFoco, normalizarTempoDeTela, normalizarLimites },
  cardapio: { CARDAPIO_PADRAO, normalizarCardapio, validarItemCardapio, CENARIOS_PADRAO, normalizarCenariosLiberados },
  lgpd: { exportarDados, apagarDados },
  perfil: { criarPerfil },
  onboarding: { montarEstadoOnboarding, perfilDoOnboarding, BLOCO_PADRAO },
  sessao: { iniciarSessao, tick, encerrarSessao, formatarRestante },
  a11y: { estiloLeitura, paletaContraste, transicao, animacaoCena },
  leitura: { tokenizarTrecho, ehPalavraDificil, silabar },
  acesso: { acessoInicial, definirPin, verificarPin, carregarAcesso, salvarAcesso, temPin },
  conta: {
    entrarFamilia,
    criarSessao,
    sessaoValida,
    DURACAO_SESSAO_MS,
    carregarConta,
    salvarConta,
    carregarSessaoConta,
    salvarSessaoConta,
    limparSessaoConta,
  },

  // --- IA (fase05 · Motor B, MVP local com provedor simulado) ---
  ia: {
    montarPrompt,
    PROMPT_BASE,
    criarGuardrails,
    envolverComGuardrails,
    criarProvedorSimulado,
    criarOrquestrador,
    /** Composição padrão do MVP: simulado → guardrails → orquestrador. */
    montarProvedorPadrao(grafo: GrafoAutoral): ProvedorIA {
      const simulado = criarProvedorSimulado(grafo);
      const guardado = envolverComGuardrails(simulado) as ProvedorIA;
      return criarOrquestrador([guardado]);
    },
  },

  // --- flags da plataforma (kill-switches do SA_SAFE, fase04→05) ---
  flags: { carregarFlags, killSwitchAtivo, aplicarFlagsAosModos },

  // --- serviços / seams ---
  tts,
  criarRepositorio,

  // --- telemetria (TELE) ---
  telemetria: {
    criarEvento,
    capturarLeituraConfirmada,
    capturarObjetoDestravado,
    capturarSessaoIniciada,
    capturarSessaoEncerrada,
    capturarHistoriaConcluida,
  },

  // --- agregados do painel (PC_DASH) ---
  agregados: {
    resumir,
    gerarSeries,
    calcularEngajamento,
    filtrarPorPeriodo,
    chaveDia,
    rotuloDia,
    TETO_MINUTOS_SESSAO,
  },
};

declare global {
  interface Window {
    PipocaCanonico: typeof PipocaCanonico;
  }
}

(globalThis as unknown as { PipocaCanonico: typeof PipocaCanonico }).PipocaCanonico = PipocaCanonico;

export default PipocaCanonico;
export type PipocaCanonicoAPI = typeof PipocaCanonico;
