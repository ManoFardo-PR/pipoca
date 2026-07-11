/**
 * Pipoca — Testes do módulo de geração (geracao.test.ts) · fase13-13-00/13-01
 * ---------------------------------------------------------------------------
 * Provedores FAKE (padrão do realizador.test.ts) sobre o estado do golden da
 * fase 11: política de rota por nível respeitada, fallback A+ v3 acionado nos
 * caminhos infelizes, origem SEMPRE sinalizada, perfil legado sem gênero ⇒
 * personagem canônico ("Joana", f). Sem rede.
 * Execute com: bun run src/core/geracao/geracao.test.ts
 */

import { montar, type CenarioV2, type EstadoComp } from "../composicao.js";
import type { CatalogoFichas, EstadoCompositor } from "../compositor/pacote.js";
import { compor } from "../compositor/compor.js";
import {
  ErroProvedorRealizador,
  ErroRecusaRealizador,
  type ProvedorRealizador,
} from "../realizador/provedor_realizador.js";
import { gerar, PERSONAGEM_CANONICO, ROTA_PADRAO } from "./geracao.js";
import objetosRaw from "../../../docs/fichas/objetos.v1.json" with { type: "json" };
import relacoesRaw from "../../../docs/fichas/relacoes.quintal.v1.json" with { type: "json" };
import cenariosRaw from "../../../docs/fichas/cenarios.v1.json" with { type: "json" };
import quintalV3Raw from "../../../docs/quintal.v3.json" with { type: "json" };

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
  if (real === esperado) {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  } else {
    console.error(`  ✗ ${mensagem}`);
    console.error(`    esperado: ${JSON.stringify(esperado)}`);
    console.error(`    recebido: ${JSON.stringify(real)}`);
    falhou++;
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const fichas = {
  objetos: objetosRaw,
  relacoes: relacoesRaw,
  cenarios: cenariosRaw,
} as unknown as CatalogoFichas;

/** O estado do golden da fase 11 (compositor.test.ts, bloco 6). */
const estadoGolden: EstadoCompositor = {
  cenarioId: "quintal_anoitecer",
  linha: ["vagalume", "frasco", "vento"],
  rodada: 2,
  desfecho: "aberto",
};

/** EstadoComp mínimo do v3 para o fallback (padrão do realizador.test.ts). */
const quintal = (quintalV3Raw as { cenario: unknown }).cenario as CenarioV2;
const estadoV3: EstadoComp = {
  cenarioId: quintal.id,
  rodada: 2,
  linha: ["vagalume", "frasco", "vento"],
  reveladosExtra: [],
  usados: [],
  convergiu: false,
  modos: { desfecho: "convergente" },
  cenario: quintal,
} as unknown as EstadoComp;
const estadoFallback = { estado: estadoV3, nivel: "n2" as const };
const TEXTO_A_MAIS = montar(estadoV3, "n2");

/** Texto FIEL ao Pacote do estadoGolden (o mesmo do realizador.test.ts). */
const TEXTO_FIEL = [
  "O quintal sussurra segredos. Joana sente a grama fria e quer ver. Uma luz pisca no fundo e os olhos de Joana seguem a pisca.",
  "Joana segura o pote de vidro com as duas mãos. O vento pula o muro e a pele de Joana sente o fresco.",
].join("\n\n");

type PassoFake = { tipo: "texto"; texto: string } | { tipo: "recusa" } | { tipo: "fatal" };

function provedorFake(nome: string, passos: PassoFake[], contador: { n: number }): ProvedorRealizador {
  let i = 0;
  return {
    nome,
    modeloPadrao: `${nome}-modelo`,
    async gerarTexto() {
      contador.n++;
      const passo = passos[Math.min(i, passos.length - 1)]!;
      i++;
      if (passo.tipo === "recusa") throw new ErroRecusaRealizador("SAFETY fake");
      if (passo.tipo === "fatal") throw new ErroProvedorRealizador("http_400", false);
      return { texto: passo.texto, metadados: { modelo: `${nome}-modelo`, tentativas: 1, duracaoMs: 1 } };
    },
  };
}

const perfil = { nome: "Joana", genero: "f" as const, nivel: "n2" as const };
const entradaBase = { estado: estadoGolden, fichas, perfil, estadoFallback };

// ─── 1. Caminho feliz: rota padrão = realizador, origem llm, pacote presente ──
console.log("=== BLOCO 1 — Caminho feliz (rota padrão = realizador) ===");
{
  assert(
    ROTA_PADRAO.n1 === "realizador" && ROTA_PADRAO.n2 === "realizador" &&
    ROTA_PADRAO.n3 === "realizador" && ROTA_PADRAO.n4 === "realizador",
    "ROTA_PADRAO roteia todos os níveis para o realizador (decisão executiva 2026-07-11)"
  );
  const c = { n: 0 };
  const r = await gerar(entradaBase, { provedores: [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL }], c)], atraso_retry_ms: 0 });
  assertEqual(r.origem.fonte, "llm", "origem.fonte = llm no caminho feliz");
  assertEqual(r.origem.rota, "realizador", "origem.rota sinaliza a rota escolhida");
  assertEqual(r.origem.provedor, "alpha", "origem.provedor sinalizado");
  assertEqual(r.texto, TEXTO_FIEL, "texto do LLM entregue");
  assertEqual(r.paragrafos.length, 2, "paragrafos segmentados");
  assert(r.veredito !== null && r.veredito.pass, "veredito PASS presente");
  assert(r.pacote !== null && r.pacote.esquema === "pipoca.pacote-composicao.v1", "pacote de origem devolvido (pacoteOrigem, 13-02)");
  assertEqual(
    JSON.stringify(r.pacote),
    JSON.stringify(compor(estadoGolden, fichas, perfil)),
    "pacote devolvido = compor(estado, fichas, perfil) — fronteiras respeitadas"
  );
  assertEqual(c.n, 1, "uma chamada de LLM");
}

