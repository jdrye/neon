import { defineConfig } from "@playwright/test";

const basePath = process.env.PLAYWRIGHT_BASE_PATH || "/";
const baseURL = `http://127.0.0.1:4173${basePath}`;
const testBuild = process.env.PLAYWRIGHT_TEST_BUILD === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30_000,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL,
    headless: true
  },
  webServer: {
    command: `node ./node_modules/vite/bin/vite.js ${testBuild ? "preview" : ""} --base ${basePath} --host 127.0.0.1 --port 4173 --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !testBuild,
    timeout: 120_000
  }
});
