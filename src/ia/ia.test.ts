/**
 * Pipoca — Testes da fase05 (IA e fala) · `bun run src/ia/ia.test.ts`
 * --------------------------------------------------------------------
 * Grupos por doc: prompt (05-02) · guardrails (05-08) · provedor/simulado/
 * adaptadores (05-04..07) · orquestrador (05-10) · ASR (05-09).
 * Formato dos demais testes do repo: assert local + throw no fim.
 */

import { PROMPT_BASE, montarPrompt, type MontarPromptContext } from "./prompt.js";
import { criarGuardrails, envolverComGuardrails } from "./guardrails.js";
import {
  ErroRecusaProvedor,
  TRECHO_JSON_SCHEMA,
  validarTrechoGerado,
  type Transporte,
} from "./provedor.js";
import { criarProvedorSimulado } from "./simulado.js";
import { criarAdaptadorClaude } from "./adaptadores/claude.js";
import { criarAdaptadorGemini } from "./adaptadores/gemini.js";
import { criarAdaptadorOpenAI } from "./adaptadores/openai.js";
import { selecionarAdaptador } from "./adaptadores/selecionar.js";
import { MODELOS_POR_PROVEDOR, type ConfigIaTenant } from "../admin/ia_config.js";
import { validarGrafo } from "../core/grafo/validarGrafo.js";
import type { Trecho } from "../core/grafo/tipos.js";
import grafoRaw from "../dados/quintal_grafo.json" with { type: "json" };

const grafo = validarGrafo(grafoRaw);

let passou = 0;
let falhou = 0;
function assert(condicao: boolean, mensagem: string): void {
  if (condicao) {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  } else {
    console.error(`  ✗ ${mensagem}`);
    falhou++;
  }
}

function ctx(extra: Partial<MontarPromptContext>): MontarPromptContext {
  return { tipo: "abertura", historia: [], nivel: "n2", modoDesfecho: "convergente", grafo, ...extra };
}

console.log("\n=== montarPrompt (05-02) — pureza, tom e forma ===");
{
  const a1 = montarPrompt(ctx({}));
  const a2 = montarPrompt(ctx({}));
  assert(a1 === a2, "função pura: mesmo ctx → mesmo prompt (sem timestamp/aleatório)");
  assert(a1.includes(grafo.cenario.nome), "prompt carrega o nome do cenário (tom autoral)");
  assert(a1.includes("SOMENTE neste nível"), "prompt pede UM nível só (nunca os quatro)");
  assert(a1.includes(`NÍVEL DE LEITURA: n2`), "prompt injeta o nível pedido");
  assert(!a1.includes("NÍVEL DE LEITURA: n4"), "prompt não pede outro nível");
  assert(a1.includes('"ehFinal": false') && !a1.includes('"ehFinal": true'), "abertura pede ehFinal=false");
  assert(a1.includes("comecinho"), "história vazia → prompt de comecinho (edge do doc)");
  assert(a1.includes("Trecho"), "prompt referencia o formato Trecho");

  const obj = grafo.cenario.objetos[0]!;
  const p2 = montarPrompt(ctx({ tipo: "objeto", objetoId: obj.id }));
  assert(p2.includes(obj.nome) && p2.includes(obj.emoji), "tipo=objeto cita nome+emoji do objeto colocado");
  assert(p2.includes(obj.papel_no_fim), "tipo=objeto injeta o papel do objeto no fim");
  assert(p2.includes('"ehFinal": false'), "tipo=objeto pede ehFinal=false");

  const idsComRamo = grafo.cenario.desfechos.aberto.map((d) => d.se_terminou_com);
  const comRamo = idsComRamo[0]!;
  const semRamo = grafo.cenario.objetos.map((o) => o.id).find((id) => idsComRamo.indexOf(id) < 0);
  const p3 = montarPrompt(ctx({ tipo: "desfecho", modoDesfecho: "aberto", historia: [comRamo] }));
  assert(p3.includes("DESFECHO ABERTO") && p3.includes('"ehFinal": true'), "desfecho aberto com ramo → pede o ramo + ehFinal=true");
  if (semRamo) {
    const p4 = montarPrompt(ctx({ tipo: "desfecho", modoDesfecho: "aberto", historia: [semRamo] }));
    assert(p4.includes("convergente e acolhedor"), "aberto sem ramo → degrada p/ convergente acolhedor (espelha Motor A)");
  } else {
    assert(true, "(quintal sem objeto sem ramo — degradação coberta pelo caminho convergente)");
  }
  const p5 = montarPrompt(ctx({ tipo: "desfecho", modoDesfecho: "convergente", historia: [obj.id] }));
  assert(p5.includes("DESFECHO CONVERGENTE") && p5.includes('"ehFinal": true'), "desfecho convergente pede ehFinal=true");
}

