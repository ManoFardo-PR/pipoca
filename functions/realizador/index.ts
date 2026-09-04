/**
 * [realizador/index.ts] — Edge Function realizador: a rota edge da GERAÇÃO 2
 *   que roda a CASCATA inteira no servidor (chama o LLM, valida a fidelidade
 *   e devolve o texto realizado).
 *
 * PAPEL: edge (GERAÇÃO 2 — cascata completa no servidor)
 * POR QUE EXISTE: rodar a cascata do fase12-12-04 numa única viagem de rede,
 *   com as chaves pagas fora do cliente; o app manda SÓ o Pacote (E3) e o
 *   servidor monta o prompt, decide provedor/modelo, checa cota, chama a API
 *   paga, valida a fidelidade e responde.
 * ENTRA: POST JSON { pacote, tenantId? } (E3; corpo com `prompt` legado é
 *   REJEITADO com 400 desde o flip pós-E7 — ver ACEITAR_PROMPT_LEGADO) +
 *   header Authorization: Bearer <JWT> (verify_jwt). Secrets do ambiente:
 *   ANTHROPIC_API_KEY/OPENAI_API_KEY/GEMINI_API_KEY/DEEPSEEK_API_KEY,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Lê config_ia/uso_ia.
 * SAI: 200 { texto, paragrafos, veredito, origem, metadados }; ou não-200
 *   {erro}: 401 nao_autenticado, 400 requisicao_invalida, 503 nao_configurado
 *   (sem config/chave), 403 cota_excedida, 422 conteudo_bloqueado,
 *   502 realizacao_esgotada, 405 metodo_invalido. Efeito: registra uso em
 *   uso_ia pela RPC atômica registrar_uso_ia (A4; falha na telemetria nunca
 *   derruba a geração). Modelo: tenant → padrão global (config_ia
 *   'plataforma:global') → sem modelo = não configurado (sem default na edge).
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
 * A rota edge da GERAÇÃO 2 (a edge da geração 1 foi aposentada no E3):
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
 * Entrada: POST { pacote, tenantId? } (E3). O PROMPT nasce AQUI, 100%
 * derivado do Pacote (espelho verificado de prompt_template.ts) — uma fonte
 * de verdade, sem prompt arbitrário do cliente; `prompt`/`temperatura` no
 * corpo são legado da transição (ignorados; rejeitados no 2º deploy).
 * A VALIDAÇÃO de fidelidade roda aqui: espelho compacto do CANÔNICO
 * `src/core/realizador/validador.ts` + tabela canônica de comprimento do
 * `prompt_template.ts` (mesmo precedente do guardrails-lite —
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

// ── guardrails-lite de SAÍDA (espelho de src/core/seguranca/guardrails.ts, o
//    canônico; paridade verificada por scripts/paridade-edge.mjs no CI, E2) ──
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

// ── infra: PostgREST com service role (config_ia / uso_ia — deny-all p/ cliente) ──
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

// ── config GLOBAL (SA_IA_GLOBAL): linha reservada 'plataforma:global' em config_ia ──
// dados = ConfigIaGlobal { modeloPadrao: provedor→modelo|null, cadeiaFallback: provedor[] }
// A4 (Plan03): o realizador passa a ler o padrão GLOBAL de modelo — a mesma regra de
// herança do admin (src/admin/ia_global.ts). Sem modelo = fail-closed.
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

// A4 (Plan03) · registro de uso ATÔMICO pela RPC registrar_uso_ia (SECURITY DEFINER,
// só service_role): recebe DELTAS (chamadas/custo desta requisição) — o banco soma
// num único upsert, sem a corrida do ler-somar-gravar (duas famílias do mesmo tenant
// em paralelo perdiam incrementos). `lerUso` segue sendo leitura, para a checagem
// de cota ANTES da chamada.
async function registrarUso(url: string, chave: string, tenant: string, mes: string, chamadas: number, custo: number): Promise<void> {
  try {
    await fetch(url + "/rest/v1/rpc/registrar_uso_ia", {
      method: "POST",
      headers: cabecalhosServico(chave),
      body: JSON.stringify({ p_tenant: tenant, p_mes: mes, p_chamadas: chamadas, p_custo: custo }),
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
  /** E1 (aditivos no v1): sentimento (sensacao.registro) e sentido (dominante). */
  sentimento?: string;
  sentido?: string;
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

