(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/app/bridge.ts
  var exports_bridge = {};
  __export(exports_bridge, {
    default: () => bridge_default
  });

  // src/admin/flags.ts
  var FLAGS_PADRAO = {
    ia: false,
    fala: false,
    conteudoCustomizado: true,
    telemetria: true
  };
  function killSwitchAtivo(flags, recurso) {
    return flags[recurso] !== true;
  }
  function aplicarFlagsAosModos(modos, flags) {
    const efetivos = { ...modos };
    if (killSwitchAtivo(flags, "ia"))
      efetivos.iaLigada = false;
    if (killSwitchAtivo(flags, "fala") && efetivos.verificacao === "fala")
      efetivos.verificacao = "cuidador";
    return efetivos;
  }
  function iaEfetivamenteLigada(modos, flags) {
    return aplicarFlagsAosModos(modos, flags).iaLigada === true;
  }
  var CHAVE_FLAGS = "pipoca.admin.flags.v1";
  function storagePadrao() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function normalizarFlags(raw) {
    const limpo = { ...FLAGS_PADRAO };
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "boolean")
          limpo[k] = v;
      }
    }
    return limpo;
  }
  function carregarFlags(armazem) {
    const st = armazem ?? storagePadrao();
    if (!st)
      return { ...FLAGS_PADRAO };
    try {
      const raw = st.getItem(CHAVE_FLAGS);
      if (raw === null)
        return { ...FLAGS_PADRAO };
      return normalizarFlags(JSON.parse(raw));
    } catch {
      return { ...FLAGS_PADRAO };
    }
  }
  function salvarFlags(flags, armazem) {
    const st = armazem ?? storagePadrao();
    if (!st)
      return;
    try {
      st.setItem(CHAVE_FLAGS, JSON.stringify(flags));
    } catch {}
  }

  // src/core/estado.ts
  var estadoInicial = {
    tela: 1,
    perfil: null,
    sessao: null,
    historia: {
      cenarioId: "",
      objetos: [],
      aberta: true
    },
    economia: {
      vagalumes: 0,
      poupado: 0
    },
    modos: {
      palco: "Palco",
      desfecho: "convergente",
      verificacao: "cuidador",
      iaLigada: false
    },
    a11y: {
      textScale: 1,
      dyslexia: false,
      syllable: false,
      contrast: false,
      reduceMotion: false
    },
    limites: null,
    cardapio: null,
    cenariosLiberados: null,
    coletaTelemetria: true
  };
  function perfilAtivo(estado) {
    return estado.perfil;
  }
  function nivelAtivo(estado) {
    return estado.perfil?.nivel ?? "n1";
  }
  function storyLines(estado, motor) {
    const nivel = nivelAtivo(estado);
    const linhas = [motor.abertura(nivel).texto];
    const historia = [];
    for (const id of estado.historia.objetos) {
      const t = motor.aoAdicionarObjeto(historia, id, nivel);
      historia.push(id);
      if (t.texto)
        linhas.push(t.texto);
    }
    return linhas;
  }
  function patchEstado(estado, patch) {
    return { ...estado, ...patch };
  }

  // src/core/perfil.ts
  var AVATARES = ["pingo", "fubá", "cacau", "lua", "tuca"];
  var AVATARES_DEF = [
    { id: "pingo", nome: "Pingo", cor: "#3f6f9e", emoji: "\uD83D\uDC36" },
    { id: "fubá", nome: "Fubá", cor: "#d98a4e", emoji: "\uD83E\uDD8A" },
    { id: "cacau", nome: "Cacau", cor: "#7a9a5b", emoji: "\uD83D\uDC3B" },
    { id: "lua", nome: "Lua", cor: "#9c7cb0", emoji: "\uD83D\uDC31" },
    { id: "tuca", nome: "Tuca", cor: "#5fa9b8", emoji: "\uD83D\uDC26" }
  ];
  var NOME_PADRAO = "Pipoquinha";
  var NIVEL_PADRAO = "n1";
  var AVATAR_PADRAO = "pingo";
  var IDADE_MIN = 3;
  var IDADE_MAX = 12;
  var NIVEIS_VALIDOS = ["n1", "n2", "n3", "n4"];
  function clampIdade(idade) {
    return Math.max(IDADE_MIN, Math.min(IDADE_MAX, Math.round(idade)));
  }
  function normalizarNome(nome) {
    const trimmed = nome.trim();
    return trimmed.length > 0 ? trimmed : NOME_PADRAO;
  }
  function normalizarNivel(nivel) {
    if (NIVEIS_VALIDOS.includes(nivel))
      return nivel;
    return NIVEL_PADRAO;
  }
  function normalizarAvatar(avatarId) {
    if (AVATARES.includes(avatarId))
      return avatarId;
    return AVATAR_PADRAO;
  }
  function porIdAvatar(avatarId) {
    const id = normalizarAvatar(avatarId);
    return AVATARES_DEF.find((a) => a.id === id) ?? AVATARES_DEF[0];
  }
  function normalizarGenero(genero) {
    return genero === "m" || genero === "f" ? genero : undefined;
  }
  function criarPerfil(id, params) {
    const genero = normalizarGenero(params.genero);
    return {
      id,
      nome: normalizarNome(params.nome ?? ""),
      idade: clampIdade(params.idade ?? 7),
      nivel: normalizarNivel(params.nivel ?? NIVEL_PADRAO),
      avatarId: normalizarAvatar(params.avatarId ?? AVATAR_PADRAO),
      ...genero ? { genero } : {}
    };
  }
  function validarPerfil(p) {
    const erros = [];
    if (typeof p !== "object" || p === null) {
      return ["perfil deve ser um objeto"];
    }
    const r = p;
    if (typeof r["id"] !== "string" || r["id"].trim() === "") {
      erros.push("id ausente ou vazio");
    }
    if (typeof r["nome"] !== "string") {
      erros.push("nome deve ser string");
    }
    if (typeof r["idade"] !== "number" || r["idade"] < IDADE_MIN || r["idade"] > IDADE_MAX) {
      erros.push(`idade deve ser número entre ${IDADE_MIN} e ${IDADE_MAX}`);
    }
    if (!NIVEIS_VALIDOS.includes(r["nivel"])) {
      erros.push("nivel inválido");
    }
    if (typeof r["avatarId"] !== "string") {
      erros.push("avatarId deve ser string");
    }
    return erros;
  }

  // src/core/modos.ts
  var modosPadrao = {
    palco: "Palco",
    desfecho: "convergente",
    verificacao: "cuidador",
    iaLigada: false
  };
  var PALCOS_VALIDOS = ["Palco", "Ateliê"];
  var VERIFICACOES_VALIDAS = ["cuidador", "auto", "fala"];
  var DESFECHOS_VALIDOS = ["convergente", "aberto"];
  function normalizarModos(raw) {
    if (typeof raw !== "object" || raw === null)
      return { ...modosPadrao };
    const r = raw;
    return {
      palco: PALCOS_VALIDOS.includes(r["palco"]) ? r["palco"] : modosPadrao.palco,
      desfecho: DESFECHOS_VALIDOS.includes(r["desfecho"]) ? r["desfecho"] : modosPadrao.desfecho,
      verificacao: VERIFICACOES_VALIDAS.includes(r["verificacao"]) ? r["verificacao"] : modosPadrao.verificacao,
      iaLigada: typeof r["iaLigada"] === "boolean" ? r["iaLigada"] : false
    };
  }
  function alternarPalco(modos) {
    return {
      ...modos,
      palco: modos.palco === "Palco" ? "Ateliê" : "Palco"
    };
  }
  function autorizarIA(modos, on) {
    return { ...modos, iaLigada: !!on };
  }
  function definirVerificacao(modos, verificacao) {
    return { ...modos, verificacao };
  }
  function definirDesfecho(modos, desfecho) {
    return { ...modos, desfecho };
  }
  function validarModos(m) {
    const erros = [];
    if (typeof m !== "object" || m === null)
      return ["modos deve ser objeto"];
    const r = m;
    if (!PALCOS_VALIDOS.includes(r["palco"]))
      erros.push("palco inválido");
    if (!DESFECHOS_VALIDOS.includes(r["desfecho"]))
      erros.push("desfecho inválido");
    if (!VERIFICACOES_VALIDAS.includes(r["verificacao"]))
      erros.push("verificacao inválida");
    if (typeof r["iaLigada"] !== "boolean")
      erros.push("iaLigada deve ser boolean");
    return erros;
  }

  // src/core/economia.ts
  var economiaInicial = {
    vagalumes: 0,
    poupado: 0
  };
  function creditarVagalumes(economia, n) {
    return { ...economia, vagalumes: economia.vagalumes + Math.max(0, n) };
  }
  function gastarVagalumes(economia, n) {
    const custo = Math.max(0, n);
    if (custo > economia.vagalumes) {
      return {
        economia,
        ok: false,
        faltam: custo - economia.vagalumes
      };
    }
    return {
      economia: { ...economia, vagalumes: economia.vagalumes - custo },
      ok: true,
      faltam: 0
    };
  }
  function spendSuggest(economia) {
    const total = economia.vagalumes + economia.poupado;
    return Math.round(total * (2 / 3));
  }
  function saveSuggest(economia) {
    const total = economia.vagalumes + economia.poupado;
    return total - spendSuggest(economia);
  }
  function spendPct(economia) {
    const total = economia.vagalumes + economia.poupado;
    if (total === 0)
      return 0;
    return spendSuggest(economia) / total;
  }
  function validarEconomia(e) {
    const erros = [];
    if (typeof e !== "object" || e === null)
      return ["economia deve ser objeto"];
    const r = e;
    if (typeof r["vagalumes"] !== "number" || r["vagalumes"] < 0)
      erros.push("vagalumes deve ser número >= 0");
    if (typeof r["poupado"] !== "number" || r["poupado"] < 0)
      erros.push("poupado deve ser número >= 0");
    return erros;
  }
  function normalizarEconomia(raw) {
    if (typeof raw !== "object" || raw === null)
      return { ...economiaInicial };
    const r = raw;
    return {
      vagalumes: typeof r["vagalumes"] === "number" && r["vagalumes"] >= 0 ? r["vagalumes"] : 0,
      poupado: typeof r["poupado"] === "number" && r["poupado"] >= 0 ? r["poupado"] : 0
    };
  }

  // src/core/historia.ts
  function historiaInicial(cenarioId) {
    return {
      cenarioId,
      objetos: [],
      aberta: true
    };
  }
  function tiraInicial(todosIds) {
    return {
      strip: [],
      bandeja: [...todosIds],
      storyMsg: "",
      dica: null
    };
  }
  function _placeInSlot(tira, objetoId, posicao) {
    const bandeja = tira.bandeja.filter((id) => id !== objetoId);
    let strip;
    if (posicao !== undefined && posicao >= 0 && posicao <= tira.strip.length) {
      strip = [
        ...tira.strip.slice(0, posicao),
        objetoId,
        ...tira.strip.slice(posicao)
      ];
    } else {
      strip = [...tira.strip, objetoId];
    }
    return { ...tira, strip, bandeja, dica: null };
  }
  function _returnToTray(tira, objetoId) {
    const strip = tira.strip.filter((id) => id !== objetoId);
    const bandeja = [...tira.bandeja, objetoId];
    return { ...tira, strip, bandeja, dica: null };
  }
  function _checkStory(tira, ordem) {
    const resultado = ordem.validar(tira.strip);
    if (resultado.ok) {
      return {
        ...tira,
        dica: null,
        storyMsg: "Tira pronta! Hora de ler. \uD83C\uDF1F"
      };
    }
    return {
      ...tira,
      dica: resultado.dica ?? "Quase! Arraste os quadros para montar a história.",
      storyMsg: ""
    };
  }
  function textoPortao(motor, objetoId, historiaAtual, nivel) {
    return motor.aoAdicionarObjeto(historiaAtual, objetoId, nivel).texto;
  }
  function commitarObjeto(historia, objetoId, motor, nivel) {
    const trecho = motor.aoAdicionarObjeto(historia.objetos, objetoId, nivel);
    const novaHistoria = {
      ...historia,
      objetos: [...historia.objetos, objetoId],
      aberta: !trecho.ehFinal
    };
    return { historia: novaHistoria, trecho };
  }
  function resetHistoria(cenarioId) {
    return historiaInicial(cenarioId);
  }
  function derivarBandeja(todosIds, historia) {
    const commitados = new Set(historia.objetos);
    return todosIds.filter((id) => !commitados.has(id));
  }
  function validarHistoriaState(h) {
    const erros = [];
    if (typeof h !== "object" || h === null)
      return ["historia deve ser objeto"];
    const r = h;
    if (typeof r["cenarioId"] !== "string")
      erros.push("cenarioId deve ser string");
    if (!Array.isArray(r["objetos"]))
      erros.push("objetos deve ser array");
    if (typeof r["aberta"] !== "boolean")
      erros.push("aberta deve ser boolean");
    return erros;
  }

  // src/core/sessao.ts
  var BLOCOS_VALIDOS = [10, 15, 20, 25];
  function iniciarSessao(perfilId, blocoMin, agora = Date.now()) {
    return {
      perfilId,
      blocoMin,
      iniciadaEm: agora,
      restanteSeg: blocoMin * 60
    };
  }
  function tick(sessao, deltaSeg = 1) {
    const restante = Math.max(0, sessao.restanteSeg - deltaSeg);
    return { ...sessao, restanteSeg: restante };
  }
  function encerrarSessao() {
    return null;
  }
  function formatarRestante(restanteSeg) {
    const min = Math.floor(restanteSeg / 60);
    const seg = restanteSeg % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  }
  function normalizarBlocoMin(valor) {
    if (BLOCOS_VALIDOS.includes(valor))
      return valor;
    return 15;
  }
  function validarSessao(s) {
    const erros = [];
    if (typeof s !== "object" || s === null)
      return ["sessao deve ser objeto"];
    const r = s;
    if (typeof r["perfilId"] !== "string")
      erros.push("perfilId deve ser string");
    if (!BLOCOS_VALIDOS.includes(r["blocoMin"]))
      erros.push("blocoMin inválido");
    if (typeof r["iniciadaEm"] !== "number")
      erros.push("iniciadaEm deve ser number");
    if (typeof r["restanteSeg"] !== "number")
      erros.push("restanteSeg deve ser number");
    return erros;
  }

  // src/core/limites.ts
  var LIMITES_PADRAO = { blocoMin: 15, tempoDeTelaMin: null };
  function definirBlocoFoco(sessao, blocoMin, agora) {
    return iniciarSessao(sessao.perfilId, blocoMin, agora);
  }
  function normalizarTempoDeTela(valor) {
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0)
      return null;
    return Math.round(valor);
  }
  function normalizarLimites(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return {
      blocoMin: normalizarBlocoMin(r["blocoMin"]),
      tempoDeTelaMin: normalizarTempoDeTela(r["tempoDeTelaMin"])
    };
  }

  // src/core/cardapio.ts
  var CARDAPIO_PADRAO = [
    { id: "parque", label: "30 min de parque", icon: "\uD83D\uDEDD", cost: 6 },
    { id: "jantar", label: "Escolher o jantar", icon: "\uD83C\uDF5D", cost: 4 },
    { id: "historia", label: "História extra antes de dormir", icon: "\uD83D\uDCD6", cost: 3 },
    { id: "bike", label: "Passeio de bike", icon: "\uD83D\uDEB2", cost: 8 },
    { id: "tela", label: "Tempo de tela", icon: "\uD83D\uDCFA", cost: 5 },
    { id: "amigo", label: "Brincar com um amigo", icon: "\uD83E\uDD1D", cost: 5 }
  ];
  function validarItemCardapio(it) {
    if (!it || typeof it !== "object")
      return false;
    const r = it;
    return typeof r["id"] === "string" && r["id"].length > 0 && typeof r["label"] === "string" && r["label"].length > 0 && typeof r["icon"] === "string" && typeof r["cost"] === "number" && r["cost"] >= 0;
  }
  function normalizarCardapio(raw) {
    if (!Array.isArray(raw))
      return [...CARDAPIO_PADRAO];
    const itens = raw.filter(validarItemCardapio);
    return itens.length > 0 ? itens : [...CARDAPIO_PADRAO];
  }
  var CENARIOS_PADRAO = ["quintal_anoitecer"];
  function normalizarCenariosLiberados(raw) {
    if (!Array.isArray(raw))
      return [...CENARIOS_PADRAO];
    const ids = raw.filter((x) => typeof x === "string" && x.length > 0);
    return ids.length > 0 ? ids : [...CENARIOS_PADRAO];
  }

  // src/dados/schemas.ts
  var ESQUEMA_PERFIL = "pipoca.perfil.v1";
  var ESQUEMA_SAVE = "pipoca.save.v1";
  var TEXT_SCALES_VALIDOS = [1, 1.2, 1.45];
  function validarA11y(raw) {
    const erros = [];
    if (typeof raw !== "object" || raw === null)
      return ["a11y deve ser objeto"];
    const r = raw;
    if (!TEXT_SCALES_VALIDOS.includes(r["textScale"]))
      erros.push(`a11y.textScale inválido (deve ser 1, 1.2 ou 1.45)`);
    for (const campo of ["dyslexia", "syllable", "contrast", "reduceMotion"]) {
      if (typeof r[campo] !== "boolean")
        erros.push(`a11y.${campo} deve ser boolean`);
    }
    return erros;
  }
  function validarSlicePerfil(raw) {
    if (raw === null || raw === undefined)
      return [];
    return validarPerfil(raw);
  }
  function sanearLimites(raw) {
    if (raw === null || raw === undefined)
      return null;
    if (typeof raw !== "object")
      return null;
    return normalizarLimites(raw);
  }
  function sanearCardapio(raw) {
    if (!Array.isArray(raw))
      return null;
    const itens = raw.filter(validarItemCardapio);
    return itens.length > 0 ? itens : null;
  }
  function sanearCenariosLiberados(raw) {
    if (!Array.isArray(raw))
      return null;
    const ids = raw.filter((x) => typeof x === "string" && x.length > 0);
    return ids.length > 0 ? ids : null;
  }
  function sanearColetaTelemetria(raw) {
    return typeof raw === "boolean" ? raw : null;
  }
  function validarEnvelopePerfil(raw) {
    if (typeof raw !== "object" || raw === null)
      return null;
    const r = raw;
    if (r["esquema"] !== ESQUEMA_PERFIL)
      return null;
    const erros = validarPerfil(r["perfil"]);
    if (erros.length > 0)
      return null;
    const perfil = r["perfil"];
    const genero = normalizarGenero(perfil["genero"]);
    if (genero !== perfil.genero) {
      const copia = { ...perfil };
      if (genero)
        copia.genero = genero;
      else
        delete copia.genero;
      return copia;
    }
    return perfil;
  }
  function validarEnvelopeSave(raw) {
    try {
      if (typeof raw !== "object" || raw === null)
        return null;
      const r = raw;
      if (r["esquema"] !== ESQUEMA_SAVE)
        return null;
      if (typeof r["perfilId"] !== "string" || r["perfilId"].trim() === "")
        return null;
      const estado = r["estado"];
      if (typeof estado !== "object" || estado === null)
        return null;
      const e = estado;
      if (typeof e["tela"] !== "number")
        return null;
      if (!("perfil" in e))
        return null;
      const errosPerfil = validarSlicePerfil(e["perfil"]);
      if (errosPerfil.length > 0)
        return null;
      if (e["sessao"] !== null && e["sessao"] !== undefined) {
        if (validarSessao(e["sessao"]).length > 0)
          return null;
      }
      if (validarHistoriaState(e["historia"]).length > 0)
        return null;
      if (validarEconomia(e["economia"]).length > 0)
        return null;
      if (validarModos(e["modos"]).length > 0)
        return null;
      if (validarA11y(e["a11y"]).length > 0)
        return null;
      return {
        ...estado,
        limites: sanearLimites(e["limites"]),
        cardapio: sanearCardapio(e["cardapio"]),
        cenariosLiberados: sanearCenariosLiberados(e["cenariosLiberados"]),
        coletaTelemetria: sanearColetaTelemetria(e["coletaTelemetria"])
      };
    } catch {
      return null;
    }
  }
  function criarEnvelopePerfil(perfil) {
    return { esquema: ESQUEMA_PERFIL, perfil };
  }
  function criarEnvelopeSave(perfilId, estado) {
    return { esquema: ESQUEMA_SAVE, perfilId, estado };
  }

  // src/core/telemetria.ts
  var ESQUEMA_TELEMETRIA = "pipoca.telemetria.v1";
  var TIPOS_VALIDOS = [
    "leitura_confirmada",
    "sessao_iniciada",
    "sessao_encerrada",
    "historia_concluida",
    "objeto_destravado",
    "espelho_falhou"
  ];
  function criarEvento(tipo, perfilId, dados, agora) {
    if (typeof agora !== "number" || !Number.isFinite(agora)) {
      throw new Error("criarEvento: `agora` (ts) deve ser número finito injetado pela borda");
    }
    return { esquema: ESQUEMA_TELEMETRIA, tipo, perfilId, ts: agora, dados };
  }
  function validarEvento(e) {
    if (typeof e !== "object" || e === null)
      return false;
    const r = e;
    if (r["esquema"] !== ESQUEMA_TELEMETRIA)
      return false;
    if (!TIPOS_VALIDOS.includes(r["tipo"]))
      return false;
    if (typeof r["perfilId"] !== "string" || r["perfilId"].length === 0)
      return false;
    if (typeof r["ts"] !== "number" || !Number.isFinite(r["ts"]))
      return false;
    if (typeof r["dados"] !== "object" || r["dados"] === null)
      return false;
    return true;
  }

  // src/servicos/telemetria_repo.ts
  var RETENCAO_DIAS_PADRAO = 90;
  var MS_POR_DIA = 86400000;
  function dentroDaRetencao(evento, agora, retencaoDias = RETENCAO_DIAS_PADRAO) {
    const limite = agora - retencaoDias * MS_POR_DIA;
    return evento.ts >= limite;
  }
  function podarPorRetencao(eventos, agora, retencaoDias = RETENCAO_DIAS_PADRAO) {
    return eventos.filter((e) => dentroDaRetencao(e, agora, retencaoDias));
  }

  // src/core/historias.ts
  var ESQUEMA_HISTORIAS = "pipoca.historias.v1";
  var RETENCAO_HISTORIAS_DIAS = 20;
  var MAX_NAO_FAVORITAS = 30;
  var MAX_INTERMEDIARIAS_NAO_FAVORITAS = 30;
  var MS_POR_DIA2 = 86400000;
  var NIVEIS = ["n1", "n2", "n3", "n4"];
  var DESFECHOS = ["convergente", "aberto"];
  function sanearOrigem(raw) {
    if (typeof raw !== "object" || raw === null)
      return;
    const r = raw;
    if (r["fonte"] !== "llm" && r["fonte"] !== "fallback-a-mais")
      return;
    const origem = { fonte: r["fonte"] };
    for (const campo of ["rota", "provedor", "modelo", "motivo"]) {
      if (typeof r[campo] === "string")
        origem[campo] = r[campo];
    }
    return origem;
  }
  function sanearPacoteOrigem(raw) {
    if (typeof raw !== "object" || raw === null)
      return;
    const r = raw;
    if (r["esquema"] !== "pipoca.pacote-composicao.v1")
      return;
    return raw;
  }
  function sanearParagrafos(raw) {
    if (!Array.isArray(raw) || raw.length === 0)
      return;
    if (!raw.every((p) => typeof p === "string" && p.trim() !== ""))
      return;
    return raw.slice();
  }
  function validarHistoriaSalva(raw) {
    if (typeof raw !== "object" || raw === null)
      return null;
    const r = raw;
    if (typeof r["id"] !== "string" || r["id"].trim() === "")
      return null;
    if (typeof r["cenarioId"] !== "string" || r["cenarioId"] === "")
      return null;
    if (typeof r["texto"] !== "string" || r["texto"].trim() === "")
      return null;
    if (!Array.isArray(r["linha"]) || !r["linha"].every((x) => typeof x === "string"))
      return null;
    if (!NIVEIS.includes(r["nivel"]))
      return null;
    if (!DESFECHOS.includes(r["desfecho"]))
      return null;
    if (typeof r["titulo"] !== "string" || r["titulo"] === "")
      return null;
    if (typeof r["criadaEm"] !== "number" || !Number.isFinite(r["criadaEm"]))
      return null;
    const origem = sanearOrigem(r["origem"]);
    const pacoteOrigem = sanearPacoteOrigem(r["pacoteOrigem"]);
    const paragrafos = sanearParagrafos(r["paragrafos"]);
    const rodada = typeof r["rodada"] === "number" && Number.isInteger(r["rodada"]) && r["rodada"] >= 1 && r["rodada"] <= 4 ? r["rodada"] : undefined;
    const atualizadoEm = typeof r["atualizadoEm"] === "number" && Number.isFinite(r["atualizadoEm"]) ? r["atualizadoEm"] : undefined;
    return {
      id: r["id"],
      cenarioId: r["cenarioId"],
      texto: r["texto"],
      linha: r["linha"].slice(),
      nivel: r["nivel"],
      desfecho: r["desfecho"],
      titulo: r["titulo"],
      emoji: typeof r["emoji"] === "string" && r["emoji"] !== "" ? r["emoji"] : "✨",
      criadaEm: r["criadaEm"],
      favorita: r["favorita"] === true,
      ...origem ? { origem } : {},
      ...pacoteOrigem ? { pacoteOrigem } : {},
      ...rodada !== undefined ? { rodada } : {},
      ...r["intermediaria"] === true ? { intermediaria: true } : {},
      ...paragrafos ? { paragrafos } : {},
      ...atualizadoEm !== undefined ? { atualizadoEm } : {}
    };
  }
  function dentroDaRetencaoHistoria(h, agora, retencaoDias = RETENCAO_HISTORIAS_DIAS) {
    if (h.favorita)
      return true;
    return h.criadaEm >= agora - retencaoDias * MS_POR_DIA2;
  }
  function normalizarHistorias(lista, agora) {
    const porId = new Map;
    for (const raw of Array.isArray(lista) ? lista : []) {
      const h = validarHistoriaSalva(raw);
      if (h)
        porId.set(h.id, h);
    }
    const vivas = [...porId.values()].filter((h) => dentroDaRetencaoHistoria(h, agora)).sort((a, b) => b.criadaEm - a.criadaEm);
    const resultado = [];
    let naoFavoritas = 0;
    let intermediarias = 0;
    for (const h of vivas) {
      if (!h.favorita) {
        if (h.intermediaria === true) {
          if (intermediarias >= MAX_INTERMEDIARIAS_NAO_FAVORITAS)
            continue;
          intermediarias++;
        } else {
          if (naoFavoritas >= MAX_NAO_FAVORITAS)
            continue;
          naoFavoritas++;
        }
      }
      resultado.push(h);
    }
    return resultado;
  }
  function mesclarHistorias(locais, remotas) {
    const porId = new Map;
    for (const h of Array.isArray(locais) ? locais : [])
      porId.set(h.id, h);
    for (const r of Array.isArray(remotas) ? remotas : []) {
      const l = porId.get(r.id);
      if (!l) {
        porId.set(r.id, r);
        continue;
      }
      const cl = typeof l.atualizadoEm === "number" ? l.atualizadoEm : undefined;
      const cr = typeof r.atualizadoEm === "number" ? r.atualizadoEm : undefined;
      if (cl !== undefined && cr !== undefined) {
        if (cr > cl)
          porId.set(r.id, r);
      } else if (cr !== undefined) {
        if (l.favorita !== r.favorita || l.texto !== r.texto)
          porId.set(r.id, r);
      }
    }
    return [...porId.values()];
  }
  function apenasCompletas(lista) {
    return (Array.isArray(lista) ? lista : []).filter((h) => h.intermediaria !== true);
  }
  function agruparPorDia(lista, agora) {
    const grupos = [];
    const porRotulo = new Map;
    for (const h of Array.isArray(lista) ? lista : []) {
      const rotulo = dataRelativa(h.criadaEm, agora);
      let grupo = porRotulo.get(rotulo);
      if (!grupo) {
        grupo = { rotulo, historias: [] };
        porRotulo.set(rotulo, grupo);
        grupos.push(grupo);
      }
      grupo.historias.push(h);
    }
    return grupos;
  }
  function tituloDaHistoria(ultimoObjeto) {
    const nome = ultimoObjeto && ultimoObjeto.nome ? String(ultimoObjeto.nome).trim() : "";
    if (!nome)
      return "Minha história no Quintal";
    return "A história de " + nome;
  }
  function dataRelativa(criadaEm, agora) {
    const dias = Math.floor((agora - criadaEm) / MS_POR_DIA2);
    if (dias <= 0)
      return "hoje";
    if (dias === 1)
      return "ontem";
    return "há " + dias + " dias";
  }
  function criarEnvelopeHistoria(historia) {
    return { esquema: ESQUEMA_HISTORIAS, historia };
  }

  // src/core/persistencia/chaves.ts
  var CHAVE_PERFIS = "pipoca.perfil.v1";
  function chaveSave(perfilId) {
    return `pipoca.save.v1:${perfilId}`;
  }
  function chaveTelemetria(perfilId) {
    return `pipoca.telemetria.v1:${perfilId}`;
  }
  function chaveHistorias(perfilId) {
    return `pipoca.historias.v1:${perfilId}`;
  }
  function lerArrayEnvelopes(chave, esquemaEsperado) {
    try {
      const raw = localStorage.getItem(chave);
      if (raw === null)
        return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed))
        return [];
      return parsed.filter((item) => typeof item === "object" && item !== null && item["esquema"] === esquemaEsperado);
    } catch {
      return [];
    }
  }
  function gravarItem(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  }
  function lerArrayBruto(chave) {
    try {
      const raw = localStorage.getItem(chave);
      if (raw === null)
        return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function particionarPorEsquema(itens, esquemaEsperado) {
    const conhecidos = [];
    const resto = [];
    for (const item of itens) {
      if (typeof item === "object" && item !== null && item["esquema"] === esquemaEsperado) {
        conhecidos.push(item);
      } else {
        resto.push(item);
      }
    }
    return { conhecidos, resto };
  }

  // src/core/persistencia/RepositorioLocalStorage.ts
  class RepositorioLocalStorage {
    async carregarPerfis() {
      const raw = lerArrayEnvelopes(CHAVE_PERFIS, "pipoca.perfil.v1");
      const validos = [];
      for (const envelope of raw) {
        const perfil = validarEnvelopePerfil(envelope);
        if (perfil !== null)
          validos.push(perfil);
      }
      return validos;
    }
    async salvarPerfil(p) {
      const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(CHAVE_PERFIS), "pipoca.perfil.v1");
      const semEste = conhecidos.filter((e) => e.perfil?.id !== p.id);
      const novoEnvelope = {
        esquema: "pipoca.perfil.v1",
        perfil: { ...p }
      };
      gravarItem(CHAVE_PERFIS, [...resto, ...semEste, novoEnvelope]);
    }
    async carregarSave(perfilId) {
      try {
        const raw = localStorage.getItem(chaveSave(perfilId));
        if (raw === null)
          return null;
        const parsed = JSON.parse(raw);
        return validarEnvelopeSave(parsed);
      } catch {
        return null;
      }
    }
    async salvarSave(perfilId, estado) {
      const envelope = {
        esquema: "pipoca.save.v1",
        perfilId,
        estado
      };
      if (gravarItem(chaveSave(perfilId), envelope))
        return;
      try {
        const chaveTel = chaveTelemetria(perfilId);
        const bruto = lerArrayBruto(chaveTel);
        if (bruto.length > 0) {
          gravarItem(chaveTel, bruto.slice(Math.floor(bruto.length / 2)));
          if (gravarItem(chaveSave(perfilId), envelope))
            return;
          gravarItem(chaveTel, []);
          gravarItem(chaveSave(perfilId), envelope);
        }
      } catch {}
    }
    async registrarTelemetria(evento) {
      const chave = chaveTelemetria(evento.perfilId);
      let lista = [];
      try {
        const raw = localStorage.getItem(chave);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            lista = parsed;
        }
      } catch {}
      const envelope = {
        esquema: "pipoca.telemetria.v1",
        evento
      };
      gravarItem(chave, [...lista, envelope]);
    }
    async carregarTelemetria(perfilId) {
      const envelopes = lerArrayEnvelopes(chaveTelemetria(perfilId), "pipoca.telemetria.v1");
      return envelopes.map((e) => e.evento).filter((ev) => validarEvento(ev));
    }
    async podarTelemetria(perfilId, agora, retencaoDias = RETENCAO_DIAS_PADRAO) {
      const eventos = await this.carregarTelemetria(perfilId);
      const mantidos = podarPorRetencao(eventos, agora, retencaoDias);
      const removidos = eventos.length - mantidos.length;
      if (removidos > 0) {
        const envelopes = mantidos.map((evento) => ({
          esquema: "pipoca.telemetria.v1",
          evento
        }));
        gravarItem(chaveTelemetria(perfilId), envelopes);
      }
      return removidos;
    }
    async carregarHistorias(perfilId) {
      const envelopes = lerArrayEnvelopes(chaveHistorias(perfilId), ESQUEMA_HISTORIAS);
      return envelopes.map((e) => validarHistoriaSalva(e.historia)).filter((h) => h !== null).sort((a, b) => b.criadaEm - a.criadaEm);
    }
    async salvarHistoria(perfilId, historia) {
      const chave = chaveHistorias(perfilId);
      const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(chave), ESQUEMA_HISTORIAS);
      const envelopes = conhecidos;
      const semEsta = envelopes.filter((e) => e.historia?.id !== historia.id);
      let lista = [...semEsta, criarEnvelopeHistoria({ ...historia })];
      if (gravarItem(chave, [...resto, ...lista]))
        return;
      const podavel = (e, intermediaria) => !!e.historia && e.historia.favorita !== true && e.historia.id !== historia.id && e.historia.intermediaria === true === intermediaria;
      for (const faseIntermediarias of [true, false]) {
        const candidatas = lista.filter((e) => podavel(e, faseIntermediarias)).sort((a, b) => (a.historia?.criadaEm ?? 0) - (b.historia?.criadaEm ?? 0));
        for (const vitima of candidatas) {
          lista = lista.filter((e) => e !== vitima);
          if (gravarItem(chave, [...resto, ...lista]))
            return;
        }
      }
    }
    async apagarHistoria(perfilId, historiaId) {
      const chave = chaveHistorias(perfilId);
      const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(chave), ESQUEMA_HISTORIAS);
      const envelopes = conhecidos;
      const restantes = envelopes.filter((e) => e.historia?.id !== historiaId);
      if (restantes.length !== envelopes.length)
        gravarItem(chave, [...resto, ...restantes]);
    }
    async podarHistorias(perfilId, agora) {
      const antes = await this.carregarHistorias(perfilId);
      const mantidas = normalizarHistorias(antes, agora);
      const removidas = antes.length - mantidas.length;
      if (removidas > 0) {
        const resto = particionarPorEsquema(lerArrayBruto(chaveHistorias(perfilId)), ESQUEMA_HISTORIAS).resto;
        gravarItem(chaveHistorias(perfilId), [...resto, ...mantidas.map(criarEnvelopeHistoria)]);
      }
      return removidas;
    }
    async apagarPerfil(perfilId) {
      try {
        localStorage.removeItem(chaveSave(perfilId));
      } catch {}
      try {
        localStorage.removeItem(chaveTelemetria(perfilId));
      } catch {}
      try {
        localStorage.removeItem(chaveHistorias(perfilId));
      } catch {}
      const { conhecidos, resto } = particionarPorEsquema(lerArrayBruto(CHAVE_PERFIS), "pipoca.perfil.v1");
      const filtrado = conhecidos.filter((e) => e.perfil?.id !== perfilId);
      gravarItem(CHAVE_PERFIS, [...resto, ...filtrado]);
    }
  }

  // src/core/persistencia/index.ts
  function criarRepositorio() {
    return new RepositorioLocalStorage;
  }

  // src/core/contaFamilia.ts
  var DURACAO_SESSAO_MS = 30 * 86400000;
  function idDoEmail(email) {
    const e = email.trim().toLowerCase();
    let h = 2166136261;
    for (let i = 0;i < e.length; i++) {
      h ^= e.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "fam_" + (h >>> 0).toString(16);
  }
  function criarSessao(contaId, agora, duracaoMs = DURACAO_SESSAO_MS) {
    return { contaId, autenticadaEm: agora, expiraEm: agora + duracaoMs };
  }
  function sessaoValida(sessao, agora) {
    return !!sessao && typeof sessao.expiraEm === "number" && sessao.expiraEm > agora;
  }
  function entrarFamilia(email, senha, agora, duracaoMs = DURACAO_SESSAO_MS) {
    const e = (email || "").trim();
    const s = (senha || "").trim();
    if (!e || !s)
      return { ok: false, erro: "Preencha e-mail e senha para entrar." };
    if (!/.+@.+\..+/.test(e))
      return { ok: false, erro: "O e-mail parece incompleto. Confira, por favor." };
    const conta = { id: idDoEmail(e), email: e.toLowerCase(), criadaEm: agora };
    return { ok: true, conta, sessao: criarSessao(conta.id, agora, duracaoMs) };
  }

  // src/servicos/conta_repo.ts
  var CHAVE_CONTA = "pipoca.conta.v1";
  var CHAVE_SESSAO = "pipoca.sessao-conta.v1";
  function carregarConta() {
    try {
      const raw = localStorage.getItem(CHAVE_CONTA);
      if (!raw)
        return null;
      const p = JSON.parse(raw);
      if (p && typeof p["id"] === "string" && typeof p["email"] === "string" && typeof p["criadaEm"] === "number") {
        return { id: p["id"], email: p["email"], criadaEm: p["criadaEm"] };
      }
    } catch {}
    return null;
  }
  function salvarConta(conta) {
    try {
      localStorage.setItem(CHAVE_CONTA, JSON.stringify(conta));
    } catch {}
  }
  function carregarSessaoConta() {
    try {
      const raw = localStorage.getItem(CHAVE_SESSAO);
      if (!raw)
        return null;
      const p = JSON.parse(raw);
      if (p && typeof p["contaId"] === "string" && typeof p["autenticadaEm"] === "number" && typeof p["expiraEm"] === "number") {
        return {
          contaId: p["contaId"],
          autenticadaEm: p["autenticadaEm"],
          expiraEm: p["expiraEm"]
        };
      }
    } catch {}
    return null;
  }
  function salvarSessaoConta(sessao) {
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    } catch {}
  }
  function limparSessaoConta() {
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {}
  }

  // src/admin/auth/sessaoSuperAdmin.ts
  var DURACAO_SESSAO_ADMIN_MS = 12 * 3600000;
  function criarSessaoSuperAdmin(adminId, escopo, agora, token, duracaoMs = DURACAO_SESSAO_ADMIN_MS) {
    return {
      adminId,
      papel: "super_admin",
      escopoTenants: escopo,
      emitidaEm: agora,
      expiraEm: agora + duracaoMs,
      token
    };
  }
  function sessaoSuperAdminValida(s, agora) {
    return !!s && s.papel === "super_admin" && typeof s.expiraEm === "number" && s.expiraEm > agora && typeof s.token === "string" && s.token.length > 0;
  }

  // src/admin/auth/autenticacaoSuperAdmin.ts
  var MAX_TENTATIVAS_ADMIN = 5;
  var ATRASO_BASE_MS = 5000;
  var ATRASO_TETO_MS = 60000;
  function calcularAtrasoMs(tentativas) {
    if (!Number.isFinite(tentativas) || tentativas < MAX_TENTATIVAS_ADMIN)
      return 0;
    return Math.min((tentativas - (MAX_TENTATIVAS_ADMIN - 1)) * ATRASO_BASE_MS, ATRASO_TETO_MS);
  }
  function hashSenha(senha, sal) {
    const s = String(sal) + String(senha);
    let h = 2166136261;
    for (let i = 0;i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function adminIdDoEmail(email) {
    const e = String(email).trim().toLowerCase();
    let h = 2166136261;
    for (let i = 0;i < e.length; i++) {
      h ^= e.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "adm_" + (h >>> 0).toString(16);
  }
  var FORMATO_EMAIL = /.+@.+\..+/;
  function avaliarLogin(registro, email, senha, agora, gerarSal, gerarToken) {
    const e = String(email || "").trim().toLowerCase();
    const s = String(senha || "");
    if (!e || !s.trim() || !FORMATO_EMAIL.test(e)) {
      return { sessao: null, registro, aguardeMs: 0 };
    }
    if (!registro) {
      const sal = gerarSal();
      const novo = {
        credencial: { email: e, senhaHash: hashSenha(s, sal), sal },
        tentativas: 0,
        bloqueioAte: 0
      };
      return {
        sessao: criarSessaoSuperAdmin(adminIdDoEmail(e), "todos", agora, gerarToken()),
        registro: novo,
        aguardeMs: 0
      };
    }
    if (registro.bloqueioAte > 0 && agora < registro.bloqueioAte) {
      return { sessao: null, registro, aguardeMs: registro.bloqueioAte - agora };
    }
    const confere = e === registro.credencial.email && hashSenha(s, registro.credencial.sal) === registro.credencial.senhaHash;
    if (confere) {
      return {
        sessao: criarSessaoSuperAdmin(adminIdDoEmail(e), "todos", agora, gerarToken()),
        registro: { ...registro, tentativas: 0, bloqueioAte: 0 },
        aguardeMs: 0
      };
    }
    const tentativas = registro.tentativas + 1;
    const atraso = calcularAtrasoMs(tentativas);
    return {
      sessao: null,
      registro: { ...registro, tentativas, bloqueioAte: atraso > 0 ? agora + atraso : 0 },
      aguardeMs: atraso
    };
  }
  var CHAVE_CREDENCIAL = "pipoca.admin.credencial.v1";
  var CHAVE_SESSAO2 = "pipoca.admin.sessao.v1";
  function storagePadrao2() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function lerJson(armazem, chave) {
    try {
      const raw = armazem.getItem(chave);
      if (raw === null)
        return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function gravarJson(armazem, chave, valor) {
    try {
      armazem.setItem(chave, JSON.stringify(valor));
    } catch {}
  }
  function criarRepositorioAdmin(armazem) {
    const st = armazem ?? storagePadrao2();
    const aleatorio = () => Math.random().toString(36).slice(2) + (Date.now() % 16777215).toString(36);
    return {
      async autenticar(email, senha) {
        if (!st)
          return null;
        const registro = lerJson(st, CHAVE_CREDENCIAL);
        const r = avaliarLogin(registro, email, senha, Date.now(), aleatorio, () => aleatorio() + aleatorio());
        if (r.registro && r.registro !== registro)
          gravarJson(st, CHAVE_CREDENCIAL, r.registro);
        if (r.sessao)
          gravarJson(st, CHAVE_SESSAO2, r.sessao);
        return r.sessao;
      },
      async carregarSessao() {
        if (!st)
          return null;
        const s = lerJson(st, CHAVE_SESSAO2);
        if (!s || typeof s !== "object" || s.papel !== "super_admin")
          return null;
        return s;
      },
      async encerrarSessao() {
        if (!st)
          return;
        try {
          st.removeItem(CHAVE_SESSAO2);
        } catch {}
      }
    };
  }

  // src/backend/auth.ts
  var ERRO_LOGIN_NEUTRO = "Não foi possível entrar. Confira os dados e tente de novo.";
  var ERRO_CRIAR_CONTA = "Não foi possível criar a conta. Confira o e-mail e use uma senha com pelo menos 6 caracteres.";

  // src/backend/config.ts
  var CONFIG_LOCAL = { provedor: "local" };
  function normalizarConfigBackend(raw) {
    if (!raw || typeof raw !== "object")
      return { ...CONFIG_LOCAL };
    const r = raw;
    const provedor = r["provedor"];
    if (provedor === "supabase") {
      const url = r["supabaseUrl"];
      const anon = r["supabaseAnonKey"];
      if (typeof url === "string" && url.length > 0 && typeof anon === "string" && anon.length > 0) {
        return { provedor: "supabase", supabaseUrl: url.replace(/\/+$/, ""), supabaseAnonKey: anon };
      }
      return { ...CONFIG_LOCAL };
    }
    return { ...CONFIG_LOCAL };
  }
  function configDoAmbiente() {
    try {
      const g = globalThis;
      return normalizarConfigBackend(g.PIPOCA_CONFIG);
    } catch {
      return { ...CONFIG_LOCAL };
    }
  }

  // src/ia/provedor.ts
  function transportePadrao() {
    return (url, init) => fetch(url, init);
  }

  // src/backend/adaptadores/auth_supabase.ts
  var CHAVE_SESSAO_BACKEND = "pipoca.backend.sessao.v1";
  var ERRO_CONFIRMACAO = "Quase lá! Confirme o e-mail que enviamos e tente entrar de novo.";
  function storage() {
    try {
      const g = globalThis;
      return g.localStorage || null;
    } catch {
      return null;
    }
  }
  function lerSessaoBackend() {
    const st = storage();
    if (!st)
      return null;
    try {
      const raw = st.getItem(CHAVE_SESSAO_BACKEND);
      const s = raw ? JSON.parse(raw) : null;
      if (s && typeof s.access_token === "string" && typeof s.refresh_token === "string" && typeof s.uid === "string" && typeof s.validaAte === "number" && (s.tipo === "familia" || s.tipo === "superadmin")) {
        return s;
      }
    } catch {}
    return null;
  }
  function gravarSessaoBackend(s) {
    const st = storage();
    if (!st)
      return;
    try {
      if (s)
        st.setItem(CHAVE_SESSAO_BACKEND, JSON.stringify(s));
      else
        st.removeItem(CHAVE_SESSAO_BACKEND);
    } catch {}
  }
  function criarAuthSupabase(op) {
    const transporte = op.transporte || transportePadrao();
    const agora = op.agora || (() => Date.now());
    const base = op.url.replace(/\/+$/, "");
    function cabecalhos(bearer) {
      const h = { "content-type": "application/json", apikey: op.anonKey };
      if (bearer)
        h["Authorization"] = "Bearer " + bearer;
      return h;
    }
    async function chamarToken(rota, corpo) {
      const resp = await transporte(base + rota, {
        method: "POST",
        headers: cabecalhos(),
        body: JSON.stringify(corpo)
      });
      if (resp.status !== 200)
        return null;
      return await resp.json();
    }
    function assentarSessao(r, tipo, tenantId) {
      const uid = r.user && r.user.id || "";
      const email = r.user && r.user.email || undefined;
      const t = agora();
      const sess = {
        access_token: r.access_token,
        refresh_token: r.refresh_token || "",
        expiraTokenEm: t + Math.max(30, (r.expires_in || 3600) - 60) * 1000,
        validaAte: t + DURACAO_SESSAO_MS,
        uid,
        tipo,
        ...email ? { email } : {},
        ...tenantId ? { tenantId } : {}
      };
      gravarSessaoBackend(sess);
      if (tipo === "familia") {
        salvarConta({ id: uid, email: email || "", criadaEm: t });
        salvarSessaoConta(criarSessao(uid, t));
      }
      return { uid, tipo, ...tenantId ? { tenantId } : {} };
    }
    async function linhaDeOperador(uid, bearer) {
      try {
        const resp = await transporte(base + "/rest/v1/operadores?select=uid,escopo&uid=eq." + encodeURIComponent(uid), {
          method: "GET",
          headers: cabecalhos(bearer)
        });
        if (resp.status !== 200)
          return null;
        const linhas = await resp.json();
        return Array.isArray(linhas) && linhas[0] ? linhas[0] : null;
      } catch {
        return null;
      }
    }
    async function tenantVinculado(bearer) {
      try {
        const resp = await transporte(base + "/rest/v1/contas_tenant?select=tenant_id&order=criado_em.asc&limit=1", { method: "GET", headers: cabecalhos(bearer) });
        if (resp.status !== 200)
          return;
        const linhas = await resp.json();
        const t = Array.isArray(linhas) && linhas[0] ? linhas[0].tenant_id : undefined;
        return typeof t === "string" && t.length > 0 ? t : undefined;
      } catch {
        return;
      }
    }
    async function renovar() {
      const atual = lerSessaoBackend();
      if (!atual || !atual.refresh_token)
        return null;
      const r = await chamarToken("/auth/v1/token?grant_type=refresh_token", { refresh_token: atual.refresh_token });
      if (!r || !r.access_token) {
        gravarSessaoBackend(null);
        if (atual.tipo === "familia")
          limparSessaoConta();
        return null;
      }
      const t = agora();
      const nova = {
        ...atual,
        access_token: r.access_token,
        refresh_token: r.refresh_token || atual.refresh_token,
        expiraTokenEm: t + Math.max(30, (r.expires_in || 3600) - 60) * 1000,
        validaAte: t + DURACAO_SESSAO_MS
      };
      gravarSessaoBackend(nova);
      return nova;
    }
    return {
      async entrarFamilia(cred) {
        const email = (cred.email || "").trim().toLowerCase();
        const senha = cred.senha || "";
        if (!email || !senha)
          throw new Error(ERRO_LOGIN_NEUTRO);
        let r = await chamarToken("/auth/v1/token?grant_type=password", { email, password: senha });
        if (!r || !r.access_token) {
          const s = await chamarToken("/auth/v1/signup", { email, password: senha });
          if (s && s.access_token)
            r = s;
          else if (s && s.user && !s.access_token)
            throw new Error(ERRO_CONFIRMACAO);
          else
            throw new Error(ERRO_LOGIN_NEUTRO);
        }
        return assentarSessao(r, "familia", await tenantVinculado(r.access_token));
      },
      async entrarSuperAdmin(cred) {
        const email = (cred.email || "").trim().toLowerCase();
        const senha = cred.senha || "";
        if (!email || !senha)
          throw new Error(ERRO_LOGIN_NEUTRO);
        const r = await chamarToken("/auth/v1/token?grant_type=password", { email, password: senha });
        if (!r || !r.access_token || !r.user || !r.user.id)
          throw new Error(ERRO_LOGIN_NEUTRO);
        const linha = await linhaDeOperador(r.user.id, r.access_token);
        if (!linha) {
          try {
            await transporte(base + "/auth/v1/logout", { method: "POST", headers: cabecalhos(r.access_token), body: "{}" });
          } catch {}
          throw new Error(ERRO_LOGIN_NEUTRO);
        }
        const escopo = linha.escopo;
        const tenantId = Array.isArray(escopo) && typeof escopo[0] === "string" ? escopo[0] : undefined;
        return assentarSessao(r, "superadmin", tenantId);
      },
      async criarFamilia(cred) {
        const email = (cred.email || "").trim().toLowerCase();
        const senha = cred.senha || "";
        if (!email || !email.includes("@") || senha.length < 6)
          throw new Error(ERRO_CRIAR_CONTA);
        const s = await chamarToken("/auth/v1/signup", { email, password: senha });
        if (s && s.access_token)
          return assentarSessao(s, "familia", await tenantVinculado(s.access_token));
        if (s && s.user)
          return null;
        throw new Error(ERRO_CRIAR_CONTA);
      },
      async recuperarSenha(email) {
        const e = (email || "").trim().toLowerCase();
        if (!e || !e.includes("@"))
          return;
        try {
          await transporte(base + "/auth/v1/recover", {
            method: "POST",
            headers: cabecalhos(),
            body: JSON.stringify({ email: e })
          });
        } catch {}
      },
      async redefinirSenha(tokenRecuperacao, novaSenha) {
        if (!tokenRecuperacao)
          throw new Error("O link de redefinição venceu. Peça um novo e tente de novo.");
        if ((novaSenha || "").length < 6)
          throw new Error("A nova senha precisa de pelo menos 6 caracteres.");
        const resp = await transporte(base + "/auth/v1/user", {
          method: "PUT",
          headers: cabecalhos(tokenRecuperacao),
          body: JSON.stringify({ password: novaSenha })
        });
        if (resp.status !== 200) {
          throw new Error("O link de redefinição venceu. Peça um novo e tente de novo.");
        }
      },
      async alterarSenha(novaSenha) {
        if ((novaSenha || "").length < 6)
          throw new Error("A nova senha precisa de pelo menos 6 caracteres.");
        const token = await this.obterToken();
        if (!token)
          throw new Error("A sessão venceu — entre de novo para trocar a senha.");
        const resp = await transporte(base + "/auth/v1/user", {
          method: "PUT",
          headers: cabecalhos(token),
          body: JSON.stringify({ password: novaSenha })
        });
        if (resp.status !== 200)
          throw new Error("Não deu para trocar a senha agora. Tente de novo.");
      },
      async alterarEmail(novoEmail) {
        const email = (novoEmail || "").trim().toLowerCase();
        if (!email || !email.includes("@"))
          throw new Error("Confira o novo e-mail, por favor.");
        const token = await this.obterToken();
        if (!token)
          throw new Error("A sessão venceu — entre de novo para trocar o e-mail.");
        const resp = await transporte(base + "/auth/v1/user", {
          method: "PUT",
          headers: cabecalhos(token),
          body: JSON.stringify({ email })
        });
        if (resp.status !== 200)
          throw new Error("Não deu para trocar o e-mail agora. Tente de novo.");
      },
      entrarComGoogle(redirecionarPara) {
        const g = globalThis;
        const origin = g.location && g.location.origin || "";
        const destino = redirecionarPara || (origin ? origin + "/app" : "");
        const url = base + "/auth/v1/authorize?provider=google" + (destino ? "&redirect_to=" + encodeURIComponent(destino) : "");
        if (g.location) {
          if (typeof g.location.assign === "function")
            g.location.assign(url);
          else
            g.location.href = url;
        }
      },
      async capturarRetornoOAuth() {
        const g = globalThis;
        const hash = g.location && g.location.hash || "";
        if (hash.length < 2)
          return null;
        const frag = new URLSearchParams(hash.charAt(0) === "#" ? hash.slice(1) : hash);
        const access = frag.get("access_token");
        const refresh = frag.get("refresh_token");
        const limparFragmento = () => {
          try {
            if (g.history && g.history.replaceState && g.location) {
              g.history.replaceState(null, "", (g.location.pathname || "/") + (g.location.search || ""));
            }
          } catch {}
        };
        if (!access || !refresh)
          return null;
        let user = null;
        try {
          const resp = await transporte(base + "/auth/v1/user", { method: "GET", headers: cabecalhos(access) });
          if (resp.status === 200)
            user = await resp.json();
        } catch {}
        limparFragmento();
        if (!user || !user.id)
          return null;
        const r = {
          access_token: access,
          refresh_token: refresh,
          expires_in: Number(frag.get("expires_in")) || 3600,
          user
        };
        return assentarSessao(r, "familia", await tenantVinculado(access));
      },
      async sair() {
        const s = lerSessaoBackend();
        gravarSessaoBackend(null);
        if (!s || s.tipo === "familia")
          limparSessaoConta();
        if (s) {
          try {
            await transporte(base + "/auth/v1/logout", { method: "POST", headers: cabecalhos(s.access_token), body: "{}" });
          } catch {}
        }
      },
      sessaoAtual() {
        const s = lerSessaoBackend();
        if (!s || s.validaAte <= agora())
          return null;
        return { uid: s.uid, tipo: s.tipo, ...s.tenantId ? { tenantId: s.tenantId } : {} };
      },
      async obterToken() {
        const s = lerSessaoBackend();
        if (!s || s.validaAte <= agora())
          return null;
        if (s.expiraTokenEm > agora())
          return s.access_token;
        const nova = await renovar();
        return nova ? nova.access_token : null;
      },
      async renovarSessao() {
        await renovar();
      }
    };
  }

  // src/backend/adaptadores/repo_supabase.ts
  class RepositorioSupabase {
    op;
    transporte;
    base;
    constructor(op) {
      this.op = op;
      this.transporte = op.transporte || transportePadrao();
      this.base = op.url.replace(/\/+$/, "") + "/rest/v1";
    }
    async req(caminho, metodo, corpo, prefer) {
      const token = await this.op.obterToken();
      if (!token)
        throw new Error("Sem sessão para o repositório remoto.");
      const headers = {
        apikey: this.op.anonKey,
        Authorization: "Bearer " + token,
        "content-type": "application/json"
      };
      if (prefer)
        headers["Prefer"] = prefer;
      const resp = await this.transporte(this.base + caminho, {
        method: metodo,
        headers,
        ...corpo !== undefined ? { body: JSON.stringify(corpo) } : {}
      });
      if (resp.status < 200 || resp.status >= 300) {
        throw new Error("Supabase: HTTP " + resp.status + " em " + metodo + " " + caminho);
      }
      try {
        return await resp.json();
      } catch {
        return null;
      }
    }
    async carregarPerfis() {
      const linhas = await this.req("/perfis?select=dados", "GET");
      const validos = [];
      for (const l of Array.isArray(linhas) ? linhas : []) {
        const p = validarEnvelopePerfil(l ? l.dados : null);
        if (p !== null)
          validos.push(p);
      }
      return validos;
    }
    async salvarPerfil(p) {
      const tenant = this.op.tenant ? this.op.tenant() : null;
      await this.req("/perfis?on_conflict=id", "POST", [{ id: p.id, ...tenant ? { tenant_id: tenant } : {}, dados: { esquema: "pipoca.perfil.v1", perfil: { ...p } } }], "resolution=merge-duplicates,return=minimal");
    }
    async carregarSave(perfilId) {
      const linhas = await this.req("/saves?select=dados&perfil_id=eq." + encodeURIComponent(perfilId), "GET");
      const l = Array.isArray(linhas) ? linhas[0] : null;
      return l ? validarEnvelopeSave(l.dados) : null;
    }
    async salvarSave(perfilId, estado) {
      await this.req("/saves?on_conflict=perfil_id", "POST", [{ perfil_id: perfilId, dados: { esquema: "pipoca.save.v1", perfilId, estado } }], "resolution=merge-duplicates,return=minimal");
    }
    async registrarTelemetria(evento) {
      await this.req("/telemetria", "POST", [{ perfil_id: evento.perfilId, evento }], "return=minimal");
    }
    async carregarTelemetria(perfilId) {
      const linhas = await this.req("/telemetria?select=evento&perfil_id=eq." + encodeURIComponent(perfilId) + "&order=criado_em.asc", "GET");
      const out = [];
      for (const l of Array.isArray(linhas) ? linhas : []) {
        if (l && validarEvento(l.evento))
          out.push(l.evento);
      }
      return out;
    }
    async podarTelemetria(perfilId, agora, retencaoDias = RETENCAO_DIAS_PADRAO) {
      const limite = new Date(agora - retencaoDias * 86400000).toISOString();
      await this.req("/telemetria?perfil_id=eq." + encodeURIComponent(perfilId) + "&criado_em=lt." + encodeURIComponent(limite), "DELETE", undefined, "return=minimal");
      return 0;
    }
    async carregarHistorias(perfilId) {
      const linhas = await this.req("/historias?select=dados,atualizado_em&perfil_id=eq." + encodeURIComponent(perfilId) + "&order=criada_em.desc", "GET");
      const out = [];
      for (const l of Array.isArray(linhas) ? linhas : []) {
        const h = validarHistoriaSalva(l && l.dados ? l.dados.historia : null);
        if (h === null)
          continue;
        if (h.atualizadoEm === undefined && typeof l.atualizado_em === "string") {
          const t = Date.parse(l.atualizado_em);
          if (Number.isFinite(t))
            h.atualizadoEm = t;
        }
        out.push(h);
      }
      return out;
    }
    async salvarHistoria(perfilId, historia) {
      const carimbo = typeof historia.atualizadoEm === "number" ? historia.atualizadoEm : Date.now();
      await this.req("/historias?on_conflict=id", "POST", [{
        id: historia.id,
        perfil_id: perfilId,
        favorita: historia.favorita === true,
        criada_em: new Date(historia.criadaEm).toISOString(),
        atualizado_em: new Date(carimbo).toISOString(),
        dados: { esquema: ESQUEMA_HISTORIAS, historia: { ...historia } }
      }], "resolution=merge-duplicates,return=minimal");
    }
    async apagarHistoria(perfilId, historiaId) {
      await this.req("/historias?perfil_id=eq." + encodeURIComponent(perfilId) + "&id=eq." + encodeURIComponent(historiaId), "DELETE", undefined, "return=minimal");
    }
    async podarHistorias(perfilId, agora) {
      const limite = new Date(agora - RETENCAO_HISTORIAS_DIAS * 86400000).toISOString();
      await this.req("/historias?perfil_id=eq." + encodeURIComponent(perfilId) + "&favorita=eq.false&criada_em=lt." + encodeURIComponent(limite), "DELETE", undefined, "return=minimal");
      return 0;
    }
    async apagarPerfil(perfilId) {
      const id = encodeURIComponent(perfilId);
      await this.req("/telemetria?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
      await this.req("/historias?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
      await this.req("/saves?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
      await this.req("/perfis?id=eq." + id, "DELETE", undefined, "return=minimal");
    }
  }

  // src/backend/adaptadores/fila_remota.ts
  var CHAVE_FILA_REMOTA = "pipoca.fila-remota.v1";
  var TETO_FILA_REMOTA = 50;
  var MAX_TENTATIVAS_ITEM = 10;
  var OPS = ["salvarPerfil", "salvarSave", "registrarTelemetria", "salvarHistoria", "apagarHistoria"];
  function storage2() {
    try {
      const g = globalThis;
      return g.localStorage || null;
    } catch {
      return null;
    }
  }
  function lerFilaRemota() {
    const st = storage2();
    if (!st)
      return [];
    try {
      const raw = st.getItem(CHAVE_FILA_REMOTA);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr))
        return [];
      return arr.filter((x) => {
        const r = x;
        return typeof x === "object" && x !== null && OPS.includes(r["op"]) && typeof r["perfilId"] === "string" && typeof r["id"] === "string" && typeof r["tentativas"] === "number";
      });
    } catch {
      return [];
    }
  }
  function gravarFila(itens) {
    if (!gravarItem(CHAVE_FILA_REMOTA, itens) && itens.length > 1) {
      gravarItem(CHAVE_FILA_REMOTA, itens.slice(1));
    }
  }
  function enfileirarRemoto(item) {
    const chave = item.op + "|" + item.perfilId + "|" + item.id;
    const fila = lerFilaRemota().filter((x) => x.op + "|" + x.perfilId + "|" + x.id !== chave);
    fila.push({ ...item, tentativas: 0, quando: item.quando ?? Date.now() });
    gravarFila(fila.slice(-TETO_FILA_REMOTA));
  }
  function executar(remoto, item) {
    switch (item.op) {
      case "salvarPerfil":
        return remoto.salvarPerfil(item.payload);
      case "salvarSave":
        return remoto.salvarSave(item.perfilId, item.payload);
      case "registrarTelemetria":
        return remoto.registrarTelemetria(item.payload);
      case "salvarHistoria":
        return remoto.salvarHistoria ? remoto.salvarHistoria(item.perfilId, item.payload) : Promise.resolve();
      case "apagarHistoria":
        return remoto.apagarHistoria ? remoto.apagarHistoria(item.perfilId, item.id) : Promise.resolve();
    }
  }
  async function drenarFilaRemota(remoto) {
    const fila = lerFilaRemota();
    if (!fila.length)
      return { drenados: 0, restantes: 0 };
    const sobras = [];
    let drenados = 0;
    for (const item of fila) {
      try {
        await executar(remoto, item);
        drenados++;
      } catch (e) {
        const ultimoErro = String(e?.message || e);
        const tentativas = item.tentativas + 1;
        if (tentativas >= MAX_TENTATIVAS_ITEM) {
          console.warn("[pipoca.sync] item da fila remota DESCARTADO após " + tentativas + " tentativas", {
            op: item.op,
            perfilId: item.perfilId,
            id: item.id,
            ultimoErro
          });
        } else {
          sobras.push({ ...item, tentativas, ultimoErro });
        }
      }
    }
    gravarFila(sobras);
    return { drenados, restantes: sobras.length };
  }

  // src/backend/adaptadores/repo_sincronizado.ts
  var _aoMesclarHistorias = null;
  function aoMesclarHistorias(fn) {
    _aoMesclarHistorias = fn;
  }
  function historiaDiverge(a, b) {
    if (!a)
      return true;
    return (a.atualizadoEm || 0) !== (b.atualizadoEm || 0) || a.favorita !== b.favorita || a.texto !== b.texto;
  }
  async function aplicarMesclaHistorias(local, perfilId, locais, remotas, agora) {
    if (!local.salvarHistoria || !remotas.length)
      return 0;
    const mescla = normalizarHistorias(mesclarHistorias(locais, remotas), agora);
    const antes = new Map(locais.map((h) => [h.id, h]));
    let gravadas = 0;
    for (const h of mescla) {
      if (!historiaDiverge(antes.get(h.id), h))
        continue;
      await local.salvarHistoria(perfilId, h);
      gravadas++;
    }
    return gravadas;
  }
  var CHAVE_TOMBSTONES = "pipoca.sync.apagados.v1";
  function storage3() {
    try {
      const g = globalThis;
      return g.localStorage || null;
    } catch {
      return null;
    }
  }
  function lerTombstones() {
    const st = storage3();
    if (!st)
      return [];
    try {
      const raw = st.getItem(CHAVE_TOMBSTONES);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  function gravarTombstones(ids) {
    const st = storage3();
    if (!st)
      return;
    try {
      if (ids.length)
        st.setItem(CHAVE_TOMBSTONES, JSON.stringify(ids));
      else
        st.removeItem(CHAVE_TOMBSTONES);
    } catch {}
  }
  function adicionarTombstone(id) {
    const atuais = lerTombstones();
    if (atuais.indexOf(id) < 0)
      gravarTombstones([...atuais, id]);
  }
  function removerTombstone(id) {
    gravarTombstones(lerTombstones().filter((x) => x !== id));
  }
  function ehTransitorio(e) {
    const m = String(e?.message ?? e ?? "");
    const http = /HTTP (\d{3})/.exec(m);
    if (http) {
      const s = Number(http[1]);
      return s >= 500 || s === 429 || s === 408;
    }
    if (/sem sessão/i.test(m))
      return false;
    return true;
  }
  var _avisouLeituraRemota = false;
  function _avisarLeituraUmaVez(e) {
    if (_avisouLeituraRemota)
      return;
    _avisouLeituraRemota = true;
    console.info("[pipoca.sync] leitura remota de histórias indisponível (offline/sem sessão) — seguimos no local", String(e?.message ?? e ?? ""));
  }
  function criarRepositorioSincronizado(local, remoto, opcoes) {
    const atrasos = opcoes && opcoes.atrasosRetryMs || [1000, 4000];
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    async function tentarRemoto(exec) {
      let ultimo;
      for (let i = 0;i <= atrasos.length; i++) {
        try {
          await exec();
          return;
        } catch (e) {
          ultimo = e;
          if (!ehTransitorio(e) || i === atrasos.length)
            break;
          await dormir(atrasos[i]);
        }
      }
      throw ultimo;
    }
    function espelhar(op, perfilId, id, payload, exec) {
      tentarRemoto(exec).catch((e) => {
        const erro = String(e?.message ?? e ?? "");
        console.warn("[pipoca.sync] espelho remoto falhou — item na fila", { op, perfilId, id, erro });
        try {
          enfileirarRemoto({ op, perfilId, id, payload, ultimoErro: erro });
        } catch {}
        try {
          local.registrarTelemetria(criarEvento("espelho_falhou", perfilId, { op, erro }, Date.now())).catch((e2) => console.warn("[pipoca.sync] rastro local da falha não gravou (o warn acima fica)", String(e2?.message ?? e2 ?? "")));
        } catch {}
      });
    }
    return {
      carregarPerfis: () => local.carregarPerfis(),
      carregarSave: (perfilId) => local.carregarSave(perfilId),
      carregarTelemetria: (perfilId) => local.carregarTelemetria(perfilId),
      async salvarPerfil(p) {
        await local.salvarPerfil(p);
        espelhar("salvarPerfil", p.id, p.id, p, () => remoto.salvarPerfil(p));
      },
      async salvarSave(perfilId, estado) {
        await local.salvarSave(perfilId, estado);
        espelhar("salvarSave", perfilId, perfilId, estado, () => remoto.salvarSave(perfilId, estado));
      },
      async registrarTelemetria(evento) {
        await local.registrarTelemetria(evento);
        espelhar("registrarTelemetria", evento.perfilId, evento.tipo + ":" + evento.ts, evento, () => remoto.registrarTelemetria(evento));
      },
      async podarTelemetria(perfilId, agora, retencaoDias) {
        const removidos = local.podarTelemetria ? await local.podarTelemetria(perfilId, agora, retencaoDias) : 0;
        if (remoto.podarTelemetria) {
          remoto.podarTelemetria(perfilId, agora, retencaoDias).catch((e) => console.warn("[pipoca.sync] poda remota de telemetria falhou (refeita na próxima borda)", { perfilId, erro: String(e?.message ?? e ?? "") }));
        }
        return removidos;
      },
      async apagarPerfil(perfilId) {
        await local.apagarPerfil(perfilId);
        adicionarTombstone(perfilId);
        remoto.apagarPerfil(perfilId).then(() => removerTombstone(perfilId)).catch((e) => console.warn("[pipoca.sync] apagar remoto falhou — tombstone fica na fila", { perfilId, erro: String(e?.message ?? e ?? "") }));
      },
      carregarHistorias(perfilId) {
        const locais = local.carregarHistorias ? local.carregarHistorias(perfilId) : Promise.resolve([]);
        if (remoto.carregarHistorias) {
          Promise.all([locais, remoto.carregarHistorias(perfilId)]).then(([l, r]) => aplicarMesclaHistorias(local, perfilId, l, r, Date.now())).then((gravadas) => {
            if (gravadas > 0 && _aoMesclarHistorias)
              _aoMesclarHistorias(perfilId);
          }).catch(_avisarLeituraUmaVez);
        }
        return locais;
      },
      async salvarHistoria(perfilId, historia) {
        if (local.salvarHistoria)
          await local.salvarHistoria(perfilId, historia);
        if (remoto.salvarHistoria) {
          espelhar("salvarHistoria", perfilId, historia.id, historia, () => remoto.salvarHistoria(perfilId, historia));
        }
      },
      async apagarHistoria(perfilId, historiaId) {
        if (local.apagarHistoria)
          await local.apagarHistoria(perfilId, historiaId);
        if (remoto.apagarHistoria) {
          espelhar("apagarHistoria", perfilId, historiaId, null, () => remoto.apagarHistoria(perfilId, historiaId));
        }
      },
      async podarHistorias(perfilId, agora) {
        const removidas = local.podarHistorias ? await local.podarHistorias(perfilId, agora) : 0;
        if (remoto.podarHistorias) {
          remoto.podarHistorias(perfilId, agora).catch((e) => console.warn("[pipoca.sync] poda remota de histórias falhou (refeita na próxima borda)", { perfilId, erro: String(e?.message ?? e ?? "") }));
        }
        return removidas;
      }
    };
  }

  // src/backend/proxy_realizador.ts
  function criarProxyRealizador(op) {
    const transporte = op.transporte || transportePadrao();
    const base = op.url.replace(/\/+$/, "");
    return async (pacote, _opcoes = {}) => {
      const token = await op.obterToken();
      if (!token)
        throw new Error("ProxyRealizador: sem sessão para realizar.");
      const tenant = op.tenantId ? op.tenantId() : null;
      const resp = await transporte(base + "/functions/v1/realizador", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: op.anonKey,
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          pacote,
          ...tenant ? { tenantId: tenant } : {}
        })
      });
      if (resp.status !== 200) {
        throw new Error("ProxyRealizador: HTTP " + resp.status + " — fallback A+ v3 local.");
      }
      const j = await resp.json();
      if (!j || typeof j.texto !== "string" || j.texto.trim() === "" || !Array.isArray(j.paragrafos) || !j.veredito || j.veredito.pass !== true || !j.origem || j.origem.fonte !== "llm") {
        throw new Error("ProxyRealizador: resposta fora do contrato do realizador.");
      }
      return j;
    };
  }

  // src/backend/tenant.ts
  function escopoTenant(sessao) {
    if (!sessao || !sessao.uid)
      return null;
    if (sessao.tenantId)
      return sessao.tenantId;
    if (sessao.tipo === "familia")
      return "familia:" + sessao.uid;
    return null;
  }

  // src/backend/migracao.ts
  async function migrar(de, para) {
    const perfis = await de.carregarPerfis();
    let saves = 0;
    for (const p of perfis) {
      await para.salvarPerfil(p);
      const save = await de.carregarSave(p.id);
      if (save) {
        await para.salvarSave(p.id, save);
        saves++;
      }
      if (de.carregarHistorias && para.salvarHistoria) {
        try {
          for (const h of await de.carregarHistorias(p.id)) {
            await para.salvarHistoria(p.id, h);
          }
        } catch {}
      }
    }
    return { perfis: perfis.length, saves };
  }

  // src/backend/sync.ts
  async function sincronizarInicial(local, remoto) {
    let apagadosDrenados = 0;
    for (const id of lerTombstones()) {
      try {
        await remoto.apagarPerfil(id);
        removerTombstone(id);
        apagadosDrenados++;
      } catch {}
    }
    const fila = await drenarFilaRemota(remoto);
    const [locais, remotos] = await Promise.all([local.carregarPerfis(), remoto.carregarPerfis()]);
    const idsLocais = new Set(locais.map((p) => p.id));
    let puxados = 0;
    for (const p of remotos) {
      const ausente = !idsLocais.has(p.id);
      if (ausente) {
        await local.salvarPerfil(p);
        const save = await remoto.carregarSave(p.id);
        if (save)
          await local.salvarSave(p.id, save);
        try {
          for (const ev of await remoto.carregarTelemetria(p.id)) {
            await local.registrarTelemetria(ev);
          }
        } catch {}
        puxados++;
      }
      if (remoto.carregarHistorias && local.salvarHistoria) {
        try {
          const remotas = await remoto.carregarHistorias(p.id);
          const loc = ausente || !local.carregarHistorias ? [] : await local.carregarHistorias(p.id);
          await aplicarMesclaHistorias(local, p.id, loc, remotas, Date.now());
        } catch {}
      }
    }
    const res = await migrar(local, remoto);
    return { apagadosDrenados, puxados, empurrados: res.perfis, filaDrenada: fila.drenados };
  }

  // src/backend/backend.ts
  function sessaoAdminLocal() {
    try {
      const raw = localStorage.getItem("pipoca.admin.sessao.v1");
      const s = raw ? JSON.parse(raw) : null;
      return s && sessaoSuperAdminValida(s, Date.now()) ? s : null;
    } catch {
      return null;
    }
  }
  function criarAuthLocal() {
    const repoAdmin = criarRepositorioAdmin();
    return {
      async entrarFamilia(cred) {
        const r = entrarFamilia(cred.email, cred.senha, Date.now());
        if (!r.ok || !r.conta || !r.sessao)
          throw new Error(r.erro || ERRO_LOGIN_NEUTRO);
        salvarConta(r.conta);
        salvarSessaoConta(r.sessao);
        return { uid: r.conta.id, tipo: "familia" };
      },
      async entrarSuperAdmin(cred) {
        const s = await repoAdmin.autenticar(cred.email, cred.senha);
        if (!s)
          throw new Error(ERRO_LOGIN_NEUTRO);
        return { uid: s.adminId, tipo: "superadmin", ...s.escopoTenants !== "todos" && s.escopoTenants[0] ? { tenantId: s.escopoTenants[0] } : {} };
      },
      async criarFamilia(cred) {
        const r = entrarFamilia(cred.email, cred.senha, Date.now());
        if (!r.ok || !r.conta || !r.sessao)
          throw new Error(r.erro || ERRO_LOGIN_NEUTRO);
        salvarConta(r.conta);
        salvarSessaoConta(r.sessao);
        return { uid: r.conta.id, tipo: "familia" };
      },
      async recuperarSenha(_email) {},
      async alterarSenha(_novaSenha) {},
      async alterarEmail(novoEmail) {
        const email = (novoEmail || "").trim().toLowerCase();
        if (!email || !email.includes("@"))
          throw new Error("Confira o novo e-mail, por favor.");
        const conta = carregarConta();
        if (!conta)
          throw new Error("Sem conta nesta casa ainda.");
        salvarConta({ ...conta, email });
      },
      async sair() {
        const fam = carregarSessaoConta();
        if (fam && sessaoValida(fam, Date.now())) {
          limparSessaoConta();
          return;
        }
        if (sessaoAdminLocal()) {
          await repoAdmin.encerrarSessao();
          return;
        }
        limparSessaoConta();
      },
      sessaoAtual() {
        const fam = carregarSessaoConta();
        if (fam && sessaoValida(fam, Date.now()))
          return { uid: fam.contaId, tipo: "familia" };
        const admin = sessaoAdminLocal();
        if (admin)
          return { uid: admin.adminId, tipo: "superadmin" };
        return null;
      }
    };
  }
  function criarBackendLocal() {
    return {
      auth: criarAuthLocal(),
      repo: criarRepositorio()
    };
  }
  function criarBackendSupabase(cfg) {
    const auth = criarAuthSupabase({ url: cfg.supabaseUrl, anonKey: cfg.supabaseAnonKey });
    const remoto = new RepositorioSupabase({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      obterToken: () => auth.obterToken(),
      tenant: () => escopoTenant(auth.sessaoAtual())
    });
    const local = criarRepositorio();
    const repo = criarRepositorioSincronizado(local, remoto);
    const realizador = criarProxyRealizador({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      obterToken: () => auth.obterToken(),
      tenantId: () => escopoTenant(auth.sessaoAtual())
    });
    return { auth, repo, realizador, sincronizar: () => sincronizarInicial(local, remoto) };
  }
  function obterBackend(config) {
    const cfg = config || configDoAmbiente();
    if (cfg.provedor === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      return criarBackendSupabase(cfg);
    }
    return criarBackendLocal();
  }

  // src/backend/flags_globais.ts
  async function puxarFlagsGlobais(config, transporte) {
    const cfg = config || configDoAmbiente();
    if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey)
      return null;
    try {
      const auth = criarAuthSupabase({
        url: cfg.supabaseUrl,
        anonKey: cfg.supabaseAnonKey,
        ...transporte ? { transporte } : {}
      });
      if (!auth.sessaoAtual())
        return null;
      const token = await auth.obterToken();
      if (!token)
        return null;
      const t = transporte || transportePadrao();
      const resp = await t(cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/flags_admin?select=dados&id=eq.global", {
        method: "GET",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json"
        }
      });
      if (resp.status < 200 || resp.status >= 300)
        return null;
      const json = await resp.json();
      const linha = Array.isArray(json) ? json[0] : undefined;
      if (!linha || !linha.dados || typeof linha.dados !== "object")
        return null;
      const limpo = normalizarFlags(linha.dados);
      salvarFlags(limpo);
      return limpo;
    } catch {
      return null;
    }
  }

  // src/admin/tenant/tiposTenant.ts
  var PLANOS_PADRAO = [
    { id: "gratis", nome: "Grátis", limites: { maxPerfis: 1, iaPermitida: false, cenariosCustomizados: 0, retencaoTelemetriaDias: 30 } },
    { id: "freemium", nome: "Freemium", validadeDias: 60, limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
    { id: "familia", nome: "Família", limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
    { id: "escola", nome: "Escola", limites: { maxPerfis: 40, iaPermitida: true, cenariosCustomizados: 10, retencaoTelemetriaDias: 180 } }
  ];
  var PLANO_MAIS_RESTRITIVO = "gratis";
  var MS_POR_DIA3 = 86400000;
  function limitesDoPlano(planoId) {
    const p = PLANOS_PADRAO.find((x) => x.id === planoId);
    const base = p ?? PLANOS_PADRAO.find((x) => x.id === PLANO_MAIS_RESTRITIVO);
    return { ...base.limites };
  }
  function limitesVigentes(tenant, agora) {
    const p = PLANOS_PADRAO.find((x) => x.id === tenant.planoId);
    if (p && typeof p.validadeDias === "number" && agora > tenant.criadoEm + p.validadeDias * MS_POR_DIA3) {
      return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
    }
    return limitesDoPlano(tenant.planoId);
  }
  function excedeTetoPerfis(contagemAtual, limites) {
    return contagemAtual + 1 > limites.maxPerfis;
  }
  var ESQUEMA_TENANT = "pipoca.tenant.v1";
  function tenantValido(t) {
    if (!t || typeof t !== "object")
      return false;
    const r = t;
    return typeof r["id"] === "string" && r["id"].length > 0 && typeof r["nome"] === "string" && typeof r["planoId"] === "string" && typeof r["ativo"] === "boolean" && typeof r["criadoEm"] === "number";
  }
  function validarEnvelopeTenant(raw) {
    const env = raw;
    if (env && env.esquema === ESQUEMA_TENANT && tenantValido(env.tenant))
      return { ...env.tenant };
    return null;
  }

  // src/backend/limites_familia.ts
  async function limitesDaFamilia(agora, config, transporte) {
    const cfg = config || configDoAmbiente();
    if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey)
      return null;
    try {
      const auth = criarAuthSupabase({
        url: cfg.supabaseUrl,
        anonKey: cfg.supabaseAnonKey,
        ...transporte ? { transporte } : {}
      });
      const s = auth.sessaoAtual();
      if (!s || s.tipo !== "familia")
        return null;
      const tenant = escopoTenant(s);
      if (!tenant)
        return null;
      const token = await auth.obterToken();
      if (!token)
        return null;
      const t = transporte || transportePadrao();
      const resp = await t(cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/tenants?select=dados&id=eq." + encodeURIComponent(tenant), {
        method: "GET",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json"
        }
      });
      if (resp.status < 200 || resp.status >= 300)
        return null;
      const json = await resp.json();
      const linha = Array.isArray(json) ? json[0] : undefined;
      const dados = validarEnvelopeTenant(linha ? linha.dados : null);
      if (!dados)
        return null;
      return limitesVigentes(dados, typeof agora === "number" ? agora : Date.now());
    } catch {
      return null;
    }
  }

  // src/core/composicao.ts
  var ESQUEMA_COMPOSICAO_V3 = "pipoca.grafo-autoral.v3";
  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0;i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function nivelKey(nivel) {
    const s = String(nivel ?? "").trim().toLowerCase();
    if (s === "n1" || s === "n2" || s === "n3" || s === "n4")
      return s;
    const d = s.replace(/[^0-9]/g, "");
    if (d === "1" || d === "2" || d === "3" || d === "4")
      return "n" + d;
    return "n2";
  }
  function variantes(t) {
    if (t === undefined || t === null)
      return [];
    return Array.isArray(t) ? t : [t];
  }
  function escolherVariante(t, rng) {
    const pool = variantes(t);
    if (pool.length === 0)
      return "";
    if (pool.length === 1)
      return pool[0];
    return pool[Math.floor(rng() * pool.length)];
  }
  function totalRodadas(cenario) {
    return cenario.rodadas && cenario.rodadas.length || 0;
  }
  function reveladosAte(cenario, rodada) {
    const out = [];
    for (const r of cenario.rodadas) {
      if (r.n <= rodada) {
        for (const id of r.revela)
          if (out.indexOf(id) === -1)
            out.push(id);
      }
    }
    return out;
  }
  function estaNaUltimaRodada(estado) {
    return estado.rodada >= totalRodadas(estado.cenario);
  }
  function avaliarCondicao(cond, objId, linha) {
    const c = String(cond || "");
    const i = linha.indexOf(objId);
    if (c.indexOf("tem:") === 0) {
      const alvo = c.slice(4);
      return alvo !== objId && linha.indexOf(alvo) !== -1;
    }
    if (c.indexOf("nao_tem:") === 0) {
      return linha.indexOf(c.slice(8)) === -1;
    }
    if (c === "pos:inicio")
      return i === 0 && linha.length > 0;
    if (c === "pos:fim")
      return i !== -1 && i === linha.length - 1;
    if (c === "pos:miolo")
      return i > 0 && i < linha.length - 1;
    if (c.indexOf("antes_de:") === 0) {
      const j = linha.indexOf(c.slice(9));
      return i !== -1 && j !== -1 && i < j;
    }
    if (c.indexOf("depois_de:") === 0) {
      const j = linha.indexOf(c.slice(10));
      return i !== -1 && j !== -1 && i > j;
    }
    return false;
  }
  function casaSe(se, objId, linha) {
    const conds = Array.isArray(se) ? se : [se];
    if (conds.length === 0)
      return false;
    for (const c of conds)
      if (!avaliarCondicao(c, objId, linha))
        return false;
    return true;
  }
  function contaComTempera(cenario, objId, linha, nivel, rng) {
    const obj = cenario.objetos[objId];
    if (!obj)
      return "";
    for (const t of obj.tempera || []) {
      if (casaSe(t.se, objId, linha)) {
        const txt = escolherVariante(t.entao && t.entao[nivel], rng);
        if (txt)
          return txt;
      }
    }
    return escolherVariante(obj.conta[nivel], rng);
  }
  function escolherConectivo(pool, rng, anterior) {
    if (pool.length === 0)
      return "";
    let idx = pool.length === 1 ? 0 : Math.floor(rng() * pool.length);
    if (pool.length > 1 && pool[idx] === anterior)
      idx = (idx + 1) % pool.length;
    return pool[idx];
  }
  function normMarcador(s) {
    return s.normalize("NFC").toLowerCase().replace(/[.,;:!?…"'()]/g, " ").replace(/\s+/g, " ").trim();
  }
  var MARCADORES_BASE = [
    "agora",
    "então",
    "aí",
    "depois",
    "logo",
    "de repente",
    "foi quando",
    "logo depois",
    "pouco depois",
    "no fim",
    "por fim"
  ];
  function marcadoresIniciais(cenario) {
    const set = new Set;
    const conectivos = cenario.moldura.conectivos;
    if (conectivos) {
      for (const k of Object.keys(conectivos)) {
        for (const c of conectivos[k] || [])
          set.add(normMarcador(c));
      }
    }
    for (const m of MARCADORES_BASE)
      set.add(normMarcador(m));
    for (const m of cenario.moldura.marcadores_iniciais || [])
      set.add(normMarcador(m));
    set.delete("");
    return set;
  }
  function comecaComMarcador(texto, marcadores) {
    const alvo = normMarcador(texto);
    for (const m of marcadores) {
      if (alvo === m || alvo.startsWith(m + " "))
        return true;
    }
    return false;
  }
  function nomesProtegidos(cenario) {
    const nomes = [];
    const p = cenario.personagem;
    if (typeof p === "string" && p.trim()) {
      for (const w of p.split(/\s+/))
        if (/^\p{Lu}/u.test(w))
          nomes.push(w);
    }
    if (nomes.length === 0)
      nomes.push("Joana");
    for (const n of cenario.moldura.nomes_proprios || [])
      nomes.push(n);
    return new Set(nomes.map((n) => n.normalize("NFC").toLowerCase().replace(/[^\p{L}]/gu, "")));
  }
  function rebaixarInicial(texto, protegidos) {
    if (!texto)
      return texto;
    const primeira = (texto.split(/\s+/)[0] || "").normalize("NFC").toLowerCase().replace(/[^\p{L}]/gu, "");
    if (primeira && protegidos.has(primeira))
      return texto;
    const i = texto.search(/\p{L}/u);
    if (i < 0)
      return texto;
    return texto.slice(0, i) + texto[i].toLowerCase() + texto.slice(i + 1);
  }
  function textoDesfecho(estado, nivel, rng) {
    const d = estado.cenario.moldura.desfecho;
    if (estado.modos && estado.modos.desfecho === "aberto" && d.aberto && d.aberto.length) {
      const primeiro = estado.linha[0];
      const ultimo = estado.linha[estado.linha.length - 1];
      const teto = typeof d.max_ecos === "number" && d.max_ecos > 0 ? d.max_ecos : 1;
      const partes = [];
      for (const a of d.aberto) {
        if (partes.length >= teto)
          break;
        const temCondicao = a.se_terminou_com !== undefined || a.se_comecou_com !== undefined;
        if (!temCondicao)
          continue;
        if (a.se_terminou_com !== undefined && a.se_terminou_com !== ultimo)
          continue;
        if (a.se_comecou_com !== undefined && a.se_comecou_com !== primeiro)
          continue;
        const txt = escolherVariante(a.fragmento && a.fragmento[nivel], rng);
        if (txt)
          partes.push(txt);
      }
      if (partes.length)
        return partes.join(" ");
    }
    return escolherVariante(d.convergente[nivel], rng);
  }
  function iniciar(cenario, modos) {
    const estado = {
      cenarioId: cenario.id,
      rodada: 1,
      banco: [],
      linha: [],
      pontasTravadas: false,
      historiaTexto: "",
      convergiu: false,
      cenario,
      modos: modos || {}
    };
    estado.banco = bancoDaRodada(estado);
    return estado;
  }
  function bancoDaRodada(estado) {
    const revelados = reveladosAte(estado.cenario, estado.rodada);
    return revelados.filter((id) => estado.linha.indexOf(id) === -1);
  }
  function podeInserir(estado, objetoId, slotIndex) {
    if (estado.rodada < 2)
      return false;
    if (estado.banco.indexOf(objetoId) === -1)
      return false;
    if (estado.linha.indexOf(objetoId) !== -1)
      return false;
    return slotIndex > 0 && slotIndex < estado.linha.length;
  }
  function inserir(estado, objetoId, slotIndex) {
    if (!podeInserir(estado, objetoId, slotIndex))
      return estado;
    const linha = estado.linha.slice();
    linha.splice(slotIndex, 0, objetoId);
    const novo = { ...estado, linha };
    novo.banco = bancoDaRodada(novo);
    return novo;
  }
  function mioloAtual(estado) {
    if (estado.linha.length < 3)
      return [];
    return estado.linha.slice(1, estado.linha.length - 1);
  }
  function podeCompor(estado, objetoId, ordemMiolo) {
    if (estado.rodada < 2)
      return false;
    if (!estado.pontasTravadas)
      return false;
    if (estado.linha.length < 2)
      return false;
    if (estado.banco.indexOf(objetoId) === -1)
      return false;
    if (estado.linha.indexOf(objetoId) !== -1)
      return false;
    const esperado = mioloAtual(estado).concat([objetoId]);
    const ordem = ordemMiolo || [];
    if (ordem.length !== esperado.length)
      return false;
    for (let i = 0;i < ordem.length; i++) {
      if (ordem.indexOf(ordem[i]) !== i)
        return false;
    }
    for (const id of esperado)
      if (ordem.indexOf(id) === -1)
        return false;
    for (const id of ordem)
      if (esperado.indexOf(id) === -1)
        return false;
    return true;
  }
  function compor(estado, objetoId, ordemMiolo) {
    if (!podeCompor(estado, objetoId, ordemMiolo))
      return estado;
    const inicio = estado.linha[0];
    const fim = estado.linha[estado.linha.length - 1];
    const linha = [inicio].concat(ordemMiolo.slice(), [fim]);
    const novo = { ...estado, linha };
    novo.banco = bancoDaRodada(novo);
    return novo;
  }
  function ordenarR1(estado, ordemIds) {
    const rodada1 = estado.cenario.rodadas.find((r) => r.n === 1);
    const limite = rodada1 && rodada1.escolhe || 3;
    const banco = bancoDaRodada({ ...estado, linha: [] });
    const linha = [];
    for (const id of ordemIds || []) {
      if (banco.indexOf(id) !== -1 && linha.indexOf(id) === -1 && linha.length < limite) {
        linha.push(id);
      }
    }
    const novo = { ...estado, linha, pontasTravadas: true };
    novo.banco = bancoDaRodada(novo);
    return novo;
  }
  function montar(estado, nivel) {
    const nk = nivelKey(nivel);
    const cenario = estado.cenario;
    const rng = mulberry32(fnv1a(cenario.id + "|" + estado.linha.join(",") + "|" + nk));
    const partes = [];
    const abertura = escolherVariante(cenario.moldura.abertura[nk], rng);
    if (abertura)
      partes.push(abertura);
    const pool = cenario.moldura.conectivos && cenario.moldura.conectivos[nk] || [];
    const marcadores = marcadoresIniciais(cenario);
    const protegidos = nomesProtegidos(cenario);
    let conectivoAnterior = "";
    for (let i = 0;i < estado.linha.length; i++) {
      const id = estado.linha[i];
      let conta = contaComTempera(cenario, id, estado.linha, nk, rng);
      const ehMiolo = i > 0 && i < estado.linha.length - 1;
      if (conta && ehMiolo && pool.length) {
        const con = escolherConectivo(pool, rng, conectivoAnterior);
        if (con && !comecaComMarcador(conta, marcadores)) {
          conta = con + " " + rebaixarInicial(conta, protegidos);
          conectivoAnterior = con;
        }
      }
      if (conta)
        partes.push(conta);
    }
    if (estaNaUltimaRodada(estado)) {
      const fim = textoDesfecho(estado, nk, rng);
      if (fim)
        partes.push(fim);
    }
    return partes.join(" ");
  }
  function abrirProximaRodada(estado) {
    if (estado.rodada >= totalRodadas(estado.cenario)) {
      return { ...estado, convergiu: true };
    }
    const rodada = estado.rodada + 1;
    const novo = { ...estado, rodada, historiaTexto: "" };
    novo.banco = bancoDaRodada(novo);
    return novo;
  }
  function convergiu(estado) {
    return !!estado.convergiu;
  }

  // src/core/fichas/tipos.ts
  var ESQUEMA_FICHAS_V1 = "pipoca.fichas.v1";

  // src/core/compositor/pacote.ts
  var ESQUEMA_PACOTE_COMPOSICAO_V1 = "pipoca.pacote-composicao.v1";

  // src/core/compositor/gramatica.ts
  var TETO_RELACOES_POR_PACOTE = 2;
  function avaliarCondicao2(cond, objId, linha) {
    const c = String(cond || "");
    const i = linha.indexOf(objId);
    if (c.indexOf("tem:") === 0) {
      const alvo = c.slice(4);
      return alvo !== objId && linha.indexOf(alvo) !== -1;
    }
    if (c.indexOf("nao_tem:") === 0) {
      return linha.indexOf(c.slice(8)) === -1;
    }
    if (c === "pos:inicio")
      return i === 0 && linha.length > 0;
    if (c === "pos:fim")
      return i !== -1 && i === linha.length - 1;
    if (c === "pos:miolo")
      return i > 0 && i < linha.length - 1;
    if (c.indexOf("antes_de:") === 0) {
      const j = linha.indexOf(c.slice(9));
      return i !== -1 && j !== -1 && i < j;
    }
    if (c.indexOf("depois_de:") === 0) {
      const j = linha.indexOf(c.slice(10));
      return i !== -1 && j !== -1 && i > j;
    }
    return false;
  }
  function casaSe2(se, objId, linha) {
    const conds = Array.isArray(se) ? se : [se];
    if (conds.length === 0)
      return false;
    return conds.every((c) => avaliarCondicao2(c, objId, linha));
  }
  function especificidade(se) {
    return Array.isArray(se) ? se.length : 1;
  }
  function selecionarRelacoes(relacoes, linha) {
    const candidatas = relacoes.map((relacao, indice) => ({ relacao, indice })).filter(({ relacao }) => linha.indexOf(relacao.objeto) !== -1 && linha.indexOf(relacao.alvo) !== -1 && casaSe2(relacao.se, relacao.objeto, linha));
    candidatas.sort((a, b) => {
      const porEspecificidade = especificidade(b.relacao.se) - especificidade(a.relacao.se);
      return porEspecificidade !== 0 ? porEspecificidade : a.indice - b.indice;
    });
    return candidatas.slice(0, TETO_RELACOES_POR_PACOTE).map((c) => c.relacao);
  }
  function derivarEco(estado) {
    if (estado.desfecho !== "aberto" || estado.linha.length === 0)
      return null;
    return { abre_com: estado.linha[0], fecha_com: estado.linha[estado.linha.length - 1] };
  }

  // src/core/compositor/compor.ts
  var NIVEIS_VALIDOS2 = ["n1", "n2", "n3", "n4"];
  var PARAGRAFOS_POR_RODADA = { 1: 1, 2: 2, 3: 2, 4: 2 };
  var PALAVRAS_MAX_POR_PARAGRAFO = {
    n1: 25,
    n2: 40,
    n3: 55,
    n4: 70
  };
  function celula(porNivel, nivel, dono, campo) {
    const texto = porNivel ? porNivel[nivel] : undefined;
    if (typeof texto !== "string" || texto.length === 0) {
      throw new Error(`compositor: nível ausente na ficha — objeto "${dono}", campo "${campo}", nível "${nivel}"`);
    }
    return texto;
  }
  function validarEntrada(estado, fichas, perfil) {
    if (!NIVEIS_VALIDOS2.includes(perfil.nivel)) {
      throw new Error(`compositor: perfil sem nível válido — recebido "${perfil.nivel}"`);
    }
    for (const [nome, arquivo] of [
      ["objetos", fichas.objetos],
      ["relacoes", fichas.relacoes],
      ["cenarios", fichas.cenarios]
    ]) {
      if (!arquivo || arquivo.esquema !== ESQUEMA_FICHAS_V1) {
        throw new Error(`compositor: catálogo "${nome}" com esquema desconhecido — esperado "${ESQUEMA_FICHAS_V1}"`);
      }
    }
    if (!Array.isArray(estado.linha) || estado.linha.length === 0) {
      throw new Error("compositor: linha vazia — o Pacote exige ao menos 1 beat");
    }
    if (!(estado.rodada in PARAGRAFOS_POR_RODADA)) {
      throw new Error(`compositor: rodada fora de 1..4 — recebida "${estado.rodada}"`);
    }
  }
  function derivarPapel(indice, tamanho) {
    if (indice === 0)
      return "abertura";
    if (indice === tamanho - 1)
      return "fecho";
    return "miolo";
  }
  function compor2(estado, fichas, perfil) {
    validarEntrada(estado, fichas, perfil);
    const nivel = perfil.nivel;
    const fichaCenario = fichas.cenarios.cenarios[estado.cenarioId];
    if (!fichaCenario) {
      throw new Error(`compositor: cenário sem ficha no catálogo — "${estado.cenarioId}"`);
    }
    const vencedoras = selecionarRelacoes(fichas.relacoes.objeto_x_objeto, estado.linha);
    const beats = estado.linha.map((objeto, indice) => {
      const ficha = fichas.objetos.objetos[objeto];
      if (!ficha) {
        throw new Error(`compositor: objeto sem ficha no catálogo — "${objeto}"`);
      }
      return {
        objeto,
        papel: derivarPapel(indice, estado.linha.length),
        descricao: celula(ficha.descricao, nivel, objeto, "descricao"),
        corpo: celula(ficha.sensacao ? ficha.sensacao.corpo : undefined, nivel, objeto, "sensacao.corpo"),
        ...ficha.sensacao && ficha.sensacao.registro ? { sentimento: ficha.sensacao.registro } : {},
        ...ficha.sensacao && ficha.sensacao.dominante ? { sentido: ficha.sensacao.dominante } : {},
        relacoes: vencedoras.filter((r) => r.objeto === objeto).map((r) => ({ alvo: r.alvo, interacao: celula(r.interacao, nivel, r.objeto, "interacao") }))
      };
    });
    return {
      esquema: ESQUEMA_PACOTE_COMPOSICAO_V1,
      cenario: {
        id: estado.cenarioId,
        descricao: fichaCenario.descricao,
        voz_do_contador: fichaCenario.voz_do_contador,
        sensacao_no_personagem: celula(fichaCenario.sensacao_no_personagem, nivel, estado.cenarioId, "sensacao_no_personagem")
      },
      personagem: { nome: perfil.nome, genero: perfil.genero },
      nivel,
      beats,
      eco: derivarEco(estado),
      restricoes: {
        paragrafos: PARAGRAFOS_POR_RODADA[estado.rodada],
        palavras_max_por_paragrafo: PALAVRAS_MAX_POR_PARAGRAFO[nivel]
      }
    };
  }

  // src/core/realizador/prompt_template.ts
  var DESCRICAO_NIVEL = {
    n1: "Primeiras palavras — sílabas e palavras soltas",
    n2: "Frases curtas — uma linha",
    n3: "Pequenos textos — frases ligadas",
    n4: "Parágrafos — histórias mais longas"
  };
  var MAXIMO_PALAVRAS = {
    n1: [31, 44, 58, 71],
    n2: [55, 77, 100, 122],
    n3: [91, 125, 159, 193],
    n4: [200, 268, 335, 403]
  };
  function rodadaDoPacote(pacote) {
    const r = pacote.beats.length - 2;
    return r < 1 ? 1 : r > 4 ? 4 : r;
  }
  function maximoPalavrasDoPacote(pacote) {
    return MAXIMO_PALAVRAS[pacote.nivel][rodadaDoPacote(pacote) - 1];
  }
  var FEWSHOT_POR_NIVEL = {
    n1: [
      {
        entrada: "ELEMENTOS: vagalume → folha → vento · PERSONAGEM: Joana (menina)",
        saida: "O quintal sussurra segredos, Joana quer ver tudo. A grama fria toca seu pé. Uma luz pisca no fundo, os olhos de Joana seguem. Uma folha desce rodando, o dedo de Joana segue. O vento pula o muro, a pele de Joana sente o fresco. O quintal conta tudo, Joana sente os segredos."
      }
    ],
    n2: [
      {
        entrada: "ELEMENTOS: vagalume → vento → frasco · PERSONAGEM: Joana (menina)",
        saida: "O quintal sussurra segredos. Joana sente a grama fria, quer ver tudo. Seus olhos seguem o vaga-lume piscando no fundo. Ela chega perto na ponta dos pés, e a faísca entra no pote, vira sua lanterninha. O vento pula o muro e corre, fresco, mexendo em tudo. A pele de Joana arrepia, o cabelo mexe. Ela segura o pote de vidro frio e liso com as duas mãos, espiando o mundo lá dentro."
      },
      {
        entrada: "ELEMENTOS: folha → frasco → gato → vento · PERSONAGEM: Pietro (menino)",
        saida: "O quintal sussurra segredos. A grama fria no pé de Pietro faz a vontade de ver tudo. Uma folha solta do galho, desce rodando. O dedo de Pietro acompanha, os olhos dançam. Um pote frio e liso espera na grama. Pietro o segura, espia o mundo. Um gato quieto aparece na cerca, olhos verdes. Pietro silencia, prende a respiração. O gato vê a folha, pula, brincando. O vento pula o muro, corre, fresco. A pele de Pietro arrepia, o cabelo mexe. O quintal continua a sussurrar segredos."
      }
    ],
    n3: [
      {
        entrada: "ELEMENTOS: vento → vagalume → gato → frasco · PERSONAGEM: Pietro (menino)",
        saida: `O quintal sussurra segredos; a grama fria nos pés de Pietro traz vontade de descobrir. O vento rola pelo muro, corre no quintal, fresco de longe, mexe de leve. Os braços de Pietro arrepiam, o cabelo mexe. No canto escuro, luzinha acende e apaga; vaga-lume pisca devagar como estrela. Os olhos de Pietro seguem a pisca, querendo perto.

Na cerca, gato aparece sem barulho, quieto feito sombra, olhos verdes acesos feito lanternas. Pietro fica em silêncio, prende a respiração, troca olhar com o gato, que espia a luzinha. Então, Pietro vê pote de vidro escondido na grama, frio e liso feito pedra de rio, que entorta o mundo. Ele o segura com as duas mãos, fecha um olho para espiar. A faísca do vaga-lume entra no pote, piscando lá dentro — uma lanterninha viva pra carregar. Pietro agora tem um segredo do quintal, guardado bem perto.`
      },
      {
        entrada: "ELEMENTOS: vagalume → folha → gato → frasco · PERSONAGEM: Pietro (menino)",
        saida: "O quintal sussurra segredos, um por um. A grama fria nos pés de Pietro traz a vontade de descobrir. No canto escuro, um vaga-lume acende e apaga, estrelinha pra brincar. Os olhos de Pietro seguem a pisca, e ele na ponta dos pés quer chegar perto. A faísca entra no pote de vidro, virando lanterninha viva. Uma folha se solta do galho alto, descendo rodando no ar. O dedo de Pietro acompanha cada volta, sua mão aberta, esperando. Na cerca, um gato aparece sem barulho, quieto feito sombra, olhos verdes acesos. Pietro fica em silêncio, prende a respiração, e troca um olhar demorado. O gato espia a luzinha piscando, movendo a cabeça. Um pote de vidro, frio e liso feito pedra de rio, está na grama, entortando o mundo. Pietro o segura com as duas mãos, fecha um olho e espia, colhendo os segredos do quintal."
      }
    ],
    n4: [
      {
        entrada: "ELEMENTOS: folha → vagalume → frasco · PERSONAGEM: Pietro (menino)",
        saida: "O quintal sussurra segredos, e a grama fria nos pés de Pietro faz seu coração bater forte de vontade de saber. Do galho alto, uma folha se despede e desce no ar escuro, rodando leve. O dedo de Pietro acompanha as voltas, e sua mão se abre feito ninho, esperando a folha pousar. No canto escuro perto da cerca, uma luzinha acende e apaga, um vaga-lume. Os olhos de Pietro seguem a pisca, e a vontade o move na ponta dos pés, prendendo a respiração, até um pote de vidro na grama. A faísca entra no pote frio e liso, piscando lá dentro, presa e livre, uma lanterninha viva. Pietro o segura com as duas mãos, ergue contra a luz, fecha um olho e espia o mundo que entorta e brilha, pequeno e curvo, e a vontade de saber se colhe no brilho da lanterninha viva."
      },
      {
        entrada: "ELEMENTOS: frasco → vento → gato → vagalume · PERSONAGEM: Pietro (menino)",
        saida: `O quintal sussurra segredos para quem vem ver, e a grama fria nos pés descalços de Pietro faz seu coração bater forte de vontade de saber. Ele segura um pote de vidro com as duas mãos, erguendo-o contra a luz, e fecha um olho para espiar o mundo que entorta lá dentro, virando devagar. O pote vazio parece à espera, e Pietro sente a certeza boa de que a noite ainda vai mandar uma coisinha brilhante para morar ali.

O vento chega rolando por cima do muro, balançando a grama e cheirando a terra molhada. A pele dos braços de Pietro arrepia, ele fecha os olhos e respira fundo, deixando o vento passar como se fosse noite. Em cima da cerca, um gato já está sentado, e Pietro fica em silêncio, prendendo a respiração, trocando um olhar demorado e piscando devagar de volta. No canto do quintal, uma luzinha acende e apaga, flutuando. Os olhos de Pietro seguem a pisca, e a vontade de chegar perto o guia, então a faísca roda no ar, encontra o pote e entra devagarinho, piscando quentinha, como quem chega em casa.`
      }
    ]
  };
  function rotuloGenero(genero) {
    return genero === "f" ? "menina" : "menino";
  }
  function personalizarExemplo(ex, nomeAlvo, generoAlvo) {
    const m = ex.entrada.match(/PERSONAGEM:\s*([^()]+?)\s*\((menina|menino)\)/);
    if (!m)
      return ex;
    const nomeFonte = m[1].trim();
    const generoFonte = m[2] === "menina" ? "f" : "m";
    const trocar = (s) => {
      let out = s.replace(new RegExp("\\b" + nomeFonte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"), nomeAlvo);
      if (generoFonte !== generoAlvo) {
        const pares = generoAlvo === "m" ? [["menina", "menino"], ["Ela", "Ele"], ["ela", "ele"], ["Dela", "Dele"], ["dela", "dele"]] : [["menino", "menina"], ["Ele", "Ela"], ["ele", "ela"], ["Dele", "Dela"], ["dele", "dela"]];
        for (const [de, para] of pares)
          out = out.replace(new RegExp("\\b" + de + "\\b", "g"), para);
      }
      return out;
    };
    return { entrada: trocar(ex.entrada), saida: trocar(ex.saida) };
  }
  function montarPromptRealizador(pacote) {
    const nivel = pacote.nivel;
    const nome = pacote.personagem.nome;
    const genero = rotuloGenero(pacote.personagem.genero);
    const maximo = maximoPalavrasDoPacote(pacote);
    const linhasUser = [];
    linhasUser.push(`LUGAR: ${pacote.cenario.descricao}`);
    linhasUser.push(`VOZ DO LUGAR: ${pacote.cenario.voz_do_contador}`);
    linhasUser.push(`O QUE O LUGAR FAZ SENTIR: ${pacote.cenario.sensacao_no_personagem}`);
    linhasUser.push(`PERSONAGEM: ${nome} (${genero})`);
    linhasUser.push("", "ELEMENTOS, NA ORDEM:");
    pacote.beats.forEach((beat, i) => {
      linhasUser.push(`${i + 1}. ${beat.objeto} (${beat.papel})`);
      linhasUser.push(`   O QUE É: ${beat.descricao}`);
      linhasUser.push(`   CORPO: ${beat.corpo}`);
      if (beat.sentimento)
        linhasUser.push(`   SENTIMENTO: ${beat.sentimento}`);
      if (beat.sentido)
        linhasUser.push(`   SENTIDO: ${beat.sentido}`);
      for (const relacao of beat.relacoes) {
        linhasUser.push(`   INTERAÇÃO (com ${relacao.alvo}): ${relacao.interacao}`);
      }
    });
    const linhasSystem = [
      "Escreva uma história infantil curta a partir do MATERIAL abaixo.",
      `O corpo de ${nome} guia cada cena: use os gestos dados em CORPO, não invente emoções abstratas.`,
      "O lugar é o contador: a voz do lugar abre e costura a história.",
      "Plante a vontade na abertura; feche colhendo essa vontade no corpo.",
      ...pacote.beats.some((b) => b.sentimento || b.sentido) ? ["Use o SENTIMENTO de cada elemento como clima da cena, SEM escrever essa palavra; o SENTIDO diz qual percepção guia (visão, tato, som…)."] : [],
      "NÃO invente acontecimentos, objetos, personagens ou falas.",
      "NÃO remova nenhum elemento. NÃO mude a ordem dos elementos.",
      `NÃO troque o nome (${nome}), o gênero (${genero}) ou a idade.`,
      "Escreva no tempo PRESENTE (a história acontece agora), como nos exemplos abaixo.",
      `Não use "ele" ou "ela" para objetos — repita o nome do objeto.`,
      `Mantenha o vocabulário do nível ${nivel} (${DESCRICAO_NIVEL[nivel]}) — nem mais simples, nem mais difícil.`
    ];
    if (nivel === "n1") {
      linhasSystem.push("Nível n1: frases bem curtas, UMA sensação de corpo por elemento.", 'Integre a sensação de corpo na frase do evento com "e" — no máximo 2 frases por elemento.', "Repetir o nome do objeto ou da personagem é bem-vindo (repetição coesiva).", "No máximo 1 fragmento exclamativo em todo o texto.");
    } else {
      linhasSystem.push('Uma frase pode unir-se à outra com "e", "mas", "então", "depois". Menos pontos finais, sem frases picadas.');
    }
    const exemplos = FEWSHOT_POR_NIVEL[nivel];
    if (exemplos.length > 0) {
      linhasSystem.push("", `EXEMPLOS do nível ${nivel} (siga o tom, o ritmo e o comprimento):`);
      exemplos.forEach((exemploBruto, i) => {
        const exemplo = personalizarExemplo(exemploBruto, nome, pacote.personagem.genero);
        linhasSystem.push(`EXEMPLO ${i + 1} — ${exemplo.entrada}`, exemplo.saida, "");
      });
    }
    if (pacote.eco !== null) {
      linhasSystem.push(`Termine ecoando ${pacote.eco.abre_com} com as próprias palavras.`);
    }
    const paragrafosTxt = pacote.restricoes.paragrafos === 1 ? "1 parágrafo" : `${pacote.restricoes.paragrafos} parágrafos`;
    linhasSystem.push(`Escreva em ${paragrafosTxt} (separados por uma linha em branco). Máximo ${maximo} palavras no total.`, "Devolva só o texto final.");
    return { system: linhasSystem.join(`
`), user: linhasUser.join(`
`) };
  }

  // src/core/realizador/validador.ts
  var LIMIAR_PONTOS_FINAIS_N1 = 12;
  var LIMIAR_MEDIA_FRASES_POR_BEAT_N1 = 2;
  var TETO_CRESCIMENTO = 0.25;
  var SUFIXOS_PRETERITO = /(ava|avam|iam|ou|aram)$/;
  var PRESENTES_EM_OU = new Set(["sou", "vou", "estou", "dou"]);
  var LIMIAR_MARCAS_PRETERITO = 2;
  var ANCORAS_POR_OBJETO = {
    vagalume: ["faísca", "luz", "lanterna*", "pisca*", "vaga-lume"],
    frasco: ["pote", "vidro", "frasco*", "tampa*"],
    gato: ["gato", "bicho", "olhos verdes"],
    lua: ["lua", "prata", "luar"],
    vento: ["vento", "brisa", "fresco*", "sopr*"],
    folha: ["folha", "folhas"],
    orvalho: ["orvalho", "gota*", "gotinha", "grama molhada"]
  };
  var TERMOS_CORPO = [
    "ela",
    "ele",
    "dela",
    "dele",
    "pé",
    "pés",
    "mão",
    "mãos",
    "palma",
    "dedo",
    "dedos",
    "olho",
    "olhos",
    "olhar",
    "peito",
    "cabelo",
    "cabelos",
    "rosto",
    "queixo",
    "respiração",
    "pele",
    "braço",
    "braços",
    "ombro",
    "ombros",
    "pescoço",
    "nuca",
    "coração"
  ];
  var ADJ_F = ["quieta", "sozinha", "descalça", "atenta", "agachada"];
  var ADJ_M = ["quieto", "sozinho", "descalço", "atento", "agachado"];
  var norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  var tokens = (s) => norm(s).split(/[^a-z0-9-]+/).filter(Boolean);
  var sentencas = (s) => s.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
  var contarPalavras = (s) => s.split(/\s+/).filter(Boolean).length;
  var pareceVerbo = (p) => /(ar|er|ir|ndo)$/.test(p) && p.length > 3;
  function contemAncora(texto, ancoras) {
    const t = norm(texto);
    const toks = tokens(texto);
    return ancoras.some((a) => {
      const an = norm(a);
      if (an.endsWith("*")) {
        const prefixo = an.slice(0, -1);
        return toks.some((tk) => tk.startsWith(prefixo));
      }
      if (an.includes(" "))
        return t.includes(an);
      return toks.includes(an);
    });
  }
  function temMarcaDeCorpo(texto, nomeNorm) {
    const toks = tokens(texto);
    if (toks.includes(nomeNorm))
      return true;
    return TERMOS_CORPO.some((termo) => toks.includes(norm(termo)));
  }
  function flexoesPredicativasOpostas(texto, genero) {
    const opostas = (genero === "f" ? ADJ_M : ADJ_F).map(norm);
    const toks = tokens(texto);
    const achadas = [];
    for (let i = 0;i < toks.length; i++) {
      if (!opostas.includes(toks[i]))
        continue;
      const anterior = i > 0 ? toks[i - 1] : "";
      if (anterior === "" || pareceVerbo(anterior))
        achadas.push(toks[i]);
    }
    return achadas;
  }
  function validar(pacote, texto, paragrafos) {
    const motivos = [];
    const avisos = [];
    const presencaPorBeat = {};
    if (typeof texto !== "string" || texto.trim() === "") {
      return { pass: false, motivos: ["texto realizado ausente ou vazio"], avisos, presencaPorBeat };
    }
    const frases = sentencas(texto);
    for (const beat of pacote.beats) {
      const ancoras = ANCORAS_POR_OBJETO[beat.objeto];
      if (!ancoras) {
        avisos.push(`objeto "${beat.objeto}" sem tabela de âncoras — cobertura não verificada`);
        continue;
      }
      const idx = frases.findIndex((f) => contemAncora(f, ancoras));
      if (idx === -1) {
        motivos.push(`objeto "${beat.objeto}" sem âncora no texto realizado`);
        presencaPorBeat[beat.objeto] = false;
        continue;
      }
      const janela = frases.slice(Math.max(0, idx - 1), idx + 2).join(" ");
      const coberto = temMarcaDeCorpo(janela, norm(pacote.personagem.nome));
      presencaPorBeat[beat.objeto] = coberto;
      if (!coberto)
        motivos.push(`beat "${beat.objeto}" sem marca de corpo/personagem na janela da âncora`);
    }
    const toks = tokens(texto);
    const nomeNorm = norm(pacote.personagem.nome);
    const genero = pacote.personagem.genero;
    if (!toks.includes(nomeNorm))
      motivos.push(`nome da protagonista ("${pacote.personagem.nome}") ausente`);
    const artigoOposto = genero === "f" ? "o" : "a";
    for (let i = 0;i < toks.length - 1; i++) {
      if (toks[i] === artigoOposto && toks[i + 1] === nomeNorm) {
        motivos.push(`artigo do gênero oposto antes do nome ("${artigoOposto} ${pacote.personagem.nome}")`);
        break;
      }
    }
    const palavraOposta = genero === "f" ? "menino" : "menina";
    if (toks.includes(palavraOposta))
      motivos.push(`palavra do gênero oposto ("${palavraOposta}")`);
    for (const flexao of flexoesPredicativasOpostas(texto, genero)) {
      motivos.push(`flexão predicativa do gênero oposto ("${flexao}")`);
    }
    const palavrasTexto = contarPalavras(texto);
    const maximo = maximoPalavrasDoPacote(pacote);
    const razao = (palavrasTexto - maximo) / maximo;
    if (razao > TETO_CRESCIMENTO) {
      motivos.push(`crescimento de ${Math.round(razao * 100)}% sobre o máximo canônico de ${maximo} palavras (teto ${TETO_CRESCIMENTO * 100}%)`);
    }
    if (paragrafos.length !== pacote.restricoes.paragrafos) {
      avisos.push(`parágrafos fora do alvo: ${paragrafos.length} (alvo ${pacote.restricoes.paragrafos})`);
    }
    const marcasPreterito = toks.filter((tk) => SUFIXOS_PRETERITO.test(tk) && !PRESENTES_EM_OU.has(tk)).length;
    if (marcasPreterito >= LIMIAR_MARCAS_PRETERITO) {
      avisos.push(`tempo passado: ${marcasPreterito} marcas de pretérito (limiar ${LIMIAR_MARCAS_PRETERITO})`);
    }
    let ritmoN1;
    if (pacote.nivel === "n1") {
      const pontosFinais = (texto.match(/\./g) || []).length;
      const beats = pacote.beats.length;
      const mediaFrasesPorBeat = beats > 0 ? pontosFinais / beats : 0;
      const ok = pontosFinais <= LIMIAR_PONTOS_FINAIS_N1 && mediaFrasesPorBeat <= LIMIAR_MEDIA_FRASES_POR_BEAT_N1;
      ritmoN1 = { pontosFinais, mediaFrasesPorBeat, ok };
      if (!ok) {
        motivos.push(`ritmo n1 estourado: ${pontosFinais} pontos finais, ${mediaFrasesPorBeat.toFixed(1)} frases/beat (tetos ${LIMIAR_PONTOS_FINAIS_N1}/${LIMIAR_MEDIA_FRASES_POR_BEAT_N1})`);
      }
    }
    return { pass: motivos.length === 0, motivos, avisos, ritmoN1, presencaPorBeat };
  }

  // src/core/realizador/provedor_realizador.ts
  class ErroRecusaRealizador extends Error {
    constructor(motivo) {
      super(`recusa do provedor: ${motivo}`);
      this.name = "ErroRecusaRealizador";
    }
  }

  class ErroProvedorRealizador extends Error {
    transitorio;
    constructor(motivo, transitorio) {
      super(motivo);
      this.name = "ErroProvedorRealizador";
      this.transitorio = transitorio;
    }
  }

  // src/core/realizador/cascata.ts
  var TETO_GLOBAL_TENTATIVAS = 4;

  class ErroRealizacaoEsgotada extends Error {
    ultima;
    constructor(mensagem, ultima) {
      super(mensagem);
      this.name = "ErroRealizacaoEsgotada";
      this.ultima = ultima;
    }
  }
  function segmentarParagrafos(texto) {
    return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }
  async function realizarComCascata(pacote, prompt, provedores, opcoes) {
    const inicio = Date.now();
    const teto = opcoes.teto_tentativas ?? TETO_GLOBAL_TENTATIVAS;
    const temperatura = opcoes.temperatura ?? 0.4;
    const atrasoRetryMs = opcoes.atraso_retry_ms ?? 2000;
    let chamadas = 0;
    let ultimoErroProvedor;
    let tokensEntrada = 0;
    let tokensSaida = 0;
    let temTokens = false;
    let ultima;
    const metadados = () => ({
      chamadas,
      duracaoMs: Date.now() - inicio,
      ...temTokens ? { tokens: { entrada: tokensEntrada, saida: tokensSaida } } : {}
    });
    cascata:
      for (const provedor of provedores) {
        let jaRetentou = false;
        while (chamadas < teto) {
          chamadas++;
          let resposta;
          try {
            resposta = await provedor.gerarTexto(prompt.user, {
              modelo: opcoes.modelo ?? provedor.modeloPadrao,
              temperatura,
              system: prompt.system
            });
          } catch (e) {
            ultimoErroProvedor = e instanceof Error ? e.message : String(e);
            if (e instanceof ErroRecusaRealizador)
              continue cascata;
            const transitorio = e instanceof ErroProvedorRealizador && e.transitorio;
            if (transitorio && !jaRetentou && chamadas < teto) {
              jaRetentou = true;
              if (atrasoRetryMs > 0)
                await new Promise((r) => setTimeout(r, atrasoRetryMs));
              continue;
            }
            continue cascata;
          }
          if (resposta.metadados.tokens) {
            temTokens = true;
            tokensEntrada += resposta.metadados.tokens.entrada;
            tokensSaida += resposta.metadados.tokens.saida;
          }
          const paragrafos = segmentarParagrafos(resposta.texto);
          const veredito = validar(pacote, resposta.texto, paragrafos);
          const origem = {
            fonte: "llm",
            provedor: provedor.nome,
            modelo: resposta.metadados.modelo
          };
          if (veredito.pass) {
            return { texto: resposta.texto, paragrafos, veredito, origem, metadados: metadados() };
          }
          ultima = { texto: resposta.texto, paragrafos, veredito, origem, metadados: metadados() };
          continue cascata;
        }
        break;
      }
    if (opcoes.estadoFallback) {
      const texto = montar(opcoes.estadoFallback.estado, opcoes.estadoFallback.nivel);
      return {
        texto,
        paragrafos: [texto],
        veredito: {
          pass: true,
          motivos: [],
          avisos: ["texto do fallback A+ v3 (cascata de LLM esgotada)"],
          presencaPorBeat: {}
        },
        origem: { fonte: "fallback-a-mais" },
        metadados: metadados()
      };
    }
    throw new ErroRealizacaoEsgotada(`realizador: cascata esgotada (${chamadas} chamada(s)) e sem estadoFallback — erro explícito de aplicação (12-04)${ultimoErroProvedor ? ` · último erro de provedor: ${ultimoErroProvedor}` : ""}`, ultima);
  }

  // src/core/realizador/realizar.ts
  async function realizar(pacote, opcoes = {}) {
    if (!pacote || pacote.esquema !== ESQUEMA_PACOTE_COMPOSICAO_V1) {
      throw new Error(`realizador: Pacote com esquema desconhecido — esperado "${ESQUEMA_PACOTE_COMPOSICAO_V1}"`);
    }
    const provedores = opcoes.provedores ?? [];
    if (provedores.length === 0 && !opcoes.estadoFallback) {
      throw new Error("realizador: nenhum provedor configurado e sem estadoFallback — em produção o servidor decide o provedor (fase 13)");
    }
    const prompt = montarPromptRealizador(pacote);
    return realizarComCascata(pacote, prompt, provedores, opcoes);
  }

  // src/core/geracao/geracao.ts
  var ROTA_PADRAO = {
    n1: "realizador",
    n2: "realizador",
    n3: "realizador",
    n4: "realizador"
  };
  var GENERO_CONCORDANCIA_PADRAO = "f";
  var NIVEIS2 = ["n1", "n2", "n3", "n4"];
  function generoValido(g) {
    return g === "m" || g === "f";
  }
  async function gerar(entrada, opcoes = {}) {
    const nivel = entrada.perfil ? entrada.perfil.nivel : undefined;
    if (!nivel || !NIVEIS2.includes(nivel)) {
      throw new Error(`geracao: perfil sem nível válido — recebido "${String(nivel)}"`);
    }
    const rota = { ...ROTA_PADRAO, ...opcoes.rota ?? {} }[nivel];
    const aMais = (motivo, pacote2) => {
      if (!entrada.estadoFallback) {
        throw new Error(`geracao: caminho A+ v3 sem estadoFallback — ${motivo}`);
      }
      const texto = montar(entrada.estadoFallback.estado, entrada.estadoFallback.nivel);
      return {
        texto,
        paragrafos: [texto],
        veredito: null,
        origem: { fonte: "fallback-a-mais", rota, motivo },
        pacote: pacote2
      };
    };
    if (rota === "ap_cru")
      return aMais(`rota do nível ${nivel} = ap_cru`, null);
    if (!entrada.fichas)
      return aMais("fichas não carregadas", null);
    const nomeCru = typeof entrada.perfil.nome === "string" ? entrada.perfil.nome.trim() : "";
    const personagem = {
      nome: nomeCru !== "" ? nomeCru : NOME_PADRAO,
      genero: generoValido(entrada.perfil.genero) ? entrada.perfil.genero : GENERO_CONCORDANCIA_PADRAO
    };
    let pacote;
    try {
      pacote = compor2(entrada.estado, entrada.fichas, {
        nome: personagem.nome,
        genero: personagem.genero,
        nivel
      });
    } catch (e) {
      return aMais(`compor falhou: ${e instanceof Error ? e.message : String(e)}`, null);
    }
    const realizador = opcoes.realizador ?? realizar;
    try {
      const r = await realizador(pacote, {
        ...opcoes.provedores ? { provedores: opcoes.provedores } : {},
        ...entrada.estadoFallback ? { estadoFallback: entrada.estadoFallback } : {},
        ...opcoes.temperatura !== undefined ? { temperatura: opcoes.temperatura } : {},
        ...opcoes.teto_tentativas !== undefined ? { teto_tentativas: opcoes.teto_tentativas } : {},
        ...opcoes.atraso_retry_ms !== undefined ? { atraso_retry_ms: opcoes.atraso_retry_ms } : {}
      });
      return {
        texto: r.texto,
        paragrafos: r.paragrafos,
        veredito: r.veredito,
        origem: { ...r.origem, rota },
        metadados: r.metadados,
        pacote
      };
    } catch (e) {
      return aMais(`realização falhou: ${e instanceof Error ? e.message : String(e)}`, pacote);
    }
  }

  // src/core/lgpd.ts
  async function exportarDados(perfilId, repo, agora) {
    const perfis = await repo.carregarPerfis();
    const perfil = perfis.find((p) => p.id === perfilId) ?? null;
    const estado = await repo.carregarSave(perfilId);
    let historias = [];
    try {
      if (repo.carregarHistorias)
        historias = await repo.carregarHistorias(perfilId);
    } catch {}
    return {
      esquema: "pipoca.export.v1",
      exportadoEm: agora,
      perfil: perfil ? criarEnvelopePerfil(perfil) : null,
      save: estado ? criarEnvelopeSave(perfilId, estado) : null,
      historias
    };
  }
  async function apagarDados(perfilId, repo) {
    await repo.apagarPerfil(perfilId);
  }

  // src/core/modoApp.ts
  var MODO_PADRAO = "crianca";
  var TELA_CRIANCA = 2;
  function ehAdulta(tela, superficiesAdultas) {
    return superficiesAdultas.includes(tela);
  }
  function podeNavegar(modo, tela, superficiesAdultas) {
    if (modo === "cuidador")
      return true;
    return !ehAdulta(tela, superficiesAdultas);
  }
  function aplicarGuarda(modo, telaPedida, superficiesAdultas) {
    return podeNavegar(modo, telaPedida, superficiesAdultas) ? telaPedida : TELA_CRIANCA;
  }
  function aoPassarPortao() {
    return "cuidador";
  }
  function aoVoltarParaCrianca() {
    return "crianca";
  }

  // src/core/cenas.ts
  function svgCena(key) {
    const S = {
      quintal: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='qsky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fce7bd'/><stop offset='.55' stop-color='#f8d291'/><stop offset='1' stop-color='#f4ba74'/></linearGradient>
      <radialGradient id='qsun' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='#fff8e2'/><stop offset='.55' stop-color='#ffe49e'/><stop offset='1' stop-color='#ffe49e' stop-opacity='0'/></radialGradient>
      <filter id='qsoft' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='2.2'/></filter></defs>
      <rect width='400' height='300' fill='url(#qsky)'/>
      <circle cx='305' cy='86' r='74' fill='url(#qsun)'/><circle cx='305' cy='86' r='30' fill='#fff3d0'/>
      <path d='M0 208 Q120 168 240 203 T400 198 V300 H0 Z' fill='#c2d693' opacity='.92'/>
      <path d='M0 234 Q140 206 280 231 T400 229 V300 H0 Z' fill='#a6c372'/>
      <rect y='250' width='400' height='50' fill='#90b65d'/>
      <rect x='86' y='150' width='16' height='92' rx='6' fill='#9d6d43'/>
      <g filter='url(#qsoft)'><circle cx='94' cy='139' r='43' fill='#7da94f'/><circle cx='64' cy='155' r='28' fill='#8db75b'/><circle cx='122' cy='156' r='30' fill='#6f9a49'/><circle cx='98' cy='116' r='26' fill='#93bd60'/></g>
      <g fill='#c89c6c'><rect x='250' y='205' width='12' height='48' rx='3'/><rect x='285' y='205' width='12' height='48' rx='3'/><rect x='320' y='205' width='12' height='48' rx='3'/><rect x='355' y='205' width='12' height='48' rx='3'/></g>
      <rect x='245' y='214' width='128' height='8' rx='4' fill='#ba8c5b'/><rect x='245' y='234' width='128' height='8' rx='4' fill='#ba8c5b'/>
      <circle cx='172' cy='270' r='15' fill='#e27c50'/><path d='M158 266 Q172 259 186 266' stroke='#fff' stroke-width='3' fill='none' opacity='.7'/></svg>`,
      quarto: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='rw' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#e8d2e6'/><stop offset='1' stop-color='#efd9c8'/></linearGradient>
      <radialGradient id='rl' cx='.5' cy='.4' r='.6'><stop offset='0' stop-color='#ffe9b0' stop-opacity='.9'/><stop offset='1' stop-color='#ffe9b0' stop-opacity='0'/></radialGradient></defs>
      <rect width='400' height='300' fill='url(#rw)'/>
      <rect x='232' y='40' width='130' height='110' rx='12' fill='#3a3357'/><rect x='244' y='52' width='106' height='86' rx='7' fill='#2a2747'/>
      <circle cx='330' cy='74' r='15' fill='#f4ecd0'/><circle cx='324' cy='70' r='13' fill='#2a2747'/>
      <circle cx='270' cy='80' r='1.7' fill='#fff'/><circle cx='300' cy='110' r='1.5' fill='#fff'/><circle cx='258' cy='118' r='1.3' fill='#fff'/><circle cx='286' cy='66' r='1.4' fill='#fff'/>
      <rect y='196' width='400' height='104' fill='#d9b69a'/><rect y='196' width='400' height='9' fill='#c8a589'/>
      <rect x='34' y='150' width='150' height='62' rx='14' fill='#caa6c4'/><rect x='40' y='150' width='138' height='20' rx='10' fill='#d8bad3'/>
      <rect x='30' y='196' width='160' height='22' rx='6' fill='#7c8bbf'/>
      <circle cx='104' cy='150' r='18' fill='#fff6e6'/>
      <rect x='300' y='150' width='10' height='52' fill='#b98a63'/><path d='M285 150 h40 l-8 -22 h-24 Z' fill='url(#rl)'/><path d='M285 150 h40 l-8 -22 h-24 Z' fill='#f6d98c' opacity='.85'/>
      <ellipse cx='150' cy='250' rx='120' ry='20' fill='#c79f86' opacity='.5'/></svg>`,
      floresta: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='fs' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#dce8b8'/><stop offset='1' stop-color='#b9d391'/></linearGradient>
      <linearGradient id='fb' x1='0' y1='0' x2='.4' y2='1'><stop offset='0' stop-color='#fff4c4' stop-opacity='.7'/><stop offset='1' stop-color='#fff4c4' stop-opacity='0'/></linearGradient></defs>
      <rect width='400' height='300' fill='url(#fs)'/>
      <polygon points='40,300 90,300 65,60' fill='url(#fb)'/><polygon points='150,300 240,300 200,40' fill='url(#fb)' opacity='.7'/>
      <g fill='#5f8a44' opacity='.55'><path d='M30 300 V150 q40 -70 80 0 V300 Z'/><path d='M300 300 V160 q40 -80 80 0 V300 Z'/></g>
      <g fill='#487038'><path d='M-10 300 V190 q60 -90 130 0 V300 Z'/><path d='M250 300 V200 q70 -100 160 0 V300 Z'/></g>
      <rect x='120' y='150' width='20' height='150' rx='6' fill='#6e4a30'/>
      <g fill='#3f6b33'><circle cx='130' cy='130' r='52'/><circle cx='86' cy='160' r='34'/><circle cx='176' cy='162' r='36'/><circle cx='132' cy='98' r='30'/></g>
      <g fill='#54863f'><circle cx='118' cy='128' r='14'/><circle cx='150' cy='150' r='12'/><circle cx='100' cy='150' r='10'/></g>
      <path d='M0 286 q60 -26 120 0 t140 0 140 0 V300 H0 Z' fill='#3c6231'/>
      <g fill='#6fa24f'><path d='M40 290 q-10 -28 8 -40 q-2 26 14 34 Z'/><path d='M70 292 q14 -26 0 -42 q-4 24 -16 36 Z'/><path d='M330 292 q-12 -26 6 -40 q0 24 16 34 Z'/></g></svg>`,
      espaco: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='es' x1='0' y1='0' x2='.3' y2='1'><stop offset='0' stop-color='#2b2a55'/><stop offset='.6' stop-color='#3d3168'/><stop offset='1' stop-color='#5a3c6e'/></linearGradient>
      <radialGradient id='ep' cx='.38' cy='.35' r='.7'><stop offset='0' stop-color='#f0a972'/><stop offset='1' stop-color='#c46b56'/></radialGradient></defs>
      <rect width='400' height='300' fill='url(#es)'/>
      <g fill='#fff'><circle cx='40' cy='40' r='1.6'/><circle cx='90' cy='80' r='1'/><circle cx='150' cy='30' r='1.3'/><circle cx='210' cy='70' r='1'/><circle cx='340' cy='40' r='1.8'/><circle cx='300' cy='110' r='1.1'/><circle cx='60' cy='150' r='1.2'/><circle cx='370' cy='180' r='1.4'/><circle cx='120' cy='200' r='1'/><circle cx='250' cy='200' r='1.5'/></g>
      <g fill='#ffe9a8' opacity='.85'><circle cx='110' cy='95' r='2.4'/><circle cx='320' cy='70' r='2.2'/><circle cx='200' cy='150' r='2'/></g>
      <circle cx='150' cy='175' r='66' fill='url(#ep)'/><ellipse cx='150' cy='175' rx='104' ry='26' fill='none' stroke='#e8c98a' stroke-width='7' opacity='.7' transform='rotate(-18 150 175)'/>
      <circle cx='128' cy='158' r='12' fill='#d98a6e' opacity='.5'/><circle cx='176' cy='192' r='8' fill='#d98a6e' opacity='.4'/>
      <circle cx='322' cy='210' r='20' fill='#cfc0d8'/><circle cx='315' cy='204' r='6' fill='#b3a2bf' opacity='.6'/></svg>`,
      fundomar: `<svg viewBox='0 0 400 300' width='100%' height='100%' preserveAspectRatio='xMidYMid slice' xmlns='http://www.w3.org/2000/svg'>
      <defs><linearGradient id='ms' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6fc3c9'/><stop offset='.6' stop-color='#3f93a8'/><stop offset='1' stop-color='#2c6e87'/></linearGradient>
      <linearGradient id='mr' x1='0' y1='0' x2='.3' y2='1'><stop offset='0' stop-color='#cdeef0' stop-opacity='.55'/><stop offset='1' stop-color='#cdeef0' stop-opacity='0'/></linearGradient></defs>
      <rect width='400' height='300' fill='url(#ms)'/>
      <polygon points='60,0 110,0 80,300 40,300' fill='url(#mr)'/><polygon points='200,0 270,0 240,300 180,300' fill='url(#mr)' opacity='.7'/>
      <g fill='#2f7286'><path d='M0 300 V250 q40 -50 80 -10 q50 -60 100 -6 q40 -40 90 -2 q60 -36 130 4 V300 Z'/></g>
      <g><path d='M70 300 q-14 -60 6 -96 q18 36 4 96 Z' fill='#3f8a72'/><path d='M88 300 q10 -50 -4 -84 q22 30 12 84 Z' fill='#4f9c80'/></g>
      <g><path d='M320 300 q16 -64 -6 -104 q-20 40 -2 104 Z' fill='#4f9c80'/></g>
      <g transform='translate(250 110)'><ellipse cx='0' cy='0' rx='26' ry='17' fill='#f0a85a'/><polygon points='22,0 44,-14 44,14' fill='#e8923f'/><circle cx='-10' cy='-3' r='3' fill='#2b2118'/></g>
      <g transform='translate(120 170)'><ellipse cx='0' cy='0' rx='18' ry='12' fill='#e8d36a'/><polygon points='15,0 30,-10 30,10' fill='#d8c155'/><circle cx='-7' cy='-2' r='2.2' fill='#2b2118'/></g></svg>`
    };
    return S[key] ?? S["quintal"];
  }
  function galeriaCenas() {
    return [
      { key: "quintal", name: "O Quintal", desc: "Com um vaga-lume no quintal", badge: "", cenarioId: "quintal_anoitecer", disponivel: true },
      { key: "quarto", name: "O Quarto", desc: "Histórias antes de dormir", badge: "Em breve", cenarioId: "", disponivel: false },
      { key: "floresta", name: "A Floresta", desc: "Uma aventura entre árvores", badge: "Em breve", cenarioId: "", disponivel: false },
      { key: "espaco", name: "O Espaço", desc: "Entre estrelas e planetas", badge: "Em breve", cenarioId: "", disponivel: false },
      { key: "fundomar", name: "O Fundo do Mar", desc: "Com peixes e corais", badge: "Em breve", cenarioId: "", disponivel: false }
    ];
  }

  // src/core/onboarding.ts
  var BLOCO_PADRAO = 15;
  function perfilDoOnboarding(dados) {
    return criarPerfil(dados.id, {
      nome: dados.nome,
      idade: dados.idade,
      nivel: dados.nivel,
      avatarId: dados.avatarId,
      ...dados.genero !== undefined ? { genero: dados.genero } : {}
    });
  }
  function montarEstadoOnboarding(dados, agora) {
    const perfil = perfilDoOnboarding(dados);
    const modos = normalizarModos({ ...modosPadrao, ...dados.modos ?? {} });
    const blocoMin = dados.blocoMin ?? BLOCO_PADRAO;
    const sessao = iniciarSessao(perfil.id, blocoMin, agora);
    return {
      ...estadoInicial,
      tela: 2,
      perfil,
      modos,
      sessao
    };
  }

  // src/core/a11y.ts
  function estiloLeitura(a11y) {
    const fonte = a11y.dyslexia ? "'Atkinson Hyperlegible', sans-serif" : "'Nunito', sans-serif";
    const spacing = a11y.dyslexia ? "0.06em" : "0.01em";
    const size = Math.round(46 * (a11y.textScale ?? 1));
    return `font-family:${fonte};letter-spacing:${spacing};font-size:${size}px;`;
  }
  function paletaContraste(a11y) {
    return a11y.contrast ? { tinta: "#1a1008", realce: "#fbd98f", realceStuck: "#f5d27a" } : { tinta: "#3a2c20", realce: "#fce6bf", realceStuck: "#fbe6b8" };
  }
  function transicao(a11y, css) {
    return a11y.reduceMotion ? "" : css;
  }
  function animacaoCena(a11y) {
    return a11y.reduceMotion ? "" : "animation:pipFloat 4s ease-in-out infinite;";
  }

  // src/core/leitura.ts
  function tokenizarTrecho(texto) {
    if (!texto || typeof texto !== "string")
      return [];
    return texto.trim().split(/\s+/).filter((w) => w.length > 0);
  }
  function ehPalavraDificil(palavra) {
    const limpa = palavra.replace(/[.,!?;:"""''()\-]/g, "").toLowerCase();
    if (limpa.length === 0)
      return false;
    if (limpa.length > 7)
      return true;
    if (palavra.includes("-"))
      return true;
    const digrafos = ["lh", "nh", "rr", "ss", "ão", "ãe", "ões", "oem"];
    for (const d of digrafos) {
      if (limpa.includes(d))
        return true;
    }
    const acentos = /[âêôáéíóúãõ]/;
    if (acentos.test(limpa) && limpa.length > 5)
      return true;
    return false;
  }
  function silabar(palavra) {
    const limpa = palavra.replace(/[.,!?;:"""''()]/g, "");
    const pontuacao = palavra.slice(limpa.length);
    if (limpa.length <= 2)
      return palavra;
    const resultado = [];
    const vogais = /[aeiouáéíóúâêôãõàü]/i;
    let silaba = "";
    let contVogais = 0;
    for (let i = 0;i < limpa.length; i++) {
      const c = limpa[i];
      silaba += c;
      if (vogais.test(c)) {
        contVogais++;
        if (contVogais >= 1 && i < limpa.length - 1 && !vogais.test(limpa[i + 1] ?? "")) {
          resultado.push(silaba);
          silaba = "";
          contVogais = 0;
        }
      }
    }
    if (silaba)
      resultado.push(silaba);
    return (resultado.length > 1 ? resultado.join("·") : limpa) + pontuacao;
  }

  // src/servicos/tts.ts
  class ServicoTTSWebSpeech {
    falar(texto, opts) {
      try {
        const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
        if (!synth)
          return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = opts?.lang ?? "pt-BR";
        u.rate = opts?.rate ?? 0.82;
        u.pitch = opts?.pitch ?? 1.05;
        const vozes = synth.getVoices();
        const voz = vozes.find((v) => /pt[-_]?BR/i.test(v.lang)) || vozes.find((v) => /pt/i.test(v.lang));
        if (voz)
          u.voice = voz;
        synth.speak(u);
      } catch (_) {}
    }
  }
  var tts = new ServicoTTSWebSpeech;

  // src/servicos/asr.ts
  function avaliarParticipacao(transcricao, confianca) {
    const falou = typeof transcricao === "string" && transcricao.trim().length > 0;
    if (!falou)
      return { participou: false, confianca: 0 };
    const c = typeof confianca === "number" && confianca >= 0 && confianca <= 1 ? confianca : 0.3;
    return { participou: true, confianca: c };
  }
  function asrDisponivel() {
    try {
      const g = globalThis;
      return !!(g["SpeechRecognition"] || g["webkitSpeechRecognition"]);
    } catch {
      return false;
    }
  }
  function reconhecimentoDoNavegador() {
    try {
      const g = globalThis;
      const Ctor = g["SpeechRecognition"] || g["webkitSpeechRecognition"];
      return Ctor ? new Ctor : null;
    } catch {
      return null;
    }
  }
  function criarServicoASR(deps) {
    const fabricaRec = deps && deps.criarReconhecimento || reconhecimentoDoNavegador;
    const duracaoPadrao = deps && deps.duracaoMaxMs || 6000;
    return {
      ouvir(opts) {
        return new Promise((resolve) => {
          let terminado = false;
          let timer = null;
          const fim = (r) => {
            if (terminado)
              return;
            terminado = true;
            if (timer)
              clearTimeout(timer);
            resolve(r);
          };
          let rec = null;
          try {
            rec = fabricaRec();
          } catch {
            rec = null;
          }
          if (!rec) {
            fim({ participou: false, confianca: 0 });
            return;
          }
          try {
            rec.lang = opts && opts.lang || "pt-BR";
            if ("interimResults" in rec)
              rec.interimResults = false;
            if ("maxAlternatives" in rec)
              rec.maxAlternatives = 1;
            rec.onresult = (ev) => {
              try {
                const r = ev;
                const alt = r && r.results && r.results[0] ? r.results[0][0] : undefined;
                const transcricao = alt && typeof alt.transcript === "string" ? alt.transcript : "";
                fim(avaliarParticipacao(transcricao, alt ? alt.confidence : undefined));
              } catch {
                fim({ participou: false, confianca: 0 });
              }
              try {
                if (rec && rec.stop)
                  rec.stop();
              } catch {}
            };
            rec.onerror = () => fim({ participou: false, confianca: 0 });
            rec.onend = () => fim({ participou: false, confianca: 0 });
            const teto = opts && opts.duracaoMaxMs || duracaoPadrao;
            timer = setTimeout(() => {
              try {
                const parar = rec && (rec.abort || rec.stop);
                if (rec && parar)
                  parar.call(rec);
              } catch {}
              fim({ participou: false, confianca: 0 });
            }, teto);
            rec.start();
          } catch {
            fim({ participou: false, confianca: 0 });
          }
        });
      }
    };
  }
  var asr = criarServicoASR();

  // src/core/captura.ts
  function despachar(repo, evento) {
    try {
      Promise.resolve(repo.registrarTelemetria(evento)).catch(() => {});
    } catch {}
  }
  function capturarLeituraConfirmada(estado, palavras, objetoId, agora, repo) {
    if (!estado.perfil)
      return false;
    const dados = {
      palavras,
      cenarioId: estado.historia.cenarioId,
      nivel: estado.perfil.nivel,
      verificacao: estado.modos.verificacao,
      ...objetoId ? { objetoId } : {}
    };
    despachar(repo, criarEvento("leitura_confirmada", estado.perfil.id, dados, agora));
    return true;
  }
  function capturarObjetoDestravado(estado, objetoId, agora, repo, jaEmitidos) {
    if (!estado.perfil)
      return false;
    if (jaEmitidos && jaEmitidos.has(objetoId))
      return false;
    const dados = {
      cenarioId: estado.historia.cenarioId,
      objetoId,
      nivel: estado.perfil.nivel
    };
    despachar(repo, criarEvento("objeto_destravado", estado.perfil.id, dados, agora));
    if (jaEmitidos)
      jaEmitidos.add(objetoId);
    return true;
  }
  function capturarSessaoIniciada(estado, agora, repo) {
    if (!estado.perfil || !estado.sessao)
      return false;
    const dados = {
      ...estado.historia.cenarioId ? { cenarioId: estado.historia.cenarioId } : {},
      blocoMin: estado.sessao.blocoMin
    };
    despachar(repo, criarEvento("sessao_iniciada", estado.perfil.id, dados, agora));
    return true;
  }
  function capturarSessaoEncerrada(estado, resumo, agora, repo) {
    if (!estado.perfil || !estado.sessao)
      return false;
    const minutos = Math.max(0, Math.round((agora - estado.sessao.iniciadaEm) / 60000));
    const dados = {
      minutos,
      palavras: resumo.palavras ?? 0,
      historias: resumo.historias ?? 0
    };
    despachar(repo, criarEvento("sessao_encerrada", estado.perfil.id, dados, agora));
    return true;
  }
  function capturarHistoriaConcluida(estado, palavras, agora, repo) {
    if (!estado.perfil)
      return false;
    const dados = {
      cenarioId: estado.historia.cenarioId,
      nivel: estado.perfil.nivel,
      objetos: estado.historia.objetos.length,
      palavras
    };
    despachar(repo, criarEvento("historia_concluida", estado.perfil.id, dados, agora));
    return true;
  }

  // src/core/agregadosTelemetria.ts
  var MS_POR_DIA4 = 86400000;
  var TETO_MINUTOS_SESSAO = 60;
  var META_LEITURAS_DIA = 5;
  var META_CENARIOS_DIA = 3;
  var PESO_REGULARIDADE = 0.4;
  var PESO_VOLUME = 0.4;
  var PESO_VARIEDADE = 0.2;
  function diasDoPeriodo(periodo) {
    switch (periodo) {
      case "semana":
        return 7;
      case "mes":
        return 30;
      case "tudo":
        return Infinity;
    }
  }
  function indiceDia(ts) {
    return Math.floor(ts / MS_POR_DIA4);
  }
  function rotuloDia(idxDia) {
    return new Date(idxDia * MS_POR_DIA4).toISOString().slice(0, 10);
  }
  function chaveDia(ts) {
    return rotuloDia(indiceDia(ts));
  }
  function filtrarPorPeriodo(eventos, periodo, agora) {
    const soLeitura = eventos.filter((e) => e.tipo !== "espelho_falhou");
    const dias = diasDoPeriodo(periodo);
    if (!Number.isFinite(dias))
      return soLeitura;
    const limite = agora - dias * MS_POR_DIA4;
    return soLeitura.filter((e) => e.ts >= limite);
  }
  function minutosClampados(e) {
    const m = e.dados.minutos;
    if (typeof m !== "number" || !Number.isFinite(m))
      return 0;
    return Math.max(0, Math.min(TETO_MINUTOS_SESSAO, m));
  }
  function maiorSequencia(indices) {
    if (indices.size === 0)
      return 0;
    const ordenados = [...indices].sort((a, b) => a - b);
    let melhor = 1;
    let atual = 1;
    for (let i = 1;i < ordenados.length; i++) {
      atual = ordenados[i] === ordenados[i - 1] + 1 ? atual + 1 : 1;
      if (atual > melhor)
        melhor = atual;
    }
    return melhor;
  }
  function resumir(eventos, periodo, agora) {
    const janela = filtrarPorPeriodo(eventos, periodo, agora);
    let minutos = 0;
    let palavras = 0;
    let historias = 0;
    const diasComEvento = new Set;
    const diasComLeitura = new Set;
    for (const e of janela) {
      diasComEvento.add(indiceDia(e.ts));
      if (e.tipo === "sessao_encerrada") {
        minutos += minutosClampados(e);
      } else if (e.tipo === "leitura_confirmada") {
        palavras += e.dados.palavras ?? 0;
        diasComLeitura.add(indiceDia(e.ts));
      } else if (e.tipo === "historia_concluida") {
        historias += 1;
      }
    }
    return {
      minutos,
      palavras,
      historias,
      diasAtivos: diasComEvento.size,
      sequenciaDias: maiorSequencia(diasComLeitura)
    };
  }
  function serieDiaria(eventos, valorDe) {
    const porDia = new Map;
    for (const e of eventos) {
      const v = valorDe(e);
      if (v === 0)
        continue;
      const idx = indiceDia(e.ts);
      porDia.set(idx, (porDia.get(idx) ?? 0) + v);
    }
    return [...porDia.entries()].sort((a, b) => a[0] - b[0]).map(([idx, valor]) => ({ rotulo: rotuloDia(idx), valor }));
  }
  function gerarSeries(eventos, periodo, agora) {
    const janela = filtrarPorPeriodo(eventos, periodo, agora);
    const minutosPorDia = serieDiaria(janela, (e) => e.tipo === "sessao_encerrada" ? minutosClampados(e) : 0);
    const palavrasPorDia = serieDiaria(janela, (e) => e.tipo === "leitura_confirmada" ? e.dados.palavras ?? 0 : 0);
    const porSemana = new Map;
    for (const e of janela) {
      if (e.tipo !== "historia_concluida")
        continue;
      const semana = Math.floor(indiceDia(e.ts) / 7);
      porSemana.set(semana, (porSemana.get(semana) ?? 0) + 1);
    }
    const historiasPorSemana = [...porSemana.entries()].sort((a, b) => a[0] - b[0]).map(([semana, valor]) => ({ rotulo: rotuloDia(semana * 7), valor }));
    const diasAtivos = new Set(janela.map((e) => indiceDia(e.ts)));
    const engajamentoPorDia = [...diasAtivos].sort((a, b) => a - b).map((idx) => {
      const dia = rotuloDia(idx);
      return { rotulo: dia, valor: calcularEngajamento(janela, dia) };
    });
    return { minutosPorDia, palavrasPorDia, historiasPorSemana, engajamentoPorDia };
  }
  function calcularEngajamento(eventos, dia) {
    let leituras = 0;
    const cenarios = new Set;
    for (const e of eventos) {
      if (e.tipo !== "leitura_confirmada")
        continue;
      if (chaveDia(e.ts) !== dia)
        continue;
      leituras += 1;
      const c = e.dados.cenarioId;
      if (typeof c === "string" && c.length > 0)
        cenarios.add(c);
    }
    if (leituras === 0)
      return 0;
    const regularidade = 1;
    const volume = Math.min(leituras / META_LEITURAS_DIA, 1);
    const variedade = Math.min(cenarios.size / META_CENARIOS_DIA, 1);
    const valor = PESO_REGULARIDADE * regularidade + PESO_VOLUME * volume + PESO_VARIEDADE * variedade;
    return Math.max(0, Math.min(1, valor));
  }

  // src/core/acesso.ts
  var acessoInicial = {
    pinHash: null,
    tentativas: 0,
    bloqueioAte: 0
  };
  var MAX_TENTATIVAS = 5;
  var LOCKOUT_MS = 60000;
  var DICA_ERRO = "PIN não confere. Tente de novo com calma.";
  var DICA_BLOQUEIO = "Muitas tentativas. Aguarde um instante e tente de novo.";
  function hashPin(pin) {
    let h = 2166136261;
    for (let i = 0;i < pin.length; i++) {
      h ^= pin.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function definirPin(estado, pin) {
    return { ...estado, pinHash: hashPin(String(pin)), tentativas: 0, bloqueioAte: 0 };
  }
  function estaBloqueado(estado, agora) {
    return estado.bloqueioAte > 0 && agora < estado.bloqueioAte;
  }
  function verificarPin(estado, pin, agora) {
    if (estado.pinHash === null) {
      return { ok: false, estado, bloqueado: false, dica: "Nenhum PIN configurado." };
    }
    if (estaBloqueado(estado, agora)) {
      return { ok: false, estado, bloqueado: true, dica: DICA_BLOQUEIO };
    }
    const base = estado.bloqueioAte > 0 && agora >= estado.bloqueioAte ? { ...estado, tentativas: 0, bloqueioAte: 0 } : estado;
    if (hashPin(String(pin)) === base.pinHash) {
      return { ok: true, estado: { ...base, tentativas: 0, bloqueioAte: 0 }, bloqueado: false };
    }
    const tentativas = base.tentativas + 1;
    if (tentativas >= MAX_TENTATIVAS) {
      return {
        ok: false,
        estado: { ...base, tentativas, bloqueioAte: agora + LOCKOUT_MS },
        bloqueado: true,
        dica: DICA_BLOQUEIO
      };
    }
    return { ok: false, estado: { ...base, tentativas }, bloqueado: false, dica: DICA_ERRO };
  }

  // src/servicos/acesso_repo.ts
  var CHAVE_ACESSO = "pipoca.acesso.v1";
  function carregarAcesso() {
    try {
      const raw = localStorage.getItem(CHAVE_ACESSO);
      if (!raw)
        return { ...acessoInicial };
      const p = JSON.parse(raw);
      if (p && typeof p === "object") {
        return {
          pinHash: typeof p["pinHash"] === "string" ? p["pinHash"] : null,
          tentativas: typeof p["tentativas"] === "number" ? p["tentativas"] : 0,
          bloqueioAte: typeof p["bloqueioAte"] === "number" ? p["bloqueioAte"] : 0
        };
      }
    } catch {}
    return { ...acessoInicial };
  }
  function salvarAcesso(estado) {
    try {
      localStorage.setItem(CHAVE_ACESSO, JSON.stringify(estado));
    } catch {}
  }
  function temPin() {
    return carregarAcesso().pinHash !== null;
  }

  // src/app/bridge.ts
  var PipocaCanonico = {
    composicao: {
      esquema: ESQUEMA_COMPOSICAO_V3,
      iniciar,
      bancoDaRodada,
      podeInserir,
      inserir,
      mioloAtual,
      podeCompor,
      compor,
      ordenarR1,
      montar,
      abrirProximaRodada,
      convergiu
    },
    geracao: {
      gerar,
      ROTA_PADRAO,
      GENERO_CONCORDANCIA_PADRAO,
      realizadorRemoto: () => {
        try {
          return obterBackend().realizador ?? null;
        } catch {
          return null;
        }
      }
    },
    estado: { estadoInicial, patchEstado, perfilAtivo, nivelAtivo, storyLines },
    economia: {
      economiaInicial,
      creditarVagalumes,
      gastarVagalumes,
      spendSuggest,
      saveSuggest,
      spendPct,
      normalizarEconomia
    },
    historia: {
      historiaInicial,
      tiraInicial,
      commitarObjeto,
      textoPortao,
      derivarBandeja,
      resetHistoria,
      _placeInSlot,
      _returnToTray,
      _checkStory
    },
    modos: { modosPadrao, alternarPalco, autorizarIA, normalizarModos, definirVerificacao, definirDesfecho },
    modoApp: { MODO_PADRAO, TELA_CRIANCA, ehAdulta, podeNavegar, aplicarGuarda, aoPassarPortao, aoVoltarParaCrianca },
    limites: { LIMITES_PADRAO, definirBlocoFoco, normalizarTempoDeTela, normalizarLimites },
    cardapio: { CARDAPIO_PADRAO, normalizarCardapio, validarItemCardapio, CENARIOS_PADRAO, normalizarCenariosLiberados },
    lgpd: { exportarDados, apagarDados },
    historias: {
      RETENCAO_HISTORIAS_DIAS,
      MAX_NAO_FAVORITAS,
      validarHistoriaSalva,
      dentroDaRetencaoHistoria,
      normalizarHistorias,
      tituloDaHistoria,
      dataRelativa,
      apenasCompletas,
      agruparPorDia
    },
    perfil: { criarPerfil, clampIdade, IDADE_MIN, IDADE_MAX },
    avatares: { lista: AVATARES_DEF, padrao: AVATAR_PADRAO, normalizar: normalizarAvatar, porId: porIdAvatar },
    cenas: { svgCena, galeriaCenas },
    onboarding: { montarEstadoOnboarding, perfilDoOnboarding, BLOCO_PADRAO },
    sessao: { iniciarSessao, tick, encerrarSessao, formatarRestante },
    a11y: { estiloLeitura, paletaContraste, transicao, animacaoCena },
    leitura: { tokenizarTrecho, ehPalavraDificil, silabar },
    acesso: { acessoInicial, definirPin, verificarPin, carregarAcesso, salvarAcesso, temPin },
    conta: {
      entrarFamilia,
      criarSessao,
      sessaoValida,
      DURACAO_SESSAO_MS,
      carregarConta,
      salvarConta,
      carregarSessaoConta,
      salvarSessaoConta,
      limparSessaoConta
    },
    backend: {
      obterBackend,
      configDoAmbiente,
      normalizarConfigBackend,
      escopoTenant,
      sincronizarInicial,
      puxarFlagsGlobais,
      limitesDaFamilia,
      excedeTetoPerfis,
      aoMesclarHistorias
    },
    flags: { carregarFlags, killSwitchAtivo, aplicarFlagsAosModos, iaEfetivamenteLigada },
    tts,
    asr: { asr, criarServicoASR, asrDisponivel, avaliarParticipacao },
    criarRepositorio,
    telemetria: {
      criarEvento,
      capturarLeituraConfirmada,
      capturarObjetoDestravado,
      capturarSessaoIniciada,
      capturarSessaoEncerrada,
      capturarHistoriaConcluida
    },
    agregados: {
      resumir,
      gerarSeries,
      calcularEngajamento,
      filtrarPorPeriodo,
      chaveDia,
      rotuloDia,
      TETO_MINUTOS_SESSAO
    }
  };
  globalThis.PipocaCanonico = PipocaCanonico;
  var bridge_default = PipocaCanonico;
})();