console.log("\n=== PROMPT_BASE (05-02) — bloco de segurança infantil ===");
{
  assert(PROMPT_BASE.includes("3 a 12"), "faixa etária 3–12 anos declarada");
  assert(/nunca enverg/i.test(PROMPT_BASE), 'postura "nunca envergonha a criança"');
  assert(/violência gráfica/.test(PROMPT_BASE) && /links/.test(PROMPT_BASE) && /dado pessoal/.test(PROMPT_BASE), "proibições nomeadas: violência gráfica, links, dados pessoais");
  assert(PROMPT_BASE.includes("Trecho"), "PROMPT_BASE aponta o formato Trecho");
}

console.log("\n=== guardrails (05-08) — filtros ===");
{
  const g = criarGuardrails();
  assert(g.filtrarEntrada(montarPrompt(ctx({}))).permitir, "prompt real do app passa no pré-filtro");
  assert(!g.filtrarEntrada("").permitir, "entrada vazia bloqueada");
  assert(!g.filtrarEntrada("veja https://exemplo.com").permitir, "entrada com link bloqueada");
  assert(g.filtrarSaida({ texto: "O vagalume piscou devagarinho.", ehFinal: false }).permitir, "saída normal passa");
  assert(!g.filtrarSaida({ texto: "acesse www.site.com agora", ehFinal: false }).permitir, "saída com link bloqueada");
  assert(!g.filtrarSaida({ texto: "me liga no 9999-9999", ehFinal: false }).permitir, "saída com telefone bloqueada");
  assert(!g.filtrarSaida({ texto: "escreva para oi@mail.com", ehFinal: false }).permitir, "saída com e-mail bloqueada");
  const rTermo = g.filtrarSaida({ texto: "havia sangue no chão", ehFinal: false });
  assert(!rTermo.permitir, "saída com termo violento bloqueada");
  assert(!(rTermo.motivo || "").includes("sangue"), "motivo sem conteúdo: cita a categoria, nunca o termo (logs sem PII)");
  assert(g.filtrarSaida({ texto: "O armário guardava um tesouro do vovô.", ehFinal: false }).permitir, "palavra inocente contendo termo (armário ⊃ arma) NÃO bloqueia");
  assert(!g.filtrarSaida({ texto: "   ", ehFinal: true }).permitir, "saída vazia bloqueada");
  assert(!g.filtrarSaida({ texto: "la ".repeat(300), ehFinal: false }).permitir, "saída longa demais bloqueada (regra de ouro do portão)");
}

