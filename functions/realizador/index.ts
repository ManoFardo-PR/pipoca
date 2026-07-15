/**
 * [realizador/index.ts] — Edge Function realizador: a rota edge da GERAÇÃO 2
 *   que roda a CASCATA inteira no servidor (chama o LLM, valida a fidelidade
 *   e devolve o texto realizado); irmã do proxy-ia.
 *
 * PAPEL: edge (GERAÇÃO 2 — cascata completa no servidor)
 * POR QUE EXISTE: rodar a cascata do fase12-12-04 numa única viagem de rede,
 *   com as chaves pagas fora do cliente; o app manda Pacote + prompt já
 *   montado e o servidor decide provedor/modelo, checa cota, chama a API
 *   paga, valida a fidelidade e responde.
 * ENTRA: POST JSON { pacote, prompt:{system,user}, temperatura?, tenantId? } +
 *   header Authorization: Bearer <JWT> (verify_jwt). Secrets do ambiente:
 *   ANTHROPIC_API_KEY/OPENAI_API_KEY/GEMINI_API_KEY/DEEPSEEK_API_KEY,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Lê config_ia/uso_ia.
 * SAI: 200 { texto, paragrafos, veredito, origem, metadados }; ou não-200
 *   {erro}: 401 nao_autenticado, 400 requisicao_invalida, 503 nao_configurado
 *   (sem config/chave), 403 cota_excedida, 422 conteudo_bloqueado,
 *   502 realizacao_esgotada, 405 metodo_invalido. Efeito: registra uso em
 *   uso_ia (falha na telemetria nunca derruba a geração).
 * CHAMA: nada do repo — self-contained (Deno). APIs externas: Anthropic,
 *   OpenAI, DeepSeek, Gemini; PostgREST do Supabase (service role).
 * É CHAMADO POR: src/backend/proxy_realizador.ts (cliente keyless, POST em
 *   /functions/v1/realizador).
 * RODA POR: Supabase Edge Function (Deno), deploy na plataforma; acionada
 *   pelos clientes em src/backend/.
 * CUIDADO: AS CHAVES DOS PROVEDORES VIVEM SÓ AQUI (secrets do ambiente:
 *   ANTHROPIC_API_KEY/OPENAI_API_KEY/GEMINI_API_KEY/DEEPSEEK_API_KEY, lidas
 *   via Deno.env.get); o cliente é keyless; qualquer não-200 vira fallback no
 *   cliente (fallback A+ v3 LOCAL, no dispositivo — NÃO vive aqui, a criança
 *   nunca vê erro). O validador e a tabela de comprimento aqui são ESPELHO
 *   dos canônicos (src/core/realizador/validador.ts e prompt_template.ts):
 *   recalibrar lá exige redeploy daqui. Fica FORA de src/ para não entrar no
 *   tsc do app.
 *
 * — detalhe preservado —
 * Pipoca — Realizador (Supabase Edge Function) · fase13-13-03
 * -------------------------------------------------------------
 * A rota edge da GERAÇÃO 2, irmã de `proxy-ia` (mesma disciplina):
 * AS CHAVES DOS PROVEDORES VIVEM SÓ AQUI (secrets do ambiente da função):
 *   ANTHROPIC_API_KEY · OPENAI_API_KEY · GEMINI_API_KEY · DEEPSEEK_API_KEY
 * Deploy com verify_jwt: a plataforma rejeita requisições sem bearer válido.
 *
 * O SERVIDOR decide provedor/modelo pela config_ia do tenant (o cliente não
 * escolhe) e verifica cota/custo em uso_ia ANTES de chamar. A CASCATA do
 * fase12-12-04 roda INTEIRA aqui (uma viagem de rede por realização): recusa
 * não repete; retry 1× só em falha transitória; FAIL de fidelidade = 1
 * tentativa por provedor; teto global 4 chamadas. O fallback A+ v3 NÃO vive
 * aqui — roda no dispositivo (o fallback não depende do edge, 13-03).
 *
 * Entrada: POST { pacote, prompt: {system, user}, temperatura?, tenantId? }.
 * O prompt vem montado do cliente (determinístico, 100% derivado do Pacote,
 * sem segredo — precedente do proxy-ia, em que o cliente manda o prompt).
 * A VALIDAÇÃO de fidelidade roda aqui: espelho compacto do CANÔNICO
 * `src/core/realizador/validador.ts` + tabela canônica de comprimento do
 * `prompt_template.ts` (mesmo precedente do guardrails-lite do proxy-ia —
 * o canônico é o do repo; recalibrações lá exigem redeploy daqui).
 * Self-contained: nada importado do repo (Deno); fica FORA de src/ para não
 * entrar no tsc do app.
 *
 * Erros (JSON {erro}): 401 nao_autenticado · 400 requisicao_invalida ·
 * 503 nao_configurado (sem config/chave) · 403 cota_excedida ·
 * 422 conteudo_bloqueado · 502 realizacao_esgotada. O cliente converte
 * QUALQUER não-200 em fallback A+ v3 local — a criança nunca vê erro.
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

// ── guardrails-lite de SAÍDA (espelho de src/ia/guardrails.ts, como no proxy-ia) ──
const RE_TERMOS = new RegExp(
  "\\b(?:matar|morrer|morte|mortes|sangue|armas?|tiros?|facadas?|terror|pavor|pesadelos?|demonios?|cervejas?|vodka|cigarros?|drogas?|sexo|nudez|apostas?)\\b|\\b(?:assassin|violenc)"
);
const RE_URL = /https?:\/\/|www\./i;
const RE_EMAIL = /\S+@\S+\.\S+/;
const RE_TELEFONE = /\b\d{4,5}[-\s]\d{4}\b|\d{8,}/;

function bloqueado(texto: string): boolean {
  if (!texto || texto.trim() === "") return true;
  if (texto.length > 8000) return true;
  if (RE_URL.test(texto) || RE_EMAIL.test(texto) || RE_TELEFONE.test(texto)) return true;
  const norm = texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return RE_TERMOS.test(norm);
}

// ── infra: PostgREST com service role (config_ia / uso_ia — mesmo desenho do proxy-ia) ──
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

// ── contrato de entrada (Pacote v1 mínimo — rejeição explícita por esquema) ──
interface Beat {
  objeto: string;
  papel: string;
  descricao: string;
  corpo: string;
  relacoes: Array<{ alvo: string; interacao: string }>;
}
interface Pacote {
  esquema: string;
  cenario: { id: string; descricao: string; voz_do_contador: string; sensacao_no_personagem: string };
  personagem: { nome: string; genero: "m" | "f" };
  nivel: "n1" | "n2" | "n3" | "n4";
  beats: Beat[];
  eco: { abre_com: string; fecha_com: string } | null;
  restricoes: { paragrafos: number; palavras_max_por_paragrafo: number };
}

function pacoteValido(p: unknown): p is Pacote {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  if (r["esquema"] !== "pipoca.pacote-composicao.v1") return false;
  const personagem = r["personagem"] as Record<string, unknown> | undefined;
  if (!personagem || typeof personagem["nome"] !== "string") return false;
  if (personagem["genero"] !== "m" && personagem["genero"] !== "f") return false;
  if (!["n1", "n2", "n3", "n4"].includes(r["nivel"] as string)) return false;
  if (!Array.isArray(r["beats"]) || (r["beats"] as unknown[]).length === 0) return false;
  return true;
}

// ── VALIDADOR — espelho compacto de src/core/realizador/validador.ts (canônico) ──
// Tabela canônica de comprimento (herança 1 da fase 10; prompt_template.ts).
const MAXIMO_PALAVRAS: Record<string, [number, number, number, number]> = {
  n1: [31, 44, 58, 71],
  n2: [55, 77, 100, 122],
  n3: [91, 125, 159, 193],
  n4: [200, 268, 335, 403],
};
const TETO_CRESCIMENTO = 0.25;
const LIMIAR_PONTOS_FINAIS_N1 = 12;
const LIMIAR_MEDIA_FRASES_POR_BEAT_N1 = 2;
const SUFIXOS_PRETERITO = /(ava|avam|iam|ou|aram)$/;
const PRESENTES_EM_OU = new Set(["sou", "vou", "estou", "dou"]);
const LIMIAR_MARCAS_PRETERITO = 2;

const ANCORAS_POR_OBJETO: Record<string, string[]> = {
  vagalume: ["faísca", "luz", "lanterna*", "pisca*", "vaga-lume"],
  frasco: ["pote", "vidro", "frasco*", "tampa*"],
  gato: ["gato", "bicho", "olhos verdes"],
  lua: ["lua", "prata", "luar"],
  vento: ["vento", "brisa", "fresco*", "sopr*"],
  folha: ["folha", "folhas"],
  orvalho: ["orvalho", "gota*", "gotinha", "grama molhada"],
};
const TERMOS_CORPO = [
  "ela", "ele", "dela", "dele", "pé", "pés", "mão", "mãos", "palma", "dedo", "dedos",
  "olho", "olhos", "olhar", "peito", "cabelo", "cabelos", "rosto", "queixo",
  "respiração", "pele", "braço", "braços", "ombro", "ombros", "pescoço", "nuca", "coração",
];
const ADJ_F = ["quieta", "sozinha", "descalça", "atenta", "agachada"];
const ADJ_M = ["quieto", "sozinho", "descalço", "atento", "agachado"];

const norm = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s: string): string[] => norm(s).split(/[^a-z0-9-]+/).filter(Boolean);
const sentencas = (s: string): string[] => s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
const contarPalavras = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const pareceVerbo = (p: string): boolean => /(ar|er|ir|ndo)$/.test(p) && p.length > 3;

function contemAncora(texto: string, ancoras: string[]): boolean {
  const t = norm(texto);
  const toks = tokens(texto);
  return ancoras.some((a) => {
    const an = norm(a);
    if (an.endsWith("*")) return toks.some((tk) => tk.startsWith(an.slice(0, -1)));
    if (an.includes(" ")) return t.includes(an);
    return toks.includes(an);
  });
}

function temMarcaDeCorpo(texto: string, nomeNorm: string): boolean {
  const toks = tokens(texto);
  if (toks.includes(nomeNorm)) return true;
  return TERMOS_CORPO.some((termo) => toks.includes(norm(termo)));
}

function rodadaDoPacote(p: Pacote): 1 | 2 | 3 | 4 {
  return Math.max(1, Math.min(4, p.beats.length - 2)) as 1 | 2 | 3 | 4;
}

interface Veredito {
  pass: boolean;
  motivos: string[];
  avisos: string[];
  ritmoN1?: { pontosFinais: number; mediaFrasesPorBeat: number; ok: boolean };
  presencaPorBeat: Record<string, boolean>;
}

function validar(pacote: Pacote, texto: string, paragrafos: string[]): Veredito {
  const motivos: string[] = [];
  const avisos: string[] = [];
  const presencaPorBeat: Record<string, boolean> = {};
  if (typeof texto !== "string" || texto.trim() === "") {
    return { pass: false, motivos: ["texto realizado ausente ou vazio"], avisos, presencaPorBeat };
  }
  const frases = sentencas(texto);
  for (const beat of pacote.beats) {
    const ancoras = ANCORAS_POR_OBJETO[beat.objeto];
    if (!ancoras) {
      avisos.push(`objeto "${beat.objeto}" sem tabela de âncoras — cobertura não verificada`);
      continue;
    }
    const idx = frases.findIndex((f) => contemAncora(f, ancoras));
    if (idx === -1) {
      motivos.push(`objeto "${beat.objeto}" sem âncora no texto realizado`);
      presencaPorBeat[beat.objeto] = false;
      continue;
    }
    const janela = frases.slice(Math.max(0, idx - 1), idx + 2).join(" ");
    const coberto = temMarcaDeCorpo(janela, norm(pacote.personagem.nome));
    presencaPorBeat[beat.objeto] = coberto;
    if (!coberto) motivos.push(`beat "${beat.objeto}" sem marca de corpo/personagem na janela da âncora`);
  }
  const toks = tokens(texto);
  const nomeNorm = norm(pacote.personagem.nome);
  const genero = pacote.personagem.genero;
  if (!toks.includes(nomeNorm)) motivos.push(`nome da protagonista ("${pacote.personagem.nome}") ausente`);
  const artigoOposto = genero === "f" ? "o" : "a";
  for (let i = 0; i < toks.length - 1; i++) {
    if (toks[i] === artigoOposto && toks[i + 1] === nomeNorm) {
      motivos.push(`artigo do gênero oposto antes do nome ("${artigoOposto} ${pacote.personagem.nome}")`);
      break;
    }
  }
  const palavraOposta = genero === "f" ? "menino" : "menina";
  if (toks.includes(palavraOposta)) motivos.push(`palavra do gênero oposto ("${palavraOposta}")`);
  const opostas = (genero === "f" ? ADJ_M : ADJ_F).map(norm);
  for (let i = 0; i < toks.length; i++) {
    if (!opostas.includes(toks[i]!)) continue;
    const anterior = i > 0 ? toks[i - 1]! : "";
    if (anterior === "" || pareceVerbo(anterior)) motivos.push(`flexão predicativa do gênero oposto ("${toks[i]}")`);
  }
  const maximo = MAXIMO_PALAVRAS[pacote.nivel]![rodadaDoPacote(pacote) - 1]!;
  const razao = (contarPalavras(texto) - maximo) / maximo;
  if (razao > TETO_CRESCIMENTO) {
    motivos.push(`crescimento de ${Math.round(razao * 100)}% sobre o máximo canônico de ${maximo} palavras (teto ${TETO_CRESCIMENTO * 100}%)`);
  }
  if (paragrafos.length !== pacote.restricoes.paragrafos) {
    avisos.push(`parágrafos fora do alvo: ${paragrafos.length} (alvo ${pacote.restricoes.paragrafos})`);
  }
  const marcasPreterito = toks.filter((tk) => SUFIXOS_PRETERITO.test(tk) && !PRESENTES_EM_OU.has(tk)).length;
  if (marcasPreterito >= LIMIAR_MARCAS_PRETERITO) {
    avisos.push(`tempo passado: ${marcasPreterito} marcas de pretérito (limiar ${LIMIAR_MARCAS_PRETERITO})`);
  }
  let ritmoN1: Veredito["ritmoN1"];
  if (pacote.nivel === "n1") {
    const pontosFinais = (texto.match(/\./g) || []).length;
    const beats = pacote.beats.length;
    const mediaFrasesPorBeat = beats > 0 ? pontosFinais / beats : 0;
    const ok = pontosFinais <= LIMIAR_PONTOS_FINAIS_N1 && mediaFrasesPorBeat <= LIMIAR_MEDIA_FRASES_POR_BEAT_N1;
    ritmoN1 = { pontosFinais, mediaFrasesPorBeat, ok };
    if (!ok) motivos.push(`ritmo n1 estourado: ${pontosFinais} pontos finais, ${mediaFrasesPorBeat.toFixed(1)} frases/beat (tetos ${LIMIAR_PONTOS_FINAIS_N1}/${LIMIAR_MEDIA_FRASES_POR_BEAT_N1})`);
  }
  return { pass: motivos.length === 0, motivos, avisos, ritmoN1, presencaPorBeat };
}

function segmentarParagrafos(texto: string): string[] {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// ── provedores — chaves só do ambiente; saída JSON restrita {texto_limpo} ──
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

const SCHEMA_TEXTO = {
  type: "object",
  properties: { texto_limpo: { type: "string" } },
  required: ["texto_limpo"],
} as const;

type Gerado =
  | { ok: true; texto: string }
  | { ok: false; semChave?: boolean; recusa?: boolean; transitorio?: boolean };

function parseTextoLimpo(textoJson: string): string | null {
  try {
    const t = JSON.parse(textoJson);
    if (t && typeof t.texto_limpo === "string" && t.texto_limpo.trim()) return t.texto_limpo;
  } catch {
    /* fora do formato */
  }
  return null;
}

