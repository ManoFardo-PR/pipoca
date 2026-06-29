# fase00 · 00-01 · Estrutura do repositório e build

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — Pastas `src/{telas,componentes,core,motores,servicos,dados}/` criadas; `tsconfig.json` (resolveJsonModule+esModuleInterop), `index.html`, `server.js`, scripts `build`/`serve`/`test`. `tsc --noEmit` limpo. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> Doc de planejamento. Segue o gabarito de [[_TEMPLATE]]. Idioma: PT-BR. Não muda comportamento — só
> organiza pastas, build e convenções de arquivo para todas as fases seguintes.

## Identidade
- id: `fase00-00-01`
- nó(s) da arquitetura: —
- tela(s) do brief: —
- classe: —

## Objetivo
Definir a árvore de pastas, o pipeline de build do `support.js` (dc-runtime) e o `tsconfig` que sustentam todo
o resto do projeto, sem alterar nenhum comportamento do protótipo.

## Pré-requisitos / Depende de
— (nenhuma; é o doc-raiz da fase00)

## Arquivos afetados
- `src/telas/` (criar) — uma `.dc.html` por tela (T2–T7, painéis).
- `src/componentes/` (criar) — folha de componentes reutilizáveis (ver [[fase00-00-04]]).
- `src/core/` (criar) — estado e regras puras de TS (`EstadoApp`, PERF/SESS/HIST/ECON/MODES).
- `src/motores/` (criar) — abriga o motor; mover `motor_a.ts` da raiz para `src/motores/motor_a.ts`.
- `src/servicos/` (criar) — abstrações de serviço (TTS, ASR, persistência, IA — só seams nesta fase).
- `src/dados/` (criar) — conteúdo autoral; mover `docs/quintal_grafo.json` → `src/dados/quintal_grafo.json`.
- `tsconfig.json` (criar/editar) — `resolveJsonModule` + `esModuleInterop`.
- `index.html` (criar) — casca de entrada do PWA que carrega `support.js` e a tela inicial.
- `support.js` (gerado — **não editar**; produzido por `cd dc-runtime && bun run build`).
- `package.json` (editar) — scripts `build` e `serve`.

## Nomes & variáveis
- `src/motores/motor_a.ts` — o atual `motor_a.ts` (exporta `MotorGrafoAutoral`, `jogar`, e os tipos congelados
  de [[_contratos/tipos-core]]).
- `src/dados/quintal_grafo.json` — o atual `docs/quintal_grafo.json` (`pipoca.grafo-autoral.v1`).
- `support.js` — runtime dc gerado (consumido por `index.html`), nunca editado à mão.
- Scripts npm: `build` (gera o runtime), `serve` (sobe o PWA local online-first).
- Não há identificadores de estado novos aqui — só caminhos e configuração.

## Interfaces / contratos
- Nenhum tipo novo. Reposiciona os tipos congelados de [[_contratos/tipos-core]] (que vivem em
  `src/motores/motor_a.ts`) e o schema `pipoca.grafo-autoral.v1` de [[_contratos/schemas-json]] (em
  `src/dados/quintal_grafo.json`).
- `tsconfig.json` precisa de `"resolveJsonModule": true` e `"esModuleInterop": true` — exigência direta do
  demo de `motor_a.ts`, que faz `import grafo from "./quintal_grafo.json"`.

## Regras de negócio
1. **support.js é gerado, nunca editado.** Qualquer mudança de runtime é feita no projeto `dc-runtime/` e
   regenerada com `cd dc-runtime && bun run build`. Editar `support.js` à mão é proibido.
2. **`resolveJsonModule` + `esModuleInterop` obrigatórios** no `tsconfig.json`: sem eles, o import do grafo no
   `motor_a.ts` (`import grafo from "./quintal_grafo.json"; new MotorGrafoAutoral(grafo as GrafoAutoral)`)
   não compila.
3. **PWA online-first.** Nesta fase não há service worker/offline: o app é servido por HTTP estático
   (`serve`). Offline/instalação ficam para fase posterior; aqui só garantimos que carrega online.