console.log("\n=== envolverComGuardrails (05-08) — GUARD sempre no caminho ===");
{
  let chamadas = 0;
  const provedorLimpo = {
    async gerar(): Promise<Trecho> {
      chamadas++;
      return { texto: "Uma luzinha acendeu no quintal.", ehFinal: false };
    },
  };
  const provedorSujo = {
    async gerar(): Promise<Trecho> {
      chamadas++;
      return { texto: "veja em www.perigo.com", ehFinal: false };
    },
  };
  const limpo = envolverComGuardrails(provedorLimpo);
  const t = await limpo.gerar("conte a abertura do quintal", {});
  assert(t.texto.indexOf("luzinha") >= 0, "provedor limpo passa pelo decorator");

  let bloqueouSaida = false;
  try {
    await envolverComGuardrails(provedorSujo).gerar("conte a abertura", {});
  } catch {
    bloqueouSaida = true;
  }
  assert(bloqueouSaida, "saída insegura NUNCA chega à criança (throw → degradação p/ Motor A)");

  chamadas = 0;
  let bloqueouEntrada = false;
  try {
    await limpo.gerar("visite https://x.com", {});
  } catch {
    bloqueouEntrada = true;
  }
  assert(bloqueouEntrada && chamadas === 0, "entrada bloqueada → o provedor nem é chamado");
}

// ─── Etapa 2 · ProvedorIA (05-04) + simulado + adaptadores (05-05..07) ───────

/** Transporte fake: captura a requisição e devolve a resposta injetada. */
function transporteFake(resposta: unknown, status = 200) {
  const capturas: Array<{ url: string; corpo: Record<string, unknown>; headers: Record<string, string> }> = [];
  const t: Transporte = async (url, init) => {
    capturas.push({ url, corpo: JSON.parse(init.body) as Record<string, unknown>, headers: init.headers });
    return { status, json: async () => resposta };
  };
  return { t, capturas };
}

const TRECHO_OK = JSON.stringify({ texto: "O quintal acende uma luzinha.", ehFinal: false });

console.log("\n=== provedor (05-04) — schema e validação do Trecho ===");
{
  const req = TRECHO_JSON_SCHEMA["required"] as string[];
  assert(req.indexOf("texto") >= 0 && req.indexOf("ehFinal") >= 0, "TRECHO_JSON_SCHEMA exige texto + ehFinal");
  assert(TRECHO_JSON_SCHEMA["additionalProperties"] === false, "TRECHO_JSON_SCHEMA fecha campos extras");
  const v = validarTrechoGerado({ texto: "Oi.", ehFinal: true, objetoId: "intruso" });
  assert(v.texto === "Oi." && v.ehFinal === true && !("objetoId" in v), "validarTrechoGerado descarta objetoId (o motor injeta, a IA não)");
  let e1 = false;
  try { validarTrechoGerado({ texto: "  ", ehFinal: false }); } catch { e1 = true; }
  assert(e1, "texto vazio rejeitado");
  let e2 = false;
  try { validarTrechoGerado({ texto: "ok", ehFinal: "sim" }); } catch { e2 = true; }
  assert(e2, "ehFinal não-booleano rejeitado");
  let e3 = false;
  try { validarTrechoGerado(null); } catch { e3 = true; }
  assert(e3, "null rejeitado");
}

console.log("\n=== provedor simulado (MVP local) ===");
{
  const sim = criarProvedorSimulado(grafo);
  const pAbertura = montarPrompt(ctx({}));
  const t1 = await sim.gerar(pAbertura, TRECHO_JSON_SCHEMA);
  const t2 = await sim.gerar(pAbertura, TRECHO_JSON_SCHEMA);
  assert(t1.texto === t2.texto && t1.ehFinal === t2.ehFinal, "determinístico: mesmo prompt → mesmo Trecho");
  assert(t1.texto.indexOf("✨") === 0, "texto do simulado é distinguível do grafo (marca ✨)");
  assert(t1.ehFinal === false, "abertura simulada → ehFinal=false");
  assert(t1.texto !== grafo.cenario.abertura.n2, "texto simulado ≠ texto autoral do grafo");
  const obj = grafo.cenario.objetos[0]!;
  const tObj = await sim.gerar(montarPrompt(ctx({ tipo: "objeto", objetoId: obj.id })), TRECHO_JSON_SCHEMA);
  assert(tObj.texto.indexOf(obj.nome) >= 0, "trecho simulado de objeto cita o objeto colocado");
  const tFim = await sim.gerar(montarPrompt(ctx({ tipo: "desfecho", historia: [obj.id] })), TRECHO_JSON_SCHEMA);
  assert(tFim.ehFinal === true, "desfecho simulado → ehFinal=true");
  const g = criarGuardrails();
  assert(g.filtrarSaida(t1).permitir && g.filtrarSaida(tObj).permitir && g.filtrarSaida(tFim).permitir, "saída do simulado passa nos guardrails");
  const quebrado = criarProvedorSimulado(grafo, { falhar: true });
  let f1 = false;
  try { await quebrado.gerar(pAbertura, TRECHO_JSON_SCHEMA); } catch { f1 = true; }
  assert(f1, "modo falhar rejeita sempre (degradação testável)");
}

