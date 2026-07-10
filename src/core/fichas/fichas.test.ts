// Testes do lint de fichas (fase 10 da geração 2 — docs/plans02/fase10_modelo_de_fichas/10-05).
// Padrão da casa: asserts manuais, executado com `bun run`, encadeado no script `test`.
// Fixtures SINTÉTICAS (as fichas reais nascem na Etapa 2 e ganham bloco próprio então).
import { lintFichas } from "./lint_fichas.js";
import { ESQUEMA_FICHAS_V1 } from "./tipos.js";
import objetosReais from "../../../docs/fichas/objetos.v1.json";
import relacoesReais from "../../../docs/fichas/relacoes.quintal.v1.json";
import cenariosReais from "../../../docs/fichas/cenarios.v1.json";

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
  if (ok) {
    console.log(`  ✓ ${mensagem}`);
    passou++;
  } else {
    console.error(`  ✗ ${mensagem} — esperado ${String(esperado)}, veio ${String(real)}`);
    falhou++;
  }
}

// Fixture sintética VÁLIDA (sem dígrafos nh/lh/ch nem palavras-semente nos n1).
function base() {
  return {
    objetos: {
      esquema: ESQUEMA_FICHAS_V1,
      objetos: {
        gota: {
          genero: "f", numero: "sg",
          descricao: {
            n1: "uma gota de agua",
            n2: "uma gota de agua que brilha",
            n3: "uma gota de agua que brilha como conta de vidro",
            n4: "uma gota de agua miuda que brilha como conta de vidro, guardando um resto de luz",
          },
          sensacao: {
            dominante: "tato",
            registro: "frescor miudo",
            corpo: {
              n1: "o dedo toca a gota",
              n2: "o dedo toca a gota; o pe sente o frio",
              n3: "o dedo que toca a gota; o pe sentindo o frio da grama",
              n4: "o dedo que toca a gota devagar; o pe sentindo o frio da grama, quieta pra nao derrubar",
            },
          },
        },
        pedra: {
          genero: "f", numero: "sg",
          descricao: {
            n1: "uma pedra lisa",
            n2: "uma pedra lisa e fria",
            n3: "uma pedra lisa e fria, de beira de rio",
            n4: "uma pedra lisa e fria, dessas de beira de rio, que cabe fechada na mao",
          },
          sensacao: {
            dominante: "tato",
            registro: "peso bom",
            corpo: {
              n1: "a mao sente o frio da pedra",
              n2: "a mao sente o frio; os dedos apertam de leve",
              n3: "a mao que sente o frio; os dedos apertando de leve, medindo o peso",
              n4: "a mao que sente o frio; os dedos apertando de leve, medindo o peso bom de segurar",
            },
          },
        },
      },
    },
    relacoes: {
      esquema: ESQUEMA_FICHAS_V1,
      cenario: "quintal_teste",
      objeto_x_objeto: [
        {
          se: "tem:pedra",
          objeto: "gota",
          alvo: "pedra",
          interacao: {
            n1: "a gota pousa na pedra",
            n2: "a gota pousa na pedra e escorrega",
            n3: "a gota pousa na pedra fria e escorrega devagar",
            n4: "a gota pousa na pedra fria e escorrega devagar, deixando um risco de brilho",
          },
        },
      ],
      objeto_x_cenario: [
        {
          objeto: "gota",
          manifestacao: {
            n1: "a gota mora na ponta da grama",
            n2: "a gota mora na ponta da grama do quintal",
            n3: "a gota mora na ponta da grama, onde o quintal guarda o frio",
            n4: "a gota mora na ponta da grama, no canto onde o quintal guarda o frio da madrugada",
          },
        },
      ],
    },
    cenarios: {
      esquema: ESQUEMA_FICHAS_V1,
      cenarios: {
        quintal_teste: {
          nome: "quintal de teste",
          descricao: "um quintal pequeno, de teste, com grama e muro baixo",
          voz_do_contador: "o quintal fala baixo, como quem testa um segredo",
          sensacao_no_personagem: {
            n1: "frio bom no pe",
            n2: "um frio bom no pe, de grama de noite",
            n3: "um frio bom no pe, de grama de noite, que faz andar devagar",
            n4: "um frio bom no pe, de grama de noite, que faz andar devagar pra sentir tudo",
          },
        },
      },
    },
  };
}

const rodar = (f: ReturnType<typeof base>) => lintFichas(f.objetos, f.relacoes, f.cenarios);
const temErro = (r: { erros: string[] }, trecho: string) => r.erros.some((e) => e.includes(trecho));
const temAviso = (r: { avisos: string[] }, trecho: string) => r.avisos.some((a) => a.includes(trecho));

console.log("\nBLOCO 1 — catálogo válido");
{
  const r = rodar(base());
  assertEqual(r.erros.length, 0, "fixture válida: 0 erros");
  assertEqual(r.avisos.length, 0, "fixture válida: 0 avisos");
}

