-- Pipoca — MIGRAÇÃO: config_ia da PLATAFORMA (fallback universal) + ids reais
-- -----------------------------------------------------------------------------
-- COMO APLICAR: cole este arquivo INTEIRO no SQL editor do dashboard
-- (https://supabase.com/dashboard/project/bamlljvllcxdnsheatqv/sql/new) e Run.
-- É IDEMPOTENTE: seguro de rodar mais de uma vez.
--
-- POR QUÊ (análise A3, PR #31): a edge `realizador` lê a config do tenant e,
-- se não houver, tenta a linha "plataforma" (functions/realizador/index.ts:452).
-- Em produção `contas_tenant` está vazia → TODO usuário cai em `familia:<uid>`
-- sintético → sem linha própria em config_ia E sem linha "plataforma" → 503
-- `nao_configurado`. Resultado: 100% das realizações caíram no fallback A+ v3
-- ("Joana"); `uso_ia` nunca recebeu uma linha. Esta migração cria o fallback.
--
-- Além disso, os ids de modelo do MVP ("gemini-flash"/"gpt-mini") NÃO são ids
-- públicos válidos das APIs — conferidos 2026-07-12 na doc oficial, os reais são
-- `gemini-2.5-flash` e `gpt-5.4-mini`. A linha legada `ten_aced3c71` (não
-- alcançada por nenhum usuário hoje, mas é o tenant documentado) é corrigida.
--
-- ⚠️ CALIBRAR: cotaMensal/custoMaxMensal da plataforma são valores INICIAIS
-- (200 chamadas/mês, teto de custo abstrato 50). Ajuste conforme o custo real
-- observado em `uso_ia`. cotaMensal é o gate de nº de chamadas/mês por tenant.

-- ── 1 · Linha "plataforma": fallback universal de config de IA ────────────────
-- shape = ConfigIaTenant (src/admin/ia_config.ts) — SEM campo de chave (as
-- chaves vivem só como secrets da edge). Cascata: gemini principal, deepseek
-- fallback (ambos com id de modelo real / default do provedor).
insert into config_ia (tenant_id, dados, atualizado_em)
values (
  'plataforma',
  jsonb_build_object(
    'provedor',       'gemini',
    'modelo',         'gemini-2.5-flash',
    'fallback',       'deepseek',
    'cotaMensal',     200,
    'custoMaxMensal', 50
  ),
  now()
)
on conflict (tenant_id) do update
  set dados = excluded.dados,
      atualizado_em = now();

-- ── 2 · Corrigir o id de modelo da linha legada `ten_aced3c71` ────────────────
-- (idempotente: só reescreve o campo `modelo`; preserva provedor/fallback/cotas)
update config_ia
   set dados = jsonb_set(dados, '{modelo}', '"gemini-2.5-flash"'),
       atualizado_em = now()
 where tenant_id = 'ten_aced3c71'
   and dados->>'modelo' = 'gemini-flash';
