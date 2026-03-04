#!/usr/bin/env node
"use strict";

/**
 * Automated Ruins Dash player.
 *
 * Usage:
 *   node scripts/bot_play.js
 *   RUNS=10 node scripts/bot_play.js
 */

const { chromium } = require("playwright");

const RUNS = Math.max(1, Number.parseInt(process.env.RUNS || "6", 10));
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8000/";

function parseNum(text) {
  const n = Number.parseFloat(String(text || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function average(rows, key) {
  return rows.reduce((acc, row) => acc + row[key], 0) / rows.length;
}

async function playOne(page, runIndex) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.click("#actionBtn");
  await page.waitForTimeout(120);

  const hardCapMs = 95_000;
  const startAt = Date.now();

  while (Date.now() - startAt < hardCapMs) {
    const snapshot = await page.evaluate(() => {
      const api = window.__RUINS_DASH_DEBUG__;
      return api && typeof api.getState === "function" ? api.getState() : null;
    });

    if (!snapshot || !snapshot.running || snapshot.finished) {
      break;
    }

    const p = snapshot.player;
    const relic = snapshot.relic;
    const enemies = snapshot.enemies || [];
    if (!p) {
      break;
    }

    // Steering model: attract to relic, repel from enemies.
    let vx = 0;
    let vy = 0;

    if (relic) {
      vx += (relic.x - p.x) * 0.8;
      vy += (relic.y - p.y) * 0.8;
    }

    let nearestDist = Number.POSITIVE_INFINITY;
    for (const e of enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      nearestDist = Math.min(nearestDist, dist);
      const danger = dist < 210 ? 1.8 : 0.85;
      vx += (dx / dist) * 560 * danger;
      vy += (dy / dist) * 560 * danger;
    }

    const needDash =
      nearestDist < 95 && p.dashCooldownLeft <= 0.02 && p.dashTimeLeft <= 0.02;
    if (needDash) {
      await page.keyboard.press("Space");
    }

    const wantLeft = vx < -38;
    const wantRight = vx > 38;
    const wantUp = vy < -38;
    const wantDown = vy > 38;

    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    for (const key of keys) {
      await page.keyboard.up(key);
    }
    if (wantLeft) await page.keyboard.down("ArrowLeft");
    if (wantRight) await page.keyboard.down("ArrowRight");
    if (wantUp) await page.keyboard.down("ArrowUp");
    if (wantDown) await page.keyboard.down("ArrowDown");

    await page.waitForTimeout(90);
  }

  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    await page.keyboard.up(key);
  }

  const hud = await page.evaluate(() => ({
    time: document.querySelector("#timeVal")?.textContent || "0",
    score: document.querySelector("#scoreVal")?.textContent || "0",
    lives: document.querySelector("#livesVal")?.textContent || "0",
    relics: document.querySelector("#relicVal")?.textContent || "0",
    action: (document.querySelector("#actionBtn")?.textContent || "").trim(),
  }));

  const row = {
    run: runIndex + 1,
    time: parseNum(hud.time),
    score: parseNum(hud.score),
    lives: parseNum(hud.lives),
    relics: parseNum(hud.relics),
    ended: hud.action === "Rejouer",
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
    avgTime: Number(average(rows, "time").toFixed(2)),
    avgScore: Number(average(rows, "score").toFixed(2)),
    avgRelics: Number(average(rows, "relics").toFixed(2)),
    wins: rows.filter((r) => r.time >= 90).length,
    best: rows.reduce((best, row) => (row.score > best.score ? row : best), rows[0]),
  };

  console.log("\nsummary", summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
