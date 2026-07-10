/**
 * Experimento fichas→histórias — testes SEM REDE (transporte fake, padrão da
 * casa), encadeados no `test` do package.json. Cobrem: gramática-andaime (D5),
 * matriz, montador de prompt e Camada 1 (gênero bidirecional, presença por
 * beat, ritmo n1 como gate, crescimento) e o cliente Gemini com fake.
 */

import type { FichaRelacao } from "../../src/core/fichas/tipos.js";
import objetosRaw from "../../docs/fichas/objetos.v1.json";
import relacoesRaw from "../../docs/fichas/relacoes.quintal.v1.json";
import cenariosRaw from "../../docs/fichas/cenarios.v1.json";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../../src/core/fichas/tipos.js";
import { alvoPalavras, avaliarCondicao, casaSe, derivarPapel, selecionarRelacoes } from "./gramatica-andaime.js";
import { ESTADOS_POR_CELULA, LINHA_TESTEMUNHA, montarMatriz } from "./matriz.js";
import { montarPromptFichas } from "./montar-prompt.js";
import { avaliarCamada1Fichas } from "./avaliar/camada1-fichas.js";
import { gerarComGemini } from "./gemini-cliente-fichas.js";
import type { EstadoExperimento } from "./tipos.js";

let passou = 0;
let falhou = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    passou++;
  } else {
    console.error(`  ✗ ${msg}`);
    falhou++;
  }
}

const catalogos = {
  objetos: objetosRaw as unknown as ArquivoObjetosV1,
  relacoes: relacoesRaw as unknown as ArquivoRelacoesV1,
  cenarios: cenariosRaw as unknown as ArquivoCenariosV1,
};

function estadoBase(parcial: Partial<EstadoExperimento>): EstadoExperimento {
  return {
    id: "teste",
    seed: 1,
    rodada: 2,
    nivel: "n2",
    genero: "f",
    personagem: "Joana",
    linha: ["frasco", "vagalume", "vento"],
    temperatura: 0.4,
    ...parcial,
  };
}

console.log("\nBLOCO 1 — gramática-andaime (semântica v3 + seleção D5)");
{
  const linha = ["frasco", "vagalume", "vento"];
  assert(avaliarCondicao("tem:frasco", "vagalume", linha), "tem: casa com alvo presente");
  assert(!avaliarCondicao("tem:vagalume", "vagalume", linha), "tem: nunca casa com o próprio objeto (guarda)");
  assert(avaliarCondicao("depois_de:frasco", "vagalume", linha), "depois_de: casa na ordem certa");
  assert(!avaliarCondicao("antes_de:frasco", "vagalume", linha), "antes_de: não casa na ordem invertida");
  assert(avaliarCondicao("pos:inicio", "frasco", linha), "pos:inicio casa na ponta");
  assert(avaliarCondicao("pos:miolo", "vagalume", linha), "pos:miolo casa no interior");
  assert(!avaliarCondicao("func:magica", "vagalume", linha), "func:* nunca casa");
  assert(!casaSe([], "vagalume", linha), "se vazio nunca casa");
  assert(casaSe(["tem:frasco", "depois_de:frasco"], "vagalume", linha), "E lógico: todas casam");
}
{
  const relacoes: FichaRelacao[] = [
    { se: "tem:b", objeto: "a", alvo: "b", interacao: { n1: "x", n2: "x", n3: "x", n4: "x" } },
    { se: ["tem:b", "depois_de:b"], objeto: "a", alvo: "b", interacao: { n1: "y", n2: "y", n3: "y", n4: "y" } },
    { se: "tem:a", objeto: "b", alvo: "a", interacao: { n1: "z", n2: "z", n3: "z", n4: "z" } },
  ];
  const ativas = selecionarRelacoes(relacoes, ["b", "a"]);
  assert(ativas.length === 2, "teto D5: no máximo 2 relações");
  assert(ativas[0]!.especificidade === 2, "D5: maior especificidade vence");
  assert(ativas[1]!.relacao.interacao.n1 === "x", "D5: desempate pela ordem do array");
  assert(derivarPapel(0, 3) === "abertura" && derivarPapel(2, 3) === "fecho" && derivarPapel(1, 3) === "miolo", "papel por posição");
}

console.log("\nBLOCO 2 — matriz (96 + testemunha; gêneros metade/metade; determinística)");
{
  const estados = montarMatriz(0.4, "42");
  assert(estados.length === 4 * 4 * ESTADOS_POR_CELULA + 1, `matriz com ${estados.length} estados (96 + testemunha)`);
  const f = estados.filter((e) => e.genero === "f").length;
  const m = estados.filter((e) => e.genero === "m").length;
  assert(f === 49 && m === 48, "gêneros metade/metade (49 f com a testemunha, 48 m)");
  const porRodada = [1, 2, 3, 4].every((r) =>
    estados.filter((e) => e.rodada === r && !e.testemunha).every((e) => e.linha.length === 2 + r)
  );
  assert(porRodada, "tamanho da linha segue a rodada (R1=3 … R4=6)");
  const t = estados.find((e) => e.testemunha);
  assert(!!t && t.linha.join(",") === LINHA_TESTEMUNHA.join(","), "testemunha = linha da tira real (R4×n3)");
  const estados2 = montarMatriz(0.4, "42");
  assert(JSON.stringify(estados) === JSON.stringify(estados2), "matriz determinística (mesmo seed ⇒ idêntica)");
}

