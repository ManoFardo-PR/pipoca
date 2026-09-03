/**
 * [tipos.ts] — Contratos do backend que precisam viver fora da fachada:
 *   hoje só ProxyIA (doc 06-05).
 *
 * PAPEL: backend (tipos)
 * POR QUE EXISTE: D3 (Plan03) — desfazer o ciclo type-only backend.ts ↔
 *   proxy_ia.ts (a fachada importava criarProxyIA e o proxy importava a
 *   interface da fachada). O contrato vive aqui; backend.ts re-exporta.
 * ENTRA/SAI: só tipos (zero runtime).
 * É CHAMADO POR: backend.ts (re-export), proxy_ia.ts e consumidores do contrato.
 */

import type { Trecho } from "../core/grafo/tipos.js";

/** Contrato do doc 06-05 (ipsis litteris) — o cliente concreto chega na etapa do proxy. */
export interface ProxyIA {
  gerar(req: { prompt: string; schema: object; opts?: object }): Promise<Trecho>;
}
