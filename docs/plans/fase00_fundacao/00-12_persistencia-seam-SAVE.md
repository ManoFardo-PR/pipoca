# fase00 · 00-12 · Persistência (SAVE) e seam LGPD

## Identidade
- id: `fase00-00-12`
- nó(s) da arquitetura: SAVE
- tela(s) do brief: —
- classe: mvp

## Objetivo
Definir a interface `RepositorioPersistencia` como **único seam de dados** da app (carregar/salvar perfis, save por perfil, telemetria), com implementação `localStorage` no MVP e ponto de migração para Supabase depois — tudo sob a postura LGPD de "dados no controle do cuidador".

## Pré-requisitos / Depende de
- `[[fase00-00-06]]`

## Arquivos afetados
- `src/core/persistencia/RepositorioPersistencia.ts` — re-export do tipo canônico de [[_contratos/tipos-core]] (a interface vive lá; este arquivo só centraliza o import).
- `src/core/persistencia/RepositorioLocalStorage.ts` — implementação MVP (criar).
- `src/core/persistencia/RepositorioSupabase.ts` — esqueleto/stub do ponto de migração (criar, sem lógica completa).
- `src/core/persistencia/index.ts` — fábrica `criarRepositorio()` que escolhe a impl (criar).
- `src/core/persistencia/chaves.ts` — convenções de chaves do `localStorage` (criar).

## Nomes & variáveis
- `RepositorioPersistencia` — interface canônica ([[_contratos/tipos-core]]). **Não renomear.**
- `RepositorioLocalStorage implements RepositorioPersistencia` — impl MVP.
- `RepositorioSupabase implements RepositorioPersistencia` — impl futura (stub aqui).
- `criarRepositorio(): RepositorioPersistencia` — fábrica de repositório (decide local vs remoto).
- Tipos consumidos: `Perfil`, `EstadoApp`, `EventoTelemetria` ([[_contratos/tipos-core]]).
- Schemas tocados: `pipoca.perfil.v1`, `pipoca.save.v1`, `pipoca.telemetria.v1` ([[_contratos/schemas-json]]).
- Chaves de `localStorage` (em `chaves.ts`):
  - `CHAVE_PERFIS = "pipoca.perfis.v1"` — array de envelopes `pipoca.perfil.v1`.
  - `chaveSave(perfilId) → "pipoca.save.v1:" + perfilId` — um envelope `pipoca.save.v1` por perfil.
  - `chaveTelemetria(perfilId) → "pipoca.telemetria.v1:" + perfilId` — fila append-only local.
- Não há identificador vindo do protótipo: o protótipo guardava tudo em `this.state` (memória), sem persistência.

## Interfaces / contratos
A interface canônica (de [[_contratos/tipos-core]]), repetida aqui para referência — **não alterar a forma**:

```ts
export interface RepositorioPersistencia {
  carregarPerfis(): Promise<Perfil[]>;
  salvarPerfil(p: Perfil): Promise<void>;
  carregarSave(perfilId: string): Promise<EstadoApp | null>;
  salvarSave(perfilId: string, estado: EstadoApp): Promise<void>;
  registrarTelemetria(evento: EventoTelemetria): Promise<void>;
}
```

Schemas persistidos (de [[_contratos/schemas-json]]):
- `pipoca.perfil.v1` — envelope `{ esquema, perfil: Perfil }` (detalhe em [[fase00-00-14]]).
- `pipoca.save.v1` — envelope `{ esquema, perfilId, estado: EstadoApp }` (detalhe em [[fase00-00-14]]).
- `pipoca.telemetria.v1` — envelope `{ esquema, evento: EventoTelemetria }` (dono [[fase03-03-01]]).

Forma da fábrica:

```ts
export function criarRepositorio(opts?: { remoto?: boolean }): RepositorioPersistencia {
  // MVP: sempre RepositorioLocalStorage. Migração: opts.remoto → RepositorioSupabase.
  return opts?.remoto ? new RepositorioSupabase() : new RepositorioLocalStorage();
}
```

## Regras de negócio
1. **Seam único**: nenhuma tela nem o CORE acessam `localStorage`/Supabase diretamente — sempre via `RepositorioPersistencia`. Trocar de backend não muda nenhuma tela (mesma lei do seam aplicada a dados).
2. **online-first**: a leitura/escrita assume o backend disponível; no MVP o backend é o próprio `localStorage` (sempre presente). A impl Supabase será online-first também; cache offline NÃO entra no MVP.
3. **Versionamento por envelope**: toda escrita grava o campo `esquema` com o `.vN` corrente; toda leitura valida `esquema` antes de aceitar (ver [[fase00-00-14]] para a validação de carga). Um `.vN` publicado nunca é mutado.
4. **Idempotência de save**: `salvarSave(perfilId, estado)` sobrescreve o envelope do perfil por inteiro (last-write-wins); não há merge parcial no MVP.
5. **Telemetria privada e append-only**: `registrarTelemetria` só anexa eventos `pipoca.telemetria.v1`; nunca lê de volta para a criança. Conteúdo e captura em [[fase03-03-01]].
6. **Postura LGPD — dados no controle do cuidador**: o repositório expõe (para o painel parental) a capacidade de **exportar** e **apagar** todos os dados de um perfil. O detalhe de UX/consentimento e o botão de apagar vivem em [[fase02-02-09]]; aqui garantimos apenas que apagar um perfil remove `chaveSave(perfilId)` e `chaveTelemetria(perfilId)` junto.
7. **Sem PII além do mínimo**: o repositório nunca persiste mais do que `pipoca.perfil.v1` permite (nome/apelido + idade + nível + avatar). Não há e-mail/telefone da criança.
8. **Erros não quebram a leitura**: falha de escrita é registrada e degradada (a sessão de leitura continua em memória); nunca interrompe a criança no meio da história.