console.log("\nBLOCO 3 — montador de prompt (andaime)");
{
  const estado = estadoBase({});
  const m1 = montarPromptFichas(estado, catalogos);
  const m2 = montarPromptFichas(estado, catalogos);
  assert(m1.system === m2.system && m1.user === m2.user, "montagem determinística");
  assert(m1.system.includes("NÃO troque o nome (Joana)") && m1.system.includes("menina"), "proibições parametrizadas (f)");
  assert(m1.system.includes("1 ou 2 parágrafos"), "restrição de parágrafos por rodada (R2: 1–2, D-12.1)");
  assert(m1.system.includes(`Alvo: cerca de ${m1.alvoPalavras} palavras`), "instrução de palavras cita o alvo calculado (C-1)");
  assert(m1.system.includes("tempo PRESENTE"), "instrução de tempo presente entre as regras (C-2)");
  assert(m1.user.includes("INTERAÇÃO (com frasco)"), "relação ativa entra no beat certo (vagalume depois de frasco)");
  assert(m1.user.includes("VOZ DO LUGAR"), "voz do contador no material");
  assert(m1.palavrasMaterial > 40, "material com contagem de palavras (base do teto)");
  const m3 = montarPromptFichas(estadoBase({ genero: "m", personagem: "Pietro", nivel: "n1", rodada: 1, linha: ["vagalume", "frasco", "vento"] }), catalogos);
  assert(m3.system.includes("Pietro") && m3.system.includes("menino"), "proibições parametrizadas (m)");
  assert(m3.system.includes("UMA sensação de corpo"), "instrução própria do n1");
}

console.log("\nBLOCO 4 — Camada 1 (fichas): fidelidade, gênero bidirecional, presença por beat");
{
  const estado = estadoBase({ linha: ["vagalume", "frasco"] });
  const bom =
    "O quintal fala baixinho, e a Joana escuta. Uma luzinha pisca no fundo, e os olhos dela seguem a pisca. A faísca entra no pote de vidro e vira uma lanterninha na mão dela.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 2], bom);
  assert(r.pass, "texto fiel passa (âncoras + presença por beat + gênero + teto)");
}
{
  const estado = estadoBase({ linha: ["vagalume", "frasco"] });
  const semCorpoNoFrasco =
    "A Joana chega. Uma luzinha pisca e os olhos dela seguem a pisca. A grama é fria e o muro é baixo. Um pote de vidro espera no canto do quintal.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 2], semCorpoNoFrasco);
  assert(!r.pass && r.motivos.some((m) => m.includes('beat "frasco"')), "beat sem marca de corpo reprova (presença POR BEAT)");
  assert(r.presencaPorBeat["vagalume"] === true, "beat com marca segue coberto (sem punir fusão)");
}
{
  const estado = estadoBase({ genero: "m", personagem: "Pietro", linha: ["vagalume", "frasco"] });
  const vazamento =
    "O Pietro chega e uma luzinha pisca, e os olhos dele seguem a pisca. A faísca entra no pote na mão dele, e ele quer ficar quieta ali.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 2], vazamento);
  assert(r.motivos.some((m) => m.includes('flexão predicativa do gênero oposto ("quieta")')), 'gênero bidirecional: "quieta" para Pietro reprova');
}
{
  const estado = estadoBase({ linha: ["vagalume", "frasco"] });
  const artigo =
    "O Joana chega e uma luzinha pisca, e os olhos dela seguem a pisca. A faísca entra no pote de vidro, na mão dela.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 2], artigo);
  assert(r.motivos.some((m) => m.includes("artigo do gênero oposto")), 'artigo oposto ("o Joana") reprova');
}
{
  const estado = estadoBase({ linha: ["vagalume", "frasco"] });
  const descalcos =
    "A Joana vem de pés descalços, e uma luzinha pisca — os olhos dela seguem a pisca. A faísca entra no pote de vidro, na mão dela.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 2], descalcos);
  assert(!r.motivos.some((m) => m.includes("flexão predicativa")), '"pés descalços" NÃO reprova (flexiona com o substantivo)');
}
{
  const estado = estadoBase({ nivel: "n1", linha: ["vagalume", "frasco"] });
  const picado =
    "A Joana vem. Uma luzinha pisca. Os olhos dela seguem. A faísca entra. O pote brilha na mão dela. A noite é boa. Tudo pisca.";
  const r = avaliarCamada1Fichas(estado, 120, 54, [1, 1], picado);
  assert(r.motivos.some((m) => m.includes("ritmo n1")), "ritmo n1 é GATE (frases/beat acima do teto reprovam)");
  assert(r.ritmoN1 !== undefined && !r.ritmoN1.ok, "métrica de ritmo reportada");
}
{
  const estado = estadoBase({ linha: ["vagalume"] });
  const inflado =
    "A Joana escuta o quintal e uma luzinha pisca no fundo do quintal e os olhos dela seguem a pisca com muita vontade de chegar perto na ponta dos pés prendendo a respiração como quem guarda um segredo enorme da noite inteira que não acaba nunca de tão bonita que ficou.";
  const r = avaliarCamada1Fichas(estado, 20, 30, [1, 1], inflado);
  assert(r.motivos.some((m) => m.includes("crescimento")), "crescimento acima do teto reprova (base = alvo, C-3)");
}

