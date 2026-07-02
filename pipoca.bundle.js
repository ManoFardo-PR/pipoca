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

  // src/ia/guardrails.ts
  var MAX_CHARS_SAIDA = 700;
  var RE_TERMOS_BLOQUEADOS = new RegExp("\\b(?:matar|morrer|morte|mortes|sangue|armas?|tiros?|facadas?|" + "terror|pavor|pesadelos?|demonios?|" + "cervejas?|vodka|cigarros?|drogas?|sexo|nudez|apostas?)\\b" + "|\\b(?:assassin|violenc)");
  var RE_URL = /https?:\/\/|www\./i;
  var RE_EMAIL = /\S+@\S+\.\S+/;
  var RE_TELEFONE = /\b\d{4,5}[-\s]\d{4}\b|\d{8,}/;
  function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  }
  function categoriaProibida(texto) {
    if (RE_URL.test(texto))
      return "link";
    if (RE_EMAIL.test(texto))
      return "dado pessoal (e-mail)";
    if (RE_TELEFONE.test(texto))
      return "dado pessoal (telefone)";
    if (RE_TERMOS_BLOQUEADOS.test(normalizar(texto)))
      return "termo impróprio para crianças";
    return null;
  }
  function criarGuardrails() {
    return {
      filtrarEntrada(prompt) {
        if (!prompt || prompt.trim() === "")
          return { permitir: false, motivo: "prompt vazio" };
        const cat = categoriaProibida(prompt);
        if (cat)
          return { permitir: false, motivo: cat };
        return { permitir: true };
      },
      filtrarSaida(trecho) {
        const texto = trecho && typeof trecho.texto === "string" ? trecho.texto : "";
        if (texto.trim() === "")
          return { permitir: false, motivo: "texto vazio" };
        if (texto.length > MAX_CHARS_SAIDA)
          return { permitir: false, motivo: "texto longo demais para o portão" };
        const cat = categoriaProibida(texto);
        if (cat)
          return { permitir: false, motivo: cat };
        return { permitir: true };
      }
    };
  }
  function envolverComGuardrails(provedor, guardrails) {
    const g = guardrails || criarGuardrails();
    return {
      async gerar(prompt, schema, opts) {
        const entrada = g.filtrarEntrada(prompt);
        if (!entrada.permitir) {
          throw new Error("guardrails: entrada bloqueada (" + (entrada.motivo || "regra de segurança") + ")");
        }
        const trecho = await provedor.gerar(prompt, schema, opts);
        const saida = g.filtrarSaida(trecho);
        if (!saida.permitir) {
          throw new Error("guardrails: saída bloqueada (" + (saida.motivo || "regra de segurança") + ")");
        }
        return saida.trechoReformulado || trecho;
      }
    };
  }

  // src/ia/simulado.ts
  function fnv(s) {
    let h = 2166136261;
    for (let i = 0;i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function escolher(opcoes, semente) {
    return opcoes[fnv(semente) % opcoes.length];
  }
  function criarProvedorSimulado(grafo, opts) {
    const cen = grafo.cenario;
    const personagem = cen.personagem || "a criança";
    return {
      async gerar(prompt, _schema, _opts) {
        if (opts && opts.falhar) {
          throw new Error("Provedor simulado em modo falha (teste de degradação).");
        }
        const ehFinal = prompt.indexOf('"ehFinal": true') >= 0;
        const nivelM = /NÍVEL DE LEITURA: (n[1-4])/.exec(prompt);
        const nivel = nivelM ? nivelM[1] : "n2";
        const curto = nivel === "n1" || nivel === "n2";
        const objetoM = /objeto (\S+) "([^"]+)"/.exec(prompt);
        const abertura = prompt.indexOf("PEDIDO: escreva a ABERTURA") >= 0;
        let texto;
        if (abertura) {
          texto = curto ? `✨ ${personagem} olha em volta. Hoje tem história nova.` : `✨ ${personagem} olha devagar em volta: alguma coisa pequenina está para acontecer, e hoje a história é novinha.`;
        } else if (objetoM) {
          const emoji = objetoM[1];
          const nome = objetoM[2];
          const verbo = escolher(["chega", "aparece", "acorda"], prompt);
          texto = curto ? `✨ ${emoji} ${nome} ${verbo} na história. ${personagem} sorri.` : `✨ ${emoji} ${nome} ${verbo} bem no meio da história, e ${personagem} sorri como quem guarda um segredo bom.`;
        } else if (ehFinal) {
          texto = curto ? `✨ A história se aninha. ${personagem} respira fundo. Fim por hoje.` : `✨ A história inteira se aninha como um bicho de estimação, e ${personagem} respira fundo: fim por hoje, com gosto de amanhã.`;
        } else {
          texto = `✨ A história continua, um passinho de cada vez.`;
        }
        return { texto, ehFinal };
      }
    };
  }

  // src/ia/orquestrador.ts
  function criarOrquestrador(cadeiaFallback, opts) {
    const cotaMensal = opts && typeof opts.cotaMensal === "number" ? opts.cotaMensal : 1000;
    const custoMaxMensal = opts && typeof opts.custoMaxMensal === "number" ? opts.custoMaxMensal : 1000;
    const custoPorChamada = opts && typeof opts.custoPorChamada === "number" ? opts.custoPorChamada : 1;
    const aoRegistrarUso = opts ? opts.aoRegistrarUso : undefined;
    let chamadas = 0;
    let custoAcumulado = 0;
    function usoAtual() {
      return { chamadas, custoAcumulado, cotaRestante: Math.max(0, cotaMensal - chamadas) };
    }
    function registrar() {
      chamadas += 1;
      custoAcumulado += custoPorChamada;
      if (aoRegistrarUso) {
        try {
          aoRegistrarUso(usoAtual());
        } catch {}
      }
    }
    return {
      uso: usoAtual,
      async gerar(prompt, schema, optsGeracao) {
        if (!cadeiaFallback.length) {
          throw new Error("Orquestrador sem provedores na cadeia.");
        }
        let ultimoErro = null;
        for (const provedor of cadeiaFallback) {
          if (cotaMensal - chamadas <= 0) {
            throw new Error("Cota de IA esgotada — degradando para o motor autoral.");
          }
          if (custoAcumulado + custoPorChamada > custoMaxMensal) {
            throw new Error("Teto de custo de IA atingido — degradando para o motor autoral.");
          }
          try {
            registrar();
            return await provedor.gerar(prompt, schema, optsGeracao);
          } catch (e) {
            ultimoErro = e;
          }
        }
        throw ultimoErro instanceof Error ? ultimoErro : new Error("Todos os provedores falharam.");
      }
    };
  }

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
  var CHAVE_FLAGS = "pipoca.admin.flags.v1";
  function storagePadrao() {
    try {
      const g = globalThis;
      return g.localStorage ?? null;
    } catch {
      return null;
    }
  }
  function carregarFlags(armazem) {
    const st = armazem ?? storagePadrao();
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

  // src/core/composicao.ts
  function nivelKey(nivel) {
    const s = String(nivel ?? "").trim().toLowerCase();
    if (s === "n1" || s === "n2" || s === "n3" || s === "n4")
      return s;
    const d = s.replace(/[^0-9]/g, "");
    if (d === "1" || d === "2" || d === "3" || d === "4")
      return "n" + d;
    return "n2";
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
  function contaComTempera(cenario, objId, linha, nivel) {
    const obj = cenario.objetos[objId];
    if (!obj)
      return "";
    const temperas = obj.tempera || [];
    for (const t of temperas) {
      const cond = String(t.se || "");
      if (cond.indexOf("tem:") === 0) {
        const alvo = cond.slice(4);
        if (alvo !== objId && linha.indexOf(alvo) !== -1) {
          const txt = t.entao && t.entao[nivel];
          if (txt)
            return txt;
        }
      }
    }
    return obj.conta[nivel] || "";
  }
  function textoDesfecho(estado, nivel) {
    const d = estado.cenario.moldura.desfecho;
    if (estado.modos && estado.modos.desfecho === "aberto" && d.aberto && d.aberto.length) {
      const ultimo = estado.linha[estado.linha.length - 1];
      const match = d.aberto.find((a) => a.se_terminou_com === ultimo);
      if (match && match.fragmento[nivel])
        return match.fragmento[nivel];
    }
    return d.convergente[nivel] || "";
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
    const partes = [];
    const abertura = estado.cenario.moldura.abertura[nk];
    if (abertura)
      partes.push(abertura);
    for (const id of estado.linha) {
      const conta = contaComTempera(estado.cenario, id, estado.linha, nk);
      if (conta)
        partes.push(conta);
    }
    if (estaNaUltimaRodada(estado)) {
      const fim = textoDesfecho(estado, nk);
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
    }
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

  // src/core/perfil.ts
  var AVATARES = ["pingo", "fubá", "cacau", "lua", "tuca"];
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
  function criarPerfil(id, params) {
    return {
      id,
      nome: normalizarNome(params.nome ?? ""),
      idade: clampIdade(params.idade ?? 7),
      nivel: normalizarNivel(params.nivel ?? NIVEL_PADRAO),
      avatarId: normalizarAvatar(params.avatarId ?? AVATAR_PADRAO)
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
  function criarEnvelopePerfil(perfil) {
    return { esquema: ESQUEMA_PERFIL, perfil };
  }
  function criarEnvelopeSave(perfilId, estado) {
    return { esquema: ESQUEMA_SAVE, perfilId, estado };
  }

  // src/core/lgpd.ts
  async function exportarDados(perfilId, repo, agora) {
    const perfis = await repo.carregarPerfis();
    const perfil = perfis.find((p) => p.id === perfilId) ?? null;
    const estado = await repo.carregarSave(perfilId);
    return {
      esquema: "pipoca.export.v1",
      exportadoEm: agora,
      perfil: perfil ? criarEnvelopePerfil(perfil) : null,
      save: estado ? criarEnvelopeSave(perfilId, estado) : null
    };
  }
  async function apagarDados(perfilId, repo) {
    await repo.apagarPerfil(perfilId);
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

  // src/core/onboarding.ts
  var BLOCO_PADRAO = 15;
  function perfilDoOnboarding(dados) {
    return criarPerfil(dados.id, {
      nome: dados.nome,
      idade: dados.idade,
      nivel: dados.nivel,
      avatarId: dados.avatarId
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

  // src/core/telemetria.ts
  var ESQUEMA_TELEMETRIA = "pipoca.telemetria.v1";
  var TIPOS_VALIDOS = [
    "leitura_confirmada",
    "sessao_iniciada",
    "sessao_encerrada",
    "historia_concluida",
    "objeto_destravado"
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

  // src/core/persistencia/RepositorioSupabase.ts
  class RepositorioSupabase {
    carregarPerfis() {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06. " + "Use criarRepositorio() (local) no MVP."));
    }
    salvarPerfil(_p) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
    carregarSave(_perfilId) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
    salvarSave(_perfilId, _estado) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
    registrarTelemetria(_evento) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
    carregarTelemetria(_perfilId) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
    apagarPerfil(_perfilId) {
      return Promise.reject(new Error("RepositorioSupabase: não implementado — ponto de migração fase06."));
    }
  }

  // src/core/persistencia/index.ts
  function criarRepositorio(opts) {
    if (opts?.remoto) {
      return new RepositorioSupabase;
    }
    return new RepositorioLocalStorage;
  }

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
  var MS_POR_DIA2 = 86400000;
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
    return Math.floor(ts / MS_POR_DIA2);
  }
  function rotuloDia(idxDia) {
    return new Date(idxDia * MS_POR_DIA2).toISOString().slice(0, 10);
  }
  function chaveDia(ts) {
    return rotuloDia(indiceDia(ts));
  }
  function filtrarPorPeriodo(eventos, periodo, agora) {
    const dias = diasDoPeriodo(periodo);
    if (!Number.isFinite(dias))
      return eventos.slice();
    const limite = agora - dias * MS_POR_DIA2;
    return eventos.filter((e) => e.ts >= limite);
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

  // src/app/bridge.ts
  var PipocaCanonico = {
    validarGrafo,
    criarMotor,
    composicao: {
      iniciar,
      bancoDaRodada,
      podeInserir,
      inserir,
      ordenarR1,
      montar,
      abrirProximaRodada,
      convergiu
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
    perfil: { criarPerfil },
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
    ia: {
      montarPrompt,
      PROMPT_BASE,
      criarGuardrails,
      envolverComGuardrails,
      criarProvedorSimulado,
      criarOrquestrador,
      montarProvedorPadrao(grafo) {
        const simulado = criarProvedorSimulado(grafo);
        const guardado = envolverComGuardrails(simulado);
        return criarOrquestrador([guardado]);
      }
    },
    flags: { carregarFlags, killSwitchAtivo, aplicarFlagsAosModos },
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
