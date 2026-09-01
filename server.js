const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// Convergência (TRILHA M-A): o dc-runtime monta componentes-irmãos buscando
// `./<Nome>.dc.html` relativo à URL da página (support.js: COMPONENT_DIR ".").
// As telas/itens canônicos vivem em src/telas e src/componentes (app da criança)
// e em src/admin/telas|componentes|. (plataforma do operador, admin.html) —
// então resolvemos GET /<Nome>.dc.html procurando nessas pastas (e na raiz).
const DC_DIRS = ["src/telas", "src/componentes", "src/admin/telas", "src/admin/componentes", "src/admin", "."];

function resolverCaminho(urlPath) {
  // Componente .dc.html na raiz da URL (sem subpasta) → procurar nas pastas canônicas.
  const m = /^\/([^/]+\.dc\.html)$/.exec(urlPath);
  if (m) {
    for (const dir of DC_DIRS) {
      const candidato = path.join(__dirname, dir, m[1]);
      if (fs.existsSync(candidato)) return candidato;
    }
  }
  return path.join(__dirname, urlPath);
}

// CONTENÇÃO DO DOCROOT (auditoria S-01): o repo inteiro é a pasta servida, então
// sem allowlist um GET /.env entrega as chaves e /.git/* o histórico. Servimos
// só o que o app de fato busca: os arquivos-raiz do boot, src/** (html/js/css) e
// as imagens de attached_assets. Todo o resto (.env, .git, functions, scripts,
// docs, .ts, .sql, o próprio server.js) e qualquer '..' que escape do docroot → 404.
const RAIZ_PERMITIDA = new Set([
  "index.html", "admin.html", "landing.html",
  "support.js", "pipoca.config.js", "pipoca.bundle.js", "pipoca.admin.bundle.js",
]);
const EXT_SRC = new Set([".html", ".js", ".css"]);
// B10 (PS-13): attached_assets/ vira allowlist explícita — só o que a landing usa.
// Os PNGs órfãos (image_17834*.png) saem do ar já; a remoção física é da faxina (D4).
const ASSETS_PERMITIDOS = new Set(["attached_assets/og-pipoca.png"]);

function ehServivel(filePathAbs) {
  const rel = path.relative(__dirname, filePathAbs);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return false; // traversal
  const relUrl = rel.split(path.sep).join("/");
  const ext = path.extname(relUrl).toLowerCase();
  if (!relUrl.includes("/")) return RAIZ_PERMITIDA.has(relUrl);          // arquivos da raiz: allowlist
  if (relUrl.startsWith("src/")) return EXT_SRC.has(ext);                // src/**: só html/js/css
  if (relUrl.startsWith("attached_assets/")) return ASSETS_PERMITIDOS.has(relUrl); // assets: allowlist (B10)
  if (relUrl.startsWith("docs/")) return ext === ".json";               // dados: grafo autoral + fichas (não .md/.mjs)
  return false;                                                          // qualquer outra pasta: negado
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];

  // /app/ e /admin/ (com barra final) quebrariam os assets relativos (resolveriam
  // sob /app/… ou /admin/…). Redireciona para a forma canônica, preservando a query.
  if (urlPath === "/app/" || urlPath === "/admin/") {
    const query = req.url.slice(req.url.indexOf("?"));
    res.writeHead(301, { Location: urlPath.slice(0, -1) + (req.url.includes("?") ? query : "") });
    res.end();
    return;
  }

  // A raiz mostra a landing (marketing). O app da criança vive em /app —
  // mesmo entry (index.html), mantido num caminho claro para os CTAs e para
  // o encaminhamento do link de recuperação de senha (#type=recovery).
  // B10 (PS-15): a plataforma do operador ganha a rota /admin (mesmo padrão);
  // /admin.html segue como alias (decisão do dono; o e2e admin usa o alias).
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/landing.html";
  } else if (urlPath === "/app") {
    urlPath = "/index.html";
  } else if (urlPath === "/admin") {
    urlPath = "/admin.html";
  }

  const filePath = resolverCaminho(urlPath);

  // Contenção do docroot (S-01): fora da allowlist → 404, antes de tocar o disco.
  if (!ehServivel(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const servindoLanding = filePath === path.join(__dirname, "landing.html");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    // O cartão de prévia (Open Graph/Twitter) exige URLs absolutas. Em vez de
    // fixar um domínio, montamos a origem a partir do pedido — assim funciona
    // em dev, produção e domínio próprio. WhatsApp/redes leem estas metatags.
    if (servindoLanding) {
      const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
      const host = req.headers.host || "";
      const origin = host ? `${proto}://${host}` : "";
      const html = data.toString("utf8").split("%ORIGIN%").join(origin);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      });
      res.end(html);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Pipoca server running at http://${HOST}:${PORT}`);
});
