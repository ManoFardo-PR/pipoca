# fase02 · 02-01 · Login da família

> 🟡 **STATUS · 2026-06-29 · PARCIAL** — Núcleo `src/core/contaFamilia.ts` (`ContaFamilia`/`SessaoConta`, `entrarFamilia` stub MVP, `criarSessao`/`sessaoValida`) + store `src/servicos/conta_repo.ts` (sessão persistida em `pipoca.sessao-conta.v1`), exposto no bridge (`PipocaCanonico.conta`) e testado (`parciais.test.ts`). Autenticação real é fase06 (`ServicoAuth`). Falta a tela `LoginFamilia` + a rota inicial sessão-válida→KIDMODE (app). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

## Identidade
- id: `fase02-02-01`
- nó(s) da arquitetura: HH_LOGIN
- tela(s) do brief: —
- classe: mvp

## Objetivo
Entregar o login único da família (uma conta por casa) que autentica o cuidador, carrega os perfis das crianças via `RepositorioPersistencia`, persiste a sessão de conta e entrega o app no Modo criança (KIDMODE → T2).

## Pré-requisitos / Depende de
- `[[fase00-00-12]]` (RepositorioPersistencia / SAVE)
- `[[fase00-00-07]]` (Perfil / PERF)

## Arquivos afetados
- `src/telas/LoginFamilia.dc.html` (criar — tela HH_LOGIN)
- `src/core/contaFamilia.ts` (criar — modelo de conta + sessão de conta, distinto do EstadoApp)
- `src/core/persistencia.ts` (editar — usa o seam `RepositorioPersistencia` para carregar perfis; não cria nova interface)
- `src/core/roteador.ts` (editar — rota inicial: se sessão de conta válida → KIDMODE; senão → HH_LOGIN)

## Nomes & variáveis
- `ContaFamilia` — interface local desta fase (não está em [[_contratos/tipos-core]]; nasce aqui): `{ id: string; email: string; criadaEm: number }`. NÃO é PII além do necessário; segue postura LGPD de [[fase02-02-09]].
- `SessaoConta` — interface local: `{ contaId: string; autenticadaEm: number; expiraEm: number }`. Distinta de `Sessao` ([[_contratos/tipos-core]]), que é a sessão de leitura da criança (bloco de foco).
- `perfisCarregados: Perfil[]` — resultado de `RepositorioPersistencia.carregarPerfis()`.
- Estado de tela (dc-runtime, ver [[_contratos/convencoes-dc-runtime]]): `emailInput: string`, `senhaInput: string`, `erroLogin: string | null`, `carregando: boolean`.
- Handlers/ações: `entrarConta()` (submete login), `irParaTela(n)` (ação canônica de [[_contratos/eventos-acoes]], usada para sair de HH_LOGIN rumo a T2 via KIDMODE). NÃO inventar uma ação fora do contrato para a navegação entre telas.
- Reaproveitado do protótipo: nada direto — o protótipo não tinha login; entra direto na Tela 1. Esta tela é nova e fica ANTES do Onboarding.

## Interfaces / contratos
- `RepositorioPersistencia` ([[_contratos/tipos-core]]) — usa `carregarPerfis(): Promise<Perfil[]>`.
- `Perfil` ([[_contratos/tipos-core]]) e schema `pipoca.perfil.v1` ([[_contratos/schemas-json]]) — somente leitura nesta tela.
- `ContaFamilia` / `SessaoConta` — tipos locais desta fase (definidos acima); não substituem nenhum tipo canônico.
- NÃO toca `MotorNarrativa`, `MotorGrafoAutoral`, `MotorIA` nem `ValidadorOrdem` (login é anterior à narrativa).

