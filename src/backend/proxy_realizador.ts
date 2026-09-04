/**
 * [proxy_realizador.ts] — Cliente KEYLESS da Edge Function realizador (geração
 *   2): manda {pacote, tenantId?} + o bearer; o SERVIDOR monta o prompt a
 *   partir do pacote (E3), roda a CASCATA inteira e valida a fidelidade.
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
 *   (tipos), ia/provedor:transportePadrao.
 * É CHAMADO POR: backend.ts (criarBackendSupabase → realizador), backend.test.ts.
 * RODA POR: boot do app (bundle); cliente da Edge Function realizador.
 * CUIDADO: KEYLESS — manda APENAS o bearer do USUÁRIO + a anon key pública;
 *   NENHUMA chave de provedor vive aqui. E3 (Plan03): o prompt NÃO viaja mais —
 *   a edge o monta do pacote (espelho verificado de prompt_template.ts, que
 *   segue canônico para fallback/testes); temperatura também é decisão do
 *   servidor. QUALQUER não-200 OU resposta fora do contrato (sem veredito
 *   PASS / origem≠llm) vira throw → o módulo de geração cai no fallback A+ v3
 *   LOCAL (o fallback não depende do edge). NUNCA entregar texto sem PASS.
 *
 * — detalhe preservado —
 * Pipoca — ProxyRealizador (cliente) · fase13-13-03
 * --------------------------------------------------
 * Cliente KEYLESS da Edge Function `realizador`: as chaves dos provedores
 * vivem SÓ no ambiente da função; daqui vai apenas o bearer do usuário +
 * {pacote, tenantId?}. O SERVIDOR decide provedor/modelo pela `config_ia`
 * do tenant, verifica cota ANTES, MONTA O PROMPT do pacote (E3 — uma fonte
 * de verdade, sem prompt arbitrário do cliente) e roda a CASCATA inteira
 * (fase12-12-04) do lado de lá — o cliente faz UMA viagem por realização.
 *
 * QUALQUER não-200 vira throw: o módulo de geração cai no fallback A+ v3
 * LOCAL (o fallback não depende do edge — 13-03) — a criança nunca vê erro.
 */

import type { PacoteComposicao } from "../core/compositor/pacote.js";
import type { OpcoesRealizar, ResultadoRealizar } from "../core/realizador/cascata.js";
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

  return async (pacote: PacoteComposicao, _opcoes: OpcoesRealizar = {}): Promise<ResultadoRealizar> => {
    const token = await op.obterToken();
    if (!token) throw new Error("ProxyRealizador: sem sessão para realizar.");
    const tenant = op.tenantId ? op.tenantId() : null;
    // E3: o corpo é SÓ {pacote, tenantId?} — o prompt e a temperatura são do
    // servidor (a edge monta o prompt do pacote; espelho verificado do template).
    const resp = await transporte(base + "/functions/v1/realizador", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: op.anonKey,
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        pacote,
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
