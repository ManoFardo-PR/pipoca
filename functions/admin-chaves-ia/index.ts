/**
 * [admin-chaves-ia/index.ts] — Edge Function admin-chaves-ia: gestão
 *   write-only das chaves dos provedores de IA (painel do operador
 *   SA_IA_GLOBAL); a resposta é SEMPRE mascarada.
 *
 * PAPEL: edge (admin — gestão write-only das chaves; resposta mascarada)
 * POR QUE EXISTE: deixar o operador cadastrar/testar as chaves pagas sem
 *   nunca expô-las — a chave entra por aqui e vive na tabela chaves_ia
 *   (deny-all p/ clientes, só service role); o painel só recebe status
 *   mascarado.
 * ENTRA: POST JSON { acao, provedor?, chave?, modelo?, fonte? } + header
 *   Authorization: Bearer <JWT> (verify_jwt). acao ∈ {status, salvar, testar,
 *   testar_geracao}. Secrets do ambiente:
 *   ANTHROPIC_API_KEY/OPENAI_API_KEY/GEMINI_API_KEY/DEEPSEEK_API_KEY (fonte
 *   "ambiente"), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Lê operadores e
 *   chaves_ia.
 * SAI: 200 status→{provedores:StatusChave[]}, salvar→{provedor:StatusChave}
 *   (upsert), testar→{ok:boolean} (ping real no provedor); ou não-200 {erro}:
 *   401 nao_autenticado, 403 nao_autorizado, 400 requisicao_invalida,
 *   503 nao_configurado, 405 metodo_invalido.
 * CHAMA: nada do repo — self-contained (Deno). APIs externas (ping "testar"):
 *   Anthropic/OpenAI/DeepSeek/Gemini (endpoint /models); PostgREST do Supabase
 *   (service role).
 * É CHAMADO POR: src/backend/espelho_admin.ts (POST em
 *   /functions/v1/admin-chaves-ia).
 * RODA POR: Supabase Edge Function (Deno), deploy na plataforma; acionada
 *   pelos clientes em src/backend/.
 * CUIDADO: AS CHAVES DOS PROVEDORES VIVEM SÓ AQUI (secrets do ambiente:
 *   ANTHROPIC_API_KEY/OPENAI_API_KEY/GEMINI_API_KEY/DEEPSEEK_API_KEY, lidas
 *   via Deno.env.get; e a tabela chaves_ia, gravada pela ação "salvar"). A
 *   CHAVE NUNCA VOLTA AO CLIENTE: toda resposta é mascarada ("****ab12"), é
 *   write-only. Gate duplo fail-closed: verify_jwt + uid PRECISA estar em
 *   `operadores` (usuário comum não vê nem status). Fica fora de src/ — não
 *   entra no tsc do app.
 *
 * — detalhe preservado —
 * Pipoca — AdminChavesIA (Supabase Edge Function) · tarefa #31
 * --------------------------------------------------------------
 * Gestão server-side das CHAVES dos provedores de IA para o painel do
 * operador (SA_IA_GLOBAL). A chave entra por aqui (write-only) e vive na
 * tabela `chaves_ia` (deny-all p/ clientes — só service role). A resposta
 * NUNCA contém a chave: apenas status mascarado ("****ab12").
 *
 * Gate duplo: verify_jwt (plataforma) + uid PRECISA estar em `operadores`
 * (mesmo gate SECURITY DEFINER do RLS, checado via service role).
 *
 * Ações (POST JSON {acao,...}):
 *   {acao:"status"}                     → { provedores: StatusChaveIa[] }
 *   {acao:"salvar", provedor, chave}    → { provedor: StatusChaveIa }  (upsert)
 *   {acao:"testar", provedor}           → { ok: boolean }              (ping real)
 *   {acao:"testar_geracao", provedor, modelo, fonte?} → { ok, status, motivo,
 *     detalhe, fonte } — geração MÍNIMA real (frações de centavo); motivo ∈
 *     {chave_invalida, sem_saldo, modelo_indisponivel, rate_limit, erro_api,
 *     resposta_vazia, rede, sem_chave}; fonte "ambiente" (default, a mesma da
 *     realizador) | "banco" (tabela chaves_ia).
 *
 * Erros (JSON {erro}): 401 nao_autenticado · 403 nao_autorizado ·
 * 400 requisicao_invalida · 503 nao_configurado. Self-contained (Deno),
 * fora de src/ — não entra no tsc do app (disciplina das edges).
 */

