/**
 * Pipoca — Ponte CORE → navegador (Marco 1 · convergência) · doc TRILHA-DE-IMPLEMENTACAO
 * -------------------------------------------------------------------------------------
 * Empacotado por `bun build --target=browser` em `pipoca.bundle.js`, carregado pelo
 * `index.html` ANTES do script da app. Expõe os módulos canônicos de `src/` em
 * `window.PipocaCanonico` para que o app que roda consuma o seam de verdade.
 *
 * LEI DO CONTRATO: a narrativa da linha verde é a COMPOSIÇÃO AUTORAL A+
 * (`composicao` · grafo pipoca.grafo-autoral.v3); o app nunca instancia motor
 * por conta própria. O stack v1 (MotorGrafoAutoral/fábrica) foi arquivado em
 * old/ na implantação do v3; a IA em runtime volta como realizador atrás do
 * mesmo contrato `montar()` (jardim — Motor B).
 */

// fase05: consumo das flags da plataforma pelo runtime da criança (previsto na
// TRILHA). Módulo puro + storage versionado — NADA do runtime admin vem junto.
import { aplicarFlagsAosModos, carregarFlags, killSwitchAtivo } from "../admin/flags.js";
// fase06: backend trocável (config pública + fachada + sync). O runtime fala
// SÓ com a fachada — lei do backend.
import { obterBackend } from "../backend/backend.js";
import { configDoAmbiente, normalizarConfigBackend } from "../backend/config.js";
import { escopoTenant } from "../backend/tenant.js";
import { sincronizarInicial } from "../backend/sync.js";
// pós-fase06: kill-switch GLOBAL — o app puxa as flags do servidor no boot/login
import { puxarFlagsGlobais } from "../backend/flags_globais.js";
// pós-fase06: teto de perfis no app (UX acolhedora; o trigger do servidor é o
// enforcement real). tiposTenant é 100% puro — nada do runtime admin vem junto.
import { limitesDaFamilia } from "../backend/limites_familia.js";
import { excedeTetoPerfis } from "../admin/tenant/tiposTenant.js";

import {
  iniciar as compIniciar,
  bancoDaRodada as compBancoDaRodada,
  podeInserir as compPodeInserir,
  inserir as compInserir,
  ordenarR1 as compOrdenarR1,
  montar as compMontar,
  abrirProximaRodada as compAbrirProximaRodada,
  convergiu as compConvergiu,
  ESQUEMA_COMPOSICAO_V3,
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
import {
  RETENCAO_HISTORIAS_DIAS,
  MAX_NAO_FAVORITAS,
  validarHistoriaSalva,
  dentroDaRetencaoHistoria,
  normalizarHistorias,
  tituloDaHistoria,
  dataRelativa,
} from "../core/historias.js";
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
import { asr, asrDisponivel, avaliarParticipacao, criarServicoASR } from "../servicos/asr.js";
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
  // --- composição autoral A+ (linha verde T2→T7 · grafo pipoca.grafo-autoral.v3) ---
  composicao: {
    esquema: ESQUEMA_COMPOSICAO_V3,
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
  historias: {
    RETENCAO_HISTORIAS_DIAS,
    MAX_NAO_FAVORITAS,
    validarHistoriaSalva,
    dentroDaRetencaoHistoria,
    normalizarHistorias,
    tituloDaHistoria,
    dataRelativa,
  },
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

  // --- backend trocável (fase06 · lei do backend) ---
  backend: {
    obterBackend,
    configDoAmbiente,
    normalizarConfigBackend,
    escopoTenant,
    sincronizarInicial,
    puxarFlagsGlobais,
    limitesDaFamilia,
    excedeTetoPerfis,
  },

  // --- flags da plataforma (kill-switches do SA_SAFE, fase04→05) ---
  flags: { carregarFlags, killSwitchAtivo, aplicarFlagsAosModos },

  // --- serviços / seams ---
  tts,
  asr: { asr, criarServicoASR, asrDisponivel, avaliarParticipacao },
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