## Regras de negócio
1. Uma conta por família. O login da família é distinto do Login do Super Admin (HH_LOGIN ≠ SA_LOGIN; SA_LOGIN é de [[fase04-04-01]] e governa a plataforma, não esta casa).
2. Login bem-sucedido → KIDMODE → T2. O destino padrão após autenticar é SEMPRE o Modo criança; o cuidador só alcança superfícies adultas atravessando o PINGATE ([[fase02-02-03]]).
3. A sessão de conta é persistida; ao reabrir o app com `SessaoConta` válida (não expirada), pula HH_LOGIN e abre direto em KIDMODE. Isto evita pedir senha toda vez que a criança vai ler.
4. Ao autenticar, carregar os perfis da família via `RepositorioPersistencia.carregarPerfis()`. Se `[]` (família sem perfis ainda), o fluxo encaminha para o Onboarding ([[fase02-02-04]]) atrás do PIN — mas o Modo criança ainda é o destino imediato; a T2 mostra estado vazio e oferece "Sou o cuidador".
5. Conteúdo seguro para crianças: a tela HH_LOGIN pode aparecer no tablet, então nada de linguagem adulta sensível; texto sóbrio e curto.
6. Toda persistência (gravar `SessaoConta`) passa pelo seam de [[fase00-00-12]] — sem `localStorage` ad-hoc espalhado.

## Passos de implementação
1. Definir `ContaFamilia` e `SessaoConta` em `src/core/contaFamilia.ts`.
2. Criar `LoginFamilia.dc.html` com: campo e-mail, campo senha, botão "Entrar", link discreto "Conta nova? Falar com o cuidador". Alvos de toque grandes; paleta creme/areia (não branco clínico).
3. Implementar `entrarConta()`:
   - validar campos (não vazios) → senão `erroLogin` acolhedor;
   - `setState({ carregando: true })`;
   - autenticar (stub MVP: valida credenciais locais; integração real é fora do MVP);
   - em sucesso: montar `SessaoConta`, persistir via `RepositorioPersistencia`, chamar `RepositorioPersistencia.carregarPerfis()` → guardar `perfisCarregados`;
   - navegar para KIDMODE com `irParaTela(2)` (T2 é a entrada da criança).
4. No `roteador.ts`, na inicialização: ler `SessaoConta`; se válida → KIDMODE; senão → HH_LOGIN.
5. Garantir que `setState`/`renderVals()` exponham `emailInput`, `senhaInput`, `erroLogin`, `carregando` ([[_contratos/convencoes-dc-runtime]]).

## Estados / edge-cases
- Vazio: campos em branco → botão "Entrar" desabilitado ou mensagem suave; nunca X vermelho.
- Carregando: `carregando=true` mostra spinner calmo, sem bloquear de forma assustadora.
- Credencial inválida: `erroLogin` em tom acolhedor ("Não reconhecemos esses dados. Tente de novo."), sem punir; foco mantido no formulário.
- Sessão expirada ao reabrir: cai em HH_LOGIN normalmente.
- Sessão válida ao reabrir: pula login e vai a KIDMODE (regra 3).
- Família sem perfis: segue para KIDMODE (T2 mostra vazio, oferece "Sou o cuidador" → PINGATE → Onboarding).
- Sem rede (online-first): mensagem calma de "sem conexão" e re-tentativa; não travar a UI.

## Critérios de aceitação / verificação
- [ ] Login válido leva a KIDMODE e então T2 (HH_LOGIN → KIDMODE → T2), conforme a aresta do mermaid v2.0.
- [ ] `RepositorioPersistencia.carregarPerfis()` é chamado exatamente uma vez por login bem-sucedido.
- [ ] `SessaoConta` é persistida via o seam de [[fase00-00-12]]; reabrir com sessão válida pula HH_LOGIN.
- [ ] HH_LOGIN nunca dá acesso direto a PC_HOME; só via PINGATE.
- [ ] Nenhuma referência a `MotorGrafoAutoral`/`MotorIA` nesta tela (lei do seam, [[_contratos/lei-do-contrato]]).
- [ ] Erro de credencial é acolhedor, sem X vermelho.

## Relações com outros docs
- Depende de: `[[fase00-00-12]]`, `[[fase00-00-07]]`
- É consumido por: `[[fase02-02-02]]` (KIDMODE recebe o controle após o login)
- Reconcilia / conserta: —
