# Contrato · Tipos TypeScript canônicos

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — Congelados em `src/core/grafo/tipos.ts` e `src/motores/contrato.ts`; CORE em `src/core/estado.ts` + módulos. Nota: ✅ Marco 1 — `Economia` conformada a `{vagalumes,poupado}`. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> **Fonte da verdade dos tipos.** Todo doc de sub-passo que cita um tipo em "## Interfaces / contratos"
> deve usar **exatamente** estes nomes. Nada de renomear, traduzir ou pluralizar. Quando um tipo novo
> for necessário, ele nasce num doc da `fase00` e é adicionado aqui.

Os tipos abaixo se dividem em dois blocos:
- **Congelados** — já existem em [motor_a.ts](../../../motor_a.ts) e **não podem mudar de nome nem de forma**.
- **CORE (novos)** — introduzidos na `fase00` e usados de forma idêntica em todas as fases.

---

## 1. Tipos congelados (de `motor_a.ts` — não renomear)

```ts
// --- níveis e modos ---
export type Nivel = "n1" | "n2" | "n3" | "n4";
export type ModoDesfecho = "convergente" | "aberto";
export type PapelNoFim = "nucleo" | "chave" | "neutro";

// --- grafo autoral (espelha pipoca.grafo-autoral.v1) ---
export interface Fragmento4 { n1: string; n2: string; n3: string; n4: string; }
export interface Regra { se: string; entao: Fragmento4; }        // se: "tem:ID" | "nao_tem:ID"

export interface Objeto {
  id: string;
  emoji: string;
  nome: string;
  papel_no_fim: PapelNoFim;
  gatilho: Fragmento4;        // texto padrão ao adicionar o objeto
  regras: Regra[];            // variações que dependem do estado da história
}

export interface DesfechoAberto { se_terminou_com: string; fragmento: Fragmento4; }

export interface Cenario {
  id: string;
  nome: string;
  personagem: string;
  paleta: string;
  abertura: Fragmento4;
  objetos: Objeto[];
  desfechos: { convergente: Fragmento4; aberto: DesfechoAberto[] };
}

export interface GrafoAutoral {
  esquema: string;                       // "pipoca.grafo-autoral.v1"
  niveis: Record<Nivel, string>;
  regra_de_ouro: string;
  cenario: Cenario;
}

// --- o que o motor devolve para a tela (puro: nada de estado, nada de UI) ---
export interface Trecho {
  texto: string;
  ehFinal: boolean;
  objetoId?: string;
}

// --- O Contrato de Narrativa (eixo 1 / nó CN) ---
// `historia` = ids dos objetos já colocados, EM ORDEM. O estado vive na app (CORE),
// não no motor — o motor é função pura do grafo.
export interface MotorNarrativa {
  abertura(nivel: Nivel): Trecho;
  aoAdicionarObjeto(historia: string[], objetoId: string, nivel: Nivel): Trecho;
  desfecho(historia: string[], modo: ModoDesfecho, nivel: Nivel): Trecho;
}
```

> A classe `MotorGrafoAutoral implements MotorNarrativa` também já existe (nó **MA**). Telas **nunca**
> a importam — ver [[lei-do-contrato]].

---

## 2. Tipos CORE (novos — nascem na fase00)

```ts
// --- preferências, perfis, sessão ---
export type Verificacao = "cuidador" | "auto" | "fala";
export type VariantePalco = "Palco" | "Ateliê";

export interface A11yPrefs {
  textScale: 1 | 1.2 | 1.45;
  dyslexia: boolean;     // fonte Atkinson Hyperlegible
  syllable: boolean;     // destaque silábico: va·ga·lu·me
  contrast: boolean;     // alto contraste
  reduceMotion: boolean; // OBRIGATÓRIO pelo brief (sensibilidade vestibular)
}

export interface Perfil {
  id: string;
  nome: string;          // nome ou apelido
  idade: number;         // 3..12
  nivel: Nivel;
  avatarId: string;      // ex.: "pingo" | "fubá" | "cacau" | "lua" | "tuca"
}

export interface Sessao {
  perfilId: string;
  blocoMin: 10 | 15 | 20 | 25;   // bloco de foco (Pomodoro)
  iniciadaEm: number;            // epoch ms
  restanteSeg: number;
}

// --- a história (a única fonte de verdade, EM ORDEM) ---
export interface HistoriaState {
  cenarioId: string;
  objetos: string[];     // ids dos objetos commitados, EM ORDEM → vira o arg `historia` do MotorNarrativa
  aberta: boolean;       // true enquanto não chegou ao desfecho
}

// --- economia de vaga-lumes (2/3 gastar · 1/3 poupar) ---
export interface Economia {
  vagalumes: number;     // saldo disponível
  poupado: number;       // separado para "o sonho maior"
}

// --- modos governados pelo Controle Parental (MODES) ---
export interface Modos {
  palco: VariantePalco;          // Palco (imersivo) | Ateliê (estruturado)
  desfecho: ModoDesfecho;        // convergente | aberto
  verificacao: Verificacao;      // cuidador | auto | fala
  iaLigada: boolean;             // PC_AI autoriza Motor B p/ a criança (false no MVP)
}

// --- o estado raiz da app ---
export interface EstadoApp {
  tela: number;                  // tela atual (1..8 / rota)
  perfil: Perfil | null;
  sessao: Sessao | null;
  historia: HistoriaState;
  economia: Economia;
  modos: Modos;
  a11y: A11yPrefs;
}

// --- suporte ao QUEBRA-CABEÇA da tira (ver [[../fase00/00-20_RECONCILIACAO-mecanica-tira]]) ---
// Mantém o puzzle de ordenação, mas a ordem certa SAI DO GRAFO, não de um array fixo.
export interface ValidadorOrdem {
  ordemCanonica(): string[];                                  // ids na ordem autoral (ou topológica)
  validar(ordemJogador: string[]): { ok: boolean; dica?: string };
}

// --- serviços (abstrações, não implementações) ---
export interface ServicoTTS {
  falar(texto: string, opts?: { lang?: string; rate?: number; pitch?: number }): void;
}

export interface ResultadoFala { participou: boolean; confianca: number; }
export interface ServicoASR {
  ouvir(opts?: { lang?: string; alvo?: string }): Promise<ResultadoFala>;
}

// --- persistência / LGPD (seam) ---
export interface RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]>;
  salvarPerfil(p: Perfil): Promise<void>;
  carregarSave(perfilId: string): Promise<EstadoApp | null>;
  salvarSave(perfilId: string, estado: EstadoApp): Promise<void>;
  registrarTelemetria(evento: EventoTelemetria): Promise<void>;
  apagarPerfil(perfilId: string): Promise<void>;   // LGPD: remove perfil + save + telemetria
}

// --- IA (eixo 2 / Fase 2) ---
export interface ProvedorIA {
  gerar(prompt: string, schema: object, opts?: object): Promise<Trecho>;
}
```