console.log("\n=== adaptador Claude (05-05) ===");
{
  const ok = { stop_reason: "end_turn", content: [{ type: "text", text: TRECHO_OK }] };
  const { t, capturas } = transporteFake(ok);
  const cla = criarAdaptadorClaude({ modelo: "claude-sonnet-4-6", transporte: t });
  const trecho = await cla.gerar("conte a abertura", TRECHO_JSON_SCHEMA, { system: PROMPT_BASE });
  assert(trecho.texto.indexOf("luzinha") >= 0 && trecho.ehFinal === false, "resposta ok vira Trecho válido");
  const corpo = capturas[0]!.corpo;
  assert(corpo["model"] === "claude-sonnet-4-6" && typeof corpo["max_tokens"] === "number", "corpo tem model + max_tokens");
  const fmt = (corpo["output_config"] as { format?: { type?: string } }).format;
  assert(!!fmt && fmt.type === "json_schema", "saída restrita por output_config json_schema");
  assert(!("temperature" in corpo) && !("top_p" in corpo) && !("budget_tokens" in corpo), "NUNCA envia temperature/top_p/budget_tokens");
  const headers = capturas[0]!.headers;
  const temChave = Object.keys(headers).some((h) => /key|authorization/i.test(h));
  assert(!temChave, "nenhuma chave/autorização no cliente (ProxyIA fase06)");
  assert(corpo["system"] === PROMPT_BASE, "system prompt vai no campo system");

  let leuConteudo = false;
  const recusa = {
    get stop_reason() { return "refusal"; },
    get content() { leuConteudo = true; return []; },
  };
  const { t: tRec } = transporteFake(recusa);
  const claRec = criarAdaptadorClaude({ modelo: "claude-haiku-4-5", transporte: tRec });
  let erroRec: unknown = null;
  try { await claRec.gerar("conte", TRECHO_JSON_SCHEMA); } catch (e) { erroRec = e; }
  assert(erroRec instanceof ErroRecusaProvedor, "stop_reason refusal → erro tipado de recusa");
  assert(!leuConteudo, "refusal tratado ANTES de ler o conteúdo");

  const { t: t500 } = transporteFake({}, 500);
  const cla500 = criarAdaptadorClaude({ modelo: "claude-haiku-4-5", transporte: t500 });
  let e500 = false;
  try { await cla500.gerar("conte", TRECHO_JSON_SCHEMA); } catch { e500 = true; }
  assert(e500, "HTTP não-200 → erro (degradação)");
}

