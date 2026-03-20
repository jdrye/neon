import { defineConfig } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    viewport: { width: 1440, height: 1180 }
  },
  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 20_000
  }
});
