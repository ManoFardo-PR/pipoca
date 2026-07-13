// Pipoca — ProxyIA (Supabase Edge Function) · doc fase06-06-05
// --------------------------------------------------------------
// AS CHAVES DOS PROVEDORES VIVEM SÓ AQUI (secrets do ambiente da função):
//   ANTHROPIC_API_KEY · OPENAI_API_KEY · GEMINI_API_KEY · DEEPSEEK_API_KEY
// Deploy com verify_jwt: a plataforma rejeita requisições sem bearer válido.
//
// O SERVIDOR decide provedor/modelo pela config_ia do tenant (o cliente não
// escolhe — senão contornaria cota/config) e verifica cota/custo em uso_ia
// ANTES de chamar (05-10). Guardrails-lite de entrada/saída — espelho
// compacto do CANÔNICO src/ia/guardrails.ts (defesa em profundidade: o
// cliente também filtra). Self-contained: nada importado do repo (Deno);
// fica FORA de src/ para não entrar no tsc do app.
//
// Erros (JSON {erro}): 401 sem usuário · 400 requisição inválida ·
// 503 nao_configurado (sem config/chave) · 403 cota_excedida ·
// 422 conteudo_bloqueado · 502 provedor_falhou. O cliente converte
// QUALQUER não-200 em degradação para o simulado → Motor A.

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

// ── guardrails-lite (espelho de src/ia/guardrails.ts — o canônico é o do repo) ──
const RE_TERMOS = new RegExp(
  "\\b(?:matar|morrer|morte|mortes|sangue|armas?|tiros?|facadas?|terror|pavor|pesadelos?|demonios?|cervejas?|vodka|cigarros?|drogas?|sexo|nudez|apostas?)\\b|\\b(?:assassin|violenc)"
);
const RE_URL = /https?:\/\/|www\./i;
const RE_EMAIL = /\S+@\S+\.\S+/;
const RE_TELEFONE = /\b\d{4,5}[-\s]\d{4}\b|\d{8,}/;

function bloqueado(texto: string): boolean {
  if (!texto || texto.trim() === "") return true;
  if (texto.length > 4000) return true;
  if (RE_URL.test(texto) || RE_EMAIL.test(texto) || RE_TELEFONE.test(texto)) return true;
  const norm = texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return RE_TERMOS.test(norm);
}

// ── infra: PostgREST com service role (config_ia / uso_ia são deny-all p/ cliente) ──
function cabecalhosServico(chave: string): Record<string, string> {
  return { apikey: chave, Authorization: "Bearer " + chave, "content-type": "application/json" };
}

interface ConfigIa {
  provedor: string | null;
  modelo: string | null;
  cotaMensal: number;
  custoMaxMensal: number;
  fallback: string | null;
}

async function lerConfigIa(url: string, chave: string, tenant: string): Promise<ConfigIa | null> {
  try {
    const r = await fetch(url + "/rest/v1/config_ia?select=dados&tenant_id=eq." + encodeURIComponent(tenant), {
      headers: cabecalhosServico(chave),
    });
    if (!r.ok) return null;
    const linhas = (await r.json()) as Array<{ dados?: ConfigIa }>;
    return linhas && linhas[0] && linhas[0].dados ? linhas[0].dados : null;
  } catch {
    return null;
  }
}

// ── config GLOBAL (tarefa #31): linha reservada 'plataforma:global' em config_ia ──
// dados = ConfigIaGlobal { modeloPadrao: provedor→modelo|null, cadeiaFallback: provedor[] }
interface ConfigIaGlobal {
  modeloPadrao: Record<string, string | null>;
  cadeiaFallback: string[];
}

const GLOBAL_VAZIA: ConfigIaGlobal = { modeloPadrao: {}, cadeiaFallback: [] };

async function lerConfigIaGlobal(url: string, chave: string): Promise<ConfigIaGlobal> {
  try {
    const r = await fetch(url + "/rest/v1/config_ia?select=dados&tenant_id=eq." + encodeURIComponent("plataforma:global"), {
      headers: cabecalhosServico(chave),
    });
    if (!r.ok) return GLOBAL_VAZIA;
    const linhas = (await r.json()) as Array<{ dados?: Partial<ConfigIaGlobal> }>;
    const d = linhas && linhas[0] && linhas[0].dados;
    if (!d || typeof d !== "object") return GLOBAL_VAZIA;
    return {
      modeloPadrao: d.modeloPadrao && typeof d.modeloPadrao === "object" ? d.modeloPadrao : {},
      cadeiaFallback: Array.isArray(d.cadeiaFallback) ? d.cadeiaFallback.filter((p) => typeof p === "string") : [],
    };
  } catch {
    return GLOBAL_VAZIA;
  }
}

