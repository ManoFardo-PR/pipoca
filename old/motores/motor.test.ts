/**
 * Pipoca — Testes do motor narrativo (motor.test.ts)
 * ---------------------------------------------------
 * Fixtures A e B de fase00-00-21. Rodam sem IA, ASR ou UI.
 * Execute com: bun run src/motores/motor.test.ts
 */

import { MotorGrafoAutoral } from "./motor_a.js";
import { MotorIA } from "./motor_ia.js";
import type { MotorNarrativa, ModoDesfecho, Nivel } from "./contrato.js";
import { criarProvedorSimulado } from "../ia/simulado.js";
import { validarGrafo } from "../core/grafo/validarGrafo.js";
import { criarValidadorOrdem } from "./validador_ordem.js";
import grafoRaw from "../dados/quintal_grafo.json" with { type: "json" };

const grafo = validarGrafo(grafoRaw);
const motor = new MotorGrafoAutoral(grafo);

// Helper das fixtures: monta a narrativa completa (abertura → objetos → desfecho).
// Era src/motores/jogar.ts (hoje em old/) — inlinado por ser exclusivo destes testes.
function jogar(m: MotorNarrativa, objetos: string[], modo: ModoDesfecho, nivel: Nivel): string {
  const historia: string[] = [];
  const linhas: string[] = [m.abertura(nivel).texto];
  for (const id of objetos) {
    const t = m.aoAdicionarObjeto(historia, id, nivel);
    historia.push(id);
    linhas.push(t.texto);
  }
  linhas.push(m.desfecho(historia, modo, nivel).texto);
  return linhas.map((l) => "— " + l).join("\n");
}

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

function assertEqual<T>(real: T, esperado: T, mensagem: string): void {
  const ok = real === esperado;
  if (!ok) {
    console.error(`  ✗ ${mensagem}`);
    console.error(`    esperado: ${JSON.stringify(esperado)}`);
    console.error(`    recebido: ${JSON.stringify(real)}`);
    falhou++;
  } else {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  }
}

console.log("\n=== FIXTURE A — Trajetória convergente: vagalume → frasco → vento ===");
{
  const resultado = jogar(motor, ["vagalume", "frasco", "vento"], "convergente", "n3");

  assert(resultado.includes("Quando a noite chegou"), "abertura n3 presente");
  assert(resultado.includes("luzinha piscando"), "vagalume (gatilho) presente");
  assert(resultado.includes("casinha de vidro pro vaga-lume morar"), "frasco com regra tem:vagalume ativa");
  assert(resultado.includes("vaga-lume estava seguro na casinha de vidro"), "vento com regra tem:frasco ativa");
  assert(resultado.includes("vaga-lume acendeu a noite toda"), "desfecho convergente presente");
  assert(!resultado.includes("undefined"), "sem undefined no texto");

  const desfecho = motor.desfecho(["vagalume", "frasco", "vento"], "convergente", "n3");
  assert(desfecho.ehFinal === true, "desfecho convergente: ehFinal=true");
  assertEqual(desfecho.texto, "O vaga-lume acendeu a noite toda, e a Joana foi dormir sorrindo.", "texto convergente n3 exato");
}

console.log("\n=== FIXTURE B — Trajetória aberta: vagalume → gato → coruja ===");
{
  const resultado = jogar(motor, ["vagalume", "gato", "coruja"], "aberto", "n3");

  assert(resultado.includes("Quando a noite chegou"), "abertura n3 presente");
  assert(resultado.includes("luzinha piscando"), "vagalume (gatilho) presente");
  assert(resultado.includes("gato pulou atrás da luzinha, brincalhão"), "gato com regra tem:vagalume ativa");
  assert(resultado.includes("coruja desceu mais perto pra espiar"), "coruja com regra tem:vagalume ativa");
  assert(resultado.includes("A coruja e o vaga-lume viraram amigos"), "desfecho aberto:coruja presente");

  const desfecho = motor.desfecho(["vagalume", "gato", "coruja"], "aberto", "n3");
  assert(desfecho.ehFinal === true, "desfecho aberto: ehFinal=true");
  assertEqual(
    desfecho.texto,
    "A coruja e o vaga-lume viraram amigos e cuidaram da noite juntos.",
    "texto aberto:coruja n3 exato"
  );
}