declare const Deno: {
  env: { get(nome: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}

function cabecalhosServico(chave: string): Record<string, string> {
  return { apikey: chave, Authorization: "Bearer " + chave, "content-type": "application/json" };
}

// A ASSINATURA é validada pela plataforma (deploy com verify_jwt, como o
// nas demais edges). Aqui, defesa em profundidade: token expirado é recusado mesmo
// que a checagem da borda falhe em alguma configuração.
function uidDoJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const d = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof d.exp === "number" && d.exp * 1000 < Date.now()) return null;
    return typeof d.sub === "string" && d.sub ? d.sub : null;
  } catch {
    return null;
  }
}

const PROVEDORES = ["claude", "gemini", "openai", "deepseek"] as const;
type Provedor = (typeof PROVEDORES)[number];

const SECRET_POR_PROVEDOR: Record<Provedor, string> = {
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function ehProvedor(p: unknown): p is Provedor {
  return typeof p === "string" && (PROVEDORES as readonly string[]).indexOf(p) >= 0;
}

/** "****" + últimos 4 — NUNCA a chave inteira sai daqui. */
function mascarar(chave: string): string {
  return "****" + chave.slice(-4);
}

async function ehOperador(url: string, srk: string, uid: string): Promise<boolean> {
  try {
    const r = await fetch(url + "/rest/v1/operadores?select=uid&uid=eq." + encodeURIComponent(uid), {
      headers: cabecalhosServico(srk),
    });
    if (!r.ok) return false;
    const linhas = (await r.json()) as unknown[];
    return Array.isArray(linhas) && linhas.length > 0;
  } catch {
    return false;
  }
}

async function lerChavesBanco(url: string, srk: string): Promise<Record<string, string>> {
  try {
    const r = await fetch(url + "/rest/v1/chaves_ia?select=provedor,chave", { headers: cabecalhosServico(srk) });
    if (!r.ok) return {};
    const linhas = (await r.json()) as Array<{ provedor?: string; chave?: string }>;
    const mapa: Record<string, string> = {};
    for (const l of linhas) {
      if (l && typeof l.provedor === "string" && typeof l.chave === "string" && l.chave) mapa[l.provedor] = l.chave;
    }
    return mapa;
  } catch {
    return {};
  }
}

interface StatusChave {
  provedor: Provedor;
  configurada: boolean;
  mascarada: string | null;
  fonte: "banco" | "ambiente" | null;
}

function statusDe(provedor: Provedor, banco: Record<string, string>): StatusChave {
  const doBanco = banco[provedor];
  if (doBanco) return { provedor, configurada: true, mascarada: mascarar(doBanco), fonte: "banco" };
  const doAmbiente = Deno.env.get(SECRET_POR_PROVEDOR[provedor]);
  if (doAmbiente) return { provedor, configurada: true, mascarada: mascarar(doAmbiente), fonte: "ambiente" };
  return { provedor, configurada: false, mascarada: null, fonte: null };
}

/** Ping barato e real no provedor (lista de modelos) — roda SÓ no servidor. */
async function testarProvedor(provedor: Provedor, chave: string): Promise<boolean> {
  try {
    if (provedor === "claude") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": chave, "anthropic-version": "2023-06-01" },
      });
      return r.ok;
    }
    if (provedor === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + chave } });
      return r.ok;
    }
    if (provedor === "deepseek") {
      const r = await fetch("https://api.deepseek.com/models", { headers: { Authorization: "Bearer " + chave } });
      return r.ok;
    }
    if (provedor === "gemini") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": chave },
      });
      return r.ok;
    }
  } catch {
    return false;
  }
  return false;
}

/** Trecho curto do corpo de erro — só para diagnóstico; nunca contém a chave. */
async function trechoErro(r: Response): Promise<string> {
  try { return (await r.text()).slice(0, 200); } catch { return ""; }
}

interface ResultadoGeracao {
  ok: boolean;
  status: number | null;
  /** chave_invalida | sem_saldo | modelo_indisponivel | rate_limit | erro_api | resposta_vazia | rede */
  motivo: string | null;
  detalhe: string | null;
}

function classificar(status: number): string {
  if (status === 401 || status === 403) return "chave_invalida";
  if (status === 402) return "sem_saldo";
  if (status === 404) return "modelo_indisponivel";
  if (status === 429) return "rate_limit";
  return "erro_api";
}

/**
 * Geração MÍNIMA real (custa frações de centavo): prova que provedor+modelo+
 * chave+saldo funcionam de ponta a ponta — o que o ping /models não cobre
 * (um 402/404 só aparece na geração). Prompt fixo e inofensivo.
 */
