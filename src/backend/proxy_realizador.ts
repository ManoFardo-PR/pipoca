/**
 * [proxy_realizador.ts] — Cliente KEYLESS da Edge Function realizador (geração
 *   2): monta o prompt determinístico, manda {pacote, prompt} + o bearer; o
 *   servidor roda a CASCATA inteira e valida a fidelidade.
 *
 * PAPEL: backend (cliente keyless da edge realizador · geração 2)
 * POR QUE EXISTE: rodar a realização (LLM) da geração 2 no edge em UMA viagem,
 *   sem chave no cliente; o servidor escolhe provedor/modelo, checa cota e roda
 *   a cascata (fase12-12-04).
 * ENTRA: OpcoesProxyRealizador {url, anonKey, obterToken, tenantId?,
 *   transporte?}; em runtime: PacoteComposicao + OpcoesRealizar.
 * SAI: ResultadoRealizar (texto + parágrafos + veredito PASS + origem "llm") —
 *   ou throw.
 * CHAMA: core/compositor/pacote:PacoteComposicao, core/realizador/cascata
 *   (tipos), core/realizador/prompt_template:montarPromptRealizador,
 *   ia/provedor:transportePadrao.
 * É CHAMADO POR: backend.ts (criarBackendSupabase → realizador), backend.test.ts.
 * RODA POR: boot do app (bundle); cliente da Edge Function realizador.
 * CUIDADO: KEYLESS — manda APENAS o bearer do USUÁRIO + a anon key pública;
 *   NENHUMA chave de provedor vive aqui. O prompt é montado no cliente
 *   (montarPromptRealizador é determinístico e sem segredo), mas a VALIDAÇÃO de
 *   fidelidade roda no servidor. QUALQUER não-200 OU resposta fora do contrato
 *   (sem veredito PASS / origem≠llm) vira throw → o módulo de geração cai no
 *   fallback A+ v3 LOCAL (o fallback não depende do edge). NUNCA entregar texto
 *   sem PASS.
 *
 * — detalhe preservado —
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
