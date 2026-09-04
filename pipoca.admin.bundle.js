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

  // src/admin/bridge_admin.ts
  var exports_bridge_admin = {};
  __export(exports_bridge_admin, {
    default: () => bridge_admin_default
  });

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
  function escopoAutoriza(escopo, tenantId) {
    if (escopo === "todos")
      return true;
    if (!Array.isArray(escopo))
      return false;
    return escopo.indexOf(tenantId) >= 0;
  }
  function areaDisponivel(escopo, area) {
    if (escopo !== "todos" && !Array.isArray(escopo))
      return false;
    if (area === "tenants")
      return true;
    return escopo === "todos";
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
  var CHAVE_SESSAO = "pipoca.admin.sessao.v1";
  function storagePadrao() {
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
    const st = armazem ?? storagePadrao();
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
          gravarJson(st, CHAVE_SESSAO, r.sessao);
        return r.sessao;
      },
      async carregarSessao() {
        if (!st)
          return null;
        const s = lerJson(st, CHAVE_SESSAO);
        if (!s || typeof s !== "object" || s.papel !== "super_admin")
          return null;
        return s;
      },
      async encerrarSessao() {
        if (!st)
          return;
        try {
          st.removeItem(CHAVE_SESSAO);
        } catch {}
      }
    };
  }

  // src/admin/rotasAdmin.ts
  var TELA_SA_LOGIN = 1;
  var TELA_SA_HOME = 2;
  var TELA_SA_TENANT = 3;
  var TELA_SA_CONTENT = 4;
  var TELA_SA_AI = 5;
  var TELA_SA_SAFE = 6;
  var TELA_SA_IA_GLOBAL = 7;
  var ROTAS_ADMIN = {
    SA_LOGIN: TELA_SA_LOGIN,
    SA_HOME: TELA_SA_HOME,
    SA_TENANT: TELA_SA_TENANT,
    SA_CONTENT: TELA_SA_CONTENT,
    SA_AI: TELA_SA_AI,
    SA_SAFE: TELA_SA_SAFE,
    SA_IA_GLOBAL: TELA_SA_IA_GLOBAL
  };
  var TELAS_VALIDAS = [
    TELA_SA_LOGIN,
    TELA_SA_HOME,
    TELA_SA_TENANT,
    TELA_SA_CONTENT,
    TELA_SA_AI,
    TELA_SA_SAFE,
    TELA_SA_IA_GLOBAL
  ];
  function guardarRotaAdmin(telaDestino, sessao, agora) {
    if (telaDestino === TELA_SA_LOGIN)
      return TELA_SA_LOGIN;
    if (TELAS_VALIDAS.indexOf(telaDestino) < 0)
      return TELA_SA_LOGIN;
    return sessaoSuperAdminValida(sessao, agora) ? telaDestino : TELA_SA_LOGIN;
  }

  // src/admin/tenant/tiposTenant.ts
  var PLANOS_PADRAO = [
    { id: "gratis", nome: "Grátis", limites: { maxPerfis: 1, iaPermitida: false, cenariosCustomizados: 0, retencaoTelemetriaDias: 30 } },
    { id: "freemium", nome: "Freemium", validadeDias: 60, limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
    { id: "familia", nome: "Família", limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
    { id: "escola", nome: "Escola", limites: { maxPerfis: 40, iaPermitida: true, cenariosCustomizados: 10, retencaoTelemetriaDias: 180 } }
  ];
  var PLANO_MAIS_RESTRITIVO = "gratis";
  var PLANO_INICIAL = "freemium";
  var MS_POR_DIA = 86400000;
  function limitesDoPlano(planoId) {
    const p = PLANOS_PADRAO.find((x) => x.id === planoId);
    const base = p ?? PLANOS_PADRAO.find((x) => x.id === PLANO_MAIS_RESTRITIVO);
    return { ...base.limites };
  }
  function limitesVigentes(tenant, agora) {
    const p = PLANOS_PADRAO.find((x) => x.id === tenant.planoId);
    if (p && typeof p.validadeDias === "number" && agora > tenant.criadoEm + p.validadeDias * MS_POR_DIA) {
      return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
    }
    return limitesDoPlano(tenant.planoId);
  }
  function diasRestantes(tenant, agora) {
    const p = PLANOS_PADRAO.find((x) => x.id === tenant.planoId);
    if (!p || typeof p.validadeDias !== "number")
      return null;
    const fim = tenant.criadoEm + p.validadeDias * MS_POR_DIA;
    return Math.max(0, Math.ceil((fim - agora) / MS_POR_DIA));
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

  // src/admin/tenant/repositorioTenant.ts
  var ERRO_FORA_DE_ESCOPO = "Não foi possível concluir a ação.";
  var CHAVE_TENANTS = "pipoca.admin.tenants.v1";
  var CHAVE_CONTAS = "pipoca.admin.contas.v1";
  function storagePadrao2() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function idDoTenant(nome, agora) {
    const s = String(nome).trim().toLowerCase() + ":" + String(agora);
    let h = 2166136261;
    for (let i = 0;i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "ten_" + (h >>> 0).toString(16);
  }
  function novoTenant(nome, agora) {
    return {
      id: idDoTenant(nome, agora),
      nome: String(nome).trim(),
      planoId: PLANO_INICIAL,
      ativo: true,
      criadoEm: agora
    };
  }
  function substituirTenantsLocais(tenants, armazem) {
    const st = armazem ?? storagePadrao2();
    if (!st)
      return;
    gravarTenants(st, (Array.isArray(tenants) ? tenants : []).filter(tenantValido));
  }
  function lerTenants(st) {
    try {
      const raw = st.getItem(CHAVE_TENANTS);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr))
        return [];
      const out = [];
      for (const e of arr) {
        const env = e;
        if (env && env.esquema === ESQUEMA_TENANT && tenantValido(env.tenant))
          out.push(env.tenant);
      }
      return out;
    } catch {
      return [];
    }
  }
  function gravarTenants(st, tenants) {
    try {
      const envelopes = tenants.map((t) => ({ esquema: ESQUEMA_TENANT, tenant: t }));
      st.setItem(CHAVE_TENANTS, JSON.stringify(envelopes));
    } catch {}
  }
  function criarRepositorioTenant(escopoDaSessao, armazem) {
    const st = armazem ?? storagePadrao2();
    function autorizado(id) {
      return escopoAutoriza(escopoDaSessao, id);
    }
    return {
      async listarTenants(escopo) {
        if (!st)
          return [];
        return lerTenants(st).filter((t) => autorizado(t.id) && escopoAutoriza(escopo, t.id));
      },
      async obterTenant(id) {
        if (!st || !autorizado(id))
          return null;
        return lerTenants(st).find((t) => t.id === id) ?? null;
      },
      async salvarTenant(t) {
        if (!st || !tenantValido(t))
          throw new Error(ERRO_FORA_DE_ESCOPO);
        const atuais = lerTenants(st);
        const existe = atuais.some((x) => x.id === t.id);
        if (!existe && escopoDaSessao !== "todos")
          throw new Error(ERRO_FORA_DE_ESCOPO);
        if (existe && !autorizado(t.id))
          throw new Error(ERRO_FORA_DE_ESCOPO);
        const semEste = atuais.filter((x) => x.id !== t.id);
        gravarTenants(st, [...semEste, { ...t }]);
      },
      async listarPlanos() {
        return PLANOS_PADRAO.map((p) => ({ ...p, limites: { ...p.limites } }));
      },
      async obterLimitesEfetivos(id, agora) {
        if (!st || !autorizado(id))
          return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
        const t = lerTenants(st).find((x) => x.id === id);
        if (!t)
          return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
        return limitesVigentes(t, typeof agora === "number" ? agora : Date.now());
      }
    };
  }
  function lerContas(st) {
    try {
      const raw = st.getItem(CHAVE_CONTAS);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr))
        return [];
      return arr.filter((c) => !!c && typeof c === "object" && typeof c.id === "string" && typeof c.email === "string" && Array.isArray(c.tenants));
    } catch {
      return [];
    }
  }
  function listarContas(armazem) {
    const st = armazem ?? storagePadrao2();
    return st ? lerContas(st) : [];
  }
  function vincularConta(email, tenantId, armazem) {
    const st = armazem ?? storagePadrao2();
    const e = String(email).trim().toLowerCase();
    const contas = st ? lerContas(st) : [];
    let conta = contas.find((c) => c.email === e);
    if (!conta) {
      conta = { id: "cta_" + e.replace(/[^a-z0-9]/g, "").slice(0, 24), email: e, tenants: [] };
      contas.push(conta);
    }
    if (conta.tenants.indexOf(tenantId) < 0)
      conta.tenants.push(tenantId);
    if (st) {
      try {
        st.setItem(CHAVE_CONTAS, JSON.stringify(contas));
      } catch {}
    }
    return { ...conta, tenants: conta.tenants.slice() };
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

  // src/core/lint_grafo.ts
  var NIVEIS = ["n1", "n2", "n3", "n4"];
  var CONDICOES_CONHECIDAS = /^(tem:.+|nao_tem:.+|pos:(inicio|miolo|fim)|antes_de:.+|depois_de:.+)$/;
  function lintCelula(celula, onde, erros) {
    for (const nk of NIVEIS) {
      const t = celula && celula[nk];
      if (t === undefined || t === null) {
        erros.push(`${onde}: falta o nível ${nk}`);
        continue;
      }
      const pool = Array.isArray(t) ? t : [t];
      if (pool.length === 0)
        erros.push(`${onde}.${nk}: array de variantes vazio`);
      else if (pool.some((v) => !String(v || "").trim()))
        erros.push(`${onde}.${nk}: variante vazia`);
    }
  }
  function avisarMarcadorInicial(celula, marcadores, onde, avisos) {
    for (const nk of NIVEIS) {
      const t = celula && celula[nk];
      if (t === undefined || t === null)
        continue;
      const pool = Array.isArray(t) ? t : [t];
      for (const v of pool) {
        if (comecaComMarcador(String(v || ""), marcadores)) {
          avisos.push(`${onde}.${nk}: variante \`${v}\` abre por marcador — o conectivo será suprimido no miolo`);
        }
      }
    }
  }
  function lintCondicao(cond, onde, avisos) {
    const c = String(cond || "");
    if (c.indexOf("func:") === 0) {
      avisos.push(`${onde}: condição \`${c}\` usa o namespace RESERVADO func:* (nunca casa no v3)`);
    } else if (!CONDICOES_CONHECIDAS.test(c)) {
      avisos.push(`${onde}: condição desconhecida \`${c}\` (nunca casa)`);
    }
  }
  function lintGrafoV3(cenario, esquema) {
    const ehV3 = /\.v3$/.test(String(esquema || ""));
    const erros = [];
    const avisos = [];
    const errosV3 = ehV3 ? erros : [];
    lintCelula(cenario.moldura && cenario.moldura.abertura, "moldura.abertura", errosV3);
    const d = cenario.moldura && cenario.moldura.desfecho;
    lintCelula(d && d.convergente, "moldura.desfecho.convergente", errosV3);
    for (let i = 0;i < (d && d.aberto || []).length; i++) {
      lintCelula(d.aberto[i].fragmento, `moldura.desfecho.aberto[${i}].fragmento`, errosV3);
    }
    const conectivosN1 = cenario.moldura && cenario.moldura.conectivos && cenario.moldura.conectivos.n1 || [];
    for (const con of conectivosN1) {
      if (String(con).trim().split(/\s+/).length > 1) {
        errosV3.push(`moldura.conectivos.n1: \`${con}\` tem mais de 1 palavra (n1 exige alta decodificabilidade)`);
      }
    }
    const marcadores = marcadoresIniciais(cenario);
    for (const [id, obj] of Object.entries(cenario.objetos || {})) {
      lintCelula(obj.conta, `objetos.${id}.conta`, errosV3);
      avisarMarcadorInicial(obj.conta, marcadores, `objetos.${id}.conta`, avisos);
      if (obj.genero !== "m" && obj.genero !== "f")
        errosV3.push(`objetos.${id}: falta \`genero\` ("m"|"f")`);
      if (obj.numero !== "sg" && obj.numero !== "pl")
        errosV3.push(`objetos.${id}: falta \`numero\` ("sg"|"pl")`);
      (obj.tempera || []).forEach((t, i) => {
        lintCelula(t.entao, `objetos.${id}.tempera[${i}].entao`, errosV3);
        avisarMarcadorInicial(t.entao, marcadores, `objetos.${id}.tempera[${i}].entao`, avisos);
        const conds = Array.isArray(t.se) ? t.se : [t.se];
        for (const c of conds)
          lintCondicao(c, `objetos.${id}.tempera[${i}].se`, avisos);
      });
    }
    return { erros, avisos };
  }

  // src/admin/validar_grafo.ts
  var NIVEIS2 = ["n1", "n2", "n3", "n4"];
  function validarGrafoAutoral(json) {
    const erros = [];
    const avisos = [];
    const env = json;
    if (!env || typeof env !== "object") {
      return { ok: false, erros: ["o grafo precisa ser um objeto JSON"], avisos };
    }
    if (env.esquema !== ESQUEMA_COMPOSICAO_V3) {
      erros.push(`esquema esperado: "${ESQUEMA_COMPOSICAO_V3}" (recebido: ${JSON.stringify(env.esquema ?? null)})`);
    }
    const cenario = env.cenario;
    if (!cenario || typeof cenario !== "object" || !cenario.id || !cenario.moldura || !Array.isArray(cenario.rodadas) || !cenario.objetos) {
      erros.push("cenario incompleto: precisa de id, moldura, rodadas e objetos");
      return { ok: false, erros, avisos };
    }
    const lint = lintGrafoV3(cenario, String(env.esquema ?? ""));
    erros.push(...lint.erros);
    avisos.push(...lint.avisos);
    try {
      for (const modo of ["convergente", "aberto"]) {
        let est = iniciar(cenario, { desfecho: modo });
        const rodada1 = cenario.rodadas.find((r) => r.n === 1);
        const escolhe = rodada1 && rodada1.escolhe || 3;
        est = ordenarR1(est, est.banco.slice(0, escolhe));
        if (est.linha.length === 0) {
          erros.push("a rodada 1 não revela objetos suficientes para ordenar");
          break;
        }
        for (let r = 2;r <= cenario.rodadas.length; r++) {
          est = abrirProximaRodada(est);
          const obj = est.banco[0];
          if (obj)
            est = inserir(est, obj, 1);
        }
        for (const nivel of NIVEIS2) {
          const txt = montar(est, nivel);
          if (!txt)
            erros.push(`montagem vazia (${modo}, ${nivel})`);
          else if (txt.indexOf("undefined") !== -1)
            erros.push(`"undefined" na montagem (${modo}, ${nivel})`);
          else if (montar(est, nivel) !== txt)
            erros.push(`replay quebrado (${modo}, ${nivel})`);
        }
      }
    } catch (e) {
      erros.push("fumaça de montagem: " + (e instanceof Error ? e.message : String(e)));
    }
    const aberto = cenario.moldura.desfecho && cenario.moldura.desfecho.aberto || [];
    const comEco = new Set;
    for (const a of aberto) {
      if (a.se_terminou_com)
        comEco.add(a.se_terminou_com);
      if (a.se_comecou_com)
        comEco.add(a.se_comecou_com);
    }
    const semEco = Object.keys(cenario.objetos).filter((id) => !comEco.has(id));
    if (semEco.length > 0) {
      avisos.push(`desfecho aberto sem eco para: ${semEco.join(", ")} — nesses finais a história degrada para o desfecho convergente`);
    }
    return { ok: erros.length === 0, erros, avisos };
  }
  var CHAVE_CONTEUDO = "pipoca.admin.conteudo.v1";
  function storagePadrao3() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function entradaValida(c) {
    if (!c || typeof c !== "object")
      return false;
    const r = c;
    return typeof r["cenarioId"] === "string" && r["cenarioId"].length > 0 && typeof r["versao"] === "number" && (r["publicadoEm"] === null || typeof r["publicadoEm"] === "number") && (r["tenantId"] === null || typeof r["tenantId"] === "string");
  }
  function ler(st) {
    try {
      const raw = st.getItem(CHAVE_CONTEUDO);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr))
        return [];
      return arr.filter(entradaValida);
    } catch {
      return [];
    }
  }
  function gravar(st, itens) {
    try {
      st.setItem(CHAVE_CONTEUDO, JSON.stringify(itens));
    } catch {}
  }
  function listarCenarios(armazem) {
    const st = armazem ?? storagePadrao3();
    return st ? ler(st) : [];
  }
  function validarEnvelopeCenario(raw) {
    const env = raw;
    if (env && env.esquema === "pipoca.conteudo.v1" && entradaValida(env.cenario)) {
      return { ...env.cenario };
    }
    return null;
  }
  function substituirCenariosLocais(itens, armazem) {
    const st = armazem ?? storagePadrao3();
    if (!st)
      return;
    gravar(st, (Array.isArray(itens) ? itens : []).filter(entradaValida));
  }
  function cenarioIdDe(grafo) {
    const c = grafo?.cenario;
    return c && typeof c.id === "string" && c.id.length > 0 ? c.id : null;
  }
  function salvarRascunho(grafo, tenantId, armazem) {
    const st = armazem ?? storagePadrao3();
    const cenarioId = cenarioIdDe(grafo);
    if (!cenarioId)
      throw new Error("O grafo precisa de cenario.id para entrar na biblioteca.");
    const itens = st ? ler(st) : [];
    const doCenario = itens.filter((c) => c.cenarioId === cenarioId);
    const rascunho = doCenario.filter((c) => c.publicadoEm === null).sort((a, b) => b.versao - a.versao)[0];
    let entrada;
    if (rascunho) {
      entrada = { ...rascunho, grafo, tenantId };
      const resto = itens.filter((c) => !(c.cenarioId === cenarioId && c.versao === rascunho.versao));
      if (st)
        gravar(st, [...resto, entrada]);
    } else {
      const maiorVersao = doCenario.reduce((m, c) => Math.max(m, c.versao), 0);
      entrada = { cenarioId, versao: maiorVersao + 1, publicadoEm: null, tenantId, grafo };
      if (st)
        gravar(st, [...itens, entrada]);
    }
    return { ...entrada };
  }
  function versionarCenario(cenarioId, armazem) {
    const st = armazem ?? storagePadrao3();
    if (!st)
      return null;
    const itens = ler(st);
    const doCenario = itens.filter((c) => c.cenarioId === cenarioId).sort((a, b) => b.versao - a.versao);
    const ultima = doCenario[0];
    if (!ultima)
      return null;
    const nova = {
      cenarioId,
      versao: ultima.versao + 1,
      publicadoEm: null,
      tenantId: ultima.tenantId,
      grafo: JSON.parse(JSON.stringify(ultima.grafo))
    };
    gravar(st, [...itens, nova]);
    return { ...nova };
  }
  function publicarCenario(cenarioId, versao, agora, limites, armazem) {
    const st = armazem ?? storagePadrao3();
    if (!st)
      return { ok: false, motivo: "Armazenamento indisponível." };
    const itens = ler(st);
    const entrada = itens.find((c) => c.cenarioId === cenarioId && c.versao === versao);
    if (!entrada)
      return { ok: false, motivo: "Versão não encontrada na biblioteca." };
    const r = validarGrafoAutoral(entrada.grafo);
    if (!r.ok)
      return { ok: false, motivo: "Grafo inválido: " + r.erros.join(" · ") };
    if (entrada.tenantId !== null && limites) {
      const publicadosDoTenant = new Set(itens.filter((c) => c.tenantId === entrada.tenantId && c.publicadoEm !== null && c.cenarioId !== cenarioId).map((c) => c.cenarioId));
      if (publicadosDoTenant.size + 1 > limites.cenariosCustomizados) {
        return {
          ok: false,
          motivo: `O plano permite ${limites.cenariosCustomizados} cenário(s) customizado(s) — teto atingido.`
        };
      }
    }
    const atualizado = { ...entrada, publicadoEm: agora };
    gravar(st, [...itens.filter((c) => !(c.cenarioId === cenarioId && c.versao === versao)), atualizado]);
    return { ok: true };
  }

  // src/admin/flags.ts
  var FLAGS_PADRAO = {
    ia: false,
    fala: false,
    conteudoCustomizado: true,
    telemetria: true
  };
  function definirFlag(flags, nome, valor) {
    return { ...flags, [nome]: !!valor };
  }
  function killSwitch(flags, recurso) {
    return { ...flags, [recurso]: false };
  }
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
  var CHAVE_FLAGS = "pipoca.admin.flags.v1";
  function storagePadrao4() {
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
    const st = armazem ?? storagePadrao4();
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
    const st = armazem ?? storagePadrao4();
    if (!st)
      return;
    try {
      st.setItem(CHAVE_FLAGS, JSON.stringify(flags));
    } catch {}
  }

  // src/admin/ia_config.ts
  var MODELOS_POR_PROVEDOR = {
    claude: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"],
    gemini: ["gemini-3.6-flash", "gemini-2.5-flash"],
    openai: ["gpt-5.4-mini"],
    deepseek: ["deepseek-chat"]
  };
  var CONFIG_IA_PADRAO = {
    provedor: null,
    modelo: null,
    cotaMensal: 0,
    custoMaxMensal: 0,
    fallback: null
  };
  var PROVEDORES = ["claude", "gemini", "openai", "deepseek"];
  function validarConfigIA(c) {
    const erros = [];
    if (!c || typeof c !== "object")
      return ["configuração deve ser um objeto"];
    const r = c;
    const provedor = r["provedor"];
    if (provedor !== null && PROVEDORES.indexOf(provedor) < 0) {
      erros.push("provedor desconhecido");
    }
    const modelo = r["modelo"];
    if (provedor !== null && PROVEDORES.indexOf(provedor) >= 0) {
      const catalogo = MODELOS_POR_PROVEDOR[provedor];
      if (typeof modelo !== "string" || catalogo.indexOf(modelo) < 0) {
        erros.push("modelo fora do catálogo do provedor");
      }
    }
    const cota = r["cotaMensal"];
    if (typeof cota !== "number" || !Number.isFinite(cota) || cota < 0)
      erros.push("cotaMensal deve ser ≥ 0");
    const custo = r["custoMaxMensal"];
    if (typeof custo !== "number" || !Number.isFinite(custo) || custo < 0)
      erros.push("custoMaxMensal deve ser ≥ 0");
    const fallback = r["fallback"];
    if (fallback !== null && PROVEDORES.indexOf(fallback) < 0)
      erros.push("fallback desconhecido");
    if (fallback !== null && fallback === provedor)
      erros.push("fallback deve ser diferente do provedor principal");
    if (JSON.stringify(c).toLowerCase().includes("chave"))
      erros.push("chaves não pertencem ao cliente (server-side, fase06)");
    return erros;
  }
  function iaEfetivaDisponivel(config, limites, flags) {
    if (!limites || limites.iaPermitida !== true)
      return false;
    if (killSwitchAtivo(flags, "ia"))
      return false;
    if (!config || config.provedor === null)
      return false;
    if (validarConfigIA(config).length > 0)
      return false;
    return config.cotaMensal > 0;
  }
  var CHAVE_IA = "pipoca.admin.ia.v1";
  function storagePadrao5() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function lerMapa(st) {
    try {
      const raw = st.getItem(CHAVE_IA);
      const obj = raw ? JSON.parse(raw) : {};
      if (!obj || typeof obj !== "object" || Array.isArray(obj))
        return {};
      return obj;
    } catch {
      return {};
    }
  }
  function carregarConfigIA(tenantId, armazem) {
    const st = armazem ?? storagePadrao5();
    if (!st)
      return { ...CONFIG_IA_PADRAO };
    const c = lerMapa(st)[tenantId];
    return c && validarConfigIA(c).length === 0 ? { ...c } : { ...CONFIG_IA_PADRAO };
  }
  function salvarConfigIA(tenantId, c, armazem) {
    const st = armazem ?? storagePadrao5();
    if (!st)
      return;
    const mapa = lerMapa(st);
    mapa[tenantId] = { ...c };
    try {
      st.setItem(CHAVE_IA, JSON.stringify(mapa));
    } catch {}
  }

  // src/admin/ia_global.ts
  var CONFIG_IA_GLOBAL_PADRAO = {
    modeloPadrao: { claude: null, gemini: null, openai: null, deepseek: null },
    cadeiaFallback: []
  };
  var PROVEDORES2 = ["claude", "gemini", "openai", "deepseek"];
  function validarConfigIaGlobal(c) {
    const erros = [];
    if (!c || typeof c !== "object" || Array.isArray(c))
      return ["configuração deve ser um objeto"];
    const r = c;
    const mp = r["modeloPadrao"];
    if (!mp || typeof mp !== "object" || Array.isArray(mp)) {
      erros.push("modeloPadrao deve ser um objeto provedor→modelo");
    } else {
      for (const [prov, modelo] of Object.entries(mp)) {
        if (PROVEDORES2.indexOf(prov) < 0) {
          erros.push("modeloPadrao com provedor desconhecido: " + prov);
          continue;
        }
        if (modelo !== null) {
          const catalogo = MODELOS_POR_PROVEDOR[prov];
          if (typeof modelo !== "string" || catalogo.indexOf(modelo) < 0) {
            erros.push("modelo padrão fora do catálogo do provedor " + prov);
          }
        }
      }
    }
    const cadeia = r["cadeiaFallback"];
    if (!Array.isArray(cadeia)) {
      erros.push("cadeiaFallback deve ser uma lista de provedores");
    } else {
      const vistos = {};
      for (const p of cadeia) {
        if (PROVEDORES2.indexOf(p) < 0)
          erros.push("cadeiaFallback com provedor desconhecido");
        else if (vistos[p])
          erros.push("cadeiaFallback não pode repetir provedor");
        vistos[p] = true;
      }
    }
    if (JSON.stringify(c).toLowerCase().includes("chave")) {
      erros.push("chaves não pertencem ao cliente (server-side, fase06)");
    }
    return erros;
  }
  function normalizarConfigIaGlobal(raw) {
    if (validarConfigIaGlobal(raw).length > 0) {
      return { modeloPadrao: { ...CONFIG_IA_GLOBAL_PADRAO.modeloPadrao }, cadeiaFallback: [] };
    }
    const r = raw;
    const modeloPadrao = { ...CONFIG_IA_GLOBAL_PADRAO.modeloPadrao };
    for (const p of PROVEDORES2) {
      const m = r.modeloPadrao[p];
      modeloPadrao[p] = typeof m === "string" ? m : null;
    }
    return { modeloPadrao, cadeiaFallback: r.cadeiaFallback.slice() };
  }
  function provedorEfetivoGlobal(cfg, global) {
    if (cfg && cfg.provedor !== null)
      return cfg.provedor;
    return global && global.cadeiaFallback[0] || null;
  }
  function modeloEfetivoGlobal(provedor, cfg, global) {
    if (provedor === null)
      return null;
    if (cfg && cfg.provedor === provedor && cfg.modelo)
      return cfg.modelo;
    return global && global.modeloPadrao[provedor] || null;
  }
  function fallbacksEfetivosGlobal(cfg, global) {
    if (cfg && cfg.fallback !== null)
      return [cfg.fallback];
    const primario = provedorEfetivoGlobal(cfg, global);
    return (global && global.cadeiaFallback || []).filter((p) => p !== primario);
  }
  var CHAVE_IA_GLOBAL = "pipoca.admin.iaglobal.v1";
  function storagePadrao6() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function carregarConfigIaGlobal(armazem) {
    const st = armazem ?? storagePadrao6();
    if (!st)
      return normalizarConfigIaGlobal(null);
    try {
      const raw = st.getItem(CHAVE_IA_GLOBAL);
      if (raw === null)
        return normalizarConfigIaGlobal(null);
      return normalizarConfigIaGlobal(JSON.parse(raw));
    } catch {
      return normalizarConfigIaGlobal(null);
    }
  }
  function salvarConfigIaGlobal(c, armazem) {
    const st = armazem ?? storagePadrao6();
    if (!st)
      return;
    try {
      st.setItem(CHAVE_IA_GLOBAL, JSON.stringify(normalizarConfigIaGlobal(c)));
    } catch {}
  }
  function rotuloStatusChave(s) {
    if (!s || s.configurada !== true)
      return "não configurada";
    const mascara = typeof s.mascarada === "string" && /^\*{4}.{0,4}$/.test(s.mascarada) ? s.mascarada : "****";
    const fonte = s.fonte === "ambiente" ? " · secret do ambiente" : "";
    return "configurada · " + mascara + fonte;
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

  // src/core/perfil.ts
  var IDADE_MIN = 3;
  var IDADE_MAX = 12;
  var NIVEIS_VALIDOS = ["n1", "n2", "n3", "n4"];
  function normalizarGenero(genero) {
    return genero === "m" || genero === "f" ? genero : undefined;
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

  // src/core/economia.ts
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

  // src/core/historia.ts
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
  function validarItemCardapio(it) {
    if (!it || typeof it !== "object")
      return false;
    const r = it;
    return typeof r["id"] === "string" && r["id"].length > 0 && typeof r["label"] === "string" && r["label"].length > 0 && typeof r["icon"] === "string" && typeof r["cost"] === "number" && r["cost"] >= 0;
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
  var MS_POR_DIA2 = 86400000;
  function dentroDaRetencao(evento, agora, retencaoDias = RETENCAO_DIAS_PADRAO) {
    const limite = agora - retencaoDias * MS_POR_DIA2;
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
  var MS_POR_DIA3 = 86400000;
  var NIVEIS3 = ["n1", "n2", "n3", "n4"];
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
    if (!NIVEIS3.includes(r["nivel"]))
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
    return h.criadaEm >= agora - retencaoDias * MS_POR_DIA3;
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
  var CHAVE_SESSAO2 = "pipoca.sessao-conta.v1";
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
      const raw = localStorage.getItem(CHAVE_SESSAO2);
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
      localStorage.setItem(CHAVE_SESSAO2, JSON.stringify(sessao));
    } catch {}
  }
  function limparSessaoConta() {
    try {
      localStorage.removeItem(CHAVE_SESSAO2);
    } catch {}
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
  async function espelharConfigIA(tenantId, dados, config, transporte) {
    const cfg = config || configDoAmbiente();
    if (cfg.provedor !== "supabase" || !cfg.supabaseUrl || !cfg.supabaseAnonKey)
      return false;
    try {
      const auth = criarAuthSupabase({
        url: cfg.supabaseUrl,
        anonKey: cfg.supabaseAnonKey,
        ...transporte ? { transporte } : {}
      });
      const s = auth.sessaoAtual();
      if (!s || s.tipo !== "superadmin")
        return false;
      const token = await auth.obterToken();
      if (!token)
        return false;
      const t = transporte || transportePadrao();
      const resp = await t(cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/config_ia?on_conflict=tenant_id", {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify([{ tenant_id: tenantId, dados }])
      });
      return resp.status >= 200 && resp.status < 300;
    } catch {
      return false;
    }
  }
  function obterBackend(config) {
    const cfg = config || configDoAmbiente();
    if (cfg.provedor === "supabase" && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      return criarBackendSupabase(cfg);
    }
    return criarBackendLocal();
  }

  // src/backend/espelho_admin.ts
  var ESQUEMA_CONTEUDO = "pipoca.conteudo.v1";
  async function contextoOperador(config, transporte) {
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
      if (!s || s.tipo !== "superadmin")
        return null;
      const token = await auth.obterToken();
      if (!token)
        return null;
      return {
        base: cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json"
        },
        t: transporte || transportePadrao()
      };
    } catch {
      return null;
    }
  }
  async function upsert(ctx, caminho, linhas, prefer = "resolution=merge-duplicates,return=minimal") {
    try {
      const resp = await ctx.t(ctx.base + caminho, {
        method: "POST",
        headers: { ...ctx.headers, Prefer: prefer },
        body: JSON.stringify(linhas)
      });
      return resp.status >= 200 && resp.status < 300;
    } catch {
      return false;
    }
  }
  async function lerLinhas(ctx, caminho) {
    const resp = await ctx.t(ctx.base + caminho, { method: "GET", headers: ctx.headers });
    if (resp.status < 200 || resp.status >= 300)
      throw new Error("HTTP " + resp.status);
    const json = await resp.json();
    return Array.isArray(json) ? json : [];
  }
  async function espelharTenantRemoto(t, config, transporte) {
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return false;
    return upsert(ctx, "/tenants?on_conflict=id", [
      { id: t.id, dados: { esquema: "pipoca.tenant.v1", tenant: { ...t } } }
    ]);
  }
  async function espelharCenarioRemoto(c, config, transporte) {
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return false;
    return upsert(ctx, "/conteudo?on_conflict=cenario_id,versao", [
      {
        cenario_id: c.cenarioId,
        versao: c.versao,
        tenant_id: c.tenantId,
        publicado_em: c.publicadoEm,
        dados: { esquema: ESQUEMA_CONTEUDO, cenario: { ...c } }
      }
    ]);
  }
  async function espelharVinculoConta(email, tenantId, config, transporte) {
    const e = (email || "").trim().toLowerCase();
    if (!e || !e.includes("@") || !tenantId)
      return false;
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return false;
    return upsert(ctx, "/contas_tenant?on_conflict=email,tenant_id", [{ email: e, tenant_id: tenantId }], "resolution=ignore-duplicates,return=minimal");
  }
  async function espelharFlagsRemotas(flags, config, transporte) {
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return false;
    return upsert(ctx, "/flags_admin?on_conflict=id", [{ id: "global", dados: { ...flags } }]);
  }
  async function puxarAdminDoServidor(config, transporte) {
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return null;
    try {
      const [linhasT, linhasC, linhasF] = await Promise.all([
        lerLinhas(ctx, "/tenants?select=dados"),
        lerLinhas(ctx, "/conteudo?select=dados"),
        lerLinhas(ctx, "/flags_admin?select=dados&id=eq.global")
      ]);
      const tenants = [];
      for (const l of linhasT) {
        const t = validarEnvelopeTenant(l ? l.dados : null);
        if (t !== null)
          tenants.push(t);
      }
      substituirTenantsLocais(tenants);
      const cenarios = [];
      for (const l of linhasC) {
        const c = validarEnvelopeCenario(l ? l.dados : null);
        if (c !== null)
          cenarios.push(c);
      }
      substituirCenariosLocais(cenarios);
      let flags = false;
      const linhaFlags = linhasF[0];
      if (linhaFlags && linhaFlags.dados && typeof linhaFlags.dados === "object") {
        salvarFlags(normalizarFlags(linhaFlags.dados));
        flags = true;
      }
      return { tenants: tenants.length, cenarios: cenarios.length, flags };
    } catch {
      return null;
    }
  }
  var ID_CONFIG_IA_GLOBAL = "plataforma:global";
  async function espelharConfigIaGlobal(cfg, config, transporte) {
    if (validarConfigIaGlobal(cfg).length > 0)
      return false;
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return false;
    return upsert(ctx, "/config_ia?on_conflict=tenant_id", [
      { tenant_id: ID_CONFIG_IA_GLOBAL, dados: normalizarConfigIaGlobal(cfg) }
    ]);
  }
  async function puxarConfigIaGlobal(config, transporte) {
    const ctx = await contextoOperador(config, transporte);
    if (!ctx)
      return null;
    try {
      const linhas = await lerLinhas(ctx, "/config_ia?select=dados&tenant_id=eq." + encodeURIComponent(ID_CONFIG_IA_GLOBAL));
      const dados = linhas[0] ? linhas[0].dados : null;
      if (!dados || validarConfigIaGlobal(dados).length > 0)
        return null;
      const cfg = normalizarConfigIaGlobal(dados);
      salvarConfigIaGlobal(cfg);
      return cfg;
    } catch {
      return null;
    }
  }
  async function chamarAdminChavesIa(corpo, config, transporte) {
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
      if (!s || s.tipo !== "superadmin")
        return null;
      const token = await auth.obterToken();
      if (!token)
        return null;
      const t = transporte || transportePadrao();
      const resp = await t(cfg.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/admin-chaves-ia", {
        method: "POST",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + token,
          "content-type": "application/json"
        },
        body: JSON.stringify(corpo)
      });
      if (resp.status < 200 || resp.status >= 300)
        return null;
      return await resp.json();
    } catch {
      return null;
    }
  }
  function sanearStatus(raw) {
    if (!raw || typeof raw !== "object")
      return null;
    const r = raw;
    const provedores = ["claude", "gemini", "openai", "deepseek"];
    if (provedores.indexOf(r["provedor"]) < 0)
      return null;
    const mascarada = typeof r["mascarada"] === "string" ? r["mascarada"] : null;
    if (mascarada !== null && !/^\*{4}.{0,4}$/.test(mascarada))
      return null;
    return {
      provedor: r["provedor"],
      configurada: r["configurada"] === true,
      mascarada,
      fonte: r["fonte"] === "banco" || r["fonte"] === "ambiente" ? r["fonte"] : null
    };
  }
  async function statusChavesIa(config, transporte) {
    const resp = await chamarAdminChavesIa({ acao: "status" }, config, transporte);
    if (!resp || typeof resp !== "object")
      return null;
    const lista = resp.provedores;
    if (!Array.isArray(lista))
      return null;
    const saneados = [];
    for (const item of lista) {
      const s = sanearStatus(item);
      if (s)
        saneados.push(s);
    }
    return saneados;
  }
  async function salvarChaveIa(provedor, chave, config, transporte) {
    const resp = await chamarAdminChavesIa({ acao: "salvar", provedor, chave }, config, transporte);
    if (!resp || typeof resp !== "object")
      return null;
    return sanearStatus(resp.provedor);
  }
  async function testarChaveIa(provedor, config, transporte) {
    const resp = await chamarAdminChavesIa({ acao: "testar", provedor }, config, transporte);
    if (!resp || typeof resp !== "object")
      return null;
    return resp.ok === true;
  }
  function envolverRepoTenantComEspelho(repo, config, transporte) {
    return {
      listarTenants: (escopo) => repo.listarTenants(escopo),
      obterTenant: (id) => repo.obterTenant(id),
      listarPlanos: () => repo.listarPlanos(),
      obterLimitesEfetivos: (id, agora) => repo.obterLimitesEfetivos(id, agora),
      async salvarTenant(t) {
        await repo.salvarTenant(t);
        espelharTenantRemoto(t, config, transporte).catch(() => {});
      }
    };
  }

  // src/admin/bridge_admin.ts
  var PipocaAdminCanonico = {
    auth: {
      criarRepositorioAdmin,
      avaliarLogin,
      calcularAtrasoMs,
      hashSenha,
      adminIdDoEmail,
      MAX_TENTATIVAS_ADMIN,
      criarSessaoSuperAdmin,
      sessaoSuperAdminValida,
      escopoAutoriza,
      areaDisponivel,
      DURACAO_SESSAO_ADMIN_MS
    },
    rotas: {
      ROTAS_ADMIN,
      guardarRotaAdmin,
      TELA_SA_LOGIN,
      TELA_SA_HOME,
      TELA_SA_TENANT,
      TELA_SA_CONTENT,
      TELA_SA_AI,
      TELA_SA_SAFE,
      TELA_SA_IA_GLOBAL
    },
    tenants: {
      criarRepositorioTenant,
      novoTenant,
      listarContas,
      vincularConta,
      PLANOS_PADRAO,
      PLANO_MAIS_RESTRITIVO,
      PLANO_INICIAL,
      limitesDoPlano,
      limitesVigentes,
      diasRestantes,
      excedeTetoPerfis,
      ERRO_FORA_DE_ESCOPO
    },
    conteudo: {
      validarGrafoAutoral,
      listarCenarios,
      salvarRascunho,
      versionarCenario,
      publicarCenario
    },
    ia: {
      CONFIG_IA_PADRAO,
      MODELOS_POR_PROVEDOR,
      validarConfigIA,
      iaEfetivaDisponivel,
      carregarConfigIA,
      salvarConfigIA
    },
    iaGlobal: {
      CONFIG_IA_GLOBAL_PADRAO,
      validarConfigIaGlobal,
      normalizarConfigIaGlobal,
      carregarConfigIaGlobal,
      salvarConfigIaGlobal,
      provedorEfetivoGlobal,
      modeloEfetivoGlobal,
      fallbacksEfetivosGlobal,
      rotuloStatusChave
    },
    flags: {
      FLAGS_PADRAO,
      definirFlag,
      killSwitch,
      killSwitchAtivo,
      aplicarFlagsAosModos,
      carregarFlags,
      salvarFlags
    },
    modos: { modosPadrao },
    backend: {
      obterBackend,
      configDoAmbiente,
      normalizarConfigBackend,
      espelharConfigIA,
      espelharTenantRemoto,
      espelharCenarioRemoto,
      espelharFlagsRemotas,
      espelharVinculoConta,
      puxarAdminDoServidor,
      envolverRepoTenantComEspelho,
      espelharConfigIaGlobal,
      puxarConfigIaGlobal,
      statusChavesIa,
      salvarChaveIa,
      testarChaveIa
    }
  };
  globalThis.PipocaAdminCanonico = PipocaAdminCanonico;
  var bridge_admin_default = PipocaAdminCanonico;
})();
