# Contrato · Schemas JSON canônicos

> 🟢 **STATUS · 2026-06-29 · IMPLEMENTADO** — `pipoca.perfil.v1`/`pipoca.save.v1` em `src/dados/schemas.ts`; `pipoca.grafo-autoral.v1` em `src/dados/quintal_grafo.json`. `telemetria.v1` parcial (fase03); `tenant.v1` não (fase06). Roteiro: ../TRILHA-DE-IMPLEMENTACAO.md

> Strings `esquema`/`schema` versionadas. Todo doc que persiste ou lê dados deve citar o schema pelo
> nome exato. Versão nova = sufixo `.vN` novo (nunca mutar um `.vN` já publicado).

| Schema | Dono | Persistido por |
|--------|------|----------------|
| `pipoca.grafo-autoral.v1` | [[../fase00/00-13_schema-grafo]] | conteúdo autoral (SA_CONTENT) |
| `pipoca.grafo-autoral.v3` | [[../fase08_conteudo/08-00_motor-a-plus-grafo-v3]] | conteúdo autoral |
| `pipoca.perfil.v1` | [[../fase00/00-14_schema-perfil-e-save]] | SAVE / PC_PROF |
| `pipoca.save.v1` | [[../fase00/00-14_schema-perfil-e-save]] | SAVE |
| `pipoca.telemetria.v1` | [[../fase03/03-01_telemetria-TELE]] | TELE / SAVE |
| `pipoca.tenant.v1` | [[../fase06/06-04_multitenant-rls-e-regras]] | backend (SA_TENANT) |

---

## 1. `pipoca.grafo-autoral.v1`

Existe hoje em [docs/quintal_grafo.json](../../quintal_grafo.json). **Única mudança planejada:** o campo
**opcional** `cenario.ordem_canonica: string[]` (ids dos objetos na ordem autoral pretendida), usado pelo
`ValidadorOrdem` ([[../fase00/00-18_validador-de-ordem]]). Quando ausente, a ordem é derivada por ordenação
topológica das `regras` (ver [[../fase00/00-20_RECONCILIACAO-mecanica-tira]]).

Forma (resumo — a forma completa dos tipos está em [[tipos-core]]):
```jsonc
{
  "esquema": "pipoca.grafo-autoral.v1",
  "niveis": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." },
  "regra_de_ouro": "Todo fragmento novo precisa ser lido no portão antes de soltar o próximo objeto.",
  "cenario": {
    "id": "quintal_anoitecer",
    "nome": "...", "personagem": "...", "paleta": "...",
    "abertura": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." },
    "ordem_canonica": ["vagalume", "frasco", "..."],   // ← NOVO, opcional
    "objetos": [
      { "id": "vagalume", "emoji": "🪲", "nome": "vaga-lume", "papel_no_fim": "nucleo",
        "gatilho": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." },
        "regras": [ { "se": "tem:frasco", "entao": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." } } ] }
    ],
    "desfechos": {
      "convergente": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." },
      "aberto": [ { "se_terminou_com": "frasco", "fragmento": { "n1": "...", "n2": "...", "n3": "...", "n4": "..." } } ]
    }
  }
}
```
Gramática de `regras[].se`: `"tem:<objetoId>"` ou `"nao_tem:<objetoId>"` (avaliada por `MotorGrafoAutoral`).

---

## 2. `pipoca.perfil.v1`

```jsonc
{
  "esquema": "pipoca.perfil.v1",
  "perfil": {
    "id": "uuid",
    "nome": "Pingo",
    "idade": 7,            // 3..12
    "nivel": "n2",         // Nivel
    "avatarId": "pingo"
  }
}
```
Mapeia o `Perfil` de [[tipos-core]]. Sem PII além de nome/apelido e idade (postura LGPD — ver
[[../fase02/02-09_privacidade-lgpd-PC_PRIV]]).

---

## 3. `pipoca.save.v1`

Persiste o `EstadoApp` por perfil (progresso, economia, modos, a11y, história em andamento).
```jsonc
{
  "esquema": "pipoca.save.v1",
  "perfilId": "uuid",
  "estado": {
    "tela": 3,
    "perfil": { /* pipoca.perfil.v1 .perfil */ },
    "sessao": { "perfilId": "uuid", "blocoMin": 15, "iniciadaEm": 0, "restanteSeg": 900 },
    "historia": { "cenarioId": "quintal_anoitecer", "objetos": ["vagalume"], "aberta": true },
    "economia": { "vagalumes": 6, "poupado": 2 },
    "modos": { "palco": "Palco", "desfecho": "convergente", "verificacao": "cuidador", "iaLigada": false },
    "a11y": { "textScale": 1, "dyslexia": false, "syllable": false, "contrast": false, "reduceMotion": false }
  }
}
```

---

## 4. `pipoca.telemetria.v1`

Eventos privados de progresso (minutos, palavras, histórias). Detalhe e pontos de captura em
[[../fase03/03-01_telemetria-TELE]].
```jsonc
{
  "esquema": "pipoca.telemetria.v1",
  "evento": {
    "tipo": "leitura_confirmada",   // | "sessao_iniciada" | "sessao_encerrada" | "historia_concluida" | "objeto_destravado"
    "perfilId": "uuid",
    "ts": 0,                        // epoch ms (injetado fora do motor)
    "dados": { "palavras": 6, "cenarioId": "quintal_anoitecer", "nivel": "n2", "verificacao": "cuidador" }
  }
}
```
Tipo TS correspondente (`EventoTelemetria`) é referenciado em [[tipos-core]] e definido em detalhe no doc dono.

---

## 5. `pipoca.tenant.v1`

Conta/tenant da plataforma multi-tenant (dono: [[../fase06/06-04_multitenant-rls-e-regras]]; consumido por
SA_TENANT [[../fase04/04-03_tenants-planos-SA_TENANT]]). Escopo aplicado por RLS (Supabase) / Security Rules (Firebase).
```jsonc
{
  "esquema": "pipoca.tenant.v1",
  "tenant": {
    "id": "uuid",
    "nome": "Escola/Família X",
    "plano": "free | familia | escola",
    "limites": { "perfis": 5, "iaCotaMes": 0 },
    "criadoEm": 0
  }
}
```

---

## 6. `pipoca.grafo-autoral.v3`

Evolução do v1 (conforme [[grafo-autoral-v3]]): variantes por célula, condições de posição, ecos no desfecho, conectivos, e replay determinístico. Schema novo em arquivo `docs/quintal.v3.json`; o v1 permanece intocado.