async function testarGeracao(provedor: Provedor, modelo: string, chave: string): Promise<ResultadoGeracao> {
  const pedido = "Responda apenas: OK";
  try {
    let r: Response;
    if (provedor === "gemini") {
      r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: pedido }] }], generationConfig: { maxOutputTokens: 200 } }),
      });
    } else if (provedor === "claude") {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: modelo, max_tokens: 10, messages: [{ role: "user", content: pedido }] }),
      });
    } else {
      const url = provedor === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
      r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + chave },
        body: JSON.stringify({ model: modelo, max_completion_tokens: 10, messages: [{ role: "user", content: pedido }] }),
      });
    }
    if (!r.ok) return { ok: false, status: r.status, motivo: classificar(r.status), detalhe: await trechoErro(r) };
    const j = await r.json().catch(() => null);
    const temTexto = !!j && JSON.stringify(j).length > 2;
    return temTexto
      ? { ok: true, status: r.status, motivo: null, detalhe: null }
      : { ok: false, status: r.status, motivo: "resposta_vazia", detalhe: null };
  } catch (e) {
    return { ok: false, status: null, motivo: "rede", detalhe: String(e).slice(0, 120) };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405);

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const uid = uidDoJwt(jwt);
  if (!uid) return json({ erro: "nao_autenticado" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ erro: "nao_configurado" }, 503);

  // gate de OPERADOR (fail-closed): usuário comum não enxerga nem status
  if (!(await ehOperador(SUPABASE_URL, SERVICE_KEY, uid))) return json({ erro: "nao_autorizado" }, 403);

  const corpo = (await req.json().catch(() => null)) as {
    acao?: string;
    provedor?: string;
    chave?: string;
  } | null;
  if (!corpo || typeof corpo.acao !== "string") return json({ erro: "requisicao_invalida" }, 400);

  if (corpo.acao === "status") {
    const banco = await lerChavesBanco(SUPABASE_URL, SERVICE_KEY);
    return json({ provedores: PROVEDORES.map((p) => statusDe(p, banco)) }, 200);
  }

  if (corpo.acao === "salvar") {
    if (!ehProvedor(corpo.provedor)) return json({ erro: "requisicao_invalida" }, 400);
    const chave = typeof corpo.chave === "string" ? corpo.chave.trim() : "";
    if (chave.length < 8 || chave.length > 512 || /\s/.test(chave)) return json({ erro: "requisicao_invalida" }, 400);
    try {
      const r = await fetch(SUPABASE_URL + "/rest/v1/chaves_ia?on_conflict=provedor", {
        method: "POST",
        headers: { ...cabecalhosServico(SERVICE_KEY), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{ provedor: corpo.provedor, chave, atualizado_em: new Date().toISOString() }]),
      });
      if (!(r.status >= 200 && r.status < 300)) return json({ erro: "nao_configurado" }, 503);
    } catch {
      return json({ erro: "nao_configurado" }, 503);
    }
    // resposta SEMPRE mascarada — a chave nunca volta ao cliente
    return json({ provedor: { provedor: corpo.provedor, configurada: true, mascarada: mascarar(chave), fonte: "banco" } }, 200);
  }

  if (corpo.acao === "testar") {
    if (!ehProvedor(corpo.provedor)) return json({ erro: "requisicao_invalida" }, 400);
    const banco = await lerChavesBanco(SUPABASE_URL, SERVICE_KEY);
    const chave = banco[corpo.provedor] || Deno.env.get(SECRET_POR_PROVEDOR[corpo.provedor]) || "";
    if (!chave) return json({ ok: false, motivo: "sem_chave" }, 200);
    const ok = await testarProvedor(corpo.provedor, chave);
    return json({ ok }, 200);
  }

  // Diagnóstico completo (pós-plan): geração MÍNIMA real com o provedor+modelo
  // pedidos — revela o que o ping não vê (402 sem saldo, 404 modelo). `fonte`
  // opcional: "ambiente" (default — a MESMA fonte da edge realizador) | "banco".
  if (corpo.acao === "testar_geracao") {
    const c = corpo as { provedor?: string; modelo?: string; fonte?: string };
    if (!ehProvedor(c.provedor) || typeof c.modelo !== "string" || !c.modelo.trim()) {
      return json({ erro: "requisicao_invalida" }, 400);
    }
    let chave = "";
    let fonteUsada: "ambiente" | "banco" | null = null;
    if (c.fonte === "banco") {
      const banco = await lerChavesBanco(SUPABASE_URL, SERVICE_KEY);
      chave = banco[c.provedor] || "";
      fonteUsada = chave ? "banco" : null;
    } else {
      chave = Deno.env.get(SECRET_POR_PROVEDOR[c.provedor]) || "";
      fonteUsada = chave ? "ambiente" : null;
    }
    if (!chave) return json({ ok: false, motivo: "sem_chave", fonte: c.fonte === "banco" ? "banco" : "ambiente" }, 200);
    const resultado = await testarGeracao(c.provedor, c.modelo.trim(), chave);
    return json({ provedor: c.provedor, modelo: c.modelo.trim(), fonte: fonteUsada, ...resultado }, 200);
  }

  return json({ erro: "requisicao_invalida" }, 400);
});