async function gerarCom(
  provedor: string,
  modelo: string | null,
  prompt: { system: string; user: string },
  temperatura: number
): Promise<Gerado> {
  const nomeSecret = SECRET_POR_PROVEDOR[provedor];
  const chave = nomeSecret ? Deno.env.get(nomeSecret) : undefined;
  if (!chave) return { ok: false, semChave: true };
  const m = modelo || MODELO_PADRAO[provedor] || "";

  try {
    if (provedor === "gemini") {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA_TEXTO, temperature: temperatura },
        }),
      });
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true };
      if (!r.ok) return { ok: false };
      const j = await r.json();
      if (j.promptFeedback && j.promptFeedback.blockReason) return { ok: false, recusa: true };
      const cand = j.candidates && j.candidates[0];
      if (cand && cand.finishReason === "SAFETY") return { ok: false, recusa: true };
      const parte = cand && cand.content && cand.content.parts && cand.content.parts[0];
      const t = parte && typeof parte.text === "string" ? parseTextoLimpo(parte.text) : null;
      return t ? { ok: true, texto: t } : { ok: false };
    }

    if (provedor === "claude") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: m,
          max_tokens: 1200,
          temperature: temperatura,
          output_config: { format: { type: "json_schema", schema: SCHEMA_TEXTO } },
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
        }),
      });
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true };
      if (!r.ok) return { ok: false };
      const j = await r.json();
      if (j.stop_reason === "refusal") return { ok: false, recusa: true };
      const bloco = Array.isArray(j.content) ? j.content.find((c: { type?: string }) => c && c.type === "text") : null;
      const t = bloco && typeof bloco.text === "string" ? parseTextoLimpo(bloco.text) : null;
      return t ? { ok: true, texto: t } : { ok: false };
    }

    if (provedor === "openai" || provedor === "deepseek") {
      const url = provedor === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.deepseek.com/chat/completions";
      const formato =
        provedor === "openai"
          ? { type: "json_schema", json_schema: { name: "texto", strict: true, schema: { ...SCHEMA_TEXTO, additionalProperties: false } } }
          : { type: "json_object" };
      const sistema =
        provedor === "deepseek"
          ? prompt.system + '\nResponda SOMENTE com um objeto json válido: { "texto_limpo": string }.'
          : prompt.system;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + chave },
        body: JSON.stringify({
          model: m,
          max_completion_tokens: 1200,
          temperature: temperatura,
          messages: [{ role: "system", content: sistema }, { role: "user", content: prompt.user }],
          response_format: formato,
        }),
      });
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true };
      if (!r.ok) return { ok: false };
      const j = await r.json();
      const msg = j.choices && j.choices[0] ? j.choices[0].message : null;
      if (msg && typeof msg.refusal === "string" && msg.refusal) return { ok: false, recusa: true };
      const t = msg && typeof msg.content === "string" ? parseTextoLimpo(msg.content) : null;
      return t ? { ok: true, texto: t } : { ok: false };
    }
  } catch {
    return { ok: false, transitorio: true }; // rede caiu = transitório
  }
  return { ok: false, semChave: true }; // provedor desconhecido = não configurado
}

