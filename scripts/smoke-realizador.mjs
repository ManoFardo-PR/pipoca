/**
 * [smoke-realizador.mjs] — smoke REAL da edge `realizador` em produção: cria um
 *   usuário descartável, loga, POSTa um Pacote real (Pietro/m) e exige que a
 *   edge complete uma realização de verdade (origem llm, não fallback).
 *
 * PAPEL: smoke (gate do P0 · análise A3 · GASTA API paga)
 * POR QUE EXISTE: provar de ponta a ponta que a edge de produção COMPLETA uma
 *   realização (200 + texto com "Pietro" + veredito PASS + origem llm). Sem o
 *   200 a edge está morta e nada abaixo compensa — parar e diagnosticar.
 * ENTRA: env SUPA_URL, ANON_KEY, SMOKE_EMAIL, SMOKE_SENHA; argv[2] = fase
 *   ("signup" cria o usuário e imprime o e-mail | "run" = login + POST +
 *   asserções); o Pacote real Pietro/m vem embutido no script.
 * SAI: logs no console + process.exitCode (0 ok · 1 asserção falhou · 2 sem
 *   bearer). Efeito real: cria usuário no Auth de produção e chama a edge.
 * CHAMA: fetch direto ao /auth/v1 e /functions/v1/realizador do Supabase
 *   (contrato E3: o corpo é SÓ {pacote} — o prompt nasce na edge).
 * É CHAMADO POR: ninguém — entrypoint rodado à mão (não está no package.json).
 * RODA POR: `node scripts/smoke-realizador.mjs <fase>` com env
 *   SUPA_URL/ANON_KEY/SMOKE_EMAIL (e SMOKE_SENHA).
 * CUIDADO: GASTA API paga — bate na edge `realizador` de produção, que usa a
 *   chave do provedor (secret da edge). KEYLESS: só o anon key (público) + o
 *   bearer do usuário criado; nenhuma chave de provedor mora aqui. Cria um
 *   usuário DESCARTÁVEL no Auth real — confirmar o e-mail e limpar o usuário
 *   são feitos via SQL/MCP fora deste script (keyless, sem service role).
 *   tenantId é omitido de propósito para exercitar o fallback "plataforma".
 *
 * — detalhe preservado —
 * Pipoca — SMOKE REAL da edge `realizador` (produção) · gate do P0 (análise A3)
 * -----------------------------------------------------------------------------
 * Prova que a edge COMPLETA uma realização de verdade (origem llm, não fallback):
 * cria um usuário DESCARTÁVEL, faz login, POSTa um Pacote real (Pietro/m) na
 * edge e exige 200 com texto contendo "Pietro" + veredito PASS + origem llm.
 * Sem o 200: a edge está morta e NADA abaixo compensa (PARAR e diagnosticar).
 *
 * SEM CHAVE DE PROVEDOR: só o anon key (público) + o bearer do usuário criado.
 * As chaves dos provedores vivem só como secrets da edge.
 *
 * USO:
 *   SUPA_URL=... ANON_KEY=... SMOKE_EMAIL=... SMOKE_SENHA=... \
 *     bun run scripts/smoke-realizador.mjs <fase>
 *   <fase> = "signup"  → cria o usuário e imprime o e-mail (confirmar via SQL)
 *   <fase> = "run"     → login + POST na edge + asserções (o gate de verdade)
 * A confirmação de e-mail e a limpeza do usuário são feitas via MCP/SQL fora
 * deste script (o script é keyless e não tem service role).
 */

const SUPA_URL = process.env.SUPA_URL || "https://bamlljvllcxdnsheatqv.supabase.co";
const ANON_KEY = process.env.ANON_KEY;
const EMAIL = process.env.SMOKE_EMAIL;
const SENHA = process.env.SMOKE_SENHA || "Smoke!Pipoca-2026";
const FASE = process.argv[2] || "run";

if (!ANON_KEY) throw new Error("ANON_KEY ausente no ambiente.");
if (!EMAIL) throw new Error("SMOKE_EMAIL ausente no ambiente.");

const H_ANON = { "content-type": "application/json", apikey: ANON_KEY };

