/**
 * [_harness.mjs] — Boot compartilhado dos e2e com navegador (Plan03 · D7):
 *   resolve o playwright-core e o Chromium SEM caminhos da máquina do autor,
 *   sobe o server e espera a porta — o que antes vivia copiado em 6 arquivos.
 *
 * PAPEL: infra de teste (não é teste; não tem assert próprio)
 * ENTRA: env PW_CORE (opcional — caminho de um playwright-core alternativo),
 *   PW_CHROME (opcional — executável do Chromium), porta desejada por runner.
 * SAI: { chromium, executavelChromium, esperarPorta, bootServer }.
 * CHAMA: playwright-core (devDependency; `npm run e2e:install` baixa o Chromium),
 *   node:child_process (spawn "node server.js"), node:net, node:fs.
 * É CHAMADO POR: run-linha-verde-canonico, run-admin, run-geracao2-canonico,
 *   capturar-telas, capturar-regras-ia, sondar-a11y.
 * CUIDADO: o Chromium é resolvido nesta ordem — PW_CHROME → executablePath()
 *   do próprio pacote (existente no disco) → erro claro pedindo o install.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// playwright-core: devDependency (npm install) com fallback ao env PW_CORE
// (útil para apontar um cache alternativo sem tocar no repo).
function resolverPwCore() {
  if (process.env.PW_CORE) return require(process.env.PW_CORE);
  try {
    return require("playwright-core");
  } catch (_) {
    throw new Error(
      "playwright-core não encontrado. Rode `npm install` (devDependencies) " +
      "ou aponte PW_CORE para um pacote existente.",
    );
  }
}

export const { chromium } = resolverPwCore();

/** Executável do Chromium: PW_CHROME → executablePath() instalado → erro claro. */
export function executavelChromium() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  let padrao = "";
  try { padrao = chromium.executablePath(); } catch (_) { padrao = ""; }
  if (padrao && existsSync(padrao)) return padrao;
  throw new Error(
    "Chromium do playwright-core não está instalado" +
    (padrao ? ` (esperado em ${padrao})` : "") +
    ". Rode `npm run e2e:install` (ou defina PW_CHROME).",
  );
}

/** Espera a porta TCP abrir (server pronto) — mesmo laço dos runners antigos. */
export function esperarPorta(port, timeoutMs = 15000) {
  const inicio = Date.now();
  return new Promise((resolve, reject) => {
    const tentar = () => {
      const s = net.connect(port, "localhost");
      s.on("connect", () => { s.end(); resolve(); });
      s.on("error", () => {
        s.destroy();
        if (Date.now() - inicio > timeoutMs) reject(new Error("timeout esperando o server"));
        else setTimeout(tentar, 200);
      });
    };
    tentar();
  });
}

/** Sobe `node server.js` na raiz do repo com a PORT dada e espera a porta. */
export async function bootServer(port) {
  const server = spawn("node", ["server.js"], {
    stdio: "ignore",
    cwd: RAIZ,
    env: { ...process.env, PORT: String(port) },
  });
  await esperarPorta(port);
  return server;
}
