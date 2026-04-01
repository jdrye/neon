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
  expect(firstRun.after.currentStreak).toBeGreaterThanOrEqual(1);
  expect(firstRun.hint?.cells?.length).toBe(2);
  await expect(page.locator("#tempoValue")).toContainText("1/");
  await expect(page.locator("#streakValue")).toContainText(String(firstRun.after.currentStreak));
  await expect(page.locator("#echoButton")).toContainText("Echo");

  const rewindRun = await page.evaluate(async () => {
    const api = window.__pulsePrismTest;
    api.setState({ rewindCharges: 1, timeLeft: 54 });
    const before = api.getSnapshot();
    const moved = await api.performBestMove();
    const afterMove = api.getSnapshot();
    const rewindOk = api.performRewind();
    const afterRewind = api.getSnapshot();
    return { before, afterMove, afterRewind, moved, rewindOk };
  });

  expect(rewindRun.moved).toBeTruthy();
  expect(rewindRun.afterMove.score).toBeGreaterThan(rewindRun.before.score);
  expect(rewindRun.afterMove.canRewind).toBeTruthy();
  expect(rewindRun.rewindOk).toBeTruthy();
  expect(rewindRun.afterRewind.score).toBe(rewindRun.before.score);
  expect(rewindRun.afterRewind.totalCleared).toBe(rewindRun.before.totalCleared);
  expect(rewindRun.afterRewind.movesPlayed).toBe(rewindRun.before.movesPlayed);
  expect(rewindRun.afterRewind.rewindCharges).toBe(0);
  expect(rewindRun.afterRewind.canRewind).toBeFalsy();

  const streakRun = await page.evaluate(async () => {
    const api = window.__pulsePrismTest;
    for (let i = 0; i < 4; i++) {
      await api.performBestMove();
    }
    return api.getSnapshot();
  });

  expect(streakRun.currentStreak).toBeGreaterThanOrEqual(5);
  expect(streakRun.bestStreak).toBeGreaterThanOrEqual(5);
  expect(streakRun.profile.bestStreak).toBeGreaterThanOrEqual(5);
  await expect(page.locator("#streakTitle")).toContainText("Série");
  await expect(page.locator("#tempoCopy")).toContainText("Prime");

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
    api.setState({ tacticalRerolls: 2, pulseCharge: 100, candyRushCharge: 100, timeLeft: 7 });
    const before = api.getSnapshot();
    const rerollOk = api.performReroll();
    const afterReroll = api.getSnapshot();
    api.setState({ pulseCharge: 100, timeLeft: 7 });
    const beforePulse = api.getSnapshot();
    const pulseOk = await api.firePulseOnFocus();
    const after = api.getSnapshot();
    return { before, afterReroll, beforePulse, after, rerollOk, pulseOk };
  });

  expect(systemsRun.rerollOk).toBeTruthy();
  expect(systemsRun.pulseOk).toBeTruthy();
  expect(systemsRun.afterReroll.currentStreak).toBe(0);
  expect(systemsRun.after.score).toBeGreaterThan(systemsRun.before.score);
  expect(systemsRun.after.profile.pulses).toBeGreaterThanOrEqual(systemsRun.before.profile.pulses);
  expect(systemsRun.after.clutchActions).toBeGreaterThan(systemsRun.beforePulse.clutchActions);
  expect(systemsRun.after.profile.clutches).toBeGreaterThan(systemsRun.beforePulse.profile.clutches);
  expect(await page.locator("#flowValue").textContent()).toMatch(/×/);
  await expect(page.locator("#rushValue")).not.toHaveText("");
  await expect(page.locator("#dangerValue")).not.toContainText("Stable");
  await expect(page.locator("#clutchValue")).toContainText(String(systemsRun.after.clutchActions));

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
