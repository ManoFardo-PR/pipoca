/**
 * [roteador.js] — Roteador de telas em IIFE para o browser: expõe window.PipocaRoteador
 *   (irParaTela / telaAtual / onTelaChange), carregado por <script> sem bundler.
 *
 * PAPEL: core-lógica (roteador de telas · browser build IIFE · gêmea de roteador.ts)
 * POR QUE EXISTE: dar às páginas HTML/telas um ponto único de navegação sem precisar de
 *   bundler nem import ES — basta o global window.PipocaRoteador.
 * ENTRA: n (número da tela 1–7) em irParaTela; fn assinante em onTelaChange.
 * SAI: efeito — muda a tela ativa e notifica os assinantes; global window.PipocaRoteador.
 * CHAMA: nada — self-contained; escreve em window.
 * É CHAMADO POR: index.html carrega via <script src="./src/core/roteador.js"> (linha 12); o
 *   global window.PipocaRoteador é consumido por src/app/estado.js, src/admin/estadoAdmin.js e
 *   as telas .dc.html.
 * RODA POR: boot do app — carregado como <script> em index.html (NÃO passa pelo bundler/pipoca.bundle.js).
 * CUIDADO: NÃO editar o CÓDIGO à mão — derive de src/core/roteador.ts (este comentário de topo é
 *   só documentação; nenhuma linha de código muda). Diferença REAL frente à gêmea .ts: aqui
 *   irParaTela passa `n` ao assinante (fn(n)); em roteador.ts o assinante é chamado sem argumento (fn()).
 *
 * — detalhe preservado —
 * Pipoca — Roteador de telas (browser build)
 * ------------------------------------------
 * Versão IIFE do roteador, carregável como <script> em index.html sem bundler.
 * Expõe window.PipocaRoteador com a mesma interface de src/core/roteador.ts.
 *
 * Na Etapa 2, quando EstadoApp.tela for criado (camada CORE), o CORE
 * chamará PipocaRoteador.irParaTela(n) para conduzir a navegação, e as
 * telas que assinaram onTelaChange() serão notificadas automaticamente.
 *
 * NÃO edite este arquivo manualmente — derive de src/core/roteador.ts.
 */
(function () {
  "use strict";

  var _tela = 1;
  var _subs = [];

  /**
   * Navega para a tela n (1–7).
   * Notifica todos os assinantes registrados via onTelaChange().
   */
  function irParaTela(n) {
    if (_tela === n) return;
    _tela = n;
    _subs.slice().forEach(function (fn) { fn(n); });
  }

  /** Retorna o número da tela atualmente ativa. */
  function telaAtual() {
    return _tela;
  }

  /**
   * Assina mudanças de tela.
   * Retorna a função de desinscrição — chame-a no componentWillUnmount.
   *
   * @param {function(number): void} fn
   * @returns {function(): void}
   */
  function onTelaChange(fn) {
    _subs.push(fn);
    return function () {
      _subs = _subs.filter(function (f) { return f !== fn; });
    };
  }

  window.PipocaRoteador = { irParaTela: irParaTela, telaAtual: telaAtual, onTelaChange: onTelaChange };
})();