console.log("\n=== adaptador Gemini (05-06) ===");
{
  const ok = { candidates: [{ content: { parts: [{ text: TRECHO_OK }] } }] };
  const { t, capturas } = transporteFake(ok);
  const gem = criarAdaptadorGemini({ modelo: "gemini-flash", transporte: t });
  const trecho = await gem.gerar("conte a abertura", TRECHO_JSON_SCHEMA, { system: PROMPT_BASE });
  assert(trecho.texto.indexOf("luzinha") >= 0, "resposta ok vira Trecho válido");
  assert(capturas[0]!.url.indexOf("gemini-flash:generateContent") >= 0, "rota carrega o modelo");
  const gc = capturas[0]!.corpo["generationConfig"] as { responseSchema?: unknown };
  assert(!!gc && !!gc.responseSchema, "saída restrita por responseSchema");
  let eBloq = false;
  const { t: tBloq } = transporteFake({ promptFeedback: { blockReason: "SAFETY" } });
  try { await criarAdaptadorGemini({ modelo: "gemini-flash", transporte: tBloq }).gerar("x", TRECHO_JSON_SCHEMA); } catch (e) { eBloq = e instanceof ErroRecusaProvedor; }
  assert(eBloq, "blockReason → erro tipado de recusa");
  let eSafety = false;
  const { t: tSaf } = transporteFake({ candidates: [{ finishReason: "SAFETY" }] });
  try { await criarAdaptadorGemini({ modelo: "gemini-flash", transporte: tSaf }).gerar("x", TRECHO_JSON_SCHEMA); } catch (e) { eSafety = e instanceof ErroRecusaProvedor; }
  assert(eSafety, "finishReason SAFETY → erro tipado de recusa");
}

console.log("\n=== adaptador OpenAI (05-07) ===");
{
  const ok = { choices: [{ message: { content: TRECHO_OK } }] };
  const { t, capturas } = transporteFake(ok);
  const oai = criarAdaptadorOpenAI({ modelo: "gpt-mini", transporte: t });
  const trecho = await oai.gerar("conte a abertura", TRECHO_JSON_SCHEMA, { system: PROMPT_BASE });
  assert(trecho.texto.indexOf("luzinha") >= 0, "resposta ok vira Trecho válido");
  const rf = capturas[0]!.corpo["response_format"] as { type?: string; json_schema?: { strict?: boolean } };
  assert(!!rf && rf.type === "json_schema" && !!rf.json_schema && rf.json_schema.strict === true, "structured output estrito com schema do Trecho");
  assert(!("temperature" in capturas[0]!.corpo), "sem temperature no corpo");
  let eRef = false;
  const { t: tRef } = transporteFake({ choices: [{ message: { refusal: "não posso", content: TRECHO_OK } }] });
  try { await criarAdaptadorOpenAI({ modelo: "gpt-mini", transporte: tRef }).gerar("x", TRECHO_JSON_SCHEMA); } catch (e) { eRef = e instanceof ErroRecusaProvedor; }
  assert(eRef, "refusal → erro tipado ANTES do conteúdo");
}

console.log("\n=== selecionarAdaptador (05-04) — config do SA_AI ===");
{
  const cfg = (p: ConfigIaTenant["provedor"], m: string | null): ConfigIaTenant =>
    ({ provedor: p, modelo: m, cotaMensal: 100, custoMaxMensal: 10, fallback: null });
  const ok = { stop_reason: "end_turn", content: [{ type: "text", text: TRECHO_OK }] };
  const { t, capturas } = transporteFake(ok);
  const prov = selecionarAdaptador(cfg("claude", null), { transporte: t });
  const trecho = await prov.gerar("conte a abertura do quintal", TRECHO_JSON_SCHEMA);
  assert(trecho.ehFinal === false, "provedor selecionado gera Trecho");
  assert(capturas[0]!.corpo["model"] === MODELOS_POR_PROVEDOR.claude[0], "sem modelo na config → primeiro do catálogo");
  let eNull = false;
  try { selecionarAdaptador(cfg(null, null)); } catch { eNull = true; }
  assert(eNull, "config sem provedor → sem adaptador (throw)");
  const sujo = { choices: [{ message: { content: JSON.stringify({ texto: "veja www.perigo.com", ehFinal: false }) } }] };
  const { t: tSujo } = transporteFake(sujo);
  let guardou = false;
  try { await selecionarAdaptador(cfg("openai", "gpt-mini"), { transporte: tSujo }).gerar("conte", TRECHO_JSON_SCHEMA); } catch { guardou = true; }
  assert(guardou, "GUARD sempre no caminho: saída suja do adaptador é bloqueada");
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
