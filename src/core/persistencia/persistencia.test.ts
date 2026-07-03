/**
 * Pipoca — Testes de schema + persistência (persistencia.test.ts)
 * ----------------------------------------------------------------
 * Valida que payloads corrompidos ou malformados são rejeitados na fronteira
 * de carregamento, nunca chegando ao runtime como estado inválido.
 * Execute com: bun run src/core/persistencia/persistencia.test.ts
 */

import {
  validarEnvelopePerfil,
  validarEnvelopeSave,
  carregarSaveComFallback,
  criarEnvelopePerfil,
  criarEnvelopeSave,
} from "../../dados/schemas.js";
import { estadoInicial } from "../estado.js";
import { criarPerfil } from "../perfil.js";

let passou = 0;
let falhou = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ✓ ${msg}`); passou++; }
  else { console.error(`  ✗ ${msg}`); falhou++; }
}

// --- Perfil ---
console.log("\n=== pipoca.perfil.v1 — validação ===");

const perfilOk = criarPerfil("uuid1", { nome: "Pingo", idade: 7, nivel: "n2", avatarId: "fubá" });
const envPerfilOk = criarEnvelopePerfil(perfilOk);

assert(validarEnvelopePerfil(envPerfilOk)?.id === "uuid1", "round-trip perfil válido");
assert(validarEnvelopePerfil(null) === null, "null → null");
assert(validarEnvelopePerfil({}) === null, "objeto vazio → null");
assert(validarEnvelopePerfil({ esquema: "outro.v1", perfil: perfilOk }) === null, "esquema errado → null");
assert(
  validarEnvelopePerfil({ esquema: "pipoca.perfil.v1", perfil: { ...perfilOk, idade: 99 } }) === null,
  "idade fora de range (99) → null"
);
assert(
  validarEnvelopePerfil({ esquema: "pipoca.perfil.v1", perfil: { ...perfilOk, nivel: "n99" } }) === null,
  "nivel inválido → null"
);
assert(
  validarEnvelopePerfil({ esquema: "pipoca.perfil.v1", perfil: { ...perfilOk, id: "" } }) === null,
  "id vazio → null"
);
assert(
  validarEnvelopePerfil({ esquema: "pipoca.perfil.v1", perfil: { ...perfilOk, nome: 42 } }) === null,
  "nome não-string → null"
);

// --- Save ---
console.log("\n=== pipoca.save.v1 — validação ===");

const saveOk = criarEnvelopeSave("uuid1", estadoInicial);
assert(validarEnvelopeSave(saveOk) !== null, "round-trip save válido");
assert(validarEnvelopeSave(null) === null, "null → null");
assert(validarEnvelopeSave({}) === null, "objeto vazio → null");
assert(validarEnvelopeSave({ esquema: "outro.v1", perfilId: "x", estado: estadoInicial }) === null, "esquema errado → null");
assert(validarEnvelopeSave({ esquema: "pipoca.save.v1" }) === null, "sem perfilId → null");
assert(validarEnvelopeSave({ esquema: "pipoca.save.v1", perfilId: "p1", estado: null }) === null, "estado null → null");
assert(
  validarEnvelopeSave({ esquema: "pipoca.save.v1", perfilId: "p1", estado: { ...estadoInicial, tela: "abc" } }) === null,
  "tela não-número → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, modos: { ...estadoInicial.modos, palco: "Invalido" } }
  }) === null,
  "modos.palco inválido → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, economia: { vagalumes: -1, poupado: 0 } }
  }) === null,
  "vagalumes negativo → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, historia: { cenarioId: 42, objetos: [], aberta: true } }
  }) === null,
  "historia.cenarioId não-string → null"
);

// --- carregarSaveComFallback ---
console.log("\n=== carregarSaveComFallback — fallback para estadoInicial ===");

assert(carregarSaveComFallback(saveOk).tela === 1, "save válido preserva estado");
assert(carregarSaveComFallback(null).tela === 1, "null → estadoInicial");
assert(carregarSaveComFallback("lixo textual").tela === 1, "string aleatória → estadoInicial");
assert(carregarSaveComFallback({ esquema: "pipoca.save.v1", perfilId: "x", estado: "corrompido" }).tela === 1,
  "estado string → estadoInicial");
assert(
  carregarSaveComFallback({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, modos: null }
  }).tela === 1,
  "modos null → estadoInicial"
);

// --- perfil slice dentro do save ---
console.log("\n=== save: slice perfil (null | Perfil válido) ===");
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, perfil: null }
  }) !== null,
  "perfil null → aceito (sem perfil selecionado)"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, perfil: perfilOk }
  }) !== null,
  "perfil válido → aceito"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, perfil: { ...perfilOk, nivel: "nInvalido" } }
  }) === null,
  "perfil com nivel inválido → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, perfil: { ...perfilOk, idade: 99 } }
  }) === null,
  "perfil com idade fora de range → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, perfil: "string" }
  }) === null,
  "perfil string → null"
);

// --- a11y slice dentro do save ---
console.log("\n=== save: slice a11y ===");
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, a11y: null }
  }) === null,
  "a11y null → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, a11y: { textScale: 9, dyslexia: false, syllable: false, contrast: false, reduceMotion: false } }
  }) === null,
  "a11y.textScale inválido (9) → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, a11y: { textScale: 1, dyslexia: "yes", syllable: false, contrast: false, reduceMotion: false } }
  }) === null,
  "a11y.dyslexia não-boolean → null"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, a11y: { textScale: 1.2, dyslexia: true, syllable: false, contrast: false, reduceMotion: true } }
  }) !== null,
  "a11y válido (textScale 1.2) → aceito"
);
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, a11y: {} }
  }) === null,
  "a11y objeto vazio → null"
);

// --- slice perfil ausente do objeto estado ---
assert(
  validarEnvelopeSave({
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { tela: 1, sessao: null, historia: estadoInicial.historia, economia: estadoInicial.economia, modos: estadoInicial.modos, a11y: estadoInicial.a11y }
    // perfil key missing
  }) === null,
  "perfil key ausente no estado → null"
);

// --- Payload correto mas com campo extra (deve aceitar) ---
console.log("\n=== payloads com campos extras ===");
const comCampoExtra = {
  ...saveOk,
  campoDesconhecido: "ignorar",
};
assert(validarEnvelopeSave(comCampoExtra) !== null, "campos extras ignorados — save aceito");

// --- Slices por criança (aditivo-opcionais, SANEADOS — nunca rejeitam) ---
console.log("\n=== save: slices por criança (limites/cardapio/cenarios/coleta) ===");

function saveCom(extras: Record<string, unknown>) {
  return {
    esquema: "pipoca.save.v1",
    perfilId: "p1",
    estado: { ...estadoInicial, ...extras },
  };
}

// Save v1 "antigo" (sem os slices novos) carrega e vem saneado para null/default.
const antigo = validarEnvelopeSave({
  esquema: "pipoca.save.v1",
  perfilId: "p1",
  estado: {
    tela: 2, perfil: null, sessao: null,
    historia: estadoInicial.historia, economia: estadoInicial.economia,
    modos: estadoInicial.modos, a11y: estadoInicial.a11y,
  },
});
assert(antigo !== null, "save v1 antigo (sem slices novos) → aceito");
assert(antigo?.limites === null && antigo?.cardapio === null, "slices ausentes → null (não configurado)");
assert(antigo?.cenariosLiberados === null && antigo?.coletaTelemetria === null, "cenarios/coleta ausentes → null");

// Round-trip com slices válidos preserva os valores.
const itens = [{ id: "parque", label: "30 min de parque", icon: "🛝", cost: 6 }];
const cheio = validarEnvelopeSave(saveCom({
  limites: { blocoMin: 20, tempoDeTelaMin: 45 },
  cardapio: itens,
  cenariosLiberados: ["quintal_anoitecer", "praia"],
  coletaTelemetria: false,
}));
assert(cheio?.limites?.blocoMin === 20 && cheio?.limites?.tempoDeTelaMin === 45, "limites válidos → preservados");
assert(cheio?.cardapio?.length === 1 && cheio?.cardapio?.[0]?.id === "parque", "cardápio válido → preservado");
assert(cheio?.cenariosLiberados?.length === 2, "cenários válidos → preservados");
assert(cheio?.coletaTelemetria === false, "coletaTelemetria false → preservada");

// Slice malformado NUNCA derruba o save — sanea para null/default.
const sujo = validarEnvelopeSave(saveCom({
  limites: "quebrado",
  cardapio: [{ id: "", label: 42 }, "lixo"],
  cenariosLiberados: [7, "", null],
  coletaTelemetria: "sim",
}));
assert(sujo !== null, "slices malformados → save AINDA aceito (saneamento)");
assert(sujo?.limites === null && sujo?.cardapio === null, "limites/cardápio malformados → null");
assert(sujo?.cenariosLiberados === null && sujo?.coletaTelemetria === null, "cenários/coleta malformados → null");

// Limites parciais saneiam para defaults internos (normalizarLimites).
const parcial = validarEnvelopeSave(saveCom({ limites: { blocoMin: 999 } }));
assert(parcial?.limites?.blocoMin === 15 && parcial?.limites?.tempoDeTelaMin === null,
  "limites parciais/inválidos → normalizados (blocoMin 15, sem teto)");

// Cardápio com mistura: itens válidos sobrevivem, inválidos caem.
const mistura = validarEnvelopeSave(saveCom({ cardapio: [...itens, { id: "x" }] }));
assert(mistura?.cardapio?.length === 1, "cardápio misto → só itens válidos sobrevivem");

console.log(`\n${"=".repeat(50)}`);
console.log(`Total: ${passou + falhou} | ✓ ${passou} passou | ✗ ${falhou} falhou`);
if (falhou > 0) throw new Error(`${falhou} teste(s) falharam`);
