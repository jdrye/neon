// @ts-check
const { defineConfig, devices } = require("playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8000",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "python3 server.py",
    url: "http://127.0.0.1:8000/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
