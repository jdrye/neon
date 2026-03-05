#!/usr/bin/env node
"use strict";

/**
 * Automated Ruins Dash player for balancing and playability checks.
 *
 * This bot uses the debug stepping API to avoid headless RAF throttling.
 *
 * Usage:
 *   node scripts/bot_play.js
 *   RUNS=10 STEP_DT=0.05 MAX_STEPS=2200 node scripts/bot_play.js
 */

const { chromium } = require("playwright");

const RUNS = Math.max(1, Number.parseInt(process.env.RUNS || "8", 10));
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000/";
const STEP_DT = Math.max(0.01, Number.parseFloat(process.env.STEP_DT || "0.05"));
const MAX_STEPS = Math.max(200, Number.parseInt(process.env.MAX_STEPS || "2200", 10));

function average(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((acc, row) => acc + row[key], 0) / rows.length;
}

async function readSnapshot(page) {
  return page.evaluate(() => {
    const api = window.__RUINS_DASH_DEBUG__;
    return api && typeof api.getState === "function" ? api.getState() : null;
  });
}

async function stepGame(page, controls, dt) {
  return page.evaluate(
    ({ controls: c, dt: delta }) => {
      const api = window.__RUINS_DASH_DEBUG__;
      if (!api || typeof api.step !== "function") return null;
      return api.step(delta, c);
    },
    { controls, dt }
  );
}

function computeControls(snapshot) {
  const player = snapshot.player;
  const enemies = snapshot.enemies || [];
  const relic = snapshot.relic;
  const healOrb = snapshot.healOrb;
  const miniBoss = snapshot.miniBoss;
  const bossProjectiles = snapshot.bossProjectiles || [];
  const bossTelegraphs = snapshot.bossTelegraphs || [];

  let target = relic;
  if (healOrb && player.lives <= 2) {
    target = healOrb;
  }

  let vx = 0;
  let vy = 0;

  if (target) {
    vx += (target.x - player.x) * 1.35;
    vy += (target.y - player.y) * 1.35;
  }

  let nearestDist = Number.POSITIVE_INFINITY;
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    nearestDist = Math.min(nearestDist, dist);

    const closeFactor = dist < 90 ? 2.3 : dist < 155 ? 1.4 : 0.5;
    const repel = 560 * closeFactor;
    vx += (dx / dist) * repel;
    vy += (dy / dist) * repel;
  }

  let bossDist = Number.POSITIVE_INFINITY;
  if (miniBoss) {
    const dx = player.x - miniBoss.x;
    const dy = player.y - miniBoss.y;
    bossDist = Math.max(1, Math.hypot(dx, dy));
    const bossRepel = bossDist < 150 ? 860 : bossDist < 240 ? 520 : 220;
    vx += (dx / bossDist) * bossRepel;
    vy += (dy / bossDist) * bossRepel;

    if (miniBoss.phase >= 3 && miniBoss.shockwaveCooldown < 1.05) {
      vx += (dx / bossDist) * 1250;
      vy += (dy / bossDist) * 1250;
    }

    if (miniBoss.volleyRecoverLeft > 0 && player.dashCooldownLeft < 0.2) {
      const seek = bossDist > 150 ? 540 : bossDist > 116 ? 240 : -180;
      vx += (-dx / bossDist) * seek;
      vy += (-dy / bossDist) * seek;
    }
  }

  for (const shot of bossProjectiles) {
    const dx = player.x - shot.x;
    const dy = player.y - shot.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const repel = dist < 120 ? 980 : dist < 180 ? 450 : 0;
    if (repel > 0) {
      vx += (dx / dist) * repel;
      vy += (dy / dist) * repel;
    }
  }

  for (const mark of bossTelegraphs) {
    const tx = Math.cos(mark.angle);
    const ty = Math.sin(mark.angle);
    const relX = player.x - mark.x;
    const relY = player.y - mark.y;
    const proj = relX * tx + relY * ty;
    if (proj < 0 || proj > 260) {
      continue;
    }
    const perp = Math.abs(relX * ty - relY * tx);
    if (perp > 32) {
      continue;
    }

    const side = relX * ty - relY * tx >= 0 ? 1 : -1;
    const force = (32 - perp) * 28;
    vx += -ty * side * force;
    vy += tx * side * force;
  }

  const margin = 82;
  if (player.x < margin) vx += (margin - player.x) * 6.4;
  if (player.x > 960 - margin) vx -= (player.x - (960 - margin)) * 6.4;
  if (player.y < margin) vy += (margin - player.y) * 6.4;
  if (player.y > 540 - margin) vy -= (player.y - (540 - margin)) * 6.4;

  const dash =
    player.dashCooldownLeft <= 0.02 &&
    player.dashTimeLeft <= 0.02 &&
    ((nearestDist < 96 && enemies.length >= 2) ||
      (miniBoss && miniBoss.volleyRecoverLeft > 0 && bossDist < 168) ||
      bossDist < 128 ||
      bossProjectiles.length >= 2);

  return {
    left: vx < -38,
    right: vx > 38,
    up: vy < -38,
    down: vy > 38,
    dash,
  };
}

