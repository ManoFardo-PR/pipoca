/**
 * Pipoca — ProxyRealizador (cliente) · fase13-13-03
 * --------------------------------------------------
 * Cliente KEYLESS da Edge Function `realizador` (irmã do `proxy-ia`): as
 * chaves dos provedores vivem SÓ no ambiente da função; daqui vai apenas o
 * bearer do usuário + {pacote, prompt}. O SERVIDOR decide provedor/modelo
 * pela `config_ia` do tenant, verifica cota ANTES e roda a CASCATA inteira
 * (fase12-12-04) do lado de lá — o cliente faz UMA viagem por realização.
 *
 * O prompt é montado AQUI (montarPromptRealizador é determinístico, 100%
 * derivado do Pacote e sem segredo — mesmo precedente do proxy-ia, em que o
 * cliente manda o prompt); a VALIDAÇÃO de fidelidade roda no servidor
 * (espelho compacto do canônico, padrão guardrails-lite do proxy-ia).
 *
 * QUALQUER não-200 vira throw: o módulo de geração cai no fallback A+ v3
 * LOCAL (o fallback não depende do edge — 13-03) — a criança nunca vê erro.
 */

import type { PacoteComposicao } from "../core/compositor/pacote.js";
import type { OpcoesRealizar, ResultadoRealizar } from "../core/realizador/cascata.js";
import { montarPromptRealizador } from "../core/realizador/prompt_template.js";
import { transportePadrao, type Transporte } from "../ia/provedor.js";

export type RealizadorRemoto = (
  pacote: PacoteComposicao,
  opcoes?: OpcoesRealizar
) => Promise<ResultadoRealizar>;

export interface OpcoesProxyRealizador {
  url: string; // base do projeto (a função vive em /functions/v1/realizador)
  anonKey: string;
  obterToken: () => Promise<string | null>;
  tenantId?: () => string | null;
  transporte?: Transporte;
}

export function criarProxyRealizador(op: OpcoesProxyRealizador): RealizadorRemoto {
  const transporte = op.transporte || transportePadrao();
  const base = op.url.replace(/\/+$/, "");

  return async (pacote: PacoteComposicao, opcoes: OpcoesRealizar = {}): Promise<ResultadoRealizar> => {
    const token = await op.obterToken();
    if (!token) throw new Error("ProxyRealizador: sem sessão para realizar.");
    const tenant = op.tenantId ? op.tenantId() : null;
    const prompt = montarPromptRealizador(pacote);
    const resp = await transporte(base + "/functions/v1/realizador", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: op.anonKey,
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        pacote,
        prompt,
        ...(opcoes.temperatura !== undefined ? { temperatura: opcoes.temperatura } : {}),
        ...(tenant ? { tenantId: tenant } : {}),
      }),
    });
    if (resp.status !== 200) {
      throw new Error("ProxyRealizador: HTTP " + resp.status + " — fallback A+ v3 local.");
    }
    const j = (await resp.json()) as ResultadoRealizar;
    if (
      !j || typeof j.texto !== "string" || j.texto.trim() === "" ||
      !Array.isArray(j.paragrafos) || !j.veredito || j.veredito.pass !== true ||
      !j.origem || j.origem.fonte !== "llm"
    ) {
      // Contrato quebrado ou texto sem PASS: NUNCA entregar — cai no fallback local.
      throw new Error("ProxyRealizador: resposta fora do contrato do realizador.");
    }
    return j;
  };
}
