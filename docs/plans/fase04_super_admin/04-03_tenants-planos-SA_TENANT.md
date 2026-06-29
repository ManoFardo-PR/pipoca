# fase04 · 04-03 · Contas / tenants / planos

> Doc de planejamento autocontido. Segue o gabarito de [[_contratos/glossario]] e o [_TEMPLATE](../_TEMPLATE.md).
> Idioma: PT-BR. Nomes canônicos vêm de [[_contratos/tipos-core]], [[_contratos/schemas-json]] e [[_contratos/eventos-acoes]].

## Identidade
- id: `fase04-04-03`
- nó(s) da arquitetura: SA_TENANT
- tela(s) do brief: —
- classe: admin

## Objetivo
Entregar a administração **multi-tenant** da plataforma: criar/editar contas, tenants e planos, com **limites por plano** e **isolamento de dados** entre tenants, governada pelo escopo da `SessaoSuperAdmin`.

## Pré-requisitos / Depende de
- [[fase04-04-02]] — o hub `SA_HOME`, que abre esta área e provê a `SessaoSuperAdmin` (com `escopoTenants`).

## Arquivos afetados
- `src/admin/telas/SaTenant.dc.html` — tela de contas/tenants/planos (criar).
- `src/admin/tenant/tiposTenant.ts` — tipos `Conta`, `Tenant`, `Plano`, `LimitesPlano` (criar).
- `src/admin/tenant/repositorioTenant.ts` — seam de leitura/escrita de tenants, filtrado por escopo (criar).
- `src/admin/rotasAdmin.ts` — registrar `SA_TENANT` sob o guard (editar; criado em [[fase04-04-01]]).

## Nomes & variáveis
Reaproveita `TenantId`, `SessaoSuperAdmin` de [[fase04-04-01]]. Tipos novos desta fase:

```ts
// src/admin/tenant/tiposTenant.ts
export type IdPlano = "gratis" | "familia" | "escola";   // catálogo inicial de planos

export interface LimitesPlano {
  maxPerfis: number;            // teto de Perfil (criança) por tenant — ver [[_contratos/tipos-core]] Perfil
  iaPermitida: boolean;         // se o tenant PODE habilitar Motor B (governado em [[fase04-04-05]])
  cenariosCustomizados: number; // quantos grafos pipoca.grafo-autoral.v1 próprios o tenant pode ter ([[fase04-04-04]])
  retencaoTelemetriaDias: number; // janela de pipoca.telemetria.v1 retida (LGPD; ver [[_contratos/schemas-json]])
}

export interface Plano {
  id: IdPlano;
  nome: string;
  limites: LimitesPlano;
}

export interface Tenant {
  id: TenantId;
  nome: string;
  planoId: IdPlano;
  ativo: boolean;
  criadoEm: number;             // epoch ms (injetado pela borda)
}

export interface Conta {
  id: string;                   // a "família" ou "escola" dona do tenant
  email: string;                // contato administrativo da conta (não é credencial de criança)
  tenants: TenantId[];          // uma conta pode ter 1+ tenants
}
```

Estado/handlers da tela (dc-runtime, ver [[_contratos/convencoes-dc-runtime]]):
- estado: `tenants: Tenant[]`, `planos: Plano[]`, `contas: Conta[]`, `selecionado: TenantId | null`, `carregando: boolean`, `erro: string | null`.
- handlers: `criarTenant(payload)`, `editarTenant(id, patch)`, `definirPlano(id: TenantId, planoId: IdPlano)`, `ativarTenant(id)`, `suspenderTenant(id)`, `selecionarTenant(id)`.
- navegação: `irParaTela(SA_HOME)` ([[_contratos/eventos-acoes]]) para voltar ao hub.

## Interfaces / contratos
- Seam novo, filtrado por escopo:

```ts
// src/admin/tenant/repositorioTenant.ts
export interface RepositorioTenant {
  listarTenants(escopo: TenantId[] | "todos"): Promise<Tenant[]>;
  obterTenant(id: TenantId): Promise<Tenant | null>;
  salvarTenant(t: Tenant): Promise<void>;
  listarPlanos(): Promise<Plano[]>;
  obterLimitesEfetivos(id: TenantId): Promise<LimitesPlano>;
}
```

- Os `LimitesPlano` aqui são **consumidos** por: [[fase04-04-04]] (`cenariosCustomizados`), [[fase04-04-05]] (`iaPermitida`) e pelo controle parental da família (`maxPerfis`, `retencaoTelemetriaDias`).
- NÃO toca `MotorNarrativa`/`MotorGrafoAutoral`/`MotorIA`/`ValidadorOrdem` (lei do seam, [[_contratos/lei-do-contrato]]). Isolamento é de dados/escopo, não de motor.

