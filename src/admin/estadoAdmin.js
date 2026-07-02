/**
 * Pipoca — Estado do SUPER ADMIN (browser, IIFE) · fase04
 * --------------------------------------------------------
 * Cérebro da plataforma do operador (admin.html). Espelho enxuto do padrão de
 * src/app/estado.js: window.PipocaAdmin é o seam que as telas SA_* leem e
 * escrevem. TODA navegação passa por setState({telaAdmin}) → guardarRotaAdmin
 * (fail-closed: sem SessaoSuperAdmin válida, qualquer tela protegida cai no
 * login). Telas NUNCA chamam PipocaRoteador direto (bypassaria o guard).
 *
 * Contrato:
 *   estado                getter — { telaAdmin, sessao, erro }
 *   setState(patch)              — merge raso + guard + roteador + notify
 *   subscribe(fn) -> unsub
 *   irParaTela(n)                — navegação canônica das telas
 *   entrarSuperAdmin(email, senha) -> Promise<{ok, erro?}>
 *   sairSuperAdmin()             — encerra a sessão e volta ao login
 *   repoTenant (getter)          — RepositorioTenant preso ao escopo da sessão (null sem sessão)
 */
(function () {
  "use strict";

  var TELA_LOGIN = 1;

  var state = {
    telaAdmin: TELA_LOGIN,
    sessao: null,
    erro: null,
  };

  var _subs = [];

  function notify() {
    _subs.slice().forEach(function (fn) {
      try { fn(state); } catch (e) { console.error("[PipocaAdmin] subscriber:", e); }
    });
  }

  function subscribe(fn) {
    _subs.push(fn);
    return function () { _subs = _subs.filter(function (f) { return f !== fn; }); };
  }

  function _canon() { return window.PipocaAdminCanonico || null; }

  var _repoAdmin = null;
  function repoAdmin() {
    var C = _canon();
    if (!_repoAdmin && C) _repoAdmin = C.auth.criarRepositorioAdmin();
    return _repoAdmin;
  }

  // Merge raso + GUARD fail-closed: telaAdmin protegida sem sessão válida → login.
  function setState(patch) {
    if (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
      }
      if ("telaAdmin" in patch) {
        var C = _canon();
        if (C) {
          state.telaAdmin = C.rotas.guardarRotaAdmin(state.telaAdmin, state.sessao, Date.now());
        } else if (state.telaAdmin !== TELA_LOGIN) {
          state.telaAdmin = TELA_LOGIN; // sem bundle → fecha
        }
        var R = window.PipocaRoteador;
        if (R) R.irParaTela(state.telaAdmin);
      }
    }
    notify();
  }

  function irParaTela(n) { setState({ telaAdmin: n }); }

  // Login do operador (1º uso semeia a credencial — aviso de MVP na tela).
  function entrarSuperAdmin(email, senha) {
    var repo = repoAdmin();
    if (!repo) return Promise.resolve({ ok: false, erro: "Plataforma indisponível. Recarregue a página." });
    return repo.autenticar(email, senha).then(function (sessao) {
      if (!sessao) return { ok: false, erro: "Não foi possível entrar. Confira os dados e tente de novo." }; // neutro
      state.sessao = sessao;
      setState({ telaAdmin: 2, erro: null });
      return { ok: true };
    }).catch(function () {
      return { ok: false, erro: "Não foi possível entrar. Confira os dados e tente de novo." };
    });
  }

  function sairSuperAdmin() {
    var repo = repoAdmin();
    var fim = repo ? repo.encerrarSessao() : Promise.resolve();
    return fim.then(function () {
      state.sessao = null;
      setState({ telaAdmin: TELA_LOGIN });
    });
  }

  // Seam de tenants preso ao escopo da sessão (fail-closed: sem sessão → null).
  function repoTenant() {
    var C = _canon();
    if (!C || !state.sessao) return null;
    if (!C.auth.sessaoSuperAdminValida(state.sessao, Date.now())) return null;
    return C.tenants.criarRepositorioTenant(state.sessao.escopoTenants);
  }

  window.PipocaAdmin = {
    get estado() { return state; },
    setState: setState,
    subscribe: subscribe,
    irParaTela: irParaTela,
    entrarSuperAdmin: entrarSuperAdmin,
    sairSuperAdmin: sairSuperAdmin,
    get repoTenant() { return repoTenant(); },
  };

  // Boot: sessão persistida e válida → hub; senão login.
  var C0 = _canon();
  if (C0) {
    repoAdmin().carregarSessao().then(function (s) {
      if (s && C0.auth.sessaoSuperAdminValida(s, Date.now())) {
        state.sessao = s;
        setState({ telaAdmin: 2 });
      } else {
        setState({ telaAdmin: TELA_LOGIN });
      }
    }).catch(function () { setState({ telaAdmin: TELA_LOGIN }); });
  } else {
    setState({ telaAdmin: TELA_LOGIN });
  }
})();
