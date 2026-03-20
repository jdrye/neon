import { expect, test } from "@playwright/test";

test("smoke: the game starts, plays a move, and exposes test hooks", async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pulse Prism" })).toBeVisible();
  await page.getByRole("button", { name: /lancer la partie/i }).click();

  await page.waitForFunction(() => {
    return window.__pulsePrismTest && window.__pulsePrismTest.getSnapshot().hasBegun;
  });

  const firstRun = await page.evaluate(async () => {
    const api = window.__pulsePrismTest;
    const before = api.getSnapshot();
    const played = await api.performBestMove();
    const after = api.getSnapshot();
    const hint = api.showHint();
    return { before, after, played, hint };
  });

  expect(firstRun.played).toBeTruthy();
  expect(firstRun.after.score).toBeGreaterThan(firstRun.before.score);
  expect(firstRun.after.totalCleared).toBeGreaterThan(0);
  expect(firstRun.hint?.cells?.length).toBe(2);

  const timeBeforeLab = Number(await page.locator("#timeValue").textContent());
  await expect(page.locator("#labMoveButton")).toBeEnabled();
  await page.locator("#labTimeButton").click();
  expect(Number(await page.locator("#timeValue").textContent())).toBeGreaterThan(timeBeforeLab);
  await page.locator("#labPulseButton").click();
  await expect(page.locator("#pulseValue")).toContainText("PRÊTE");
  await page.locator("#labRushButton").click();
  await expect(page.locator("#rushValue")).toContainText("s");

  const systemsRun = await page.evaluate(async () => {
    const api = window.__pulsePrismTest;
    api.setState({ tacticalRerolls: 2, pulseCharge: 100, candyRushCharge: 100 });
    const before = api.getSnapshot();
    const rerollOk = api.performReroll();
    const pulseOk = await api.firePulseOnFocus();
    const after = api.getSnapshot();
    return { before, after, rerollOk, pulseOk };
  });

  expect(systemsRun.rerollOk).toBeTruthy();
  expect(systemsRun.pulseOk).toBeTruthy();
  expect(systemsRun.after.score).toBeGreaterThan(systemsRun.before.score);
  expect(systemsRun.after.profile.pulses).toBeGreaterThanOrEqual(systemsRun.before.profile.pulses);
  expect(await page.locator("#flowValue").textContent()).toMatch(/×/);
  await expect(page.locator("#rushValue")).not.toHaveText("");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