// ── chaves dos provedores: tabela `chaves_ia` (deny-all) primeiro; env vars como fallback ──
async function lerChavesBanco(url: string, chave: string): Promise<Record<string, string>> {
  try {
    const r = await fetch(url + "/rest/v1/chaves_ia?select=provedor,chave", { headers: cabecalhosServico(chave) });
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

async function lerUso(url: string, chave: string, tenant: string, mes: string): Promise<{ chamadas: number; custo: number }> {
  try {
    const r = await fetch(
      url + "/rest/v1/uso_ia?select=chamadas,custo&tenant_id=eq." + encodeURIComponent(tenant) + "&mes=eq." + mes,
      { headers: cabecalhosServico(chave) }
    );
    if (!r.ok) return { chamadas: 0, custo: 0 };
    const linhas = (await r.json()) as Array<{ chamadas?: number; custo?: number }>;
    const l = linhas && linhas[0];
    return { chamadas: (l && l.chamadas) || 0, custo: Number((l && l.custo) || 0) };
  } catch {
    return { chamadas: 0, custo: 0 };
  }
}

async function registrarUso(url: string, chave: string, tenant: string, mes: string, chamadas: number, custo: number): Promise<void> {
  try {
    await fetch(url + "/rest/v1/uso_ia?on_conflict=tenant_id,mes", {
      method: "POST",
      headers: { ...cabecalhosServico(chave), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ tenant_id: tenant, mes, chamadas, custo }]),
    });
  } catch {
    /* telemetria de uso nunca derruba a geração */
  }
}

function uidDoJwt(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const decodificado = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decodificado.sub === "string" && decodificado.sub ? decodificado.sub : null;
  } catch {
    return null;
  }
}

// ── provedores (4) — chaves só do ambiente; modelo default barato por provedor ──
const MODELO_PADRAO: Record<string, string> = {
  claude: "claude-haiku-4-5",
  openai: "gpt-5.4-mini",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-chat",
};
const SECRET_POR_PROVEDOR: Record<string, string> = {
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

interface Trecho {
  texto: string;
  ehFinal: boolean;
}

type ResultadoGeracao = { ok: true; trecho: Trecho } | { ok: false; semChave?: boolean };

function parseTrecho(textoJson: string): Trecho | null {
  try {
    const t = JSON.parse(textoJson);
    if (t && typeof t.texto === "string" && t.texto.trim() && typeof t.ehFinal === "boolean") {
      return { texto: t.texto, ehFinal: t.ehFinal };
    }
  } catch {
    /* fora do formato */
  }
  return null;
}

async function gerarCom(
  provedor: string,
  modelo: string | null,
  prompt: string,
  schema: unknown,
  opts: { system?: string; maxTokens?: number },
  chavesBanco: Record<string, string>
): Promise<ResultadoGeracao> {
  // tarefa #31: chave do banco (admin-chaves-ia) primeiro; env var como fallback
  const nomeSecret = SECRET_POR_PROVEDOR[provedor];
  const chave = chavesBanco[provedor] || (nomeSecret ? Deno.env.get(nomeSecret) : undefined);
  if (!chave) return { ok: false, semChave: true };
  const m = modelo || MODELO_PADRAO[provedor] || "";
  const maxTokens = opts.maxTokens || 400;
  const system = opts.system || "";

  try {
    if (provedor === "claude") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: m,
          max_tokens: maxTokens,
          thinking: { type: "adaptive" },
          output_config: { format: { type: "json_schema", schema } },
          ...(system ? { system } : {}),
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) return { ok: false };
      const j = await r.json();
      if (j.stop_reason === "refusal") return { ok: false };
      const bloco = Array.isArray(j.content) ? j.content.find((c: { type?: string }) => c && c.type === "text") : null;
      const t = bloco && typeof bloco.text === "string" ? parseTrecho(bloco.text) : null;
      return t ? { ok: true, trecho: t } : { ok: false };
    }

    if (provedor === "openai" || provedor === "deepseek") {
      const url = provedor === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
      const formato =
        provedor === "openai"
          ? { type: "json_schema", json_schema: { name: "trecho", strict: true, schema } }
          : { type: "json_object" }; // DeepSeek: só JSON mode
      const sistema =
        provedor === "deepseek"
          ? system + '\nResponda SOMENTE com um objeto json válido: { "texto": string, "ehFinal": boolean }.'
          : system;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + chave },
        body: JSON.stringify({
          model: m,
          max_completion_tokens: maxTokens,
          messages: [...(sistema ? [{ role: "system", content: sistema }] : []), { role: "user", content: prompt }],
          response_format: formato,
        }),
      });
      if (!r.ok) return { ok: false };
      const j = await r.json();
      const msg = j.choices && j.choices[0] ? j.choices[0].message : null;
      if (msg && typeof msg.refusal === "string" && msg.refusal) return { ok: false };
      const t = msg && typeof msg.content === "string" ? parseTrecho(msg.content) : null;
      return t ? { ok: true, trecho: t } : { ok: false };
    }

    if (provedor === "gemini") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema },
        }),
      });
      if (!r.ok) return { ok: false };
      const j = await r.json();
      if (j.promptFeedback && j.promptFeedback.blockReason) return { ok: false };
      const cand = j.candidates && j.candidates[0];
      if (cand && cand.finishReason === "SAFETY") return { ok: false };
      const parte = cand && cand.content && cand.content.parts && cand.content.parts[0];
      const t = parte && typeof parte.text === "string" ? parseTrecho(parte.text) : null;
      return t ? { ok: true, trecho: t } : { ok: false };
    }
  } catch {
    return { ok: false };
  }
  return { ok: false, semChave: true }; // provedor desconhecido = não configurado
}

