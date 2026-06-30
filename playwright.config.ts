import { defineConfig, devices } from "@playwright/test";

/**
 * Config e2e da linha verde (Marco 1 / convergência).
 * Sobe o PWA estático (server.js) e roda o spec em chromium.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5137",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Porta dedicada para não colidir com outros dev servers (ex.: vite na 5000).
    command: "node server.js",
    env: { PORT: "5137" },
    url: "http://localhost:5137",
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
