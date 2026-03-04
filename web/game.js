"use strict";

/**
 * Ruins Dash - single-file game logic.
 *
 * Main design goals:
 * - deterministic update loop (dt-based)
 * - clear separation: input, update, render, UI sync
 * - simple but robust collision handling
 */
(() => {
  const CONFIG = {
    width: 960,
    height: 540,
    objectiveSeconds: 90,
    playerRadius: 16,
    playerSpeed: 270,
    playerMaxLives: 3,
    enemyRadius: 13,
    enemySpeedMin: 90,
    enemySpeedMax: 165,
    enemySpawnInterval: 7,
    enemyMax: 12,
    relicRadius: 12,
    scorePerSecond: 12,
    scorePerRelic: 300,
    hitInvulnerability: 1.1,
    touchDeadZone: 10,
    leaderboardSize: 5,
    leaderboardKey: "ruins_dash_scores_v1",
  };

  // Static obstacles produce tactical movement constraints.
  const OBSTACLES = [
    { x: 180, y: 120, w: 120, h: 28 },
    { x: 620, y: 95, w: 165, h: 30 },
    { x: 340, y: 235, w: 280, h: 34 },
    { x: 95, y: 345, w: 240, h: 28 },
    { x: 660, y: 335, w: 205, h: 30 },
    { x: 390, y: 430, w: 160, h: 26 },
  ];

  const dom = {
    canvas: document.getElementById("game"),
    actionBtn: document.getElementById("actionBtn"),
    overlay: document.getElementById("overlay"),
    livesVal: document.getElementById("livesVal"),
    timeVal: document.getElementById("timeVal"),
    scoreVal: document.getElementById("scoreVal"),
    relicVal: document.getElementById("relicVal"),
    enemyVal: document.getElementById("enemyVal"),
    leaderboard: document.getElementById("leaderboard"),
  };

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context unavailable");
  }

  const state = {
    running: false,
    paused: false,
    finished: false,
    victory: false,
    elapsed: 0,
    score: 0,
    relics: 0,
    enemySpawnTimer: 0,
    flashTimer: 0,
    player: null,
    enemies: [],
    relic: null,
    keys: new Set(),
    touch: { active: false, x: 0, y: 0 },
    frame: { lastTs: 0 },
  };

  function createPlayer() {
    return {
      x: CONFIG.width * 0.5,
      y: CONFIG.height - 62,
      r: CONFIG.playerRadius,
      lives: CONFIG.playerMaxLives,
      invuln: 0,
    };
  }

  function startGame() {
    state.running = true;
    state.paused = false;
    state.finished = false;
    state.victory = false;
    state.elapsed = 0;
    state.score = 0;
    state.relics = 0;
    state.enemySpawnTimer = 0;
    state.flashTimer = 0;
    state.player = createPlayer();
    state.enemies = [spawnEnemy()];
    state.relic = spawnRelic();

    dom.actionBtn.textContent = "Recommencer";
    hideOverlay();
    syncHud();
  }

  function endGame(victory) {
    state.running = false;
    state.finished = true;
    state.victory = victory;

    saveLeaderboardEntry({
      score: Math.floor(state.score),
      relics: state.relics,
      elapsed: Number(state.elapsed.toFixed(1)),
      victory,
    });
    renderLeaderboard();

    const title = victory ? "Victoire" : "Defaite";
    const style = victory ? "good" : "bad";
    showOverlay(
      `<div class="${style}">${title}</div><div>Score: ${Math.floor(state.score)}</div><div>Reliques: ${state.relics}</div><div>Temps: ${state.elapsed.toFixed(1)}s</div><div style="margin-top:.6rem; font-size:.95rem; font-weight:500;">Clique sur Recommencer pour relancer.</div>`
    );
  }

  function spawnEnemy() {
    // Spawn near edges to avoid immediate pressure at player spawn.
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = rand(0, CONFIG.width);
      y = -20;
    } else if (edge === 1) {
      x = CONFIG.width + 20;
      y = rand(0, CONFIG.height);
    } else if (edge === 2) {
      x = rand(0, CONFIG.width);
      y = CONFIG.height + 20;
    } else {
      x = -20;
      y = rand(0, CONFIG.height);
    }

    return {
      x,
      y,
      r: CONFIG.enemyRadius,
      speed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax),
    };
  }

  function spawnRelic() {
    // Keep trying until the relic is not inside an obstacle.
    for (let i = 0; i < 200; i += 1) {
      const candidate = {
        x: rand(40, CONFIG.width - 40),
        y: rand(40, CONFIG.height - 40),
        r: CONFIG.relicRadius,
      };
      if (!circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) {
        return candidate;
      }
    }

    // Fallback should rarely happen but keeps function total.
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.relicRadius };
  }

  function update(dt) {
    if (!state.running || state.paused || !state.player) {
      return;
    }

    state.elapsed += dt;
    state.score += dt * CONFIG.scorePerSecond;
    state.enemySpawnTimer += dt;
    state.flashTimer = Math.max(0, state.flashTimer - dt);

    const p = state.player;
    p.invuln = Math.max(0, p.invuln - dt);

    const movement = getMovementVector();
    if (movement.dx !== 0 || movement.dy !== 0) {
      const mag = Math.hypot(movement.dx, movement.dy) || 1;
      const vx = (movement.dx / mag) * CONFIG.playerSpeed;
      const vy = (movement.dy / mag) * CONFIG.playerSpeed;
      moveCircleWithCollisions(p, vx * dt, vy * dt);
    }

    if (
      state.enemySpawnTimer >= CONFIG.enemySpawnInterval &&
      state.enemies.length < CONFIG.enemyMax
    ) {
      state.enemySpawnTimer = 0;
      state.enemies.push(spawnEnemy());
    }

    for (const e of state.enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const stepX = (dx / dist) * e.speed * dt;
      const stepY = (dy / dist) * e.speed * dt;
      moveCircleWithCollisions(e, stepX, stepY);
    }

    if (state.relic && circlesOverlap(p, state.relic)) {
      state.relics += 1;
      state.score += CONFIG.scorePerRelic;
      state.relic = spawnRelic();
      state.flashTimer = 0.25;
    }

    for (const e of state.enemies) {
      if (!circlesOverlap(p, e) || p.invuln > 0) {
        continue;
      }
      p.lives -= 1;
      p.invuln = CONFIG.hitInvulnerability;
      state.flashTimer = 0.4;
      if (p.lives <= 0) {
        endGame(false);
      }
      break;
    }

    if (state.elapsed >= CONFIG.objectiveSeconds) {
      endGame(true);
    }

    syncHud();
  }

  function render() {
    const p = state.player;

    // Scene background with subtle grid for depth.
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, "#0a1728");
    g.addColorStop(1, "#09111d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    ctx.strokeStyle = "#17314b";
    ctx.globalAlpha = 0.35;
    for (let x = 0; x <= CONFIG.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.height);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const o of OBSTACLES) {
      ctx.fillStyle = "#22364ddd";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = "#79beff66";
      ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
    }

    if (state.relic) {
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() * 0.01);
      ctx.fillStyle = "#8af6a7";
      ctx.globalAlpha = pulse;
      drawCircle(state.relic.x, state.relic.y, state.relic.r);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#d9ffe4";
      drawCircleOutline(state.relic.x, state.relic.y, state.relic.r + 3);
    }

    for (const e of state.enemies) {
      ctx.fillStyle = "#ff8d8d";
      drawCircle(e.x, e.y, e.r);
      ctx.strokeStyle = "#ffd9d9";
      drawCircleOutline(e.x, e.y, e.r + 2);
    }

    if (p) {
      const blink = p.invuln > 0 && Math.floor(performance.now() * 0.02) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "#6fd7ff";
        drawCircle(p.x, p.y, p.r);
        ctx.strokeStyle = "#d8f5ff";
        drawCircleOutline(p.x, p.y, p.r + 2);
      }
    }

    if (state.flashTimer > 0) {
      ctx.fillStyle = state.victory ? "#8ff0a622" : "#ff5d5d2a";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    if (state.paused) {
      ctx.fillStyle = "#00000080";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      ctx.fillStyle = "#e8f8ff";
      ctx.font = "700 44px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pause", CONFIG.width / 2, CONFIG.height / 2);
    }
  }

  function loop(ts) {
    if (!state.frame.lastTs) {
      state.frame.lastTs = ts;
    }

    const dt = Math.min(0.05, (ts - state.frame.lastTs) / 1000);
    state.frame.lastTs = ts;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function moveCircleWithCollisions(entity, dx, dy) {
    // Axis separation keeps collision response stable and predictable.
    entity.x += dx;
    clampToBounds(entity);
    resolveObstacleOverlap(entity);

    entity.y += dy;
    clampToBounds(entity);
    resolveObstacleOverlap(entity);
  }

  function clampToBounds(entity) {
    entity.x = clamp(entity.x, entity.r, CONFIG.width - entity.r);
    entity.y = clamp(entity.y, entity.r, CONFIG.height - entity.r);
  }

  function resolveObstacleOverlap(entity) {
    for (const o of OBSTACLES) {
      const nearestX = clamp(entity.x, o.x, o.x + o.w);
      const nearestY = clamp(entity.y, o.y, o.y + o.h);
      const dx = entity.x - nearestX;
      const dy = entity.y - nearestY;
      const dist = Math.hypot(dx, dy);

      if (dist === 0 || dist >= entity.r) {
        continue;
      }

      const push = entity.r - dist;
      entity.x += (dx / dist) * push;
      entity.y += (dy / dist) * push;
      clampToBounds(entity);
    }
  }

  function circleHitsAnyObstacle(x, y, r) {
    const probe = { x, y, r };
    for (const o of OBSTACLES) {
      const nearestX = clamp(probe.x, o.x, o.x + o.w);
      const nearestY = clamp(probe.y, o.y, o.y + o.h);
      const dx = probe.x - nearestX;
      const dy = probe.y - nearestY;
      if (dx * dx + dy * dy < probe.r * probe.r) {
        return true;
      }
    }
    return false;
  }

  function circlesOverlap(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = a.r + b.r;
    return dx * dx + dy * dy <= rr * rr;
  }

  function drawCircle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCircleOutline(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function getMovementVector() {
    // Merge keyboard and touch input; touch wins if active.
    let dx = 0;
    let dy = 0;

    if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.keys.has("A")) {
      dx -= 1;
    }
    if (state.keys.has("ArrowRight") || state.keys.has("d") || state.keys.has("D")) {
      dx += 1;
    }
    if (state.keys.has("ArrowUp") || state.keys.has("w") || state.keys.has("W")) {
      dy -= 1;
    }
    if (state.keys.has("ArrowDown") || state.keys.has("s") || state.keys.has("S")) {
      dy += 1;
    }

    if (state.touch.active && state.player) {
      const rect = dom.canvas.getBoundingClientRect();
      const tx = ((state.touch.x - rect.left) / rect.width) * CONFIG.width;
      const ty = ((state.touch.y - rect.top) / rect.height) * CONFIG.height;
      const vtx = tx - state.player.x;
      const vty = ty - state.player.y;
      if (Math.hypot(vtx, vty) > CONFIG.touchDeadZone) {
        dx = vtx;
        dy = vty;
      }
    }

    return { dx, dy };
  }

  function saveLeaderboardEntry(entry) {
    const board = loadLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.score - a.score || b.relics - a.relics || a.elapsed - b.elapsed);
    const trimmed = board.slice(0, CONFIG.leaderboardSize);
    localStorage.setItem(CONFIG.leaderboardKey, JSON.stringify(trimmed));
  }

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(CONFIG.leaderboardKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function renderLeaderboard() {
    const board = loadLeaderboard();
    dom.leaderboard.innerHTML = "";

    if (!board.length) {
      const li = document.createElement("li");
      li.textContent = "Aucun score pour le moment";
      dom.leaderboard.appendChild(li);
      return;
    }

    for (const item of board) {
      const li = document.createElement("li");
      const badge = item.victory ? "victoire" : "defaite";
      li.textContent = `${item.score} pts | ${item.relics} reliques | ${item.elapsed}s | ${badge}`;
      dom.leaderboard.appendChild(li);
    }
  }

  function syncHud() {
    const p = state.player;
    dom.livesVal.textContent = String(p ? p.lives : CONFIG.playerMaxLives);
    dom.timeVal.textContent = `${state.elapsed.toFixed(1)}s`;
    dom.scoreVal.textContent = String(Math.floor(state.score));
    dom.relicVal.textContent = String(state.relics);
    dom.enemyVal.textContent = String(state.enemies.length);
  }

  function showOverlay(html) {
    dom.overlay.innerHTML = html;
    dom.overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    dom.overlay.classList.add("hidden");
    dom.overlay.textContent = "";
  }

  function handleKeyDown(event) {
    if (event.key === "p" || event.key === "P") {
      if (state.running) {
        state.paused = !state.paused;
      }
      return;
    }

    if (event.key === "r" || event.key === "R") {
      startGame();
      return;
    }

    state.keys.add(event.key);
  }

  function handleKeyUp(event) {
    state.keys.delete(event.key);
  }

  function bindTouchControls() {
    const updateTouch = (ev) => {
      if (!ev.touches || !ev.touches[0]) {
        return;
      }
      state.touch.active = true;
      state.touch.x = ev.touches[0].clientX;
      state.touch.y = ev.touches[0].clientY;
      ev.preventDefault();
    };

    dom.canvas.addEventListener("touchstart", updateTouch, { passive: false });
    dom.canvas.addEventListener("touchmove", updateTouch, { passive: false });
    dom.canvas.addEventListener("touchend", () => {
      state.touch.active = false;
    });
    dom.canvas.addEventListener("touchcancel", () => {
      state.touch.active = false;
    });
  }

  function bindEvents() {
    dom.actionBtn.addEventListener("click", startGame);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    bindTouchControls();
  }

  function init() {
    bindEvents();
    renderLeaderboard();
    showOverlay("Clique sur Demarrer pour jouer.");
    syncHud();
    requestAnimationFrame(loop);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  init();
})();