## Passos de implementação
1. Em `chaves.ts`, definir `CHAVE_PERFIS`, `chaveSave`, `chaveTelemetria` e um helper `lerEnvelope<T>(chave, esquemaEsperado)` que faz `JSON.parse` + valida `esquema`.
2. Em `RepositorioLocalStorage.ts`:
   - `carregarPerfis()` → ler `CHAVE_PERFIS`, validar cada envelope `pipoca.perfil.v1`, mapear para `Perfil[]`; vazio ⇒ `[]`.
   - `salvarPerfil(p)` → carregar lista atual, upsert por `p.id`, gravar envelope `pipoca.perfil.v1`.
   - `carregarSave(perfilId)` → ler `chaveSave(perfilId)`, validar `pipoca.save.v1`, devolver `estado` ou `null`.
   - `salvarSave(perfilId, estado)` → gravar envelope `pipoca.save.v1` (sobrescreve).
   - `registrarTelemetria(evento)` → append no array de `chaveTelemetria(evento.perfilId)`.
   - método interno `apagarPerfil(perfilId)` (usado por [[fase02-02-09]]) que remove save + telemetria + entrada da lista.
3. Em `RepositorioSupabase.ts`: criar a classe que implementa a interface com `throw new Error("não implementado — fase de migração")` em cada método e um comentário marcando o **ponto de migração** (tabelas `perfis`, `saves`, `telemetria`; RLS por família).
4. Em `index.ts`: implementar `criarRepositorio()` (MVP devolve local).
5. Garantir que toda chamada que muda saldo/estado nas ações ([[_contratos/eventos-acoes]]) persista via este seam (contrato citado por aquelas ações).

## Estados / edge-cases
- **`localStorage` vazio / primeira execução**: `carregarPerfis()` ⇒ `[]`; `carregarSave()` ⇒ `null`.
- **JSON corrompido / `esquema` desconhecido**: `lerEnvelope` rejeita ⇒ trata como ausente (`null`/`[]`) e não derruba a app.
- **`esquema` de versão diferente** (`.vN` antiga): não migrar silenciosamente; tratar como ausente no MVP (a migração de versão é decidida no doc dono do schema [[fase00-00-14]]).
- **Quota de `localStorage` estourada**: capturar exceção em `salvarSave`/`registrarTelemetria`, degradar (regra 8), sinalizar para a camada parental.
- **Apagar dados (LGPD)**: após `apagarPerfil`, `carregarSave(perfilId)` deve voltar `null` e o perfil sumir da lista.
- **Migração para Supabase**: `RepositorioSupabase` ainda em stub ⇒ `criarRepositorio({ remoto: true })` lança erro explícito até a fase de migração.

## Critérios de aceitação / verificação
- [ ] `RepositorioLocalStorage` satisfaz `RepositorioPersistencia` (compila contra o tipo canônico, sem alterar a forma).
- [ ] Ciclo `salvarPerfil` → `carregarPerfis` devolve o mesmo `Perfil`.
- [ ] Ciclo `salvarSave(p, estado)` → `carregarSave(p)` devolve `EstadoApp` igual (round-trip).
- [ ] `carregarSave` de perfil inexistente ⇒ `null`; `carregarPerfis` em store vazio ⇒ `[]`.
- [ ] Envelope com `esquema` inválido é ignorado sem lançar para a UI.
- [ ] `apagarPerfil` remove save + telemetria + entrada da lista (verificado por [[fase02-02-09]]).
- [ ] Nenhuma tela importa `localStorage`/Supabase diretamente — só `RepositorioPersistencia`.
- [ ] `criarRepositorio()` no MVP devolve a impl local; `{ remoto: true }` lança erro claro.

## Relações com outros docs
- Depende de: `[[fase00-00-06]]`
- É consumido por: `[[fase00-00-14]]` (schemas), `[[fase00-00-07]]` (PERF), `[[fase00-00-08]]` (SESS), `[[fase00-00-09]]` (HIST), `[[fase00-00-10]]` (ECON), `[[fase02-02-09]]` (LGPD: exportar/apagar), `[[fase03-03-01]]` (telemetria)
- Reconcilia / conserta: —