console.log("\nBLOCO 2 — esquema e malformação");
{
  const f = base();
  (f.objetos as { esquema: string }).esquema = "pipoca.outra-coisa.v9";
  const r = rodar(f);
  assert(temErro(r, "esquema desconhecido"), "esquema errado em objetos → erro imediato");
}
{
  const r = lintFichas(null, base().relacoes, base().cenarios);
  assert(temErro(r, "malformado"), "arquivo de objetos nulo → erro de malformação");
}

console.log("\nBLOCO 3 — E1 (4 níveis obrigatórios)");
{
  const f = base();
  delete (f.objetos.objetos.gota.descricao as Record<string, string>).n4;
  const r = rodar(f);
  assert(temErro(r, "objetos.gota.descricao: falta n4"), "descricao sem n4 dispara E1");
}
{
  const f = base();
  delete (f.objetos.objetos.pedra.sensacao.corpo as Record<string, string>).n2;
  const r = rodar(f);
  assert(temErro(r, "objetos.pedra.sensacao.corpo: falta n2"), "corpo sem n2 dispara E1");
}

console.log("\nBLOCO 4 — E2 (genero/numero)");
{
  const f = base();
  delete (f.objetos.objetos.gota as Record<string, unknown>).genero;
  const r = rodar(f);
  assert(temErro(r, "E2: objetos.gota: genero"), "sem genero dispara E2");
}
{
  const f = base();
  (f.objetos.objetos.pedra as Record<string, unknown>).numero = "xx";
  const r = rodar(f);
  assert(temErro(r, "E2: objetos.pedra: numero"), "numero inválido dispara E2");
}

console.log("\nBLOCO 5 — E3 (nada vazio)");
{
  const f = base();
  f.objetos.objetos.gota.descricao.n2 = "   ";
  const r = rodar(f);
  assert(temErro(r, "E3: objetos.gota.descricao.n2"), "descricao.n2 só espaços dispara E3");
}
{
  const f = base();
  f.objetos.objetos.gota.sensacao.dominante = "";
  const r = rodar(f);
  assert(temErro(r, "E3: objetos.gota.sensacao.dominante"), "dominante vazio dispara E3");
}
{
  const f = base();
  f.cenarios.cenarios.quintal_teste.descricao = "";
  const r = rodar(f);
  assert(temErro(r, "E3: cenarios.quintal_teste.descricao"), "descricao de cenário vazia dispara E3");
}

console.log("\nBLOCO 6 — E4 (UMA sensação no corpo.n1)");
{
  const f = base();
  f.objetos.objetos.gota.sensacao.corpo.n1 = "o dedo toca a gota; o pe sente o frio";
  const r = rodar(f);
  assert(temErro(r, "E4: objetos.gota.sensacao.corpo.n1"), 'corpo.n1 com ";" dispara E4');
}
{
  const r = rodar(base());
  assert(!temErro(r, "E4"), 'corpo.n2 com ";" NÃO dispara E4 (regra é só do n1)');
}

console.log("\nBLOCO 7 — E5 (tolerância a vizinho)");
{
  const f = base();
  f.objetos.objetos.gota.descricao.n2 = "uma gota que pousa na pedra";
  const r = rodar(f);
  assert(temErro(r, 'E5: objetos.gota.descricao.n2'), "descricao citando outro id do catálogo dispara E5");
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n2 = "uma gota na pedrada da sorte";
  const r = rodar(f);
  assert(!temErro(r, "E5"), "substring não dispara E5 (casa por palavra inteira)");
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n3 = "uma gota que cai na Pedra";
  const r = rodar(f);
  assert(temErro(r, "E5: objetos.gota.descricao.n3"), "E5 é insensível a caixa/acentos");
}

console.log("\nBLOCO 8 — relações (alvo/objeto/se/interacao)");
{
  const f = base();
  delete (f.relacoes.objeto_x_objeto[0] as Record<string, unknown>).alvo;
  const r = rodar(f);
  assert(temErro(r, 'alvo" ausente'), "relação sem alvo dispara erro (D4)");
}
{
  const f = base();
  (f.relacoes.objeto_x_objeto[0] as Record<string, unknown>).alvo = "sapo";
  const r = rodar(f);
  assert(temErro(r, 'alvo "sapo" fora do catálogo'), "alvo fora do catálogo dispara erro");
}
{
  const f = base();
  (f.relacoes.objeto_x_objeto[0] as Record<string, unknown>).alvo = "gota";
  const r = rodar(f);
  assert(temErro(r, "objeto e alvo idênticos"), "auto-relação dispara erro (guarda do tem:)");
}
{
  const f = base();
  (f.relacoes.objeto_x_objeto[0] as Record<string, unknown>).se = [];
  const r = rodar(f);
  assert(temErro(r, "array vazio nunca casa"), "se: [] dispara erro");
}
{
  const f = base();
  delete (f.relacoes.objeto_x_objeto[0].interacao as Record<string, string>).n3;
  const r = rodar(f);
  assert(temErro(r, "interacao: falta n3"), "interacao sem n3 dispara E1");
}

