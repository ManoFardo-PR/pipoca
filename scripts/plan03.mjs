#!/usr/bin/env node
/**
 * [plan03.mjs] — Monitor do Plan03 (docs/Plan03): onde o trabalho está, qual é o próximo
 *   passo, o que está bloqueado e se o repo está coerente com o plano.
 *
 * PAPEL: ferramenta de processo (não entra em nenhum bundle; sem dependências).
 * FONTES DE ESTADO (nunca memória): (a) a linha `> Status:` de cada subtarefa .md;
 *   (b) docs/Plan03/status.json (passos sem arquivo + última verificação);
 *   (c) docs/Plan03/plan03.graph.json (passos, dependências, gates); (d) git/filesystem.
 * USO:
 *   node scripts/plan03.mjs init                 # insere `> Status: pendente` nos .md (idempotente)
 *   node scripts/plan03.mjs status               # painel + alertas; regenera docs/Plan03/STATUS.md
 *   node scripts/plan03.mjs proximo              # só o próximo passo
 *   node scripts/plan03.mjs iniciar <ID>         # marca em andamento (checa deps e branch)
 *   node scripts/plan03.mjs concluir <ID> [hash] [--commit]   # marca concluída (exige árvore limpa)
 *   node scripts/plan03.mjs bloquear <ID> "motivo"
 *   node scripts/plan03.mjs reabrir <ID>         # volta a pendente (desfaz iniciar/concluir/bloquear)
 *   node scripts/plan03.mjs verificar [--e2e]    # tsc + npm test (+ 4 e2e); grava em status.json
 *   node scripts/plan03.mjs gate <A|B|C|D|E>     # checks automatizáveis da definição de pronto
 *   node scripts/plan03.mjs relatorio            # 5 linhas para colar no chat/PR
 *   (--forcar ignora deps/branch em iniciar/concluir)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAN = path.join(ROOT, "docs", "Plan03");
const GRAPH = path.join(PLAN, "plan03.graph.json");
const STATUS_JSON = path.join(PLAN, "status.json");
const STATUS_MD = path.join(PLAN, "STATUS.md");
const DECISOES = path.join(PLAN, "01-PLANO-DE-EXECUCAO.md");

const hoje = () => new Date().toISOString().slice(0, 10);
const args = process.argv.slice(2);
const cmd = args[0] || "status";
const flag = (f) => args.includes(f);

// ── git ───────────────────────────────────────────────────────────────────────
function git(cmdline) {
  try { return execSync("git " + cmdline, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}
const branchAtual = () => git("rev-parse --abbrev-ref HEAD");
const arvoreSuja = () => (git("status --porcelain") || "").split("\n").filter(Boolean);
const headCurto = () => git("rev-parse --short HEAD");
function ultimoCommitTs(caminhos) {
  const out = git("log -1 --format=%ct -- " + caminhos.map((c) => JSON.stringify(c)).join(" "));
  return out ? Number(out) : 0;
}

// ── grafo e estado ────────────────────────────────────────────────────────────
const grafo = JSON.parse(readFileSync(GRAPH, "utf8"));
const passos = grafo.passos;
const porId = new Map(passos.map((p) => [p.id, p]));

function lerStatusJson() {
  if (!existsSync(STATUS_JSON)) return { esquema: "pipoca.plan03-status.v1", passos: {}, verificacao: null };
  return JSON.parse(readFileSync(STATUS_JSON, "utf8"));
}
function gravarStatusJson(s) { writeFileSync(STATUS_JSON, JSON.stringify(s, null, 2) + "\n"); }

const RE_STATUS = /^> Status:\s*(.*?)\s*$/m;
function parseStatus(texto) {
  const t = (texto || "pendente").trim();
  let m;
  if (/^pendente$/i.test(t)) return { status: "pendente" };
  if ((m = /^em andamento\s*\((\d{4}-\d{2}-\d{2})\)/i.exec(t))) return { status: "em andamento", data: m[1] };
  if ((m = /^conclu[ií]da\s*\((\d{4}-\d{2}-\d{2})(?:\s*[·-]\s*([0-9a-f]{6,40}))?\)/i.exec(t))) return { status: "concluída", data: m[1], hash: m[2] || null };
  if ((m = /^bloqueada:\s*(.+)$/i.exec(t))) return { status: "bloqueada", motivo: m[1] };
  return { status: "malformado", bruto: t };
}
function formatStatus(s) {
  if (s.status === "pendente") return "pendente";
  if (s.status === "em andamento") return `em andamento (${s.data})`;
  if (s.status === "concluída") return `concluída (${s.data}${s.hash ? " · " + s.hash : ""})`;
  if (s.status === "bloqueada") return `bloqueada: ${s.motivo}`;
  return s.bruto || "pendente";
}
function arquivoDe(p) { return p.arquivo ? path.join(PLAN, p.arquivo) : null; }

function lerEstado() {
  const sj = lerStatusJson();
  const estado = new Map();
  const problemas = [];
  for (const p of passos) {
    if (p.arquivo) {
      const f = arquivoDe(p);
      if (!existsSync(f)) { estado.set(p.id, { status: "malformado", bruto: "arquivo ausente" }); problemas.push(`${p.id}: arquivo ausente (${p.arquivo})`); continue; }
      const m = RE_STATUS.exec(readFileSync(f, "utf8"));
      if (!m) { estado.set(p.id, { status: "pendente", semLinha: true }); problemas.push(`${p.id}: sem linha "> Status:" — rode \`init\``); continue; }
      const s = parseStatus(m[1]);
      if (s.status === "malformado") problemas.push(`${p.id}: status malformado ("${s.bruto}")`);
      estado.set(p.id, s);
    } else {
      estado.set(p.id, sj.passos[p.id] ? parseStatus(sj.passos[p.id]) : { status: "pendente" });
    }
  }
  return { estado, problemas, sj };
}

function gravarStatus(p, s, sj) {
  if (p.arquivo) {
    const f = arquivoDe(p);
    let txt = readFileSync(f, "utf8");
    const linha = `> Status: ${formatStatus(s)}`;
    txt = RE_STATUS.test(txt) ? txt.replace(RE_STATUS, linha) : inserirLinha(txt, linha);
    writeFileSync(f, txt);
  } else {
    sj.passos[p.id] = formatStatus(s);
    gravarStatusJson(sj);
  }
}
function inserirLinha(txt, linha) {
  const nl = txt.includes("\r\n") ? "\r\n" : "\n";
  const linhas = txt.split(nl);
  const i = linhas.findIndex((l) => l.startsWith("# "));
  if (i < 0) return linha + nl + nl + txt;
  linhas.splice(i + 1, 0, "", linha);
  return linhas.join(nl);
}

const concluido = (estado, id) => estado.get(id)?.status === "concluída";
function disponiveis(estado) {
  return passos.filter((p) => estado.get(p.id)?.status === "pendente" && p.deps.every((d) => concluido(estado, d)));
}
function branchEsperada(p) { return p.branch || grafo.ondas[p.onda].branch; }

// ── alertas de coerência ─────────────────────────────────────────────────────
function decisoesSemCarimbo() {
  if (!existsSync(DECISOES)) return [];
  const linhas = readFileSync(DECISOES, "utf8").split(/\r?\n/);
  const semCarimbo = [];
  let dentroDaFolha = false;
  for (const l of linhas) {
    if (/^## 1\./.test(l)) dentroDaFolha = true;
    else if (/^## /.test(l)) dentroDaFolha = false;
    if (!dentroDaFolha) continue;
    if (!/^\|\s*[A-Z]\d/.test(l)) continue;
    if (/decis[aã]o confirmada/i.test(l)) continue;
    const cols = l.split("|").map((c) => c.trim()).filter(Boolean);
    semCarimbo.push(`${cols[0]}: ${(cols[1] || "").slice(0, 60)}`);
  }
  return semCarimbo;
}
function bundlesDesatualizados() {
  const out = [];
  for (const [bundle, fontes] of Object.entries(grafo.bundles)) {
    const tb = ultimoCommitTs([bundle]);
    const tf = ultimoCommitTs(fontes);
    if (tf > tb) out.push(`${bundle} é mais antigo que ${fontes.join(", ")} (rebuild pendente)`);
  }
  return out;
}
function alertas(estado, problemas) {
  const a = [...problemas];
  for (const p of passos) {
    if (concluido(estado, p.id)) for (const d of p.deps) if (!concluido(estado, d)) a.push(`${p.id} concluída mas depende de ${d} (${estado.get(d)?.status})`);
  }
  const prox = disponiveis(estado)[0];
  const br = branchAtual();
  if (prox && br && br !== branchEsperada(prox)) a.push(`branch atual "${br}" ≠ esperada para ${prox.id} ("${branchEsperada(prox)}")`);
  const sujos = arvoreSuja();
  if (sujos.length) a.push(`árvore suja (${sujos.length} arquivo(s)) — commite antes de concluir um passo`);
  for (const b of bundlesDesatualizados()) a.push(b);
  const dec = decisoesSemCarimbo();
  if (dec.length) a.push(`decisões sem "decisão confirmada" na folha: ${dec.join(" · ")}`);
  return a;
}

// ── painel ───────────────────────────────────────────────────────────────────
const ICONE = { "pendente": "[ ]", "em andamento": "[…]", "concluída": "[✓]", "bloqueada": "[!]", "malformado": "[?]" };
function painel(estado, problemas, sj) {
  const linhas = [];
  const tot = passos.length, feitos = passos.filter((p) => concluido(estado, p.id)).length;
  const prox = disponiveis(estado);
  linhas.push(`Plan03 — ${feitos}/${tot} passos concluídos · branch: ${branchAtual() || "?"} · HEAD: ${headCurto() || "?"} · ${hoje()}`);
  if (sj.verificacao) {
    const v = sj.verificacao;
    const h = Math.round((Date.now() - new Date(v.quando).getTime()) / 36e5);
    linhas.push(`Última verificação: ${v.ok ? "VERDE" : "VERMELHA"} há ${h} h (${v.resumo})`);
  } else linhas.push("Última verificação: nenhuma — rode `verificar`");
  linhas.push(prox.length ? `Próximo: ${prox[0].id} — ${prox[0].titulo}${prox[0].arquivo ? " → docs/Plan03/" + prox[0].arquivo : ""}` : (feitos === tot ? "Próximo: — plano concluído" : "Próximo: nenhum disponível (veja bloqueios)"));
  if (prox.length > 1) linhas.push(`Também disponíveis (∥): ${prox.slice(1).map((p) => p.id).join(", ")}`);
  const al = alertas(estado, problemas);
  linhas.push(al.length ? "Alertas:\n" + al.map((x) => "  ! " + x).join("\n") : "Alertas: nenhum");
  linhas.push("");
  for (const [k, o] of Object.entries(grafo.ondas)) {
    const ps = passos.filter((p) => p.onda === k);
    const ok = ps.filter((p) => concluido(estado, p.id)).length;
    linhas.push(`Onda ${k} — ${o.nome} (${ok}/${ps.length}) · branch ${o.branch} · deploy ${o.deploy}`);
    for (const p of ps) {
      const s = estado.get(p.id);
      const extra = s.status === "concluída" ? ` (${s.data}${s.hash ? " · " + s.hash : ""})` : s.status === "em andamento" ? ` (desde ${s.data})` : s.status === "bloqueada" ? ` — ${s.motivo}` : "";
      linhas.push(`  ${ICONE[s.status] || "[?]"} ${p.id.padEnd(5)} ${p.titulo}${p.paralelo ? " ∥" : ""}${extra}`);
    }
  }
  return linhas.join("\n");
}
function statusMd(estado, problemas, sj) {
  const tot = passos.length, feitos = passos.filter((p) => concluido(estado, p.id)).length;
  const prox = disponiveis(estado);
  const al = alertas(estado, problemas);
  const out = [];
  out.push(`# STATUS — Plan03 (gerado por \`scripts/plan03.mjs\`; não editar à mão)`, "");
  out.push(`- Gerado em: ${new Date().toISOString()} · branch \`${branchAtual() || "?"}\` · HEAD \`${headCurto() || "?"}\``);
  out.push(`- Progresso: **${feitos}/${tot}** passos concluídos`);
  out.push(`- Próximo passo: ${prox.length ? `**${prox[0].id}** — ${prox[0].titulo}${prox[0].arquivo ? ` ([abrir](${prox[0].arquivo}))` : ""}` : (feitos === tot ? "plano concluído" : "nenhum disponível")}`);
  if (prox.length > 1) out.push(`- Também disponíveis (∥): ${prox.slice(1).map((p) => p.id).join(", ")}`);
  out.push(`- Última verificação: ${sj.verificacao ? `${sj.verificacao.ok ? "✅ verde" : "❌ vermelha"} em ${sj.verificacao.quando} (${sj.verificacao.resumo})` : "nenhuma"}`);
  out.push(`- Alertas: ${al.length ? "" : "nenhum"}`);
  for (const x of al) out.push(`  - ⚠ ${x}`);
  out.push("");
  for (const [k, o] of Object.entries(grafo.ondas)) {
    const ps = passos.filter((p) => p.onda === k);
    const ok = ps.filter((p) => concluido(estado, p.id)).length;
    out.push(`## Onda ${k} — ${o.nome} · ${ok}/${ps.length} · branch \`${o.branch}\` · ${o.deploy}`, "");
    out.push("| Passo | Título | Status | Data | Commit |", "|---|---|---|---|---|");
    for (const p of ps) {
      const s = estado.get(p.id);
      const titulo = p.arquivo ? `[${p.titulo}](${p.arquivo})` : p.titulo;
      out.push(`| ${p.id} | ${titulo}${p.paralelo ? " ∥" : ""} | ${ICONE[s.status] || "[?]"} ${s.status}${s.motivo ? " — " + s.motivo : ""} | ${s.data || ""} | ${s.hash ? "`" + s.hash + "`" : ""} |`);
    }
    out.push("");
  }
  return out.join("\n");
}
function escreverStatusMd(estado, problemas, sj) { writeFileSync(STATUS_MD, statusMd(estado, problemas, sj)); }

// ── verificações ─────────────────────────────────────────────────────────────
function rodar(cmdline) {
  const r = spawnSync(cmdline, { cwd: ROOT, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const saida = (r.stdout || "") + (r.stderr || "");
  return { ok: r.status === 0, saida };
}
function contarChecks(saida) {
  const ok = [...saida.matchAll(/✓\s*(\d+)\s*passou/g)].map((m) => Number(m[1])).pop() ?? [...saida.matchAll(/(\d+)\s*ok,/g)].map((m) => Number(m[1])).pop() ?? null;
  const falhou = [...saida.matchAll(/✗\s*(\d+)\s*falhou/g)].map((m) => Number(m[1])).pop() ?? [...saida.matchAll(/(\d+)\s*falha/g)].map((m) => Number(m[1])).pop() ?? null;
  return { ok, falhou };
}
function verificar(comE2e) {
  const res = { quando: new Date().toISOString(), ok: true, itens: {} };
  const passo = (nome, cmdline) => {
    process.stdout.write(`… ${nome}: ${cmdline}\n`);
    const r = rodar(cmdline);
    const c = contarChecks(r.saida);
    res.itens[nome] = { ok: r.ok, passou: c.ok, falhou: c.falhou };
    if (!r.ok) res.ok = false;
    process.stdout.write(`   ${r.ok ? "✓" : "✗"} ${nome}${c.ok != null ? ` (${c.ok} ok, ${c.falhou ?? 0} falhou)` : ""}\n`);
    if (!r.ok) {
      const falhas = r.saida.split(/\r?\n/).filter((l) => /✗|FAIL|error/i.test(l) && !/✗\s*\d+\s*falhou/.test(l)).slice(-12);
      const rabo = falhas.length ? falhas : r.saida.split(/\r?\n/).filter(Boolean).slice(-20);
      process.stdout.write(rabo.map((l) => "     | " + l).join("\n") + "\n");
    }
  };
  passo("tsc", "bun x tsc --noEmit");
  passo("unit", "npm test");
  if (comE2e) {
    passo("e2e:reordenar", "node tests/e2e/run-reordenar-miolo.mjs");
    passo("e2e:linha-verde", "node tests/e2e/run-linha-verde-canonico.mjs");
    passo("e2e:admin", "node tests/e2e/run-admin.mjs");
    passo("e2e:geracao2", "node tests/e2e/run-geracao2-canonico.mjs");
  }
  res.resumo = Object.entries(res.itens).map(([k, v]) => `${k}:${v.ok ? "✓" : "✗"}`).join(" ");
  return res;
}

// ── gates ────────────────────────────────────────────────────────────────────
function listarArquivos(dir, acc = []) {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return acc;
  const st = statSync(abs);
  if (st.isFile()) { acc.push(dir); return acc; }
  for (const nome of readdirSync(abs)) {
    if (nome === "node_modules" || nome === ".git") continue;
    listarArquivos(path.join(dir, nome), acc);
  }
  return acc;
}
function grepCount(padrao, caminhos) {
  const re = new RegExp(padrao, "g");
  let n = 0;
  for (const c of caminhos) for (const f of listarArquivos(c)) {
    if (/\.(png|jpg|jpeg|webp|gif|ico|woff2?|ttf)$/i.test(f)) continue;
    let txt; try { txt = readFileSync(path.join(ROOT, f), "utf8"); } catch { continue; }
    n += (txt.match(re) || []).length;
  }
  return n;
}
function gate(onda, sj) {
  const checks = grafo.gates[onda];
  if (!checks) { console.error(`onda desconhecida: ${onda}`); process.exit(2); }
  const linhas = [`Gate da Onda ${onda} — ${grafo.ondas[onda].nome}`];
  let pendentes = 0;
  for (const c of checks) {
    let ok = null, det = "";
    if (c.tipo === "grep-zero") { const n = grepCount(c.padrao, c.caminhos); ok = n === 0; det = `${n} ocorrência(s)`; }
    else if (c.tipo === "grep-min") { const n = grepCount(c.padrao, c.caminhos); ok = n >= c.min; det = `${n} (mín. ${c.min})`; }
    else if (c.tipo === "arquivo-ausente") { ok = !existsSync(path.join(ROOT, c.caminho)); det = c.caminho; }
    else if (c.tipo === "arquivo-existe") { ok = existsSync(path.join(ROOT, c.caminho)); det = c.caminho; }
    else if (c.tipo === "bundle-fresco") { const st = bundlesDesatualizados().filter((x) => x.startsWith(c.bundle)); ok = st.length === 0; det = c.bundle + (ok ? " em dia" : " desatualizado"); }
    else if (c.tipo === "testes") { const v = sj.verificacao; ok = !!(v && v.ok); det = v ? `última verificação ${v.ok ? "verde" : "vermelha"} (${v.quando})` : "sem verificação — rode `verificar --e2e`"; }
    else if (c.tipo === "manual") { ok = null; det = "confirmar à mão"; }
    const icone = ok === null ? "[m]" : ok ? "[✓]" : "[✗]";
    if (ok === false) pendentes++;
    const rotulo = c.desc || c.caminho || c.padrao || (c.tipo === "bundle-fresco" ? `bundle ${c.bundle} em dia com a fonte` : c.tipo === "testes" ? "última verificação (tsc + unit + e2e) verde" : c.tipo);
    linhas.push(`  ${icone} ${rotulo} — ${det}`);
  }
  linhas.push(pendentes ? `Faltam ${pendentes} check(s) automáticos; os [m] são manuais.` : "Checks automáticos OK; confirme os [m] à mão.");
  return linhas.join("\n");
}

// ── comandos ─────────────────────────────────────────────────────────────────
function main() {
  const { estado, problemas, sj } = lerEstado();
  if (cmd === "init") {
    let n = 0;
    for (const p of passos) {
      if (!p.arquivo) continue;
      const f = arquivoDe(p);
      if (!existsSync(f)) { console.log(`ausente: ${p.arquivo}`); continue; }
      const txt = readFileSync(f, "utf8");
      if (RE_STATUS.test(txt)) continue;
      writeFileSync(f, inserirLinha(txt, "> Status: pendente")); n++;
    }
    gravarStatusJson(sj);
    const e = lerEstado(); escreverStatusMd(e.estado, e.problemas, e.sj);
    console.log(`init: ${n} arquivo(s) receberam a linha de status; STATUS.md gerado.`);
    return;
  }
  if (cmd === "status") { escreverStatusMd(estado, problemas, sj); console.log(painel(estado, problemas, sj)); return; }
  if (cmd === "proximo") {
    const d = disponiveis(estado);
    if (!d.length) { console.log("nenhum passo disponível"); return; }
    const p = d[0];
    console.log(`${p.id} — ${p.titulo}\n  onda: ${p.onda} (${grafo.ondas[p.onda].nome}) · branch esperada: ${branchEsperada(p)}\n  arquivo: ${p.arquivo ? "docs/Plan03/" + p.arquivo : "(sem arquivo — ver 02-EXECUCAO-PASSO-A-PASSO.md)"}\n  depende de: ${p.deps.join(", ") || "—"}`);
    if (d.length > 1) console.log(`  também disponíveis (∥): ${d.slice(1).map((x) => x.id).join(", ")}`);
    return;
  }
  if (cmd === "iniciar" || cmd === "concluir" || cmd === "bloquear" || cmd === "reabrir") {
    const id = args[1]; const p = porId.get(id);
    if (!p) { console.error(`passo desconhecido: ${id}`); process.exit(2); }
    const forcar = flag("--forcar");
    if (cmd === "iniciar") {
      const faltam = p.deps.filter((d) => !concluido(estado, d));
      if (faltam.length && !forcar) { console.error(`recusado: ${id} depende de ${faltam.join(", ")} (use --forcar para ignorar)`); process.exit(1); }
      const br = branchAtual();
      if (br && br !== branchEsperada(p) && !forcar) { console.error(`recusado: branch atual "${br}", esperada "${branchEsperada(p)}" (use --forcar)`); process.exit(1); }
      gravarStatus(p, { status: "em andamento", data: hoje() }, sj);
    } else if (cmd === "concluir") {
      const sujos = arvoreSuja().filter((l) => !/docs\/Plan03\//.test(l));
      if (sujos.length && !forcar) { console.error(`recusado: árvore suja (${sujos.length} arquivo(s) fora de docs/Plan03) — commite o trabalho do passo antes de concluir`); process.exit(1); }
      const hash = (args[2] && !args[2].startsWith("--")) ? args[2] : headCurto();
      gravarStatus(p, { status: "concluída", data: hoje(), hash }, sj);
    } else if (cmd === "reabrir") {
      gravarStatus(p, { status: "pendente" }, sj);
    } else {
      const motivo = args.slice(2).filter((a) => !a.startsWith("--")).join(" ") || "sem motivo";
      gravarStatus(p, { status: "bloqueada", motivo }, sj);
    }
    const e = lerEstado(); escreverStatusMd(e.estado, e.problemas, e.sj);
    console.log(`${id}: ${formatStatus(e.estado.get(id))}`);
    if (cmd === "concluir" && flag("--commit")) {
      const r = rodar(`git add docs/Plan03 && git commit -q -m "chore(plan03): ${id} concluída"`);
      console.log(r.ok ? `commit de status feito em ${branchAtual()}` : "falha ao commitar o status:\n" + r.saida);
    }
    console.log(painel(e.estado, e.problemas, e.sj).split("\n").slice(0, 5).join("\n"));
    return;
  }
  if (cmd === "verificar") {
    const v = verificar(flag("--e2e"));
    sj.verificacao = v; gravarStatusJson(sj);
    const e = lerEstado(); escreverStatusMd(e.estado, e.problemas, e.sj);
    console.log(`verificação ${v.ok ? "VERDE" : "VERMELHA"}: ${v.resumo}`);
    process.exit(v.ok ? 0 : 1);
  }
  if (cmd === "gate") { console.log(gate((args[1] || "").toUpperCase(), sj)); return; }
  if (cmd === "relatorio") {
    const tot = passos.length, feitos = passos.filter((p) => concluido(estado, p.id)).length;
    const and = passos.filter((p) => estado.get(p.id)?.status === "em andamento").map((p) => p.id);
    const blq = passos.filter((p) => estado.get(p.id)?.status === "bloqueada").map((p) => p.id);
    const d = disponiveis(estado);
    console.log([
      `Plan03: ${feitos}/${tot} concluídos (${Math.round((100 * feitos) / tot)}%)`,
      `Em andamento: ${and.join(", ") || "—"} · Bloqueados: ${blq.join(", ") || "—"}`,
      `Próximo: ${d[0] ? d[0].id + " — " + d[0].titulo : "—"}`,
      `Verificação: ${sj.verificacao ? (sj.verificacao.ok ? "verde" : "vermelha") + " em " + sj.verificacao.quando : "nenhuma"}`,
      `Alertas: ${alertas(estado, problemas).length}`,
    ].join("\n"));
    return;
  }
  console.error("comando desconhecido; veja o cabeçalho do arquivo");
  process.exit(2);
}
main();