console.log("\n=== Degradação aberto → convergente (objeto sem ramo aberto) ===");
{
  // "vagalume" (nucleo) não tem entrada em desfechos.aberto → cai no convergente
  const desfecho = motor.desfecho(["frasco", "vagalume"], "aberto", "n3");
  assertEqual(
    desfecho.texto,
    "O vaga-lume acendeu a noite toda, e a Joana foi dormir sorrindo.",
    "vagalume (nucleo) como último objeto cai no convergente (degradação segura)"
  );
  assert(desfecho.ehFinal === true, "ehFinal=true na degradação");
}

console.log("\n=== avaliaCondicao — operador desconhecido ===");
{
  const trecho = motor.aoAdicionarObjeto([], "vagalume", "n1");
  assertEqual(trecho.texto, "Uma luz. No mato. Pisca, pisca.", "vagalume sem regras usa gatilho");
  assert(!trecho.ehFinal, "aoAdicionarObjeto: ehFinal=false");
}

console.log("\n=== objetoId inexistente → Trecho vazio ===");
{
  const trecho = motor.aoAdicionarObjeto([], "fantasma", "n1");
  assertEqual(trecho.texto, "", "id desconhecido retorna texto vazio");
  assert(!trecho.ehFinal, "id desconhecido: ehFinal=false");
}

console.log("\n=== ValidadorOrdem ===");
{
  const validador = criarValidadorOrdem(grafo.cenario);
  const ordem = validador.ordemCanonica();
  assertEqual(ordem[0], "vagalume", "ordemCanonica[0] = vagalume (da ordem_canonica)");
  assertEqual(ordem[1], "frasco", "ordemCanonica[1] = frasco");
  assertEqual(ordem[2], "vento", "ordemCanonica[2] = vento");

  const ok = validador.validar(["vagalume", "frasco", "vento"]);
  assert(ok.ok === true, "validar(['vagalume','frasco','vento']): ok=true (ordem completa, dependências satisfeitas)");

  const parcial = validador.validar(["vagalume", "frasco"]);
  assert(parcial.ok === true, "validar(['vagalume','frasco']): ok=true (ordem parcial consistente — mecânica incremental, critério 00-18)");

  const nok = validador.validar(["frasco", "vagalume"]);
  assert(nok.ok === false, "validar(['frasco','vagalume']): ok=false (frasco antes de vagalume)");
  assert(typeof nok.dica === "string" && nok.dica.length > 0, "dica acolhedora presente");
  assert(!nok.dica!.includes("errado") && !nok.dica!.includes("X"), "dica não contém linguagem negativa");

  const vazio = validador.validar([]);
  assert(vazio.ok === false, "validar([]): ok=false");
  assert(typeof vazio.dica === "string", "dica presente para lista vazia");
}

