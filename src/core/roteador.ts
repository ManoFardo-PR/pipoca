/**
 * [roteador.ts] — Stub ES-module do roteador de telas (Etapa 0): irParaTela / telaAtual /
 *   onTelaChange sobre um _tela + _subs (Set) no escopo do módulo.
 *
 * PAPEL: core-lógica (roteador de telas · stub da Etapa 0 · SEM importadores hoje)
 * POR QUE EXISTE: reservar o ponto único de roteamento previsto para a Etapa 2 (conectar a
 *   EstadoApp.tela), para que as telas chamem irParaTela(n) em vez de go(n)/setState.
 * ENTRA: n (número da tela 1–7) em irParaTela; fn em onTelaChange.
 * SAI: efeito — muda a tela ativa e notifica os assinantes (chamados SEM argumento).
 * CHAMA: nada.
 * É CHAMADO POR: ninguém importa este módulo hoje (Grep não achou `from ".../roteador"`). A
 *   navegação viva usa window.PipocaRoteador (src/core/roteador.js, a gêmea IIFE). Na Etapa 2
 *   seria substituído/wrapado pelo EstadoApp.tela.
 * RODA POR: destino previsto é o boot do app (via pipoca.bundle.js), mas hoje NÃO é importado — stub inerte.
 * CUIDADO: stub NÃO conectado — a rota real do app mora em EstadoApp.tela (estado.ts) e a
 *   navegação de tela no browser em window.PipocaRoteador (roteador.js). onTelaChange notifica
 *   sem argumento (fn()), diferente da gêmea .js (que chama fn(n)).
 *
 * — detalhe preservado —
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
