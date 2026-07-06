#!/usr/bin/env node
// check_plans.mjs — diagnóstico de integridade dos planos faseados do Pipoca.
// Uso: node docs/plans/check_plans.mjs
// Lê: o mermaid v2.0, todos os faseXX/*.md, _contratos/glossario.md, os tipos canônicos em src/ e quintal_grafo.json.
// Escreve: docs/plans/_diagnostico.md. Sai com código 0 se todas as checagens passam.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLANS = __dirname
const ROOT = path.resolve(PLANS, '..', '..')
const p = (...a) => path.join(...a)
const read = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// ---------- coletas de entrada ----------
const mermaid = read(p(ROOT, 'docs', 'arquitetura_pipoca_versao_2_0.mermaid')) || ''
// Tipos canônicos: a fase00-00-01 moveu motor_a.ts da raiz para src/motores/ e dividiu os tipos
// em src/core/grafo/tipos.ts + src/motores/contrato.ts. Lê os três (com fallback ao layout antigo).
const motorTs = [
  read(p(ROOT, 'src', 'core', 'grafo', 'tipos.ts')),
  read(p(ROOT, 'src', 'motores', 'motor_a.ts')),
  read(p(ROOT, 'src', 'motores', 'contrato.ts')),
  read(p(ROOT, 'motor_a.ts')),
].filter(Boolean).join('\n')
const grafoJson = read(p(ROOT, 'src', 'dados', 'quintal_grafo.json')) || read(p(ROOT, 'docs', 'quintal_grafo.json')) || ''
const gloss = read(p(PLANS, '_contratos', 'glossario.md')) || ''

// nós + classes do mermaid
const mermaidNodes = new Set()
const nodeClass = {}
for (const line of mermaid.split('\n')) {
  const t = line.trim()
  if (t.startsWith('subgraph')) continue
  const def = t.match(/^([A-Z][A-Z0-9_]*)\s*[[(]/)
  if (def) mermaidNodes.add(def[1])
  const cm = t.match(/^class\s+([A-Z0-9_,\s]+?)\s+(mvp|f2|pivot|admin)\s*;?\s*$/)
  if (cm) for (const id of cm[1].split(',').map((s) => s.trim()).filter(Boolean)) nodeClass[id] = cm[2]
}

// owner table do glossário: NÓ | classe | dono(faseFF-FF-NN)
const owner = {}          // no -> [donoId...]
for (const line of gloss.split('\n')) {
  const cols = line.split('|').map((s) => s.trim())
  if (cols.length >= 5) {
    const no = cols[1], dono = cols[3]
    if (/^[A-Z][A-Z0-9_]*$/.test(no) && /^fase\d\d-\d\d-\d\d$/.test(dono)) (owner[no] ||= []).push(dono)
  }
}

// ---------- coleta de docs ----------
const faseOf = (id) => parseInt(id.slice(4, 6), 10)
const docs = {}           // id -> {id, file, fase, sections:Set, ident:{id,nos[],telas[],classe}, deps[], links[], raw}
const docIds = new Set()
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
    docs[id] = { id, file: `${dir}/${fn}`, fase: parseInt(faseNum, 10), raw, sections: new Set(), ident: {}, deps: [], links: [] }
  }
}

// parse de cada doc
const linkRe = /\[\[([^\]]+)\]\]/g
for (const d of Object.values(docs)) {
  for (const line of d.raw.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/)
    if (h) d.sections.add(norm(h[1]))
  }
  // Identidade
  const idM = d.raw.match(/-\s*id:\s*`?([a-z0-9-]+)`?/i)
  d.ident.id = idM ? idM[1] : null
  const noM = d.raw.match(/-\s*n[óo]\(s\)[^:]*:\s*(.+)/i)
  d.ident.nos = noM ? noM[1].split(/[,·]/).map((s) => s.trim()).filter((s) => /^[A-Z][A-Z0-9_]*$/.test(s)) : []
  const telaM = d.raw.match(/-\s*tela\(s\)[^:]*:\s*(.+)/i)
  d.ident.telas = telaM ? (telaM[1].match(/\d+/g) || []).map(Number).filter((n) => n >= 1 && n <= 8) : []
  const clM = d.raw.match(/-\s*classe:\s*([a-z0-9]+|—|-)/i)
  d.ident.classe = clM ? clM[1].toLowerCase() : null
  // links (todos) e deps (só seção Pré-requisitos / Depende de)
  let mm
  while ((mm = linkRe.exec(d.raw))) d.links.push(mm[1].trim())
  const depSec = d.raw.split(/^##\s+/m).find((s) => norm(s.split('\n')[0]).startsWith('pre-requisitos'))
  if (depSec) { let dm; const r = /\[\[([^\]]+)\]\]/g; while ((dm = r.exec(depSec))) d.deps.push(dm[1].trim()) }
}

