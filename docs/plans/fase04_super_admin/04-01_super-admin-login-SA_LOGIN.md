# fase04 · 04-01 · Login do Super Admin

> 🟢 **STATUS · 2026-07-02 · IMPLEMENTADO (MVP local)** — Núcleo `src/admin/auth/*` (`avaliarLogin` puro: 1º uso semeia a credencial local com hash+sal, erro neutro, atraso progressivo a partir de 5 falhas; sessão de 12h com token opaco; seam `RepositorioAdmin`) + guard `src/admin/rotasAdmin.ts` fail-closed; tela `src/admin/telas/SaLogin.dc.html` no entry próprio `admin.html` (bundle `npm run build:admin` — o app da criança não carrega nada do admin). `EstadoApp` intocado. Auth real com servidor = fase06 (`ServicoAuth`). Testado (`admin.test.ts`) + e2e `npm run test:e2e:admin`. Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> Doc de planejamento autocontido. Segue o gabarito de [[_contratos/glossario]] e o [_TEMPLATE](../_TEMPLATE.md).
> Idioma: PT-BR. Nomes canônicos vêm de [[_contratos/tipos-core]], [[_contratos/schemas-json]] e [[_contratos/eventos-acoes]].

## Identidade
- id: `fase04-04-01`
- nó(s) da arquitetura: SA_LOGIN
- tela(s) do brief: —
- classe: admin

## Objetivo
Entregar uma trilha de autenticação **separada da família** que valida o operador da plataforma (Super Admin) e o leva ao painel (`SA_LOGIN -> SA_HOME`), em um produto **multi-tenant** com escopo e credenciais isolados.

## Pré-requisitos / Depende de
- [[fase00-00-12]] — o seam de persistência (`RepositorioPersistencia`), de onde sai a abstração de armazenamento que esta trilha estende para guardar a sessão administrativa fora do `pipoca.save.v1` da criança.

## Arquivos afetados
- `src/admin/telas/SaLogin.dc.html` — tela de login do Super Admin (criar).
- `src/admin/auth/autenticacaoSuperAdmin.ts` — serviço de autenticação separado (criar).
- `src/admin/auth/sessaoSuperAdmin.ts` — estado/escopo da sessão administrativa, isolado do `EstadoApp` (criar).
- `src/admin/auth/tiposAdmin.ts` — tipos administrativos novos desta fase (criar; ver "Nomes & variáveis").
- `src/admin/rotasAdmin.ts` — guarda de rota que impede acesso a `SA_*` sem `SessaoSuperAdmin` válida (criar).

## Nomes & variáveis
Tipos novos desta fase (administrativos — **não** entram em `EstadoApp` nem no `pipoca.save.v1` da criança):

```ts
// src/admin/auth/tiposAdmin.ts
export type PapelAdmin = "super_admin";          // único papel desta trilha no MVP da plataforma
export type TenantId = string;                    // identificador do tenant (ver [[fase04-04-03]])

export interface CredencialSuperAdmin {
  email: string;
  // NUNCA armazenar a senha em claro; só o hash + sal vivem no backend.
  senhaHash: string;
  sal: string;
}

export interface SessaoSuperAdmin {
  adminId: string;
  papel: PapelAdmin;                              // "super_admin"
  escopoTenants: TenantId[] | "todos";           // isolamento de escopo: a quais tenants este admin vê
  emitidaEm: number;                             // epoch ms (injetado pela borda, nunca dentro de regra pura)
  expiraEm: number;                              // epoch ms
  token: string;                                 // opaco; ver Regra 4
}
```

Estado e handlers da tela `SaLogin.dc.html` (camada dc-runtime — ver [[_contratos/convencoes-dc-runtime]]):
- estado: `email: string`, `senha: string`, `erro: string | null`, `carregando: boolean`, `tentativas: number`.
- handlers (camelCase, verbo no infinitivo, na linha de [[_contratos/eventos-acoes]]): `submeterLoginSuperAdmin()`, `aoDigitarEmail(v)`, `aoDigitarSenha(v)`.
- navegação: reutiliza `irParaTela(n)` de [[_contratos/eventos-acoes]] para ir a `SA_HOME` após sucesso.

## Interfaces / contratos
- Consome o seam **`RepositorioPersistencia`** ([[_contratos/tipos-core]], dono [[fase00-00-12]]) **apenas como referência de padrão**; a sessão administrativa NÃO usa `carregarSave`/`salvarSave` (esses são do perfil da criança). Define um seam irmão:

```ts
// src/admin/auth/autenticacaoSuperAdmin.ts
export interface RepositorioAdmin {
  autenticar(email: string, senha: string): Promise<SessaoSuperAdmin | null>;
  carregarSessao(): Promise<SessaoSuperAdmin | null>;
  encerrarSessao(): Promise<void>;
}
```

- Não toca `MotorNarrativa`, `ValidadorOrdem` nem nenhum tipo de tela da criança (lei do seam, [[_contratos/lei-do-contrato]]): esta é trilha administrativa, fora do fluxo `T2–T7`.