`EventoTelemetria` é definido em [[schemas-json]] (`pipoca.telemetria.v1`) e usado por
[[../fase03/03-01_telemetria-TELE]].

---

## 2.1 Backend trocável (fase06 — Supabase | Firebase)

Mesmo padrão **seam + adaptador** dos motores e do provedor de IA: a app fala com estes contratos; os SDKs
(Supabase/Firebase) ficam **só** nos adaptadores (`BackendSupabase`/`BackendFirebase`). Trocar de BaaS = trocar o
adaptador, sem mudar tela/CORE. Ver a *lei do backend* em [[lei-do-contrato]].

```ts
export interface SessaoAuth { uid: string; tipo: "familia" | "superadmin"; tenantId?: string; }

export interface ServicoAuth {                       // mesmo seam p/ família e super admin
  entrarFamilia(cred: object): Promise<SessaoAuth>;
  entrarSuperAdmin(cred: object): Promise<SessaoAuth>;
  sair(): Promise<void>;
  sessaoAtual(): SessaoAuth | null;
}

export interface ProxyIA {                           // server-side; chaves NUNCA no cliente
  gerar(req: { prompt: string; schema: object; opts?: object }): Promise<Trecho>;
}

export interface Backend {                            // fachada trocável; consumida pela app
  auth: ServicoAuth;
  repo: RepositorioPersistencia;
  proxyIA: ProxyIA;
}
```

Schema multi-tenant `pipoca.tenant.v1` (tenant/plano/limites) em [[schemas-json]]. Em produção, `ProvedorIA`
([[../fase05/05-04_provedor-ia-AIPROV]]) chama `ProxyIA`, não o SDK do LLM direto.

---

## 3. Mapa tipo → nó da arquitetura → doc dono

| Tipo | Nó | Doc dono |
|------|----|----------|
| `MotorNarrativa`, `Trecho` | CN | [[../fase00/00-16_contrato-MotorNarrativa]] |
| `MotorGrafoAutoral` | MA | [[../fase00/00-17_motor-A-grafo-autoral]] |
| `GrafoAutoral`, `Cenario`, `Objeto`, `Fragmento4`, `Regra`, `DesfechoAberto`, `PapelNoFim` | GRAPH | [[../fase00/00-13_schema-grafo]] |
| `Nivel` | LEVELS | [[../fase00/00-15_modelo-niveis-LEVELS]] |
| `Perfil` | PERF | [[../fase00/00-07_perfil-PERF]] |
| `Sessao` | SESS | [[../fase00/00-08_sessao-bloco-foco-SESS]] |
| `HistoriaState` | HIST | [[../fase00/00-09_historia-HIST]] |
| `Economia` | ECON | [[../fase00/00-10_economia-ECON]] |
| `Modos`, `VariantePalco`, `Verificacao`, `ModoDesfecho` | MODES | [[../fase00/00-11_modos-MODES]] |
| `A11yPrefs` | A11Y | [[../fase01/01-12_a11y-painel-do-meu-jeito]] |
| `EstadoApp` | CORE | [[../fase00/00-06_modelo-estado-core]] |
| `ValidadorOrdem` | (puzzle) | [[../fase00/00-18_validador-de-ordem]] |
| `RepositorioPersistencia` | SAVE | [[../fase00/00-12_persistencia-seam-SAVE]] |
| `ServicoTTS` | TTS | [[../fase01/01-09_servico-TTS]] |
| `ServicoASR`, `ResultadoFala` | ASR | [[../fase05/05-09_asr-modo-fala-ASR]] |
| `ProvedorIA` | AIPROV | [[../fase05/05-04_provedor-ia-AIPROV]] |
| `EventoTelemetria` | TELE | [[../fase03/03-01_telemetria-TELE]] |
| `Backend` | — | [[../fase06/06-01_seam-backend-e-portabilidade]] |
| `ServicoAuth`, `SessaoAuth` | (HH_LOGIN/SA_LOGIN) | [[../fase06/06-02_auth-servico-e-adaptadores]] |
| `ProxyIA` | — | [[../fase06/06-05_proxy-de-ia-server-side]] |
