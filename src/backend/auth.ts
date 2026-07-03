/**
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
}

/** Erro neutro padrão de login (não distingue e-mail de senha — regra das fases 02/04). */
export const ERRO_LOGIN_NEUTRO = "Não foi possível entrar. Confira os dados e tente de novo.";

/** Erro neutro do cadastro (não revela se o e-mail já tem conta). */
export const ERRO_CRIAR_CONTA =
  "Não foi possível criar a conta. Confira o e-mail e use uma senha com pelo menos 6 caracteres.";