## Regras de negócio
1. **Trilha separada da família.** `SA_LOGIN` nunca compartilha credencial, sessão ou storage com `HH_LOGIN`/`KIDMODE`. Logar como Super Admin não cria, lê nem altera `Perfil` ou `pipoca.save.v1`.
2. **Sem senha em claro.** A senha digitada é enviada ao backend e comparada contra `senhaHash`+`sal`; o cliente nunca persiste a senha. `CredencialSuperAdmin.senhaHash` jamais trafega de volta ao cliente.
3. **Escopo é isolamento.** `SessaoSuperAdmin.escopoTenants` define exatamente quais `TenantId` este admin enxerga (`"todos"` só para o operador raiz da plataforma). Toda chamada `SA_*` subsequente é filtrada por esse escopo (consumido por [[fase04-04-03]]).
4. **Token opaco e expirável.** `token` é opaco ao cliente; `expiraEm` força reautenticação. Sessão expirada → volta a `SA_LOGIN` com mensagem neutra (sem expor o motivo técnico).
5. **Re-tentativa acolhedora, mas protegida.** Mensagem de erro é neutra e não diz se foi e-mail ou senha; após `tentativas >= 5`, aplica atraso progressivo (anti força-bruta). Isso é segurança, não a "re-tentativa acolhedora" infantil — esta tela não é para crianças.
6. **Defaults seguros.** Sem `SessaoSuperAdmin` válida em escopo, nenhuma rota `SA_HOME/SA_TENANT/SA_CONTENT/SA_AI/SA_SAFE` renderiza; o guard de `rotasAdmin.ts` redireciona a `SA_LOGIN`.
7. **LGPD / privacidade.** Login administrativo não coleta nem cruza dados das crianças; o operador atua sobre metadados de tenant/conteúdo, não sobre PII infantil (postura geral do produto, no controle do cuidador).

## Passos de implementação
1. Definir os tipos `PapelAdmin`, `TenantId`, `CredencialSuperAdmin`, `SessaoSuperAdmin` em `tiposAdmin.ts`.
2. Definir o seam `RepositorioAdmin` em `autenticacaoSuperAdmin.ts` (interface + implementação placeholder que chama o backend; no MVP de plataforma pode ser mock que valida contra credenciais semeadas).
3. Implementar `submeterLoginSuperAdmin()` na tela:
   - validar `email` não vazio e formato mínimo; senão `erro = "Confira o e-mail."`;
   - `carregando = true`; chamar `repositorioAdmin.autenticar(email, senha)`;
   - se `null` → incrementar `tentativas`, `erro = "Não foi possível entrar."`, aplicar atraso se `tentativas >= 5`;
   - se `SessaoSuperAdmin` → persistir via `RepositorioAdmin` (storage administrativo, separado do save da criança) e `irParaTela(SA_HOME)`.
4. Implementar o guard em `rotasAdmin.ts`: antes de qualquer rota `SA_*`, `carregarSessao()`; se ausente/expirada, forçar `SA_LOGIN`.
5. Implementar `encerrarSessao()` (logout) que limpa só o storage administrativo.
6. Garantir que `EstadoApp` ([[_contratos/tipos-core]]) **não** ganha nenhum campo administrativo — `SessaoSuperAdmin` vive em camada à parte.

## Estados / edge-cases
- **Vazio:** formulário limpo, `erro = null`, foco no e-mail.
- **Carregando:** botão desabilitado, `carregando = true`.
- **Sucesso:** sessão emitida → `SA_HOME`.
- **Credencial inválida:** mensagem neutra; sem revelar campo errado.
- **Muitas tentativas:** `tentativas >= 5` → atraso progressivo / bloqueio temporário.
- **Sessão expirada:** rota `SA_*` detecta `expiraEm < agora` → volta a `SA_LOGIN`.
- **Escopo vazio:** admin autenticado mas `escopoTenants = []` → entra, mas `SA_TENANT` mostra estado vazio (sem tenants atribuídos).
- **Tentativa de entrar pela trilha da família:** rota `SA_*` sem `SessaoSuperAdmin` → guard redireciona; nunca cai no fluxo da criança.

## Critérios de aceitação / verificação
- [ ] Logar como Super Admin NÃO cria/lê/altera `Perfil` nem `pipoca.save.v1` (storage administrativo separado, verificável).
- [ ] Sem `SessaoSuperAdmin` válida, qualquer rota `SA_*` redireciona a `SA_LOGIN`.
- [ ] Sucesso de login navega a `SA_HOME` ([[fase04-04-02]]).
- [ ] Senha nunca é persistida no cliente; `senhaHash` nunca chega ao cliente.
- [ ] Mensagem de erro é neutra (não distingue e-mail de senha).
- [ ] `escopoTenants` é respeitado pelas telas `SA_*` (smoke test com escopo restrito).
- [ ] `EstadoApp` permanece sem campos administrativos (diff verificável contra [[_contratos/tipos-core]]).

## Relações com outros docs
- Depende de: `[[fase00-00-12]]`
- É consumido por: `[[fase04-04-02]]` (recebe a sessão para montar o painel) · `[[fase04-04-03]]` (usa `escopoTenants` para isolar tenants)
- Reconcilia / conserta: —
