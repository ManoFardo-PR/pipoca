/**
 * Experimento fichas→histórias — SMOKE: 2 chamadas reais (1 Gemini, 1 OpenAI)
 * para validar ids de modelo ANTES do lote. As chaves são do Manoel:
 *   export GEMINI_API_KEY=... ; export OPENAI_API_KEY=...   (ou .env na raiz)
 *   bun run experimentos/fichas-para-historias/smoke.ts
 */

import { join } from "node:path";
import { carregarEnv } from "../beats-para-paragrafos/carregar-env.js";
import { julgarPar } from "../beats-para-paragrafos/avaliar/camada2-juiz.js";
import { gerarComGemini } from "./gemini-cliente-fichas.js";

async function main(): Promise<void> {
  carregarEnv(join(import.meta.dir, "..", "..", ".env"));
  const chaveGemini = process.env["GEMINI_API_KEY"];
  const chaveOpenAI = process.env["OPENAI_API_KEY"];
  const modeloGemini = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
  const modeloOpenAI = process.env["OPENAI_MODEL"] || "gpt-4o-mini";

  if (!chaveGemini || !chaveOpenAI) {
    console.error("Faltam chaves. Defina GEMINI_API_KEY e OPENAI_API_KEY (shell ou .env na raiz) e rode:");
    console.error("  bun run experimentos/fichas-para-historias/smoke.ts");
    process.exitCode = 1;
    return;
  }

  let falhas = 0;

  console.log(`SMOKE 1/2 — Gemini (${modeloGemini})...`);
  const g = await gerarComGemini(
    "Devolva exatamente a palavra: pipoca. Nada mais.",
    "Qual é a palavra?",
    { modelo: modeloGemini, chave: chaveGemini, temperatura: 0 }
  );
  if (g.ok) console.log(`  ✓ Gemini respondeu ("${(g.texto ?? "").slice(0, 40)}")`);
  else {
    console.error(`  ✗ Gemini falhou: ${g.erro} — confira o id do modelo/chave`);
    falhas++;
  }

  console.log(`SMOKE 2/2 — OpenAI (${modeloOpenAI})...`);
  const j = await julgarPar("n2", "A noite veio. O quintal tem segredo.", "A noite chegou e o quintal guardou um segredo.", {
    modelo: modeloOpenAI,
    chave: chaveOpenAI,
    temperatura: 0.2,
  });
  if (j.ok) console.log(`  ✓ OpenAI respondeu (fluidez ${j.veredito?.fluidez})`);
  else {
    console.error(`  ✗ OpenAI falhou: ${j.erro} — confira o id do modelo/chave`);
    falhas++;
  }

  if (falhas === 0) {
    console.log("\nSMOKE OK — pode rodar o lote:");
    console.log("  bun run experimentos/fichas-para-historias/gerar.ts");
    console.log("  bun run experimentos/fichas-para-historias/avaliar/avaliar.ts");
  } else {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
