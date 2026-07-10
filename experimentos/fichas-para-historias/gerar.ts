/**
 * Experimento fichas→histórias — Script 1 (gerador). Monta o prompt das FICHAS
 * e chama o Gemini, estado a estado, em lotes de 10 com persistência
 * incremental (padrão do experimento-beats): lote gravado a cada resposta;
 * lotes já em disco são pulados (retomada barata).
 * Uso: bun run experimentos/fichas-para-historias/gerar.ts
 * Env: GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash),
 *      EXP_TEMPERATURAS (default "0.4"), SEED_BASE (default 42).
 */

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { carregarEnv } from "../beats-para-paragrafos/carregar-env.js";
import objetosRaw from "../../docs/fichas/objetos.v1.json";
import relacoesRaw from "../../docs/fichas/relacoes.quintal.v1.json";
import cenariosRaw from "../../docs/fichas/cenarios.v1.json";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../../src/core/fichas/tipos.js";
import { gerarComGemini } from "./gemini-cliente-fichas.js";
import { montarPromptFichas } from "./montar-prompt.js";
import { montarMatriz } from "./matriz.js";
import type { ArquivoLoteGeracao, RegistroGeracao } from "./tipos.js";

const TAMANHO_LOTE = 10;

async function main(): Promise<void> {
  carregarEnv(join(import.meta.dir, "..", "..", ".env"));
  const chave = process.env["GEMINI_API_KEY"];
  if (!chave) {
    console.error("GEMINI_API_KEY ausente. Exporte a chave (ou .env na raiz) e rode de novo.");
    process.exitCode = 1;
    return;
  }
  const modelo = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
  const seedBase = process.env["SEED_BASE"] || "42";
  const temperaturas = (process.env["EXP_TEMPERATURAS"] || "0.4")
    .split(",")
    .map((t) => Number(t.trim()))
    .filter((t) => Number.isFinite(t));

  const catalogos = {
    objetos: objetosRaw as unknown as ArquivoObjetosV1,
    relacoes: relacoesRaw as unknown as ArquivoRelacoesV1,
    cenarios: cenariosRaw as unknown as ArquivoCenariosV1,
  };

  const dirGeracao = join(import.meta.dir, "saida", "geracao");
  await mkdir(dirGeracao, { recursive: true });
  const existentes = new Set(await readdir(dirGeracao));

  const inicioTotal = Date.now();
  let chamadas = 0;
  for (const temperatura of temperaturas) {
    const estados = montarMatriz(temperatura, seedBase);
    const totalLotes = Math.ceil(estados.length / TAMANHO_LOTE);
    console.log(`\n== temperatura ${temperatura} · ${estados.length} estados · ${totalLotes} lotes ==`);

    for (let lote = 1; lote <= totalLotes; lote++) {
      const nomeLote = `t${String(temperatura).replace(".", "_")}-lote-${String(lote).padStart(2, "0")}.json`;
      if (existentes.has(nomeLote)) {
        console.log(`   ${nomeLote}: já em disco — pulado (retomada)`);
        continue;
      }
      const fatia = estados.slice((lote - 1) * TAMANHO_LOTE, lote * TAMANHO_LOTE);
      const registros: RegistroGeracao[] = [];
      for (const estado of fatia) {
        const material = montarPromptFichas(estado, catalogos);
        const inicio = Date.now();
        const r = await gerarComGemini(material.system, material.user, { modelo, chave, temperatura });
        chamadas++;
        const duracaoMs = Date.now() - inicio;
        registros.push({
          estado,
          material: {
            palavrasMaterial: material.palavrasMaterial,
            paragrafosAlvo: material.paragrafosAlvo,
            palavrasPorParagrafo: material.palavrasPorParagrafo,
            relacoes: material.relacoesAtivas.map((a) => ({
              objeto: a.relacao.objeto,
              alvo: a.relacao.alvo,
              se: a.relacao.se,
            })),
          },
          resposta: {
            estadoId: estado.id,
            ok: r.ok,
            texto: r.texto,
            erro: r.erro,
            modelo,
            temperatura,
            tentativas: r.tentativas,
            duracaoMs,
          },
        });
        // Persistência incremental: o arquivo do lote é reescrito a cada resposta.
        const arquivo: ArquivoLoteGeracao = { lote, temperatura, tamanho: registros.length, registros };
        await writeFile(join(dirGeracao, nomeLote), JSON.stringify(arquivo, null, 2), "utf8");
        console.log(`   ${estado.id}: ${r.ok ? "ok" : `ERRO ${r.erro}`} (${duracaoMs}ms)`);
      }
    }
  }
  const minutos = ((Date.now() - inicioTotal) / 60000).toFixed(1);
  console.log(`\nGeração concluída: ${chamadas} chamadas novas em ${minutos}min. Saída: saida/geracao/`);
  console.log("Próximo passo: bun run experimentos/fichas-para-historias/avaliar/avaliar.ts");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
