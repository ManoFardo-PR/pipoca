/**
 * Pipoca — Estado do app (browser build)
 * --------------------------------------
 * Versão IIFE do "cérebro" do app, carregável como <script> em index.html sem
 * bundler. Expõe window.PipocaApp — o seam que as telas canônicas (src/telas)
 * leem e escrevem. Substitui o estado que vivia inline no antigo index.html.
 *
 * Contrato consumido pelas telas:
 *   estado            getter   — estado completo (perfil, economia, historia, modos, a11y, gate…)
 *   setState(patch)            — merge raso + notifica assinantes; muda de tela conduz o roteador
 *   subscribe(fn)     -> unsub — reage a mudanças (Shell usa para overlays/a11y)
 *   motor/ordem/cenario getters — fábrica canônica (PipocaCanonico)
 *   repo.carregarPerfis()/salvarPerfil(perfil) — persistência localStorage
 *   verificarPinCuidador(pin) -> { ok, bloqueado, dica } — portão parental (acesso.ts)
 *   aoVoltarParaCrianca()      — volta ao modo criança (T2)
 *
 * Toda regra de narrativa/validação/acesso vive em src/ (via window.PipocaCanonico);
 * aqui só a ponte de estado e navegação.
 */
(function () {
  "use strict";

  var PERFIS_KEY = "pipoca.perfis.v1";

  var FALLBACK_CENARIO = {
    id: "quintal_anoitecer",
    nome: "O Quintal",
    personagem: "a Joana",
    ordem_canonica: ["vagalume", "frasco", "vento"],
    abertura: {
      n1: "É noite. A Joana vai ao quintal.",
      n2: "A noite chegou no quintal, e a Joana foi ver.",
      n3: "Quando a noite chegou no quintal, a Joana foi ver o que tinha lá fora.",
      n4: "A noite chegou devagarinho no quintal. A Joana calçou o chinelo e foi lá fora.",
    },
    objetos: [],
  };

  // ─── Estado completo do app ──────────────────────────────────────────────
  var state = {
    tela: 2,
    perfil: null,
    historia: { cenarioId: "quintal_anoitecer", objetos: [], aberta: true },
    economia: { vagalumes: 0, poupado: 0 },
    modos: { palco: "Palco", desfecho: "convergente", verificacao: "cuidador", iaLigada: false },
    a11y: { textScale: 1, dyslexia: false, syllable: false, contrast: false, reduceMotion: false },
    sessao: null,
    showA11y: false,
    showOnboarding: false,
    storyMsg: null,
    // gate (T5) state
    gateObjId: null,
    gateTrecho: "",
    gatePalavraIdx: 0,
    gateStage: "reading",
    gateEarned: 3,
  };

  // ─── Internos ────────────────────────────────────────────────────────────
  var _subs = [];
  var _perfis = [];
  var _grafo = null;
  var _cenario = null;
  var _motor = null;
  var _ordem = null;

  function notify() {
    _subs.slice().forEach(function (fn) {
      try { fn(state); } catch (e) { console.error("[PipocaApp] subscriber:", e); }
    });
  }

  function subscribe(fn) {
    _subs.push(fn);
    return function () { _subs = _subs.filter(function (f) { return f !== fn; }); };
  }

  // Merge raso. Quando `tela` muda, conduz o roteador global (fonte única de
  // navegação do Shell) — assim as telas só precisam chamar setState({ tela }).
  function setState(patch) {
    if (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
      }
      if ("tela" in patch) {
        var R = window.PipocaRoteador;
        if (R) R.irParaTela(patch.tela);
      }
    }
    notify();
  }

  function _irPara(n) {
    state.tela = n;
    var R = window.PipocaRoteador;
    if (R) R.irParaTela(n);
    notify();
  }

  // Após PIN aceito: sem perfis → onboarding (T10); com perfis → modo criança (T2).
  function _irParaPosPin() {
    if ((_perfis || []).length === 0) _irPara(10);
    else _irPara(2);
  }

  // ─── Persistência de perfis (localStorage) ────────────────────────────────
  function _lerPerfis() {
    try {
      var raw = localStorage.getItem(PERFIS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  var repo = {
    carregarPerfis: function () {
      _perfis = _lerPerfis();
      return Promise.resolve(_perfis.slice());
    },
    salvarPerfil: function (perfil) {
      var arr = _lerPerfis();
      var i = -1;
      for (var j = 0; j < arr.length; j++) {
        var p = arr[j];
        if (p && perfil && ((perfil.id != null && p.id === perfil.id) ||
                            (perfil.avatarId != null && p.avatarId === perfil.avatarId))) {
          i = j; break;
        }
      }
      if (i >= 0) arr[i] = perfil; else arr.push(perfil);
      try { localStorage.setItem(PERFIS_KEY, JSON.stringify(arr)); } catch (_) {}
      _perfis = arr;
      return Promise.resolve();
    },
  };

  // ─── Portão parental (PINGATE / acesso.ts via bundle) ─────────────────────
  // Cria o PIN no 1º uso, depois verifica com lockout suave. Em sucesso navega.
  function verificarPinCuidador(pin) {
    var Canon = window.PipocaCanonico;
    var A = Canon && Canon.acesso;
    if (!A) { _irParaPosPin(); return { ok: true }; } // degradação sem bundle
    var st = A.carregarAcesso();
    if (st.pinHash === null) {
      A.salvarAcesso(A.definirPin(st, pin));
      _irParaPosPin();
      return { ok: true };
    }
    var r = A.verificarPin(st, pin, Date.now());
    A.salvarAcesso(r.estado);
    if (r.ok) { _irParaPosPin(); return { ok: true }; }
    return { ok: false, bloqueado: r.bloqueado, dica: r.dica };
  }

  function aoVoltarParaCrianca() {
    state.showA11y = false;
    state.showOnboarding = false;
    _irPara(2);
  }

  // ─── Motor/validador CANÔNICOS (src/) via window.PipocaCanonico ────────────
  function _initMotor() {
    var Canon = window.PipocaCanonico;
    fetch("./src/dados/quintal_grafo.json")
      .then(function (resp) { return resp.json(); })
      .then(function (grafoRaw) {
        try {
          var g = (Canon && grafoRaw) ? Canon.validarGrafo(grafoRaw) : null;
          if (g) {
            _grafo = g;
            _cenario = g.cenario;
            var modos = state.modos || (Canon.modos && Canon.modos.modosPadrao);
            var par = Canon.criarMotor(g.cenario, modos);
            _motor = par.motor;
            _ordem = par.ordem;
          }
        } catch (e) {
          console.warn("[PipocaApp] Falha ao montar o motor canônico:", e);
        }
        if (!_cenario) _cenario = FALLBACK_CENARIO;
        notify();
      })
      .catch(function (e) {
        console.warn("[PipocaApp] Falha ao carregar quintal_grafo.json:", e);
        if (!_cenario) _cenario = FALLBACK_CENARIO;
        notify();
      });
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  window.PipocaApp = {
    get estado() { return state; },
    setState: setState,
    subscribe: subscribe,
    get motor() { return _motor; },
    get ordem() { return _ordem; },
    get cenario() { return _cenario; },
    repo: repo,
    verificarPinCuidador: verificarPinCuidador,
    aoVoltarParaCrianca: aoVoltarParaCrianca,
  };

  // ─── Inicialização (na borda) ─────────────────────────────────────────────
  repo.carregarPerfis();   // popula cache _perfis (localStorage é síncrono)
  _initMotor();
  var R0 = window.PipocaRoteador;
  if (R0) R0.irParaTela(2); // o fluxo da criança começa em T2 (roteador inicia em 1)
})();