// ── PROMPT-TEMPLATE — espelho de src/core/realizador/prompt_template.ts (o
//    canônico; paridade verificada por scripts/paridade-edge.mjs no CI, E3).
//    E3: o prompt nasce AQUI a partir do pacote — o cliente manda só
//    {pacote, tenantId?} (uma fonte de verdade; sem prompt arbitrário). ──
type NivelKey = "n1" | "n2" | "n3" | "n4";

const DESCRICAO_NIVEL: Record<NivelKey, string> = {
  n1: "Primeiras palavras — sílabas e palavras soltas",
  n2: "Frases curtas — uma linha",
  n3: "Pequenos textos — frases ligadas",
  n4: "Parágrafos — histórias mais longas",
};

interface ExemploFewShot {
  entrada: string;
  saida: string;
}

const FEWSHOT_POR_NIVEL: Record<NivelKey, ExemploFewShot[]> = {
  n1: [
    {
      entrada: "ELEMENTOS: vagalume → folha → vento · PERSONAGEM: Joana (menina)",
      saida:
        "O quintal sussurra segredos, Joana quer ver tudo. A grama fria toca seu pé. Uma luz pisca no fundo, os olhos de Joana seguem. Uma folha desce rodando, o dedo de Joana segue. O vento pula o muro, a pele de Joana sente o fresco. O quintal conta tudo, Joana sente os segredos.",
    },
  ],
  n2: [
    {
      entrada: "ELEMENTOS: vagalume → vento → frasco · PERSONAGEM: Joana (menina)",
      saida:
        "O quintal sussurra segredos. Joana sente a grama fria, quer ver tudo. Seus olhos seguem o vaga-lume piscando no fundo. Ela chega perto na ponta dos pés, e a faísca entra no pote, vira sua lanterninha. O vento pula o muro e corre, fresco, mexendo em tudo. A pele de Joana arrepia, o cabelo mexe. Ela segura o pote de vidro frio e liso com as duas mãos, espiando o mundo lá dentro.",
    },
    {
      entrada: "ELEMENTOS: folha → frasco → gato → vento · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos. A grama fria no pé de Pietro faz a vontade de ver tudo. Uma folha solta do galho, desce rodando. O dedo de Pietro acompanha, os olhos dançam. Um pote frio e liso espera na grama. Pietro o segura, espia o mundo. Um gato quieto aparece na cerca, olhos verdes. Pietro silencia, prende a respiração. O gato vê a folha, pula, brincando. O vento pula o muro, corre, fresco. A pele de Pietro arrepia, o cabelo mexe. O quintal continua a sussurrar segredos.",
    },
  ],
  n3: [
    {
      entrada: "ELEMENTOS: vento → vagalume → gato → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos; a grama fria nos pés de Pietro traz vontade de descobrir. O vento rola pelo muro, corre no quintal, fresco de longe, mexe de leve. Os braços de Pietro arrepiam, o cabelo mexe. No canto escuro, luzinha acende e apaga; vaga-lume pisca devagar como estrela. Os olhos de Pietro seguem a pisca, querendo perto.\n\nNa cerca, gato aparece sem barulho, quieto feito sombra, olhos verdes acesos feito lanternas. Pietro fica em silêncio, prende a respiração, troca olhar com o gato, que espia a luzinha. Então, Pietro vê pote de vidro escondido na grama, frio e liso feito pedra de rio, que entorta o mundo. Ele o segura com as duas mãos, fecha um olho para espiar. A faísca do vaga-lume entra no pote, piscando lá dentro — uma lanterninha viva pra carregar. Pietro agora tem um segredo do quintal, guardado bem perto.",
    },
    {
      entrada: "ELEMENTOS: vagalume → folha → gato → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos, um por um. A grama fria nos pés de Pietro traz a vontade de descobrir. No canto escuro, um vaga-lume acende e apaga, estrelinha pra brincar. Os olhos de Pietro seguem a pisca, e ele na ponta dos pés quer chegar perto. A faísca entra no pote de vidro, virando lanterninha viva. Uma folha se solta do galho alto, descendo rodando no ar. O dedo de Pietro acompanha cada volta, sua mão aberta, esperando. Na cerca, um gato aparece sem barulho, quieto feito sombra, olhos verdes acesos. Pietro fica em silêncio, prende a respiração, e troca um olhar demorado. O gato espia a luzinha piscando, movendo a cabeça. Um pote de vidro, frio e liso feito pedra de rio, está na grama, entortando o mundo. Pietro o segura com as duas mãos, fecha um olho e espia, colhendo os segredos do quintal.",
    },
  ],
  n4: [
    {
      entrada: "ELEMENTOS: folha → vagalume → frasco · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos, e a grama fria nos pés de Pietro faz seu coração bater forte de vontade de saber. Do galho alto, uma folha se despede e desce no ar escuro, rodando leve. O dedo de Pietro acompanha as voltas, e sua mão se abre feito ninho, esperando a folha pousar. No canto escuro perto da cerca, uma luzinha acende e apaga, um vaga-lume. Os olhos de Pietro seguem a pisca, e a vontade o move na ponta dos pés, prendendo a respiração, até um pote de vidro na grama. A faísca entra no pote frio e liso, piscando lá dentro, presa e livre, uma lanterninha viva. Pietro o segura com as duas mãos, ergue contra a luz, fecha um olho e espia o mundo que entorta e brilha, pequeno e curvo, e a vontade de saber se colhe no brilho da lanterninha viva.",
    },
    {
      entrada: "ELEMENTOS: frasco → vento → gato → vagalume · PERSONAGEM: Pietro (menino)",
      saida:
        "O quintal sussurra segredos para quem vem ver, e a grama fria nos pés descalços de Pietro faz seu coração bater forte de vontade de saber. Ele segura um pote de vidro com as duas mãos, erguendo-o contra a luz, e fecha um olho para espiar o mundo que entorta lá dentro, virando devagar. O pote vazio parece à espera, e Pietro sente a certeza boa de que a noite ainda vai mandar uma coisinha brilhante para morar ali.\n\nO vento chega rolando por cima do muro, balançando a grama e cheirando a terra molhada. A pele dos braços de Pietro arrepia, ele fecha os olhos e respira fundo, deixando o vento passar como se fosse noite. Em cima da cerca, um gato já está sentado, e Pietro fica em silêncio, prendendo a respiração, trocando um olhar demorado e piscando devagar de volta. No canto do quintal, uma luzinha acende e apaga, flutuando. Os olhos de Pietro seguem a pisca, e a vontade de chegar perto o guia, então a faísca roda no ar, encontra o pote e entra devagarinho, piscando quentinha, como quem chega em casa.",
    },
  ],
};

