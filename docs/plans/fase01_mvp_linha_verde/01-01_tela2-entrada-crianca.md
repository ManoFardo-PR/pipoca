# fase01 · 01-01 · Tela 2 · Entrada da criança

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `src/telas/Tela2EntradaCrianca.dc.html` + `index.html` (T2 inline): seleção por avatar; sem motor. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase01-01-01`
- nó(s) da arquitetura: T2
- tela(s) do brief: 2
- classe: mvp

## Objetivo
Entregar a tela de **login visual sem senha** ("Quem vai ler hoje?"): a criança escolhe um avatar, isso define o `Perfil` ativo no `EstadoApp` e navega para a Tela 3 (seleção de cenário); um botão discreto leva o adulto ao portão parental.

## Pré-requisitos / Depende de
- `[[fase00-00-06]]` — modelo de estado raiz (`EstadoApp`, `EstadoApp.perfil`).
- `[[fase00-00-07]]` — `Perfil` (PERF) e `RepositorioPersistencia.carregarPerfis`.
- `[[fase00-00-05]]` — folha de componentes (`Botao.dc.html`).

## Arquivos afetados
- `src/telas/Tela2EntradaCrianca.dc.html` — **criar** (template `<x-dc>` + `<script data-dc-script>` com `class Component extends DCLogic`).
- `src/core/estado.ts` — **editar**: ler/escrever `EstadoApp.perfil` e `EstadoApp.tela` (sem novos tipos; o tipo é de [[fase00-00-06]]).
- `src/telas/avatares.ts` — **criar**: `_avatarDefs()` e `_avatarSVG(d)` extraídos do protótipo (subárvore SVG fora dos holes).
- **Não** importa nenhum motor (sem `MotorNarrativa`, sem `ValidadorOrdem`): esta tela é pré-história.

## Nomes & variáveis
Origem no protótipo entre parênteses.
- `_avatarDefs()` → array de `{ id, name, bg, ear, fur }` (protótipo: `_avatarDefs`). Os `id` são os `avatarId` canônicos: `"pingo" | "fubá" | "cacau" | "lua" | "tuca"` (ver `Perfil.avatarId` em [[_contratos/tipos-core]]).
- `_avatarSVG(d)` → string SVG do avatar (protótipo: `_avatarSVG`).
- `_inject(el, html)` → injeta SVG numa subárvore imperativa, fora de `{{ }}` (protótipo: `_inject`; ver [[_contratos/convencoes-dc-runtime]]).
- `avatars` (hole de lista) → `_avatarDefs().map(d => ({ name, pick, svgRef, ring }))` (protótipo: `avatars`).
  - `svgRef(el)` → ref que chama `this._inject(el, this._avatarSVG(d))` (protótipo: `avatars[].svgRef`).
  - `pick()` → handler de seleção; **muda** de `()=>this.go(3)` para `()=>this.selecionarAvatar(d.id)` (ver Regras).
  - `ring` → estilo do anel do alvo de toque (protótipo: `avatars[].ring`).
- `selecionarAvatar(avatarId: string)` → handler novo desta tela: resolve `Perfil`, seta `EstadoApp.perfil` e chama `irParaTela(3)`.
- `irParaTela(n)` → ação canônica de navegação ([[_contratos/eventos-acoes]]; protótipo: `go`).
- `abrirPortaoParental()` → ação canônica do botão "Sou o cuidador" ([[_contratos/eventos-acoes]]; protótipo: `backToOnboarding`, que era atalho direto).
- `childName` → derivado de `EstadoApp.perfil?.nome` para o cumprimento (protótipo: `childName`).
- Estado local: `perfis: Perfil[]` (carregado de `RepositorioPersistencia.carregarPerfis()`); `carregando: boolean`.

## Interfaces / contratos
- `Perfil` (PERF) — [[_contratos/tipos-core]]: `{ id, nome, idade, nivel, avatarId }`. Esta tela só **lê** perfis e **seta** o ativo.
- `EstadoApp` (CORE) — [[_contratos/tipos-core]]: escreve `EstadoApp.perfil` e `EstadoApp.tela`.
- `RepositorioPersistencia.carregarPerfis(): Promise<Perfil[]>` — [[_contratos/tipos-core]] (SAVE).
- Schema `pipoca.perfil.v1` — [[_contratos/schemas-json]] (forma persistida do `Perfil`).
- Ações: `irParaTela`, `abrirPortaoParental` — [[_contratos/eventos-acoes]].
- Convenções de runtime/SVG-fora-do-template — [[_contratos/convencoes-dc-runtime]].

Assinaturas concretas desta tela:
```ts
selecionarAvatar(avatarId: string): void;   // resolve Perfil, seta ativo, navega p/ Tela 3
irParaTela(n: number): void;                 // canônica (n = 3)
abrirPortaoParental(): void;                 // canônica → dispara PINGATE (fase02)
```

## Regras de negócio
1. **Login visual, nunca senha digitada**: o único caminho da criança para dentro é tocar um avatar. Sem teclado, sem PIN nesta tela.
2. **Selecionar avatar define o `Perfil` ativo**: `selecionarAvatar(avatarId)` busca em `perfis` o `Perfil` cujo `avatarId === avatarId`; em sucesso, `setState` patcheia `EstadoApp.perfil = perfilEncontrado` e chama `irParaTela(3)`.
3. **Mapa avatar → perfil**: se houver mais de um perfil com o mesmo `avatarId` (improvável no MVP), vence o primeiro de `carregarPerfis()`; se nenhum perfil casar, ver edge-case "avatar sem perfil".
4. **"Sou o cuidador" é a única ponte para o adulto**: o botão chama `abrirPortaoParental()`, que dispara o PINGATE de `[[fase02-02-03]]`. Esta tela **não** valida PIN nem mostra área parental — só abre o portão.
5. **Alvos grandes**: cada avatar é um alvo de toque de ≥ 140×140 px (`ring`), com espaçamento generoso (princípio do brief: à prova de mãos pequenas).
6. **Calmo, um foco**: a tela tem um único foco — a pergunta "Quem vai ler hoje?" e a fileira de avatares. Sem badges, contadores ou distrações (o contador de vaga-lumes só aparece a partir da Tela 3).
7. **Nunca condescendente / nunca clínico**: cumprimento caloroso, sem linguagem de "cadastro/usuário"; os avatares são personagens (Pingo, Fubá…), não fotos de cadastro.
8. **`reduceMotion`**: se `EstadoApp.a11y.reduceMotion` (lido em [[fase01-01-13]]), a transição/entrada dos avatares não anima (sem `transition` no `ring`).
9. **Sem persistência de história aqui**: nenhuma escrita em `HistoriaState`; selecionar avatar **não** abre história (isso é Tela 3+).

## Passos de implementação
1. Criar `src/telas/avatares.ts` exportando `_avatarDefs()` e `_avatarSVG(d)` (copiados do protótipo, linhas 683–709), com os `id` canônicos de `avatarId`.
2. Criar `Tela2EntradaCrianca.dc.html` com template: título "Quem vai ler hoje?", `<sc-for list="{{ avatars }}" as="av">` renderizando cada avatar com `ref="{{ av.svgRef }}"` e `onClick="{{ av.pick }}"`; botão "⚙ Sou o cuidador" com `onClick="{{ abrirPortaoParental }}"`.
3. No `componentDidMount()`: `this.setState({ carregando: true })`; `const perfis = await repo.carregarPerfis()`; `this.setState({ perfis, carregando: false })`.
4. Implementar `selecionarAvatar(avatarId)`:
   ```
   const p = this.state.perfis.find(x => x.avatarId === avatarId);
   if (!p) return this._semPerfil(avatarId);   // edge-case
   this.setState(st => ({ estado: { ...st.estado, perfil: p } }));
   this.irParaTela(3);
   ```
5. Em `renderVals()`, montar `avatars = _avatarDefs().map(d => ({ name: d.name, svgRef: el => this._inject(el, this._avatarSVG(d)), pick: () => this.selecionarAvatar(d.id), ring }))`.
6. Mapear `irParaTela(3)` para a navegação (patch `EstadoApp.tela = 3`) e `abrirPortaoParental()` para o disparo do PINGATE (stub que chama o nó de [[fase02-02-03]] quando existir; no MVP isolado, navega para a Tela 1 de onboarding).
7. Aplicar `A11yPrefs` transversal (fonte/contraste/`reduceMotion`) conforme [[fase01-01-13]].
8. Verificar que **nenhum** `import` de motor entra neste arquivo (lei do seam — embora T2 nem use motor).

## Estados / edge-cases
- **Vazio (sem perfis)**: `carregarPerfis()` retorna `[]` → exibir convite calmo "Peça pra um cuidador criar seu perfil" + botão "Sou o cuidador"; nenhum avatar selecionável.
- **Carregando**: enquanto `carregando`, mostrar avatares como placeholders suaves (sem spinner agressivo); nenhum toque dispara navegação.
- **Avatar sem perfil correspondente**: `selecionarAvatar` não encontra `Perfil` → não navega; mensagem acolhedora "Ainda não tem um perfil aqui" (nunca erro/X vermelho).
- **Múltiplos perfis**: rolagem horizontal calma; ainda um foco por toque.
- **`reduceMotion` ligado**: sem animação de entrada/parallax.
- **Toque acidental no "Sou o cuidador"**: leva ao PINGATE, que protege a área adulta — sem expor dados.

## Critérios de aceitação / verificação
- [ ] Tocar um avatar com `Perfil` correspondente seta `EstadoApp.perfil` (mesmo `id`/`avatarId`) e leva a `EstadoApp.tela === 3`.
- [ ] "Sou o cuidador" chama `abrirPortaoParental()` (não navega direto para área adulta sem o PINGATE).
- [ ] Nenhum campo de senha/PIN aparece para a criança.
- [ ] Avatares são alvos ≥ 140×140 px, espaçados.
- [ ] Com `reduceMotion` ligado, nenhuma animação de entrada roda.
- [ ] Lista vazia mostra convite + caminho para o cuidador, sem travar.
- [ ] `grep` no arquivo: zero ocorrências de `MotorNarrativa`, `MA`, `MB`, `ValidadorOrdem` (T2 é pré-história).
- [ ] `_avatarSVG` é injetado via `ref`/`_inject`, nunca por `{{ }}` (convenção de runtime).

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`, `[[fase00-00-07]]`, `[[fase00-00-05]]`
- Consome (sem ser dono): PERF ([[fase00-00-07]]), SAVE ([[fase00-00-12]]) para `carregarPerfis`; ações de [[_contratos/eventos-acoes]].
- É consumido por: `[[fase01-01-02]]` (recebe o `Perfil` ativo no header da Tela 3).
- Conecta ao adulto: `[[fase02-02-03]]` (PINGATE) via `abrirPortaoParental`.
- Aplica A11y: `[[fase01-01-13]]`.
