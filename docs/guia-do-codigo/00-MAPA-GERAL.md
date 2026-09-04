# Mapa geral do código do Pipoca

> Porta de entrada para ler o Pipoca **sem internet e sem lembrar dos detalhes**.
> Aqui você acha qualquer script, sabe o que ele faz e como rodá-lo. Cada família
> tem um guia próprio (links no fim). Termos em _itálico_ estão no
> [glossário](90-GLOSSARIO.md).

O Pipoca é um app PT-BR de leitura infantil: a criança **combina objetos** numa
cena e a **história nasce do arranjo** dela. A história é a recompensa — cada
leitura no _portão_ destrava a próxima rodada. O texto pode ser tecido de duas
formas: por um motor determinístico no próprio dispositivo (Motor A+ v3) ou por
um LLM (a "geração 2"), sempre com uma rede de segurança que garante texto fiel.

---

## As 6 famílias de scripts (e onde moram na árvore)

| Família | Onde mora | O que é |
|---|---|---|
| **core-lógica** | [`src/core/`](../../src/core/) (+ [`src/dados/`](../../src/dados/), [`src/ia/`](../../src/ia/), [`src/servicos/`](../../src/servicos/)) | O cérebro puro: compositor, realizador, validador, fallback, modelo de estado, economia de vaga-lumes, portão, perfis. Testável sem rede. |
| **app / telas** | [`src/app/`](../../src/app/), [`src/telas/`](../../src/telas/), [`src/componentes/`](../../src/componentes/) | A interface da criança/cuidador: a ponte que expõe o core ao navegador e as telas `.dc.html`. |
| **admin** | [`src/admin/`](../../src/admin/) | A plataforma do operador (super-admin): rotas SA_*, login, _tenants_, config de IA, flags globais. |
| **backend / edge** | [`src/backend/`](../../src/backend/) + [`functions/`](../../functions/) | Os clientes **keyless** das Edge Functions e as **2 edges** (Supabase/Deno) onde a chave paga vive. |
| **testes (e2e + fumaça)** | [`tests/`](../../tests/) + `*.test.ts` espalhados | Testes unitários (offline), runners e2e (Playwright, offline) e a fumaça de presença. |
| **scripts** | [`scripts/`](../../scripts/) | O smoke de produção (gasta API paga), o monitor do Plan03 e o hook de merge. |

Fora dessas famílias, na raiz: [`server.js`](../../server.js) (servidor
estático que serve `/app` e `/admin` e resolve os `.dc.html`),
[`support.js`](../../support.js) (runtime do dc-runtime),
[`pipoca.config.js`](../../pipoca.config.js) (config pública do backend — **sem
segredo**), e os bundles gerados [`pipoca.bundle.js`](../../pipoca.bundle.js) /
[`pipoca.admin.bundle.js`](../../pipoca.admin.bundle.js). [`docs/plans/`](../plans/) e
[`docs/plans02/`](../plans02/) são as trilhas de planejamento com os "selos" de status;
[`docs/notas/`](../notas/) guarda as notas de arquitetura (ex-`.agents/memory`, D5).

---

## Princípio de isolamento (a bússola)

> **Quanto mais perto de [`src/core/`](../../src/core/), mais PURO e testável.
> Quanto mais longe, mais perto de rede / chave / dinheiro / DOM.**

- [`src/core/`](../../src/core/) — funções puras, determinísticas, sem estado de
  módulo. Rodam offline nos testes. É onde a verdade do produto vive.
- [`src/ia/`](../../src/ia/), [`src/backend/`](../../src/backend/) — falam com o
  mundo, mas **keyless**: mandam só o bearer do usuário + a anon key pública.
- [`functions/`](../../functions/) — as edges. **Só aqui vive a chave paga**
  (secrets do ambiente Deno). "Zero chave em `src/`".
- [`scripts/`](../../scripts/) — fora do runtime do app; o smoke de produção
  **gasta API paga** de verdade (ver [60 · scripts](60-scripts.md)).
- `.dc.html` (telas/componentes) — o DOM. Descritos nos guias, sem cabeçalho.

---

## "Quero fazer X → rodo Y" (comandos reais do `package.json`)

