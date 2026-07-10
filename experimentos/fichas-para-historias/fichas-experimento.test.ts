/**
 * Experimento fichas→histórias — testes SEM REDE do CICLO 2 (fase 12):
 * a cola entre a matriz do experimento e o pipeline real compor()+realizar().
 * A gramática/montador/Camada 1 do ciclo 1 estão em _andaime-arquivado/ e seus
 * casos vivem promovidos em src/core/{compositor,realizador}/*.test.ts.
 */

import objetosRaw from "../../docs/fichas/objetos.v1.json";
import relacoesRaw from "../../docs/fichas/relacoes.quintal.v1.json";
import cenariosRaw from "../../docs/fichas/cenarios.v1.json";
import type {
  ArquivoCenariosV1,
  ArquivoObjetosV1,
  ArquivoRelacoesV1,
} from "../../src/core/fichas/tipos.js";
import type { CatalogoFichas } from "../../src/core/compositor/pacote.js";
import { compor } from "../../src/core/compositor/compor.js";
import { realizar } from "../../src/core/realizador/realizar.js";
import { maximoPalavrasDoPacote, rodadaDoPacote } from "../../src/core/realizador/prompt_template.js";
import type { ProvedorRealizador } from "../../src/core/realizador/provedor_realizador.js";
import { ESTADOS_POR_CELULA, LINHA_TESTEMUNHA, montarMatriz } from "./matriz.js";
import { entradasDoEstado } from "./gerar.js";

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

const catalogos: CatalogoFichas = {
  objetos: objetosRaw as unknown as ArquivoObjetosV1,
  relacoes: relacoesRaw as unknown as ArquivoRelacoesV1,
  cenarios: cenariosRaw as unknown as ArquivoCenariosV1,
};

console.log("=== BLOCO 1 — Matriz: cheia e amostra (prefixo, mesmos seeds) ===");
{
  const cheia = montarMatriz(0.4, 42);
  assert(cheia.length === 4 * 4 * ESTADOS_POR_CELULA + 1, `matriz cheia: ${cheia.length} estados (96 + testemunha)`);
  const testemunha = cheia[cheia.length - 1]!;
  assert(testemunha.testemunha === true && testemunha.linha.join(",") === LINHA_TESTEMUNHA.join(","), "testemunha R4×n3 com a linha da tira real");
  const amostra = montarMatriz(0.4, 42, 3);
  assert(amostra.length === 4 * 4 * 3 + 1, `amostra (3/célula): ${amostra.length} estados (48 + testemunha)`);
  const idsAmostra = new Set(amostra.map((e) => e.id));
  const prefixo = cheia.filter((e) => idsAmostra.has(e.id));
  assert(
    prefixo.length === amostra.length &&
      prefixo.every((e, i) => e.id === amostra[i]!.id && e.seed === amostra[i]!.seed && e.linha.join() === amostra[i]!.linha.join()),
    "amostra é PREFIXO da matriz cheia (mesmos ids/seeds/linhas)"
  );
  const r4 = cheia.filter((e) => e.rodada === 4 && !e.testemunha);
  assert(r4.every((e) => e.linha.includes("orvalho") && e.linha.length === 6), "R4: orvalho inserido no miolo, linha de 6");
}

console.log("\n=== BLOCO 2 — Cola estado→pipeline real: compor com fichas reais ===");
{
  const estados = montarMatriz(0.4, 42);
  let pacotesOk = 0;
  for (const estado of estados) {
    const { estadoCompositor, perfil } = entradasDoEstado(estado);
    const pacote = compor(estadoCompositor, catalogos, perfil);
    const beatsOk = pacote.beats.map((b) => b.objeto).join(",") === estado.linha.join(",");
    const nivelOk = pacote.nivel === estado.nivel;
    const nomeOk = pacote.personagem.nome === estado.personagem && pacote.personagem.genero === estado.genero;
    const ecoOk = pacote.eco === null; // desfecho convergente (decisão do ciclo 2)
    if (beatsOk && nivelOk && nomeOk && ecoOk) pacotesOk++;
  }
  assert(pacotesOk === estados.length, `compor() aceita TODOS os ${estados.length} estados da matriz (beats ≡ linha, eco null)`);

  const r1n1 = estados.find((e) => e.rodada === 1 && e.nivel === "n1")!;
  const entradasR1n1 = entradasDoEstado(r1n1);
  const pacoteR1n1 = compor(entradasR1n1.estadoCompositor, catalogos, entradasR1n1.perfil);
  assert(rodadaDoPacote(pacoteR1n1) === 1 && maximoPalavrasDoPacote(pacoteR1n1) === 31, "R1×n1: rodada derivada 1, máximo canônico 31");
  const estadoTest = estados[estados.length - 1]!;
  const entradasTest = entradasDoEstado(estadoTest);
  const pacoteTest = compor(entradasTest.estadoCompositor, catalogos, entradasTest.perfil);
  assert(rodadaDoPacote(pacoteTest) === 4 && maximoPalavrasDoPacote(pacoteTest) === 193, "testemunha (6 beats, n3): rodada derivada 4, máximo canônico 193");
}

console.log("\n=== BLOCO 3 — realizar() com provedor fake sobre Pacote real ===");
{
  const estados = montarMatriz(0.4, 42);
  const r1n2 = estados.find((e) => e.rodada === 1 && e.nivel === "n2" && e.genero === "f")!;
  const { estadoCompositor, perfil } = entradasDoEstado(r1n2);
  const pacote = compor(estadoCompositor, catalogos, perfil);
  // Texto fiel construído do próprio Pacote: âncora por objeto + corpo + nome.
  const NUCLEO: Record<string, string> = {
    vagalume: "uma luz pisca",
    frasco: "o pote de vidro brilha",
    vento: "o vento passa",
    folha: "uma folha desce",
    gato: "um gato aparece",
    lua: "a lua sobe",
    orvalho: "gotas na grama",
  };
  const frases = pacote.beats.map((b) => {
    const nucleo = NUCLEO[b.objeto] ?? b.objeto;
    return `${nucleo.charAt(0).toUpperCase()}${nucleo.slice(1)} e os olhos de ${perfil.nome} seguem.`;
  });
  const textoFiel = `${frases.slice(0, -1).join(" ")}\n\n${frases[frases.length - 1]}`;
  const fake: ProvedorRealizador = {
    nome: "fake",
    modeloPadrao: "fake-1",
    async gerarTexto() {
      return { texto: textoFiel, metadados: { modelo: "fake-1", tentativas: 1, duracaoMs: 1 } };
    },
  };
  const r = await realizar(pacote, { provedores: [fake], temperatura: 0.4 });
  assert(r.veredito.pass, `realizar() com fake fiel ⇒ PASS (motivos: ${r.veredito.motivos.join("; ") || "nenhum"})`);
  assert(r.origem.fonte === "llm" && r.origem.provedor === "fake", "origem sinalizada (llm/fake)");
  assert(r.metadados.chamadas === 1 && r.paragrafos.length === 2, "1 chamada; parágrafos segmentados");
}

console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) {
  throw new Error(`${falhou} teste(s) falharam`);
}
