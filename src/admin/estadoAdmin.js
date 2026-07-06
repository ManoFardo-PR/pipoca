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

  // fase06 · backend remoto (auth do operador de verdade). Config "local"
  // (ou bundle sem fachada) → null, e TODO o caminho local segue byte-idêntico.
  function _backendRemoto() {
    var C = _canon();
    if (!C || !C.backend) return null;
    try {
      var cfg = C.backend.configDoAmbiente();
      if (cfg.provedor === "local") return null;
      return C.backend.obterBackend(cfg);
    } catch (_) { return null; }
  }

  // SessaoAuth (remota) → SessaoSuperAdmin que o guard/telas já entendem.
  function _sessaoDeAuth(s) {
    var C = _canon();
    var escopo = s && s.tenantId ? [s.tenantId] : "todos";
    return C.auth.criarSessaoSuperAdmin(s.uid, escopo, Date.now(), "remoto:" + s.uid);
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

  // Login do operador. fase06: com backend remoto, a credencial é do servidor
  // (GoTrue + tabela operadores); no local, o 1º uso semeia a credencial (MVP).
  function entrarSuperAdmin(email, senha) {
    var remoto = _backendRemoto();
    if (remoto) {
      return remoto.auth.entrarSuperAdmin({ email: email, senha: senha }).then(function (s) {
        state.sessao = _sessaoDeAuth(s);
        _puxarAdmin();
        setState({ telaAdmin: 2, erro: null });
        return { ok: true };
      }).catch(function () {
        return { ok: false, erro: "Não foi possível entrar. Confira os dados e tente de novo." }; // neutro
      });
    }
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
    var remoto = _backendRemoto();
    if (remoto) { try { remoto.auth.sair().catch(function () {}); } catch (_) {} }
    var repo = repoAdmin();
    var fim = repo ? repo.encerrarSessao() : Promise.resolve();
    return fim.then(function () {
      state.sessao = null;
      setState({ telaAdmin: TELA_LOGIN });
    });
  }

  // Seam de tenants preso ao escopo da sessão (fail-closed: sem sessão → null).
  // pós-fase06: embrulhado com o espelho remoto (salvarTenant local + upsert
  // fire-and-forget) — com provedor local o wrapper é no-op silencioso.
  function repoTenant() {
    var C = _canon();
    if (!C || !state.sessao) return null;
    if (!C.auth.sessaoSuperAdminValida(state.sessao, Date.now())) return null;
    var repo = C.tenants.criarRepositorioTenant(state.sessao.escopoTenants);
    if (C.backend && C.backend.envolverRepoTenantComEspelho) {
      try { repo = C.backend.envolverRepoTenantComEspelho(repo); } catch (_) {}
    }
    return repo;
  }

  // Pull do servidor no login/boot do operador (servidor vence) — fire-and-
  // forget: a tela aberta relê o local ao remontar. Nunca lança.
  function _puxarAdmin() {
    var C = _canon();
    if (!C || !C.backend || !C.backend.puxarAdminDoServidor) return;
    try { C.backend.puxarAdminDoServidor().catch(function () {}); } catch (_) {}
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
  // fase06: com backend remoto, a sessão do operador vem do espelho do
  // ServicoAuth (síncrono); no local, do repoAdmin como sempre.
  var C0 = _canon();
  var _remoto0 = _backendRemoto();
  if (_remoto0 && C0) {
    var _s0 = null;
    try { _s0 = _remoto0.auth.sessaoAtual(); } catch (_) {}
    if (_s0 && _s0.tipo === "superadmin") {
      state.sessao = _sessaoDeAuth(_s0);
      _puxarAdmin();
      setState({ telaAdmin: 2 });
    } else {
      setState({ telaAdmin: TELA_LOGIN });
    }
  } else if (C0) {
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