// resolvedor de link -> id de doc OU nome de contrato/raiz
const CONTRACTS = new Set(['tipos-core', 'schemas-json', 'eventos-acoes', 'convencoes-dc-runtime', 'lei-do-contrato', 'glossario', 'grafo-autoral-v3'])
const ROOTDOCS = new Set(['check_plans', '_template', 'readme', '_diagnostico'])
function resolveLink(raw) {
  let s = raw.trim().replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')
  const fm = s.match(/fase(\d\d)[-/](\d\d-\d\d)/)
  if (fm) { const id = `fase${fm[1]}-${fm[2]}`; return docIds.has(id) ? { ok: true } : { ok: false } }
  s = s.replace(/^_contratos\//, '')
  const base = s.split('/').pop().replace(/\.md$/, '').toLowerCase()
  if (CONTRACTS.has(base) || ROOTDOCS.has(base)) return { ok: true }
  return { ok: false }
}

// ---------- checagens ----------
const checks = []
const add = (nome, falhas, detalhe = '') => checks.push({ nome, ok: falhas.length === 0, falhas, detalhe })

// 1. Cobertura de nós (glossário ↔ mermaid) + dono existe + dono lista o nó
{
  const f = []
  for (const n of mermaidNodes) {
    const ds = owner[n]
    if (!ds || ds.length === 0) f.push(`NÓ SEM DONO: ${n}`)
    else if (ds.length > 1) f.push(`DONO DUPLICADO: ${n} → ${ds.join(', ')}`)
    else if (!docIds.has(ds[0])) f.push(`DONO INEXISTENTE: ${n} → ${ds[0]} (arquivo não encontrado)`)
    else if (!(docs[ds[0]].ident.nos || []).includes(n)) f.push(`DONO NÃO DECLARA O NÓ: ${ds[0]} deveria listar ${n} em Identidade`)
  }
  for (const n of Object.keys(owner)) if (!mermaidNodes.has(n)) f.push(`NÓ DO GLOSSÁRIO NÃO EXISTE NO MERMAID: ${n}`)
  // nó citado em Identidade que não existe no mermaid
  for (const d of Object.values(docs)) for (const n of d.ident.nos) if (!mermaidNodes.has(n)) f.push(`${d.id}: nó inexistente na arquitetura: ${n}`)
  add('1. Cobertura de nós', f, `${mermaidNodes.size} nós no mermaid`)
}

// 2. Cobertura de telas do brief (1..8)
{
  const cobertas = new Set()
  for (const d of Object.values(docs)) for (const t of d.ident.telas) cobertas.add(t)
  const f = []
  for (let t = 1; t <= 8; t++) if (!cobertas.has(t)) f.push(`TELA SEM DOC: ${t}`)
  add('2. Cobertura de telas do brief', f, `telas cobertas: ${[...cobertas].sort((a, b) => a - b).join(',')}`)
}

// 3. Linha verde (nós class mvp) com dono em fase00/01/02
{
  const f = []
  for (const [n, c] of Object.entries(nodeClass)) {
    if (c !== 'mvp') continue
    const ds = owner[n]
    if (!ds || !docIds.has(ds[0])) { f.push(`LINHA VERDE INCOMPLETA: ${n} sem dono`); continue }
    const fa = faseOf(ds[0])
    if (![0, 1, 2].includes(fa)) f.push(`LINHA VERDE FORA DAS FASES 00–02: ${n} → ${ds[0]}`)
  }
  add('3. Linha verde completa', f)
}

// 4. Resolução de links
{
  const f = []
  for (const d of Object.values(docs)) for (const l of d.links) if (!resolveLink(l).ok) f.push(`LINK QUEBRADO: ${d.id} → [[${l}]]`)
  add('4. Resolução de referências', f)
}

// 5. Nomes canônicos (schemas, Motor*, congelados no código)
{
  // pipoca.grafo-autoral.v2 = composição autoral (src/core/composicao.ts · docs/quintal.v2.json),
  // citado no selo SUPERSEDED de fase00-00-20.
  const SCHEMAS = new Set(['pipoca.grafo-autoral.v1', 'pipoca.grafo-autoral.v2', 'pipoca.grafo-autoral.v3', 'pipoca.perfil.v1', 'pipoca.save.v1', 'pipoca.telemetria.v1', 'pipoca.tenant.v1'])
  const MOTORS = new Set(['MotorNarrativa', 'MotorGrafoAutoral', 'MotorIA'])
  const f = []
  for (const d of Object.values(docs)) {
    for (const sm of d.raw.match(/pipoca\.[a-z-]+\.v\d/g) || []) if (!SCHEMAS.has(sm)) f.push(`SCHEMA DESCONHECIDO: ${d.id} → ${sm}`)
    for (const tk of d.raw.match(/\bMotor[A-Z][A-Za-z]*/g) || []) if (!MOTORS.has(tk)) f.push(`NOME DE MOTOR INVÁLIDO: ${d.id} → ${tk}`)
  }
  if (!/MotorNarrativa/.test(motorTs)) f.push('CÓDIGO: MotorNarrativa ausente em src/ (tipos/motor)')
  if (!/interface Trecho/.test(motorTs)) f.push('CÓDIGO: Trecho ausente em src/ (tipos/motor)')
  if (!/GrafoAutoral/.test(motorTs)) f.push('CÓDIGO: GrafoAutoral ausente em src/ (tipos/motor)')
  if (!/pipoca\.grafo-autoral\.v1/.test(grafoJson)) f.push('CÓDIGO: pipoca.grafo-autoral.v1 ausente em quintal_grafo.json')
  add('5. Resolução de nomes', f)
}

// 6. Ordem de dependências (sem forward de fase, sem ciclo)
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
  // ciclo via DFS
  const adj = {}; for (const [a, b] of edges) (adj[a] ||= []).push(b)
  const state = {}; const stack = []
  const dfs = (u) => {
    state[u] = 1; stack.push(u)
    for (const v of adj[u] || []) {
      if (state[v] === 1) { f.push(`CICLO DETECTADO: ${stack.slice(stack.indexOf(v)).join(' → ')} → ${v}`); }
      else if (!state[v]) dfs(v)
    }
    stack.pop(); state[u] = 2
  }
  for (const id of docIds) if (!state[id]) dfs(id)
  add('6. Ordem de dependências', f, `${edges.length} arestas`)
}

