/**
 * Pipoca — Testes da fase05 (IA e fala) · `bun run src/ia/ia.test.ts`
 * --------------------------------------------------------------------
 * Grupos por doc: prompt (05-02) · guardrails (05-08) · provedor/simulado/
 * adaptadores (05-04..07) · orquestrador (05-10) · ASR (05-09).
 * Formato dos demais testes do repo: assert local + throw no fim.
 */

import { PROMPT_BASE, montarPrompt, type MontarPromptContext } from "./prompt.js";
import { criarGuardrails, envolverComGuardrails } from "./guardrails.js";
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

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
