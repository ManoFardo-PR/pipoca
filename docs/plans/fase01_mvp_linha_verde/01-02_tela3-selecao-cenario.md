# fase01 · 01-02 · Tela 3 · Seleção de cenário

## Identidade
- id: `fase01-01-02`
- nó(s) da arquitetura: T3
- tela(s) do brief: 3
- classe: mvp

## Objetivo
Entregar a **galeria de ambientes** (vitrine calma): a criança escolhe um cenário ilustrado; a escolha define `HistoriaState.cenarioId`, abre a história e navega para a Tela 4 (ambiente herói).

## Pré-requisitos / Depende de
- `[[fase00-00-05]]` — folha de componentes (cartões/`Botao`).
- `[[fase00-00-07]]` — `Perfil` (PERF) para o header (avatar + nome).
- `[[fase00-00-10]]` — `Economia` (ECON) para o contador de vaga-lumes do header.

## Arquivos afetados
- `src/telas/Tela3SelecaoCenario.dc.html` — **criar** (template + `<script data-dc-script>`).
- `src/telas/cenas.ts` — **criar**: `_scene(key)` extraído do protótipo (SVGs dos 5 ambientes).
- `src/core/estado.ts` — **editar**: escrever `HistoriaState.cenarioId`/`HistoriaState.aberta` e `EstadoApp.tela` (tipos de [[fase00-00-09]], [[fase00-00-06]]).
- **Não** importa motor: a seleção de cenário é anterior ao primeiro `aoAdicionarObjeto`.

## Nomes & variáveis
Origem no protótipo entre parênteses.
- `_scene(key)` → mapa `key → string SVG` para `quintal | quarto | floresta | espaco | fundomar` (protótipo: `_scene`).
- `_inject(el, html)` → injeção de SVG fora de holes (protótipo: `_inject`; [[_contratos/convencoes-dc-runtime]]).
- `envData` → metadados de cada ambiente: `{ key, name, desc, badge }` (protótipo: `envData`).
- `environments` → `envData.map(e => ({ name, desc, badge, sceneRef, pick }))` (protótipo: `environments`).
  - `sceneRef(el)` → `el => this._inject(el, this._scene(e.key))` (protótipo: `environments[].sceneRef`).
  - `pick()` → handler de escolha; **muda** de `()=>this.setState({ env, screen:4 })` para `()=>this.escolherCenario(e.key)` (ver Regras).
- `featuredEnv` → `environments[0]` (cenário em destaque grande) (protótipo: `featuredEnv`).
- `gridEnvs` → `environments.slice(1)` (grade dos demais) (protótipo: `gridEnvs`).
- `childName` → `EstadoApp.perfil?.nome` (protótipo: `childName`).
- `childAvatarRef(el)` → injeta o SVG do avatar do `Perfil` ativo (protótipo: `childAvatarRef`).
- `vagalumes` → `EstadoApp.economia.vagalumes` para o contador do header (protótipo: `fireflies`).
- `abrirAjustesA11y()` → ação canônica do ⚙ ([[_contratos/eventos-acoes]]; protótipo: `openSettings`).
- `escolherCenario(cenarioId: string)` → handler novo: seta `HistoriaState` e navega.
- `irParaTela(n)` → ação canônica de navegação ([[_contratos/eventos-acoes]]; protótipo: `go`/`goN`).

> Nota: o protótipo guardava o cenário em `state.env`. Aqui a fonte de verdade é `HistoriaState.cenarioId` (CORE), não um estado paralelo.

## Interfaces / contratos
- `HistoriaState` (HIST) — [[_contratos/tipos-core]]: escreve `cenarioId` e `aberta`; **zera** `objetos: []` ao iniciar.
- `Perfil` (PERF) — [[_contratos/tipos-core]]: lê `nome`/`avatarId` para o header.
- `Economia` (ECON) — [[_contratos/tipos-core]]: lê `vagalumes` para o contador.
- `EstadoApp` (CORE) — [[_contratos/tipos-core]]: escreve `historia` e `tela`.
- Schema `pipoca.grafo-autoral.v1` — [[_contratos/schemas-json]]: o `cenario.id` escolhido deve casar com o `cenarioId` que o grafo carregado expõe (no MVP, `"quintal_anoitecer"` de `docs/quintal_grafo.json`).
- Ações: `abrirAjustesA11y`, `irParaTela` — [[_contratos/eventos-acoes]].

Assinaturas concretas:
```ts
escolherCenario(cenarioId: string): void;   // seta HistoriaState e vai p/ Tela 4
abrirAjustesA11y(): void;                    // canônica
irParaTela(n: number): void;                 // canônica (n = 4)
```

