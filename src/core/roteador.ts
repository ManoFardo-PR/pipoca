/**
 * Pipoca — Roteador de telas
 * --------------------------
 * Stub mínimo para Etapa 0. Na Etapa 2 será conectado ao EstadoApp.tela
 * (camada CORE) e este módulo será substituído ou wrapado por lá.
 *
 * As telas nunca chamam go(n) ou setState diretamente — elas chamam
 * irParaTela(n), garantindo que o ponto de roteamento seja único.
 */

let _tela = 1;
const _subs: Set<() => void> = new Set();

/** Navega para a tela de número n (1–7). */
export function irParaTela(n: number): void {
  if (_tela === n) return;
  _tela = n;
  _subs.forEach((fn) => fn());
}

/** Retorna o número da tela atual. */
export function telaAtual(): number {
  return _tela;
}

/**
 * Assina mudanças de tela. Retorna a função de desinscrição.
 * Usado pelos componentes no componentDidMount/WillUnmount.
 */
export function onTelaChange(fn: () => void): () => void {
  _subs.add(fn);
  return () => _subs.delete(fn);
}