console.log("\n=== validarGrafo — rejeições ===");
{
  let rejeitou = false;
  try { validarGrafo({ esquema: "outro.v1" }); } catch { rejeitou = true; }
  assert(rejeitou, "rejeita esquema inválido");

  rejeitou = false;
  try {
    validarGrafo({
      ...grafoRaw,
      cenario: {
        ...grafoRaw.cenario,
        objetos: [
          ...grafoRaw.cenario.objetos,
          { ...grafoRaw.cenario.objetos[0] }
        ]
      }
    });
  } catch { rejeitou = true; }
  assert(rejeitou, "rejeita id duplicado");

  rejeitou = false;
  try {
    validarGrafo({
      ...grafoRaw,
      cenario: {
        ...grafoRaw.cenario,
        objetos: grafoRaw.cenario.objetos.map((o, i) =>
          i === 0 ? { ...o, papel_no_fim: "heroi" } : o
        )
      }
    });
  } catch { rejeitou = true; }
  assert(rejeitou, "rejeita papel_no_fim inválido");

  rejeitou = false;
  try {
    validarGrafo({
      ...grafoRaw,
      cenario: {
        ...grafoRaw.cenario,
        objetos: grafoRaw.cenario.objetos.map((o) =>
          o.id === "frasco"
            ? { ...o, regras: [{ se: "foi:vagalume", entao: o.regras[0].entao }] }
            : o
        )
      }
    });
  } catch { rejeitou = true; }
  assert(rejeitou, "rejeita regra.se malformada (foi:vagalume)");

  rejeitou = false;
  try {
    validarGrafo({
      ...grafoRaw,
      cenario: {
        ...grafoRaw.cenario,
        ordem_canonica: ["vagalume", "fantasma"]
      }
    });
  } catch { rejeitou = true; }
  assert(rejeitou, "rejeita ordem_canonica com id desconhecido");

  rejeitou = false;
  try {
    validarGrafo({
      ...grafoRaw,
      cenario: {
        ...grafoRaw.cenario,
        abertura: { n1: "ok", n2: "ok", n3: "ok" }
      }
    });
  } catch { rejeitou = true; }
  assert(rejeitou, "rejeita Fragmento4 incompleto (falta n4)");
}

console.log("\n=== Motor B (MotorIA · 05-01/05-03) — cache aquecido + degradação ===");
{
  // Falha total do provedor → saída IDÊNTICA ao Motor A (critério do 05-01).
  const provedorFalho = criarProvedorSimulado(grafo, { falhar: true });
  const mFalho = new MotorIA(provedorFalho, grafo, "convergente");
  await mFalho.aquecer([], "n3");
  assertEqual(
    jogar(mFalho, ["vagalume", "frasco", "vento"], "convergente", "n3"),
    jogar(motor, ["vagalume", "frasco", "vento"], "convergente", "n3"),
    "provedor falho: fixture A idêntica ao Motor A"
  );
  assertEqual(
    jogar(mFalho, ["vagalume", "gato", "coruja"], "aberto", "n3"),
    jogar(motor, ["vagalume", "gato", "coruja"], "aberto", "n3"),
    "provedor falho: fixture B idêntica ao Motor A"
  );

  // Miss memoizado: a resposta de uma chamada nunca troca de texto depois.
  const mMemo = new MotorIA(criarProvedorSimulado(grafo), grafo, "convergente");
  const antes = mMemo.abertura("n2").texto;
  await mMemo.aquecer([], "n2");
  assertEqual(mMemo.abertura("n2").texto, antes, "miss memoizado: abertura não muda após o aquecimento");

  // Aquecido: os trechos vêm da IA (simulado ✨) e o contrato se mantém.
  const mIA = new MotorIA(criarProvedorSimulado(grafo), grafo, "convergente");
  await mIA.aquecer([], "n3");
  const ab = mIA.abertura("n3");
  assert(ab.texto.indexOf("✨") === 0 && ab.ehFinal === false, "abertura aquecida vem da IA, ehFinal=false");
  const obj = mIA.aoAdicionarObjeto([], "vagalume", "n3");
  assert(
    obj.texto.indexOf("✨") === 0 && obj.objetoId === "vagalume" && obj.ehFinal === false,
    "objeto aquecido: IA + objetoId ecoado pelo motor + ehFinal=false"
  );
  const ordemCompleta = grafo.cenario.ordem_canonica || [];
  const fim = mIA.desfecho(ordemCompleta, "convergente", "n3");
  assert(fim.texto.indexOf("✨") === 0 && fim.ehFinal === true, "desfecho aquecido (história completa): IA + ehFinal=true");
  assert(
    jogar(mIA, ordemCompleta, "convergente", "n3") !== jogar(motor, ordemCompleta, "convergente", "n3"),
    "história aquecida difere do Motor A (Motor B ativo de verdade)"
  );
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
