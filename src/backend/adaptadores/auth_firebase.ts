/**
 * Pipoca — Auth Firebase (stub honesto) · doc fase06-06-02
 * ---------------------------------------------------------
 * Implementa a INTERFACE completa do ServicoAuth mas devolve erro limpo:
 * a paridade Supabase↔Firebase está documentada em
 * docs/plans/fase06_backend/PARIDADE.md e a lei do backend garante que a
 * implementação real é só trocar este adaptador (sem tocar telas/CORE).
 */

import { type CredenciaisLogin, type ServicoAuth, type SessaoAuth } from "../auth.js";

const NAO_CONFIGURADO = "Backend Firebase não configurado neste build (paridade documentada — fase06).";

export function criarAuthFirebase(): ServicoAuth {
  return {
    entrarFamilia(_cred: CredenciaisLogin): Promise<SessaoAuth> {
      return Promise.reject(new Error(NAO_CONFIGURADO));
    },
    entrarSuperAdmin(_cred: CredenciaisLogin): Promise<SessaoAuth> {
      return Promise.reject(new Error(NAO_CONFIGURADO));
    },
    sair(): Promise<void> {
      return Promise.resolve();
    },
    sessaoAtual(): SessaoAuth | null {
      return null;
    },
  };
}
