/**
 * [auth_firebase.ts] — Adaptador ServicoAuth do Firebase: stub honesto que
 *   implementa a interface completa mas rejeita com erro limpo.
 *
 * PAPEL: backend (adaptador auth · stub honesto / paridade documentada)
 * POR QUE EXISTE: provar que trocar de BaaS = trocar adaptador; a implementação
 *   real é só preencher este stub, sem tocar telas/CORE.
 * ENTRA: CredenciaisLogin (rejeitadas).
 * SAI: ServicoAuth cujos métodos rejeitam com NAO_CONFIGURADO (sessaoAtual →
 *   null; sair → resolve).
 * CHAMA: auth.ts (tipos ServicoAuth/SessaoAuth/CredenciaisLogin).
 * É CHAMADO POR: backend.ts (criarBackendFirebase), backend.test.ts.
 * RODA POR: boot do app/admin (bundle) quando provedor="firebase".
 * CUIDADO: stub — paridade documentada em docs/plans/fase06_backend/PARIDADE.md;
 *   não configurado neste build.
 *
 * — detalhe preservado —
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