const SCHEMA_TRECHO = {
  type: "object",
  properties: { texto: { type: "string" }, ehFinal: { type: "boolean" } },
  required: ["texto", "ehFinal"],
  additionalProperties: false,
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405);

  // usuário do JWT (assinatura já validada pela plataforma — verify_jwt)
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const uid = uidDoJwt(jwt);
  if (!uid) return json({ erro: "nao_autenticado" }, 401);

  const corpo = (await req.json().catch(() => null)) as {
    prompt?: string;
    schema?: unknown;
    opts?: { system?: string; maxTokens?: number };
    tenantId?: string;
  } | null;
  if (!corpo || typeof corpo.prompt !== "string" || !corpo.prompt.trim()) {
    return json({ erro: "requisicao_invalida" }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ erro: "nao_configurado" }, 503);

  // o servidor decide tudo pela config do tenant — o cliente NÃO escolhe provedor
  const tenant = (typeof corpo.tenantId === "string" && corpo.tenantId) || "familia:" + uid;
  const config = await lerConfigIa(SUPABASE_URL, SERVICE_KEY, tenant);
  const configEfetiva = config || (await lerConfigIa(SUPABASE_URL, SERVICE_KEY, "plataforma"));
  if (!configEfetiva) return json({ erro: "nao_configurado" }, 503);

  // tarefa #31 · herança do GLOBAL: tenant > global > nao_configurado.
  // Provedor: o do tenant; senão o 1º da cadeia global. Modelo: o do tenant
  // (se o provedor é o dele); senão o modelo padrão global do provedor.
  // A COTA continua sendo a do tenant (a config global não abre cota nenhuma).
  // NOTA sobre a linha legada 'plataforma' (acima): ela é uma ConfigIaTenant
  // completa (COM cota) usada como default quando o tenant não tem linha —
  // ela precede a global de propósito, porque a global sozinha não carrega
  // cota e sem cota o gate ficaria sem régua (fail-closed exige a linha).
  const global = await lerConfigIaGlobal(SUPABASE_URL, SERVICE_KEY);
  const provedorEfetivo = configEfetiva.provedor || global.cadeiaFallback[0] || null;
  if (!provedorEfetivo) return json({ erro: "nao_configurado" }, 503);
  const modeloEfetivo =
    (configEfetiva.provedor === provedorEfetivo ? configEfetiva.modelo : null) ||
    global.modeloPadrao[provedorEfetivo] ||
    null;

  // cota/custo ANTES da chamada (05-10)
  const mes = new Date().toISOString().slice(0, 7);
  const uso = await lerUso(SUPABASE_URL, SERVICE_KEY, tenant, mes);
  const cota = Number(configEfetiva.cotaMensal) || 0;
  const custoMax = Number(configEfetiva.custoMaxMensal) || 0;
  if (cota <= 0 || uso.chamadas >= cota || uso.custo >= custoMax) return json({ erro: "cota_excedida" }, 403);

  // guardrails de ENTRADA (o texto da criança nunca chega aqui, mas fail-closed)
  if (bloqueado(corpo.prompt)) return json({ erro: "conteudo_bloqueado" }, 422);

  const schema = corpo.schema && typeof corpo.schema === "object" ? corpo.schema : SCHEMA_TRECHO;
  const opts = corpo.opts || {};

  // tarefa #31: fallback do tenant (1 provedor) VENCE; sem ele, a cadeia
  // global entra na ordem (pulando o provedor primário). Modelos dos
  // fallbacks: o padrão global do provedor (senão o default barato).
  const chavesBanco = await lerChavesBanco(SUPABASE_URL, SERVICE_KEY);
  const fallbacks: string[] = configEfetiva.fallback
    ? [configEfetiva.fallback]
    : global.cadeiaFallback.filter((p) => p !== provedorEfetivo);

  let resultado = await gerarCom(provedorEfetivo, modeloEfetivo, corpo.prompt, schema, opts, chavesBanco);
  for (const alternativo of fallbacks) {
    if (resultado.ok) break;
    resultado = await gerarCom(alternativo, global.modeloPadrao[alternativo] || null, corpo.prompt, schema, opts, chavesBanco);
  }
  if (!resultado.ok) {
    return resultado.semChave ? json({ erro: "nao_configurado" }, 503) : json({ erro: "provedor_falhou" }, 502);
  }

  // guardrails de SAÍDA — nada inseguro chega à criança
  const trecho = resultado.trecho;
  if (bloqueado(trecho.texto)) return json({ erro: "conteudo_bloqueado" }, 422);

  await registrarUso(SUPABASE_URL, SERVICE_KEY, tenant, mes, uso.chamadas + 1, uso.custo + 1);
  return json({ texto: trecho.texto, ehFinal: trecho.ehFinal }, 200);
});
