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

  // src/ia/prompt.ts
  var descricaoNivel = {
    n1: "pré-leitor: frases mínimas, palavras curtas e concretas, ritmo de cantiga",
    n2: "leitor inicial: frases curtas e diretas, vocabulário do dia a dia",
    n3: "leitor em prática: frases um pouco mais longas, com uma imagem poética simples",
    n4: "leitor fluente: frases mais ricas, ainda curtas o bastante para o portão de leitura"
  };
  var PROMPT_BASE = [
    "Você é o narrador do Pipoca, um app de leitura para crianças de 3 a 12 anos.",
    "Sua voz é calma, acolhedora e encantada com as coisas pequenas do mundo.",
    "",
    "REGRAS DE SEGURANÇA (obrigatórias, sem exceção):",
    "- Conteúdo sempre adequado a crianças de 3 a 12 anos.",
    "- Proibido: violência gráfica, medo extremo, temas adultos, marcas comerciais, links, endereços, telefones ou qualquer dado pessoal.",
    "- Tom acolhedor, nunca condescendente nem clínico; nunca envergonhe a criança.",
    "- Se o pedido levar a conteúdo inseguro, recuse e reformule para algo seguro e gentil.",
    "",
    "FORMATO DA RESPOSTA:",
    'Responda SOMENTE com um JSON no formato Trecho: { "texto": string, "ehFinal": boolean }.',
    "Sem markdown, sem comentários, sem nada fora do JSON."
  ].join(`
`);
  function acharObjeto(grafo, id) {
    return grafo.cenario.objetos.find((o) => o.id === id);
  }
  function nomeLegivel(grafo, id) {
    const o = acharObjeto(grafo, id);
    return o ? `${o.emoji} ${o.nome}` : id;
  }
  function montarPrompt(ctx) {
    const { tipo, historia, objetoId, nivel, modoDesfecho, grafo } = ctx;
    const cen = grafo.cenario;
    const linhas = [];
    const personagem = cen.personagem || "uma criança curiosa";
    const paleta = cen.paleta ? `paleta "${cen.paleta}"` : "tom neutro acolhedor";
    linhas.push(`CENÁRIO: "${cen.nome}" — personagem: ${personagem}; ${paleta}.`);
    const bruta = grafo.niveis ? grafo.niveis[nivel] : "";
    const desc = bruta && bruta !== nivel ? bruta : descricaoNivel[nivel];
    linhas.push(`NÍVEL DE LEITURA: ${nivel} — ${desc}.`);
    linhas.push("Escreva o texto SOMENTE neste nível (um único fragmento, nunca os quatro).");
    linhas.push("O texto precisa ser curto o bastante para a criança ler no portão antes do próximo objeto.");
    if (historia.length === 0) {
      linhas.push("HISTÓRIA ATÉ AGORA: nenhuma — este é o comecinho.");
    } else {
      linhas.push("HISTÓRIA ATÉ AGORA (objetos na ordem): " + historia.map((id) => nomeLegivel(grafo, id)).join(" → ") + ".");
    }
    if (tipo === "abertura") {
      linhas.push("PEDIDO: escreva a ABERTURA da história, apresentando o cenário e o personagem.");
      linhas.push('Marque "ehFinal": false.');
    } else if (tipo === "objeto") {
      const obj = objetoId ? acharObjeto(grafo, objetoId) : undefined;
      if (obj) {
        linhas.push(`PEDIDO: a criança acabou de colocar o objeto ${obj.emoji} "${obj.nome}" na história` + (historia.length === 0 ? " (é o primeiro objeto)" : "") + `. Escreva o trecho que esse objeto desperta, coerente com o papel dele no fim ("${obj.papel_no_fim}").`);
      } else {
        linhas.push(`PEDIDO: a criança colocou um objeto novo ("${objetoId || "?"}"). Escreva um trecho gentil que o acolha na história.`);
      }
      linhas.push('Marque "ehFinal": false.');
    } else {
      const ultimo = historia[historia.length - 1];
      const temRamo = !!ultimo && cen.desfechos.aberto.some((d) => d.se_terminou_com === ultimo);
      if (modoDesfecho === "aberto" && temRamo && ultimo) {
        linhas.push(`PEDIDO: escreva o DESFECHO ABERTO da história, amarrado ao último objeto (${nomeLegivel(grafo, ultimo)}).`);
      } else if (modoDesfecho === "aberto") {
        linhas.push("PEDIDO: escreva um DESFECHO convergente e acolhedor — o último objeto não tem ramo próprio, e a história se fecha com o mesmo carinho.");
      } else {
        linhas.push("PEDIDO: escreva o DESFECHO CONVERGENTE da história, fechando o dia com aconchego.");
      }
      linhas.push('Marque "ehFinal": true.');
    }
    linhas.push('Responda SOMENTE com o JSON do Trecho: { "texto": string, "ehFinal": boolean }.');
    return linhas.join(`
`);
  }

  // src/ia/provedor.ts
  var TRECHO_JSON_SCHEMA = {
    type: "object",
    properties: {
      texto: { type: "string" },
      ehFinal: { type: "boolean" }
    },
    required: ["texto", "ehFinal"],
    additionalProperties: false
  };
  function validarTrechoGerado(bruto) {
    if (!bruto || typeof bruto !== "object") {
      throw new Error("Saída do provedor não é um objeto Trecho.");
    }
    const r = bruto;
    const texto = r["texto"];
    const ehFinal = r["ehFinal"];
    if (typeof texto !== "string" || texto.trim() === "") {
      throw new Error("Trecho gerado sem texto.");
    }
    if (typeof ehFinal !== "boolean") {
      throw new Error("Trecho gerado sem ehFinal booleano.");
    }
    return { texto, ehFinal };
  }
  function transportePadrao() {
    return (url, init) => fetch(url, init);
  }

  // src/motores/motor_ia.ts
  function chaveDe(tipo, nivel, modo, historia, objetoId) {
    return tipo + "|" + nivel + "|" + modo + "|" + historia.join(",") + "|" + (objetoId || "");
  }

  class MotorIA {
    provedor;
    grafo;
    modoDesfecho;
    motorA;
    cache = new Map;
    constructor(provedor, grafo, modoDesfecho) {
      this.provedor = provedor;
      this.grafo = grafo;
      this.modoDesfecho = modoDesfecho;
      this.motorA = new MotorGrafoAutoral(grafo);
    }
    abertura(nivel) {
      return this.servir(chaveDe("abertura", nivel, "", []), () => this.motorA.abertura(nivel));
    }
    aoAdicionarObjeto(historia, objetoId, nivel) {
      return this.servir(chaveDe("objeto", nivel, "", historia, objetoId), () => this.motorA.aoAdicionarObjeto(historia, objetoId, nivel));
    }
    desfecho(historia, modo, nivel) {
      return this.servir(chaveDe("desfecho", nivel, modo, historia), () => this.motorA.desfecho(historia, modo, nivel));
    }
    async aquecer(historia, nivel) {
      const alvos = [];
      if (historia.length === 0) {
        alvos.push({ tipo: "abertura", historia: [], modo: this.modoDesfecho });
      }
      const ordem = this.grafo.cenario.ordem_canonica || [];
      const acumulada = historia.slice();
      for (const id of ordem) {
        if (acumulada.indexOf(id) >= 0)
          continue;
        alvos.push({ tipo: "objeto", historia: acumulada.slice(), objetoId: id, modo: this.modoDesfecho });
        acumulada.push(id);
      }
      alvos.push({ tipo: "desfecho", historia: acumulada.slice(), modo: "convergente" });
      alvos.push({ tipo: "desfecho", historia: acumulada.slice(), modo: "aberto" });
      for (const alvo of alvos) {
        await this.gerarEArmazenar(alvo, nivel);
      }
    }
    servir(chave, deMotorA) {
      const pronto = this.cache.get(chave);
      if (pronto)
        return { ...pronto };
      const doA = deMotorA();
      this.cache.set(chave, doA);
      return { ...doA };
    }
    async gerarEArmazenar(alvo, nivel) {
      const chave = chaveDe(alvo.tipo, nivel, alvo.tipo === "desfecho" ? alvo.modo : "", alvo.historia, alvo.objetoId);
      if (this.cache.has(chave))
        return;
      try {
        const prompt = montarPrompt({
          tipo: alvo.tipo,
          historia: alvo.historia,
          objetoId: alvo.objetoId,
          nivel,
          modoDesfecho: alvo.modo,
          grafo: this.grafo
        });
        const gerado = await this.provedor.gerar(prompt, TRECHO_JSON_SCHEMA, { system: PROMPT_BASE });
        if (!gerado || typeof gerado.texto !== "string" || gerado.texto.trim() === "")
          return;
        const trecho = { texto: gerado.texto, ehFinal: alvo.tipo === "desfecho" };
        if (alvo.tipo === "objeto" && alvo.objetoId)
          trecho.objetoId = alvo.objetoId;
        if (!this.cache.has(chave))
          this.cache.set(chave, trecho);
      } catch {}
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
  function criarMotor(cenario, modos, deps) {
    const ordem = criarValidadorOrdem(cenario);
    if (modos.iaLigada) {
      const provedor = deps ? deps.provedor : undefined;
      if (provedor) {
        const motor2 = new MotorIA(provedor, montarGrafoAutoral(cenario), modos.desfecho);
        return { motor: motor2, ordem };
      }
      return criarMotorComFallback(cenario, ordem);
    }
    const motor = criarMotorA(cenario);
    return { motor, ordem };
  }
  function montarGrafoAutoral(cenario) {
    return {
      esquema: "pipoca.grafo-autoral.v1",
      niveis: { n1: "n1", n2: "n2", n3: "n3", n4: "n4" },
      regra_de_ouro: "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
      cenario
    };
  }
  function criarMotorA(cenario) {
    return new MotorGrafoAutoral(montarGrafoAutoral(cenario));
  }
  function criarMotorComFallback(cenario, ordem) {
    console.warn("[fabrica] iaLigada=true mas nenhum provedor de IA foi injetado. " + "Usando Motor A como fallback seguro.");
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
    openai: ["gpt-mini"],
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

  // src/core/perfil.ts
  var IDADE_MIN = 3;
  var IDADE_MAX = 12;
  var NIVEIS_VALIDOS = ["n1", "n2", "n3", "n4"];
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

  class RepositorioPerfil {
    _perfis = new Map;
    listar() {
      return [...this._perfis.values()];
    }
    buscar(id) {
      return this._perfis.get(id) ?? null;
    }
    salvar(p) {
      this._perfis.set(p.id, { ...p });
    }
    remover(id) {
      return this._perfis.delete(id);
    }
    carregar(perfis) {
      this._perfis.clear();
      for (const p of perfis)
        this._perfis.set(p.id, { ...p });
    }
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
  function validarEnvelopePerfil(raw) {
    if (typeof raw !== "object" || raw === null)
      return null;
    const r = raw;
    if (r["esquema"] !== ESQUEMA_PERFIL)
      return null;
    const erros = validarPerfil(r["perfil"]);
    if (erros.length > 0)
      return null;
    return r["perfil"];
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
      return estado;
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
    "objeto_destravado"
  ];
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

  // src/core/persistencia/chaves.ts
  var CHAVE_PERFIS = "pipoca.perfil.v1";
  function chaveSave(perfilId) {
    return `pipoca.save.v1:${perfilId}`;
  }
  function chaveTelemetria(perfilId) {
    return `pipoca.telemetria.v1:${perfilId}`;
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
      const raw = lerArrayEnvelopes(CHAVE_PERFIS, "pipoca.perfil.v1");
      const semEste = raw.filter((e) => e.perfil?.id !== p.id);
      const novoEnvelope = {
        esquema: "pipoca.perfil.v1",
        perfil: { ...p }
      };
      gravarItem(CHAVE_PERFIS, [...semEste, novoEnvelope]);
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
      gravarItem(chaveSave(perfilId), envelope);
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
    async apagarPerfil(perfilId) {
      try {
        localStorage.removeItem(chaveSave(perfilId));
      } catch {}
      try {
        localStorage.removeItem(chaveTelemetria(perfilId));
      } catch {}
      const envelopes = lerArrayEnvelopes(CHAVE_PERFIS, "pipoca.perfil.v1");
      const filtrado = envelopes.filter((e) => e.perfil?.id !== perfilId);
      gravarItem(CHAVE_PERFIS, filtrado);
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
    if (provedor === "firebase") {
      const opcoes = r["opcoes"];
      return { provedor: "firebase", opcoes: opcoes && typeof opcoes === "object" ? opcoes : {} };
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

  // src/backend/adaptadores/auth_firebase.ts
  var NAO_CONFIGURADO = "Backend Firebase não configurado neste build (paridade documentada — fase06).";
  function criarAuthFirebase() {
    return {
      entrarFamilia(_cred) {
        return Promise.reject(new Error(NAO_CONFIGURADO));
      },
      entrarSuperAdmin(_cred) {
        return Promise.reject(new Error(NAO_CONFIGURADO));
      },
      sair() {
        return Promise.resolve();
      },
      sessaoAtual() {
        return null;
      }
    };
  }

  // src/backend/adaptadores/repo_firebase.ts
  var NAO_CONFIGURADO2 = "RepositorioFirebase não configurado neste build (paridade documentada — fase06).";

  class RepositorioFirebase {
    carregarPerfis() {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    salvarPerfil(_p) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    carregarSave(_perfilId) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    salvarSave(_perfilId, _estado) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    registrarTelemetria(_evento) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    carregarTelemetria(_perfilId) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
    apagarPerfil(_perfilId) {
      return Promise.reject(new Error(NAO_CONFIGURADO2));
    }
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
        return assentarSessao(r, "familia");
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
    async apagarPerfil(perfilId) {
      const id = encodeURIComponent(perfilId);
      await this.req("/telemetria?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
      await this.req("/saves?perfil_id=eq." + id, "DELETE", undefined, "return=minimal");
      await this.req("/perfis?id=eq." + id, "DELETE", undefined, "return=minimal");
    }
  }

  // src/backend/adaptadores/repo_sincronizado.ts
  var CHAVE_TOMBSTONES = "pipoca.sync.apagados.v1";
  function storage2() {
    try {
      const g = globalThis;
      return g.localStorage || null;
    } catch {
      return null;
    }
  }
  function lerTombstones() {
    const st = storage2();
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
    const st = storage2();
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
  function criarRepositorioSincronizado(local, remoto) {
    return {
      carregarPerfis: () => local.carregarPerfis(),
      carregarSave: (perfilId) => local.carregarSave(perfilId),
      carregarTelemetria: (perfilId) => local.carregarTelemetria(perfilId),
      async salvarPerfil(p) {
        await local.salvarPerfil(p);
        remoto.salvarPerfil(p).catch(() => {});
      },
      async salvarSave(perfilId, estado) {
        await local.salvarSave(perfilId, estado);
        remoto.salvarSave(perfilId, estado).catch(() => {});
      },
      async registrarTelemetria(evento) {
        await local.registrarTelemetria(evento);
        remoto.registrarTelemetria(evento).catch(() => {});
      },
      async apagarPerfil(perfilId) {
        await local.apagarPerfil(perfilId);
        adicionarTombstone(perfilId);
        remoto.apagarPerfil(perfilId).then(() => removerTombstone(perfilId)).catch(() => {});
      }
    };
  }

  // src/backend/proxy_ia.ts
  function criarProxyIA(op) {
    const transporte = op.transporte || transportePadrao();
    const base = op.url.replace(/\/+$/, "");
    return {
      async gerar(req) {
        const token = await op.obterToken();
        if (!token)
          throw new Error("ProxyIA: sem sessão para gerar.");
        const tenant = op.tenantId ? op.tenantId() : null;
        const resp = await transporte(base + "/functions/v1/proxy-ia", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: op.anonKey,
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ ...req, ...tenant ? { tenantId: tenant } : {} })
        });
        if (resp.status !== 200) {
          throw new Error("ProxyIA: HTTP " + resp.status + " — degradando para o provedor local.");
        }
        return validarTrechoGerado(await resp.json());
      }
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
    const [locais, remotos] = await Promise.all([local.carregarPerfis(), remoto.carregarPerfis()]);
    const idsLocais = new Set(locais.map((p) => p.id));
    let puxados = 0;
    for (const p of remotos) {
      if (idsLocais.has(p.id))
        continue;
      await local.salvarPerfil(p);
      const save = await remoto.carregarSave(p.id);
      if (save)
        await local.salvarSave(p.id, save);
      puxados++;
    }
    const res = await migrar(local, remoto);
    return { apagadosDrenados, puxados, empurrados: res.perfis };
  }

  // src/backend/backend.ts
  function proxyIndisponivel(motivo) {
    return {
      gerar() {
        return Promise.reject(new Error(motivo));
      }
    };
  }
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
      repo: criarRepositorio(),
      proxyIA: proxyIndisponivel("ProxyIA indisponível no backend local — degradando para o provedor simulado.")
    };
  }
  function criarBackendFirebase() {
    return {
      auth: criarAuthFirebase(),
      repo: new RepositorioFirebase,
      proxyIA: proxyIndisponivel("ProxyIA Firebase não configurado neste build.")
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
    const proxyIA = criarProxyIA({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      obterToken: () => auth.obterToken(),
      tenantId: () => escopoTenant(auth.sessaoAtual())
    });
    return { auth, repo, proxyIA, sincronizar: () => sincronizarInicial(local, remoto) };
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
    if (cfg.provedor === "firebase")
      return criarBackendFirebase();
    return criarBackendLocal();
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
    modos: { modosPadrao },
    backend: { obterBackend, configDoAmbiente, normalizarConfigBackend, espelharConfigIA }
  };
  globalThis.PipocaAdminCanonico = PipocaAdminCanonico;
  var bridge_admin_default = PipocaAdminCanonico;
})();
