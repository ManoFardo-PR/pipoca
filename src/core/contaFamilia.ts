/**
 * Pipoca — Conta e sessão da família (HH_LOGIN) · doc fase02-02-01
 * ----------------------------------------------------------------
 * Uma conta por casa. Tipos LOCAIS desta fase (não estão em tipos-core):
 *   ContaFamilia — identidade mínima da casa (sem PII além do necessário).
 *   SessaoConta  — sessão de conta persistida (distinta de `Sessao`, que é o bloco de foco).
 *
 * Autenticação aqui é STUB de MVP (valida formato, cria conta+sessão); a integração real
 * (provedor/servidor via `ServicoAuth`) é fase06. NUNCA guarda a senha. `agora` vem da borda.
 * Não toca motor/validador (login é anterior à narrativa — lei do contrato).
 */

export interface ContaFamilia {
  id: string;
  email: string;
  criadaEm: number;
}

export interface SessaoConta {
  contaId: string;
  autenticadaEm: number;
  expiraEm: number;
}

/** Duração padrão da sessão de conta: evita pedir senha toda vez que a criança vai ler. */
export const DURACAO_SESSAO_MS = 30 * 86_400_000; // 30 dias

export interface ResultadoLogin {
  ok: boolean;
  conta?: ContaFamilia;
  sessao?: SessaoConta;
  erro?: string;
}

/** Id opaco e determinístico a partir do e-mail (FNV-1a; não-cripto, MVP). */
function idDoEmail(email: string): string {
  const e = email.trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < e.length; i++) {
    h ^= e.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "fam_" + (h >>> 0).toString(16);
}

/** Cria uma SessaoConta a partir de `agora` (epoch ms da borda). */
export function criarSessao(contaId: string, agora: number, duracaoMs: number = DURACAO_SESSAO_MS): SessaoConta {
  return { contaId, autenticadaEm: agora, expiraEm: agora + duracaoMs };
}

/** A sessão de conta ainda é válida neste instante? */
export function sessaoValida(sessao: SessaoConta | null, agora: number): boolean {
  return !!sessao && typeof sessao.expiraEm === "number" && sessao.expiraEm > agora;
}

/**
 * Login da família (STUB MVP): valida e-mail/senha não-vazios e formato de e-mail,
 * cria `ContaFamilia` + `SessaoConta`. Mensagens acolhedoras (sem X vermelho).
 * Validação real de credencial é fase06 (`ServicoAuth`).
 */
export function entrarFamilia(
  email: string,
  senha: string,
  agora: number,
  duracaoMs: number = DURACAO_SESSAO_MS
): ResultadoLogin {
  const e = (email || "").trim();
  const s = (senha || "").trim();
  if (!e || !s) return { ok: false, erro: "Preencha e-mail e senha para entrar." };
  if (!/.+@.+\..+/.test(e)) return { ok: false, erro: "O e-mail parece incompleto. Confira, por favor." };
  const conta: ContaFamilia = { id: idDoEmail(e), email: e.toLowerCase(), criadaEm: agora };
  return { ok: true, conta, sessao: criarSessao(conta.id, agora, duracaoMs) };
}
