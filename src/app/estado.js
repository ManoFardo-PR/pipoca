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
 *   repo                       — RepositorioPersistencia canônico (perfis/save/telemetria)
 *   verificarPinCuidador(pin) -> { ok, bloqueado, dica } — portão parental (acesso.ts)
 *   abrirPortao()              — abre o PINGATE (T1)
 *   aoVoltarParaCrianca()      — volta ao modo criança (T2; modoApp volta a "crianca")
 *
 * Toda regra de narrativa/validação/acesso vive em src/ (via window.PipocaCanonico);
 * aqui só a ponte de estado e navegação.
 */
(function () {
  "use strict";

  var PERFIS_KEY_LEGADO = "pipoca.perfis.v1"; // chave antiga (array plano); o repo canônico usa envelopes

  // Superfícies adultas (KIDMODE · modoApp.ts): Onboarding (10), hub e telas do
  // cuidador (11–15) e o painel de evolução (8). A numeração pertence ao app.
  var SUPERFICIES_ADULTAS = [8, 10, 11, 12, 13, 14, 15];

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
    modoApp: "crianca", // KIDMODE: só o PINGATE muda para "cuidador"
    perfil: null,
    historia: { cenarioId: "quintal_anoitecer", objetos: [], aberta: true },
    economia: { vagalumes: 0, poupado: 0 },
    modos: { palco: "Palco", desfecho: "convergente", verificacao: "cuidador", iaLigada: false },
    a11y: { textScale: 1, dyslexia: false, syllable: false, contrast: false, reduceMotion: false },
    sessao: null,
    // Configurações do cuidador (fase02): limites (PC_LIM), cardápio e cenários (PC_RULES),
    // coleta de telemetria (PC_PRIV — flag efêmera; persistir é follow-up).
    limites: { blocoMin: 15, tempoDeTelaMin: null },
    cardapio: null,          // null → telas normalizam para CARDAPIO_PADRAO (cardapio.ts)
    cenariosLiberados: null, // null → CENARIOS_PADRAO
    coletaTelemetria: true,
    showA11y: false,
    showOnboarding: false,
    storyMsg: null,
    // gate (T5) state
    gateObjId: null,
    gateTrecho: "",
    gatePalavraIdx: 0,
    gateStage: "reading",
    gateEarned: 3,
    // v2 · composição autoral por rodada (linha verde). null até o grafo v2 carregar.
    comp: null,
    // move autoral pendente (montado em T4, aplicado só na confirmação em T5).
    gatePendente: null,
    // fase05 · qual motor narrativo está de pé ("A" | "B") — informativo (e2e/painel).
    motorAtivo: "A",
  };

  // ─── Internos ────────────────────────────────────────────────────────────
  var _subs = [];
  var _perfis = [];
  var _grafo = null;
  var _cenario = null;
  var _motor = null;
  var _ordem = null;
  var _grafoV2 = null;
  var _cenarioV2 = null;

  function notify() {
    _subs.slice().forEach(function (fn) {
      try { fn(state); } catch (e) { console.error("[PipocaApp] subscriber:", e); }
    });
  }

  function subscribe(fn) {
    _subs.push(fn);
    return function () { _subs = _subs.filter(function (f) { return f !== fn; }); };
  }

  // Merge raso. Quando `tela` muda, aplica a guarda KIDMODE (modoApp.ts) e conduz
  // o roteador global (fonte única de navegação do Shell) — assim as telas só
  // precisam chamar setState({ tela }). No modo criança, pedir uma superfície
  // adulta redireciona à T2 (sem mensagem assustadora).
  function setState(patch) {
    if (patch) {
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
      }
      if ("tela" in patch) {
        var M = window.PipocaCanonico && window.PipocaCanonico.modoApp;
        if (M && typeof state.tela === "number") {
          state.tela = M.aplicarGuarda(state.modoApp, state.tela, SUPERFICIES_ADULTAS);
        }
        var R = window.PipocaRoteador;
        if (R) R.irParaTela(state.tela);
      }
      // fase05 · borda de remontagem do motor: chaveia por EFETIVO vs ATIVO
      // (cobre também o kill-switch da plataforma flipado com iaLigada constante).
      // Síncrona: reusa o grafo já buscado; PipocaApp.motor segue sempre não-nulo.
      if ("modos" in patch && _grafo && _motorAlvo() !== state.motorAtivo) {
        _montarMotor(_grafo);
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

  // Sucesso no PINGATE → modo cuidador (única saída do modo criança — modoApp.ts).
  // A sessão de leitura da criança encerra com calma na borda (TELE).
  function _entrarCuidador() {
    _encerrarSessaoLeitura();
    var M = window.PipocaCanonico && window.PipocaCanonico.modoApp;
    state.modoApp = M ? M.aoPassarPortao() : "cuidador";
  }

  // Após PIN aceito: sem perfis → onboarding (T10); com perfis → hub do cuidador (T11).
  function _irParaPosPin() {
    _entrarCuidador();
    if ((_perfis || []).length === 0) _irPara(10);
    else _irPara(11);
  }

  // ─── Persistência (seam RepositorioPersistencia via bundle) ───────────────
  // O repo canônico (persistencia/index.ts) valida envelopes e cobre perfis,
  // save e telemetria. Sem bundle, cai num fallback mínimo só de perfis
  // (chave legada), para o app não morrer.
  function _lerPerfisLegado() {
    try {
      var raw = localStorage.getItem(PERFIS_KEY_LEGADO);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  var _repoCanonico = null;
  function _repoBase() {
    if (_repoCanonico) return _repoCanonico;
    var Canon = window.PipocaCanonico;
    if (Canon && Canon.criarRepositorio) {
      try { _repoCanonico = Canon.criarRepositorio(); } catch (_) {}
    }
    return _repoCanonico;
  }

  // Migração única: perfis da chave legada (array plano) entram no repo canônico
  // quando ele ainda está vazio. A chave antiga NÃO é apagada (fallback de leitura).
  function _migrarPerfisLegado() {
    var base = _repoBase();
    if (!base) return Promise.resolve();
    return base.carregarPerfis().then(function (arr) {
      if ((arr || []).length > 0) return;
      var legados = _lerPerfisLegado();
      if (!legados.length) return;
      return Promise.all(legados.map(function (p) {
        return base.salvarPerfil(p).catch(function () {});
      })).then(function () {});
    }).catch(function () {});
  }

  var _fallbackRepo = {
    carregarPerfis: function () { return Promise.resolve(_lerPerfisLegado()); },
    salvarPerfil: function (perfil) {
      var arr = _lerPerfisLegado();
      var i = -1;
      for (var j = 0; j < arr.length; j++) {
        var p = arr[j];
        if (p && perfil && perfil.id != null && p.id === perfil.id) { i = j; break; }
      }
      if (i >= 0) arr[i] = perfil; else arr.push(perfil);
      try { localStorage.setItem(PERFIS_KEY_LEGADO, JSON.stringify(arr)); } catch (_) {}
      return Promise.resolve();
    },
    apagarPerfil: function () { return Promise.resolve(); },
    carregarSave: function () { return Promise.resolve(null); },
    salvarSave: function () { return Promise.resolve(); },
    registrarTelemetria: function () { return Promise.resolve(); },
    carregarTelemetria: function () { return Promise.resolve([]); },
  };

  // Fachada estável para as telas: mantém o cache _perfis em dia a cada operação.
  var repo = {
    carregarPerfis: function () {
      var base = _repoBase() || _fallbackRepo;
      return base.carregarPerfis().then(function (arr) {
        _perfis = arr || [];
        return _perfis.slice();
      });
    },
    salvarPerfil: function (perfil) {
      var base = _repoBase() || _fallbackRepo;
      return base.salvarPerfil(perfil).then(function () {
        return repo.carregarPerfis();
      }).then(function () {});
    },
    apagarPerfil: function (perfilId) {
      var base = _repoBase() || _fallbackRepo;
      return base.apagarPerfil(perfilId).then(function () {
        return repo.carregarPerfis();
      }).then(function () {});
    },
    carregarSave: function (perfilId) {
      return (_repoBase() || _fallbackRepo).carregarSave(perfilId);
    },
    salvarSave: function (perfilId, estado) {
      return (_repoBase() || _fallbackRepo).salvarSave(perfilId, estado);
    },
    registrarTelemetria: function (evento) {
      return (_repoBase() || _fallbackRepo).registrarTelemetria(evento);
    },
    carregarTelemetria: function (perfilId) {
      return (_repoBase() || _fallbackRepo).carregarTelemetria(perfilId);
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
    var M = window.PipocaCanonico && window.PipocaCanonico.modoApp;
    state.modoApp = M ? M.aoVoltarParaCrianca() : "crianca";
    state.showA11y = false;
    state.showOnboarding = false;
    _irPara(2);
  }

  // Sair da conta da família (HH_LOGIN): limpa a sessão de conta e volta ao login (T9).
  function sairDaConta() {
    _encerrarSessaoLeitura();
    var Canon = window.PipocaCanonico;
    var C = Canon && Canon.conta;
    if (C) { try { C.limparSessaoConta(); } catch (_) {} }
    var M = Canon && Canon.modoApp;
    state.modoApp = M ? M.aoVoltarParaCrianca() : "crianca";
    state.showA11y = false;
    state.showOnboarding = false;
    _irPara(9);
  }

  // ─── Motor/validador CANÔNICOS (src/) via window.PipocaCanonico ────────────

  // fase05 · modos EFETIVOS na borda de consumo: state.modos é a INTENÇÃO do
  // cuidador (persistível, nunca reescrita); o kill-switch global da
  // plataforma (SA_SAFE) é aplicado só aqui. Fail-closed: sem módulo de
  // flags/ia no bundle, a IA não sobe.
  function _modosEfetivos() {
    var Canon = window.PipocaCanonico;
    var modos = state.modos || (Canon && Canon.modos ? Canon.modos.modosPadrao : {});
    if (!Canon || !Canon.flags) return modos;
    try {
      return Canon.flags.aplicarFlagsAosModos(modos, Canon.flags.carregarFlags());
    } catch (_) {
      return modos;
    }
  }

  // Qual motor DEVERIA estar de pé agora ("A" | "B") — decide a remontagem.
  function _motorAlvo() {
    var Canon = window.PipocaCanonico;
    if (!Canon || !Canon.ia || !Canon.flags) return "A";
    return _modosEfetivos().iaLigada ? "B" : "A";
  }

  // Monta {motor, ordem} pela fábrica canônica. Com IA efetiva, injeta o
  // provedor do MVP (simulado → guardrails → orquestrador) e aquece o cache
  // (fire-and-forget); qualquer falha degrada para o Motor A pela própria
  // fábrica/motor.
  function _montarMotor(g) {
    var Canon = window.PipocaCanonico;
    if (!Canon || !g) return;
    var efetivos = _modosEfetivos();
    var deps;
    if (efetivos.iaLigada && Canon.ia && Canon.flags) {
      try { deps = { provedor: Canon.ia.montarProvedorPadrao(g) }; } catch (_) { deps = undefined; }
    }
    var par = Canon.criarMotor(g.cenario, efetivos, deps);
    _motor = par.motor;
    _ordem = par.ordem;
    state.motorAtivo = deps && deps.provedor ? "B" : "A";
    if (state.motorAtivo === "B" && _motor && typeof _motor.aquecer === "function") {
      var nivel = (state.perfil && state.perfil.nivel) || "n2";
      try { _motor.aquecer([], nivel).catch(function () {}); } catch (_) {}
    }
  }

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
            _montarMotor(g);
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

  // ─── COMPOSIÇÃO AUTORAL v2 (linha verde) via PipocaCanonico.composicao ──────
  // O grafo v2 (docs/quintal.v2.json) é separado do grafo v1 do motor narrativo.
  function _initComposicao() {
    fetch("./docs/quintal.v2.json")
      .then(function (resp) { return resp.json(); })
      .then(function (j) {
        _grafoV2 = j || null;
        _cenarioV2 = j && j.cenario ? j.cenario : null;
        notify();
      })
      .catch(function (e) {
        console.warn("[PipocaApp] Falha ao carregar quintal.v2.json:", e);
      });
  }

  function _comp() {
    var Canon = window.PipocaCanonico;
    return Canon && Canon.composicao ? Canon.composicao : null;
  }

  // ─── Telemetria (TELE · fase03-03-01) — captura na borda, fire-and-forget ──
  // Acumuladores da sessão de leitura (zerados a cada iniciarComposicao).
  var _acum = { palavras: 0, historias: 0 };
  var _jaEmitidos = new Set(); // objeto_destravado idempotente (re-render/voltar)
  var _historiaEmitida = false; // historia_concluida 1x por história

  function _tele() {
    var Canon = window.PipocaCanonico;
    return Canon && Canon.telemetria ? Canon.telemetria : null;
  }

  // Só captura com perfil ativo, coleta ligada (PC_PRIV) e repo canônico presente.
  function _podeCaptar() {
    return !!(state.perfil && state.coletaTelemetria !== false && _tele() && _repoBase());
  }

  // Mesma tokenização da T5 (leitura.ts); fallback split simples sem bundle.
  function _contarPalavras(trecho) {
    var t = String(trecho || "").trim();
    if (!t) return 0;
    var Canon = window.PipocaCanonico;
    if (Canon && Canon.leitura && Canon.leitura.tokenizarTrecho) {
      try { return Canon.leitura.tokenizarTrecho(t).length; } catch (_) {}
    }
    return t.split(/\s+/).length;
  }

  // Fim do bloco de leitura (convergência da história, portão do cuidador ou
  // logout): captura sessao_encerrada com o resumo acumulado e fecha a Sessao.
  function _encerrarSessaoLeitura() {
    if (!state.sessao) return;
    if (_podeCaptar()) {
      _tele().capturarSessaoEncerrada(
        state,
        { palavras: _acum.palavras, historias: _acum.historias },
        Date.now(),
        _repoBase()
      );
    }
    state.sessao = null;
    _acum = { palavras: 0, historias: 0 };
  }

  // Inicia (ou reinicia) uma sessão de composição no cenário v2 (rodada 1).
  function iniciarComposicao() {
    var C = _comp();
    if (!C || !_cenarioV2) return null;
    var comp = C.iniciar(_cenarioV2, state.modos);

    // TELE · borda da sessão: zera acumuladores, garante a Sessao (SESS) e captura.
    _acum = { palavras: 0, historias: 0 };
    _jaEmitidos = new Set();
    _historiaEmitida = false;
    var Canon = window.PipocaCanonico;
    if (!state.sessao && state.perfil && Canon && Canon.sessao) {
      var bloco = (state.limites && state.limites.blocoMin) || 15;
      state.sessao = Canon.sessao.iniciarSessao(state.perfil.id, bloco, Date.now());
    }
    if (_podeCaptar()) {
      _tele().capturarSessaoIniciada(state, Date.now(), _repoBase());
      // Retenção (fase03-03-03): poda eventos além de 90 dias, fire-and-forget.
      var base = _repoBase();
      if (base && base.podarTelemetria) {
        try { base.podarTelemetria(state.perfil.id, Date.now()).catch(function () {}); } catch (_) {}
      }
    }

    setState({ comp: comp });
    return comp;
  }

  // R1: coloca e ordena os 3 escolhidos; trava as pontas.
  function ordenarR1Composicao(ordemIds) {
    var C = _comp();
    if (!C || !state.comp) return;
    setState({ comp: C.ordenarR1(state.comp, ordemIds) });
  }

  function podeInserirComposicao(objetoId, slotIndex) {
    var C = _comp();
    if (!C || !state.comp) return false;
    return C.podeInserir(state.comp, objetoId, slotIndex);
  }

  // R2–4: insere 1 objeto no miolo. Retorna true se inseriu.
  function inserirComposicao(objetoId, slotIndex) {
    var C = _comp();
    if (!C || !state.comp) return false;
    if (!C.podeInserir(state.comp, objetoId, slotIndex)) return false;
    setState({ comp: C.inserir(state.comp, objetoId, slotIndex) });
    return true;
  }

  // Tece a história (abertura + contas + desfecho na última) no nível pedido.
  function montarComposicao(nivel) {
    var C = _comp();
    if (!C || !state.comp) return "";
    return C.montar(state.comp, nivel);
  }

  // Após leitura no portão: avança a rodada (revela +1) ou marca convergência.
  function abrirProximaRodadaComposicao() {
    var C = _comp();
    if (!C || !state.comp) return;
    setState({ comp: C.abrirProximaRodada(state.comp) });

    // TELE · desfecho: última rodada lida → história concluída + fim do bloco.
    if (!_historiaEmitida && C.convergiu(state.comp)) {
      _historiaEmitida = true;
      _acum.historias += 1;
      // Espelha a conclusão no HistoriaState (fase00-00-09: aberta=false) —
      // a linha da composição vira a lista de objetos da história.
      state.historia = {
        cenarioId: state.comp.cenarioId || (state.historia && state.historia.cenarioId) || "quintal_anoitecer",
        objetos: (state.comp.linha || []).slice(),
        aberta: false,
      };
      if (_podeCaptar()) {
        _tele().capturarHistoriaConcluida(state, _acum.palavras, Date.now(), _repoBase());
      }
      _encerrarSessaoLeitura();
    }
  }

  function composicaoConvergiu() {
    var C = _comp();
    if (!C || !state.comp) return false;
    return C.convergiu(state.comp);
  }

  // Metadados (emoji/nome) de um objeto do cenário v2, p/ as telas.
  function objetoMetaV2(id) {
    var o = _cenarioV2 && _cenarioV2.objetos ? _cenarioV2.objetos[id] : null;
    return o
      ? { id: id, emoji: o.emoji || "✨", nome: o.nome || id }
      : { id: id, emoji: "✨", nome: id };
  }

  // Aplica (puro) um move autoral a uma composição, devolvendo a nova composição.
  // { tipo:"r1", ordem:[ids] } · { tipo:"insere", objetoId, slot }
  function _aplicarMove(comp, pendente) {
    var C = _comp();
    if (!C || !comp || !pendente) return comp;
    if (pendente.tipo === "r1") return C.ordenarR1(comp, pendente.ordem);
    if (pendente.tipo === "insere") {
      if (!C.podeInserir(comp, pendente.objetoId, pendente.slot)) return comp;
      return C.inserir(comp, pendente.objetoId, pendente.slot);
    }
    return comp;
  }

  // Prévia SEM efeito colateral: tece o texto como ficaria após o move.
  // (T4 mostra o portão sem consumir a rodada — voltar de T5 é sem perdas.)
  function preverComposicao(pendente, nivel) {
    var C = _comp();
    if (!C || !state.comp) return "";
    return C.montar(_aplicarMove(state.comp, pendente), nivel);
  }

  // Aplica de fato o move na composição (chamado no portão, na confirmação).
  function aplicarComposicao(pendente) {
    if (!state.comp || !pendente) return;
    setState({ comp: _aplicarMove(state.comp, pendente) });

    // TELE · portão: leitura confirmada (+ objeto que entrou na cena nesta rodada).
    // gateTrecho/gateObjId ainda estão no estado (a T5 só os limpa depois).
    var palavras = _contarPalavras(state.gateTrecho);
    if (_podeCaptar()) {
      _tele().capturarLeituraConfirmada(state, palavras, state.gateObjId || undefined, Date.now(), _repoBase());
      if (state.gateObjId) {
        _tele().capturarObjetoDestravado(state, state.gateObjId, Date.now(), _repoBase(), _jaEmitidos);
      }
    }
    _acum.palavras += palavras;
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  window.PipocaApp = {
    get estado() { return state; },
    setState: setState,
    subscribe: subscribe,
    get motor() { return _motor; },
    get ordem() { return _ordem; },
    get cenario() { return _cenario; },
    get cenarioV2() { return _cenarioV2; },
    repo: repo,
    verificarPinCuidador: verificarPinCuidador,
    abrirPortao: function () { _irPara(1); },
    aoVoltarParaCrianca: aoVoltarParaCrianca,
    sairDaConta: sairDaConta,
    // composição autoral v2 (linha verde T2→T7)
    iniciarComposicao: iniciarComposicao,
    ordenarR1Composicao: ordenarR1Composicao,
    podeInserirComposicao: podeInserirComposicao,
    inserirComposicao: inserirComposicao,
    montarComposicao: montarComposicao,
    preverComposicao: preverComposicao,
    aplicarComposicao: aplicarComposicao,
    abrirProximaRodadaComposicao: abrirProximaRodadaComposicao,
    composicaoConvergiu: composicaoConvergiu,
    objetoMetaV2: objetoMetaV2,
  };

  // ─── Inicialização (na borda) ─────────────────────────────────────────────
  _migrarPerfisLegado().then(function () { return repo.carregarPerfis(); }); // popula cache _perfis
  _initMotor();
  _initComposicao();
  // Rota inicial: sem sessão de conta válida → login da família (T9, HH_LOGIN);
  // com sessão → modo criança (T2). O boot navega por _irPara (anterior à guarda).
  var _telaInicial = 2;
  try {
    var C0 = window.PipocaCanonico && window.PipocaCanonico.conta;
    if (C0 && !C0.sessaoValida(C0.carregarSessaoConta(), Date.now())) _telaInicial = 9;
  } catch (_) {}
  _irPara(_telaInicial);
})();
