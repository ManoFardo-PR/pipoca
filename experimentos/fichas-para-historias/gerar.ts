/**
 * [gerar.ts] — gerador do experimento fichas→histórias (ciclo 2): dirige o
 *   pipeline REAL compor()+realizar() sobre a matriz de estados e grava os
 *   lotes de saída para o avaliador consumir.
 *
 * PAPEL: experimento (ciclo 2 / fase 12 · GASTA API paga)
 * POR QUE EXISTE: calibrar o realizador de produção em escala — roda a matriz
 *   inteira pelo compositor+realizador reais e mede a fidelidade (veredito do
 *   validador canônico), persistindo cada lote em disco para retomada.
 * ENTRA: env GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash),
 *   EXP_TEMPERATURAS (default "0.4"), SEED_BASE (default 42),
 *   EXP_ESTADOS_POR_CELULA (default 6; <6 = modo AMOSTRA); fichas reais de
 *   docs/fichas/*.v1.json; .env na raiz.
 * SAI: lotes JSON em saida/geracao/ (ou saida/geracao/_amostra/ no modo
 *   amostra), reescritos a cada resposta (persistência incremental); resumo no
 *   log (chamadas, PASS camada 1, erros de provedor, leitura n1).
 * CHAMA: src/core/compositor/compor.js:compor, src/core/realizador/realizar.js:realizar,
 *   src/core/realizador/cascata.js:ErroRealizacaoEsgotada,
 *   src/core/realizador/provedor_realizador.js:criarProvedorGeminiRealizador,
 *   src/core/realizador/prompt_template.js:maximoPalavrasDoPacote,
 *   ./matriz.js:{montarMatriz,ESTADOS_POR_CELULA},
 *   ./gemini-cliente-fichas.js:transportePadrao,
 *   ../beats-para-paragrafos/carregar-env.js:carregarEnv.
 * É CHAMADO POR: entrypoint rodado à mão (import.meta.main); a export
 *   `entradasDoEstado` é importada por fichas-experimento.test.ts.
 * RODA POR: `bun run experimentos/fichas-para-historias/gerar.ts` (à mão).
 * CUIDADO: GASTA API paga — Gemini real via compor()+realizar(). A chave é lida
 *   AQUI e injetada por parâmetro; src/core/realizador NÃO lê env (invariante de
 *   segredos 12-02). Disjuntor: >20% de erros de PROVEDOR nos 2 primeiros lotes
 *   novos ⇒ process.exit(1) (retomável — lotes já em disco são pulados). FAIL de
 *   fidelidade NÃO conta como erro: é o dado que a calibração mede.
 *
 * — detalhe preservado —
 * Experimento fichas→histórias — Script 1 (gerador), CICLO 2 (fase 12):
 * consome o pipeline REAL — `compor()` (src/core/compositor) monta o Pacote a
 * partir das fichas e `realizar()` (src/core/realizador) chama o LLM com o
 * prompt-template de produção e valida com o validador de produção. O andaime
 * do ciclo 1 está em _andaime-arquivado/ (cumpriu o papel).
 * Lotes de 10 com persistência incremental e retomada; disjuntor de erros de
 * PROVEDOR (FAIL de fidelidade não conta — é dado de calibração).
 * Uso: bun run experimentos/fichas-para-historias/gerar.ts
 * Env: GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.5-flash),
 *      EXP_TEMPERATURAS (default "0.4"), SEED_BASE (default 42),
 *      EXP_ESTADOS_POR_CELULA (default 6; 3 = AMOSTRA do 12-05, gravada em
 *      saida/geracao/_amostra/ para não colidir com o lote cheio).
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
import { compor } from "../../src/core/compositor/compor.js";
import type { CatalogoFichas, EstadoCompositor, PerfilCompositor } from "../../src/core/compositor/pacote.js";
import { realizar } from "../../src/core/realizador/realizar.js";
import { ErroRealizacaoEsgotada } from "../../src/core/realizador/cascata.js";
import { criarProvedorGeminiRealizador } from "../../src/core/realizador/provedor_realizador.js";
import { maximoPalavrasDoPacote } from "../../src/core/realizador/prompt_template.js";
import { transportePadrao } from "./gemini-cliente-fichas.js";
import { ESTADOS_POR_CELULA, montarMatriz } from "./matriz.js";
import type { ArquivoLoteRealizacao, EstadoExperimento, RegistroRealizacao } from "./tipos.js";

const TAMANHO_LOTE = 10;
// Disjuntor: erro de PROVEDOR acima deste limiar nos 2 primeiros lotes NOVOS
// da execução ⇒ parar (retomável: lotes já salvos ficam em disco).
const LIMIAR_DISJUNTOR = 0.2;
const LOTES_DISJUNTOR = 2;

/** Estado do experimento → entradas do pipeline real (desfecho convergente:
 *  sem eco, comparável à grade do ciclo 1 — decisão registrada no PR). */
