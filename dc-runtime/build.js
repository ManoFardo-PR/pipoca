/**
 * dc-runtime build stub
 *
 * support.js is the compiled output of the dc-runtime TypeScript source.
 * It is checked into the repository pre-built so the project runs without
 * a full bun/TypeScript build environment.
 *
 * To rebuild support.js from source:
 *   1. Restore the full dc-runtime/src/ tree (TypeScript source files)
 *   2. Run: bun install && bun run build:full
 *
 * This stub validates that support.js is present and exits 0 so that
 * `npm run build` (which calls `cd dc-runtime && bun run build`) succeeds.
 */
const fs = require("fs");
const path = require("path");

const dest = path.resolve(__dirname, "..", "support.js");

if (!fs.existsSync(dest)) {
  console.error("ERROR: support.js not found at project root.");
  console.error("The dc-runtime output is missing. Restore support.js from");
  console.error("version control or rebuild from the dc-runtime source tree.");
  process.exit(1);
}

const size = fs.statSync(dest).size;
console.log("✓ support.js present (" + size + " bytes) — dc-runtime build ok");