## Regras de negócio
1. **Escolher cenário define `HistoriaState`**: `escolherCenario(cenarioId)` faz `setState` patcheando `EstadoApp.historia = { cenarioId, objetos: [], aberta: true }` e chama `irParaTela(4)`.
2. **5 cenas SVG**: as `key` válidas são `quintal | quarto | floresta | espaco | fundomar`, injetadas por `sceneRef`/`_inject` (nunca por `{{ }}`). Os `key` da galeria são de UI; o `cenarioId` persistido segue o `id` do grafo (no MVP só `quintal_anoitecer` tem grafo — ver edge-case "cenário sem grafo").
3. **Header sempre presente**: avatar (`childAvatarRef`) + nome (`childName`) + contador de vaga-lumes (`vagalumes`) + botão ⚙ (`abrirAjustesA11y`). É a primeira tela onde a `Economia` fica visível.
4. **Vitrine calma, um foco**: layout em `featuredEnv` (destaque grande) + `gridEnvs` (secundários menores); sem carrossel automático, sem parallax agressivo. Cada cartão é um alvo grande.
5. **Badge "Novo" é informativo**, nunca uma chamada de urgência/FOMO (sem dark patterns — restrição do brief).
6. **`reduceMotion`**: com `EstadoApp.a11y.reduceMotion` ligado, "respiração"/parallax das cenas fica estático (lido em [[fase01-01-13]]).
7. **Premack respeitado**: escolher cenário **não** dá vaga-lumes nem destrava objetos; o mundo só cresce ao ler (Tela 5/6). Aqui só se abre o palco.
8. **Não importa motor**: a seleção é anterior à narrativa; nenhuma chamada a `MotorNarrativa`/`ValidadorOrdem` (lei do seam — [[_contratos/lei-do-contrato]]).

## Passos de implementação
1. Criar `src/telas/cenas.ts` exportando `_scene(key)` (copiado do protótipo, linhas 721–784) para os 5 ambientes.
2. Criar `Tela3SelecaoCenario.dc.html` com:
   - header: `ref="{{ childAvatarRef }}"`, `{{ childName }}`, contador `{{ vagalumes }}`, botão `onClick="{{ abrirAjustesA11y }}"`;
   - destaque: botão `onClick="{{ featuredEnv.pick }}"` com `ref="{{ featuredEnv.sceneRef }}"`;
   - grade: `<sc-for list="{{ gridEnvs }}" as="ev">` com `ref="{{ ev.sceneRef }}"` + `onClick="{{ ev.pick }}"`.
3. Em `renderVals()`, montar `environments` a partir de `envData`, com `sceneRef` via `_inject(_scene(e.key))` e `pick = () => this.escolherCenario(this._cenarioIdDe(e.key))`.
4. Implementar `_cenarioIdDe(key)`: mapeia a `key` de UI para o `cenario.id` do grafo carregado (MVP: `quintal → "quintal_anoitecer"`; demais → fallback ou bloqueio "em breve", ver edge-case).
5. Implementar `escolherCenario(cenarioId)`:
   ```
   this.setState(st => ({ estado: { ...st.estado,
     historia: { cenarioId, objetos: [], aberta: true } } }));
   this.irParaTela(4);
   ```
6. Derivar header de CORE: `childName = estado.perfil?.nome`, `vagalumes = estado.economia.vagalumes`, `childAvatarRef` do `avatarId` do perfil.
7. Aplicar `A11yPrefs` transversal (cena estática se `reduceMotion`) — [[fase01-01-13]].
8. Garantir ausência de `import` de motor.

## Estados / edge-cases
- **Sem perfil ativo** (entrou direto na Tela 3): redirecionar para `[[fase01-01-01]]` (não há de quem mostrar nome/avatar).
- **Cenário sem grafo**: `key` cujo `_cenarioIdDe` não tem grafo carregado → cartão marcado "em breve", `pick` desabilitado (sem erro/X vermelho), nunca seta `HistoriaState`.
- **História já em andamento** (`HistoriaState.aberta` com objetos): escolher um novo cenário **reinicia** a história (`objetos: []`); mostrar confirmação calma antes de descartar progresso (sem punir).
- **`reduceMotion`**: cenas estáticas.
- **Economia zerada** (`vagalumes === 0`): contador mostra 0 normalmente; não impede escolher cenário (ler é grátis).
- **Lista vazia de ambientes** (config futura): mostrar só o destaque ou um convite calmo.

## Critérios de aceitação / verificação
- [ ] Escolher um cenário seta `EstadoApp.historia.cenarioId` ao `id` correto e `historia.objetos === []`, `historia.aberta === true`, e leva a `EstadoApp.tela === 4`.
- [ ] No MVP, escolher "Quintal" resulta em `cenarioId === "quintal_anoitecer"` (casa com `docs/quintal_grafo.json`).
- [ ] Header mostra avatar + nome do `Perfil` ativo e `Economia.vagalumes`.
- [ ] ⚙ chama `abrirAjustesA11y()`.
- [ ] As 5 cenas são injetadas via `ref`/`_inject`, nunca por `{{ }}`.
- [ ] Com `reduceMotion`, nenhuma animação/parallax roda.
- [ ] Cenário sem grafo não é selecionável e não corrompe `HistoriaState`.
- [ ] `grep`: zero ocorrências de `MotorNarrativa`/`MotorGrafoAutoral`/`MotorIA`/`ValidadorOrdem`.

## Relações com outros docs
- Depende de: `[[fase00-00-05]]`, `[[fase00-00-07]]`, `[[fase00-00-10]]`
- Consome (sem ser dono): PERF ([[fase00-00-07]]), ECON ([[fase00-00-10]]), HIST ([[fase00-00-09]]), CORE ([[fase00-00-06]]).
- É precedido por: `[[fase01-01-01]]` (recebe `Perfil` ativo).
- É consumido por: `[[fase01-01-03]]` (Tela 4 lê `HistoriaState.cenarioId`).
- Aplica A11y: `[[fase01-01-13]]`; abre painel A11y dono: `[[fase01-01-12]]`.