console.log("\nBLOCO 9 — manifestações e cenário");
{
  const f = base();
  (f.relacoes.objeto_x_cenario[0] as Record<string, unknown>).objeto = "sapo";
  const r = rodar(f);
  assert(temErro(r, 'objeto "sapo" fora do catálogo'), "manifestação de objeto fora do catálogo dispara erro");
}
{
  const f = base();
  delete (f.cenarios.cenarios.quintal_teste.sensacao_no_personagem as Record<string, string>).n1;
  const r = rodar(f);
  assert(temErro(r, "sensacao_no_personagem: falta n1"), "sensacao_no_personagem sem n1 dispara E1");
}
{
  const f = base();
  f.relacoes.cenario = "praia";
  const r = rodar(f);
  assert(temErro(r, 'cenário "praia" fora do catálogo'), "relacoes.cenario fora do catálogo dispara erro");
}

console.log("\nBLOCO 10 — A1 (avisos: semente + dígrafos; nunca bloqueiam)");
{
  const f = base();
  f.objetos.objetos.gota.descricao.n1 = "uma folha esvoaçante";
  const r = rodar(f);
  assert(temAviso(r, "lista-semente"), '"esvoaçante" no n1 dispara A1 (semente)');
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n1 = "um vento fresquinho";
  const r = rodar(f);
  assert(temAviso(r, "dígrafo nh"), '"fresquinho" no n1 dispara A1 (dígrafo nh)');
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n1 = "um vento fresquinho";
  const r = rodar(f);
  assertEqual(r.erros.length, 0, "A1 é aviso: não gera erro (gate = 0 ERROS)");
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n2 = "um vento fresquinho de tardezinha";
  const r = rodar(f);
  assert(!temAviso(r, "descricao.n2"), "A1 só olha o n1 (n2 com dígrafo não avisa)");
}
{
  // Allow-list NOMINAL (veredito da Parada Dura 1): imagens canônicas não avisam;
  // palavra NOVA com dígrafo continua avisando (a regra segue viva).
  const f = base();
  f.objetos.objetos.gota.descricao.n1 = "uma luzinha na folha";
  f.objetos.objetos.gota.sensacao.corpo.n1 = "os olhos seguem a gota";
  const r = rodar(f);
  assertEqual(r.avisos.length, 0, "allow-list A1: luzinha/folha/olhos não avisam");
}

console.log("\nBLOCO 10b — A2 (flexão de gênero da protagonista; aviso, não bloqueia)");
{
  const f = base();
  f.objetos.objetos.gota.sensacao.corpo.n1 = "ficar quieta tambem";
  const r = rodar(f);
  assert(temAviso(r, "posição predicativa"), '"ficar quieta também" dispara A2');
  assertEqual(r.erros.length, 0, "A2 é aviso: não gera erro");
}
{
  const f = base();
  f.objetos.objetos.gota.sensacao.corpo.n2 = "o pe sente os pes descalços na grama";
  const r = rodar(f);
  assert(!temAviso(r, "A2"), '"pés descalços" passa (flexiona com o substantivo)');
}
{
  const f = base();
  f.objetos.objetos.gota.descricao.n3 = "uma luz de prata macia e quieta";
  const r = rodar(f);
  assert(!temAviso(r, "A2"), '"luz de prata macia e quieta" passa (qualifica a luz)');
}
{
  const f = base();
  f.relacoes.objeto_x_objeto[0].interacao.n2 = "a gota pousa na pedra, so pra ela";
  const r = rodar(f);
  assert(temAviso(r, 'referência com gênero à protagonista ("pra ela")'), '"pra ela" em interação dispara A2');
}
{
  const f = base();
  f.cenarios.cenarios.quintal_teste.sensacao_no_personagem.n2 = "um frio bom, presente dela";
  const r = rodar(f);
  assert(temAviso(r, '"dela"'), '"dela" no cenário dispara A2');
}

console.log("\nBLOCO 11 — fichas REAIS (docs/fichas/*.v1.json): gate pós-veredito = 0 ERROS · 0 AVISOS");
{
  const r = lintFichas(objetosReais, relacoesReais, cenariosReais);
  for (const e of r.erros) console.error(`    ERRO: ${e}`);
  for (const a of r.avisos) console.error(`    AVISO: ${a}`);
  assertEqual(r.erros.length, 0, "fichas reais: 0 erros");
  // Pós-veredito da Parada Dura 1 (2026-07-10): A1 canônicos allow-listed; A2 zerado.
  assertEqual(r.avisos.length, 0, "fichas reais: 0 avisos (A1 allow-listed; A2 zerado)");
  assert(Object.keys((objetosReais as { objetos: Record<string, unknown> }).objetos).length === 7, "catálogo com os 7 objetos do quintal");
}

console.log(`\nTotal: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`fichas.test.ts: ${falhou} asserts falharam`);
