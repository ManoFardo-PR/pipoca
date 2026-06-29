# fase04 · 04-02 · Painel do Super Admin

> Doc de planejamento autocontido. Segue o gabarito de [[_contratos/glossario]] e o [_TEMPLATE](../_TEMPLATE.md).
> Idioma: PT-BR. Nomes canônicos vêm de [[_contratos/tipos-core]], [[_contratos/schemas-json]] e [[_contratos/eventos-acoes]].

## Identidade
- id: `fase04-04-02`
- nó(s) da arquitetura: SA_HOME
- tela(s) do brief: —
- classe: admin

## Objetivo
Entregar o **hub** do Super Admin: a tela que recebe a `SessaoSuperAdmin` e distribui o operador para as quatro áreas da plataforma (`SA_HOME -> SA_TENANT / SA_CONTENT / SA_AI / SA_SAFE`), respeitando o escopo da sessão.

## Pré-requisitos / Depende de
- [[fase04-04-01]] — o login do Super Admin, que produz a `SessaoSuperAdmin` consumida aqui.

## Arquivos afetados
- `src/admin/telas/SaHome.dc.html` — tela-hub do painel (criar).
- `src/admin/rotasAdmin.ts` — registrar as rotas de destino `SA_TENANT/SA_CONTENT/SA_AI/SA_SAFE` (editar; criado em [[fase04-04-01]]).
- `src/admin/componentes/CartaoArea.dc.html` — cartão de navegação reutilizável para cada área (criar).

## Nomes & variáveis
Reaproveita os tipos administrativos de [[fase04-04-01]] (`SessaoSuperAdmin`, `PapelAdmin`, `TenantId`). Tipo novo, local, só para descrever os destinos do hub:

```ts
// src/admin/telas/SaHome.dc.html (data-dc-script)
type AreaAdminId = "tenants" | "conteudo" | "ia" | "seguranca";

interface CartaoArea {
  id: AreaAdminId;
  titulo: string;       // ex.: "Contas / tenants / planos"
  rotaNo: string;       // nó destino: "SA_TENANT" | "SA_CONTENT" | "SA_AI" | "SA_SAFE"
  disponivel: boolean;  // false quando o escopo da sessão não autoriza a área
}
```

Estado/handlers da tela (dc-runtime, ver [[_contratos/convencoes-dc-runtime]]):
- estado: `sessao: SessaoSuperAdmin | null`, `areas: CartaoArea[]`, `carregando: boolean`.
- handlers: `abrirArea(id: AreaAdminId)`, `encerrarSessaoSuperAdmin()`.
- navegação: usa `irParaTela(n)` ([[_contratos/eventos-acoes]]) para cada destino `SA_*`.

## Interfaces / contratos
- Consome `SessaoSuperAdmin` e o seam `RepositorioAdmin` ([[fase04-04-01]]) via `carregarSessao()`/`encerrarSessao()`.
- NÃO toca `MotorNarrativa`, `MotorGrafoAutoral`, `MotorIA`, `ValidadorOrdem` nem tipos de tela da criança — é hub administrativo (lei do seam, [[_contratos/lei-do-contrato]]).

## Regras de negócio
1. **Só com sessão.** `SA_HOME` exige `SessaoSuperAdmin` válida; sem ela, o guard de `rotasAdmin.ts` ([[fase04-04-01]]) redireciona a `SA_LOGIN`.
2. **Hub puro.** `SA_HOME` não edita dados de tenant/conteúdo/IA/segurança — apenas roteia. Toda escrita acontece nas telas de destino.
3. **Distribuição completa.** O hub expõe exatamente quatro áreas, mapeadas 1:1 aos nós: `tenants→SA_TENANT`, `conteudo→SA_CONTENT`, `ia→SA_AI`, `seguranca→SA_SAFE`.
4. **Escopo filtra a UI.** Um cartão fica `disponivel = false` (visualmente atenuado, não clicável) quando `SessaoSuperAdmin.escopoTenants` não autoriza aquela área. Nunca um link "morto" que aparenta funcionar.
5. **Defaults seguros.** Em dúvida de escopo, a área é tratada como indisponível (fail-closed), nunca aberta por padrão.
6. **Logout limpo.** `encerrarSessaoSuperAdmin()` chama `encerrarSessao()` e volta a `SA_LOGIN`, sem tocar storage da criança.

## Passos de implementação
1. Na montagem (`componentDidMount`), `carregarSessao()`; se `null`/expirada → `irParaTela(SA_LOGIN)`.
2. Montar `areas: CartaoArea[]` a partir do escopo da sessão (aplicar Regra 4 para `disponivel`).
3. Renderizar a lista de `CartaoArea` via `<sc-for>` ([[_contratos/convencoes-dc-runtime]]), usando `CartaoArea.dc.html`.
4. `abrirArea(id)`: se `disponivel`, mapear `id → rotaNo` e `irParaTela(rotaNo)`; senão, no-op.
5. Implementar `encerrarSessaoSuperAdmin()`.
6. Expor tudo via `renderVals()` (objeto plano), sem injetar HTML grande por interpolação.

## Estados / edge-cases
- **Vazio:** sem sessão → redireciona a `SA_LOGIN`.
- **Carregando:** `carregando = true` enquanto resolve a sessão.
- **Sucesso:** quatro cartões; clicar abre o destino.
- **Escopo parcial:** alguns cartões `disponivel = false`, atenuados e não clicáveis.
- **Sessão expira em tela aberta:** próxima navegação detecta e volta a `SA_LOGIN`.
- **Re-tentativa:** clicar em cartão indisponível não navega nem mostra erro alarmante (apenas não age).

## Critérios de aceitação / verificação
- [ ] Sem `SessaoSuperAdmin`, `SA_HOME` redireciona a `SA_LOGIN` ([[fase04-04-01]]).
- [ ] Os quatro cartões mapeiam corretamente para `SA_TENANT/SA_CONTENT/SA_AI/SA_SAFE`.
- [ ] Cartões fora do escopo aparecem atenuados e não navegam (fail-closed).
- [ ] `SA_HOME` não realiza nenhuma escrita de dados (somente roteamento).
- [ ] Logout volta a `SA_LOGIN` sem tocar `pipoca.save.v1`/`Perfil`.

## Relações com outros docs
- Depende de: `[[fase04-04-01]]`
- É consumido por: `[[fase04-04-03]]` · `[[fase04-04-04]]` · `[[fase04-04-05]]` · `[[fase04-04-06]]` (todas as áreas são abertas a partir deste hub)
- Reconcilia / conserta: —