| Quero… | Rodo | Observação |
|---|---|---|
| Rodar **todos os testes** (unit + fumaça) | `bun run test` | 10 suítes encadeadas, tudo offline |
| Testar **sem rede** (só presença) | `bun run test:presenca` | fumaça determinística, sem custo |
| Conferir os **tipos** | `bun run typecheck` | = `bun x tsc --noEmit` |
| Rodar o **fluxo e2e** canônico | `bun run test:e2e:canonico` | Playwright, backend `local` |
| e2e do **admin** | `bun run test:e2e:admin` | offline |
| e2e da **geração 2** (realizador) | `bun run test:e2e:geracao2` | realizador FAKE, offline |
| e2e de **reordenar o miolo** | `bun run test:e2e:reordenar` | offline |
| **Gerar história real / smoke** (edge de produção) | `node scripts/smoke-realizador.mjs` (env `SUPA_URL`/`ANON_KEY`/`SMOKE_EMAIL`) | ⚠️ **GASTA API paga** — bate na edge real |
| **Buildar** o bundle da criança | `bun run build:app` | → `pipoca.bundle.js` |
| **Buildar** o bundle do admin | `bun run build:admin` | → `pipoca.admin.bundle.js` |
| **Buildar** o dc-runtime | `bun run build` | `cd dc-runtime && bun run build` |
| **Subir local** | `bun run serve` | = `node server.js` (porta 5000) |

> Não existem scripts `smoke` nem `dev` no `package.json`: o smoke roda à mão
> (comando acima) e o "subir local" é `serve`. Os `test:e2e:*` chamam `node` por
> baixo; o resto usa `bun`.

---

## O fluxo de uma história (diagrama)

```
   perfil da criança  ......................  src/core/perfil.ts
        │
        ▼
   COMPOR (determinístico, sem RNG)  .......  src/core/compositor/compor.ts
   fichas ─────────────►  PACOTE DE COMPOSIÇÃO   src/core/compositor/pacote.ts
        │                     (matéria resolvida no nível)
        │
        ▼   rota por nível: "realizador" ou "ap_cru"   src/core/geracao/geracao.ts
   ┌─────────────────────────────────────────────┐
   │  REALIZAR (LLM)  .....  src/core/realizador/realizar.ts
   │      │  prompt 100% derivado do Pacote  ...  .../prompt_template.ts
   │      ▼
   │  CASCATA de provedores  ..............  src/core/realizador/cascata.ts
   │      │   (em produção roda INTEIRA na edge: functions/realizador/)
   │      ▼
   │  VALIDADOR de fidelidade  ............  src/core/realizador/validador.ts
   │      │  → VEREDITO { pass, motivos }
   │      ├── PASS ─────────────► texto (origem = "llm")
   │      └── FAIL / esgotado ──┐
   └────────────────────────────┼────────────────┐
                                 ▼                 │
                    FALLBACK A+ v3  ...............│..  src/core/composicao.ts:montar
                    (no dispositivo, sempre fiel)  │    (origem = "fallback-a-mais")
                                 │                 │
        ┌────────────────────────┴─────────────────┘
        ▼
   resultado (texto + ORIGEM sempre sinalizada)
        │
        ▼
   EXIBIR no leitor / SALVAR  ..............  src/core/historias.ts · src/telas/LeitorHistoria.dc.html
```

Leituras da imagem:
- **compor** decide e arranja (não escreve prosa); **realizar** escreve a prosa.
- O _validador_ nunca deixa texto infiel chegar à criança: reprovou → próximo da
  _cascata_ → esgotou → _fallback_ A+ v3 no dispositivo.
- A **origem** ("llm" vs "fallback-a-mais") viaja sempre junto — o app sabe de
  onde o texto veio.
- A _prévia_ do portão é sempre determinística (Motor A+ v3), mostrada enquanto o
  texto realizado (LLM) corre em paralelo.

---

## Guias por família

- [10 · core-lógica](10-core.md) — o cérebro puro (compositor, realizador, fallback, estado)
- [20 · app e telas](20-app-e-telas.md) — a interface da criança/cuidador
- [30 · admin](30-admin.md) — a plataforma do operador
- [40 · backend e edge](40-backend-e-edge.md) — clientes keyless + as 3 edges + a fronteira da chave
- [50 · testes](50-testes.md) — unit, e2e e fumaça
- [60 · scripts](60-scripts.md) — o que gasta API paga e o que é offline
- [70 · como adicionar um cenário](70-como-adicionar-um-cenario.md) — pipeline de autoria (JSON + SVG → lints → galeria)
- [90 · glossário](90-GLOSSARIO.md) — os termos canônicos numa linha cada