interface PromptRealizador {
  system: string;
  user: string;
}

function rotuloGenero(genero: "m" | "f"): string {
  return genero === "f" ? "menina" : "menino";
}

function personalizarExemplo(ex: ExemploFewShot, nomeAlvo: string, generoAlvo: "m" | "f"): ExemploFewShot {
  const m = ex.entrada.match(/PERSONAGEM:\s*([^()]+?)\s*\((menina|menino)\)/);
  if (!m) return ex; // sem personagem reconhecível — não mexe
  const nomeFonte = m[1].trim();
  const generoFonte: "m" | "f" = m[2] === "menina" ? "f" : "m";
  const trocar = (s: string): string => {
    let out = s.replace(new RegExp("\\b" + nomeFonte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), nomeAlvo);
    if (generoFonte !== generoAlvo) {
      const pares: Array<[string, string]> = generoAlvo === "m"
        ? [["menina", "menino"], ["Ela", "Ele"], ["ela", "ele"], ["Dela", "Dele"], ["dela", "dele"]]
        : [["menino", "menina"], ["Ele", "Ela"], ["ele", "ela"], ["Dele", "Dela"], ["dele", "dela"]];
      for (const [de, para] of pares) out = out.replace(new RegExp("\\b" + de + "\\b", "g"), para);
    }
    return out;
  };
  return { entrada: trocar(ex.entrada), saida: trocar(ex.saida) };
}