async function ensureDebugReady(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  const hasDebug = await page.evaluate(() => {
    const api = window.__RUINS_DASH_DEBUG__;
    return !!api && typeof api.startGame === "function" && typeof api.step === "function";
  });

  if (!hasDebug) {
    throw new Error("Debug API missing: expected __RUINS_DASH_DEBUG__.startGame/step");
  }
}

async function playOne(page, runIndex) {
  await ensureDebugReady(page);

  await page.evaluate(() => {
    window.__RUINS_DASH_DEBUG__.setAudioEnabled(false);
    window.__RUINS_DASH_DEBUG__.startGame();
  });

  let snapshot = await readSnapshot(page);
  let steps = 0;

  while (
    snapshot &&
    snapshot.running &&
    !snapshot.finished &&
    snapshot.player &&
    steps < MAX_STEPS
  ) {
    const controls = computeControls(snapshot);
    snapshot = await stepGame(page, controls, STEP_DT);
    steps += 1;
  }

  if (snapshot?.running && !snapshot.finished) {
    for (let i = 0; i < 120; i += 1) {
      snapshot = await stepGame(page, { left: false, right: false, up: false, down: false }, STEP_DT);
      if (!snapshot?.running || snapshot.finished) break;
    }
  }

  snapshot = await readSnapshot(page);

  const row = {
    run: runIndex + 1,
    time: Number((snapshot?.elapsed || 0).toFixed(1)),
    score: Math.floor(snapshot?.score || 0),
    lives: snapshot?.player?.lives ?? 0,
    relics: snapshot?.relics ?? 0,
    bossAliveEnd: !!snapshot?.miniBoss,
    difficulty: Number((snapshot?.difficulty || 0).toFixed(2)),
    ended: !!snapshot?.finished,
    victory: !!snapshot?.victory,
    simulatedSeconds: Number((steps * STEP_DT).toFixed(1)),
  };

  console.log("run", row.run, row);
  return row;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const rows = [];

  for (let i = 0; i < RUNS; i += 1) {
    rows.push(await playOne(page, i));
  }

  await browser.close();

  const summary = {
    runs: RUNS,
    stepDt: STEP_DT,
    maxSteps: MAX_STEPS,
    avgTime: Number(average(rows, "time").toFixed(2)),
    avgScore: Number(average(rows, "score").toFixed(2)),
    avgRelics: Number(average(rows, "relics").toFixed(2)),
    avgLivesEnd: Number(average(rows, "lives").toFixed(2)),
    completionRate: Number(
      ((rows.filter((row) => row.ended).length / rows.length) * 100).toFixed(1)
    ),
    wins: rows.filter((row) => row.victory).length,
    best: rows.reduce((best, row) => (row.score > best.score ? row : best), rows[0]),
  };

  console.log("\nsummary", summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