// 7. Lei do seam (fase01 não cita MotorGrafoAutoral/MotorIA)
{
  const f = []
  for (const d of Object.values(docs)) if (d.fase === 1) {
    if (/\bMotorGrafoAutoral\b/.test(d.raw)) f.push(`VIOLAÇÃO DO CONTRATO: ${d.id} cita MotorGrafoAutoral`)
    if (/\bMotorIA\b/.test(d.raw)) f.push(`VIOLAÇÃO DO CONTRATO: ${d.id} cita MotorIA`)
  }
  add('7. Auditoria do seam', f)
}

// 8. Reconciliação: docs do conjunto-tira linkam [[fase00-00-20]]
{
  const TIRA = ['fase00-00-09', 'fase00-00-16', 'fase00-00-17', 'fase00-00-18', 'fase01-01-05', 'fase01-01-06', 'fase01-01-08', 'fase01-01-10']
  const f = []
  for (const id of TIRA) {
    if (!docIds.has(id)) { f.push(`RECONCILIAÇÃO: doc do conjunto-tira ausente: ${id}`); continue }
    const liga = docs[id].links.some((l) => /fase00[-/]00-20/.test(l.replace(/^(\.\.\/)+/, '')))
    if (!liga) f.push(`RECONCILIAÇÃO FALTANDO: ${id} não linka [[fase00-00-20]]`)
  }
  add('8. Auditoria da reconciliação', f)
}

