"use strict";

/**
 * Ruins Dash - gameplay loop.
 *
 * Improvements in this revision:
 * - smoother difficulty ramp (fair early game, harder late game)
 * - safer enemy spawn rules
 * - active dash ability on Space (short invulnerability + burst)
 * - lightweight debug API for automated gameplay checks
 */
(() => {
  const CONFIG = {
    width: 960,
    height: 540,
    objectiveSeconds: 90,

    playerRadius: 16,
    playerSpeed: 270,
    playerMaxLives: 3,

    // Dash (Space)
    dashBoost: 2.5,
    dashDuration: 0.25,
    dashCooldown: 2.8,
    dashInvuln: 0.35,
    dashShockRadius: 54,

    enemyRadius: 13,
    enemySpeedMin: 78,
    enemySpeedMax: 142,
    enemySpawnBaseInterval: 6.6,
    enemySpawnMinInterval: 3.9,
    enemyMax: 12,
    enemyGraceSeconds: 2.3,
    enemySafeSpawnFromPlayer: 230,
    enemySafeSpawnFromRelic: 170,

    relicRadius: 12,
    relicCatchBonus: 10,
    relicSafeFromEnemy: 90,

    scorePerSecond: 12,
    scorePerRelic: 320,
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
    dashVal: document.getElementById("dashVal"),
    dangerVal: document.getElementById("dangerVal"),
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
    enemyGraceLeft: CONFIG.enemyGraceSeconds,
    flashTimer: 0,

    difficulty: 1,

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
      dashCooldownLeft: 0,
      dashTimeLeft: 0,
      lastMoveX: 1,
      lastMoveY: 0,
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
    state.enemyGraceLeft = CONFIG.enemyGraceSeconds;
    state.flashTimer = 0;
    state.difficulty = 1;

    state.player = createPlayer();
    state.enemies = [];
    state.relic = spawnRelic();

    updateActionButton();
    dom.actionBtn.blur();
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
    updateActionButton();

    const title = victory ? "Victoire" : "Defaite";
    const style = victory ? "good" : "bad";
    showOverlay(
      `<div class="${style}">${title}</div><div>Score: ${Math.floor(state.score)}</div><div>Reliques: ${state.relics}</div><div>Temps: ${state.elapsed.toFixed(1)}s</div><div style="margin-top:.6rem; font-size:.95rem; font-weight:500;">Clique sur Rejouer pour relancer.</div>`
    );
  }

  function update(dt) {
    if (!state.running || state.paused || !state.player) {
      return;
    }

    state.elapsed += dt;
    state.score += dt * CONFIG.scorePerSecond;
    state.flashTimer = Math.max(0, state.flashTimer - dt);

    state.difficulty = computeDifficulty();

    const p = state.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldownLeft = Math.max(0, p.dashCooldownLeft - dt);
    p.dashTimeLeft = Math.max(0, p.dashTimeLeft - dt);

    updatePlayer(dt, p);
    updateEnemies(dt, p);
    maybeCollectRelic(p);
    maybeTakeDamage(p);

    if (p.lives <= 0) {
      endGame(false);
      return;
    }

    if (state.elapsed >= CONFIG.objectiveSeconds) {
      endGame(true);
      return;
    }

    syncHud();
  }

  function updatePlayer(dt, player) {
    const movement = getMovementVector();

    if (movement.dx !== 0 || movement.dy !== 0) {
      const mag = Math.hypot(movement.dx, movement.dy) || 1;
      const nx = movement.dx / mag;
      const ny = movement.dy / mag;
      player.lastMoveX = nx;
      player.lastMoveY = ny;

      const speed =
        CONFIG.playerSpeed * (player.dashTimeLeft > 0 ? CONFIG.dashBoost : 1);

      moveCircleWithCollisions(player, nx * speed * dt, ny * speed * dt);
    }

    if (player.dashTimeLeft > 0) {
      applyDashPulse(player);
    }
  }

  function updateEnemies(dt, player) {
    state.enemyGraceLeft = Math.max(0, state.enemyGraceLeft - dt);

    const spawnInterval = currentSpawnInterval();
    if (state.enemyGraceLeft <= 0 && state.enemies.length < CONFIG.enemyMax) {
      state.enemySpawnTimer += dt;
      if (state.enemySpawnTimer >= spawnInterval) {
        state.enemySpawnTimer = 0;
        state.enemies.push(spawnEnemy(player, state.relic));
      }
    }

    const earlyEase = 0.68 + Math.min(state.elapsed / 30, 1) * 0.32;

    for (const enemy of state.enemies) {
      enemy.stunLeft = Math.max(0, (enemy.stunLeft || 0) - dt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;

      const baseSpeed = enemy.baseSpeed * state.difficulty * earlyEase;
      const speed = enemy.stunLeft > 0 ? baseSpeed * 0.1 : baseSpeed;

      const stepX = (dx / dist) * speed * dt;
      const stepY = (dy / dist) * speed * dt;
      moveCircleWithCollisions(enemy, stepX, stepY);
    }
  }

  function maybeCollectRelic(player) {
    if (!state.relic) {
      return;
    }

    const catchRadius = player.r + state.relic.r + CONFIG.relicCatchBonus;
    if (!circlesOverlapRadius(player, state.relic, catchRadius)) {
      return;
    }

    state.relics += 1;
    state.score += CONFIG.scorePerRelic;
    state.flashTimer = 0.25;
    state.relic = spawnRelic();
  }

  function maybeTakeDamage(player) {
    for (const enemy of state.enemies) {
      if (!circlesOverlap(player, enemy) || player.invuln > 0) {
        continue;
      }

      player.lives -= 1;
      player.invuln = CONFIG.hitInvulnerability;
      state.flashTimer = 0.4;
      break;
    }
  }

  function tryDash() {
    if (!state.running || !state.player || state.finished || state.paused) {
      return false;
    }

    const p = state.player;
    if (p.dashCooldownLeft > 0 || p.dashTimeLeft > 0) {
      return false;
    }

    p.dashTimeLeft = CONFIG.dashDuration;
    p.dashCooldownLeft = CONFIG.dashCooldown;
    p.invuln = Math.max(p.invuln, CONFIG.dashInvuln);

    // If player is not moving, dash in the last known direction.
    if (Math.hypot(p.lastMoveX, p.lastMoveY) < 0.1) {
      p.lastMoveX = 1;
      p.lastMoveY = 0;
    }

    applyDashPulse(p);
    return true;
  }

  function applyDashPulse(player) {
    for (const enemy of state.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0 || dist > CONFIG.dashShockRadius) {
        continue;
      }

      const push = (CONFIG.dashShockRadius - dist) * 0.85;
      enemy.x += (dx / dist) * push;
      enemy.y += (dy / dist) * push;
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft || 0, 0.18);
    }
  }

  function computeDifficulty() {
    // Fair start, stronger pressure as time and relic count increase.
    const timeRamp = clamp(state.elapsed / 70, 0, 1);
    const relicRamp = clamp(state.relics / 8, 0, 1);
    return 0.9 + timeRamp * 0.55 + relicRamp * 0.35;
  }

  function currentSpawnInterval() {
    const interval =
      CONFIG.enemySpawnBaseInterval - state.elapsed * 0.025 - state.relics * 0.12;
    return Math.max(CONFIG.enemySpawnMinInterval, interval);
  }

  function spawnEnemy(player, relic) {
    // Spawn near edges while enforcing safe distances from key entities.
    for (let i = 0; i < 120; i += 1) {
      const edge = Math.floor(Math.random() * 4);
      const point = randomEdgePoint(edge);

      const fromPlayer = Math.hypot(point.x - player.x, point.y - player.y);
      if (fromPlayer < CONFIG.enemySafeSpawnFromPlayer) {
        continue;
      }

      if (relic) {
        const fromRelic = Math.hypot(point.x - relic.x, point.y - relic.y);
        if (fromRelic < CONFIG.enemySafeSpawnFromRelic) {
          continue;
        }
      }

      if (circleHitsAnyObstacle(point.x, point.y, CONFIG.enemyRadius)) {
        continue;
      }

      return {
        x: point.x,
        y: point.y,
        r: CONFIG.enemyRadius,
        baseSpeed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax),
        stunLeft: 0,
      };
    }

    const fallback = randomEdgePoint(Math.floor(Math.random() * 4));
    return {
      x: fallback.x,
      y: fallback.y,
      r: CONFIG.enemyRadius,
      baseSpeed: rand(CONFIG.enemySpeedMin, CONFIG.enemySpeedMax),
      stunLeft: 0,
    };
  }

  function randomEdgePoint(edge) {
    if (edge === 0) {
      return { x: rand(0, CONFIG.width), y: -18 };
    }
    if (edge === 1) {
      return { x: CONFIG.width + 18, y: rand(0, CONFIG.height) };
    }
    if (edge === 2) {
      return { x: rand(0, CONFIG.width), y: CONFIG.height + 18 };
    }
    return { x: -18, y: rand(0, CONFIG.height) };
  }

  function spawnRelic() {
    for (let i = 0; i < 260; i += 1) {
      const candidate = {
        x: rand(44, CONFIG.width - 44),
        y: rand(44, CONFIG.height - 44),
        r: CONFIG.relicRadius,
      };

      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) {
        continue;
      }

      let tooCloseToEnemy = false;
      for (const e of state.enemies) {
        if (Math.hypot(candidate.x - e.x, candidate.y - e.y) < CONFIG.relicSafeFromEnemy) {
          tooCloseToEnemy = true;
          break;
        }
      }
      if (tooCloseToEnemy) {
        continue;
      }

      return candidate;
    }

    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.relicRadius };
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
      const stunned = (e.stunLeft || 0) > 0;
      ctx.fillStyle = stunned ? "#ffca91" : "#ff8d8d";
      drawCircle(e.x, e.y, e.r);
      ctx.strokeStyle = stunned ? "#fff1d8" : "#ffd9d9";
      drawCircleOutline(e.x, e.y, e.r + 2);
    }

    if (p) {
      const blinking = p.invuln > 0 && Math.floor(performance.now() * 0.02) % 2 === 0;
      if (!blinking) {
        if (p.dashTimeLeft > 0) {
          ctx.fillStyle = "#3eb3ff44";
          drawCircle(p.x, p.y, p.r + 12);
        }
        ctx.fillStyle = p.dashTimeLeft > 0 ? "#7fd8ff" : "#6fd7ff";
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

  function circlesOverlapRadius(a, b, radius) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= radius * radius;
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
    const dashReady = p ? p.dashCooldownLeft <= 0 : true;

    dom.livesVal.textContent = String(p ? p.lives : CONFIG.playerMaxLives);
    dom.timeVal.textContent = `${state.elapsed.toFixed(1)}s`;
    dom.scoreVal.textContent = String(Math.floor(state.score));
    dom.relicVal.textContent = String(state.relics);
    dom.enemyVal.textContent = String(state.enemies.length);

    if (dom.dashVal) {
      dom.dashVal.textContent = dashReady
        ? "Pret"
        : `${Math.max(0, p.dashCooldownLeft).toFixed(1)}s`;
    }

    if (dom.dangerVal) {
      if (state.difficulty < 1.15) {
        dom.dangerVal.textContent = "I";
      } else if (state.difficulty < 1.4) {
        dom.dangerVal.textContent = "II";
      } else {
        dom.dangerVal.textContent = "III";
      }
    }
  }

  function updateActionButton() {
    if (state.running && !state.finished) {
      dom.actionBtn.textContent = "Partie en cours";
      dom.actionBtn.disabled = true;
      return;
    }
    if (state.finished) {
      dom.actionBtn.textContent = "Rejouer";
      dom.actionBtn.disabled = false;
      return;
    }
    dom.actionBtn.textContent = "Demarrer";
    dom.actionBtn.disabled = false;
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
    if (event.code === "Space") {
      // Keep Space for dash and block browser default action on focused button.
      event.preventDefault();
      if (!event.repeat) {
        tryDash();
      }
      return;
    }

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
    dom.actionBtn.addEventListener("click", () => {
      if (state.running && !state.finished) {
        return;
      }
      startGame();
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    bindTouchControls();
  }

  function setupDebugApi() {
    // Expose read-only snapshot for automated tests/bot sessions.
    window.__RUINS_DASH_DEBUG__ = {
      getState() {
        const p = state.player;
        return {
          running: state.running,
          paused: state.paused,
          finished: state.finished,
          victory: state.victory,
          elapsed: state.elapsed,
          score: state.score,
          relics: state.relics,
          difficulty: state.difficulty,
          player: p
            ? {
                x: p.x,
                y: p.y,
                r: p.r,
                lives: p.lives,
                invuln: p.invuln,
                dashCooldownLeft: p.dashCooldownLeft,
                dashTimeLeft: p.dashTimeLeft,
              }
            : null,
          relic: state.relic
            ? { x: state.relic.x, y: state.relic.y, r: state.relic.r }
            : null,
          enemies: state.enemies.map((e) => ({
            x: e.x,
            y: e.y,
            r: e.r,
            baseSpeed: e.baseSpeed,
            stunLeft: e.stunLeft || 0,
          })),
        };
      },
    };
  }

  function init() {
    bindEvents();
    setupDebugApi();
    renderLeaderboard();
    updateActionButton();
    showOverlay("Clique sur Demarrer pour jouer. Espace = dash defensive.");
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
