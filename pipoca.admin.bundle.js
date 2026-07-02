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
  var ROTAS_ADMIN = {
    SA_LOGIN: TELA_SA_LOGIN,
    SA_HOME: TELA_SA_HOME,
    SA_TENANT: TELA_SA_TENANT,
    SA_CONTENT: TELA_SA_CONTENT,
    SA_AI: TELA_SA_AI,
    SA_SAFE: TELA_SA_SAFE
  };
  var TELAS_VALIDAS = [
    TELA_SA_LOGIN,
    TELA_SA_HOME,
    TELA_SA_TENANT,
    TELA_SA_CONTENT,
    TELA_SA_AI,
    TELA_SA_SAFE
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
    { id: "familia", nome: "Família", limites: { maxPerfis: 4, iaPermitida: true, cenariosCustomizados: 2, retencaoTelemetriaDias: 90 } },
    { id: "escola", nome: "Escola", limites: { maxPerfis: 40, iaPermitida: true, cenariosCustomizados: 10, retencaoTelemetriaDias: 180 } }
  ];
  var PLANO_MAIS_RESTRITIVO = "gratis";
  function limitesDoPlano(planoId) {
    const p = PLANOS_PADRAO.find((x) => x.id === planoId);
    const base = p ?? PLANOS_PADRAO.find((x) => x.id === PLANO_MAIS_RESTRITIVO);
    return { ...base.limites };
  }
  function excedeTetoPerfis(contagemAtual, limites) {
    return contagemAtual + 1 > limites.maxPerfis;
  }

  // src/admin/tenant/repositorioTenant.ts
  var ERRO_FORA_DE_ESCOPO = "Não foi possível concluir a ação.";
  var CHAVE_TENANTS = "pipoca.admin.tenants.v1";
  var CHAVE_CONTAS = "pipoca.admin.contas.v1";
  var ESQUEMA_TENANT = "pipoca.tenant.v1";
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
      planoId: PLANO_MAIS_RESTRITIVO,
      ativo: true,
      criadoEm: agora
    };
  }
  function tenantValido(t) {
    if (!t || typeof t !== "object")
      return false;
    const r = t;
    return typeof r["id"] === "string" && r["id"].length > 0 && typeof r["nome"] === "string" && typeof r["planoId"] === "string" && typeof r["ativo"] === "boolean" && typeof r["criadoEm"] === "number";
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
      async obterLimitesEfetivos(id) {
        if (!st || !autorizado(id))
          return limitesDoPlano(PLANO_MAIS_RESTRITIVO);
        const t = lerTenants(st).find((x) => x.id === id);
        return limitesDoPlano(t ? t.planoId : PLANO_MAIS_RESTRITIVO);
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

  // src/core/grafo/tipos.ts
  var ESQUEMA_GRAFO = "pipoca.grafo-autoral.v1";

  // src/core/grafo/validarGrafo.ts
  var PAPEIS_VALIDOS = ["nucleo", "chave", "neutro"];
  var NIVEIS = ["n1", "n2", "n3", "n4"];
  var RE_SE = /^(tem|nao_tem):\w+$/;
  function assertFragmento4(obj, ctx) {
    if (typeof obj !== "object" || obj === null) {
      throw new Error(`${ctx}: Fragmento4 deve ser um objeto`);
    }
    for (const n of NIVEIS) {
      const val = obj[n];
      if (typeof val !== "string" || val.trim() === "") {
        throw new Error(`${ctx}: campo "${n}" ausente ou vazio no Fragmento4`);
      }
    }
  }
  function validarGrafo(json) {
    if (typeof json !== "object" || json === null) {
      throw new Error("validarGrafo: argumento deve ser um objeto");
    }
    const raw = json;
    if (raw["esquema"] !== ESQUEMA_GRAFO) {
      throw new Error(`validarGrafo: esquema inválido "${String(raw["esquema"])}" — esperado "${ESQUEMA_GRAFO}"`);
    }
    const niveis = raw["niveis"];
    if (typeof niveis !== "object" || niveis === null) {
      throw new Error("validarGrafo: campo 'niveis' ausente");
    }
    for (const n of NIVEIS) {
      const v = niveis[n];
      if (typeof v !== "string" || v.trim() === "") {
        throw new Error(`validarGrafo: niveis.${n} ausente ou vazio`);
      }
    }
    if (typeof raw["regra_de_ouro"] !== "string") {
      throw new Error("validarGrafo: campo 'regra_de_ouro' ausente");
    }
    const cenario = raw["cenario"];
    if (typeof cenario !== "object" || cenario === null) {
      throw new Error("validarGrafo: campo 'cenario' ausente");
    }
    const cen = cenario;
    for (const campo of ["id", "nome", "personagem", "paleta"]) {
      if (typeof cen[campo] !== "string" || cen[campo].trim() === "") {
        throw new Error(`validarGrafo: cenario.${campo} ausente ou vazio`);
      }
    }
    assertFragmento4(cen["abertura"], "cenario.abertura");
    if (!Array.isArray(cen["objetos"])) {
      throw new Error("validarGrafo: cenario.objetos deve ser array");
    }
    const objetos = cen["objetos"];
    const idsVistos = new Set;
    let nucleoCount = 0;
    for (const item of objetos) {
      if (typeof item !== "object" || item === null) {
        throw new Error("validarGrafo: cada objeto deve ser um objeto");
      }
      const o = item;
      if (typeof o["id"] !== "string" || o["id"].trim() === "") {
        throw new Error("validarGrafo: objeto sem 'id'");
      }
      const id = o["id"];
      if (idsVistos.has(id)) {
        throw new Error(`validarGrafo: id duplicado "${id}"`);
      }
      idsVistos.add(id);
      if (typeof o["emoji"] !== "string" || o["emoji"].trim() === "") {
        throw new Error(`validarGrafo: objeto "${id}" sem 'emoji'`);
      }
      if (typeof o["nome"] !== "string" || o["nome"].trim() === "") {
        throw new Error(`validarGrafo: objeto "${id}" sem 'nome'`);
      }
      const papel = o["papel_no_fim"];
      if (!PAPEIS_VALIDOS.includes(papel)) {
        throw new Error(`validarGrafo: objeto "${id}" tem papel_no_fim inválido "${String(papel)}"`);
      }
      if (papel === "nucleo")
        nucleoCount++;
      assertFragmento4(o["gatilho"], `objeto "${id}".gatilho`);
      if (!Array.isArray(o["regras"])) {
        throw new Error(`validarGrafo: objeto "${id}".regras deve ser array`);
      }
      for (const regra of o["regras"]) {
        if (typeof regra !== "object" || regra === null) {
          throw new Error(`validarGrafo: regra em "${id}" deve ser objeto`);
        }
        const r = regra;
        if (typeof r["se"] !== "string" || !RE_SE.test(r["se"])) {
          throw new Error(`validarGrafo: regra "${String(r["se"])}" em "${id}" não bate com padrão (tem|nao_tem):id`);
        }
        assertFragmento4(r["entao"], `objeto "${id}".regra.entao`);
      }
    }
    if (nucleoCount !== 1) {
      throw new Error(`validarGrafo: cenário deve ter exatamente 1 objeto nucleo, encontrado ${nucleoCount}`);
    }
    const desfechos = cen["desfechos"];
    if (typeof desfechos !== "object" || desfechos === null) {
      throw new Error("validarGrafo: cenario.desfechos ausente");
    }
    const des = desfechos;
    assertFragmento4(des["convergente"], "cenario.desfechos.convergente");
    if (!Array.isArray(des["aberto"])) {
      throw new Error("validarGrafo: cenario.desfechos.aberto deve ser array");
    }
    for (const a of des["aberto"]) {
      if (typeof a !== "object" || a === null) {
        throw new Error("validarGrafo: cada desfecho aberto deve ser objeto");
      }
      const ab = a;
      if (typeof ab["se_terminou_com"] !== "string") {
        throw new Error("validarGrafo: desfecho aberto sem 'se_terminou_com'");
      }
      if (!idsVistos.has(ab["se_terminou_com"])) {
        throw new Error(`validarGrafo: desfecho aberto referencia id desconhecido "${String(ab["se_terminou_com"])}"`);
      }
      assertFragmento4(ab["fragmento"], `desfecho aberto "${String(ab["se_terminou_com"])}".fragmento`);
    }
    if (cen["ordem_canonica"] !== undefined) {
      if (!Array.isArray(cen["ordem_canonica"])) {
        throw new Error("validarGrafo: cenario.ordem_canonica deve ser array");
      }
      const ocIds = new Set;
      for (const ocId of cen["ordem_canonica"]) {
        if (typeof ocId !== "string") {
          throw new Error("validarGrafo: ordem_canonica contém item não-string");
        }
        if (!idsVistos.has(ocId)) {
          throw new Error(`validarGrafo: ordem_canonica referencia id desconhecido "${ocId}"`);
        }
        if (ocIds.has(ocId)) {
          throw new Error(`validarGrafo: ordem_canonica tem id duplicado "${ocId}"`);
        }
        ocIds.add(ocId);
      }
    }
    return json;
  }

  // src/motores/motor_a.ts
  class MotorGrafoAutoral {
    cen;
    objIndex;
    constructor(grafo) {
      this.cen = grafo.cenario;
      this.objIndex = new Map(this.cen.objetos.map((o) => [o.id, o]));
    }
    abertura(nivel) {
      return { texto: this.cen.abertura[nivel], ehFinal: false };
    }
    aoAdicionarObjeto(historia, objetoId, nivel) {
      const obj = this.objIndex.get(objetoId);
      if (!obj)
        return { texto: "", ehFinal: false, objetoId };
      const regra = obj.regras.find((r) => this.avaliaCondicao(r.se, historia));
      const frag = regra ? regra.entao : obj.gatilho;
      return { texto: frag[nivel], ehFinal: false, objetoId };
    }
    desfecho(historia, modo, nivel) {
      if (modo === "aberto") {
        const ultimo = historia[historia.length - 1];
        const aberto = this.cen.desfechos.aberto.find((a) => a.se_terminou_com === ultimo);
        if (aberto)
          return { texto: aberto.fragmento[nivel], ehFinal: true };
      }
      return { texto: this.cen.desfechos.convergente[nivel], ehFinal: true };
    }
    avaliaCondicao(cond, historia) {
      const colonIdx = cond.indexOf(":");
      if (colonIdx === -1)
        return false;
      const op = cond.slice(0, colonIdx);
      const alvo = cond.slice(colonIdx + 1);
      const presente = historia.includes(alvo);
      if (op === "tem")
        return presente;
      if (op === "nao_tem")
        return !presente;
      return false;
    }
  }

  // src/motores/validador_ordem.ts
  var RE_TEM = /^tem:(\w+)$/;
  function topoSort(cenario) {
    const ids = cenario.objetos.map((o) => o.id);
    const deps = new Map;
    for (const id of ids)
      deps.set(id, new Set);
    for (const obj of cenario.objetos) {
      for (const regra of obj.regras) {
        const m = RE_TEM.exec(regra.se);
        if (m) {
          const dependeDe = m[1];
          if (deps.has(dependeDe)) {
            deps.get(obj.id).add(dependeDe);
          }
        }
      }
    }
    const resultado = [];
    const visitado = new Set;
    const emPilha = new Set;
    function visitar(id) {
      if (visitado.has(id))
        return;
      if (emPilha.has(id)) {
        throw new Error(`validador_ordem: ciclo de dependência detectado em "${id}"`);
      }
      emPilha.add(id);
      for (const dep of deps.get(id) ?? []) {
        visitar(dep);
      }
      emPilha.delete(id);
      visitado.add(id);
      resultado.push(id);
    }
    for (const id of ids)
      visitar(id);
    return resultado;
  }
  function criarValidadorOrdem(cenario) {
    const _ordemCanonica = cenario.ordem_canonica ? [...cenario.ordem_canonica] : topoSort(cenario);
    const deps = new Map;
    for (const obj of cenario.objetos) {
      const d = new Set;
      for (const regra of obj.regras) {
        const m = RE_TEM.exec(regra.se);
        if (m) {
          const depId = m[1];
          if (cenario.objetos.some((o) => o.id === depId)) {
            d.add(depId);
          }
        }
      }
      deps.set(obj.id, d);
    }
    return {
      ordemCanonica() {
        return [..._ordemCanonica];
      },
      validar(ordemJogador) {
        if (ordemJogador.length === 0) {
          return {
            ok: false,
            dica: "Quase! Arraste os quadros para montar a história."
          };
        }
        const colocados = new Set;
        for (const id of ordemJogador) {
          const necessarios = deps.get(id);
          if (necessarios) {
            for (const dep of necessarios) {
              if (!colocados.has(dep)) {
                const objDep = cenario.objetos.find((o) => o.id === dep);
                const nomeDep = objDep ? objDep.nome : dep;
                return {
                  ok: false,
                  dica: `Quase! O "${nomeDep}" precisa aparecer antes. Tente reorganizar os quadros.`
                };
              }
            }
          }
          colocados.add(id);
        }
        return { ok: true };
      }
    };
  }

  // src/motores/fabrica.ts
  function criarMotor(cenario, modos) {
    const ordem = criarValidadorOrdem(cenario);
    if (modos.iaLigada) {
      return criarMotorComFallback(cenario, ordem);
    }
    const motor = criarMotorA(cenario);
    return { motor, ordem };
  }
  function criarMotorA(cenario) {
    const grafo = {
      esquema: "pipoca.grafo-autoral.v1",
      niveis: { n1: "n1", n2: "n2", n3: "n3", n4: "n4" },
      regra_de_ouro: "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
      cenario
    };
    return new MotorGrafoAutoral(grafo);
  }
  function criarMotorComFallback(cenario, ordem) {
    console.warn("[fabrica] iaLigada=true mas Motor B não está disponível (fase05). " + "Usando Motor A como fallback seguro.");
    const motor = criarMotorA(cenario);
    return { motor, ordem };
  }

  // src/core/modos.ts
  var modosPadrao = {
    palco: "Palco",
    desfecho: "convergente",
    verificacao: "cuidador",
    iaLigada: false
  };

  // src/admin/validar_grafo.ts
  var NIVEIS2 = ["n1", "n2", "n3", "n4"];
  function validarGrafoAutoral(json) {
    const erros = [];
    const avisos = [];
    let grafo;
    try {
      grafo = validarGrafo(json);
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
      return { ok: false, erros, avisos };
    }
    let ordemIds = [];
    try {
      const ordem = criarValidadorOrdem(grafo.cenario);
      ordemIds = ordem.ordemCanonica();
    } catch (e) {
      erros.push("dependências: " + (e instanceof Error ? e.message : String(e)));
      return { ok: false, erros, avisos };
    }
    try {
      const { motor } = criarMotor(grafo.cenario, { ...modosPadrao });
      for (const nivel of NIVEIS2) {
        if (!motor.abertura(nivel).texto)
          erros.push(`abertura vazia no nível ${nivel}`);
        const historia = [];
        for (const id of ordemIds) {
          const t = motor.aoAdicionarObjeto(historia, id, nivel);
          if (!t.texto)
            erros.push(`trecho vazio para "${id}" no nível ${nivel}`);
          historia.push(id);
        }
        if (!motor.desfecho(historia, "convergente", nivel).texto) {
          erros.push(`desfecho convergente vazio no nível ${nivel}`);
        }
        if (!motor.desfecho(historia, "aberto", nivel).texto) {
          erros.push(`desfecho aberto vazio no nível ${nivel}`);
        }
      }
    } catch (e) {
      erros.push("simulação: " + (e instanceof Error ? e.message : String(e)));
    }
    const comRamo = new Set(grafo.cenario.desfechos.aberto.map((d) => d.se_terminou_com));
    const semRamo = grafo.cenario.objetos.map((o) => o.id).filter((id) => !comRamo.has(id));
    if (semRamo.length > 0) {
      avisos.push(`desfecho aberto sem ramo para: ${semRamo.join(", ")} — nesses finais a história degrada para o desfecho convergente`);
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
    if (killSwitchAtivo(flags, "ia"))
      return { ...modos, iaLigada: false };
    return { ...modos };
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
  function carregarFlags(armazem) {
    const st = armazem ?? storagePadrao4();
    if (!st)
      return { ...FLAGS_PADRAO };
    try {
      const raw = st.getItem(CHAVE_FLAGS);
      if (raw === null)
        return { ...FLAGS_PADRAO };
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || Array.isArray(obj))
        return { ...FLAGS_PADRAO };
      const limpo = { ...FLAGS_PADRAO };
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "boolean")
          limpo[k] = v;
      }
      return limpo;
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
    gemini: ["gemini-flash"],
    openai: ["gpt-mini"]
  };
  var CONFIG_IA_PADRAO = {
    provedor: null,
    modelo: null,
    cotaMensal: 0,
    custoMaxMensal: 0,
    fallback: null
  };
  var PROVEDORES = ["claude", "gemini", "openai"];
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
      TELA_SA_SAFE
    },
    tenants: {
      criarRepositorioTenant,
      novoTenant,
      listarContas,
      vincularConta,
      PLANOS_PADRAO,
      PLANO_MAIS_RESTRITIVO,
      limitesDoPlano,
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
    flags: {
      FLAGS_PADRAO,
      definirFlag,
      killSwitch,
      killSwitchAtivo,
      aplicarFlagsAosModos,
      carregarFlags,
      salvarFlags
    },
    modos: { modosPadrao }
  };
  globalThis.PipocaAdminCanonico = PipocaAdminCanonico;
  var bridge_admin_default = PipocaAdminCanonico;
})();