export function entradasDoEstado(estado: EstadoExperimento): {
  estadoCompositor: EstadoCompositor;
  perfil: PerfilCompositor;
} {
  return {
    estadoCompositor: {
      cenarioId: "quintal_anoitecer",
      linha: estado.linha,
      rodada: estado.rodada,
      desfecho: "convergente",
    },
    perfil: { nome: estado.personagem, genero: estado.genero, nivel: estado.nivel },
  };
}

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
  const estadosPorCelula = Number(process.env["EXP_ESTADOS_POR_CELULA"] || ESTADOS_POR_CELULA);
  const modoAmostra = estadosPorCelula !== ESTADOS_POR_CELULA;
  const temperaturas = (process.env["EXP_TEMPERATURAS"] || "0.4")
    .split(",")
    .map((t) => Number(t.trim()))
    .filter((t) => Number.isFinite(t));

  const catalogos: CatalogoFichas = {
    objetos: objetosRaw as unknown as ArquivoObjetosV1,
    relacoes: relacoesRaw as unknown as ArquivoRelacoesV1,
    cenarios: cenariosRaw as unknown as ArquivoCenariosV1,
  };
  // A chave é lida AQUI (script de calibração) e injetada por parâmetro —
  // src/core/realizador não lê env (invariante de segredos do 12-02).
  const provedor = criarProvedorGeminiRealizador({ modelo, apiKey: chave, transporte: transportePadrao() });

  const dirGeracao = modoAmostra
    ? join(import.meta.dir, "saida", "geracao", "_amostra")
    : join(import.meta.dir, "saida", "geracao");
  await mkdir(dirGeracao, { recursive: true });
  const existentes = new Set(await readdir(dirGeracao));
  if (modoAmostra) console.log(`MODO AMOSTRA (${estadosPorCelula}/célula) — saída em saida/geracao/_amostra/`);

  const inicioTotal = Date.now();
  let chamadas = 0;
  let errosProvedor = 0;
  let passC1 = 0;
  let totalComTexto = 0;
  let lotesNovos = 0;
  const textosN1: string[] = [];

  for (const temperatura of temperaturas) {
    const estados = montarMatriz(temperatura, seedBase, estadosPorCelula);
    const totalLotes = Math.ceil(estados.length / TAMANHO_LOTE);
    console.log(`\n== temperatura ${temperatura} · ${estados.length} estados · ${totalLotes} lotes ==`);

    for (let lote = 1; lote <= totalLotes; lote++) {
      const nomeLote = `t${String(temperatura).replace(".", "_")}-lote-${String(lote).padStart(2, "0")}.json`;
      if (existentes.has(nomeLote)) {
        console.log(`   ${nomeLote}: já em disco — pulado (retomada)`);
        continue;
      }
      const fatia = estados.slice((lote - 1) * TAMANHO_LOTE, lote * TAMANHO_LOTE);
      const registros: RegistroRealizacao[] = [];
      for (const estado of fatia) {
        const { estadoCompositor, perfil } = entradasDoEstado(estado);
        const pacote = compor(estadoCompositor, catalogos, perfil);
        const inicio = Date.now();
        let registro: RegistroRealizacao;
        try {
          // teto 2: 1 retry para falha TÉCNICA transitória; FAIL de fidelidade
          // não repete (é o dado que a calibração mede — sem fallback aqui).
          const r = await realizar(pacote, { provedores: [provedor], temperatura, teto_tentativas: 2 });
          chamadas += r.metadados.chamadas;
          registro = {
            estado,
            pacote: {
              maximoPalavras: maximoPalavrasDoPacote(pacote),
              paragrafos: pacote.restricoes.paragrafos,
              relacoes: pacote.beats.flatMap((b) => b.relacoes.map((rel) => ({ objeto: b.objeto, alvo: rel.alvo }))),
            },
            resposta: {
              estadoId: estado.id,
              ok: true,
              texto: r.texto,
              modelo,
              temperatura,
              chamadas: r.metadados.chamadas,
              duracaoMs: Date.now() - inicio,
              tokens: r.metadados.tokens,
            },
            veredito: r.veredito,
            origem: r.origem,
          };
        } catch (e) {
          if (e instanceof ErroRealizacaoEsgotada && e.ultima) {
            // Houve texto, mas o veredito reprovou (falha de FIDELIDADE) —
            // registrado como dado de calibração, nunca como sucesso.
            chamadas += e.ultima.metadados.chamadas;
            registro = {
              estado,
              pacote: {
                maximoPalavras: maximoPalavrasDoPacote(pacote),
                paragrafos: pacote.restricoes.paragrafos,
                relacoes: pacote.beats.flatMap((b) => b.relacoes.map((rel) => ({ objeto: b.objeto, alvo: rel.alvo }))),
              },
              resposta: {
                estadoId: estado.id,
                ok: true,
                texto: e.ultima.texto,
                modelo,
                temperatura,
                chamadas: e.ultima.metadados.chamadas,
                duracaoMs: Date.now() - inicio,
                tokens: e.ultima.metadados.tokens,
              },
              veredito: e.ultima.veredito,
              origem: e.ultima.origem,
            };
          } else {
            // Falha de PROVEDOR (rede/5xx/recusa) — conta no disjuntor.
            chamadas++;
            errosProvedor++;
            registro = {
              estado,
              pacote: {
                maximoPalavras: maximoPalavrasDoPacote(pacote),
                paragrafos: pacote.restricoes.paragrafos,
                relacoes: [],
              },
              resposta: {
                estadoId: estado.id,
                ok: false,
                erro: e instanceof Error ? e.message : String(e),
                modelo,
                temperatura,
                chamadas: 1,
                duracaoMs: Date.now() - inicio,
              },
            };
          }
        }
        if (registro.resposta.ok) {
          totalComTexto++;
          if (registro.veredito?.pass) passC1++;
          if (estado.nivel === "n1" && textosN1.length < 4 && registro.resposta.texto) {
            textosN1.push(`--- ${estado.id} (${registro.veredito?.pass ? "PASS" : "FAIL"}) ---\n${registro.resposta.texto}`);
          }
        }
        registros.push(registro);
        // Persistência incremental: o arquivo do lote é reescrito a cada resposta.
        const arquivo: ArquivoLoteRealizacao = { lote, temperatura, tamanho: registros.length, registros };
        await writeFile(join(dirGeracao, nomeLote), JSON.stringify(arquivo, null, 2), "utf8");
        const rotulo = registro.resposta.ok
          ? registro.veredito?.pass
            ? "PASS"
            : `FAIL (${registro.veredito?.motivos[0] ?? "?"})`
          : `ERRO ${registro.resposta.erro}`;
        console.log(`   ${estado.id}: ${rotulo} (${registro.resposta.duracaoMs}ms)`);
      }
      lotesNovos++;
      if (lotesNovos <= LOTES_DISJUNTOR && chamadas > 0 && errosProvedor / chamadas > LIMIAR_DISJUNTOR) {
        console.error(
          `\nDISJUNTOR: ${errosProvedor}/${chamadas} erros de provedor (${Math.round((errosProvedor / chamadas) * 100)}% > ${LIMIAR_DISJUNTOR * 100}%) nos ${lotesNovos} primeiros lotes novos. Parando — lotes salvos ficam em disco (retomada barata).`
        );
        process.exit(1);
      }
    }
  }
  const minutos = ((Date.now() - inicioTotal) / 60000).toFixed(1);
  console.log(
    `\nGeração concluída: ${chamadas} chamadas de LLM em ${minutos}min · Camada 1: ${passC1}/${totalComTexto} PASS (${totalComTexto > 0 ? Math.round((passC1 / totalComTexto) * 100) : 0}%) · erros de provedor: ${errosProvedor}`
  );
  if (textosN1.length > 0) {
    console.log(`\n=== LEITURA n1 (critério da amostra: sem telegrama, ≤2 frases/beat) ===\n${textosN1.join("\n\n")}`);
  }
  console.log("\nPróximo passo: bun run experimentos/fichas-para-historias/avaliar/avaliar.ts");
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
