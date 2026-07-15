/**
 * [micro-sanidade.ts] — micro-lote de sanidade do experimento: gera 4 estados
 *   R1-n1 pelo andaime e IMPRIME os textos (barato antes do caro).
 *
 * PAPEL: experimento (arquivado)
 * POR QUE EXISTE: era o teste manual da recalibração C-1/C-2 antes do lote caro
 *   — hoje LEGADO preservado como registro: usa o andaime montar-prompt.js (não
 *   o prompt-template de produção). NÃO está mais no caminho ativo.
 * ENTRA: env GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash), SEED_BASE
 *   (default 42); fichas docs/fichas/*.v1.json; .env na raiz.
 * SAI: 4 textos no log + saida/geracao/_micro/micro-sanidade-r1n1.json (fora da
 *   grade do avaliador); process.exitCode = 1 se houver falha.
 * CHAMA: ./montar-prompt.js:{montarPromptFichas,contarPalavras},
 *   ../gemini-cliente-fichas.js:gerarComGemini, ../matriz.js:montarMatriz,
 *   ../../beats-para-paragrafos/carregar-env.js:carregarEnv, tipos de ../tipos.js.
 * É CHAMADO POR: entrypoint rodado à mão, hoje arquivado (ninguém importa).
 * RODA POR: `bun run experimentos/fichas-para-historias/_andaime-arquivado/micro-sanidade.ts`
 *   (o "Uso" abaixo cita o caminho pré-arquivamento).
 * CUIDADO: legado preservado como REGISTRO, fora do caminho ativo — usa o
 *   andaime (montar-prompt.js), não o pipeline de produção. GASTA API paga se
 *   rodado: chamadas reais ao Gemini via gerarComGemini. Escreve em
 *   saida/geracao/_micro/ (readdir do avaliador é não recursivo, ignora a subpasta).
 *
 * — detalhe preservado —
 * Experimento fichas→histórias — micro-lote de SANIDADE da recalibração (C-1/C-2):
 * gera SÓ 4 estados R1-n1 (2 Joana + 2 Pietro) com o orçamento proporcional e
 * IMPRIME os textos no log (barato antes do caro). Critério de prosseguir para
 * o lote completo: frases completas (artigos e verbos), tempo presente, sem
 * telegrama. Registro salvo em saida/geracao/_micro/ (subpasta ignorada pelo
 * avaliador — readdir não recursivo).
 * Uso: bun run experimentos/fichas-para-historias/micro-sanidade.ts
 * Env: GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash), SEED_BASE (default 42).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { carregarEnv } from "../../beats-para-paragrafos/carregar-env.js";
import objetosRaw from "../../../docs/fichas/objetos.v1.json";
import relacoesRaw from "../../../docs/fichas/relacoes.quintal.v1.json";
import cenariosRaw from "../../../docs/fichas/cenarios.v1.json";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../../../src/core/fichas/tipos.js";
import { gerarComGemini } from "../gemini-cliente-fichas.js";
import { montarPromptFichas, contarPalavras } from "./montar-prompt.js";
import { montarMatriz } from "../matriz.js";
import type { ArquivoLoteGeracao, RegistroGeracao } from "../tipos.js";

const TEMPERATURA = 0.4;

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

  const catalogos = {
    objetos: objetosRaw as unknown as ArquivoObjetosV1,
    relacoes: relacoesRaw as unknown as ArquivoRelacoesV1,
    cenarios: cenariosRaw as unknown as ArquivoCenariosV1,
  };

  // 4 estados R1-n1: as 2 primeiras Joana (f) + os 2 primeiros Pietro (m).
  const r1n1 = montarMatriz(TEMPERATURA, seedBase).filter((e) => e.rodada === 1 && e.nivel === "n1");
  const estados = [
    ...r1n1.filter((e) => e.genero === "f").slice(0, 2),
    ...r1n1.filter((e) => e.genero === "m").slice(0, 2),
  ];

  const dirMicro = join(import.meta.dir, "saida", "geracao", "_micro");
  await mkdir(dirMicro, { recursive: true });

  const registros: RegistroGeracao[] = [];
  let falhas = 0;
  for (const estado of estados) {
    const material = montarPromptFichas(estado, catalogos);
    const inicio = Date.now();
    const r = await gerarComGemini(material.system, material.user, { modelo, chave, temperatura: TEMPERATURA });
    const duracaoMs = Date.now() - inicio;
    if (!r.ok) falhas++;
    registros.push({
      estado,
      material: {
        palavrasMaterial: material.palavrasMaterial,
        alvoPalavras: material.alvoPalavras,
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
        temperatura: TEMPERATURA,
        tentativas: r.tentativas,
        duracaoMs,
        tokens: r.tokens,
      },
    });
    console.log(`\n===== ${estado.id} — ${estado.personagem} · linha ${estado.linha.join("→")} =====`);
    console.log(
      `material ${material.palavrasMaterial} palavras · alvo ${material.alvoPalavras} · saiu ${r.texto ? contarPalavras(r.texto) : 0} (${duracaoMs}ms)`
    );
    console.log(r.ok ? r.texto : `ERRO: ${r.erro}`);
  }

  const arquivo: ArquivoLoteGeracao = { lote: 0, temperatura: TEMPERATURA, tamanho: registros.length, registros };
  const caminho = join(dirMicro, "micro-sanidade-r1n1.json");
  await writeFile(caminho, JSON.stringify(arquivo, null, 2), "utf8");
  console.log(`\nRegistro do micro-lote em saida/geracao/_micro/micro-sanidade-r1n1.json (fora da grade).`);
  console.log(
    falhas === 0
      ? "Leia os 4 textos acima: frases completas + tempo presente + sem telegrama ⇒ pode rodar o lote completo."
      : `${falhas}/${estados.length} chamadas falharam — resolver antes do lote completo.`
  );
  if (falhas > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
