"use strict";

(() => {
  const CONFIG = {
    width: 960,
    height: 540,
    objectiveSeconds: 60,
    playerSpeed: 260,
    playerRadius: 13,
    playerMaxLives: 6,
    dashDuration: 0.22,
    dashCooldown: 1.2,
    dashBoost: 2.7,
    hitInvuln: 0.8,
    enemySpeed: 115,
    enemySpawnEvery: 1.35,
    chronoDuration: 4.2,
    audioEnabledKey: "ruins_dash_audio_enabled_v1",
    leaderboardKey: "ruins_dash_scores_v5_dom",
  };

  const dom = {
    arena: document.getElementById("arena"),
    overlay: document.getElementById("overlay"),
    actionBtn: document.getElementById("actionBtn"),
    dashBtn: document.getElementById("dashBtn"),
    audioBtn: document.getElementById("audioBtn"),
    audioVal: document.getElementById("audioVal"),
    livesVal: document.getElementById("livesVal"),
    timeVal: document.getElementById("timeVal"),
    goalVal: document.getElementById("goalVal"),
    scoreVal: document.getElementById("scoreVal"),
    relicVal: document.getElementById("relicVal"),
    comboVal: document.getElementById("comboVal"),
    shieldVal: document.getElementById("shieldVal"),
    enemyVal: document.getElementById("enemyVal"),
    dashVal: document.getElementById("dashVal"),
    dangerVal: document.getElementById("dangerVal"),
    leaderboard: document.getElementById("leaderboard"),
  };

  const state = {
    running: false, paused: false, autoPaused: false, finished: false, victory: false,
    elapsed: 0, score: 0, relics: 0,
    comboCount: 0, comboMultiplier: 1, comboTimer: 0,
    timeSlowLeft: 0, spawnRecoveryLeft: 0, difficulty: 1,
    enemySpawnTimer: 0,
    keys: new Set(), botInput: null,
    player: null, enemies: [], relic: null, healOrb: null, aegisOrb: null, chronoOrb: null, surgeOrb: null,
    miniBoss: null, bossTelegraphs: [], bossProjectiles: [],
    audio: { enabled: true },
    reducedFx: false,
    entities: new Map(),
  };

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function createPlayer() {
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.8, r: CONFIG.playerRadius, lives: CONFIG.playerMaxLives, shieldHits: 0, invuln: 0, dashCooldownLeft: 0, dashTimeLeft: 0 };
  }

  function spawnPoint(pad = 30) { return { x: rand(pad, CONFIG.width - pad), y: rand(pad, CONFIG.height - pad), r: 10 }; }
  function spawnRelic() { return { ...spawnPoint(36), r: 11 }; }
  function spawnHealOrb() { return { ...spawnPoint(38), r: 10 }; }
  function spawnAegisOrb() { return { ...spawnPoint(38), r: 10 }; }
  function spawnChronoOrb() { return { ...spawnPoint(38), r: 10 }; }
  function spawnSurgeOrb() { return { ...spawnPoint(38), r: 11, life: 6.2 }; }
  function spawnEnemy(type = "stalker", x = null, y = null) {
    return { type, x: x ?? rand(20, CONFIG.width - 20), y: y ?? rand(20, CONFIG.height - 20), r: 12, baseSpeed: CONFIG.enemySpeed, stunLeft: 0 };
  }

  function resetRun() {
    state.running = true; state.paused = false; state.autoPaused = false; state.finished = false; state.victory = false;
    state.elapsed = 0; state.score = 0; state.relics = 0; state.comboCount = 0; state.comboMultiplier = 1; state.comboTimer = 0;
    state.timeSlowLeft = 0; state.spawnRecoveryLeft = 0; state.enemySpawnTimer = 0; state.difficulty = 1;
    state.player = createPlayer(); state.enemies = []; state.relic = spawnRelic();
    state.healOrb = null; state.aegisOrb = null; state.chronoOrb = null; state.surgeOrb = null;
    dom.overlay.classList.add("hidden");
  }

  function endRun(victory, msg) {
    state.running = false; state.finished = true; state.victory = !!victory;
    saveLeaderboard({ score: Math.floor(state.score), relics: state.relics, elapsed: Number(state.elapsed.toFixed(1)), victory: state.victory });
    renderLeaderboard();
    dom.overlay.textContent = msg;
    dom.overlay.classList.remove("hidden");
  }

  function saveLeaderboard(row) {
    const list = loadLeaderboard();
    list.push(row);
    list.sort((a, b) => b.score - a.score || b.relics - a.relics);
    localStorage.setItem(CONFIG.leaderboardKey, JSON.stringify(list.slice(0, 5)));
  }
  function loadLeaderboard() {
    try { const raw = localStorage.getItem(CONFIG.leaderboardKey); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  function renderLeaderboard() {
    dom.leaderboard.innerHTML = "";
    const board = loadLeaderboard();
    if (!board.length) { const li = document.createElement("li"); li.textContent = "Aucun score"; dom.leaderboard.appendChild(li); return; }
    for (const row of board) { const li = document.createElement("li"); li.textContent = `${row.score} pts | ${row.relics} reliques | ${row.elapsed}s`; dom.leaderboard.appendChild(li); }
  }

  function getMovement() {
    let dx = 0, dy = 0;
    if (state.botInput) {
      dx += (state.botInput.left ? -1 : 0) + (state.botInput.right ? 1 : 0);
      dy += (state.botInput.up ? -1 : 0) + (state.botInput.down ? 1 : 0);
    }
    if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.keys.has("A")) dx -= 1;
    if (state.keys.has("ArrowRight") || state.keys.has("d") || state.keys.has("D")) dx += 1;
    if (state.keys.has("ArrowUp") || state.keys.has("w") || state.keys.has("W")) dy -= 1;
    if (state.keys.has("ArrowDown") || state.keys.has("s") || state.keys.has("S")) dy += 1;
    const n = Math.hypot(dx, dy) || 1;
    return { dx: dx / n, dy: dy / n };
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function overlap(a, b, extra = 0) { return dist(a, b) <= (a.r + b.r + extra); }

  function tryDash() {
    const p = state.player;
    if (!state.running || !p || p.dashCooldownLeft > 0 || p.dashTimeLeft > 0) return false;
    p.dashTimeLeft = CONFIG.dashDuration;
    p.dashCooldownLeft = CONFIG.dashCooldown;
    p.invuln = Math.max(p.invuln, CONFIG.hitInvuln);
    return true;
  }

  function collectPickup(key, scoreAdd, cb) {
    const p = state.player;
    const item = state[key];
    if (!item || !overlap(p, item, 8)) return;
    state[key] = null;
    state.score += scoreAdd;
    if (cb) cb();
  }

  function update(dt) {
    if (!state.running || state.finished || state.paused) return;

    const p = state.player;
    state.elapsed += dt;
    state.score += dt * 11;
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0 && state.comboCount > 0) { state.comboCount = 0; state.comboMultiplier = 1; }
    state.timeSlowLeft = Math.max(0, state.timeSlowLeft - dt);
    state.spawnRecoveryLeft = Math.max(0, state.spawnRecoveryLeft - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCooldownLeft = Math.max(0, p.dashCooldownLeft - dt);
    p.dashTimeLeft = Math.max(0, p.dashTimeLeft - dt);

    const mv = getMovement();
    const speed = CONFIG.playerSpeed * (p.dashTimeLeft > 0 ? CONFIG.dashBoost : 1);
    p.x = clamp(p.x + mv.dx * speed * dt, p.r, CONFIG.width - p.r);
    p.y = clamp(p.y + mv.dy * speed * dt, p.r, CONFIG.height - p.r);

    state.enemySpawnTimer += dt;
    const spawnEvery = CONFIG.enemySpawnEvery + state.spawnRecoveryLeft * 0.6;
    if (state.enemySpawnTimer >= spawnEvery && state.enemies.length < 12) {
      state.enemySpawnTimer = 0;
      state.enemies.push(spawnEnemy());
    }

    const enemyScale = state.timeSlowLeft > 0 ? 0.66 : 1;
    for (const e of state.enemies) {
      const d = Math.max(1, dist(e, p));
      e.x += ((p.x - e.x) / d) * e.baseSpeed * enemyScale * dt;
      e.y += ((p.y - e.y) / d) * e.baseSpeed * enemyScale * dt;
    }

    for (const e of state.enemies) {
      if (overlap(p, e)) {
        if (p.invuln <= 0) {
          p.lives -= 1;
          p.invuln = CONFIG.hitInvuln;
          state.spawnRecoveryLeft = 2.2;
          if (p.lives === 1 && !state.healOrb) state.healOrb = spawnHealOrb();
        }
      }
    }

    if (state.relic && overlap(p, state.relic, 22)) {
      state.relic = null;
      state.relics += 1;
      state.comboCount += 1;
      state.comboTimer = 3.2;
      state.comboMultiplier = 1 + Math.min(1.4, state.comboCount * 0.16);
      state.score += Math.floor(240 * state.comboMultiplier);
      state.relic = spawnRelic();
      if (state.relics % 3 === 0 && p.lives < CONFIG.playerMaxLives && !state.healOrb) state.healOrb = spawnHealOrb();
      if (state.relics % 4 === 0 && !state.chronoOrb) state.chronoOrb = spawnChronoOrb();
      if (state.comboCount >= 3 && p.dashCooldownLeft > 0.2 && !state.surgeOrb) state.surgeOrb = spawnSurgeOrb();
    }

    collectPickup("healOrb", 90, () => { p.lives = Math.min(CONFIG.playerMaxLives, p.lives + 1); });
    collectPickup("aegisOrb", 70, () => { p.shieldHits = Math.min(2, p.shieldHits + 1); });
    collectPickup("chronoOrb", 120, () => { state.timeSlowLeft = Math.max(state.timeSlowLeft, CONFIG.chronoDuration); });
    collectPickup("surgeOrb", 180, () => { p.dashCooldownLeft = 0; });

    if (state.surgeOrb) {
      state.surgeOrb.life -= dt;
      if (state.surgeOrb.life <= 0) state.surgeOrb = null;
    }

    state.difficulty = clamp(0.8 + state.elapsed * 0.01 + state.relics * 0.02, 0.8, 2.2);

    if (p.lives <= 0) return endRun(false, "Defaite. Clique sur Demarrer pour rejouer.");
    if (state.elapsed >= CONFIG.objectiveSeconds) return endRun(true, "Victoire. Tu as tenu 60 secondes.");
  }

  function ensureEl(key, cls) {
    if (!state.entities.has(key)) {
      const el = document.createElement("div");
      el.className = `entity ${cls}`;
      dom.arena.appendChild(el);
      state.entities.set(key, el);
    }
    return state.entities.get(key);
  }
  function place(el, o) {
    if (!o) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.style.left = `${(o.x / CONFIG.width) * 100}%`;
    el.style.top = `${(o.y / CONFIG.height) * 100}%`;
    el.style.width = `${o.r * 2}px`;
    el.style.height = `${o.r * 2}px`;
  }

  function renderWorld() {
    const p = state.player;
    if (!p) return;
    place(ensureEl("player", "player"), p);
    place(ensureEl("relic", "relic"), state.relic);
    place(ensureEl("heal", "orb"), state.healOrb);
    place(ensureEl("aegis", "orb"), state.aegisOrb);
    place(ensureEl("chrono", "orb"), state.chronoOrb);
    place(ensureEl("surge", "orb"), state.surgeOrb);

    const seen = new Set();
    state.enemies.forEach((e, i) => {
      const key = `enemy-${i}`;
      seen.add(key);
      place(ensureEl(key, "enemy"), e);
    });
    for (const [k, el] of state.entities.entries()) {
      if (k.startsWith("enemy-") && !seen.has(k)) el.style.display = "none";
    }
  }

  function syncHud() {
    const p = state.player;
    if (!p) return;
    dom.goalVal.textContent = `${CONFIG.objectiveSeconds}s`;
    dom.livesVal.textContent = `${Math.max(0, p.lives)}`;
    dom.shieldVal.textContent = `${p.shieldHits || 0}`;
    dom.timeVal.textContent = `${state.elapsed.toFixed(1)}s`;
    dom.scoreVal.textContent = `${Math.floor(state.score)}`;
    dom.relicVal.textContent = `${state.relics}`;
    dom.comboVal.textContent = state.comboCount > 0 ? `x${state.comboMultiplier.toFixed(2)}` : "x1.00";
    dom.enemyVal.textContent = `${state.enemies.length}`;
    dom.dashVal.textContent = p.dashCooldownLeft <= 0 ? "Pret" : `${p.dashCooldownLeft.toFixed(1)}s`;
    dom.dangerVal.textContent = p.lives <= 1 ? "CRIT" : state.difficulty < 1.2 ? "I" : state.difficulty < 1.6 ? "II" : "III";
    dom.audioVal.textContent = state.audio.enabled ? "ON" : "OFF";
    dom.audioBtn.setAttribute("aria-pressed", state.audio.enabled ? "true" : "false");
  }

  function getState() {
    const p = state.player;
    return {
      running: state.running, paused: state.paused, autoPaused: state.autoPaused,
      finished: state.finished, victory: state.victory, elapsed: state.elapsed,
      score: state.score, relics: state.relics, comboCount: state.comboCount,
      comboTimer: state.comboTimer, comboMultiplier: state.comboMultiplier,
      pendingDashLeft: 0, timeSlowLeft: state.timeSlowLeft,
      spawnRecoveryLeft: state.spawnRecoveryLeft, difficulty: state.difficulty,
      objectiveSeconds: CONFIG.objectiveSeconds, nextCheckpointAt: 15,
      audioEnabled: state.audio.enabled, reducedFx: state.reducedFx,
      directives: { active: null, cooldown: 0, completed: 0, failed: 0 },
      stats: { maxComboMultiplier: state.comboMultiplier, nearMisses: 0, bossBreaks: 0, damageTaken: CONFIG.playerMaxLives - (p?.lives || 0), directivesCompleted: 0 },
      player: p ? { x: p.x, y: p.y, r: p.r, lives: p.lives, shieldHits: p.shieldHits || 0, invuln: p.invuln, dashCooldownLeft: p.dashCooldownLeft, dashTimeLeft: p.dashTimeLeft } : null,
      relic: state.relic ? { ...state.relic } : null,
      healOrb: state.healOrb ? { ...state.healOrb } : null,
      aegisOrb: state.aegisOrb ? { ...state.aegisOrb } : null,
      chronoOrb: state.chronoOrb ? { ...state.chronoOrb } : null,
      surgeOrb: state.surgeOrb ? { ...state.surgeOrb } : null,
      miniBoss: state.miniBoss,
      enemies: state.enemies.map((e) => ({ ...e })),
      bossTelegraphs: [], bossProjectiles: [],
    };
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = !!enabled;
    try { localStorage.setItem(CONFIG.audioEnabledKey, enabled ? "1" : "0"); } catch {}
    syncHud();
  }

  function handleVisibilityChange(hidden = document.hidden) {
    if (hidden) {
      if (state.running && !state.finished && !state.paused) {
        state.paused = true;
        state.autoPaused = true;
      }
      return;
    }
    if (state.autoPaused) state.autoPaused = false;
  }

  function setupDebugApi() {
    window.__RUINS_DASH_DEBUG__ = {
      getState,
      startGame() { resetRun(); syncHud(); renderWorld(); return getState(); },
      setBotInput(input) { state.botInput = { left: !!input?.left, right: !!input?.right, up: !!input?.up, down: !!input?.down }; },
      step(dt = 1 / 60, input = null) {
        if (input) { this.setBotInput(input); if (input.dash) tryDash(); }
        update(clamp(Number(dt) || 0.016, 0.001, 0.2));
        renderWorld(); syncHud();
        return getState();
      },
      clearBotInput() { state.botInput = null; },
      setAudioEnabled,
      setReducedFx(enabled) { state.reducedFx = !!enabled; },
      setPaused(enabled) { state.paused = !!enabled; if (!enabled) state.autoPaused = false; },
      simulateVisibility(hidden) { handleVisibilityChange(!!hidden); return getState(); },
      setPlayerPosition(x, y) { if (!state.player) return; state.player.x = clamp(Number(x) || state.player.x, state.player.r, CONFIG.width - state.player.r); state.player.y = clamp(Number(y) || state.player.y, state.player.r, CONFIG.height - state.player.r); },
      setPlayerLives(lives) { if (!state.player) return; state.player.lives = clamp(Math.round(Number(lives) || state.player.lives), 0, CONFIG.playerMaxLives); },
      spawnEnemy(type = "stalker", x = null, y = null) { const e = spawnEnemy(type, x, y); state.enemies.push(e); return { ...e }; },
      spawnChronoOrb() { state.chronoOrb = spawnChronoOrb(); return state.chronoOrb ? { ...state.chronoOrb } : null; },
      spawnSurgeOrb() { state.surgeOrb = spawnSurgeOrb(); return state.surgeOrb ? { ...state.surgeOrb } : null; },
      activateDirective() { return null; },
    };
  }

  function bindEvents() {
    dom.actionBtn.addEventListener("click", () => window.__RUINS_DASH_DEBUG__.startGame());
    dom.dashBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); tryDash(); syncHud(); });
    dom.audioBtn.addEventListener("click", () => setAudioEnabled(!state.audio.enabled));
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") { e.preventDefault(); tryDash(); return; }
      if (e.key === "p" || e.key === "P") { state.paused = !state.paused; state.autoPaused = false; return; }
      if (e.key === "m" || e.key === "M") { setAudioEnabled(!state.audio.enabled); return; }
      if (e.key === "r" || e.key === "R") { resetRun(); return; }
      state.keys.add(e.key);
    });
    window.addEventListener("keyup", (e) => state.keys.delete(e.key));
    document.addEventListener("visibilitychange", () => handleVisibilityChange(document.hidden));
  }

  function rafLoop(ts) {
    if (!rafLoop.last) rafLoop.last = ts;
    const dt = clamp((ts - rafLoop.last) / 1000, 0, 0.05);
    rafLoop.last = ts;
    update(dt);
    renderWorld();
    syncHud();
    requestAnimationFrame(rafLoop);
  }

  function init() {
    try { if (localStorage.getItem(CONFIG.audioEnabledKey) === "0") state.audio.enabled = false; } catch {}
    resetRun(); state.running = false; state.finished = false;
    dom.overlay.classList.remove("hidden");
    bindEvents();
    setupDebugApi();
    renderLeaderboard();
    syncHud();
    requestAnimationFrame(rafLoop);
  }

  init();
})();