const TETO_GLOBAL_TENTATIVAS = 4;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "metodo_invalido" }, 405);

  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const uid = uidDoJwt(jwt);
  if (!uid) return json({ erro: "nao_autenticado" }, 401);

  const corpo = (await req.json().catch(() => null)) as {
    pacote?: unknown;
    prompt?: { system?: string; user?: string };
    temperatura?: number;
    tenantId?: string;
  } | null;
  if (
    !corpo || !pacoteValido(corpo.pacote) ||
    !corpo.prompt || typeof corpo.prompt.system !== "string" || typeof corpo.prompt.user !== "string" ||
    !corpo.prompt.user.trim()
  ) {
    return json({ erro: "requisicao_invalida" }, 400);
  }
  const pacote = corpo.pacote;
  const prompt = { system: corpo.prompt.system, user: corpo.prompt.user };
  const temperatura = typeof corpo.temperatura === "number" ? corpo.temperatura : 0.4;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ erro: "nao_configurado" }, 503);

  // o servidor decide tudo pela config do tenant — o cliente NÃO escolhe provedor
  const tenant = (typeof corpo.tenantId === "string" && corpo.tenantId) || "familia:" + uid;
  const config = await lerConfigIa(SUPABASE_URL, SERVICE_KEY, tenant);
  const configEfetiva = config || (await lerConfigIa(SUPABASE_URL, SERVICE_KEY, "plataforma"));
  if (!configEfetiva || !configEfetiva.provedor) return json({ erro: "nao_configurado" }, 503);

  // cota/custo ANTES da chamada (mesma régua do proxy-ia)
  const mes = new Date().toISOString().slice(0, 7);
  const uso = await lerUso(SUPABASE_URL, SERVICE_KEY, tenant, mes);
  const cota = Number(configEfetiva.cotaMensal) || 0;
  const custoMax = Number(configEfetiva.custoMaxMensal) || 0;
  if (cota <= 0 || uso.chamadas >= cota || uso.custo >= custoMax) return json({ erro: "cota_excedida" }, 403);

  // ── cascata do 12-04, no servidor ──
  const inicio = Date.now();
  const provedores = [configEfetiva.provedor, configEfetiva.fallback].filter(
    (p, i, arr): p is string => !!p && arr.indexOf(p) === i
  );
  let chamadas = 0;

  cascata: for (const provedor of provedores) {
    let jaRetentou = false;
    while (chamadas < TETO_GLOBAL_TENTATIVAS) {
      chamadas++;
      const modelo = provedor === configEfetiva.provedor ? configEfetiva.modelo : null;
      const r = await gerarCom(provedor, modelo, prompt, temperatura);
      if (!r.ok) {
        if (r.recusa) continue cascata; // recusa NUNCA repete no mesmo provedor
        if (r.transitorio && !jaRetentou && chamadas < TETO_GLOBAL_TENTATIVAS) {
          jaRetentou = true; // retry curto 1×, só falha técnica transitória
          continue;
        }
        continue cascata;
      }
      const paragrafos = segmentarParagrafos(r.texto);
      const veredito = validar(pacote, r.texto, paragrafos);
      if (!veredito.pass) continue cascata; // FAIL de fidelidade: 1 tentativa por provedor
      // guardrails de SAÍDA — nada inseguro chega à criança
      if (bloqueado(r.texto)) return json({ erro: "conteudo_bloqueado" }, 422);
      await registrarUso(SUPABASE_URL, SERVICE_KEY, tenant, mes, uso.chamadas + chamadas, uso.custo + chamadas);
      return json(
        {
          texto: r.texto,
          paragrafos,
          veredito,
          origem: { fonte: "llm", provedor, modelo: modelo || MODELO_PADRAO[provedor] || "" },
          metadados: { chamadas, duracaoMs: Date.now() - inicio },
        },
        200
      );
    }
    break; // teto global atingido
  }

  // Esgotada: o fallback A+ v3 é do DISPOSITIVO (13-03) — aqui só o sinal.
  await registrarUso(SUPABASE_URL, SERVICE_KEY, tenant, mes, uso.chamadas + chamadas, uso.custo + chamadas);
  return json({ erro: "realizacao_esgotada", chamadas }, 502);
});
