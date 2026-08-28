# C4 — `Canon.avatares`: tabela única de avatars no core, exposta pelo bridge; poda de `perfil.ts`

> Status: pendente

**Unidade de deploy:** BUNDLE app (`src/core/perfil.ts`, `src/app/bridge.ts`).
**Depende de:** nada. **Desbloqueia:** C5.

## Objetivo
Uma única definição de avatars (`id`, `nome`, `cor`, `emoji`) no core, alcançável pelas telas
via `window.PipocaCanonico.avatares` — o canal que o repo já usa para tudo que tela precisa
do core — e a API de `perfil.ts` reduzida ao que é consumido.

## Por quê (evidência)
- Ids canônicos: `src/core/perfil.ts:31` `AVATARES = ["pingo","fubá","cacau","lua","tuca"]`
  (nota: **"fubá" com acento no id literal**); `:36` `AVATAR_PADRAO="pingo"`; `:91-94`
  `normalizarAvatar` (desconhecido → pingo); `:116` `criarPerfil`; `:141-142` validação.
- A definição visual está **duplicada em 6 lugares** com 2 formatos: `src/telas/avatares.ts:31-39`
  (`{id,name,bg,ear,fur}`, **zero importadores** — o cabeçalho `:13-16` avisa) + cópias inline
  idênticas em `Tela2EntradaCrianca.dc.html:65-73`, `Tela3SelecaoCenario.dc.html:163-171`,
  `Tela7PoteCardapio.dc.html:132-140`; e `{id,name,cor}` em `Onboarding.dc.html:104-112`
  (`_avataresDefs`, plural extra) e `Perfis.dc.html:128-136`. Cores em 6 lugares, ids em 7.
- Motivo da duplicação: telas `.dc.html` são interpretadas em runtime e não importam módulos
  (`support.js:1360-1422`); o padrão do repo para isso é o bridge (`Canon.historias`, `Canon.a11y`,
  `Canon.cardapio`… `src/app/bridge.ts:174-300`).
- `perfil.ts`: 15 dos 19 exports sem consumidor externo (`AVATARES`, `AvatarId`, `NIVEL_PADRAO`,
  `AVATAR_PADRAO`, `IDADE_MIN/MAX`, `GENEROS`, `GeneroPerfil`, `perfilVazio`, `clampIdade`,
  `normalizarNome/Nivel/Avatar`, classe `RepositorioPerfil` :152 — superseded por
  `RepositorioLocalStorage`). Vivos: `criarPerfil` (`bridge.ts:138`), `NOME_PADRAO`
  (`geracao.ts:53,190`), `normalizarGenero` e `validarPerfil` (`src/dados/schemas.ts`), `Perfil`.
- O avatar É a identidade de login da criança: `Tela2:113` (`perfis.find(p => p.avatarId === avatarId)`)
  e `:147-161` (avatar sem perfil fica oculto) — os ids não podem mudar.

## Escopo (arquivos)
- `src/core/perfil.ts` (:31-41, :65-94, :152+).
- `src/app/bridge.ts` (novo grupo `avatares` ou dentro de `perfil`).
- Teste: `src/core/*.test.ts` que cubra `normalizarAvatar` e a tabela.

## Passos
1. Em `perfil.ts`, criar `AVATARES_DEF: ReadonlyArray<{ id: AvatarId; nome: string; cor: string; emoji: string }>`
   com as 5 cores atuais (`#3f6f9e`, `#d98a4e`, `#7a9a5b`, `#9c7cb0`, `#5fa9b8`) e os emojis
   decididos; derivar `AVATARES` dela; manter `AVATAR_PADRAO` e `normalizarAvatar`.
2. Expor em `bridge.ts`: `avatares: { lista: AVATARES_DEF, padrao: AVATAR_PADRAO, normalizar: normalizarAvatar, porId(id) }`.
3. Podar `perfil.ts`: remover `RepositorioPerfil` e os exports sem consumidor que C5 não vai
   usar (manter `IDADE_MIN/MAX`/`clampIdade` se C9 for usá-los na validação de idade — coordenar).
4. Teste: `porId("fubá")` resolve; `normalizarAvatar("x")` → `"pingo"`; 5 entradas únicas.
5. Não tocar nas telas aqui (C5).

## Critérios de aceite
- `bun x tsc --noEmit` limpo; `npm test` verde; `grep -rn "RepositorioPerfil" src/` → 0.
- `window.PipocaCanonico.avatares.lista.length === 5` após `build:app` (C12).

## Verificação
```
bun x tsc --noEmit && npm test
```

## Riscos e cuidados
- Renomear `fubá` → `fuba` quebraria perfis existentes (id gravado no envelope `pipoca.perfil.v1`
  e no espelho `perfis.dados`) — só com migração de dados; default: manter.
- `src/dados/schemas.ts:42,91,131` importa de `perfil.ts` — não remover o que ele usa.

## Decisões do dono (default)
- Os 5 emojis (default: 🐶 Pingo, 🦊 Fubá, 🐻 Cacau, 🐱 Lua, 🐦 Tuca — mantém a metáfora dos
  bichinhos sem as orelhas-chifre; alternativa: rostos/objetos, mudando a identidade).
- Manter o id `fubá` (default: **sim**).
