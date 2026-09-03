# Notas de arquitetura (ex-`.agents/memory`, migradas no D5 · Plan03)

Decisões e pegadinhas que não cabem no código nem no guia por capítulo. Cada
nota diz o PORQUÊ de algo que o repo só mostra o COMO. Datas/estados refletem
quando foram escritas — confirme no código antes de agir.

- [Composição de telas dc-runtime](dc-runtime-composition.md) — componentes só montam via `<dc-import name="X">`; tags PascalCase = tela branca; modais fixed ficam fora do escalonador.
- [Onboarding canônico](onboarding-fix.md) — fluxo T2→T1(PIN)→Onboarding(T10)→T2; perfis via PipocaApp.repo (nota: a chave 'pipoca.perfis.v1' citada na nota foi APOSENTADA no D3 — a canônica é 'pipoca.perfil.v1'; pós-PIN com perfis vai ao hub T11 desde o C6).
- [Portão: prévia vs commit](composicao-portao-preview.md) — em T4 não mutar comp; montar gatePendente + prévia pura, aplicar só no _commit de T5 (voltar sem perdas).
- [Telas responsivas](telas-responsivas.md) — sem escalador global no Shell, cada tela cuida da própria adaptação; texto longo usa clamp(min(vw,vh)) + scroll safe-center.
- [Deploy real Supabase + pegadinhas de IA](supabase-deploy-real.md) — deploy via Management API (repo não sincroniza sozinho); Gemini rejeita additionalProperties; testar OK ≠ geração OK.
- [Roteamento raiz vs app](roteamento-landing.md) — `/` serve landing.html (marketing); o app da criança vive em `/app` (index.html); recuperação de senha volta na raiz e é encaminhada p/ `/app`+hash.
