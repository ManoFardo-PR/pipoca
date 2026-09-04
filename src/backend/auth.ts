/**
 * [auth.ts] — Contrato/tipos ÚNICO do serviço de autenticação (família +
 *   operador): a UI de login não conhece o provedor.
 *
 * PAPEL: backend (contrato/tipos — sem lógica de runtime)
 * POR QUE EXISTE: dar UM contrato de auth que app e admin compartilham; o
 *   tipo da sessão separa família de operador sem a UI saber qual BaaS há atrás.
 * ENTRA: (só tipos) CredenciaisLogin {email, senha}; nada em runtime.
 * SAI: interfaces SessaoAuth/CredenciaisLogin/ServicoAuth + constantes de erro
 *   neutro (ERRO_LOGIN_NEUTRO, ERRO_CRIAR_CONTA).
 * CHAMA: nada (arquivo só de tipos/constantes).
 * É CHAMADO POR: backend.ts, adaptadores/auth_supabase.ts,
 *   tenant.ts, backend.test.ts.
 * RODA POR: boot do app/admin (bundle); cliente das Edge Functions.
 * CUIDADO: sessaoAtual() é SÍNCRONO por contrato (o boot não espera rede — os
 *   adaptadores espelham a sessão em storage e renovam token em background).
 *   Erros de login/cadastro são NEUTROS de propósito: nunca revelam se
 *   e-mail/conta existe. Métodos criar/recuperar/alterar são aditivo-opcionais
 *   (adaptadores antigos seguem válidos).
 *
 * — detalhe preservado —
 * Pipoca — Tipos do serviço de autenticação (fase06-06-02)
 * ---------------------------------------------------------
 * Contrato ÚNICO de auth para família e operador (ipsis litteris do doc /
 * _contratos/tipos-core): a UI de login não conhece o provedor; o tipo da
 * sessão separa os dois mundos. `sessaoAtual()` é SÍNCRONO por contrato —
 * os adaptadores mantêm a sessão espelhada em storage e renovam tokens em
 * background (nunca no caminho do boot).
 */

export interface SessaoAuth {
  uid: string;
  tipo: "familia" | "superadmin";
  tenantId?: string;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
}

export interface ServicoAuth {
  entrarFamilia(cred: CredenciaisLogin): Promise<SessaoAuth>;
  entrarSuperAdmin(cred: CredenciaisLogin): Promise<SessaoAuth>;
  sair(): Promise<void>;
  sessaoAtual(): SessaoAuth | null;
  /**
   * Cadastro EXPLÍCITO da família (tela "Criar conta"). Aditivo-opcional no
   * contrato: adaptadores antigos seguem válidos. Devolve `null` quando a
   * conta foi criada mas aguarda confirmação de e-mail (sem sessão).
   */
  criarFamilia?(cred: CredenciaisLogin): Promise<SessaoAuth | null>;
  /**
   * Dispara o e-mail de redefinição de senha. SEMPRE resolve — nunca revela
   * se a conta existe (mesma postura neutra do login).
   */
  recuperarSenha?(email: string): Promise<void>;
  /** Define a nova senha usando o token do link de recuperação. */
  redefinirSenha?(tokenRecuperacao: string, novaSenha: string): Promise<void>;
  /** Troca a senha do cuidador LOGADO (bearer da sessão ativa). */
  alterarSenha?(novaSenha: string): Promise<void>;
  /**
   * Troca o e-mail da conta LOGADA. No GoTrue dispara confirmação ao novo
   * endereço — o e-mail só muda de fato após o clique.
   */
  alterarEmail?(novoEmail: string): Promise<void>;
  /**
   * Inicia o login com Google pelo provedor OAuth do backend (redireciona o
   * navegador ao consentimento). Aditivo-opcional. `redirecionarPara` é a URL
   * de retorno após o consentimento (default: origin + "/app").
   */
  entrarComGoogle?(redirecionarPara?: string): void;
  /**
   * No boot, se a URL traz o retorno do OAuth (tokens no fragmento), assenta a
   * sessão e resolve com ela (limpando o fragmento da URL); senão resolve null.
   */
  capturarRetornoOAuth?(): Promise<SessaoAuth | null>;
}

/** Erro neutro padrão de login (não distingue e-mail de senha — regra das fases 02/04). */
export const ERRO_LOGIN_NEUTRO = "Não foi possível entrar. Confira os dados e tente de novo.";

/** Erro neutro do cadastro (não revela se o e-mail já tem conta). */
export const ERRO_CRIAR_CONTA =
  "Não foi possível criar a conta. Confira o e-mail e use uma senha com pelo menos 6 caracteres.";