// Pacote real Pietro/m (derivado do golden Joana/f — mesmo cenário/beats,
// personagem trocado). Exercita o caminho de identidade masculina.
const pacote = {
  esquema: "pipoca.pacote-composicao.v1",
  cenario: {
    id: "quintal_anoitecer",
    descricao: "um quintal de casa ao cair da noite: muro baixo, grama, uma árvore e a primeira estrela",
    voz_do_contador: "o quintal fala baixinho, como quem sussurra segredos só pra ele",
    sensacao_no_personagem: "o friozinho bom de estar acordado na hora em que o quintal acorda",
  },
  personagem: { nome: "Pietro", genero: "m" },
  nivel: "n2",
  beats: [
    {
      objeto: "vagalume",
      papel: "abertura",
      descricao: "um vaga-lume que acende e apaga",
      corpo: "os olhos seguem a pisca; chegar perto na ponta dos pés",
      relacoes: [{ alvo: "frasco", interacao: "a faísca entra no pote e vira uma lanterninha só dele" }],
    },
    {
      objeto: "frasco",
      papel: "miolo",
      descricao: "um pote de vidro limpinho, que deixa ver o que mora dentro",
      corpo: "segurar o pote com as duas mãos; espiar através do vidro",
      relacoes: [],
    },
    {
      objeto: "vento",
      papel: "fecho",
      descricao: "um vento fresco que passa e mexe em tudo de leve",
      corpo: "a pele dos braços arrepia; o cabelo mexe",
      relacoes: [],
    },
  ],
  eco: { abre_com: "vagalume", fecha_com: "vento" },
  restricoes: { paragrafos: 2, palavras_max_por_paragrafo: 40 },
};

async function signup() {
  const r = await fetch(SUPA_URL + "/auth/v1/signup", {
    method: "POST",
    headers: H_ANON,
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  });
  const j = await r.json().catch(() => ({}));
  console.log("[signup] status", r.status, "| access_token?", !!j.access_token, "| user?", !!j.user?.id);
  console.log("[signup] EMAIL =", EMAIL);
  if (j.access_token) console.log("[signup] AUTOCONFIRM — token já disponível");
  return j.access_token || null;
}

async function login() {
  const r = await fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: H_ANON,
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) {
    console.error("[login] FALHA status", r.status, JSON.stringify(j));
    return null;
  }
  console.log("[login] OK — bearer obtido");
  return j.access_token;
}

async function chamarEdge(token) {
  const r = await fetch(SUPA_URL + "/functions/v1/realizador", {
    method: "POST",
    headers: { ...H_ANON, Authorization: "Bearer " + token },
    // Contrato E3 (pós-flip): SÓ {pacote} — o prompt nasce na edge; corpo com
    // `prompt` é rejeitado (400). tenantId OMITIDO de propósito: a edge deriva
    // "familia:<uid>" (usuário novo, sem linha própria) → fallback "plataforma".
    body: JSON.stringify({ pacote }),
  });
  const texto = await r.text();
  let j;
  try { j = JSON.parse(texto); } catch { j = { _raw: texto }; }
  return { status: r.status, j };
}

function assert(cond, msg) {
  if (!cond) { console.error("❌ ASSERT:", msg); process.exitCode = 1; return false; }
  console.log("✓", msg);
  return true;
}

if (FASE === "signup") {
  const tok = await signup();
  if (tok) console.log("TOKEN:", tok);
  process.exit(0);
}

// FASE run: login → POST → asserções (o gate)
let token = await login();
if (!token) {
  console.error("\n⚠️  Sem bearer. Se o e-mail não está confirmado, rode via SQL:");
  console.error("    update auth.users set email_confirmed_at=now() where email='" + EMAIL + "';");
  process.exit(2);
}

const { status, j } = await chamarEdge(token);
console.log("\n=== RESPOSTA DA EDGE ===");
console.log("HTTP", status);
console.log(JSON.stringify(j, null, 2));

console.log("\n=== ASSERÇÕES (gate do P0) ===");
const ok200 = assert(status === 200, "HTTP 200 (edge completou; não 503/502/403)");
if (ok200) {
  assert(typeof j.texto === "string" && j.texto.includes("Pietro"), 'texto contém "Pietro"');
  assert(!/\bmenina\b/i.test(j.texto || ""), 'sem "menina" (flexão masculina)');
  assert(!/\ba Pietro\b/i.test(j.texto || ""), 'sem artigo feminino "a Pietro"');
  assert(j.veredito && j.veredito.pass === true, "veredito.pass === true");
  assert(j.origem && j.origem.fonte === "llm", 'origem.fonte === "llm" (não fallback)');
  console.log("\n[origem]", JSON.stringify(j.origem), "| [metadados]", JSON.stringify(j.metadados));
}
process.exit(process.exitCode || 0);
