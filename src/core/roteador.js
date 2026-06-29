/**
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