// ─── 2. Política de rota por nível ───────────────────────────────────────────
console.log("=== BLOCO 2 — Política de rota por nível (uma linha para trocar) ===");
{
  const c = { n: 0 };
  // Trocar o n2 para A+ cru custa UMA linha de config:
  const r = await gerar(entradaBase, {
    rota: { n2: "ap_cru" },
    provedores: [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL }], c)],
  });
  assertEqual(c.n, 0, "rota ap_cru: NENHUMA chamada de LLM");
  assertEqual(r.origem.fonte, "fallback-a-mais", "origem.fonte = fallback-a-mais");
  assertEqual(r.origem.rota, "ap_cru", "origem.rota = ap_cru");
  assertEqual(r.texto, TEXTO_A_MAIS, "texto = montar() do v3 (determinístico)");
  assert(r.veredito === null, "sem veredito no caminho A+ direto");
  assert(r.pacote === null, "sem Pacote no caminho A+ direto");

  const c2 = { n: 0 };
  // Rota trocada em OUTRO nível não afeta este:
  const r2 = await gerar(entradaBase, {
    rota: { n1: "ap_cru" },
    provedores: [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL }], c2)],
    atraso_retry_ms: 0,
  });
  assertEqual(r2.origem.fonte, "llm", "rota de outro nível (n1) não afeta o n2");
  assertEqual(c2.n, 1, "n2 seguiu para o realizador");
}

