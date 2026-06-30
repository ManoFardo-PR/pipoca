/**
 * Pipoca — Modo do app (KIDMODE) · doc fase02-02-02
 * --------------------------------------------------
 * Fronteira criança/cuidador. NÃO confundir com `Modos` (Palco/Ateliê, desfecho, verificação,
 * iaLigada), que é configuração de narrativa. Aqui é só a visibilidade das superfícies adultas.
 *
 * Pura e sem estado próprio: o `modoAtual` vive na app (efêmero — recarregar reabre em "crianca",
 * o PIN protege a reentrada). A ÚNICA forma de virar "cuidador" é o sucesso do PINGATE (02-03).
 * Não toca motor/validador (lei do contrato).
 */

export type ModoApp = "crianca" | "cuidador";

/** Modo padrão ao abrir o app. */
export const MODO_PADRAO: ModoApp = "crianca";

/** Aterrissagem do modo criança (T2 — entrada da criança). */
export const TELA_CRIANCA = 2;

/**
 * A tela pedida é uma superfície adulta? O app passa SUA lista (Onboarding/PC_*),
 * porque a numeração de telas pertence ao app, não a este núcleo.
 */
export function ehAdulta(tela: number, superficiesAdultas: readonly number[]): boolean {
  return superficiesAdultas.includes(tela);
}

/** No modo criança, superfícies adultas são inacessíveis; "cuidador" acessa tudo. */
export function podeNavegar(
  modo: ModoApp,
  tela: number,
  superficiesAdultas: readonly number[]
): boolean {
  if (modo === "cuidador") return true;
  return !ehAdulta(tela, superficiesAdultas);
}

/**
 * Guarda de rota: devolve a tela permitida. No modo criança, um pedido a uma superfície
 * adulta é redirecionado à T2 (sem mensagem assustadora — o chamador só navega ao retorno).
 */
export function aplicarGuarda(
  modo: ModoApp,
  telaPedida: number,
  superficiesAdultas: readonly number[]
): number {
  return podeNavegar(modo, telaPedida, superficiesAdultas) ? telaPedida : TELA_CRIANCA;
}

/** Sucesso no PINGATE → libera o modo cuidador (única saída do modo criança). */
export function aoPassarPortao(): ModoApp {
  return "cuidador";
}

/** Voltar ao Pipoca / recarregar a página → modo criança (reentrada protegida pelo PIN). */
export function aoVoltarParaCrianca(): ModoApp {
  return "crianca";
}
