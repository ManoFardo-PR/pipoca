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
import { modosPadrao, alternarPalco, autorizarIA, normalizarModos } from "../core/modos.js";
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
  modos: { modosPadrao, alternarPalco, autorizarIA, normalizarModos },
  modoApp: { MODO_PADRAO, TELA_CRIANCA, ehAdulta, podeNavegar, aplicarGuarda, aoPassarPortao, aoVoltarParaCrianca },
  perfil: { criarPerfil },
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
};

declare global {
  interface Window {
    PipocaCanonico: typeof PipocaCanonico;
  }
}

(globalThis as unknown as { PipocaCanonico: typeof PipocaCanonico }).PipocaCanonico = PipocaCanonico;

export default PipocaCanonico;
export type PipocaCanonicoAPI = typeof PipocaCanonico;