## Regras de negócio
1. **Isolamento de dados entre tenants.** Todo `Perfil`, `pipoca.save.v1` e `pipoca.telemetria.v1` pertence a exatamente um `TenantId`; nenhum dado de um tenant é legível por outro. `RepositorioTenant.listarTenants(escopo)` nunca retorna tenants fora do `escopoTenants` da sessão.
2. **Escopo manda.** `SessaoSuperAdmin.escopoTenants` ([[fase04-04-01]]) é aplicado em toda leitura/escrita; tentar editar tenant fora do escopo → no-op + `erro` neutro.
3. **Limites por plano são tetos efetivos.** `obterLimitesEfetivos(id)` deriva de `Plano.limites` do `planoId` do tenant. Esses tetos são autoritativos para as demais áreas (Regra de consumo na seção Interfaces).
4. **Trocar de plano não destrói dados.** Rebaixar plano que reduz `maxPerfis` NÃO apaga perfis existentes: bloqueia criação de novos até voltar ao teto (degradação segura, sem perda).
5. **Suspender ≠ apagar.** `suspenderTenant` define `ativo = false` (acesso bloqueado), preservando dados. Exclusão definitiva é fluxo à parte com retenção LGPD.
6. **Sem PII de criança aqui.** A tela manipula metadados de conta/tenant/plano; nunca exibe conteúdo de leitura nem dados pessoais da criança além de contagens agregadas. Postura LGPD no controle do cuidador.
7. **Defaults seguros.** Tenant novo nasce no plano mais restritivo aplicável e com `iaPermitida = false` por padrão (a IA só liga deliberadamente em [[fase04-04-05]]).

## Passos de implementação
1. Definir `IdPlano`, `LimitesPlano`, `Plano`, `Tenant`, `Conta` em `tiposTenant.ts`.
2. Definir o seam `RepositorioTenant` (interface + implementação que aplica o filtro de escopo em todas as queries).
3. Na montagem: `carregarSessao()` ([[fase04-04-01]]); `listarTenants(sessao.escopoTenants)` e `listarPlanos()`.
4. Implementar `criarTenant`: valida campos, aplica Regra 7 (plano restritivo + `iaPermitida=false`), `salvarTenant`.
5. Implementar `definirPlano`: troca `planoId`; recomputar `obterLimitesEfetivos`; aplicar Regra 4 (não destruir dados, só bloquear excedente).
6. Implementar `ativarTenant`/`suspenderTenant` (toggle de `ativo`, sem apagar).
7. Garantir que toda escrita persiste via `RepositorioTenant.salvarTenant` (no padrão do seam de [[fase00-00-12]], porém em storage administrativo).
8. Botão "voltar" → `irParaTela(SA_HOME)`.

## Estados / edge-cases
- **Vazio:** escopo sem tenants → lista vazia com call-to-action "criar tenant".
- **Carregando:** `carregando = true`.
- **Sucesso:** lista de tenants com plano e status.
- **Fora do escopo:** ação sobre tenant não autorizado → no-op + `erro` neutro.
- **Rebaixamento que excede teto:** bloqueia novos perfis, preserva existentes (Regra 4).
- **Suspensão:** `ativo=false`, dados intactos.
- **Sessão expirada:** próxima ação volta a `SA_LOGIN` via guard.

## Critérios de aceitação / verificação
- [ ] `listarTenants` nunca retorna tenant fora de `escopoTenants` (teste com escopo restrito).
- [ ] Dados de um tenant não vazam para outro (teste de isolamento).
- [ ] `obterLimitesEfetivos` reflete o `Plano` atribuído e é consumível por [[fase04-04-04]]/[[fase04-04-05]].
- [ ] Rebaixar plano não apaga perfis; apenas bloqueia novos acima do teto.
- [ ] Tenant novo nasce restritivo e com `iaPermitida=false`.
- [ ] A tela não exibe PII de criança além de contagens agregadas.

## Relações com outros docs
- Depende de: `[[fase04-04-02]]`
- É consumido por: `[[fase04-04-04]]` (teto `cenariosCustomizados`) · `[[fase04-04-05]]` (`iaPermitida` por tenant) · `[[fase04-04-06]]` (flags aplicadas por tenant)
- Reconcilia / conserta: —
