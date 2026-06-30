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
// As telas/itens canônicos vivem em src/telas e src/componentes, não na raiz —
// então resolvemos GET /<Nome>.dc.html procurando nessas pastas (e na raiz).
const DC_DIRS = ["src/telas", "src/componentes", "."];

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

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];

  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }

  const filePath = resolverCaminho(urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

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
