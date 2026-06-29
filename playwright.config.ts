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
    baseURL: "http://localhost:5000",
    headless: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node server.js",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