function maximoPalavrasDoPacote(pacote: Pacote): number {
  return MAXIMO_PALAVRAS[pacote.nivel][rodadaDoPacote(pacote) - 1];
}

function montarPromptRealizador(pacote: Pacote): PromptRealizador {
  const nivel = pacote.nivel;
  const nome = pacote.personagem.nome;
  const genero = rotuloGenero(pacote.personagem.genero);
  const maximo = maximoPalavrasDoPacote(pacote);

  // ---------- user (MATÉRIA — só o Pacote, já resolvido no nível) ----------
  const linhasUser: string[] = [];
  linhasUser.push(`LUGAR: ${pacote.cenario.descricao}`);
  linhasUser.push(`VOZ DO LUGAR: ${pacote.cenario.voz_do_contador}`);
  linhasUser.push(`O QUE O LUGAR FAZ SENTIR: ${pacote.cenario.sensacao_no_personagem}`);
  linhasUser.push(`PERSONAGEM: ${nome} (${genero})`);
  linhasUser.push("", "ELEMENTOS, NA ORDEM:");
  pacote.beats.forEach((beat, i) => {
    linhasUser.push(`${i + 1}. ${beat.objeto} (${beat.papel})`);
    linhasUser.push(`   O QUE É: ${beat.descricao}`);
    linhasUser.push(`   CORPO: ${beat.corpo}`);
    // E1 (ML-5): sentimento/sentido das fichas — matéria aditiva, só quando veio.
    if (beat.sentimento) linhasUser.push(`   SENTIMENTO: ${beat.sentimento}`);
    if (beat.sentido) linhasUser.push(`   SENTIDO: ${beat.sentido}`);
    for (const relacao of beat.relacoes) {
      linhasUser.push(`   INTERAÇÃO (com ${relacao.alvo}): ${relacao.interacao}`);
    }
  });

  // ---------- system (MÉTODO — as 3 leis vivem aqui, D-11.1) ----------
  const linhasSystem = [
    "Escreva uma história infantil curta a partir do MATERIAL abaixo.",
    // Lei 1 — o corpo da criança é o centro.
    `O corpo de ${nome} guia cada cena: use os gestos dados em CORPO, não invente emoções abstratas.`,
    // Lei 2 — o cenário é o contador (voz_do_contador + sensacao_no_personagem, D-11.2).
    "O lugar é o contador: a voz do lugar abre e costura a história.",
    // Lei 3 — desejo plantado, corpo colhido.
    "Plante a vontade na abertura; feche colhendo essa vontade no corpo.",
    // E1 (ML-5) — o sentimento é CLIMA, não rótulo: sem copiar a palavra.
    ...(pacote.beats.some((b) => b.sentimento || b.sentido)
      ? ["Use o SENTIMENTO de cada elemento como clima da cena, SEM escrever essa palavra; o SENTIDO diz qual percepção guia (visão, tato, som…)."]
      : []),
    // As quatro proibições, parametrizadas pelo Pacote (nunca "Joana" fixo).
    "NÃO invente acontecimentos, objetos, personagens ou falas.",
    "NÃO remova nenhum elemento. NÃO mude a ordem dos elementos.",
    `NÃO troque o nome (${nome}), o gênero (${genero}) ou a idade.`,
    // Achados do ciclo 1 (herança 3): presente + anáfora.
    "Escreva no tempo PRESENTE (a história acontece agora), como nos exemplos abaixo.",
    `Não use "ele" ou "ela" para objetos — repita o nome do objeto.`,
    `Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.`,
  ];
  if (nivel === "n1") {
    // Regras de fusão do n1 (achados do ciclo 1 + fase12-12-05).
    linhasSystem.push(
      "Nível n1: frases bem curtas, UMA sensação de corpo por elemento.",
      'Integre a sensação de corpo na frase do evento com "e" — no máximo 2 frases por elemento.',
      "Repetir o nome do objeto ou da personagem é bem-vindo (repetição coesiva).",
      "No máximo 1 fragmento exclamativo em todo o texto."
    );
  } else {
    linhasSystem.push(
      'Uma frase pode unir-se à outra com "e", "mas", "então", "depois". Menos pontos finais, sem frases picadas.'
    );
  }

  // Few-shot do nível (D-12.2) — só o nível pedido; exemplo de um envenena o
  // outro. Parametrizado pela identidade do Pacote (A1/C1): o few-shot passa a
  // falar do MESMO personagem que se pede — sem prior de nome/gênero conflitante.
  const exemplos = FEWSHOT_POR_NIVEL[nivel];
  if (exemplos.length > 0) {
    linhasSystem.push("", `EXEMPLOS do nível ${nivel} (siga o tom, o ritmo e o comprimento):`);
    exemplos.forEach((exemploBruto, i) => {
      const exemplo = personalizarExemplo(exemploBruto, nome, pacote.personagem.genero);
      linhasSystem.push(`EXEMPLO ${i + 1} — ${exemplo.entrada}`, exemplo.saida, "");
    });
  }

  // Eco: instrução AUSENTE quando nulo (12-01 — mais seguro que condicional).
  if (pacote.eco !== null) {
    linhasSystem.push(`Termine ecoando ${pacote.eco.abre_com} com as próprias palavras.`);
  }

  const paragrafosTxt =
    pacote.restricoes.paragrafos === 1 ? "1 parágrafo" : `${pacote.restricoes.paragrafos} parágrafos`;
  linhasSystem.push(
    `Escreva em ${paragrafosTxt} (separados por uma linha em branco). Máximo ${maximo} palavras no total.`,
    "Devolva só o texto final."
  );

  return { system: linhasSystem.join("\n"), user: linhasUser.join("\n") };
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

function rodadaDoPacote(pacote: Pacote): 1 | 2 | 3 | 4 {
  const r = pacote.beats.length - 2;
  return (r < 1 ? 1 : r > 4 ? 4 : r) as 1 | 2 | 3 | 4;
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
// A4 (Plan03): NÃO há mais modelo default escondido na edge. O modelo vem do tenant
// (config_ia) ou do padrão GLOBAL do admin (SA_IA_GLOBAL); sem modelo, o provedor
// conta como não configurado — o operador vê exatamente o que a edge usa.
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
  | { ok: false; semChave?: boolean; recusa?: boolean; transitorio?: boolean;
      /** diagnóstico p/ os logs (sem PII): status HTTP e trecho do erro da API */
      status?: number; detalhe?: string };

/** Trecho curto do corpo de erro da API do provedor — só para os logs. */
async function trechoErro(r: Response): Promise<string> {
  try { return (await r.text()).slice(0, 200); } catch { return ""; }
}

function parseTextoLimpo(textoJson: string): string | null {
  // Cercas de código (```json … ```) aparecem quando o JSON vem por instrução
  // (gemini sem schema) — tirar antes do parse; inofensivo para os demais.
  const limpo = textoJson.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const t = JSON.parse(limpo);
    if (t && typeof t.texto_limpo === "string" && t.texto_limpo.trim()) return t.texto_limpo;
  } catch {
    /* fora do formato */
  }
  return null;
}

async function gerarCom(
  provedor: string,
  modelo: string,
  prompt: { system: string; user: string },
  temperatura: number
): Promise<Gerado> {
  const nomeSecret = SECRET_POR_PROVEDOR[provedor];
  const chave = nomeSecret ? Deno.env.get(nomeSecret) : undefined;
  if (!chave) return { ok: false, semChave: true };
  const m = modelo;

  try {
    if (provedor === "gemini") {
      // Gemini 3.x (medições C9/C10/C11): o structured output (responseSchema)
      // dispara thinking dinâmico pesado (131s), e thinkingBudget é REJEITADO
      // (400 INVALID_ARGUMENT — sintaxe da geração 2.5). O caminho rápido e
      // aceito é o MESMO do DeepSeek: JSON por instrução + responseMimeType,
      // sem schema e sem thinkingConfig (1,5s no teste isolado), com teto de
      // tokens para conter latência. A qualidade do portão é papel do validador.
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system + '\nResponda SOMENTE com um objeto JSON válido: { "texto_limpo": string }.' }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: temperatura, maxOutputTokens: 1200 },
        }),
      });
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true, status: r.status, detalhe: await trechoErro(r) };
      if (!r.ok) return { ok: false, status: r.status, detalhe: await trechoErro(r) };
      const j = await r.json();
      if (j.promptFeedback && j.promptFeedback.blockReason) return { ok: false, recusa: true, detalhe: String(j.promptFeedback.blockReason) };
      const cand = j.candidates && j.candidates[0];
      if (cand && cand.finishReason === "SAFETY") return { ok: false, recusa: true, detalhe: "finishReason=SAFETY" };
      const parte = cand && cand.content && cand.content.parts && cand.content.parts[0];
      const t = parte && typeof parte.text === "string" ? parseTextoLimpo(parte.text) : null;
      return t ? { ok: true, texto: t } : { ok: false, detalhe: "resposta fora do formato texto_limpo" };
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
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true, status: r.status, detalhe: await trechoErro(r) };
      if (!r.ok) return { ok: false, status: r.status, detalhe: await trechoErro(r) };
      const j = await r.json();
      if (j.stop_reason === "refusal") return { ok: false, recusa: true, detalhe: "stop_reason=refusal" };
      const bloco = Array.isArray(j.content) ? j.content.find((c: { type?: string }) => c && c.type === "text") : null;
      const t = bloco && typeof bloco.text === "string" ? parseTextoLimpo(bloco.text) : null;
      return t ? { ok: true, texto: t } : { ok: false, detalhe: "resposta fora do formato texto_limpo" };
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
      if (r.status === 429 || r.status >= 500) return { ok: false, transitorio: true, status: r.status, detalhe: await trechoErro(r) };
      if (!r.ok) return { ok: false, status: r.status, detalhe: await trechoErro(r) };
      const j = await r.json();
      const msg = j.choices && j.choices[0] ? j.choices[0].message : null;
      if (msg && typeof msg.refusal === "string" && msg.refusal) return { ok: false, recusa: true, detalhe: "refusal" };
      const t = msg && typeof msg.content === "string" ? parseTextoLimpo(msg.content) : null;
      return t ? { ok: true, texto: t } : { ok: false, detalhe: "resposta fora do formato texto_limpo" };
    }
  } catch (e) {
    return { ok: false, transitorio: true, detalhe: String(e).slice(0, 120) }; // rede caiu = transitório
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

  // E3 · transição ENCERRADA (pós-E7, 2026-09-04): o bundle ao ar não envia mais
  // `prompt` — corpo com `prompt` agora é REJEITADO (400), decisão do dono.
  const ACEITAR_PROMPT_LEGADO = false;

  const corpo = (await req.json().catch(() => null)) as {
    pacote?: unknown;
    prompt?: unknown; // legado (pré-E3) — ignorado; rejeitado após a transição
    temperatura?: unknown; // legado — ignorado (o "tom" é decisão do servidor)
    tenantId?: string;
  } | null;
  if (!corpo || !pacoteValido(corpo.pacote)) {
    return json({ erro: "requisicao_invalida" }, 400);
  }
  if (!ACEITAR_PROMPT_LEGADO && corpo.prompt !== undefined) {
    return json({ erro: "requisicao_invalida" }, 400);
  }
  const pacote = corpo.pacote;
  const prompt = montarPromptRealizador(pacote);
  const temperatura = 0.4; // fixa no servidor (se houver "tom da casa", vira campo de config_ia)

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ erro: "nao_configurado" }, 503);

  // o servidor decide tudo pela config do tenant — o cliente NÃO escolhe provedor
  const tenant = (typeof corpo.tenantId === "string" && corpo.tenantId) || "familia:" + uid;
  const config = await lerConfigIa(SUPABASE_URL, SERVICE_KEY, tenant);
  const configEfetiva = config || (await lerConfigIa(SUPABASE_URL, SERVICE_KEY, "plataforma"));
  if (!configEfetiva || !configEfetiva.provedor) return json({ erro: "nao_configurado" }, 503);

  // cota/custo ANTES da chamada (régua da plataforma)
  const mes = new Date().toISOString().slice(0, 7);
  const uso = await lerUso(SUPABASE_URL, SERVICE_KEY, tenant, mes);
  const cota = Number(configEfetiva.cotaMensal) || 0;
  const custoMax = Number(configEfetiva.custoMaxMensal) || 0;
  if (cota <= 0 || uso.chamadas >= cota || uso.custo >= custoMax) return json({ erro: "cota_excedida" }, 403);

  // ── cascata do 12-04, no servidor ──
  const inicio = Date.now();
  // A4 · modelo por provedor: o do tenant (se o provedor é o dele) → padrão GLOBAL do
  // admin (SA_IA_GLOBAL) → sem modelo = provedor NÃO configurado (fail-closed; o
  // fallback só entra se o operador definiu o padrão global daquele provedor).
  const global = await lerConfigIaGlobal(SUPABASE_URL, SERVICE_KEY);
  const modeloPara = (provedor: string): string | null =>
    (provedor === configEfetiva.provedor ? configEfetiva.modelo : null) || global.modeloPadrao[provedor] || null;
  const provedores = [configEfetiva.provedor, configEfetiva.fallback].filter(
    (p, i, arr): p is string => !!p && arr.indexOf(p) === i
  );
  let chamadas = 0;

  cascata: for (const provedor of provedores) {
    const modelo = modeloPara(provedor);
    if (!modelo) continue; // sem modelo configurado: nem tenta (sem chamada paga)
    let jaRetentou = false;
    while (chamadas < TETO_GLOBAL_TENTATIVAS) {
      chamadas++;
      const r = await gerarCom(provedor, modelo, prompt, temperatura);
      if (!r.ok) {
        // Diagnóstico nos LOGS da função (sem conteúdo/PII): por que a tentativa caiu.
        console.warn("[realizador] tentativa falhou", JSON.stringify({
          provedor, modelo, semChave: !!r.semChave, recusa: !!r.recusa, transitorio: !!r.transitorio,
          status: r.status ?? null, detalhe: r.detalhe ?? null,
        }));
        if (r.recusa) continue cascata; // recusa NUNCA repete no mesmo provedor
        if (r.transitorio && !jaRetentou && chamadas < TETO_GLOBAL_TENTATIVAS) {
          jaRetentou = true; // retry curto 1×, só falha técnica transitória
          continue;
        }
        continue cascata;
      }
      const paragrafos = segmentarParagrafos(r.texto);
      const veredito = validar(pacote, r.texto, paragrafos);
      if (!veredito.pass) {
        console.warn("[realizador] veredito FAIL", JSON.stringify({ provedor, modelo, motivos: veredito.motivos }));
        continue cascata; // FAIL de fidelidade: 1 tentativa por provedor
      }
      // guardrails de SAÍDA — nada inseguro chega à criança
      if (bloqueado(r.texto)) return json({ erro: "conteudo_bloqueado" }, 422);
      await registrarUso(SUPABASE_URL, SERVICE_KEY, tenant, mes, chamadas, chamadas); // deltas (A4)
      return json(
        {
          texto: r.texto,
          paragrafos,
          veredito,
          origem: { fonte: "llm", provedor, modelo },
          metadados: { chamadas, duracaoMs: Date.now() - inicio },
        },
        200
      );
    }
    break; // teto global atingido
  }

  // A4: nenhum provedor tinha modelo configurado — nada foi chamado nem cobrado.
  if (chamadas === 0) return json({ erro: "nao_configurado" }, 503);

  // Esgotada: o fallback A+ v3 é do DISPOSITIVO (13-03) — aqui só o sinal.
  await registrarUso(SUPABASE_URL, SERVICE_KEY, tenant, mes, chamadas, chamadas); // deltas (A4)
  return json({ erro: "realizacao_esgotada", chamadas }, 502);
});