// 9. Conformidade de template (todas as seções)
{
  const REQ = ['identidade', 'objetivo', 'pre-requisitos / depende de', 'arquivos afetados', 'nomes & variaveis',
    'interfaces / contratos', 'regras de negocio', 'passos de implementacao', 'estados / edge-cases',
    'criterios de aceitacao / verificacao', 'relacoes com outros docs']
  const f = []
  for (const d of Object.values(docs)) {
    const faltam = REQ.filter((s) => !d.sections.has(s))
    if (faltam.length) f.push(`${d.id}: seções faltando → ${faltam.join(' | ')}`)
    if (d.ident.id && d.ident.id !== d.id) f.push(`${d.id}: id na Identidade (${d.ident.id}) difere do arquivo`)
  }
  add('9. Conformidade de template', f)
}

// 10. Dois eixos (CN/AIPROV pivot; f2 só na fase05)
{
  const f = []
  for (const pv of ['CN', 'AIPROV']) {
    const ds = owner[pv]
    if (ds && docIds.has(ds[0]) && docs[ds[0]].ident.classe !== 'pivot') f.push(`PIVOT NÃO MARCADO: ${pv} (${ds[0]}) classe=${docs[ds[0]].ident.classe}`)
  }
  for (const [n, c] of Object.entries(nodeClass)) {
    if (c !== 'f2') continue
    const ds = owner[n]
    if (ds && docIds.has(ds[0]) && faseOf(ds[0]) !== 5) f.push(`NÓ f2 FORA DA FASE 5: ${n} → ${ds[0]}`)
  }
  add('10. Consistência dos 2 eixos', f)
}

// ---------- relatório ----------
const totalDocs = docIds.size
const passN = checks.filter((c) => c.ok).length
const allOk = passN === checks.length
const linha = []
linha.push('# Diagnóstico de integridade — planos faseados do Pipoca', '')
linha.push(`Gerado por \`node docs/plans/check_plans.mjs\`.`, '')
linha.push(`- Docs de sub-passo encontrados: **${totalDocs}**`)
linha.push(`- Nós no mermaid: **${mermaidNodes.size}**`)
linha.push(`- Checagens: **${passN}/${checks.length} PASS**`)
linha.push(`- Resultado: ${allOk ? '✅ **TUDO VERDE**' : '❌ **HÁ FALHAS**'}`, '')
linha.push('| # | Checagem | Status | Falhas |', '|---|----------|--------|--------|')
for (const c of checks) linha.push(`| ${c.nome.split('.')[0]} | ${c.nome.replace(/^\d+\.\s*/, '')} | ${c.ok ? '✅ PASS' : '❌ FAIL'} | ${c.falhas.length} |`)
linha.push('')
for (const c of checks) {
  linha.push(`## ${c.nome} — ${c.ok ? 'PASS' : 'FAIL'}${c.detalhe ? ` _(${c.detalhe})_` : ''}`)
  if (c.ok) linha.push('Sem problemas.', '')
  else { for (const x of c.falhas) linha.push(`- ${x}`); linha.push('') }
}
fs.writeFileSync(p(PLANS, '_diagnostico.md'), linha.join('\n'))

// console resumo
console.log(`\nDiagnóstico Pipoca — ${passN}/${checks.length} checagens PASS · ${totalDocs} docs · ${mermaidNodes.size} nós`)
for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.nome}${c.ok ? '' : ` (${c.falhas.length} falhas)`}`)
console.log(`\nRelatório: docs/plans/_diagnostico.md`)
process.exitCode = allOk ? 0 : 1
