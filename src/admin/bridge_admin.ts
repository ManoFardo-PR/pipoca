/**
 * Pipoca — Ponte dos núcleos do SUPER ADMIN → navegador (fase04)
 * ---------------------------------------------------------------
 * Empacotado por `npm run build:admin` (bun build → pipoca.admin.bundle.js,
 * COMMITADO), carregado APENAS por admin.html — o app da criança não carrega
 * nada daqui. Expõe `window.PipocaAdminCanonico` para estadoAdmin.js e as
 * telas SA_*.
 *
 * LEMBRETE: qualquer mudança nos módulos de src/admin exportados aqui exige
 * `npm run build:admin` + commit do bundle (mesma disciplina do build:app).
 */

import {
  criarRepositorioAdmin,
  avaliarLogin,
  calcularAtrasoMs,
  hashSenha,
  adminIdDoEmail,
  MAX_TENTATIVAS_ADMIN,
} from "./auth/autenticacaoSuperAdmin.js";
import {
  criarSessaoSuperAdmin,
  sessaoSuperAdminValida,
  escopoAutoriza,
  areaDisponivel,
  DURACAO_SESSAO_ADMIN_MS,
} from "./auth/sessaoSuperAdmin.js";
import {
  ROTAS_ADMIN,
  guardarRotaAdmin,
  TELA_SA_LOGIN,
  TELA_SA_HOME,
  TELA_SA_TENANT,
  TELA_SA_CONTENT,
  TELA_SA_AI,
  TELA_SA_SAFE,
} from "./rotasAdmin.js";
import {
  PLANOS_PADRAO,
  PLANO_MAIS_RESTRITIVO,
  PLANO_INICIAL,
  limitesDoPlano,
  limitesVigentes,
  diasRestantes,
  excedeTetoPerfis,
} from "./tenant/tiposTenant.js";
import {
  criarRepositorioTenant,
  novoTenant,
  listarContas,
  vincularConta,
  ERRO_FORA_DE_ESCOPO,
} from "./tenant/repositorioTenant.js";
import {
  validarGrafoAutoral,
  listarCenarios,
  salvarRascunho,
  versionarCenario,
  publicarCenario,
} from "./validar_grafo.js";
import {
  CONFIG_IA_PADRAO,
  MODELOS_POR_PROVEDOR,
  validarConfigIA,
  iaEfetivaDisponivel,
  carregarConfigIA,
  salvarConfigIA,
} from "./ia_config.js";
import {
  FLAGS_PADRAO,
  definirFlag,
  killSwitch,
  killSwitchAtivo,
  aplicarFlagsAosModos,
  carregarFlags,
  salvarFlags,
} from "./flags.js";
import { modosPadrao } from "../core/modos.js";
// fase06: fachada do backend trocável (auth remota do operador + espelho da
// config de IA que o ProxyIA lê server-side). Config "local" → tudo local.
import { espelharConfigIA, obterBackend } from "../backend/backend.js";
import { configDoAmbiente, normalizarConfigBackend } from "../backend/config.js";
// pós-fase06: espelho remoto de tenants/conteúdo/flags + pull no login do
// operador (servidor vence) — admin-only, não entra no bundle da criança.
import {
  espelharTenantRemoto,
  espelharCenarioRemoto,
  espelharFlagsRemotas,
  puxarAdminDoServidor,
  envolverRepoTenantComEspelho,
} from "../backend/espelho_admin.js";

const PipocaAdminCanonico = {
  auth: {
    criarRepositorioAdmin,
    avaliarLogin,
    calcularAtrasoMs,
    hashSenha,
    adminIdDoEmail,
    MAX_TENTATIVAS_ADMIN,
    criarSessaoSuperAdmin,
    sessaoSuperAdminValida,
    escopoAutoriza,
    areaDisponivel,
    DURACAO_SESSAO_ADMIN_MS,
  },
  rotas: {
    ROTAS_ADMIN,
    guardarRotaAdmin,
    TELA_SA_LOGIN,
    TELA_SA_HOME,
    TELA_SA_TENANT,
    TELA_SA_CONTENT,
    TELA_SA_AI,
    TELA_SA_SAFE,
  },
  tenants: {
    criarRepositorioTenant,
    novoTenant,
    listarContas,
    vincularConta,
    PLANOS_PADRAO,
    PLANO_MAIS_RESTRITIVO,
    PLANO_INICIAL,
    limitesDoPlano,
    limitesVigentes,
    diasRestantes,
    excedeTetoPerfis,
    ERRO_FORA_DE_ESCOPO,
  },
  conteudo: {
    validarGrafoAutoral,
    listarCenarios,
    salvarRascunho,
    versionarCenario,
    publicarCenario,
  },
  ia: {
    CONFIG_IA_PADRAO,
    MODELOS_POR_PROVEDOR,
    validarConfigIA,
    iaEfetivaDisponivel,
    carregarConfigIA,
    salvarConfigIA,
  },
  flags: {
    FLAGS_PADRAO,
    definirFlag,
    killSwitch,
    killSwitchAtivo,
    aplicarFlagsAosModos,
    carregarFlags,
    salvarFlags,
  },
  modos: { modosPadrao },
  // fase06 · backend trocável (lei do backend: telas/estado só falam com a fachada)
  backend: {
    obterBackend,
    configDoAmbiente,
    normalizarConfigBackend,
    espelharConfigIA,
    espelharTenantRemoto,
    espelharCenarioRemoto,
    espelharFlagsRemotas,
    puxarAdminDoServidor,
    envolverRepoTenantComEspelho,
  },
};

declare global {
  interface Window {
    PipocaAdminCanonico: typeof PipocaAdminCanonico;
  }
}

(globalThis as unknown as { PipocaAdminCanonico: typeof PipocaAdminCanonico }).PipocaAdminCanonico =
  PipocaAdminCanonico;

export default PipocaAdminCanonico;
export type PipocaAdminCanonicoAPI = typeof PipocaAdminCanonico;