// ─── 3. Caminhos infelizes → fallback A+ v3, origem sinalizada ───────────────
console.log("=== BLOCO 3 — Fallback A+ v3 nos caminhos infelizes ===");
{
  // Fichas não carregadas ⇒ v3 direto (13-00, edge-case).
  const r1 = await gerar({ ...entradaBase, fichas: null }, {});
  assertEqual(r1.origem.fonte, "fallback-a-mais", "fichas ausentes ⇒ fallback-a-mais");
  assert((r1.origem.motivo ?? "").includes("fichas"), "motivo sinaliza fichas não carregadas");
  assertEqual(r1.texto, TEXTO_A_MAIS, "texto v3 nas fichas ausentes");

  // Cascata esgotada (recusa + fatal) ⇒ fallback interno do realizador.
  const c1 = { n: 0 };
  const c2 = { n: 0 };
  const r2 = await gerar(entradaBase, {
    provedores: [provedorFake("alpha", [{ tipo: "recusa" }], c1), provedorFake("beta", [{ tipo: "fatal" }], c2)],
    atraso_retry_ms: 0,
  });
  assertEqual(r2.origem.fonte, "fallback-a-mais", "cascata esgotada ⇒ fallback-a-mais");
  assertEqual(r2.origem.rota, "realizador", "rota segue sinalizada no fallback");
  assert(r2.pacote !== null, "pacote preservado quando compor aconteceu");

  // Realizador REMOTO fora do ar (throw) ⇒ fallback local, nunca erro à criança.
  const r3 = await gerar(entradaBase, {
    realizador: async () => { throw new Error("edge fora do ar"); },
  });
  assertEqual(r3.origem.fonte, "fallback-a-mais", "realizador remoto caiu ⇒ fallback local");
  assert((r3.origem.motivo ?? "").includes("edge fora do ar"), "motivo carrega o erro para telemetria");
  assertEqual(r3.texto, TEXTO_A_MAIS, "o fallback NÃO depende do edge (13-03)");

  // Compor falhou (fichas corrompidas) ⇒ v3 com motivo explícito.
  const fichasQuebradas = { ...fichas, objetos: { esquema: "pipoca.fichas.v1", objetos: {} } } as unknown as CatalogoFichas;
  const r4 = await gerar({ ...entradaBase, fichas: fichasQuebradas }, {});
  assertEqual(r4.origem.fonte, "fallback-a-mais", "compor falhou ⇒ fallback-a-mais");
  assert((r4.origem.motivo ?? "").includes("compor falhou"), "motivo sinaliza a falha do compor");
}

// ─── 4. Fronteiras explícitas: erros de aplicação ────────────────────────────
console.log("=== BLOCO 4 — Erros explícitos nas fronteiras ===");
{
  let lancou = "";
  try {
    await gerar({ ...entradaBase, fichas: null, estadoFallback: null }, {});
  } catch (e) {
    lancou = e instanceof Error ? e.message : String(e);
  }
  assert(lancou.includes("sem estadoFallback"), "caminho A+ sem estadoFallback ⇒ erro explícito de aplicação");

  let lancou2 = "";
  try {
    await gerar({ ...entradaBase, perfil: { nivel: "n9" as never } }, {});
  } catch (e) {
    lancou2 = e instanceof Error ? e.message : String(e);
  }
  assert(lancou2.includes("nível válido"), "perfil sem nível válido ⇒ erro explícito");
}

// ─── 5. Perfil legado sem gênero ⇒ personagem canônico (13-01) ───────────────
console.log("=== BLOCO 5 — Default do perfil legado (personagem canônico) ===");
{
  assertEqual(PERSONAGEM_CANONICO.nome, "Joana", "personagem canônico = Joana");
  assertEqual(PERSONAGEM_CANONICO.genero, "f", "personagem canônico = feminino");
  const c = { n: 0 };
  const r = await gerar(
    { ...entradaBase, perfil: { nome: "Pietro", nivel: "n2" } }, // sem genero (legado)
    { provedores: [provedorFake("alpha", [{ tipo: "texto", texto: TEXTO_FIEL }], c)], atraso_retry_ms: 0 }
  );
  assert(r.pacote !== null && r.pacote.personagem.nome === "Joana" && r.pacote.personagem.genero === "f",
    "perfil sem gênero ⇒ Pacote com personagem canônico (nunca inferir do nome)");

  const r2 = await gerar(
    { ...entradaBase, perfil: { nome: "Pietro", genero: "m", nivel: "n2" } },
    { realizador: async () => ({ texto: "x", paragrafos: ["x"], veredito: { pass: true, motivos: [], avisos: [], presencaPorBeat: {} }, origem: { fonte: "llm" as const, provedor: "fake", modelo: "fake" }, metadados: { chamadas: 1, duracaoMs: 1 } }) }
  );
  assert(r2.pacote !== null && r2.pacote.personagem.nome === "Pietro" && r2.pacote.personagem.genero === "m",
    "perfil completo ⇒ personagem do perfil (Pietro, m)");
}

console.log(`\n${passou} passou · ${falhou} falhou`);
if (falhou > 0) throw new Error("geracao.test: falhas");
