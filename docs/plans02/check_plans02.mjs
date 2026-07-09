#!/usr/bin/env node
// check_plans02.mjs — diagnóstico de integridade dos planos da geração 2 (plans02, fases 10–14).
// Uso: node docs/plans02/check_plans02.mjs
// Lê: todos os faseNN_*/NN-NN_*.md do plans02. Docs só-H1 (sem "## Identidade") são ESQUELETO:
// listados no relatório como pendentes de detalhamento e ignorados pelas checagens.
// Escreve: docs/plans02/_diagnostico02.md (gerado — nunca editar à mão). Sai 0 se tudo passa.
// Adaptado de docs/plans/check_plans.mjs; as checagens de nós/telas/linha-verde/seam/eixos da
// geração 1 NÃO se aplicam aqui (o plans02 não tem mermaid próprio nem glossário de nós).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLANS = __dirname
const p = (...a) => path.join(...a)
const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
// remove blocos de código cercados (```...```) antes de qualquer parsing — exemplos JSON não são doc
const semCercas = (s) => s.replace(/```[\s\S]*?```/g, '')

// ---------- coleta de docs ----------
const faseOf = (id) => parseInt(id.slice(4, 6), 10)
const docs = {}           // id -> {id, file, fase, sections[], ident:{id,classe}, deps[], links[], nomesSpans[], body}
const docIds = new Set()  // todos (detalhados + esqueleto): alvo válido de link
const esqueleto = []      // ids só-H1, fora do gate
for (const dir of fs.readdirSync(PLANS)) {
  const m = dir.match(/^fase(\d\d)_/)
  if (!m) continue
  const faseNum = m[1]
  for (const fn of fs.readdirSync(p(PLANS, dir))) {
    const fm = fn.match(/^(\d\d-\d\d)_.+\.md$/)
    if (!fm) continue
    const id = `fase${faseNum}-${fm[1]}`
    const raw = read(p(PLANS, dir, fn)) || ''
    docIds.add(id)
    const body = semCercas(raw)
    const sections = []
    for (const line of body.split('\n')) {
      const h = line.match(/^##\s+(.+?)\s*$/)
      if (h) sections.push(norm(h[1]))
    }
    if (!sections.includes('identidade')) { esqueleto.push(id); continue }
    const d = { id, file: `${dir}/${fn}`, fase: parseInt(faseNum, 10), body, sections, ident: {}, deps: [], links: [], nomesSpans: [] }
    const idM = body.match(/-\s*id:\s*`?([a-z0-9-]+)`?/i)
    d.ident.id = idM ? idM[1] : null
    const clM = body.match(/-\s*classe:\s*([a-z0-9]+|—|-)/i)
    d.ident.classe = clM ? clM[1].toLowerCase() : null
    // links (todos) e deps (só seção Pré-requisitos / Depende de)
    let mm
    const linkRe = /\[\[([^\]]+)\]\]/g
    while ((mm = linkRe.exec(body))) d.links.push(mm[1].trim())
    const blocos = body.split(/^##\s+/m)
    const depSec = blocos.find((s) => norm(s.split('\n')[0]).startsWith('pre-requisitos'))
    if (depSec) { let dm; const r = /\[\[([^\]]+)\]\]/g; while ((dm = r.exec(depSec))) d.deps.push(dm[1].trim()) }
    // spans de código da seção "Nomes & variáveis" (declaração de nomes canônicos)
    const nomesSec = blocos.find((s) => norm(s.split('\n')[0]).startsWith('nomes'))
    if (nomesSec) { let nm; const r = /`([^`\n]+)`/g; while ((nm = r.exec(nomesSec))) d.nomesSpans.push(nm[1]) }
    docs[id] = d
  }
}

// resolvedor de link — SÓ dentro do plans02
const ROOTDOCS02 = new Set(['check_plans02', '_template', 'readme', '_diagnostico02', 'trilha-plans02'])
function resolveLink(raw) {
  let s = raw.trim().replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')
  const fm = s.match(/fase(\d\d)[-/](\d\d-\d\d)/)
  if (fm) { const id = `fase${fm[1]}-${fm[2]}`; return { ok: docIds.has(id) } }
  const base = s.split('/').pop().replace(/\.md$/, '').toLowerCase()
  return { ok: ROOTDOCS02.has(base) }
}

// ---------- checagens ----------
const checks = []
const add = (nome, falhas, detalhe = '') => checks.push({ nome, ok: falhas.length === 0, falhas, detalhe })

// C1. Conformidade de template — todas as seções, NA ORDEM (as extras são permitidas)
{
  const REQ = ['identidade', 'objetivo', 'pre-requisitos / depende de', 'arquivos afetados', 'nomes & variaveis',
    'interfaces / contratos', 'regras de negocio', 'passos de implementacao', 'estados / edge-cases',
    'criterios de aceitacao / verificacao', 'relacoes com outros docs']
  const f = []
  for (const d of Object.values(docs)) {
    const faltam = REQ.filter((s) => !d.sections.includes(s))
    if (faltam.length) { f.push(`${d.id}: seções faltando → ${faltam.join(' | ')}`); continue }
    // ordem relativa: cada seção requerida deve vir depois da anterior
    let cursor = -1, foraDeOrdem = null
    for (const s of REQ) {
      const i = d.sections.indexOf(s)
      if (i < cursor) { foraDeOrdem = s; break }
      cursor = i
    }
    if (foraDeOrdem) f.push(`${d.id}: seção fora de ordem → ${foraDeOrdem}`)
  }
  add('C1. Conformidade de template (seções, na ordem)', f, `${REQ.length} seções requeridas`)
}

// C2. Resolução de [[links]] — só dentro do plans02
{
  const f = []
  for (const d of Object.values(docs)) for (const l of d.links) if (!resolveLink(l).ok) f.push(`LINK QUEBRADO: ${d.id} → [[${l}]]`)
  add('C2. Resolução de [[links]] (escopo plans02)', f)
}

// C3. Sem dependência para frente / sem ciclo (deps da seção Pré-requisitos)
{
  const f = []
  const edges = []  // [a, b] : a depende de b
  for (const d of Object.values(docs)) for (const dep of d.deps) {
    const fm = dep.replace(/^(\.\.\/)+/, '').match(/fase(\d\d)[-/](\d\d-\d\d)/)
    if (!fm) { f.push(`DEP NÃO RESOLVE: ${d.id} → [[${dep}]]`); continue }
    const b = `fase${fm[1]}-${fm[2]}`
    if (!docIds.has(b)) { f.push(`DEP INEXISTENTE: ${d.id} → ${b}`); continue }
    if (faseOf(b) > d.fase) f.push(`DEPENDÊNCIA PARA FRENTE: ${d.id} depende de ${b} (fase maior)`)
    edges.push([d.id, b])
  }
  const adj = {}; for (const [a, b] of edges) (adj[a] ||= []).push(b)
  const state = {}; const stack = []
  const dfs = (u) => {
    state[u] = 1; stack.push(u)
    for (const v of adj[u] || []) {
      if (state[v] === 1) f.push(`CICLO DETECTADO: ${stack.slice(stack.indexOf(v)).join(' → ')} → ${v}`)
      else if (!state[v]) dfs(v)
    }
    stack.pop(); state[u] = 2
  }
  for (const id of Object.keys(docs)) if (!state[id]) dfs(id)
  add('C3. Ordem de dependências (sem forward, sem ciclo)', f, `${edges.length} arestas`)
}

// C4. Nomes canônicos — identificador declarado em "Nomes & variáveis" deve ter grafia idêntica em todo doc
{
  const f = []
  const canon = {}  // norm(nome) -> { grafia, doc }
  for (const d of Object.values(docs)) for (const span of d.nomesSpans) {
    const k = norm(span)
    if (!k) continue
    if (canon[k] && canon[k].grafia !== span) f.push(`DECLARAÇÃO CONFLITANTE: "${span}" (${d.id}) vs "${canon[k].grafia}" (${canon[k].doc})`)
    else if (!canon[k]) canon[k] = { grafia: span, doc: d.id }
  }
  const spanRe = /`([^`\n]+)`/g
  for (const d of Object.values(docs)) {
    let mm
    spanRe.lastIndex = 0
    while ((mm = spanRe.exec(d.body))) {
      const span = mm[1], k = norm(span)
      const c = canon[k]
      if (c && span !== c.grafia) f.push(`GRAFIA DIVERGENTE: ${d.id} usa "${span}"; canônico é "${c.grafia}" (declarado em ${c.doc})`)
    }
  }
  add('C4. Nomes canônicos (grafia idêntica)', f, `${Object.keys(canon).length} nomes declarados`)
}

// C5. Ids e nomes de arquivo coerentes
{
  const f = []
  for (const d of Object.values(docs)) {
    if (!d.ident.id) f.push(`${d.id}: sem "- id:" na Identidade`)
    else if (d.ident.id !== d.id) f.push(`${d.id}: id na Identidade (${d.ident.id}) difere do arquivo`)
  }
  add('C5. Ids e nomes de arquivo coerentes', f)
}

// ---------- relatório ----------
const nDet = Object.keys(docs).length
const passN = checks.filter((c) => c.ok).length
const allOk = passN === checks.length
const linha = []
linha.push('# Diagnóstico de integridade — plans02 (geração 2, fases 10–14)', '')
linha.push('Gerado por `node docs/plans02/check_plans02.mjs` — **nunca editar à mão**.', '')
linha.push(`- Docs detalhados (no gate): **${nDet}**`)
linha.push(`- Docs esqueleto (só H1, fora do gate): **${esqueleto.length}**`)
linha.push(`- Checagens: **${passN}/${checks.length} PASS**`)
linha.push(`- Resultado: ${allOk ? '✅ **TUDO VERDE**' : '❌ **HÁ FALHAS**'}`, '')
linha.push('| # | Checagem | Status | Falhas |', '|---|----------|--------|--------|')
for (const c of checks) linha.push(`| ${c.nome.split('.')[0]} | ${c.nome.replace(/^C\d+\.\s*/, '')} | ${c.ok ? '✅ PASS' : '❌ FAIL'} | ${c.falhas.length} |`)
linha.push('')
for (const c of checks) {
  linha.push(`## ${c.nome} — ${c.ok ? 'PASS' : 'FAIL'}${c.detalhe ? ` _(${c.detalhe})_` : ''}`)
  if (c.ok) linha.push('Sem problemas.', '')
  else { for (const x of c.falhas) linha.push(`- ${x}`); linha.push('') }
}
linha.push('## Esqueleto (pendente de detalhamento)')
if (esqueleto.length) for (const id of esqueleto.sort()) linha.push(`- ${id}`)
else linha.push('Nenhum — todos os docs estão detalhados.')
linha.push('')
fs.writeFileSync(p(PLANS, '_diagnostico02.md'), linha.join('\n'))

// console resumo
console.log(`\nDiagnóstico plans02 — ${passN}/${checks.length} checagens PASS · ${nDet} docs detalhados · ${esqueleto.length} esqueleto`)
for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.nome}${c.ok ? '' : ` (${c.falhas.length} falhas)`}`)
console.log(`\nRelatório: docs/plans02/_diagnostico02.md`)
process.exitCode = allOk ? 0 : 1
