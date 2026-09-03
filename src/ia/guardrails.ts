/**
 * [guardrails.ts] — filtros de segurança infantil de entrada e saída, sempre
 *   no caminho da IA, independentes de provedor.
 *
 * PAPEL: core-lógica (orquestração de IA · GERAÇÃO 1 · GUARD)
 * POR QUE EXISTE: nada inseguro pode chegar à criança; envolve qualquer
 *   provedor (decorator) filtrando prompt antes e Trecho depois, e degrada
 *   por throw quando viola.
 * ENTRA: prompt (string) e Trecho a filtrar; RESULTADO com permitir/motivo.
 * SAI: Guardrails {filtrarEntrada, filtrarSaida} e envolverComGuardrails, que
 *   embrulha um GeradorDeTrecho e lança em caso de violação.
 * CHAMA: ../core/grafo/tipos.js:Trecho (só tipos; sem rede).
 * É CHAMADO POR: ia/adaptadores/selecionar.ts (envolverComGuardrails), ia/ia.test.ts.
 * RODA POR: boot do app (via pipoca.bundle.js) e testes; os testes das suítes que o importam
 *   (dentro de `bun run test`).
 * CUIDADO: cliente KEYLESS — nenhuma chave de provedor vive aqui (nem em src/):
 *   a credencial mora nos secrets da Edge Function proxy-ia. Violação → throw
 *   (degrada p/ Motor A), NÃO reformula no MVP. Motivos/logs SEM PII: só a categoria.
 *
 * — detalhe preservado —
 * Pipoca — Guardrails de conteúdo infantil (GUARD) · doc fase05-05-08
 * --------------------------------------------------------------------
 * Filtros de entrada/saída INDEPENDENTES de provedor, sempre no caminho
 * (AIPROV → GUARD → adaptador) via `envolverComGuardrails` (decorator).
 * Violação → throw no caminho async → orquestrador/Motor B degradam
 * para o Motor A (nada inseguro chega à criança).
 * Motivos/logs SEM PII: citam a categoria, nunca o conteúdo bloqueado.
 * `trechoReformulado` existe no contrato mas o MVP não reformula —
 * sempre degrada (registrado no selo do doc).
 */

import type { Trecho } from "../core/grafo/tipos.js";

export interface ResultadoFiltro {
  permitir: boolean;
  motivo?: string; // categoria da violação — nunca o conteúdo em si
  trechoReformulado?: Trecho; // não usado no MVP (degrada em vez de reescrever)
}

export interface Guardrails {
  filtrarEntrada(prompt: string): ResultadoFiltro;
  filtrarSaida(trecho: Trecho): ResultadoFiltro;
}

/** Teto de tamanho da saída — a regra de ouro pede texto curto p/ o portão. */
const MAX_CHARS_SAIDA = 700;

/**
 * Blocklist mínima PT-BR (violência gráfica · medo extremo · temas adultos),
 * comparada SEM acentos e por PALAVRA INTEIRA (evita falso positivo tipo
 * "armário" ⊃ "arma"); os prefixos cobrem famílias inteiras (assassin…).
 */
const RE_TERMOS_BLOQUEADOS = new RegExp(
  "\\b(?:matar|morrer|morte|mortes|sangue|armas?|tiros?|facadas?|" + // violência gráfica
    "terror|pavor|pesadelos?|demonios?|" + // medo extremo
    "cervejas?|vodka|cigarros?|drogas?|sexo|nudez|apostas?)\\b" + // temas adultos
    "|\\b(?:assassin|violenc)" // prefixos: assassino/assassinato, violência/violento…
);

const RE_URL = /https?:\/\/|www\./i;
const RE_EMAIL = /\S+@\S+\.\S+/;
const RE_TELEFONE = /\b\d{4,5}[-\s]\d{4}\b|\d{8,}/;

/** Normaliza para comparação: minúsculas e sem acentos (NFD + remoção das marcas combinantes). */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function categoriaProibida(texto: string): string | null {
  if (RE_URL.test(texto)) return "link";
  if (RE_EMAIL.test(texto)) return "dado pessoal (e-mail)";
  if (RE_TELEFONE.test(texto)) return "dado pessoal (telefone)";
  if (RE_TERMOS_BLOQUEADOS.test(normalizar(texto))) return "termo impróprio para crianças";
  return null;
}

export function criarGuardrails(): Guardrails {
  return {
    filtrarEntrada(prompt: string): ResultadoFiltro {
      if (!prompt || prompt.trim() === "") return { permitir: false, motivo: "prompt vazio" };
      const cat = categoriaProibida(prompt);
      if (cat) return { permitir: false, motivo: cat };
      return { permitir: true };
    },
    filtrarSaida(trecho: Trecho): ResultadoFiltro {
      const texto = trecho && typeof trecho.texto === "string" ? trecho.texto : "";
      if (texto.trim() === "") return { permitir: false, motivo: "texto vazio" };
      if (texto.length > MAX_CHARS_SAIDA) return { permitir: false, motivo: "texto longo demais para o portão" };
      const cat = categoriaProibida(texto);
      if (cat) return { permitir: false, motivo: cat };
      return { permitir: true };
    },
  };
}

/**
 * Forma estrutural do ProvedorIA (05-04) — declarada aqui para evitar
 * dependência circular; provedor.ts é compatível por estrutura.
 */
export interface GeradorDeTrecho {
  gerar(prompt: string, schema: unknown, opts?: unknown): Promise<Trecho>;
}

/**
 * Decorator que garante GUARD no caminho: filtra a entrada ANTES de chamar
 * o provedor e a saída ANTES de devolver. Violação → throw (degradação).
 */
export function envolverComGuardrails(provedor: GeradorDeTrecho, guardrails?: Guardrails): GeradorDeTrecho {
  const g = guardrails || criarGuardrails();
  return {
    async gerar(prompt: string, schema: unknown, opts?: unknown): Promise<Trecho> {
      const entrada = g.filtrarEntrada(prompt);
      if (!entrada.permitir) {
        throw new Error("guardrails: entrada bloqueada (" + (entrada.motivo || "regra de segurança") + ")");
      }
      const trecho = await provedor.gerar(prompt, schema, opts);
      const saida = g.filtrarSaida(trecho);
      if (!saida.permitir) {
        throw new Error("guardrails: saída bloqueada (" + (saida.motivo || "regra de segurança") + ")");
      }
      return saida.trechoReformulado || trecho;
    },
  };
}
