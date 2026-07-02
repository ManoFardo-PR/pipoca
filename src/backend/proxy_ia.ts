/**
 * Pipoca — ProxyIA (cliente) · doc fase06-06-05
 * ----------------------------------------------
 * Cliente da Edge Function `proxy-ia`: as chaves dos provedores vivem SÓ
 * no ambiente da função (secrets); daqui vai apenas o bearer do usuário +
 * o pedido {prompt, schema, opts}. O SERVIDOR decide provedor/modelo pela
 * `config_ia` do tenant (o cliente não escolhe — senão contornaria
 * cota/config) e verifica cota/custo ANTES de chamar.
 *
 * QUALQUER não-200 vira throw: o orquestrador degrada para o provedor
 * simulado → Motor A — a criança nunca vê erro.
 */

import type { Trecho } from "../core/grafo/tipos.js";
import type { JsonSchema, OptsGeracao, ProvedorIA, Transporte } from "../ia/provedor.js";
import { transportePadrao, validarTrechoGerado } from "../ia/provedor.js";
import type { ProxyIA } from "./backend.js";

export interface OpcoesProxyIA {
  url: string; // base do projeto (a função vive em /functions/v1/proxy-ia)
  anonKey: string;
  obterToken: () => Promise<string | null>;
  tenantId?: () => string | null;
  transporte?: Transporte;
}

export function criarProxyIA(op: OpcoesProxyIA): ProxyIA {
  const transporte = op.transporte || transportePadrao();
  const base = op.url.replace(/\/+$/, "");

  return {
    async gerar(req: { prompt: string; schema: object; opts?: object }): Promise<Trecho> {
      const token = await op.obterToken();
      if (!token) throw new Error("ProxyIA: sem sessão para gerar.");
      const tenant = op.tenantId ? op.tenantId() : null;
      const resp = await transporte(base + "/functions/v1/proxy-ia", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: op.anonKey,
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ ...req, ...(tenant ? { tenantId: tenant } : {}) }),
      });
      if (resp.status !== 200) {
        throw new Error("ProxyIA: HTTP " + resp.status + " — degradando para o provedor local.");
      }
      return validarTrechoGerado(await resp.json());
    },
  };
}

/** Encaixa o ProxyIA onde qualquer ProvedorIA encaixa (orquestrador/Motor B). */
export function provedorViaProxy(proxy: ProxyIA): ProvedorIA {
  return {
    gerar(prompt: string, schema: JsonSchema, opts?: OptsGeracao): Promise<Trecho> {
      return proxy.gerar({ prompt, schema, ...(opts ? { opts } : {}) });
    },
  };
}