console.log("\nBLOCO 5 — cliente Gemini com transporte fake (sem rede)");
{
  const respostaOk = {
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ texto_limpo: "olá" }) }] } }] }),
  };
  const r = await gerarComGemini("s", "u", {
    modelo: "fake",
    chave: "fake",
    temperatura: 0,
    transporte: async () => respostaOk,
  });
  assert(r.ok && r.texto === "olá", "resposta 200 com JSON válido");
}
{
  let chamadas = 0;
  const r = await gerarComGemini("s", "u", {
    modelo: "fake",
    chave: "fake",
    temperatura: 0,
    atrasoRetryMs: 1,
    transporte: async () => {
      chamadas++;
      if (chamadas === 1) return { status: 429, json: async () => ({}) };
      return {
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ texto_limpo: "ok" }) }] } }] }),
      };
    },
  });
  assert(r.ok && r.tentativas === 2, "retry em 429 e sucesso na 2ª tentativa");
}
{
  const r = await gerarComGemini("s", "u", {
    modelo: "fake",
    chave: "fake",
    temperatura: 0,
    transporte: async () => ({ status: 400, json: async () => ({}) }),
  });
  assert(!r.ok && r.erro === "http_400", "erro 400 sem retry");
}

console.log("\nBLOCO 6 — recalibração (C-1 orçamento proporcional, C-2 presente, C-3 avaliador)");
{
  // Clamp da C-1: material pequeno → piso; grande → teto; meio → proporcional.
  assert(alvoPalavras(20, "n1", 1) === 35, "clamp: material pequeno cai no piso (n1: 35)");
  assert(alvoPalavras(300, "n1", 1) === 60, "clamp: material grande cai no teto (n1×R1: 60)");
  assert(alvoPalavras(110, "n1", 1) === 50, "clamp: meio é proporcional (round(110×0.45) = 50)");
  assert(alvoPalavras(300, "n1", 4) === 110, "teto cresce com a rodada (n1×R4: 110)");
  assert(alvoPalavras(600, "n4", 4) === 220, "teto por nível×rodada (n4×R4: 220)");
}
{
  // O alvo do prompt é o mesmo da função (registro coerente com a instrução).
  const m = montarPromptFichas(estadoBase({}), catalogos);
  assert(m.alvoPalavras === alvoPalavras(m.palavrasMaterial, "n2", 2), "MaterialPrompt.alvoPalavras = clamp do material");
}
{
  // C-3: base do teto é o ALVO — texto acima de material×1.25 mas dentro de
  // alvo×1.25 NÃO reprova (o caso que a regra antiga estrangulava).
  const estado = estadoBase({ nivel: "n1", rodada: 1, linha: ["vagalume"] });
  const folgado =
    "A Joana chega perto na ponta dos pés. Uma luzinha pisca no fundo do quintal. Os olhos dela seguem a pisca. A mão dela abre devagar. A luzinha pisca de novo e a noite fica bonita.";
  const r = avaliarCamada1Fichas(estado, 20, 35, [1, 1], folgado);
  assert(!r.motivos.some((m) => m.includes("crescimento")), "texto dentro de alvo×1.25 não reprova por crescimento");
}
{
  // Aviso de tempo verbal (C-3): pretérito dispara; presente (com sou/vou) passa.
  const estado = estadoBase({ linha: ["vagalume"] });
  const passado =
    "A Joana chegou perto e olhava a luzinha. Os olhos dela seguiam a pisca e ela ficou parada. As folhas dançavam no vento.";
  const rPassado = avaliarCamada1Fichas(estado, 120, 54, [1, 2], passado);
  assert(rPassado.avisos.some((a) => a.includes("tempo passado")), "pretérito acima do limiar gera AVISO de tempo passado");
  assert(!rPassado.motivos.some((m) => m.includes("tempo passado")), "tempo verbal é aviso, não gate");
  const presente =
    "Eu sou a noite e vou devagar, diz o quintal. A Joana escuta. Uma luzinha pisca e os olhos dela seguem a pisca.";
  const rPresente = avaliarCamada1Fichas(estado, 120, 54, [1, 2], presente);
  assert(!rPresente.avisos.some((a) => a.includes("tempo passado")), 'presente não dispara ("sou"/"vou" na stop-list)');
}

console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`fichas-experimento.test.ts: ${falhou} asserts falharam`);
