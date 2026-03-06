const { test, expect } = require("@playwright/test");

async function runGreedyRelicBot(page, maxSteps = 500) {
  return page.evaluate((steps) => {
    const api = window.__RUINS_DASH_DEBUG__;
    if (!api || typeof api.startGame !== "function") {
      return null;
    }

    api.setAudioEnabled(false);
    let snapshot = api.startGame();

    for (let i = 0; i < steps && snapshot && snapshot.running && !snapshot.finished; i += 1) {
      const player = snapshot.player;
      const target = snapshot.healOrb && player.lives <= 2 ? snapshot.healOrb : snapshot.relic;
      const controls = {
        left: !!target && target.x < player.x - 5,
        right: !!target && target.x > player.x + 5,
        up: !!target && target.y < player.y - 5,
        down: !!target && target.y > player.y + 5,
        dash: player.dashCooldownLeft <= 0.02 && (snapshot.enemies || []).length >= 3,
      };
      snapshot = api.step(0.05, controls);
      if (snapshot.relics >= 1) {
        break;
      }
    }

    return snapshot;
  }, maxSteps);
}

test("expose la debug API et demarre une partie", async ({ page }) => {
  await page.goto("/");

  const info = await page.evaluate(() => {
    const api = window.__RUINS_DASH_DEBUG__;
    if (!api || typeof api.startGame !== "function") {
      return { hasApi: false };
    }

    api.setAudioEnabled(false);
    const start = api.startGame();
    const after = api.step(0.2, { left: false, right: true, up: false, down: false, dash: false });

    return {
      hasApi: true,
      started: !!start?.running,
      elapsedAfter: after?.elapsed || 0,
      xStart: start?.player?.x || 0,
      xAfter: after?.player?.x || 0,
    };
  });

  expect(info.hasApi).toBeTruthy();
  expect(info.started).toBeTruthy();
  expect(info.elapsedAfter).toBeGreaterThan(0.05);
  expect(info.xAfter).toBeGreaterThan(info.xStart);
});

test("dash active le cooldown sans redemarrer la partie", async ({ page }) => {
  await page.goto("/");

  const info = await page.evaluate(() => {
    const api = window.__RUINS_DASH_DEBUG__;
    api.setAudioEnabled(false);

    const before = api.startGame();
    const afterDash = api.step(0.016, {
      left: false,
      right: false,
      up: false,
      down: false,
      dash: true,
    });

    return {
      beforeElapsed: before.elapsed,
      afterElapsed: afterDash.elapsed,
      dashCooldown: afterDash.player.dashCooldownLeft,
      dashActive: afterDash.player.dashTimeLeft,
      relicsAfter: afterDash.relics,
    };
  });

  expect(info.afterElapsed).toBeGreaterThan(info.beforeElapsed);
  expect(info.dashCooldown).toBeGreaterThan(0.5);
  expect(info.dashActive).toBeGreaterThan(0);
  expect(info.relicsAfter).toBeGreaterThanOrEqual(0);
});

test("le bouton RUSH mobile declenche bien un dash", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Demarrer" }).click();
  await page.locator("#dashBtn").click();

  const snapshot = await page.evaluate(() => window.__RUINS_DASH_DEBUG__.getState());
  expect(snapshot.running).toBeTruthy();
  expect(snapshot.player.dashCooldownLeft).toBeGreaterThan(0.5);
});

test("la collecte de Chrono active bien le ralentissement", async ({ page }) => {
  await page.goto("/");

  const info = await page.evaluate(() => {
    const api = window.__RUINS_DASH_DEBUG__;
    api.setAudioEnabled(false);
    api.startGame();
    const orb = api.spawnChronoOrb();
    api.setPlayerPosition(orb.x, orb.y);
    const snapshot = api.step(0.016, {
      left: false,
      right: false,
      up: false,
      down: false,
      dash: false,
    });

    return {
      hasChrono: !!orb,
      timeSlowLeft: snapshot.timeSlowLeft,
      chronoConsumed: !snapshot.chronoOrb,
    };
  });

  expect(info.hasChrono).toBeTruthy();
  expect(info.timeSlowLeft).toBeGreaterThan(3);
  expect(info.chronoConsumed).toBeTruthy();
});

test("le bot de base collecte au moins une relique et active le combo", async ({ page }) => {
  await page.goto("/");

  const snapshot = await runGreedyRelicBot(page, 700);

  expect(snapshot).not.toBeNull();
  expect(snapshot.running || snapshot.finished).toBeTruthy();
  expect(snapshot.relics).toBeGreaterThanOrEqual(1);
  expect(snapshot.comboCount).toBeGreaterThanOrEqual(1);
  expect(snapshot.comboMultiplier).toBeGreaterThanOrEqual(1);
});
