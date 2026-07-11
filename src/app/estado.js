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
  // cuidador (11–15), painel de evolução (8) e Conta & segurança (16).
  // A numeração pertence ao app.
  var SUPERFICIES_ADULTAS = [8, 10, 11, 12, 13, 14, 15, 16];

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
    // fase13 pós-incidente · pedir-uma-vez do gênero: true quando o perfil
    // ativo não tem genero (o overlay PedirGenero pergunta e persiste).
    pedirGenero: false,
    storyMsg: null,
    // Histórias salvas: modal de releitura (overlay no Shell) e a última
    // história capturada nesta sessão (o coração da T6 usa). EFÊMEROS —
    // nunca entram no _projetarSave (whitelist).
    leitorHistoria: null,
    ultimaHistoriaSalvaId: null,
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
  };

  // ─── Internos ────────────────────────────────────────────────────────────
  var _subs = [];
  var _perfis = [];
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
      // UX por perfil · perfil trocado por fora do fluxo (e2e, remoção em T12):
      // invalida a gravação pendente do perfil anterior (nunca contamina o novo)
      // e o ponto de retomada do portão (não devolve a criança B à tela da A).
      if ("perfil" in patch) {
        if (_savePerfilId && (!state.perfil || state.perfil.id !== _savePerfilId)) {
          if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
          _savePerfilId = null;
        }
        if (_telaCriancaAnterior && (!state.perfil || state.perfil.id !== _telaCriancaAnterior.perfilId)) {
          _telaCriancaAnterior = null;
        }
      }
      // UX por perfil · qualquer toque num slice persistível agenda a gravação
      // do save do perfil ativo (debounce; as bordas drenam com flush).
      for (var i = 0; i < SLICES_PERSISTIVEIS.length; i++) {
        if (SLICES_PERSISTIVEIS[i] in patch) { _agendarSave(); break; }
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
    flushSavePendente(); // T8/T11 leem saves frescos do repo
    _encerrarSessaoLeitura();
    var M = window.PipocaCanonico && window.PipocaCanonico.modoApp;
    state.modoApp = M ? M.aoPassarPortao() : "cuidador";
  }

  // Após PIN aceito: sem perfis → onboarding (T10); com perfis → a EVOLUÇÃO
  // DA LEITURA (T8) é a aterrissagem do cuidador — o hub (T11) fica a um
  // toque no "↩ Painel".
  function _irParaPosPin() {
    _entrarCuidador();
    if ((_perfis || []).length === 0) _irPara(10);
    else _irPara(8);
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
    // fase06: com a fachada de backend no bundle, o repo vem dela — no modo
    // "local" é o mesmo repo local de sempre; no remoto é o SINCRONIZADO
    // (local = base; o remoto espelha quando há sessão). Fail-soft p/ bundle antigo.
    if (Canon && Canon.backend) {
      try { _repoCanonico = Canon.backend.obterBackend().repo; } catch (_) {}
    }
    if (!_repoCanonico && Canon && Canon.criarRepositorio) {
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
    carregarHistorias: function () { return Promise.resolve([]); },
    salvarHistoria: function () { return Promise.resolve(); },
    apagarHistoria: function () { return Promise.resolve(); },
    podarHistorias: function () { return Promise.resolve(0); },
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
    // Histórias salvas (métodos aditivo-opcionais do seam — guarda p/ bundle antigo)
    carregarHistorias: function (perfilId) {
      var base = _repoBase() || _fallbackRepo;
      return base.carregarHistorias ? base.carregarHistorias(perfilId) : Promise.resolve([]);
    },
    salvarHistoria: function (perfilId, historia) {
      var base = _repoBase() || _fallbackRepo;
      return base.salvarHistoria ? base.salvarHistoria(perfilId, historia) : Promise.resolve();
    },
    apagarHistoria: function (perfilId, historiaId) {
      var base = _repoBase() || _fallbackRepo;
      return base.apagarHistoria ? base.apagarHistoria(perfilId, historiaId) : Promise.resolve();
    },
    podarHistorias: function (perfilId, agora) {
      var base = _repoBase() || _fallbackRepo;
      return base.podarHistorias ? base.podarHistorias(perfilId, agora) : Promise.resolve(0);
    },
  };

  // ─── Save por perfil (UX por perfil) ──────────────────────────────────────
  // O save NUNCA leva o state cru: _projetarSave monta um EstadoApp mínimo
  // válido (pipoca.save.v1) — gate/comp/showA11y não vazam pro banco. A escrita
  // tem debounce e o perfilId é capturado no AGENDAMENTO (o timer da criança A
  // nunca grava sob o id da B); as bordas drenam com flushSavePendente().
  // Pelo repo sincronizado (fase06), cada gravação espelha no Supabase.
  var SLICES_PERSISTIVEIS = ["historia", "economia", "modos", "a11y",
    "limites", "cardapio", "cenariosLiberados", "coletaTelemetria"];
  var _saveTimer = null;
  var _savePerfilId = null;

  // Defaults ZERADOS por criança (decisão do produto: todos começam do zero).
  function _slicesZerados() {
    return {
      historia: { cenarioId: "quintal_anoitecer", objetos: [], aberta: true },
      economia: { vagalumes: 0, poupado: 0 },
      modos: { palco: "Palco", desfecho: "convergente", verificacao: "cuidador", iaLigada: false },
      a11y: { textScale: 1, dyslexia: false, syllable: false, contrast: false, reduceMotion: false },
      limites: null,
      cardapio: null,
      cenariosLiberados: null,
      coletaTelemetria: true,
    };
  }

  function _projetarSave() {
    return {
      tela: 2,
      perfil: state.perfil,
      sessao: null,
      historia: state.historia,
      economia: state.economia,
      modos: state.modos,
      a11y: state.a11y,
      limites: state.limites || null,
      cardapio: state.cardapio || null,
      cenariosLiberados: state.cenariosLiberados || null,
      coletaTelemetria: state.coletaTelemetria !== false,
    };
  }

  function _agendarSave() {
    if (!state.perfil || !state.perfil.id) return;
    _savePerfilId = state.perfil.id;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(flushSavePendente, 500);
  }

  // Grava JÁ o save agendado (troca de perfil, portão, logout). Se o perfil
  // ativo não é mais o agendado, descarta — nunca projeta o state de um
  // perfil sob o id de outro.
  function flushSavePendente() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    var pid = _savePerfilId;
    _savePerfilId = null;
    if (!pid || !state.perfil || state.perfil.id !== pid) return;
    try { repo.salvarSave(pid, _projetarSave()).catch(function () {}); } catch (_) {}
  }

  // Carrega o save do perfil e aplica em UM setState (com `modos` dentro —
  // dispara a borda de remontagem do motor). Guard: se o perfil ativo mudou
  // enquanto o save carregava, descarta. Sem save, NÃO aplica nada — a troca
  // já zerou os slices sincronamente (e o onboarding escreve por cima).
  function _hidratarPerfil(p) {
    if (!p || !p.id) return;
    repo.carregarSave(p.id).then(function (save) {
      if (!save) return;
      if (!state.perfil || state.perfil.id !== p.id) return;
      var zero = _slicesZerados();
      setState({
        economia: save.economia || zero.economia,
        modos: save.modos || zero.modos,
        a11y: save.a11y || zero.a11y,
        limites: save.limites || null,
        cardapio: save.cardapio || null,
        cenariosLiberados: save.cenariosLiberados || null,
        coletaTelemetria: save.coletaTelemetria !== false,
      });
    }).catch(function () {});
  }

  // ─── Preferências por criança (telas do cuidador com chips) ───────────────
  // lerPrefsPerfil: perfil ATIVO → slices vivos; não-ativo → save do repo.
  // Sempre devolve Promise com a mesma forma (defaults zerados por baixo).
  function lerPrefsPerfil(perfilId) {
    var zero = _slicesZerados();
    function montar(fonte) {
      return {
        modos: (fonte && fonte.modos) || zero.modos,
        limites: (fonte && fonte.limites) || null,
        cardapio: (fonte && fonte.cardapio) || null,
        cenariosLiberados: (fonte && fonte.cenariosLiberados) || null,
        coletaTelemetria: !(fonte && fonte.coletaTelemetria === false),
        economia: (fonte && fonte.economia) || zero.economia,
      };
    }
    if (state.perfil && state.perfil.id === perfilId) {
      flushSavePendente();
      return Promise.resolve(montar(state));
    }
    return repo.carregarSave(perfilId).then(montar).catch(function () { return montar(null); });
  }

  // gravarPrefsPerfil: perfil ATIVO → setState (o pipeline do save persiste —
  // fonte ÚNICA de escrita, sem dupla-gravação); não-ativo → read-modify-write
  // do save direto, SEM tocar o state vivo (nem a sessão da criança).
  function gravarPrefsPerfil(perfilId, patchSlices) {
    if (!perfilId || !patchSlices) return Promise.resolve();
    var permitidos = {};
    for (var i = 0; i < SLICES_PERSISTIVEIS.length; i++) {
      var k = SLICES_PERSISTIVEIS[i];
      if (k in patchSlices) permitidos[k] = patchSlices[k];
    }
    if (state.perfil && state.perfil.id === perfilId) {
      setState(permitidos);
      return Promise.resolve();
    }
    return repo.carregarSave(perfilId).then(function (save) {
      var zero = _slicesZerados();
      var novo = {
        tela: 2,
        perfil: (save && save.perfil) || null,
        sessao: null,
        historia: (save && save.historia) || zero.historia,
        economia: (save && save.economia) || zero.economia,
        modos: (save && save.modos) || zero.modos,
        a11y: (save && save.a11y) || zero.a11y,
        limites: (save && save.limites) || null,
        cardapio: (save && save.cardapio) || null,
        cenariosLiberados: (save && save.cenariosLiberados) || null,
        coletaTelemetria: !(save && save.coletaTelemetria === false),
      };
      for (var c in permitidos) {
        if (Object.prototype.hasOwnProperty.call(permitidos, c)) novo[c] = permitidos[c];
      }
      return repo.salvarSave(perfilId, novo);
    }).catch(function () {});
  }

  // Troca (ou retoma) o perfil ativo — o ÚNICO caminho que hidrata do save.
  // Troca real: drena o save do anterior, zera os slices (a composição da
  // criança A não vaza pra B) e hidrata em paralelo (repo local resolve em
  // microtask). Mesmo id: passthrough — preserva a composição em curso.
  // `telaDestino` opcional (T2 passa 3; T12 não navega).
  function selecionarPerfil(p, telaDestino) {
    if (!p || !p.id) return;
    flushSavePendente();
    var nav = typeof telaDestino === "number" ? { tela: telaDestino } : {};
    if (state.perfil && state.perfil.id === p.id) {
      nav.perfil = p;
      // fase13 pós-incidente · perfil legado sem gênero: pergunta na ativação
      // ("Depois" fecha; volta a perguntar na próxima ativação).
      nav.pedirGenero = !p.genero;
      setState(nav);
      return;
    }
    _encerrarSessaoLeitura();
    var patch = _slicesZerados();
    patch.perfil = p;
    patch.comp = null;
    patch.gatePendente = null;
    patch.leitorHistoria = null; // a releitura da criança A não vaza pra B
    patch.ultimaHistoriaSalvaId = null;
    patch.pedirGenero = !p.genero; // pedir-uma-vez (fase13 pós-incidente)
    for (var k in nav) { if (Object.prototype.hasOwnProperty.call(nav, k)) patch[k] = nav[k]; }
    setState(patch);
    _hidratarPerfil(p);
    // Retenção das histórias na borda da troca (20d; favoritas ficam) —
    // fire-and-forget: o repo sincronizado também poda o espelho remoto.
    try { repo.podarHistorias(p.id, Date.now()).catch(function () {}); } catch (_) {}
  }

  // fase13 pós-incidente · escolha do pedir-uma-vez: persiste o gênero no
  // perfil ativo (espelho do salvar da tela Perfis) e fecha o overlay. A
  // partir daqui toda geração usa o gênero real; o nome SEMPRE foi o real.
  function definirGeneroPerfil(genero) {
    if ((genero !== "m" && genero !== "f") || !state.perfil || !state.perfil.id) {
      setState({ pedirGenero: false });
      return Promise.resolve({ ok: false });
    }
    var novo = {};
    for (var k in state.perfil) {
      if (Object.prototype.hasOwnProperty.call(state.perfil, k)) novo[k] = state.perfil[k];
    }
    novo.genero = genero;
    setState({ perfil: novo, pedirGenero: false });
    try {
      return repo.salvarPerfil(novo)
        .then(function () { return { ok: true }; })
        .catch(function () { return { ok: true }; }); // estado vivo já reflete; o espelho tenta de novo no próximo save
    } catch (_) {
      return Promise.resolve({ ok: true });
    }
  }

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

  // UX por perfil · ponto de retomada do portão: onde a criança estava (T2–T7)
  // quando o cuidador abriu o PINGATE. Invalidação central no setState (troca
  // de perfil) e em sairDaConta.
  var _telaCriancaAnterior = null;

  function abrirPortao() {
    var t = state.tela;
    var ehInfantil = typeof t === "number" && t >= 2 && t <= 7;
    _telaCriancaAnterior = ehInfantil
      ? { tela: t, perfilId: state.perfil ? state.perfil.id : null }
      : null;
    _irPara(1);
  }

  function aoVoltarParaCrianca() {
    var M = window.PipocaCanonico && window.PipocaCanonico.modoApp;
    state.modoApp = M ? M.aoVoltarParaCrianca() : "crianca";
    state.showA11y = false;
    state.showOnboarding = false;
    state.leitorHistoria = null;
    // Retoma a tela capturada SÓ se a mesma criança segue ativa (fallback T2).
    var ant = _telaCriancaAnterior;
    _telaCriancaAnterior = null;
    var destino = 2;
    if (ant && ant.perfilId && state.perfil && state.perfil.id === ant.perfilId) destino = ant.tela;
    _irPara(destino);
  }

  // Sair da conta da família (HH_LOGIN): limpa a sessão e volta ao login (T9).
  // fase06: o logout passa pelo seam (o remoto avisa o servidor; o local limpa
  // o espelho da casa) — fallback direto no espelho para bundle antigo.
  function sairDaConta() {
    flushSavePendente();
    _telaCriancaAnterior = null;
    _encerrarSessaoLeitura();
    var Canon = window.PipocaCanonico;
    var saiuPeloSeam = false;
    try {
      if (Canon && Canon.backend) {
        Canon.backend.obterBackend().auth.sair().catch(function () {});
        saiuPeloSeam = true;
      }
    } catch (_) {}
    if (!saiuPeloSeam) {
      var C = Canon && Canon.conta;
      if (C) { try { C.limparSessaoConta(); } catch (_) {} }
    }
    var M = Canon && Canon.modoApp;
    state.modoApp = M ? M.aoVoltarParaCrianca() : "crianca";
    state.showA11y = false;
    state.showOnboarding = false;
    state.leitorHistoria = null;
    state.ultimaHistoriaSalvaId = null;
    _irPara(9);
  }

  // fase06 · login da família pelo seam (remoto ou stub local — o MESMO gesto
  // na tela; o adaptador local grava os espelhos que o boot já lê). Com
  // backend remoto, dispara a sincronização inicial (fire-and-forget).
  function entrarNaConta(email, senha) {
    var Canon = window.PipocaCanonico;
    var b = null;
    try { if (Canon && Canon.backend) b = Canon.backend.obterBackend(); } catch (_) { b = null; }
    if (b) {
      return b.auth.entrarFamilia({ email: email, senha: senha }).then(function () {
        _puxarFlagsGlobais();
        if (typeof b.sincronizar === "function") {
          b.sincronizar()
            .then(function () { return repo.carregarPerfis(); })
            .then(function () { notify(); })
            .catch(function () {});
        }
        return { ok: true };
      }).catch(function (e) {
        return { ok: false, erro: (e && e.message) || "Não foi possível entrar. Confira os dados e tente de novo." };
      });
    }
    // fallback: stub direto (bundle antigo)
    var C = Canon && Canon.conta;
    if (!C) return Promise.resolve({ ok: false, erro: "O app ainda está carregando. Tente de novo." });
    var r = C.entrarFamilia(email, senha, Date.now());
    if (!r.ok) return Promise.resolve({ ok: false, erro: r.erro });
    try { C.salvarConta(r.conta); C.salvarSessaoConta(r.sessao); } catch (_) {}
    return Promise.resolve({ ok: true });
  }

  function _backend() {
    var Canon = window.PipocaCanonico;
    try { if (Canon && Canon.backend) return Canon.backend.obterBackend(); } catch (_) {}
    return null;
  }

  // pós-fase06 · kill-switch GLOBAL: puxa as flags do servidor (fire-and-
  // forget). As flags aterrissam na chave local que as bordas de consumo leem
  // (aplicarFlagsAosModos via Canon.flags — ex.: verificação de fala na T5).
  // Modo local/offline → no-op silencioso (o comportamento atual não muda).
  function _puxarFlagsGlobais() {
    var Canon = window.PipocaCanonico;
    if (!Canon || !Canon.backend || !Canon.backend.puxarFlagsGlobais) return;
    try {
      Canon.backend.puxarFlagsGlobais().then(function (f) {
        if (!f) return;
        notify();
      }).catch(function () {});
    } catch (_) {}
  }

  // Cadastro explícito da família (tela "Criar conta"). ok+pendente=true →
  // conta criada aguardando confirmação de e-mail (sem sessão ainda).
  function criarConta(email, senha) {
    var b = _backend();
    if (!b || !b.auth) return Promise.resolve({ ok: false, erro: "O app ainda está carregando. Tente de novo." });
    var criar = b.auth.criarFamilia
      ? b.auth.criarFamilia({ email: email, senha: senha })
      : b.auth.entrarFamilia({ email: email, senha: senha }); // bundle antigo: 1º login já cria
    return criar.then(function (sessao) {
      if (!sessao) return { ok: true, pendente: true };
      _puxarFlagsGlobais();
      if (typeof b.sincronizar === "function") {
        b.sincronizar()
          .then(function () { return repo.carregarPerfis(); })
          .then(function () { notify(); })
          .catch(function () {});
      }
      return { ok: true };
    }).catch(function (e) {
      return { ok: false, erro: (e && e.message) || "Não foi possível criar a conta. Tente de novo." };
    });
  }

  // Recuperação de senha: SEMPRE resolve ok (postura neutra — não revela conta).
  function recuperarSenha(email) {
    var b = _backend();
    if (!b || !b.auth || !b.auth.recuperarSenha) return Promise.resolve({ ok: true });
    return b.auth.recuperarSenha(email)
      .then(function () { return { ok: true }; })
      .catch(function () { return { ok: true }; });
  }

  // Troca de senha LOGADO (T16 · Conta & segurança). No modo local a senha
  // não é usada — o adaptador resolve e a tela avisa.
  function alterarSenha(novaSenha) {
    var b = _backend();
    if (!b || !b.auth || !b.auth.alterarSenha) {
      return Promise.resolve({ ok: false, erro: "A troca de senha não está disponível neste modo." });
    }
    return b.auth.alterarSenha(novaSenha)
      .then(function () { return { ok: true }; })
      .catch(function (e) {
        return { ok: false, erro: (e && e.message) || "Não deu para trocar a senha agora." };
      });
  }

  // Troca de e-mail LOGADO (dispara confirmação no Supabase).
  function alterarEmail(novoEmail) {
    var b = _backend();
    if (!b || !b.auth || !b.auth.alterarEmail) {
      return Promise.resolve({ ok: false, erro: "A troca de e-mail não está disponível neste modo." });
    }
    return b.auth.alterarEmail(novoEmail)
      .then(function () { return { ok: true }; })
      .catch(function (e) {
        return { ok: false, erro: (e && e.message) || "Não deu para trocar o e-mail agora." };
      });
  }

  // E-mail da conta desta casa (espelho local — funciona em todos os backends).
  function emailDaConta() {
    var Canon = window.PipocaCanonico;
    try {
      var conta = Canon && Canon.conta ? Canon.conta.carregarConta() : null;
      return (conta && conta.email) || "";
    } catch (_) { return ""; }
  }

  // Troca do PIN do portão exigindo o PIN ATUAL (mesmo lockout do PINGATE).
  function trocarPin(pinAtual, pinNovo) {
    var Canon = window.PipocaCanonico;
    var A = Canon && Canon.acesso;
    if (!A) return { ok: false, erro: "O app ainda está carregando. Tente de novo." };
    if (!/^\d{4}$/.test(String(pinNovo || ""))) {
      return { ok: false, erro: "O PIN novo precisa de 4 números." };
    }
    var st = A.carregarAcesso();
    if (st.pinHash === null) {
      // sem PIN ainda (caso raro atrás do portão): define direto
      A.salvarAcesso(A.definirPin(st, String(pinNovo)));
      return { ok: true };
    }
    var r = A.verificarPin(st, String(pinAtual || ""), Date.now());
    A.salvarAcesso(r.estado);
    if (!r.ok) return { ok: false, bloqueado: r.bloqueado, erro: r.dica || "O PIN atual não confere." };
    A.salvarAcesso(A.definirPin(r.estado, String(pinNovo)));
    return { ok: true };
  }

  // Nova senha a partir do token do link de recuperação (hash da URL).
  function redefinirSenha(tokenRecuperacao, novaSenha) {
    var b = _backend();
    if (!b || !b.auth || !b.auth.redefinirSenha) {
      return Promise.resolve({ ok: false, erro: "A redefinição não está disponível neste modo." });
    }
    return b.auth.redefinirSenha(tokenRecuperacao, novaSenha)
      .then(function () { return { ok: true }; })
      .catch(function (e) {
        return { ok: false, erro: (e && e.message) || "Não deu para salvar a nova senha. Tente de novo." };
      });
  }

  // ─── Motor/validador CANÔNICOS (src/) via window.PipocaCanonico ────────────

  // ─── COMPOSIÇÃO AUTORAL A+ (linha verde) via PipocaCanonico.composicao ──────
  // O grafo ativo é o v3 (docs/quintal.v3.json, esquema pipoca.grafo-autoral.v3).
  function _initComposicao() {
    fetch("./docs/quintal.v3.json")
      .then(function (resp) { return resp.json(); })
      .then(function (j) {
        _grafoV2 = j || null;
        _cenarioV2 = j && j.cenario ? j.cenario : null;
        notify();
      })
      .catch(function (e) {
        console.warn("[PipocaApp] Falha ao carregar quintal.v3.json:", e);
      });
  }

  function _comp() {
    var Canon = window.PipocaCanonico;
    return Canon && Canon.composicao ? Canon.composicao : null;
  }

  // ─── GERAÇÃO 2 (fase13) — fichas + módulo de geração em background ─────────
  // A prévia do portão segue DETERMINÍSTICA (A+ v3 via montarComposicao; zero
  // LLM por movimento — D-13.2). A realização por LLM dispara no COMMIT da
  // rodada (aplicarComposicao), em background; a CAPTURA (intermediárias e
  // história completa) espera com teto e cai no A+ cru se estourar.
  var _fichasV1 = null; // CatalogoFichas (3 catálogos pipoca.fichas.v1) ou null
  var _realizacaoPendente = null; // { chave, promise } — geração do último commit
  var TETO_ESPERA_REALIZACAO_MS = 8000;

  // Carrega os 3 catálogos no boot, ao lado do grafo (padrão de _initComposicao).
  // Falha ⇒ _fichasV1 = null e o módulo de geração cai no caminho v3 (13-00).
  function _initFichas() {
    Promise.all([
      fetch("./docs/fichas/objetos.v1.json").then(function (r) { return r.json(); }),
      fetch("./docs/fichas/relacoes.quintal.v1.json").then(function (r) { return r.json(); }),
      fetch("./docs/fichas/cenarios.v1.json").then(function (r) { return r.json(); }),
    ])
      .then(function (arr) {
        _fichasV1 = { objetos: arr[0], relacoes: arr[1], cenarios: arr[2] };
      })
      .catch(function (e) {
        console.warn("[PipocaApp] Falha ao carregar fichas v1 (caminho v3 segue):", e);
        _fichasV1 = null;
      });
  }

  function _geracao() {
    var Canon = window.PipocaCanonico;
    return Canon && Canon.geracao ? Canon.geracao : null;
  }

  // Dispara a realização em BACKGROUND no commit do move (13-01: a criança não
  // espera o LLM de braços cruzados). Um disparo novo substitui o anterior —
  // geração obsoleta nunca aparece (a captura só consome o pendente da rodada).
  function _dispararRealizacao() {
    var G = _geracao();
    if (!G || !state.comp || !state.perfil) { _realizacaoPendente = null; return; }
    var comp = state.comp;
    var nivel = state.perfil.nivel || "n2";
    var entrada = {
      estado: {
        cenarioId: comp.cenarioId || "quintal_anoitecer",
        linha: (comp.linha || []).slice(),
        rodada: Math.max(1, Math.min(4, comp.rodada || 1)),
        desfecho: (state.modos && state.modos.desfecho) || "convergente",
      },
      fichas: _fichasV1,
      perfil: { nome: state.perfil.nome, genero: state.perfil.genero, nivel: nivel },
      // O fallback A+ v3 roda no DISPOSITIVO (não depende do edge — 13-03).
      estadoFallback: { estado: comp, nivel: nivel },
    };
    var opcoes = {};
    // Produção: realizador remoto (edge, cascata no servidor) quando disponível.
    if (G.realizadorRemoto) {
      var remoto = null;
      try { remoto = G.realizadorRemoto(); } catch (_) { remoto = null; }
      if (remoto) opcoes.realizador = remoto;
    }
    var chave = (comp.rodada || 1) + ":" + (comp.linha || []).join(",");
    _realizacaoPendente = {
      chave: chave,
      promise: G.gerar(entrada, opcoes).catch(function (e) {
        console.warn("[PipocaApp] geração falhou (captura cai no A+ cru):", e);
        return null;
      }),
    };
  }

  // Resultado da realização com TETO DE ESPERA: estourou (ou não há pendente)
  // ⇒ A+ cru (montarComposicao), origem sinalizada. Nunca rejeita.
  function _resultadoRealizacao(pendente, nivel) {
    function cru(motivo) {
      return {
        texto: montarComposicao(nivel),
        origem: { fonte: "fallback-a-mais", rota: "realizador", motivo: motivo },
        pacote: null,
      };
    }
    if (!pendente || !pendente.promise) return Promise.resolve(cru("realização não disparada"));
    var teto = new Promise(function (res) {
      setTimeout(function () { res(null); }, TETO_ESPERA_REALIZACAO_MS);
    });
    return Promise.race([pendente.promise, teto])
      .then(function (r) {
        if (!r || !r.texto) return cru("teto de espera estourado ou geração falhou");
        return r;
      })
      .catch(function () { return cru("geração falhou"); });
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

  // R2–4: ids do miolo atual (interior entre as âncoras) da composição.
  function mioloAtualComposicao() {
    var C = _comp();
    if (!C || !state.comp) return [];
    return C.mioloAtual(state.comp);
  }

  // R2–4: valida inserir a peça nova E deixar o miolo na ordem `ordemMiolo`,
  // mantendo as pontas travadas (config do admin). Não muta o estado.
  function podeComporComposicao(objetoId, ordemMiolo) {
    var C = _comp();
    if (!C || !state.comp) return false;
    return C.podeCompor(state.comp, objetoId, ordemMiolo);
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
    // fase13 · a rodada que ACABOU de ser lida e a realização disparada no
    // commit dela (aplicarComposicao) — a captura consome este par.
    var rodadaLida = state.comp.rodada || 1;
    var pendenteRealizacao = _realizacaoPendente;
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
      _agendarSave(); // historia mutada direto (fora do setState) — persiste a conclusão
      _capturarHistoriaSalva(rodadaLida, pendenteRealizacao); // história completa (20d; coração = p/ sempre)
    } else if (!C.convergiu(state.comp)) {
      // fase13-13-02 · intermediária: cada portão lido gera um registro (a
      // criança relê "como a história cresceu"). Fire-and-forget.
      _capturarHistoriaIntermediaria(rodadaLida, pendenteRealizacao);
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
  // · { tipo:"compor", objetoId, ordemMiolo:[ids] }
  function _aplicarMove(comp, pendente) {
    var C = _comp();
    if (!C || !comp || !pendente) return comp;
    if (pendente.tipo === "r1") return C.ordenarR1(comp, pendente.ordem);
    if (pendente.tipo === "insere") {
      if (!C.podeInserir(comp, pendente.objetoId, pendente.slot)) return comp;
      return C.inserir(comp, pendente.objetoId, pendente.slot);
    }
    if (pendente.tipo === "compor") {
      if (!C.podeCompor(comp, pendente.objetoId, pendente.ordemMiolo)) return comp;
      return C.compor(comp, pendente.objetoId, pendente.ordemMiolo);
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

    // fase13 · o arranjo da rodada acabou de estabilizar (commit do move):
    // dispara a realização por LLM em BACKGROUND (13-01, requisito de latência).
    _dispararRealizacao();

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

  // ─── Histórias salvas (pós-fase06) ─────────────────────────────────────────

  function _uuid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return "h-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  // Monta o registro-base de HistoriaSalva a partir do estado vivo (campos do
  // v1 + os aditivos do fase13-13-02 quando presentes) e grava fire-and-forget.
  function _salvarRegistroHistoria(id, resultado, nivel, rodadaLida, intermediaria) {
    var Canon = window.PipocaCanonico;
    if (!state.perfil || !state.perfil.id || !state.comp) return;
    if (!resultado || !resultado.texto) return;
    var linha = (state.comp.linha || []).slice();
    var ultimo = linha.length ? objetoMetaV2(linha[linha.length - 1]) : null;
    var h = {
      id: id,
      cenarioId: state.comp.cenarioId || "quintal_anoitecer",
      texto: resultado.texto,
      linha: linha,
      nivel: nivel,
      desfecho: (state.modos && state.modos.desfecho) || "convergente",
      titulo: (Canon && Canon.historias)
        ? Canon.historias.tituloDaHistoria(ultimo)
        : "Minha história no Quintal",
      emoji: (ultimo && ultimo.emoji) || "✨",
      criadaEm: Date.now(),
      favorita: false,
      // Aditivos da geração 2 (13-02): origem sempre; Pacote quando houve.
      origem: resultado.origem,
      rodada: rodadaLida,
    };
    if (resultado.pacote) h.pacoteOrigem = resultado.pacote;
    if (intermediaria) h.intermediaria = true;
    var pid = state.perfil.id;
    try {
      repo.salvarHistoria(pid, h)
        .then(function () { return repo.podarHistorias(pid, Date.now()); })
        .catch(function () {});
    } catch (_) {}
  }

  // Captura AUTOMÁTICA na convergência: o texto REALIZADO (LLM) quando chegou
  // dentro do teto; senão o A+ cru — fonte fiel, origem sinalizada (fase13).
  // Guards: sem perfil ou sem comp, não salva. Fire-and-forget com catch.
  function _capturarHistoriaSalva(rodadaLida, pendenteRealizacao) {
    if (!state.perfil || !state.perfil.id || !state.comp) return;
    var nivel = state.perfil.nivel || "n2";
    // id definido SÍNCRONO: o coração da T6 aponta para o registro certo mesmo
    // enquanto a realização ainda viaja (a gravação chega logo atrás).
    var id = _uuid();
    state.ultimaHistoriaSalvaId = id;
    _resultadoRealizacao(pendenteRealizacao, nivel).then(function (r) {
      _salvarRegistroHistoria(id, r, nivel, rodadaLida, false);
    });
  }

  // fase13-13-02 · intermediária por rodada: cada portão lido gera um registro
  // (segunda classe na poda; a criança relê "como a história cresceu").
  function _capturarHistoriaIntermediaria(rodadaLida, pendenteRealizacao) {
    if (!state.perfil || !state.perfil.id || !state.comp) return;
    var nivel = state.perfil.nivel || "n2";
    var id = _uuid();
    _resultadoRealizacao(pendenteRealizacao, nivel).then(function (r) {
      _salvarRegistroHistoria(id, r, nivel, rodadaLida, true);
    });
  }

  // (Des)favoritar pela criança: regrava com criadaEm PRESERVADO (o relógio
  // de 20 dias volta a contar do dia em que a história nasceu).
  function favoritarHistoria(historiaId, favorita) {
    if (!state.perfil || !state.perfil.id || !historiaId) return Promise.resolve({ ok: false });
    var pid = state.perfil.id;
    return repo.carregarHistorias(pid).then(function (lista) {
      var alvo = null;
      for (var i = 0; i < (lista || []).length; i++) {
        if (lista[i] && lista[i].id === historiaId) { alvo = lista[i]; break; }
      }
      if (!alvo) return { ok: false };
      var nova = {};
      for (var k in alvo) { if (Object.prototype.hasOwnProperty.call(alvo, k)) nova[k] = alvo[k]; }
      nova.favorita = favorita !== false;
      return repo.salvarHistoria(pid, nova).then(function () {
        notify(); // T3/T6/leitor re-renderizam e releem
        return { ok: true, favorita: nova.favorita };
      });
    }).catch(function () { return { ok: false }; });
  }

  // ─── API pública ──────────────────────────────────────────────────────────
  window.PipocaApp = {
    get estado() { return state; },
    setState: setState,
    subscribe: subscribe,
    get cenarioV2() { return _cenarioV2; },
    // fase13 · prontidão das fichas v1 (e2e/diagnóstico; o app não espera por elas)
    get fichasProntas() { return !!_fichasV1; },
    repo: repo,
    selecionarPerfil: selecionarPerfil,
    definirGeneroPerfil: definirGeneroPerfil,
    lerPrefsPerfil: lerPrefsPerfil,
    gravarPrefsPerfil: gravarPrefsPerfil,
    verificarPinCuidador: verificarPinCuidador,
    abrirPortao: abrirPortao,
    aoVoltarParaCrianca: aoVoltarParaCrianca,
    entrarNaConta: entrarNaConta,
    criarConta: criarConta,
    recuperarSenha: recuperarSenha,
    redefinirSenha: redefinirSenha,
    alterarSenha: alterarSenha,
    alterarEmail: alterarEmail,
    emailDaConta: emailDaConta,
    trocarPin: trocarPin,
    sairDaConta: sairDaConta,
    // composição autoral v2 (linha verde T2→T7)
    iniciarComposicao: iniciarComposicao,
    ordenarR1Composicao: ordenarR1Composicao,
    podeInserirComposicao: podeInserirComposicao,
    inserirComposicao: inserirComposicao,
    mioloAtualComposicao: mioloAtualComposicao,
    podeComporComposicao: podeComporComposicao,
    montarComposicao: montarComposicao,
    preverComposicao: preverComposicao,
    aplicarComposicao: aplicarComposicao,
    abrirProximaRodadaComposicao: abrirProximaRodadaComposicao,
    composicaoConvergiu: composicaoConvergiu,
    objetoMetaV2: objetoMetaV2,
    favoritarHistoria: favoritarHistoria,
  };

  // ─── Inicialização (na borda) ─────────────────────────────────────────────
  _migrarPerfisLegado().then(function () { return repo.carregarPerfis(); }); // popula cache _perfis
  _initComposicao();
  _initFichas(); // fase13 · fichas v1 ao lado do grafo (falha ⇒ caminho v3 segue)
  // Rota inicial: sem sessão de conta válida → login da família (T9, HH_LOGIN);
  // com sessão → modo criança (T2). O boot navega por _irPara (anterior à guarda).
  // O check continua SÍNCRONO no espelho local — o adaptador remoto (fase06)
  // grava os mesmos espelhos, então nada muda aqui.
  var _telaInicial = 2;
  try {
    var C0 = window.PipocaCanonico && window.PipocaCanonico.conta;
    if (C0 && !C0.sessaoValida(C0.carregarSessaoConta(), Date.now())) _telaInicial = 9;
  } catch (_) {}
  _irPara(_telaInicial);
  // fase06 · com sessão de família e backend remoto: renova o token e roda a
  // sincronização inicial na largada (fire-and-forget; sem rede, nada muda).
  try {
    var _CanonB = window.PipocaCanonico && window.PipocaCanonico.backend;
    if (_CanonB && _telaInicial === 2) {
      var _b0 = _CanonB.obterBackend();
      var _s0 = _b0.auth.sessaoAtual();
      if (_s0 && _s0.tipo === "familia") {
        _puxarFlagsGlobais(); // kill-switch global alcança a casa no boot
        if (typeof _b0.sincronizar === "function") {
          _b0.sincronizar()
            .then(function () { return repo.carregarPerfis(); })
            .then(function () { notify(); })
            .catch(function () {});
        }
      }
    }
  } catch (_) {}
})();