4. **Uma pasta = uma responsabilidade.** Telas em `src/telas/`, UI reutilizável em `src/componentes/`, lógica
   pura em `src/core/`, motor em `src/motores/`, serviços (seams) em `src/servicos/`, conteúdo em `src/dados/`.
5. **Convenção de nomes de arquivo:** `.dc.html` em `PascalCase` (ex.: `Tela4Heroi.dc.html`, `Botao.dc.html`);
   módulos TS em `kebab-case` ou nome-do-tipo (`historia.ts`, `economia.ts`, `motor_a.ts`); JSON de conteúdo em
   `snake_case` (`quintal_grafo.json`).
6. **Sem mudança de comportamento.** Este passo apenas move/organiza arquivos; o protótipo continua rodando
   igual. Refatorações de lógica acontecem nos docs seguintes (00-05 em diante).

## Passos de implementação
1. Criar as pastas `src/telas/`, `src/componentes/`, `src/core/`, `src/motores/`, `src/servicos/`, `src/dados/`.
2. Mover `motor_a.ts` (raiz) → `src/motores/motor_a.ts`; ajustar o comentário do demo para o novo caminho do
   import (`../dados/quintal_grafo.json`).
3. Mover `docs/quintal_grafo.json` → `src/dados/quintal_grafo.json` (o `_contratos/schemas-json` aponta para a
   localização canônica; atualizar referências quando necessário, sem mutar o `.v1`).
4. Criar `tsconfig.json` com `target` moderno (ES2020+), `module` ESNext, `moduleResolution` Bundler/Node,
   `strict: true`, `resolveJsonModule: true`, `esModuleInterop: true`, `include: ["src/**/*"]`.
5. Garantir o pipeline de build: `cd dc-runtime && bun run build` gera `support.js` na raiz servida.
6. Criar `index.html` que: injeta `<link>`/`helmet` de fontes, carrega `support.js`, e monta a tela inicial via
   `EstadoApp.tela` (ver [[fase00-00-05]] e [[fase00-00-06]]).
7. Adicionar scripts `build` e `serve` ao `package.json`; documentar o comando online-first no README.
8. Validar que o demo do motor compila e roda com os novos caminhos (`jogar(...)`).

## Estados / edge-cases
- **support.js ausente:** `index.html` não monta nada → o build (`bun run build`) precisa rodar antes de servir.
- **Import de JSON falha:** quase sempre `tsconfig` sem `resolveJsonModule`/`esModuleInterop` — checar a regra 2.
- **Caminho antigo referenciado:** algum doc/import ainda aponta para `motor_a.ts`/`docs/quintal_grafo.json` na
  raiz → corrigir para `src/motores/` e `src/dados/`.
- **Sem rede (online-first):** nesta fase o app não funciona offline; é um não-objetivo conhecido, não um bug.

## Critérios de aceitação / verificação
- [ ] As 6 pastas existem com os arquivos nos lugares descritos.
- [ ] `cd dc-runtime && bun run build` gera `support.js` sem erro.
- [ ] `tsc --noEmit` passa com `resolveJsonModule` + `esModuleInterop` ligados.
- [ ] O demo `jogar(motor, ["vagalume","frasco","vento"], "convergente", "n3")` roda a partir de
      `src/motores/motor_a.ts` importando `../dados/quintal_grafo.json`.
- [ ] `serve` sobe o PWA e `index.html` carrega `support.js` sem 404.
- [ ] Nenhum comportamento visível do protótipo mudou.

## Relações com outros docs
- Depende de: — (raiz da fase00)
- É consumido por: `[[fase00-00-02]]` (convenções dc-runtime), `[[fase00-00-03]]` (tokens),
  `[[fase00-00-05]]` (app shell), `[[fase00-00-06]]` (modelo de estado), `[[fase00-00-07]]` (PERF) e todos os
  docs que tocam arquivos `src/`.
- Contratos: `[[_contratos/convencoes-dc-runtime]]`, `[[_contratos/tipos-core]]`, `[[_contratos/schemas-json]]`.
