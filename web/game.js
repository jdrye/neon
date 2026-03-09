"use strict";

/**
 * Ruins Dash - arcade survival edition (v2 — improved visuals, perf, gameplay feedback).
 *
 * Improvements over v1:
 *  - Player renders as a directional dart/ship shape (rotates with movement)
 *  - Each enemy type has a unique polygon shape (star, blade, arrow, tendril orb, shuriken)
 *  - Mini-boss has rotating armor-ring segments per phase
 *  - Richer background: layered nebulas, aurora bands, drifting dust
 *  - Gradient cache: heavy gradient objects are reused across frames
 *  - Danger border: red pulsing screen edge when player HP ≤ 2
 *  - Combo aura: hexagonal glow around player at combo ≥ 3
 *  - Score milestones (500 / 1000 / 2500 / 5000) trigger special callouts
 *  - Low-HP heartbeat effect on HUD lives value
 *  - Dash leaves a motion-blur smear trail
 *  - Better floating text animation (scale-in + rise)
 *  - Enemy wind-up ring telegraph improved
 *  - All debug / test API preserved identically
 */
(() => {
  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const CONFIG = {
    width: 960,
    height: 540,
    objectiveSeconds: 60,

    playerRadius: 16,
    playerSpeed: 340,
    playerInputResponse: 18,
    playerReleaseResponse: 12,
    playerMaxLives: 6,
    hitInvulnerability: 1.45,
    hurtOverlayDecay: 1.85,

    dashBoost: 3.1,
    dashDuration: 0.26,
    dashCooldown: 1.2,
    dashInvuln: 0.42,
    dashShockRadius: 88,
    dashBuffer: 0.18,

    enemySpawnBaseInterval: 8.4,
    enemySpawnMinInterval: 5.4,
    hitRecoverySpawnEaseDuration: 2.4,
    hitRecoverySpawnEaseAmount: 1.05,
    enemyMax: 5,
    enemyGraceSeconds: 3.8,
    enemySafeSpawnFromPlayer: 250,
    enemySafeSpawnFromRelic: 170,
    enemySeparationStrength: 0.52,
    wispMinSpawnTime: 24,
    wispMaxActive: 1,
    wispBurstCooldownMin: 4.6,
    wispBurstCooldownMax: 6.8,
    wispBurstWindupMin: 0.26,
    wispBurstWindupMax: 0.4,
    wispBurstSpeedMul: 2.45,
    spinnerMinSpawnTime: 20,
    spinnerMaxActive: 1,
    spinnerSpinCooldownMin: 4.8,
    spinnerSpinCooldownMax: 6.8,
    spinnerSpinWindupMin: 0.26,
    spinnerSpinWindupMax: 0.42,
    spinnerSpinDuration: 0.22,
    spinnerSpinSpeedMul: 2.04,

    relicRadius: 12,
    relicCatchBonus: 22,
    relicSafeFromEnemy: 90,
    relicSafeFromPlayer: 90,

    healRadius: 11,
    healEveryRelics: 3,
    chronoRadius: 10,
    chronoEveryRelics: 4,
    chronoDuration: 4.2,
    chronoSlowFactor: 0.66,
    surgeRadius: 11,
    surgeLife: 6.2,
    surgeComboThreshold: 3,
    surgeScore: 180,
    checkpointEverySeconds: 15,
    checkpointScoreBonus: 160,
    checkpointPulseRadius: 168,

    bossSpawnAt: 30,
    bossRadius: 30,
    bossMaxHealth: 7,
    bossSpeed: 80,
    bossPhase2Ratio: 0.66,
    bossPhase3Ratio: 0.33,
    bossChargeCooldownMin: 4.8,
    bossChargeCooldownMax: 7.2,
    bossChargeWindup: 0.45,
    bossChargeDuration: 0.42,
    bossChargeSpeed: 350,
    bossSpawnMinionEvery: 9,
    bossProjectileCooldownMin: 4.6,
    bossProjectileCooldownMax: 6.8,
    bossProjectileTelegraph: 0.54,
    bossProjectileSpeed: 238,
    bossProjectileRadius: 7,
    bossProjectileLife: 2.2,
    bossVolleyRecover: 1,
    bossAttackLock: 0.24,
    bossMinVolleyDistance: 120,
    bossSweepStepDelay: 0.09,
    bossNovaCooldownMin: 8.2,
    bossNovaCooldownMax: 10.8,
    bossNovaStepDelay: 0.042,
    bossHitScore: 140,
    bossDefeatScore: 900,

    scorePerSecond: 14,
    scorePerRelic: 240,
    scorePerHeal: 90,
    comboWindow: 3.4,
    comboMaxMultiplier: 2.4,
    comboStepMultiplier: 0.16,
    nearMissBonus: 65,
    nearMissRadius: 34,

    aegisRadius: 11,
    aegisEveryRelics: 5,
    shieldMaxHits: 2,

    touchDeadZone: 10,
    starsCount: 120,
    impactRingMax: 240,
    impactRingLife: 0.36,
    floatingTextLife: 0.82,

    directiveStartDelay: 4.2,
    directiveCooldownMin: 4.6,
    directiveCooldownMax: 7.4,
    directiveRewardScore: 220,
    directiveRelicDuration: 12.4,
    directiveRelicLateDuration: 11.2,
    directiveRelicTargetEarly: 2,
    directiveRelicTargetLate: 3,
    directiveEvadeDuration: 8.5,
    directiveDashDuration: 10.5,
    directiveDashTarget: 3,
    directiveBossDuration: 9.4,

    leaderboardSize: 5,
    leaderboardKey: "ruins_dash_scores_v4",
    audioEnabledKey: "ruins_dash_audio_enabled_v1",
    reducedFxKey: "ruins_dash_reduced_fx_v1",
  };

  const OBSTACLES = [
    { x: 150, y: 118, w: 170, h: 22 },
    { x: 640, y: 118, w: 170, h: 22 },
    { x: 300, y: 248, w: 360, h: 28 },
    { x: 350, y: 392, w: 260, h: 22 },
  ];

  const ENEMY_STYLES = {
    stalker: { color: "#ff8b8b", outline: "#ffe3e3", radius: 13 },
    drifter: { color: "#ffb26f", outline: "#ffe2c4", radius: 11 },
    lancer: { color: "#d08fff", outline: "#f3dfff", radius: 12 },
    wisp: { color: "#87d9ff", outline: "#d9f3ff", radius: 10 },
    spinner: { color: "#9dffba", outline: "#dffff0", radius: 11 },
  };

  // Score milestones for callouts
  const SCORE_MILESTONES = [500, 1000, 2500, 5000, 7500, 10000];

  // ─── DOM ────────────────────────────────────────────────────────────────────
  const dom = {
    canvas: document.getElementById("game"),
    actionBtn: document.getElementById("actionBtn"),
    dashBtn: document.getElementById("dashBtn"),
    audioBtn: document.getElementById("audioBtn"),
    audioVal: document.getElementById("audioVal"),
    overlay: document.getElementById("overlay"),
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
    contractTag: document.getElementById("contractTag"),
    contractTimer: document.getElementById("contractTimer"),
    contractText: document.getElementById("contractText"),
    contractFill: document.getElementById("contractFill"),
    eventText: document.getElementById("eventText"),
    leaderboard: document.getElementById("leaderboard"),
  };

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  // ─── GRADIENT CACHE ────────────────────────────────────────────────────────
  // Re-use expensive gradient objects instead of creating them every frame.
  const _gradCache = new Map();
  function getCachedLinearGrad(key, x0, y0, x1, y1, stops) {
    if (_gradCache.has(key)) return _gradCache.get(key);
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c] of stops) g.addColorStop(t, c);
    _gradCache.set(key, g);
    return g;
  }

  // ─── STATE ─────────────────────────────────────────────────────────────────
  const state = {
    running: false,
    paused: false,
    autoPaused: false,
    finished: false,
    victory: false,

    elapsed: 0,
    score: 0,
    relics: 0,
    comboCount: 0,
    comboTimer: 0,
    comboMultiplier: 1,

    enemySpawnTimer: 0,
    enemyGraceLeft: CONFIG.enemyGraceSeconds,
    flashTimer: 0,

    shakeTime: 0,
    shakePower: 0,
    chromaPulse: 0,
    hurtOverlay: 0,
    hitStopLeft: 0,
    pendingDashLeft: 0,
    timeSlowLeft: 0,
    spawnRecoveryLeft: 0,

    difficulty: 1,
    nextCheckpointAt: CONFIG.checkpointEverySeconds,
    nextMilestoneIdx: 0,
    directives: { active: null, cooldown: CONFIG.directiveStartDelay, completed: 0, failed: 0, lastType: "", flash: 0 },
    stats: { maxComboMultiplier: 1, nearMisses: 0, bossBreaks: 0, damageTaken: 0, directivesCompleted: 0 },

    player: null,
    enemies: [],
    relic: null,
    healOrb: null,
    aegisOrb: null,
    chronoOrb: null,
    surgeOrb: null,

    miniBoss: null,
    bossSpawned: false,
    bossIntroTimer: 0,
    bossCalloutTimer: 0,
    bossCalloutText: "",
    bossCalloutTone: "normal",
    bossTelegraphs: [],
    bossProjectiles: [],

    particles: [],
    impactRings: [],
    trails: [],
    floatingTexts: [],
    stars: [],
    dustClouds: [],

    keys: new Set(),
    botInput: null,
    touch: { active: false, x: 0, y: 0 },
    frame: { lastTs: 0 },

    audio: { enabled: true, ctx: null, master: null },
    reducedFx: false,
  };

  // ─── PLAYER ────────────────────────────────────────────────────────────────
  function createPlayer() {
    return {
      x: CONFIG.width * 0.5,
      y: CONFIG.height - 62,
      r: CONFIG.playerRadius,
      lives: CONFIG.playerMaxLives,
      shieldHits: 0,
      invuln: 0,
      dashCooldownLeft: 0,
      dashTimeLeft: 0,
      moveX: 0,
      moveY: 0,
      lastMoveX: 1,
      lastMoveY: 0,
    };
  }

  function createRunStats() {
    return {
      maxComboMultiplier: 1,
      nearMisses: 0,
      bossBreaks: 0,
      damageTaken: 0,
      directivesCompleted: 0,
    };
  }

  function createDirectiveState() {
    return {
      active: null,
      cooldown: CONFIG.directiveStartDelay,
      completed: 0,
      failed: 0,
      lastType: "",
      flash: 0,
    };
  }

  // ─── GAME LIFECYCLE ────────────────────────────────────────────────────────
  function startGame() {
    state.running = true;
    state.paused = false;
    state.autoPaused = false;
    state.finished = false;
    state.victory = false;

    state.elapsed = 0;
    state.score = 0;
    state.relics = 0;
    state.comboCount = 0;
    state.comboTimer = 0;
    state.comboMultiplier = 1;

    state.enemySpawnTimer = 0;
    state.enemyGraceLeft = CONFIG.enemyGraceSeconds;
    state.flashTimer = 0;

    state.shakeTime = 0;
    state.shakePower = 0;
    state.chromaPulse = 0;
    state.hurtOverlay = 0;
    state.hitStopLeft = 0;
    state.pendingDashLeft = 0;
    state.timeSlowLeft = 0;
    state.spawnRecoveryLeft = 0;

    state.difficulty = 1;
    state.nextCheckpointAt = CONFIG.checkpointEverySeconds;
    state.nextMilestoneIdx = 0;
    state.directives = createDirectiveState();
    state.stats = createRunStats();

    state.player = createPlayer();
    state.enemies = [];
    state.relic = spawnRelic(state.player);
    state.healOrb = null;
    state.aegisOrb = null;
    state.chronoOrb = null;
    state.surgeOrb = null;

    state.miniBoss = null;
    state.bossSpawned = false;
    state.bossIntroTimer = 0;
    state.bossCalloutTimer = 0;
    state.bossCalloutText = "";
    state.bossCalloutTone = "normal";
    state.bossTelegraphs = [];
    state.bossProjectiles = [];

    state.particles = [];
    state.impactRings = [];
    state.trails = [];
    state.floatingTexts = [];
    state.directives.flash = 0;
    state.botInput = null;
    state.keys.clear();
    state.touch.active = false;

    updateActionButton();
    dom.actionBtn.blur();
    hideOverlay();
    syncHud();
    playSfx("start");
  }

  function endGame(victory, message) {
    state.running = false;
    state.paused = false;
    state.autoPaused = false;
    state.finished = true;
    state.victory = victory;

    const summaryMessage =
      message ||
      (victory ? "Tu as tenu jusqu'a la fermeture de la faille." : "Tu as ete submerge.");

    saveLeaderboardEntry({
      score: Math.floor(state.score),
      relics: state.relics,
      elapsed: Number(state.elapsed.toFixed(1)),
      victory,
    });

    renderLeaderboard();
    updateActionButton();
    playSfx(victory ? "win" : "lose");

    const title = victory ? "Victoire" : "Defaite";
    const style = victory ? "good" : "bad";
    showOverlay(
      `<div class="${style}">${title}</div><div>${summaryMessage}</div><div>Score: ${Math.floor(state.score)}</div><div>Reliques: ${state.relics}</div><div>Temps: ${state.elapsed.toFixed(1)}s</div><div style="margin-top:.55rem; font-size:.92rem; font-weight:500; line-height:1.55;">Directives: ${state.stats.directivesCompleted} | Combo max: x${state.stats.maxComboMultiplier.toFixed(2)}<br />Near-miss: ${state.stats.nearMisses} | Bris boss: ${state.stats.bossBreaks} | Impacts: ${state.stats.damageTaken}</div><div style="margin-top:.6rem; font-size:.95rem; font-weight:500;">Clique sur Rejouer pour relancer.</div>`
    );
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────
  function update(dt) {
    if (!state.running || state.paused || !state.player) return;

    state.hurtOverlay = Math.max(0, state.hurtOverlay - dt * CONFIG.hurtOverlayDecay);
    state.timeSlowLeft = Math.max(0, state.timeSlowLeft - dt);
    state.spawnRecoveryLeft = Math.max(0, state.spawnRecoveryLeft - dt);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.surgeOrb) {
      state.surgeOrb.life -= dt;
      if (state.surgeOrb.life <= 0) state.surgeOrb = null;
    }
    if (state.comboTimer <= 0 && state.comboCount > 0) breakCombo();

    if (state.hitStopLeft > 0) {
      state.hitStopLeft = Math.max(0, state.hitStopLeft - dt);
      state.flashTimer = Math.max(0, state.flashTimer - dt * 1.4);
      state.chromaPulse = Math.max(0, state.chromaPulse - dt * 2);
      updateParticles(dt * 0.25);
      updateImpactRings(dt * 0.3);
      updateFloatingTexts(dt * 0.35);
      syncHud();
      return;
    }

    state.elapsed += dt;
    state.score += dt * CONFIG.scorePerSecond;
    state.flashTimer = Math.max(0, state.flashTimer - dt);
    state.bossIntroTimer = Math.max(0, state.bossIntroTimer - dt);
    state.bossCalloutTimer = Math.max(0, state.bossCalloutTimer - dt);
    state.chromaPulse = Math.max(0, state.chromaPulse - dt * 2.2);
    state.shakeTime = Math.max(0, state.shakeTime - dt);
    if (state.shakeTime <= 0) state.shakePower = 0;

    // Score milestones
    checkScoreMilestones();

    state.difficulty = computeDifficulty();

    const player = state.player;
    player.invuln = Math.max(0, player.invuln - dt);
    player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - dt);
    player.dashTimeLeft = Math.max(0, player.dashTimeLeft - dt);
    state.pendingDashLeft = Math.max(0, state.pendingDashLeft - dt);

    if (state.pendingDashLeft > 0 && player.dashCooldownLeft <= 0 && player.dashTimeLeft <= 0) {
      tryDash();
    }

    updatePlayer(dt, player);
    updateEnemies(dt, player);
    maybeSpawnMiniBoss(player);
    updateMiniBoss(dt, player);
    updateBossTelegraphs(dt);
    updateBossProjectiles(dt, player);
    updateDirectives(dt, player);

    maybeCollectRelic(player);
    maybeCollectHeal(player);
    maybeCollectAegis(player);
    maybeCollectChrono(player);
    maybeCollectSurge(player);
    maybeTakeDamage(player);
    maybeTriggerCheckpoint(player);

    updateParticles(dt);
    updateImpactRings(dt);
    updateTrails(dt, player);
    updateFloatingTexts(dt);
    updateDustClouds(dt);

    if (player.lives <= 0) { endGame(false, "Les ombres ont pris le dessus."); return; }
    if (state.elapsed >= CONFIG.objectiveSeconds) { endGame(true, "Tu as tenu la ligne jusqu'a l'aube."); return; }

    syncHud();
  }

  function checkScoreMilestones() {
    if (state.nextMilestoneIdx >= SCORE_MILESTONES.length) return;
    const next = SCORE_MILESTONES[state.nextMilestoneIdx];
    if (state.score >= next) {
      state.nextMilestoneIdx++;
      const player = state.player;
      if (player) {
        addFloatingText(player.x, player.y - 36, `★ ${Math.floor(next)} pts ★`, [255, 228, 100], 1.1, 18);
        showBossCallout(`Score ${Math.floor(next)}!`, 1.0, "good");
        emitParticles(player.x, player.y, [255, 230, 100], 22, 180, 0.6, 3);
        playSfx("checkpoint");
      }
    }
  }

  // ─── BOSS ──────────────────────────────────────────────────────────────────
  function maybeSpawnMiniBoss(player) {
    if (state.bossSpawned || state.elapsed < CONFIG.bossSpawnAt) return;
    state.bossSpawned = true;
    state.bossIntroTimer = 2.4;
    state.miniBoss = spawnMiniBoss(player);
    triggerShake(0.28, 3.8);
    emitParticles(state.miniBoss.x, state.miniBoss.y, [227, 161, 255], 42, 290, 0.9, 4);
    addImpactRing(state.miniBoss.x, state.miniBoss.y, [230, 170, 255], 260, 0.54, 3.4);
    state.chromaPulse = Math.max(state.chromaPulse, 0.26);
    state.flashTimer = 0.34;
    showBossCallout("Mini-boss detecte", 1.9, "warn");
    playSfx("bossSpawn");
  }

  function spawnMiniBoss(player) {
    const base = {
      r: CONFIG.bossRadius,
      health: CONFIG.bossMaxHealth,
      maxHealth: CONFIG.bossMaxHealth,
      phase: 1,
      baseSpeed: CONFIG.bossSpeed,
      stunLeft: 0,
      windupLeft: 0,
      chargeTimeLeft: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      chargeCooldown: rand(CONFIG.bossChargeCooldownMin, CONFIG.bossChargeCooldownMax),
      spawnMinionTimer: CONFIG.bossSpawnMinionEvery,
      shockwaveCooldown: 9,
      projectileCooldown: rand(CONFIG.bossProjectileCooldownMin, CONFIG.bossProjectileCooldownMax),
      novaCooldown: rand(CONFIG.bossNovaCooldownMin, CONFIG.bossNovaCooldownMax),
      shockwaveWarned: false,
      attackLockLeft: 0,
      volleyRecoverLeft: 0,
      volleyPattern: 0,
      armAngle: 0, // new: rotating armor ring angle
    };
    for (let i = 0; i < 120; i++) {
      const candidate = { x: rand(70, CONFIG.width - 70), y: rand(70, CONFIG.height - 70) };
      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 300) continue;
      if (circleHitsAnyObstacle(candidate.x, candidate.y, CONFIG.bossRadius)) continue;
      return { ...base, x: candidate.x, y: candidate.y };
    }
    return { ...base, x: CONFIG.width * 0.5, y: 90 };
  }

  function getBossPhase(boss) {
    const ratio = boss.health / boss.maxHealth;
    if (ratio <= CONFIG.bossPhase3Ratio) return 3;
    if (ratio <= CONFIG.bossPhase2Ratio) return 2;
    return 1;
  }

  function getBossPhaseParams(phase) {
    if (phase === 2) return { moveSpeedMul: 1.18, chargeWindupMul: 0.9, chargeDurationMul: 1.08, chargeSpeedMul: 1.2, chargeCooldownMin: 3.5, chargeCooldownMax: 5.1, minionEvery: 7.2 };
    if (phase === 3) return { moveSpeedMul: 1.34, chargeWindupMul: 0.75, chargeDurationMul: 1.17, chargeSpeedMul: 1.34, chargeCooldownMin: 2.4, chargeCooldownMax: 3.8, minionEvery: 5.8 };
    return { moveSpeedMul: 1, chargeWindupMul: 1, chargeDurationMul: 1, chargeSpeedMul: 1, chargeCooldownMin: CONFIG.bossChargeCooldownMin, chargeCooldownMax: CONFIG.bossChargeCooldownMax, minionEvery: CONFIG.bossSpawnMinionEvery };
  }

  function updateMiniBoss(dt, player) {
    const boss = state.miniBoss;
    if (!boss) return;
    const simDt = dt * currentEnemyTimeScale();

    const prevPhase = boss.phase;
    boss.phase = getBossPhase(boss);
    const phaseCfg = getBossPhaseParams(boss.phase);
    if (prevPhase !== boss.phase) {
      state.flashTimer = Math.max(state.flashTimer, 0.22);
      addImpactRing(boss.x, boss.y, boss.phase === 2 ? [255, 206, 140] : [241, 154, 255], 190, 0.42, 3);
      showBossCallout(boss.phase === 2 ? "Phase II" : "Phase III", 1.25, "warn");
      playSfx("bossPhase");
    }

    // Rotate armor angle
    boss.armAngle = (boss.armAngle || 0) + simDt * (boss.phase === 3 ? 2.8 : boss.phase === 2 ? 1.8 : 1.1);

    boss.stunLeft = Math.max(0, boss.stunLeft - simDt);
    boss.attackLockLeft = Math.max(0, (boss.attackLockLeft || 0) - simDt);
    boss.volleyRecoverLeft = Math.max(0, (boss.volleyRecoverLeft || 0) - simDt);
    boss.chargeCooldown = Math.max(0, boss.chargeCooldown - simDt);
    boss.spawnMinionTimer = Math.max(0, boss.spawnMinionTimer - simDt);
    boss.shockwaveCooldown = Math.max(0, (boss.shockwaveCooldown || 0) - simDt);
    boss.projectileCooldown = Math.max(0, (boss.projectileCooldown || 0) - simDt);
    boss.novaCooldown = Math.max(0, (boss.novaCooldown || 0) - simDt);

    const toPlayerX = player.x - boss.x;
    const toPlayerY = player.y - boss.y;
    const distToPlayer = Math.max(1, Math.hypot(toPlayerX, toPlayerY));
    const nx = toPlayerX / distToPlayer;
    const ny = toPlayerY / distToPlayer;

    if (boss.stunLeft <= 0 && boss.attackLockLeft <= 0) {
      if (boss.windupLeft > 0) {
        boss.windupLeft -= simDt;
        if (boss.windupLeft <= 0) {
          boss.chargeTimeLeft = CONFIG.bossChargeDuration * phaseCfg.chargeDurationMul;
          boss.chargeDirX = nx;
          boss.chargeDirY = ny;
          playSfx("bossCharge");
          addImpactRing(boss.x, boss.y, [244, 216, 255], 120, 0.24, 2);
        }
      } else if (boss.chargeTimeLeft > 0) {
        boss.chargeTimeLeft -= simDt;
        moveCircleWithCollisions(boss, boss.chargeDirX * CONFIG.bossChargeSpeed * phaseCfg.chargeSpeedMul * simDt, boss.chargeDirY * CONFIG.bossChargeSpeed * phaseCfg.chargeSpeedMul * simDt);
      } else {
        const sway = Math.sin(state.elapsed * 2.2) * 0.42;
        const perpX = -ny; const perpY = nx;
        const followX = nx + perpX * sway;
        const followY = ny + perpY * sway;
        const n = Math.hypot(followX, followY) || 1;
        moveCircleWithCollisions(boss, (followX / n) * boss.baseSpeed * phaseCfg.moveSpeedMul * simDt, (followY / n) * boss.baseSpeed * phaseCfg.moveSpeedMul * simDt);
        if (boss.chargeCooldown <= 0 && distToPlayer > 120) {
          boss.windupLeft = CONFIG.bossChargeWindup * phaseCfg.chargeWindupMul;
          boss.chargeCooldown = rand(phaseCfg.chargeCooldownMin, phaseCfg.chargeCooldownMax);
        }
      }
    }

    if (boss.phase >= 3) {
      if (!boss.shockwaveWarned && boss.shockwaveCooldown <= 1.1) {
        boss.shockwaveWarned = true;
        showBossCallout("Onde de choc imminente", 0.9, "bad");
        playSfx("bossWarn");
      }
      if (boss.shockwaveCooldown <= 0) {
        boss.shockwaveCooldown = rand(6.2, 8.8);
        boss.shockwaveWarned = false;
        unleashBossShockwave(boss, player);
      }
    }

    if (boss.phase >= 2 && boss.projectileCooldown <= 0 && boss.windupLeft <= 0 && boss.chargeTimeLeft <= 0 && boss.attackLockLeft <= 0) {
      if (distToPlayer > CONFIG.bossMinVolleyDistance) {
        queueBossVolley(boss, player, boss.phase);
        boss.attackLockLeft = Math.max(boss.attackLockLeft, CONFIG.bossAttackLock + CONFIG.bossProjectileTelegraph * 0.35);
        boss.chargeCooldown = Math.max(boss.chargeCooldown, 1.35);
        boss.projectileCooldown = boss.phase === 2 ? rand(CONFIG.bossProjectileCooldownMin, CONFIG.bossProjectileCooldownMax) : rand(CONFIG.bossProjectileCooldownMin * 0.82, CONFIG.bossProjectileCooldownMax * 0.84);
      } else {
        boss.projectileCooldown = 0.55;
      }
    }

    if (boss.phase >= 2 && boss.novaCooldown <= 0 && boss.windupLeft <= 0 && boss.chargeTimeLeft <= 0 && boss.attackLockLeft <= 0) {
      queueBossNova(boss, boss.phase);
      boss.attackLockLeft = Math.max(boss.attackLockLeft, CONFIG.bossAttackLock + 0.24);
      boss.chargeCooldown = Math.max(boss.chargeCooldown, 1.45);
      const speedUp = boss.phase === 3 ? 0.88 : 1;
      boss.novaCooldown = rand(CONFIG.bossNovaCooldownMin * speedUp, CONFIG.bossNovaCooldownMax * speedUp);
    }

    if (boss.spawnMinionTimer <= 0 && state.enemies.length < CONFIG.enemyMax && state.bossTelegraphs.length < 9 && state.bossProjectiles.length < 12) {
      const spawned = spawnBossMinion(boss, player);
      if (spawned) { state.enemies.push(spawned); boss.spawnMinionTimer = phaseCfg.minionEvery; }
    }
  }

  function spawnBossMinion(boss, player) {
    for (let i = 0; i < 24; i++) {
      const angle = rand(0, Math.PI * 2);
      const radius = rand(56, 95);
      const x = boss.x + Math.cos(angle) * radius;
      const y = boss.y + Math.sin(angle) * radius;
      if (x < 24 || x > CONFIG.width - 24 || y < 24 || y > CONFIG.height - 24) continue;
      if (circleHitsAnyObstacle(x, y, 14)) continue;
      if (Math.hypot(x - player.x, y - player.y) < 130) continue;
      const roll = Math.random();
      const type = boss.phase >= 3 && roll < 0.18 ? "spinner" : roll < 0.66 ? "lancer" : "drifter";
      return buildEnemy(x, y, type);
    }
    return null;
  }

  function queueBossVolley(boss, player, phase) {
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const baseAngle = Math.atan2(dy / dist, dx / dist);
    const pattern = boss.volleyPattern % 2 === 0 ? "fan" : "sweep";
    boss.volleyPattern = (boss.volleyPattern + 1) % 2;
    const speed = CONFIG.bossProjectileSpeed * (phase === 2 ? 1 : 1.08);
    if (pattern === "fan") {
      const lines = phase === 2 ? 3 : 4;
      const spread = phase === 2 ? 0.52 : 0.72;
      for (let i = 0; i < lines; i++) {
        const t = lines === 1 ? 0.5 : i / (lines - 1);
        queueBossTelegraph(boss, baseAngle + (-spread * 0.5 + spread * t), speed, { kind: "fan", opensRecover: i === lines - 1, recoverDuration: CONFIG.bossVolleyRecover });
      }
      showBossCallout("Salve eventail", 0.82, "warn");
    } else {
      const lines = phase === 2 ? 4 : 6;
      const spread = phase === 2 ? 1.05 : 1.28;
      for (let i = 0; i < lines; i++) {
        const t = lines === 1 ? 0.5 : i / (lines - 1);
        const wave = phase === 3 ? Math.sin(i * 0.7) * 0.08 : 0;
        queueBossTelegraph(boss, baseAngle + (-spread * 0.5 + spread * t) + wave, speed * (phase === 2 ? 1 : 1.03), { kind: "sweep", delay: i * CONFIG.bossSweepStepDelay, opensRecover: i === lines - 1, recoverDuration: CONFIG.bossVolleyRecover * 0.95 });
      }
      showBossCallout("Salve balayage", 0.92, "warn");
    }
    addImpactRing(boss.x, boss.y, [244, 210, 255], 150, 0.3, 2.2);
    playSfx("bossAim");
  }

  function queueBossNova(boss, phase) {
    const spokes = phase === 2 ? 6 : 8;
    const base = rand(0, Math.PI * 2);
    const speed = CONFIG.bossProjectileSpeed * (phase === 2 ? 0.82 : 0.9);
    const delayStep = CONFIG.bossNovaStepDelay * (phase === 3 ? 0.85 : 1);
    for (let i = 0; i < spokes; i++) {
      const angle = base + (Math.PI * 2 * i) / spokes;
      queueBossTelegraph(boss, angle, speed, { kind: "nova", radius: CONFIG.bossProjectileRadius - 1, delay: i * delayStep, opensRecover: i === spokes - 1, recoverDuration: CONFIG.bossVolleyRecover * 0.72 });
    }
    addImpactRing(boss.x, boss.y, [164, 224, 255], 182, 0.34, 2.5);
    showBossCallout("Nova radiale", 0.88, "bad");
    playSfx("bossNova");
  }

  function queueBossTelegraph(boss, angle, speed, options = null) {
    const opt = options || {};
    const delay = Math.max(0, Number(opt.delay) || 0);
    state.bossTelegraphs.push({ x: boss.x, y: boss.y, angle, speed, kind: opt.kind || "fan", delay, maxDelay: delay, life: CONFIG.bossProjectileTelegraph, maxLife: CONFIG.bossProjectileTelegraph, radius: Math.max(4, Number(opt.radius) || CONFIG.bossProjectileRadius), opensRecover: !!opt.opensRecover, recoverDuration: Math.max(0.2, Number(opt.recoverDuration) || CONFIG.bossVolleyRecover) });
    if (state.bossTelegraphs.length > 28) state.bossTelegraphs.splice(0, state.bossTelegraphs.length - 28);
  }

  function updateBossTelegraphs(dt) {
    const simDt = dt * currentEnemyTimeScale();
    for (let i = state.bossTelegraphs.length - 1; i >= 0; i--) {
      const telegraph = state.bossTelegraphs[i];
      if (telegraph.delay > 0) { telegraph.delay = Math.max(0, telegraph.delay - simDt); continue; }
      telegraph.life -= simDt;
      if (telegraph.life > 0) continue;
      const vx = Math.cos(telegraph.angle) * telegraph.speed;
      const vy = Math.sin(telegraph.angle) * telegraph.speed;
      state.bossProjectiles.push({ x: telegraph.x, y: telegraph.y, vx, vy, kind: telegraph.kind || "fan", r: telegraph.radius, life: CONFIG.bossProjectileLife, nearMissed: false });
      state.bossTelegraphs.splice(i, 1);
      playSfx("bossShot");
      addImpactRing(telegraph.x, telegraph.y, telegraph.kind === "nova" ? [176, 228, 255] : telegraph.kind === "sweep" ? [255, 204, 176] : [247, 208, 255], 110, 0.24, 2);
      if (telegraph.opensRecover && state.miniBoss) {
        state.miniBoss.volleyRecoverLeft = Math.max(state.miniBoss.volleyRecoverLeft || 0, telegraph.recoverDuration);
        state.miniBoss.stunLeft = Math.max(state.miniBoss.stunLeft || 0, 0.24);
        state.miniBoss.attackLockLeft = Math.max(state.miniBoss.attackLockLeft || 0, 0.16);
        addImpactRing(state.miniBoss.x, state.miniBoss.y, [155, 248, 210], 180, 0.32, 2.6);
        showBossCallout("Fenetre dash", 0.75, "good");
        playSfx("bossOpen");
      }
    }
  }

  function updateBossProjectiles(dt, player) {
    const simDt = dt * currentEnemyTimeScale();
    for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.bossProjectiles[i];
      projectile.life -= simDt;
      if (projectile.life <= 0) { state.bossProjectiles.splice(i, 1); continue; }
      projectile.x += projectile.vx * simDt;
      projectile.y += projectile.vy * simDt;
      const trailRgb = projectile.kind === "nova" ? [186, 232, 255] : projectile.kind === "sweep" ? [255, 221, 192] : [255, 210, 250];
      emitParticles(projectile.x, projectile.y, trailRgb, 1, 20, 0.14, 1.3);
      const out = projectile.x < -20 || projectile.x > CONFIG.width + 20 || projectile.y < -20 || projectile.y > CONFIG.height + 20;
      if (out || circleHitsAnyObstacle(projectile.x, projectile.y, projectile.r)) { state.bossProjectiles.splice(i, 1); continue; }
      maybeAwardNearMiss(player, projectile);
      if (state.player && player.invuln <= 0 && circlesOverlap(projectile, player)) {
        if (absorbShieldHit(player, projectile.x, projectile.y)) { state.bossProjectiles.splice(i, 1); continue; }
        player.lives -= 1;
        maybeSpawnEmergencyHeal(player);
        state.spawnRecoveryLeft = Math.max(state.spawnRecoveryLeft, CONFIG.hitRecoverySpawnEaseDuration);
        player.invuln = Math.max(player.invuln, 1.2);
        state.flashTimer = Math.max(state.flashTimer, 0.3);
        state.chromaPulse = Math.max(state.chromaPulse, 0.22);
        state.hurtOverlay = Math.max(state.hurtOverlay, 0.56);
        addImpactRing(player.x, player.y, [255, 166, 220], 170, 0.32, 2.5);
        emitParticles(player.x, player.y, [255, 165, 220], 18, 200, 0.42, 2.3);
        triggerShake(0.2, 2.8);
        triggerHitStop(0.045);
        breakCombo();
        playSfx("bossShotHit");
        state.bossProjectiles.splice(i, 1);
      }
    }
    if (state.bossProjectiles.length > 80) state.bossProjectiles.splice(0, state.bossProjectiles.length - 80);
  }

  function maybeTriggerCheckpoint(player) {
    if (state.elapsed < state.nextCheckpointAt) return;
    state.nextCheckpointAt += CONFIG.checkpointEverySeconds;
    if (player.lives < CONFIG.playerMaxLives) player.lives += 1;
    player.invuln = Math.max(player.invuln, 0.4);
    state.score += CONFIG.checkpointScoreBonus;
    state.flashTimer = 0.2;
    const radius = CONFIG.checkpointPulseRadius;
    for (const enemy of state.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      if (dist > radius) continue;
      const push = (radius - dist) * 1.2 + 12;
      enemy.x += (dx / dist) * push;
      enemy.y += (dy / dist) * push;
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.45);
    }
    for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.bossProjectiles[i];
      if (Math.hypot(projectile.x - player.x, projectile.y - player.y) < radius + 16) state.bossProjectiles.splice(i, 1);
    }
    if (state.miniBoss) {
      const boss = state.miniBoss;
      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      if (dist < radius + 36) {
        const push = (radius + 36 - dist) * 1.05;
        boss.x += (dx / dist) * push;
        boss.y += (dy / dist) * push;
        boss.stunLeft = Math.max(boss.stunLeft, 0.35);
        clampToBounds(boss);
        resolveObstacleOverlap(boss);
      }
    }
    if (!state.aegisOrb && player.shieldHits < CONFIG.shieldMaxHits && state.elapsed >= CONFIG.bossSpawnAt - 2) {
      state.aegisOrb = spawnAegisOrb(player);
    }
    emitParticles(player.x, player.y, [162, 239, 255], 34, 260, 0.78, 3.4);
    addImpactRing(player.x, player.y, [166, 235, 255], 250, 0.46, 3);
    triggerShake(0.2, 2.6);
    playSfx("checkpoint");
  }

  // ─── PLAYER UPDATE ─────────────────────────────────────────────────────────
  function updatePlayer(dt, player) {
    const movement = getMovementVector();
    const rawMag = Math.hypot(movement.dx, movement.dy);
    const hasInput = rawMag > 0.001;
    const desiredX = hasInput ? movement.dx / rawMag : 0;
    const desiredY = hasInput ? movement.dy / rawMag : 0;
    const response = hasInput ? CONFIG.playerInputResponse : CONFIG.playerReleaseResponse;
    const blend = clamp(response * dt, 0, 1);
    player.moveX += (desiredX - player.moveX) * blend;
    player.moveY += (desiredY - player.moveY) * blend;
    const moveMag = Math.hypot(player.moveX, player.moveY);
    if (moveMag > 1) { player.moveX /= moveMag; player.moveY /= moveMag; }
    if (hasInput && moveMag > 0.06) { player.lastMoveX = player.moveX / moveMag; player.lastMoveY = player.moveY / moveMag; }
    const speed = CONFIG.playerSpeed * (player.dashTimeLeft > 0 ? CONFIG.dashBoost : 1);
    let moveX = player.moveX;
    let moveY = player.moveY;
    if (!hasInput && player.dashTimeLeft > 0) { moveX = player.lastMoveX; moveY = player.lastMoveY; }
    moveCircleWithCollisions(player, moveX * speed * dt, moveY * speed * dt);
    if (player.dashTimeLeft > 0) applyDashPulse(player);
  }

  function currentEnemyTimeScale() {
    return state.timeSlowLeft > 0 ? CONFIG.chronoSlowFactor : 1;
  }

  // ─── ENEMY UPDATE ──────────────────────────────────────────────────────────
  function updateEnemies(dt, player) {
    const simDt = dt * currentEnemyTimeScale();
    state.enemyGraceLeft = Math.max(0, state.enemyGraceLeft - simDt);
    const spawnInterval = currentSpawnInterval();
    if (state.enemyGraceLeft <= 0 && state.enemies.length < CONFIG.enemyMax) {
      state.enemySpawnTimer += simDt;
      if (state.enemySpawnTimer >= spawnInterval) {
        state.enemySpawnTimer = 0;
        state.enemies.push(spawnEnemy(player, state.relic));
      }
    }
    const earlyEase = 0.62 + Math.min(state.elapsed / 36, 1) * 0.38;
    for (const enemy of state.enemies) {
      enemy.stunLeft = Math.max(0, enemy.stunLeft - simDt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      let dirX = dx / dist;
      let dirY = dy / dist;
      let speedMultiplier = 1;

      if (enemy.type === "drifter") {
        const perpX = -dirY; const perpY = dirX;
        const sway = Math.sin(state.elapsed * 2.7 + enemy.phase) * 0.7;
        dirX += perpX * sway; dirY += perpY * sway;
        const n = Math.hypot(dirX, dirY) || 1; dirX /= n; dirY /= n;
      }
      if (enemy.type === "lancer") {
        enemy.lanceCooldown = Math.max(0, (enemy.lanceCooldown || 0) - simDt);
        enemy.lanceWindup = Math.max(0, (enemy.lanceWindup || 0) - simDt);
        enemy.lanceTime = Math.max(0, (enemy.lanceTime || 0) - simDt);
        if (enemy.lanceWindup > 0) {
          speedMultiplier = 0.28;
          enemy.lanceAimX = dx / dist; enemy.lanceAimY = dy / dist;
          if (enemy.lanceWindup <= 0.02) {
            enemy.lanceTime = 0.28;
            enemy.lanceDirX = enemy.lanceAimX || dx / dist;
            enemy.lanceDirY = enemy.lanceAimY || dy / dist;
          }
        } else if (enemy.lanceTime > 0) {
          dirX = enemy.lanceDirX || dirX; dirY = enemy.lanceDirY || dirY; speedMultiplier = 2.42;
        } else {
          if (enemy.lanceCooldown <= 0 && dist > 120 && dist < 340) {
            const windup = rand(0.34, 0.52);
            enemy.lanceWindup = windup; enemy.lanceWindupMax = windup;
            enemy.lanceAimX = dx / dist; enemy.lanceAimY = dy / dist;
            enemy.lanceCooldown = rand(4.4, 6.8);
          }
          const desiredDist = 185;
          const pull = (dist - desiredDist) * 0.008;
          const perpX = -dirY; const perpY = dirX;
          dirX = dirX * pull + perpX * 0.9; dirY = dirY * pull + perpY * 0.9;
          const n = Math.hypot(dirX, dirY) || 1; dirX /= n; dirY /= n;
          speedMultiplier = 0.92;
        }
      }
      if (enemy.type === "wisp") {
        enemy.wispBurstCooldown = Math.max(0, (enemy.wispBurstCooldown || 0) - simDt);
        enemy.wispBurstWindup = Math.max(0, (enemy.wispBurstWindup || 0) - simDt);
        enemy.wispBurstTime = Math.max(0, (enemy.wispBurstTime || 0) - simDt);
        if (enemy.wispBurstWindup > 0) {
          speedMultiplier = 0.14;
          enemy.wispDirX = dx / dist; enemy.wispDirY = dy / dist;
          if (enemy.wispBurstWindup <= 0.02) {
            enemy.wispBurstTime = 0.2;
            enemy.wispDirX = dx / dist; enemy.wispDirY = dy / dist;
            addImpactRing(enemy.x, enemy.y, [166, 232, 255], 90, 0.2, 1.7);
          }
        } else if (enemy.wispBurstTime > 0) {
          dirX = enemy.wispDirX || dirX; dirY = enemy.wispDirY || dirY; speedMultiplier = CONFIG.wispBurstSpeedMul;
        } else {
          if (enemy.wispBurstCooldown <= 0 && dist > 140 && dist < 430) {
            const windup = rand(CONFIG.wispBurstWindupMin, CONFIG.wispBurstWindupMax);
            enemy.wispBurstWindup = windup; enemy.wispBurstWindupMax = windup;
            enemy.wispBurstCooldown = rand(CONFIG.wispBurstCooldownMin, CONFIG.wispBurstCooldownMax);
            enemy.wispDirX = dx / dist; enemy.wispDirY = dy / dist;
          }
          const desiredDist = 242;
          const pull = (dist - desiredDist) * 0.007;
          const perpX = -dirY; const perpY = dirX;
          const wobble = Math.sin(state.elapsed * 3.6 + enemy.phase * 1.8) * 0.5;
          dirX = dirX * pull + perpX * (1.02 + wobble * 0.35);
          dirY = dirY * pull + perpY * (1.02 + wobble * 0.35);
          const n = Math.hypot(dirX, dirY) || 1; dirX /= n; dirY /= n;
          speedMultiplier = 0.94;
        }
      }
      if (enemy.type === "spinner") {
        enemy.spinCooldown = Math.max(0, (enemy.spinCooldown || 0) - simDt);
        enemy.spinWindup = Math.max(0, (enemy.spinWindup || 0) - simDt);
        enemy.spinTime = Math.max(0, (enemy.spinTime || 0) - simDt);
        const orbitDir = enemy.orbitDir || 1;
        if (enemy.spinWindup > 0) {
          speedMultiplier = 0.18;
          const tangentX = -dirY * orbitDir; const tangentY = dirX * orbitDir;
          const aimX = dirX * 0.38 + tangentX * 0.62;
          const aimY = dirY * 0.38 + tangentY * 0.62;
          const n = Math.hypot(aimX, aimY) || 1;
          enemy.spinDirX = aimX / n; enemy.spinDirY = aimY / n;
          if (enemy.spinWindup <= 0.02) {
            enemy.spinTime = CONFIG.spinnerSpinDuration;
            addImpactRing(enemy.x, enemy.y, [173, 255, 204], 92, 0.2, 1.8);
          }
        } else if (enemy.spinTime > 0) {
          dirX = enemy.spinDirX || dirX; dirY = enemy.spinDirY || dirY; speedMultiplier = CONFIG.spinnerSpinSpeedMul;
        } else {
          if (enemy.spinCooldown <= 0 && dist > 120 && dist < 320) {
            const windup = rand(CONFIG.spinnerSpinWindupMin, CONFIG.spinnerSpinWindupMax);
            enemy.spinWindup = windup; enemy.spinWindupMax = windup;
            enemy.spinCooldown = rand(CONFIG.spinnerSpinCooldownMin, CONFIG.spinnerSpinCooldownMax);
            const tangentX = -dirY * orbitDir; const tangentY = dirX * orbitDir;
            const n = Math.hypot(tangentX, tangentY) || 1;
            enemy.spinDirX = tangentX / n; enemy.spinDirY = tangentY / n;
          }
          const desiredDist = 168;
          const pull = (dist - desiredDist) * 0.0085;
          const tangentX = -dirY * orbitDir; const tangentY = dirX * orbitDir;
          const wobble = Math.sin(state.elapsed * 4 + enemy.phase * 1.3) * 0.45;
          dirX = dirX * pull + tangentX * (0.98 + wobble * 0.28);
          dirY = dirY * pull + tangentY * (0.98 + wobble * 0.28);
          const n = Math.hypot(dirX, dirY) || 1; dirX /= n; dirY /= n;
          speedMultiplier = 0.96;
        }
      }
      const baseSpeed = enemy.baseSpeed * state.difficulty * earlyEase;
      const speed = enemy.stunLeft > 0 ? baseSpeed * 0.2 : baseSpeed * speedMultiplier;
      moveCircleWithCollisions(enemy, dirX * speed * simDt, dirY * speed * simDt);
    }
    resolveEnemyCrowding();
  }

  function resolveEnemyCrowding() {
    const pad = 4;
    for (let i = 0; i < state.enemies.length; i++) {
      const a = state.enemies[i];
      for (let j = i + 1; j < state.enemies.length; j++) {
        const b = state.enemies[j];
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = a.r + b.r + pad;
        if (dist >= minDist) continue;
        const overlap = (minDist - dist) * 0.5 * CONFIG.enemySeparationStrength;
        const nx = dx / dist; const ny = dy / dist;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        clampToBounds(a); clampToBounds(b);
        resolveObstacleOverlap(a); resolveObstacleOverlap(b);
      }
    }
    const boss = state.miniBoss;
    if (!boss) return;
    for (const enemy of state.enemies) {
      const dx = enemy.x - boss.x; const dy = enemy.y - boss.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const minDist = enemy.r + boss.r + 8;
      if (dist >= minDist) continue;
      const overlap = (minDist - dist) * 0.6 * CONFIG.enemySeparationStrength;
      const nx = dx / dist; const ny = dy / dist;
      enemy.x += nx * overlap; enemy.y += ny * overlap;
      clampToBounds(enemy); resolveObstacleOverlap(enemy);
    }
  }

  // ─── COMBO ─────────────────────────────────────────────────────────────────
  function refreshComboMultiplier() {
    state.comboMultiplier = clamp(1 + Math.max(0, state.comboCount - 1) * CONFIG.comboStepMultiplier, 1, CONFIG.comboMaxMultiplier);
  }
  function pushCombo(amount = 1) {
    state.comboCount = Math.max(1, state.comboCount + amount);
    state.comboTimer = Math.max(state.comboTimer, CONFIG.comboWindow);
    refreshComboMultiplier();
    state.stats.maxComboMultiplier = Math.max(state.stats.maxComboMultiplier, state.comboMultiplier);
  }
  function breakCombo() { state.comboCount = 0; state.comboTimer = 0; state.comboMultiplier = 1; }
  function softenComboOnShield() {
    if (state.comboCount <= 0) return;
    state.comboCount = Math.max(0, state.comboCount - 1);
    state.comboTimer = Math.max(0, state.comboTimer - 0.8);
    if (state.comboCount <= 0 || state.comboTimer <= 0) { breakCombo(); return; }
    refreshComboMultiplier();
  }

  // ─── DIRECTIVES ────────────────────────────────────────────────────────────
  function pickDirectiveType() {
    const pool = state.miniBoss ? ["bossOpen", "relic", "evade", "dash"] : ["relic", "evade", "dash"];
    const filtered = pool.filter((type) => type !== state.directives.lastType || pool.length === 1);
    const available = filtered.length ? filtered : pool;
    if (state.miniBoss && (state.miniBoss.volleyRecoverLeft || 0) > 0.24 && available.includes("bossOpen")) return "bossOpen";
    return available[Math.floor(rand(0, available.length))];
  }

  function buildDirective(type) {
    const player = state.player;
    const relicTarget = state.elapsed >= 20 ? CONFIG.directiveRelicTargetLate : CONFIG.directiveRelicTargetEarly;
    const relicTime = state.elapsed >= 20 ? CONFIG.directiveRelicLateDuration : CONFIG.directiveRelicDuration;
    if (type === "relic") {
      return { type, tag: "COLLECTE", tone: "good", description: `Recupere ${relicTarget} relique${relicTarget > 1 ? "s" : ""}.`, rewardText: (player && (player.shieldHits || 0) < CONFIG.shieldMaxHits) ? "AEGIS +1" : "PV +1", progress: 0, target: relicTarget, timeLeft: relicTime, maxTime: relicTime, fillMode: "count", scoreReward: CONFIG.directiveRewardScore };
    }
    if (type === "evade") {
      return { type, tag: "EVASION", tone: "warn", description: `Tiens ${CONFIG.directiveEvadeDuration.toFixed(1)}s sans encaisser.`, rewardText: (player && player.lives < CONFIG.playerMaxLives) ? "PV +1" : "Rush -0.8s", progress: 0, target: CONFIG.directiveEvadeDuration, timeLeft: CONFIG.directiveEvadeDuration, maxTime: CONFIG.directiveEvadeDuration, fillMode: "time", scoreReward: CONFIG.directiveRewardScore };
    }
    if (type === "dash") {
      return { type, tag: "RUSH", tone: "accent", description: `Percute ${CONFIG.directiveDashTarget} menaces avec un rush.`, rewardText: "Rush pret", progress: 0, target: CONFIG.directiveDashTarget, timeLeft: CONFIG.directiveDashDuration, maxTime: CONFIG.directiveDashDuration, fillMode: "count", scoreReward: CONFIG.directiveRewardScore };
    }
    return { type: "bossOpen", tag: "BOSS", tone: "bad", description: "Casse l armure en fenetre BOSS-OPEN.", rewardText: "AEGIS + rush", progress: 0, target: 1, timeLeft: CONFIG.directiveBossDuration, maxTime: CONFIG.directiveBossDuration, fillMode: "count", scoreReward: CONFIG.directiveRewardScore + 80 };
  }

  function queueNextDirective(minDelay = CONFIG.directiveCooldownMin, maxDelay = CONFIG.directiveCooldownMax) {
    state.directives.active = null;
    state.directives.cooldown = rand(minDelay, maxDelay);
  }

  function activateDirective(type = null) {
    if (!state.running || state.finished || !state.player) return null;
    const directive = buildDirective(type || pickDirectiveType());
    state.directives.active = directive;
    state.directives.lastType = directive.type;
    state.directives.cooldown = 0;
    state.directives.flash = 0.34;
    showBossCallout(`Directive ${directive.tag}`, 0.8, directive.type === "bossOpen" ? "warn" : "good");
    return directive;
  }

  function noteDirectiveProgress(type, amount, player) {
    const directive = state.directives.active;
    if (!directive || directive.type !== type || amount <= 0) return;
    directive.progress = Math.min(directive.target, directive.progress + amount);
    if (directive.progress >= directive.target - 1e-6) completeDirective(player);
  }

  function completeDirective(player) {
    const directive = state.directives.active;
    if (!directive || !player) return;
    state.directives.completed += 1;
    state.stats.directivesCompleted += 1;
    state.directives.flash = 0.8;

    const rewardScore = Math.floor(directive.scoreReward || CONFIG.directiveRewardScore);
    state.score += rewardScore;
    let rewardLabel = directive.rewardText;

    if (directive.type === "relic") {
      if ((player.shieldHits || 0) < CONFIG.shieldMaxHits) {
        player.shieldHits += 1;
        rewardLabel = "AEGIS +1";
      } else if (player.lives < CONFIG.playerMaxLives) {
        player.lives += 1;
        rewardLabel = "PV +1";
      } else {
        player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - 0.6);
        rewardLabel = "Rush -0.6s";
      }
    } else if (directive.type === "evade") {
      if (player.lives < CONFIG.playerMaxLives) {
        player.lives += 1;
        rewardLabel = "PV +1";
      } else {
        player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - 0.8);
        rewardLabel = "Rush -0.8s";
      }
    } else if (directive.type === "dash") {
      player.dashCooldownLeft = 0;
      state.timeSlowLeft = Math.max(state.timeSlowLeft, 0.9);
      rewardLabel = "Rush pret";
    } else if (directive.type === "bossOpen") {
      player.dashCooldownLeft = 0;
      player.shieldHits = Math.min(CONFIG.shieldMaxHits, (player.shieldHits || 0) + 1);
      state.timeSlowLeft = Math.max(state.timeSlowLeft, 0.65);
      rewardLabel = "AEGIS + rush";
    }

    emitParticles(player.x, player.y, [255, 226, 150], 18, 170, 0.48, 2.5);
    addImpactRing(player.x, player.y, [255, 222, 146], 160, 0.28, 2.3);
    addFloatingText(player.x, player.y - 30, `DIRECTIVE +${rewardScore}`, [255, 235, 168], 0.9, 15);
    addFloatingText(player.x, player.y - 50, rewardLabel.toUpperCase(), [192, 245, 255], 0.82, 13);
    showBossCallout(`${directive.tag} OK`, 0.88, "good");
    playSfx("checkpoint");
    queueNextDirective(CONFIG.directiveCooldownMin * 0.78, CONFIG.directiveCooldownMax * 0.88);
  }

  function failDirective() {
    if (!state.directives.active) return;
    state.directives.failed += 1;
    state.directives.flash = 0.24;
    showBossCallout("Directive perdue", 0.72, "bad");
    queueNextDirective(CONFIG.directiveCooldownMin * 0.52, CONFIG.directiveCooldownMax * 0.68);
  }

  function getDirectiveProgressText(directive) {
    if (!directive) return "";
    if (directive.type === "evade") return `${Math.min(directive.target, directive.progress).toFixed(1)}/${directive.target.toFixed(1)}s`;
    if (directive.type === "bossOpen") return directive.progress > 0 ? "armure brisee" : "fenetre a trouver";
    const progressValue = Number.isInteger(directive.target)
      ? Math.max(0, Math.floor(directive.progress + 1e-6))
      : directive.progress.toFixed(1);
    return `${progressValue}/${directive.target}`;
  }

  function getDirectiveFillRatio(directive) {
    if (!directive) return 0;
    if (directive.fillMode === "time") return clamp(directive.progress / directive.target, 0, 1);
    return clamp(directive.progress / directive.target, 0, 1);
  }

  function getIntelText() {
    const checkpointEta = Math.max(0, state.nextCheckpointAt - state.elapsed);
    if (state.miniBoss) {
      const phase = state.miniBoss.phase || 1;
      const openLeft = state.miniBoss.volleyRecoverLeft || 0;
      if (openLeft > 0.05) return `BOSS-OPEN ${openLeft.toFixed(1)}s • Checkpoint ${checkpointEta.toFixed(1)}s`;
      if (phase >= 3 && (state.miniBoss.shockwaveCooldown || 0) < 4.2) return `Onde ${state.miniBoss.shockwaveCooldown.toFixed(1)}s • Checkpoint ${checkpointEta.toFixed(1)}s`;
      return `Boss phase ${phase} • Checkpoint ${checkpointEta.toFixed(1)}s`;
    }
    const bossEta = state.bossSpawned ? 0 : Math.max(0, CONFIG.bossSpawnAt - state.elapsed);
    return bossEta > 0 ? `Checkpoint ${checkpointEta.toFixed(1)}s • Boss ${bossEta.toFixed(1)}s` : `Checkpoint ${checkpointEta.toFixed(1)}s`;
  }

  function updateDirectives(dt, player) {
    state.directives.flash = Math.max(0, state.directives.flash - dt);
    if (!state.running || state.finished || !player) return;

    const directive = state.directives.active;
    if (!directive) {
      state.directives.cooldown = Math.max(0, state.directives.cooldown - dt);
      if (state.directives.cooldown <= 0) activateDirective();
      return;
    }

    directive.timeLeft = Math.max(0, directive.timeLeft - dt);
    if (directive.type === "evade") {
      directive.progress = Math.min(directive.target, directive.maxTime - directive.timeLeft);
      if (directive.progress >= directive.target - 1e-6) { completeDirective(player); return; }
    }

    if (directive.type === "bossOpen" && state.bossSpawned && !state.miniBoss) {
      failDirective();
      return;
    }

    if (directive.timeLeft <= 0) failDirective();
  }

  // ─── COLLECTS & DAMAGE ─────────────────────────────────────────────────────
  function maybeCollectRelic(player) {
    if (!state.relic) return;
    const catchRadius = player.r + state.relic.r + CONFIG.relicCatchBonus;
    if (!circlesOverlapRadius(player, state.relic, catchRadius)) return;
    state.relics += 1;
    pushCombo(1);
    const relicScore = Math.floor(CONFIG.scorePerRelic * state.comboMultiplier);
    state.score += relicScore;
    state.flashTimer = 0.22;
    emitParticles(state.relic.x, state.relic.y, [145, 245, 187], 18, 170, 0.6, 3);
    triggerShake(0.18, 1.7);
    addFloatingText(state.relic.x, state.relic.y - 10, `+${relicScore}`, [167, 255, 200], 0.88, 17);
    if (state.comboCount >= 2) addFloatingText(player.x, player.y - 28, `x${state.comboMultiplier.toFixed(2)}`, [194, 241, 255], 0.56, 14);
    playSfx("relic");
    noteDirectiveProgress("relic", 1, player);
    state.relic = spawnRelic(player);
    if (state.relics % CONFIG.healEveryRelics === 0 && player.lives < CONFIG.playerMaxLives && !state.healOrb) state.healOrb = spawnHealOrb(player);
    if (state.relics % CONFIG.aegisEveryRelics === 0 && player.shieldHits < CONFIG.shieldMaxHits && !state.aegisOrb) state.aegisOrb = spawnAegisOrb(player);
    if (state.relics % CONFIG.chronoEveryRelics === 0 && state.timeSlowLeft <= 0.4 && !state.chronoOrb) state.chronoOrb = spawnChronoOrb(player);
    if (state.comboCount >= CONFIG.surgeComboThreshold && !state.surgeOrb && player.dashCooldownLeft > 0.15) state.surgeOrb = spawnSurgeOrb(player);
  }
  function maybeCollectHeal(player) {
    if (!state.healOrb || !circlesOverlapRadius(player, state.healOrb, player.r + state.healOrb.r + 8)) return;
    player.lives = Math.min(CONFIG.playerMaxLives, player.lives + 1);
    state.score += CONFIG.scorePerHeal;
    emitParticles(state.healOrb.x, state.healOrb.y, [152, 255, 168], 24, 210, 0.65, 3);
    addFloatingText(state.healOrb.x, state.healOrb.y - 8, "SOIN", [178, 255, 188], 0.72, 14);
    state.healOrb = null;
    playSfx("heal");
  }
  function maybeCollectAegis(player) {
    if (!state.aegisOrb || !circlesOverlapRadius(player, state.aegisOrb, player.r + state.aegisOrb.r + 8)) return;
    player.shieldHits = Math.min(CONFIG.shieldMaxHits, (player.shieldHits || 0) + 1);
    state.score += 70;
    emitParticles(state.aegisOrb.x, state.aegisOrb.y, [173, 246, 255], 22, 220, 0.64, 2.9);
    addImpactRing(state.aegisOrb.x, state.aegisOrb.y, [162, 240, 255], 170, 0.36, 2.4);
    addFloatingText(state.aegisOrb.x, state.aegisOrb.y - 10, "AEGIS", [184, 247, 255], 0.78, 14);
    state.aegisOrb = null;
    playSfx("shieldGain");
  }
  function maybeCollectChrono(player) {
    if (!state.chronoOrb || !circlesOverlapRadius(player, state.chronoOrb, player.r + state.chronoOrb.r + 8)) return;
    state.timeSlowLeft = Math.max(state.timeSlowLeft, CONFIG.chronoDuration);
    state.score += 120;
    emitParticles(state.chronoOrb.x, state.chronoOrb.y, [162, 222, 255], 28, 240, 0.72, 2.9);
    addImpactRing(state.chronoOrb.x, state.chronoOrb.y, [146, 214, 255], 210, 0.44, 3);
    addFloatingText(state.chronoOrb.x, state.chronoOrb.y - 12, "CHRONO", [186, 232, 255], 0.9, 15);
    state.chronoOrb = null;
    showBossCallout("Ralentissement", 0.85, "good");
    playSfx("chrono");
  }
  function maybeCollectSurge(player) {
    if (!state.surgeOrb || !circlesOverlapRadius(player, state.surgeOrb, player.r + state.surgeOrb.r + 8)) return;
    const surgeScore = Math.floor(CONFIG.surgeScore * state.comboMultiplier);
    state.score += surgeScore;
    player.dashCooldownLeft = 0;
    player.invuln = Math.max(player.invuln, 0.2);
    state.timeSlowLeft = Math.max(state.timeSlowLeft, 1.25);
    emitParticles(state.surgeOrb.x, state.surgeOrb.y, [187, 243, 255], 28, 250, 0.66, 3);
    addImpactRing(state.surgeOrb.x, state.surgeOrb.y, [191, 247, 255], 200, 0.42, 2.9);
    addFloatingText(state.surgeOrb.x, state.surgeOrb.y - 12, `SURGE +${surgeScore}`, [198, 248, 255], 0.9, 14);
    state.surgeOrb = null;
    showBossCallout("Rush recharge", 0.9, "good");
    playSfx("surge");
  }

  function maybeSpawnEmergencyHeal(player) {
    if (!player || player.lives !== 1 || state.healOrb) return;
    state.healOrb = spawnHealOrb(player);
    addFloatingText(player.x, player.y - 24, "SOIN CRITIQUE", [186, 255, 205], 0.8, 13);
    showBossCallout("Orbe de secours", 0.92, "good");
  }

  function absorbShieldHit(player, sourceX, sourceY) {
    if ((player.shieldHits || 0) <= 0) return false;
    player.shieldHits -= 1;
    player.invuln = Math.max(player.invuln, 0.62);
    state.flashTimer = Math.max(state.flashTimer, 0.18);
    state.chromaPulse = Math.max(state.chromaPulse, 0.18);
    softenComboOnShield();
    emitParticles(player.x, player.y, [176, 246, 255], 24, 250, 0.5, 2.8);
    addImpactRing(player.x, player.y, [171, 244, 255], 190, 0.32, 2.7);
    addFloatingText(player.x, player.y - 8, "BLOC", [184, 250, 255], 0.6, 14);
    triggerShake(0.12, 1.8);
    playSfx("shieldBreak");
    if (Number.isFinite(sourceX) && Number.isFinite(sourceY)) {
      const dx = sourceX - player.x; const dy = sourceY - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      moveCircleWithCollisions(player, -(dx / dist) * 20, -(dy / dist) * 20);
    }
    return true;
  }

  function maybeAwardNearMiss(player, projectile) {
    if (!player || player.invuln > 0 || projectile.nearMissed) return;
    const dx = player.x - projectile.x; const dy = player.y - projectile.y;
    const dist = Math.hypot(dx, dy);
    const safe = player.r + projectile.r + 2;
    const near = player.r + projectile.r + CONFIG.nearMissRadius;
    if (dist <= safe || dist > near) return;
    projectile.nearMissed = true;
    pushCombo(0.45);
    state.stats.nearMisses += 1;
    const bonus = Math.floor(CONFIG.nearMissBonus * state.comboMultiplier);
    state.score += bonus;
    addImpactRing(player.x, player.y, [188, 225, 255], 120, 0.24, 1.8);
    addFloatingText(player.x, player.y - 18, `NEAR +${bonus}`, [184, 232, 255], 0.5, 12);
    playSfx("nearMiss");
  }

  function maybeTakeDamage(player) {
    let hit = false;
    for (const enemy of state.enemies) {
      if (!circlesOverlap(player, enemy) || player.invuln > 0) continue;
      if (absorbShieldHit(player, enemy.x, enemy.y)) {
        const bdx = enemy.x - player.x; const bdy = enemy.y - player.y;
        const bdist = Math.max(0.1, Math.hypot(bdx, bdy));
        enemy.x += (bdx / bdist) * 56; enemy.y += (bdy / bdist) * 56;
        enemy.stunLeft = Math.max(enemy.stunLeft, 0.46);
        clampToBounds(enemy); resolveObstacleOverlap(enemy);
        continue;
      }
      player.lives -= 1;
      maybeSpawnEmergencyHeal(player);
      state.stats.damageTaken += 1;
      if (state.directives.active && state.directives.active.type === "evade") failDirective();
      state.spawnRecoveryLeft = Math.max(state.spawnRecoveryLeft, CONFIG.hitRecoverySpawnEaseDuration);
      player.invuln = CONFIG.hitInvulnerability;
      state.flashTimer = 0.35;
      const dx = enemy.x - player.x; const dy = enemy.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      enemy.x += (dx / dist) * 52; enemy.y += (dy / dist) * 52;
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.38);
      clampToBounds(enemy); resolveObstacleOverlap(enemy);
      emitParticles(player.x, player.y, [255, 138, 138], 20, 220, 0.55, 3);
      addImpactRing(player.x, player.y, [255, 140, 140], 160, 0.32, 2.8);
      triggerShake(0.26, 3.8);
      triggerHitStop(0.04);
      state.chromaPulse = Math.max(state.chromaPulse, 0.2);
      state.hurtOverlay = Math.max(state.hurtOverlay, 0.5);
      breakCombo();
      hit = true;
      break;
    }
    const boss = state.miniBoss;
    if (boss && !hit && player.invuln <= 0 && circlesOverlap(player, boss)) {
      if (absorbShieldHit(player, boss.x, boss.y)) {
        const bdx = boss.x - player.x; const bdy = boss.y - player.y;
        const bdist = Math.max(0.1, Math.hypot(bdx, bdy));
        boss.x += (bdx / bdist) * 54; boss.y += (bdy / bdist) * 54;
        boss.stunLeft = Math.max(boss.stunLeft, 0.34);
        clampToBounds(boss); resolveObstacleOverlap(boss);
      } else {
        player.lives -= 1;
        maybeSpawnEmergencyHeal(player);
        state.stats.damageTaken += 1;
        if (state.directives.active && state.directives.active.type === "evade") failDirective();
        state.spawnRecoveryLeft = Math.max(state.spawnRecoveryLeft, CONFIG.hitRecoverySpawnEaseDuration);
        player.invuln = CONFIG.hitInvulnerability;
        state.flashTimer = 0.35;
        const dx = boss.x - player.x; const dy = boss.y - player.y;
        const dist = Math.max(0.1, Math.hypot(dx, dy));
        boss.x += (dx / dist) * 62; boss.y += (dy / dist) * 62;
        boss.stunLeft = Math.max(boss.stunLeft, 0.28);
        clampToBounds(boss); resolveObstacleOverlap(boss);
        emitParticles(player.x, player.y, [255, 138, 138], 26, 240, 0.58, 3);
        addImpactRing(player.x, player.y, [255, 125, 165], 190, 0.35, 3);
        triggerShake(0.3, 4.4);
        triggerHitStop(0.055);
        state.chromaPulse = Math.max(state.chromaPulse, 0.28);
        state.hurtOverlay = Math.max(state.hurtOverlay, 0.6);
        breakCombo();
        hit = true;
      }
    }
    if (hit) playSfx("hit");
  }

  // ─── DASH ──────────────────────────────────────────────────────────────────
  function queueDashRequest() {
    if (!state.running || !state.player || state.finished || state.paused) return false;
    state.pendingDashLeft = Math.max(state.pendingDashLeft, CONFIG.dashBuffer);
    return true;
  }
  function tryDash() {
    if (!state.running || !state.player || state.finished || state.paused) return false;
    const player = state.player;
    if (player.dashCooldownLeft > 0 || player.dashTimeLeft > 0) return false;
    player.dashTimeLeft = CONFIG.dashDuration;
    player.dashCooldownLeft = CONFIG.dashCooldown;
    player.invuln = Math.max(player.invuln, CONFIG.dashInvuln);
    if (Math.hypot(player.lastMoveX, player.lastMoveY) < 0.1) { player.lastMoveX = 1; player.lastMoveY = 0; }
    applyDashPulse(player);
    emitParticles(player.x, player.y, [127, 226, 255], 14, 180, 0.4, 2);
    addImpactRing(player.x, player.y, [131, 226, 255], 150, 0.28, 2.4);
    triggerShake(0.16, 1.6);
    playSfx("dash");
    state.pendingDashLeft = 0;
    return true;
  }

  function applyDashPulse(player) {
    let dashThreatHits = 0;
    for (const enemy of state.enemies) {
      const dx = enemy.x - player.x; const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0 || dist > CONFIG.dashShockRadius) continue;
      const push = (CONFIG.dashShockRadius - dist) * 1.2 + 8;
      enemy.x += (dx / dist) * push; enemy.y += (dy / dist) * push;
      clampToBounds(enemy); resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.42);
      dashThreatHits += 1;
      emitParticles(enemy.x, enemy.y, [215, 241, 255], 4, 75, 0.24, 2);
      addImpactRing(enemy.x, enemy.y, [215, 241, 255], 95, 0.2, 1.8);
    }
    for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = state.bossProjectiles[i];
      const dx = projectile.x - player.x; const dy = projectile.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= CONFIG.dashShockRadius + 10) {
        dashThreatHits += 1;
        addImpactRing(projectile.x, projectile.y, [214, 241, 255], 90, 0.18, 1.8);
        state.bossProjectiles.splice(i, 1);
      }
    }
    if (dashThreatHits > 0) noteDirectiveProgress("dash", dashThreatHits, player);
    const boss = state.miniBoss;
    if (boss) {
      const dx = boss.x - player.x; const dy = boss.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist <= CONFIG.dashShockRadius + 24) {
        const bonusWindow = (boss.volleyRecoverLeft || 0) > 0;
        const hitDamage = bonusWindow ? 2 : 1;
        noteDirectiveProgress("dash", bonusWindow ? 2 : 1, player);
        const push = (CONFIG.dashShockRadius + 24 - dist) * 0.95 + 12;
        boss.x += (dx / dist) * push; boss.y += (dy / dist) * push;
        boss.stunLeft = Math.max(boss.stunLeft, 0.5);
        boss.health -= hitDamage;
        state.score += CONFIG.bossHitScore * hitDamage;
        if (bonusWindow) boss.volleyRecoverLeft = 0;
        pushCombo(bonusWindow ? 1.8 : 0.8);
        clampToBounds(boss); resolveObstacleOverlap(boss);
        emitParticles(boss.x, boss.y, [232, 175, 255], 16, 180, 0.58, 3);
        addImpactRing(boss.x, boss.y, [236, 179, 255], 175, 0.34, 3);
        if (bonusWindow) {
          state.stats.bossBreaks += 1;
          noteDirectiveProgress("bossOpen", 1, player);
          emitParticles(boss.x, boss.y, [180, 255, 220], 18, 220, 0.46, 2.8);
          addImpactRing(boss.x, boss.y, [170, 255, 220], 210, 0.36, 3);
          triggerShake(0.22, 2.8); triggerHitStop(0.04);
          showBossCallout("Armure brisee", 0.7, "good");
          playSfx("bossBreak");
        } else {
          triggerShake(0.18, 2.4); triggerHitStop(0.025);
          playSfx("bossHit");
        }
        state.chromaPulse = Math.max(state.chromaPulse, 0.22);
        if (boss.health <= 0) defeatMiniBoss(player);
      }
    }
  }

  function defeatMiniBoss(player) {
    if (!state.miniBoss) return;
    const boss = state.miniBoss;
    state.score += CONFIG.bossDefeatScore;
    state.flashTimer = 0.36;
    emitParticles(boss.x, boss.y, [245, 187, 255], 64, 340, 1, 4.2);
    addImpactRing(boss.x, boss.y, [245, 187, 255], 320, 0.68, 4.2);
    triggerShake(0.45, 5.2); triggerHitStop(0.06);
    state.chromaPulse = Math.max(state.chromaPulse, 0.42);
    showBossCallout("Boss neutralise", 1.2, "good");
    playSfx("bossDefeat");
    if (state.enemies.length > 2) {
      state.enemies.sort((a, b) => Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y));
      state.enemies.splice(0, Math.min(3, state.enemies.length));
    }
    if (player.lives < CONFIG.playerMaxLives) player.lives += 1;
    if (player.shieldHits < CONFIG.shieldMaxHits) {
      player.shieldHits += 1;
      addFloatingText(player.x, player.y - 22, "AEGIS +1", [182, 247, 255], 0.9, 15);
    }
    if (!state.healOrb) state.healOrb = spawnHealOrb(player);
    state.miniBoss = null;
    state.bossIntroTimer = 0;
  }

  // ─── SPAWNING ──────────────────────────────────────────────────────────────
  function spawnEnemy(player, relic) {
    for (let i = 0; i < 120; i++) {
      const edge = Math.floor(Math.random() * 4);
      const point = randomEdgePoint(edge);
      if (Math.hypot(point.x - player.x, point.y - player.y) < CONFIG.enemySafeSpawnFromPlayer) continue;
      if (relic && Math.hypot(point.x - relic.x, point.y - relic.y) < CONFIG.enemySafeSpawnFromRelic) continue;
      if (circleHitsAnyObstacle(point.x, point.y, 16)) continue;
      return buildEnemy(point.x, point.y);
    }
    const fallback = randomEdgePoint(Math.floor(Math.random() * 4));
    return buildEnemy(fallback.x, fallback.y);
  }

  function buildEnemy(x, y, forcedType = null) {
    let type = forcedType;
    if (!type) {
      const lancerCount = state.enemies.reduce((c, e) => c + (e.type === "lancer" ? 1 : 0), 0);
      const wispCount = state.enemies.reduce((c, e) => c + (e.type === "wisp" ? 1 : 0), 0);
      const spinnerCount = state.enemies.reduce((c, e) => c + (e.type === "spinner" ? 1 : 0), 0);
      const lancerChance = clamp((state.difficulty - 0.95) * 0.18 + state.elapsed * 0.0014, 0.03, 0.2);
      const wispChance = clamp((state.elapsed - CONFIG.wispMinSpawnTime) * 0.006 + (state.difficulty - 1) * 0.18, 0, 0.1);
      const spinnerChance = clamp((state.elapsed - CONFIG.spinnerMinSpawnTime) * 0.0035 + (state.difficulty - 1) * 0.1, 0, 0.06);
      const drifterChance = clamp((state.difficulty - 0.95) * 0.26, 0.05, 0.3);
      const roll = Math.random();
      if (roll < wispChance && wispCount < CONFIG.wispMaxActive) type = "wisp";
      else if (roll < wispChance + spinnerChance && spinnerCount < CONFIG.spinnerMaxActive) type = "spinner";
      else if (roll < wispChance + spinnerChance + lancerChance && lancerCount < 2) type = "lancer";
      else if (roll < wispChance + spinnerChance + lancerChance + drifterChance) type = "drifter";
      else type = "stalker";
    }
    const style = ENEMY_STYLES[type] || ENEMY_STYLES.stalker;
    return {
      type, x, y, r: style.radius,
      baseSpeed: type === "wisp" ? rand(56, 78) : type === "spinner" ? rand(60, 82) : type === "lancer" ? rand(54, 72) : type === "drifter" ? rand(66, 90) : rand(60, 96),
      phase: rand(0, Math.PI * 2),
      stunLeft: 0,
      angle: rand(0, Math.PI * 2), // new: initial rotation for shape rendering
      lanceCooldown: rand(2.8, 4.2), lanceWindup: 0, lanceWindupMax: 0, lanceTime: 0, lanceDirX: 0, lanceDirY: 0, lanceAimX: 1, lanceAimY: 0,
      wispBurstCooldown: rand(CONFIG.wispBurstCooldownMin, CONFIG.wispBurstCooldownMax), wispBurstWindup: 0, wispBurstWindupMax: 0, wispBurstTime: 0, wispDirX: 0, wispDirY: 0,
      spinCooldown: rand(CONFIG.spinnerSpinCooldownMin, CONFIG.spinnerSpinCooldownMax), spinWindup: 0, spinWindupMax: 0, spinTime: 0, spinDirX: 0, spinDirY: 0,
      orbitDir: Math.random() > 0.5 ? 1 : -1,
    };
  }

  function randomEdgePoint(edge) {
    if (edge === 0) return { x: rand(0, CONFIG.width), y: -18 };
    if (edge === 1) return { x: CONFIG.width + 18, y: rand(0, CONFIG.height) };
    if (edge === 2) return { x: rand(0, CONFIG.width), y: CONFIG.height + 18 };
    return { x: -18, y: rand(0, CONFIG.height) };
  }

  function spawnRelic(player) {
    for (let i = 0; i < 260; i++) {
      const candidate = { x: rand(44, CONFIG.width - 44), y: rand(44, CONFIG.height - 44), r: CONFIG.relicRadius };
      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) continue;
      if (player && Math.hypot(candidate.x - player.x, candidate.y - player.y) < CONFIG.relicSafeFromPlayer) continue;
      let tooClose = false;
      for (const enemy of state.enemies) { if (Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) < CONFIG.relicSafeFromEnemy) { tooClose = true; break; } }
      if (tooClose) continue;
      return candidate;
    }
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.relicRadius };
  }

  function spawnHealOrb(player) {
    for (let i = 0; i < 220; i++) {
      const candidate = { x: rand(42, CONFIG.width - 42), y: rand(42, CONFIG.height - 42), r: CONFIG.healRadius };
      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) continue;
      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 120) continue;
      return candidate;
    }
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.healRadius };
  }

  function spawnAegisOrb(player) {
    for (let i = 0; i < 220; i++) {
      const candidate = { x: rand(42, CONFIG.width - 42), y: rand(42, CONFIG.height - 42), r: CONFIG.aegisRadius };
      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) continue;
      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 130) continue;
      if (state.relic && Math.hypot(candidate.x - state.relic.x, candidate.y - state.relic.y) < 74) continue;
      if (state.healOrb && Math.hypot(candidate.x - state.healOrb.x, candidate.y - state.healOrb.y) < 74) continue;
      return candidate;
    }
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.aegisRadius };
  }

  function spawnChronoOrb(player) {
    for (let i = 0; i < 220; i++) {
      const candidate = { x: rand(42, CONFIG.width - 42), y: rand(42, CONFIG.height - 42), r: CONFIG.chronoRadius };
      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) continue;
      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 130) continue;
      if (state.relic && Math.hypot(candidate.x - state.relic.x, candidate.y - state.relic.y) < 76) continue;
      if (state.healOrb && Math.hypot(candidate.x - state.healOrb.x, candidate.y - state.healOrb.y) < 76) continue;
      if (state.aegisOrb && Math.hypot(candidate.x - state.aegisOrb.x, candidate.y - state.aegisOrb.y) < 76) continue;
      return candidate;
    }
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.chronoRadius };
  }

  function spawnSurgeOrb(player) {
    for (let i = 0; i < 220; i++) {
      const candidate = { x: rand(42, CONFIG.width - 42), y: rand(42, CONFIG.height - 42), r: CONFIG.surgeRadius, life: CONFIG.surgeLife, maxLife: CONFIG.surgeLife };
      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) continue;
      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 120) continue;
      if (state.relic && Math.hypot(candidate.x - state.relic.x, candidate.y - state.relic.y) < 74) continue;
      if (state.healOrb && Math.hypot(candidate.x - state.healOrb.x, candidate.y - state.healOrb.y) < 74) continue;
      if (state.aegisOrb && Math.hypot(candidate.x - state.aegisOrb.x, candidate.y - state.aegisOrb.y) < 74) continue;
      if (state.chronoOrb && Math.hypot(candidate.x - state.chronoOrb.x, candidate.y - state.chronoOrb.y) < 74) continue;
      return candidate;
    }
    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.surgeRadius, life: CONFIG.surgeLife, maxLife: CONFIG.surgeLife };
  }

  // ─── DIFFICULTY ────────────────────────────────────────────────────────────
  function computeDifficulty() {
    const timeRamp = clamp(state.elapsed / CONFIG.objectiveSeconds, 0, 1);
    const relicRamp = clamp(state.relics / 14, 0, 1);
    const bossRamp = state.miniBoss ? 0.12 : 0;
    const player = state.player;
    const livesRatio = player ? clamp(player.lives / CONFIG.playerMaxLives, 0, 1) : 1;
    const shieldBoost = player ? (player.shieldHits || 0) * 0.02 : 0;
    const mercy = clamp((0.42 - livesRatio) * 0.28, 0, 0.18);
    return clamp(0.8 + timeRamp * 0.44 + relicRamp * 0.18 + bossRamp + shieldBoost - mercy, 0.78, 1.62);
  }

  function currentSpawnInterval() {
    const player = state.player;
    const pressureEase = player && player.lives <= 1 ? 1.4 : player && player.lives <= 2 ? 0.8 : 0;
    const postHitEase = state.spawnRecoveryLeft > 0 ? CONFIG.hitRecoverySpawnEaseAmount * clamp(state.spawnRecoveryLeft / CONFIG.hitRecoverySpawnEaseDuration, 0.25, 1) : 0;
    const interval = CONFIG.enemySpawnBaseInterval - state.elapsed * 0.022 - state.relics * 0.07 + pressureEase + postHitEase;
    return Math.max(CONFIG.enemySpawnMinInterval, interval);
  }

  // ─── PARTICLES & FX ────────────────────────────────────────────────────────
  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.97; p.vy *= 0.97;
    }
  }

  function addFloatingText(x, y, text, rgb = [230, 245, 255], life = CONFIG.floatingTextLife, size = 13) {
    state.floatingTexts.push({ x, y, text, life, maxLife: life, size, rgb, vy: -30, scale: 0.4 });
    if (state.floatingTexts.length > 60) state.floatingTexts.splice(0, state.floatingTexts.length - 60);
  }

  function updateFloatingTexts(dt) {
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const item = state.floatingTexts[i];
      item.life -= dt;
      if (item.life <= 0) { state.floatingTexts.splice(i, 1); continue; }
      item.y += item.vy * dt;
      item.vy *= 0.96;
      // Scale in quickly then hold
      item.scale = Math.min(1, item.scale + dt * 8);
    }
  }

  function updateTrails(dt, player) {
    if (player && !state.reducedFx) {
      state.trails.push({ x: player.x, y: player.y, r: player.r, life: 0.26, dir: Math.atan2(player.lastMoveY, player.lastMoveX), dashing: player.dashTimeLeft > 0 });
    }
    for (let i = state.trails.length - 1; i >= 0; i--) {
      state.trails[i].life -= dt;
      if (state.trails[i].life <= 0) state.trails.splice(i, 1);
    }
    const maxTrails = state.reducedFx ? 0 : 120;
    if (state.trails.length > maxTrails) state.trails.splice(0, state.trails.length - maxTrails);
  }

  function updateDustClouds(dt) {
    for (let i = state.dustClouds.length - 1; i >= 0; i--) {
      const d = state.dustClouds[i];
      d.life -= dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.life <= 0) state.dustClouds.splice(i, 1);
    }
  }

  function emitParticles(x, y, rgb, count, speed, life, size) {
    const spawnCount = state.reducedFx ? Math.max(1, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < spawnCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (state.reducedFx ? 0.78 : 1) * (0.35 + Math.random() * 0.9);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.72 + Math.random() * 0.62), maxLife: life, size: size * (0.72 + Math.random() * 0.8), rgb });
    }
  }

  function addImpactRing(x, y, rgb, maxRadius = CONFIG.impactRingMax, life = CONFIG.impactRingLife, width = 2) {
    state.impactRings.push({ x, y, rgb, radius: 10, maxRadius, life, maxLife: life, width });
    if (state.impactRings.length > 80) state.impactRings.splice(0, state.impactRings.length - 80);
  }

  function updateImpactRings(dt) {
    for (let i = state.impactRings.length - 1; i >= 0; i--) {
      const ring = state.impactRings[i];
      ring.life -= dt;
      if (ring.life <= 0) { state.impactRings.splice(i, 1); continue; }
      const progress = 1 - ring.life / ring.maxLife;
      ring.radius = 10 + (ring.maxRadius - 10) * progress;
    }
  }

  function unleashBossShockwave(boss, player) {
    addImpactRing(boss.x, boss.y, [230, 150, 255], 280, 0.48, 3.4);
    emitParticles(boss.x, boss.y, [233, 176, 255], 34, 250, 0.7, 3.2);
    triggerShake(0.24, 3.4);
    state.chromaPulse = Math.max(state.chromaPulse, 0.34);
    playSfx("bossPulse");
    const dx = player.x - boss.x; const dy = player.y - boss.y;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    if (dist < 210) {
      const push = (210 - dist) * 0.7;
      moveCircleWithCollisions(player, (dx / dist) * push, (dy / dist) * push);
      if (dist < 82 && player.invuln <= 0) {
        if (!absorbShieldHit(player, boss.x, boss.y)) {
          player.lives -= 1;
          maybeSpawnEmergencyHeal(player);
          state.spawnRecoveryLeft = Math.max(state.spawnRecoveryLeft, CONFIG.hitRecoverySpawnEaseDuration);
          player.invuln = Math.max(player.invuln, 0.9);
          state.flashTimer = Math.max(state.flashTimer, 0.28);
          state.hurtOverlay = Math.max(state.hurtOverlay, 0.46);
          triggerHitStop(0.035);
          breakCombo();
        }
      }
    }
    for (const enemy of state.enemies) {
      const ex = enemy.x - boss.x; const ey = enemy.y - boss.y;
      const ed = Math.max(0.1, Math.hypot(ex, ey));
      if (ed > 180) continue;
      const push = (180 - ed) * 0.9;
      enemy.x += (ex / ed) * push; enemy.y += (ey / ed) * push;
      clampToBounds(enemy); resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.3);
    }
    for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
      const p = state.bossProjectiles[i];
      if (Math.hypot(p.x - boss.x, p.y - boss.y) < 120) state.bossProjectiles.splice(i, 1);
    }
  }

  function triggerShake(duration, power) { state.shakeTime = Math.max(state.shakeTime, duration); state.shakePower = Math.max(state.shakePower, power); }
  function triggerHitStop(duration) { state.hitStopLeft = Math.max(state.hitStopLeft, duration); }
  function showBossCallout(text, duration = 0.9, tone = "warn") { state.bossCalloutText = text; state.bossCalloutTone = tone; state.bossCalloutTimer = Math.max(state.bossCalloutTimer, duration); }

  // ─── RENDER MAIN ───────────────────────────────────────────────────────────
  function render() {
    const player = state.player;
    const shakeX = state.shakeTime > 0 ? (Math.random() - 0.5) * state.shakePower * 2 : 0;
    const shakeY = state.shakeTime > 0 ? (Math.random() - 0.5) * state.shakePower * 2 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawObstacles();
    drawRelic();
    drawHealOrb();
    drawAegisOrb();
    drawChronoOrb();
    drawSurgeOrb();
    drawMiniBoss();
    drawBossTelegraphs();
    if (!state.reducedFx) drawTrails();
    drawEnemies();
    drawBossProjectiles();
    drawComboAura(player);
    drawPlayer(player);
    drawImpactRings();
    drawParticles();
    drawFloatingTexts();
    drawWorldTimer();
    drawBossHealthBar();
    drawBossBanner();

    if (state.flashTimer > 0) {
      ctx.fillStyle = state.victory ? "#8ff0a622" : "#ff5d5d2a";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    if (state.chromaPulse > 0 && !state.reducedFx) {
      const p = clamp(state.chromaPulse, 0, 1);
      ctx.fillStyle = `rgba(120, 180, 255, ${0.07 * p})`;
      ctx.fillRect(-2, 0, CONFIG.width, CONFIG.height);
      ctx.fillStyle = `rgba(255, 145, 210, ${0.06 * p})`;
      ctx.fillRect(2, 0, CONFIG.width, CONFIG.height);
    }

    if (state.timeSlowLeft > 0 && !state.reducedFx) {
      const p = clamp(state.timeSlowLeft / CONFIG.chronoDuration, 0, 1);
      ctx.fillStyle = `rgba(125, 195, 255, ${0.04 + p * 0.08})`;
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    }

    drawDamageVignette();
    drawDangerBorder(player);

    if (state.paused) {
      ctx.fillStyle = "#00000088";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      ctx.fillStyle = "#e8f8ff";
      ctx.font = "700 44px 'Orbitron', Verdana, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(state.autoPaused ? "PAUSE AUTO" : "PAUSE", CONFIG.width / 2, CONFIG.height / 2);
      if (state.autoPaused) {
        ctx.font = "600 18px 'Trebuchet MS', sans-serif";
        ctx.fillStyle = "rgba(222, 243, 255, 0.92)";
        ctx.fillText("Appuie sur P pour reprendre", CONFIG.width / 2, CONFIG.height / 2 + 38);
      }
    }

    ctx.restore();
  }

  // ─── DRAW HELPERS ──────────────────────────────────────────────────────────
  function drawDamageVignette() {
    if (state.hurtOverlay <= 0) return;
    const p = clamp(state.hurtOverlay, 0, 1);
    const cx = CONFIG.width * 0.5; const cy = CONFIG.height * 0.5;
    const inner = Math.min(CONFIG.width, CONFIG.height) * (0.18 + p * 0.05);
    const outer = Math.max(CONFIG.width, CONFIG.height) * 0.7;
    const vignette = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    vignette.addColorStop(0, `rgba(255, 100, 150, ${0.02 + p * 0.03})`);
    vignette.addColorStop(1, `rgba(255, 60, 120, ${0.17 + p * 0.16})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  // NEW: pulsing red border when HP is critically low
  function drawDangerBorder(player) {
    if (!player || player.lives > 2 || !state.running || state.finished) return;
    const pulse = 0.55 + 0.45 * Math.sin(state.elapsed * 8);
    const alpha = player.lives === 1 ? 0.22 + pulse * 0.28 : 0.1 + pulse * 0.14;
    const bw = 22;
    ctx.fillStyle = `rgba(255, 60, 80, ${alpha})`;
    ctx.fillRect(0, 0, CONFIG.width, bw);
    ctx.fillRect(0, CONFIG.height - bw, CONFIG.width, bw);
    ctx.fillRect(0, 0, bw, CONFIG.height);
    ctx.fillRect(CONFIG.width - bw, 0, bw, CONFIG.height);
    // Corner flourishes
    ctx.strokeStyle = `rgba(255, 90, 110, ${alpha * 1.4})`;
    ctx.lineWidth = 2;
    const cs = 48;
    ctx.beginPath();
    ctx.moveTo(0, cs); ctx.lineTo(0, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(CONFIG.width - cs, 0); ctx.lineTo(CONFIG.width, 0); ctx.lineTo(CONFIG.width, cs);
    ctx.moveTo(0, CONFIG.height - cs); ctx.lineTo(0, CONFIG.height); ctx.lineTo(cs, CONFIG.height);
    ctx.moveTo(CONFIG.width - cs, CONFIG.height); ctx.lineTo(CONFIG.width, CONFIG.height); ctx.lineTo(CONFIG.width, CONFIG.height - cs);
    ctx.stroke();
  }

  // NEW: geometric aura around player at high combo
  function drawComboAura(player) {
    if (!player || state.comboCount < 3 || state.finished) return;
    const intensity = clamp((state.comboCount - 2) / 8, 0, 1);
    const sides = 6;
    const baseR = player.r + 18 + intensity * 10;
    const rot = state.elapsed * 1.4;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 6);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(130, 240, 255, ${0.18 + intensity * 0.28 + pulse * 0.08})`;
    ctx.lineWidth = 1.4 + intensity;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const r = baseR * (0.95 + 0.05 * Math.sin(a * 3 + state.elapsed * 4));
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    // Counter-rotating inner ring
    ctx.rotate(-rot * 2.1);
    ctx.strokeStyle = `rgba(220, 180, 255, ${0.12 + intensity * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const r = (baseR - 8) * (0.94 + 0.06 * Math.sin(a * 2 - state.elapsed * 5));
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground() {
    // Deep space gradient
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, "#020810");
    g.addColorStop(0.4, "#060f1e");
    g.addColorStop(1, "#091828");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Nebula patches — two soft clouds
    if (!state.reducedFx) {
      const shift = Math.sin(state.elapsed * 0.12) * 12;
      const nb1 = ctx.createRadialGradient(180 + shift, 110, 10, 180 + shift, 110, 210);
      nb1.addColorStop(0, "rgba(60, 90, 200, 0.12)");
      nb1.addColorStop(1, "rgba(60, 90, 200, 0)");
      ctx.fillStyle = nb1; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

      const nb2 = ctx.createRadialGradient(780 - shift * 0.5, 420, 20, 780 - shift * 0.5, 420, 250);
      nb2.addColorStop(0, "rgba(120, 50, 180, 0.1)");
      nb2.addColorStop(1, "rgba(120, 50, 180, 0)");
      ctx.fillStyle = nb2; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

      // Aurora-like horizontal bands
      for (let i = 0; i < 3; i++) {
        const y = 80 + i * 155 + Math.sin(state.elapsed * (1.1 + i * 0.28) + i) * 10;
        const lane = ctx.createLinearGradient(0, y - 26, CONFIG.width, y + 26);
        lane.addColorStop(0, "rgba(72, 168, 224, 0)");
        lane.addColorStop(0.3, `rgba(72, 168, 224, ${0.04 + i * 0.015})`);
        lane.addColorStop(0.7, `rgba(88, 210, 208, ${0.05 + i * 0.012})`);
        lane.addColorStop(1, "rgba(72, 168, 224, 0)");
        ctx.fillStyle = lane;
        ctx.beginPath();
        ctx.moveTo(0, y);
        const laneShift = state.elapsed * 38;
        for (let x = 0; x <= CONFIG.width; x += 28) {
          const wave = Math.sin((x + laneShift * (0.3 + i * 0.18)) * 0.012 + i * 1.1) * 12;
          ctx.lineTo(x, y + wave);
        }
        ctx.lineTo(CONFIG.width, y + 48);
        ctx.lineTo(0, y + 48);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Stars — layered depths
    for (const star of state.stars) {
      const x = ((star.x - state.elapsed * star.speed + CONFIG.width * 8) % CONFIG.width + CONFIG.width) % CONFIG.width;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(state.elapsed * 1.8 + star.phase));
      const alpha = (star.depth || 0.5) * 0.45 * tw;
      ctx.fillStyle = `rgba(180, 235, 255, ${alpha})`;
      ctx.fillRect(Math.round(x), Math.round(star.y), star.size, star.size);
    }

    // Faint grid
    ctx.strokeStyle = "rgba(100, 170, 220, 0.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.width; x += 80) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, CONFIG.height); ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.height; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CONFIG.width, y + 0.5); ctx.stroke();
    }
  }

  function drawObstacles() {
    for (const obstacle of OBSTACLES) {
      // Main fill
      const og = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x, obstacle.y + obstacle.h);
      og.addColorStop(0, "#2c4a6af4");
      og.addColorStop(1, "#182d48f4");
      ctx.fillStyle = og;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);

      // Glow border
      ctx.strokeStyle = "rgba(100, 200, 255, 0.38)";
      ctx.lineWidth = 1;
      ctx.strokeRect(obstacle.x + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);

      // Top highlight
      ctx.fillStyle = "rgba(200, 240, 255, 0.1)";
      ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.w - 4, Math.max(2, obstacle.h * 0.3));

      // Scan lines on obstacle surface
      ctx.strokeStyle = "rgba(100, 180, 220, 0.12)";
      ctx.lineWidth = 1;
      for (let xi = obstacle.x + 12; xi < obstacle.x + obstacle.w - 8; xi += 22) {
        ctx.beginPath(); ctx.moveTo(xi, obstacle.y + 4); ctx.lineTo(xi, obstacle.y + obstacle.h - 4); ctx.stroke();
      }
    }
  }

  function drawRelic() {
    if (!state.relic) return;
    const relic = state.relic;
    const pulse = 0.7 + 0.3 * Math.sin(state.elapsed * 7.1);
    const spin = state.elapsed * 1.7;

    // Outer glow
    const glow = ctx.createRadialGradient(relic.x, relic.y, 0, relic.x, relic.y, relic.r + 20);
    glow.addColorStop(0, `rgba(120, 255, 170, ${0.28 * pulse})`);
    glow.addColorStop(1, "rgba(120, 255, 170, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(relic.x, relic.y, relic.r + 20, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(relic.x, relic.y);
    ctx.rotate(spin);

    // Diamond body
    ctx.fillStyle = "#87f6b6";
    ctx.beginPath();
    ctx.moveTo(0, -(relic.r + 1));
    ctx.lineTo(relic.r * 0.85, 0);
    ctx.lineTo(0, relic.r + 1);
    ctx.lineTo(-relic.r * 0.85, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f1fff5"; ctx.lineWidth = 2; ctx.stroke();

    // Inner shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, -(relic.r * 0.5));
    ctx.lineTo(relic.r * 0.35, -relic.r * 0.08);
    ctx.lineTo(0, -relic.r * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Orbit ring
    ctx.strokeStyle = `rgba(170, 255, 210, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(relic.x, relic.y, relic.r + 7, 0, Math.PI * 2); ctx.stroke();
  }

  function drawHealOrb() {
    if (!state.healOrb) return;
    const orb = state.healOrb;
    const pulse = 0.66 + 0.34 * Math.sin(state.elapsed * 6.5);
    const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r + 14);
    glow.addColorStop(0, `rgba(168, 255, 187, ${0.4 + pulse * 0.2})`);
    glow.addColorStop(1, "rgba(168, 255, 187, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a8ffbb";
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e8ffe9"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(200, 255, 215, 0.9)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(orb.x - 5.5, orb.y); ctx.lineTo(orb.x + 5.5, orb.y);
    ctx.moveTo(orb.x, orb.y - 5.5); ctx.lineTo(orb.x, orb.y + 5.5);
    ctx.stroke();
  }

  function drawAegisOrb() {
    if (!state.aegisOrb) return;
    const orb = state.aegisOrb;
    const pulse = 0.68 + 0.32 * Math.sin(state.elapsed * 5.6);
    const spin = state.elapsed * 1.5;
    const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r + 16);
    glow.addColorStop(0, `rgba(166, 243, 255, ${0.35 + pulse * 0.22})`);
    glow.addColorStop(1, "rgba(166, 243, 255, 0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 16, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(orb.x, orb.y); ctx.rotate(spin);
    ctx.strokeStyle = "#dffbff"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, -(orb.r + 1)); ctx.lineTo(orb.r + 1, 0); ctx.lineTo(0, orb.r + 1); ctx.lineTo(-(orb.r + 1), 0); ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#b7f8ff"; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * 0.65, 0, Math.PI * 2); ctx.fill();
  }

  function drawChronoOrb() {
    if (!state.chronoOrb) return;
    const orb = state.chronoOrb;
    const pulse = 0.62 + 0.38 * Math.sin(state.elapsed * 6.2);
    const spin = state.elapsed * 2.4;
    const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r + 14);
    glow.addColorStop(0, `rgba(148, 215, 255, ${0.35 + pulse * 0.22})`);
    glow.addColorStop(1, "rgba(148, 215, 255, 0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 14, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(orb.x, orb.y); ctx.rotate(spin);
    ctx.strokeStyle = "rgba(231, 250, 255, 0.86)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-orb.r, 0); ctx.lineTo(orb.r, 0); ctx.moveTo(0, -orb.r); ctx.lineTo(0, orb.r); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(208, 244, 255, 0.95)"; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * 0.58, 0, Math.PI * 2); ctx.fill();
  }

  function drawSurgeOrb() {
    if (!state.surgeOrb) return;
    const orb = state.surgeOrb;
    const lifeRatio = clamp((orb.life || 0) / (orb.maxLife || CONFIG.surgeLife), 0, 1);
    const pulse = 0.58 + 0.42 * Math.sin(state.elapsed * 9.2 + orb.x * 0.02);
    const spin = state.elapsed * 3.2;
    const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r + 15);
    glow.addColorStop(0, `rgba(177, 244, 255, ${(0.28 + pulse * 0.24) * lifeRatio})`);
    glow.addColorStop(1, "rgba(177, 244, 255, 0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r + 15, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(orb.x, orb.y); ctx.rotate(spin);
    ctx.strokeStyle = "rgba(234, 252, 255, 0.9)"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-orb.r, 0); ctx.lineTo(orb.r, 0); ctx.moveTo(0, -orb.r); ctx.lineTo(0, orb.r); ctx.stroke();
    ctx.rotate(Math.PI * 0.25);
    ctx.beginPath(); ctx.moveTo(-orb.r * 0.7, 0); ctx.lineTo(orb.r * 0.7, 0); ctx.moveTo(0, -orb.r * 0.7); ctx.lineTo(0, orb.r * 0.7); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = `rgba(224, 252, 255, ${0.78 + lifeRatio * 0.2})`;
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  // IMPROVED: Mini-boss with rotating armor ring segments
  function drawMiniBoss() {
    const boss = state.miniBoss;
    if (!boss) return;
    const phase = boss.phase || 1;
    const pulse = 0.74 + 0.26 * Math.sin(state.elapsed * 3.5);
    const shellColor = phase === 1 ? [214, 145, 255] : phase === 2 ? [255, 188, 129] : [255, 118, 182];
    const glowAlpha = phase === 1 ? 0.22 : phase === 2 ? 0.26 : 0.32;

    // Outer glow
    const outerGlow = ctx.createRadialGradient(boss.x, boss.y, boss.r * 0.5, boss.x, boss.y, boss.r + 30);
    outerGlow.addColorStop(0, `rgba(${shellColor[0]}, ${shellColor[1]}, ${shellColor[2]}, ${0.14 + pulse * glowAlpha})`);
    outerGlow.addColorStop(1, `rgba(${shellColor[0]}, ${shellColor[1]}, ${shellColor[2]}, 0)`);
    ctx.fillStyle = outerGlow; ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 30, 0, Math.PI * 2); ctx.fill();

    // Rotating armor ring
    const armCount = phase === 3 ? 8 : phase === 2 ? 6 : 5;
    const armRadius = boss.r + 13;
    const armAngle = boss.armAngle || 0;
    ctx.strokeStyle = `rgba(${shellColor[0]}, ${shellColor[1]}, ${shellColor[2]}, ${0.38 + pulse * 0.22})`;
    ctx.lineWidth = 2.6;
    for (let i = 0; i < armCount; i++) {
      const a = armAngle + (i / armCount) * Math.PI * 2;
      const ax = boss.x + Math.cos(a) * armRadius;
      const ay = boss.y + Math.sin(a) * armRadius;
      const a2 = armAngle + ((i + 0.36) / armCount) * Math.PI * 2;
      const ax2 = boss.x + Math.cos(a2) * armRadius;
      const ay2 = boss.y + Math.sin(a2) * armRadius;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax2, ay2); ctx.stroke();
      ctx.fillStyle = `rgba(${shellColor[0] + 20}, ${shellColor[1] + 20}, ${shellColor[2] + 20}, 0.85)`;
      ctx.beginPath(); ctx.arc(ax, ay, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // Body gradient
    const gradient = ctx.createRadialGradient(boss.x - boss.r * 0.3, boss.y - boss.r * 0.4, boss.r * 0.2, boss.x, boss.y, boss.r * 1.1);
    if (phase === 1) { gradient.addColorStop(0, "#f4c9ff"); gradient.addColorStop(1, "#9040d0"); }
    else if (phase === 2) { gradient.addColorStop(0, "#ffe0b8"); gradient.addColorStop(1, "#c87844"); }
    else { gradient.addColorStop(0, "#ffc8dd"); gradient.addColorStop(1, "#c83878"); }
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = phase === 1 ? "#f3deff" : phase === 2 ? "#ffe7c5" : "#ffd7ea";
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 1.8, 0, Math.PI * 2); ctx.stroke();

    // Eye
    ctx.fillStyle = boss.windupLeft > 0 ? "#ffe4aa" : phase === 3 ? "#fff2f7" : "#fff5ff";
    ctx.beginPath(); ctx.arc(boss.x + 4, boss.y - 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#330022";
    ctx.beginPath(); ctx.arc(boss.x + 5, boss.y - 4, 3.5, 0, Math.PI * 2); ctx.fill();

    // BOSS-OPEN indicator
    if ((boss.volleyRecoverLeft || 0) > 0) {
      const open = clamp((boss.volleyRecoverLeft || 0) / CONFIG.bossVolleyRecover, 0, 1);
      const p = 0.5 + 0.5 * Math.sin(state.elapsed * 16);
      ctx.strokeStyle = `rgba(166, 255, 220, ${0.35 + open * 0.42 + p * 0.14})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 11 + p * 3.5, 0, Math.PI * 2); ctx.stroke();
    }

    // Phase 3 phase ring
    if (phase >= 3) {
      ctx.strokeStyle = `rgba(255, 150, 200, ${0.44 + Math.sin(state.elapsed * 6) * 0.22})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 10 + Math.sin(state.elapsed * 6) * 2.5, 0, Math.PI * 2); ctx.stroke();
    }

    // HP bar
    const bw = 88; const bh = 9;
    const bx = boss.x - bw * 0.5; const by = boss.y - boss.r - 22;
    ctx.fillStyle = "rgba(16, 18, 28, 0.82)"; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = phase === 1 ? "rgba(248, 220, 255, 0.62)" : phase === 2 ? "rgba(255, 233, 201, 0.72)" : "rgba(255, 215, 236, 0.78)";
    ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    const hpRatio = clamp(boss.health / boss.maxHealth, 0, 1);
    ctx.fillStyle = phase === 1 ? "#f5b8ff" : phase === 2 ? "#ffce8b" : "#ff9bc9";
    ctx.fillRect(bx + 1.5, by + 1.5, (bw - 3) * hpRatio, bh - 3);
  }

  function drawBossTelegraphs() {
    ctx.save();
    for (const telegraph of state.bossTelegraphs) {
      const kind = telegraph.kind || "fan";
      const warm = kind === "sweep"; const nova = kind === "nova";
      const warmup = telegraph.maxDelay > 0 ? clamp(1 - (telegraph.delay || 0) / telegraph.maxDelay, 0, 1) : 1;
      const alpha = clamp(telegraph.life / telegraph.maxLife, 0, 1);
      const arming = (telegraph.delay || 0) > 0 ? warmup * 0.55 : 1 - alpha;
      const len = nova ? 255 : warm ? 300 : 280;
      const ex = telegraph.x + Math.cos(telegraph.angle) * len;
      const ey = telegraph.y + Math.sin(telegraph.angle) * len;
      const core = nova ? "137, 222, 255" : warm ? "255, 176, 129" : "255, 121, 195";
      const edge = nova ? "223, 245, 255" : warm ? "255, 238, 210" : "255, 235, 245";
      const tip = nova ? "199, 235, 255" : warm ? "255, 227, 198" : "255, 214, 239";
      ctx.strokeStyle = `rgba(${core}, ${0.08 + arming * 0.26})`; ctx.lineWidth = 8 + arming * 4;
      ctx.beginPath(); ctx.moveTo(telegraph.x, telegraph.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash(nova ? [5, 8] : warm ? [8, 10] : [12, 8]);
      ctx.lineDashOffset = -state.elapsed * (nova ? 260 : warm ? 220 : 180);
      ctx.strokeStyle = `rgba(${edge}, ${0.34 + arming * 0.58})`; ctx.lineWidth = 2.2 + arming * 1.6;
      ctx.beginPath(); ctx.moveTo(telegraph.x, telegraph.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${tip}, ${0.35 + arming * 0.48})`;
      ctx.beginPath(); ctx.arc(ex, ey, 4 + arming * 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawBossProjectiles() {
    for (const projectile of state.bossProjectiles) {
      const kind = projectile.kind || "fan";
      const warm = kind === "sweep"; const nova = kind === "nova";
      const alpha = clamp(projectile.life / CONFIG.bossProjectileLife, 0, 1);
      const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
      const tailX = projectile.x - (projectile.vx / speed) * (16 + (1 - alpha) * 16);
      const tailY = projectile.y - (projectile.vy / speed) * (16 + (1 - alpha) * 16);
      ctx.strokeStyle = nova ? `rgba(154, 226, 255, ${0.26 + alpha * 0.3})` : warm ? `rgba(255, 177, 132, ${0.26 + alpha * 0.3})` : `rgba(255, 162, 226, ${0.26 + alpha * 0.3})`;
      ctx.lineWidth = 3 + alpha * 2;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(projectile.x, projectile.y); ctx.stroke();
      ctx.fillStyle = nova ? `rgba(214, 243, 255, ${0.22 + alpha * 0.22})` : warm ? `rgba(255, 214, 181, ${0.2 + alpha * 0.2})` : `rgba(255, 188, 238, ${0.2 + alpha * 0.2})`;
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.r + 7.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = nova ? `rgba(145, 214, 255, ${0.8 + alpha * 0.18})` : warm ? `rgba(255, 170, 115, ${0.8 + alpha * 0.18})` : `rgba(255, 162, 226, ${0.8 + alpha * 0.18})`;
      ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = nova ? `rgba(241, 252, 255, ${0.62 + alpha * 0.34})` : warm ? `rgba(255, 247, 233, ${0.58 + alpha * 0.34})` : `rgba(255, 242, 252, ${0.58 + alpha * 0.34})`;
      ctx.beginPath(); ctx.arc(projectile.x - 1, projectile.y - 1, Math.max(1.7, projectile.r * 0.38), 0, Math.PI * 2); ctx.fill();
    }
  }

  // IMPROVED: Directional motion blur for dash
  function drawTrails() {
    for (const trail of state.trails) {
      const alpha = Math.max(0, trail.life / 0.26);
      if (trail.dashing) {
        // Elongated smear in movement direction
        ctx.save();
        ctx.translate(trail.x, trail.y);
        ctx.rotate(trail.dir || 0);
        ctx.globalAlpha = alpha * 0.38;
        ctx.fillStyle = "#58ccff";
        ctx.beginPath();
        ctx.ellipse(-(trail.r * 0.7), 0, trail.r * 1.8, trail.r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(121, 223, 255, ${alpha * 0.24})`;
        ctx.beginPath(); ctx.arc(trail.x, trail.y, trail.r * 0.88, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // IMPROVED: Each enemy type has a unique shape
  function drawEnemies() {
    for (const enemy of state.enemies) {
      const style = ENEMY_STYLES[enemy.type] || ENEMY_STYLES.stalker;
      const stunned = enemy.stunLeft > 0;
      const col = stunned ? "#ffd7a7" : style.color;
      const outline = stunned ? "#fff4e1" : style.outline;
      const t = state.elapsed;

      // Glow
      ctx.fillStyle = stunned ? "rgba(255, 215, 167, 0.14)" : "rgba(255, 150, 110, 0.1)";
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r + 9, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      if (enemy.type === "stalker") {
        // 6-point jagged star
        const spikes = 6;
        const rot = t * 0.7 + enemy.phase;
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const a = (i / (spikes * 2)) * Math.PI * 2 + rot;
          const r = i % 2 === 0 ? enemy.r : enemy.r * 0.55;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();

      } else if (enemy.type === "drifter") {
        // Organic blob with 5 lobes using bezier
        const lobes = 5;
        const rot = t * 0.45 + enemy.phase;
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i <= lobes; i++) {
          const a = (i / lobes) * Math.PI * 2 + rot;
          const r = enemy.r * (0.8 + 0.2 * Math.sin(t * 2.2 + i * 1.3));
          const prev = ((i - 1) / lobes) * Math.PI * 2 + rot;
          const pr = enemy.r * (0.8 + 0.2 * Math.sin(t * 2.2 + (i - 1) * 1.3));
          if (i === 0) { ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
          else {
            const cx1 = Math.cos(prev + 0.45) * pr * 1.28;
            const cy1 = Math.sin(prev + 0.45) * pr * 1.28;
            const cx2 = Math.cos(a - 0.45) * r * 1.28;
            const cy2 = Math.sin(a - 0.45) * r * 1.28;
            ctx.bezierCurveTo(cx1, cy1, cx2, cy2, Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke();

      } else if (enemy.type === "lancer") {
        // Arrow/lance shape pointing at aim direction
        const aimAngle = Math.atan2(enemy.lanceAimY || 0, enemy.lanceAimX || 1);
        ctx.rotate(aimAngle);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(enemy.r + 3, 0);          // tip
        ctx.lineTo(enemy.r * 0.1, -enemy.r * 0.6);
        ctx.lineTo(-enemy.r * 0.7, -enemy.r * 0.38);
        ctx.lineTo(-enemy.r * 0.6, 0);
        ctx.lineTo(-enemy.r * 0.7, enemy.r * 0.38);
        ctx.lineTo(enemy.r * 0.1, enemy.r * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.8; ctx.stroke();

        // Windup charge indicator
        if (enemy.lanceWindup > 0) {
          const total = Math.max(0.001, enemy.lanceWindupMax || enemy.lanceWindup);
          const p = clamp(1 - enemy.lanceWindup / total, 0, 1);
          ctx.strokeStyle = `rgba(248, 222, 255, ${0.3 + p * 0.5})`;
          ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo((72 + p * 88), 0); ctx.stroke();
        }

      } else if (enemy.type === "wisp") {
        // Energy orb with 3 orbiting dots
        const orbitR = enemy.r + 5;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.72, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.72 + 1.5, 0, Math.PI * 2); ctx.stroke();
        // Orbiting particles
        for (let i = 0; i < 3; i++) {
          const oa = t * 3.2 + (i / 3) * Math.PI * 2 + enemy.phase;
          const ox = Math.cos(oa) * orbitR;
          const oy = Math.sin(oa) * orbitR;
          ctx.fillStyle = outline;
          ctx.beginPath(); ctx.arc(ox, oy, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        // Pulse ring
        const wispPulse = 0.5 + 0.5 * Math.sin(t * 9 + enemy.phase);
        ctx.strokeStyle = `rgba(181, 237, 255, ${0.3 + wispPulse * 0.28})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, enemy.r + 5 + wispPulse * 2.5, 0, Math.PI * 2); ctx.stroke();

        // Burst windup beam
        if (enemy.wispBurstWindup > 0) {
          const total = Math.max(0.001, enemy.wispBurstWindupMax || enemy.wispBurstWindup);
          const p = clamp(1 - enemy.wispBurstWindup / total, 0, 1);
          const ax = enemy.wispDirX || 1; const ay = enemy.wispDirY || 0;
          const len = 54 + p * 70;
          ctx.strokeStyle = `rgba(188, 243, 255, ${0.28 + p * 0.46})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax * len, ay * len); ctx.stroke();
        }

      } else if (enemy.type === "spinner") {
        // 4-blade shuriken
        const rot = t * 6.5 * (enemy.orbitDir || 1) + enemy.phase;
        ctx.fillStyle = col;
        const blades = 4;
        for (let i = 0; i < blades; i++) {
          const a = rot + (i / blades) * Math.PI * 2;
          const bx = Math.cos(a) * enemy.r;
          const by = Math.sin(a) * enemy.r;
          const bx2 = Math.cos(a + Math.PI * 0.5) * enemy.r * 0.48;
          const by2 = Math.sin(a + Math.PI * 0.5) * enemy.r * 0.48;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx2, by2, -Math.cos(a) * enemy.r * 0.3, -Math.sin(a) * enemy.r * 0.3);
          ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.38, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.24, 0, Math.PI * 2); ctx.fill();

        // Spin windup
        if (enemy.spinWindup > 0) {
          const total = Math.max(0.001, enemy.spinWindupMax || enemy.spinWindup);
          const p = clamp(1 - enemy.spinWindup / total, 0, 1);
          const sx = enemy.spinDirX || 1; const sy = enemy.spinDirY || 0;
          ctx.strokeStyle = `rgba(220, 255, 234, ${0.34 + p * 0.48})`; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx * (64 + p * 74), sy * (64 + p * 74)); ctx.stroke();
        }
      }

      // Specular highlight on all enemies
      ctx.fillStyle = "rgba(255, 252, 248, 0.28)";
      ctx.beginPath(); ctx.arc(-enemy.r * 0.2, -enemy.r * 0.25, Math.max(2, enemy.r * 0.22), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // IMPROVED: Player as directional ship
  function drawPlayer(player) {
    if (!player) return;
    const blinking = player.invuln > 0 && Math.floor(performance.now() * 0.02) % 2 === 0;
    if (blinking) return;

    const dir = Math.atan2(player.lastMoveY || 0, player.lastMoveX || 1);

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(dir);

    // Dash glow
    if (player.dashTimeLeft > 0) {
      const dashGlow = ctx.createRadialGradient(-player.r * 0.5, 0, 0, -player.r * 0.5, 0, player.r * 2.4);
      dashGlow.addColorStop(0, "rgba(88, 200, 255, 0.65)");
      dashGlow.addColorStop(1, "rgba(88, 200, 255, 0)");
      ctx.fillStyle = dashGlow;
      ctx.beginPath(); ctx.arc(-player.r * 0.5, 0, player.r * 2.4, 0, Math.PI * 2); ctx.fill();
    }

    // Shield rings
    if ((player.shieldHits || 0) > 0) {
      ctx.rotate(-dir); // unrotate for shield rings (always upright)
      const layers = Math.min(CONFIG.shieldMaxHits, player.shieldHits);
      for (let i = 0; i < layers; i++) {
        const p = 0.5 + 0.5 * Math.sin(state.elapsed * (8 + i * 2) + i);
        ctx.strokeStyle = `rgba(177, 246, 255, ${0.38 - i * 0.1 + p * 0.12})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, 0, player.r + 9 + i * 5 + p * 1.8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.rotate(dir); // re-rotate
    }

    // Engine exhaust (at back, always visible)
    ctx.fillStyle = player.dashTimeLeft > 0 ? "rgba(78, 210, 255, 0.55)" : "rgba(78, 210, 255, 0.22)";
    ctx.beginPath(); ctx.ellipse(-player.r - 4, 0, player.dashTimeLeft > 0 ? 12 : 7, player.r * 0.36, 0, 0, Math.PI * 2); ctx.fill();

    // Wings
    ctx.fillStyle = "#5ac8e8";
    ctx.beginPath();
    ctx.moveTo(-player.r * 0.3, -player.r * 0.72);
    ctx.lineTo(player.r * 0.25, -player.r * 0.28);
    ctx.lineTo(-player.r * 0.65, -player.r * 0.34);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-player.r * 0.3, player.r * 0.72);
    ctx.lineTo(player.r * 0.25, player.r * 0.28);
    ctx.lineTo(-player.r * 0.65, player.r * 0.34);
    ctx.closePath(); ctx.fill();

    // Hull
    ctx.fillStyle = "#7ee8ff";
    ctx.beginPath();
    ctx.moveTo(player.r + 3, 0);                   // nose
    ctx.lineTo(-player.r * 0.3, -player.r * 0.6);  // left shoulder
    ctx.lineTo(-player.r * 0.65, -player.r * 0.26);
    ctx.lineTo(-player.r * 0.5, 0);                 // tail
    ctx.lineTo(-player.r * 0.65, player.r * 0.26);
    ctx.lineTo(-player.r * 0.3, player.r * 0.6);   // right shoulder
    ctx.closePath(); ctx.fill();

    // Hull outline
    ctx.strokeStyle = "#d8f8ff"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(player.r + 3, 0);
    ctx.lineTo(-player.r * 0.3, -player.r * 0.6);
    ctx.lineTo(-player.r * 0.65, -player.r * 0.26);
    ctx.lineTo(-player.r * 0.5, 0);
    ctx.lineTo(-player.r * 0.65, player.r * 0.26);
    ctx.lineTo(-player.r * 0.3, player.r * 0.6);
    ctx.closePath(); ctx.stroke();

    // Cockpit
    ctx.fillStyle = "#e0f8ff";
    ctx.beginPath(); ctx.ellipse(player.r * 0.25, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath(); ctx.ellipse(player.r * 0.22, -1, 2.5, 1.6, -0.3, 0, Math.PI * 2); ctx.fill();

    // Speed stripe
    ctx.strokeStyle = "rgba(100, 230, 255, 0.5)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-player.r * 0.1, -player.r * 0.18); ctx.lineTo(-player.r * 0.55, -player.r * 0.14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-player.r * 0.1, player.r * 0.18); ctx.lineTo(-player.r * 0.55, player.r * 0.14); ctx.stroke();

    ctx.restore();
  }

  function drawImpactRings() {
    for (const ring of state.impactRings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      const [r, g, b] = ring.rgb;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.75})`;
      ctx.lineWidth = ring.width * (0.55 + alpha);
      ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      const [r, g, b] = particle.rgb;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  }

  // IMPROVED: Scale-in animation for floating texts
  function drawFloatingTexts() {
    ctx.textAlign = "center";
    for (const item of state.floatingTexts) {
      const a = clamp(item.life / item.maxLife, 0, 1);
      const scale = item.scale || 1;
      const [r, g, b] = item.rgb;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.2 + a * 0.75})`;
      ctx.font = `800 ${item.size}px 'Orbitron', 'Trebuchet MS', sans-serif`;
      ctx.fillText(item.text, 0, 0);
      ctx.restore();
    }
  }

  function drawWorldTimer() {
    const x = 18; const y = 18; const w = 220; const h = 18;
    const ratio = clamp(state.elapsed / CONFIG.objectiveSeconds, 0, 1);
    ctx.fillStyle = "rgba(9, 20, 35, 0.78)"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(123, 188, 242, 0.68)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const fg = ctx.createLinearGradient(x, y, x + w, y);
    fg.addColorStop(0, "#67d8ff"); fg.addColorStop(1, "#7df5b3");
    ctx.fillStyle = fg; ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);

    // Checkpoint marker
    const cpRatio = clamp(state.nextCheckpointAt / CONFIG.objectiveSeconds, 0, 1);
    ctx.strokeStyle = "rgba(255, 241, 173, 0.6)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + cpRatio * w, y - 4); ctx.lineTo(x + cpRatio * w, y + h + 4); ctx.stroke();

    // Boss spawn marker
    if (!state.bossSpawned) {
      const bossRatio = clamp(CONFIG.bossSpawnAt / CONFIG.objectiveSeconds, 0, 1);
      ctx.strokeStyle = "rgba(230, 158, 255, 0.62)";
      ctx.beginPath(); ctx.moveTo(x + bossRatio * w, y - 4); ctx.lineTo(x + bossRatio * w, y + h + 4); ctx.stroke();
    }

    ctx.fillStyle = "rgba(225, 244, 255, 0.9)";
    ctx.font = "700 12px 'Trebuchet MS', sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`${Math.max(0, CONFIG.objectiveSeconds - state.elapsed).toFixed(1)}s`, x + w + 8, y + 13);

    // Combo bar
    const comboW = 130; const comboH = 10;
    const comboX = CONFIG.width - comboW - 18; const comboY = 18;
    const comboRatio = clamp(state.comboTimer / CONFIG.comboWindow, 0, 1);
    ctx.fillStyle = "rgba(12, 24, 39, 0.82)"; ctx.fillRect(comboX, comboY, comboW, comboH);
    ctx.strokeStyle = "rgba(168, 219, 255, 0.48)"; ctx.lineWidth = 1; ctx.strokeRect(comboX + 0.5, comboY + 0.5, comboW - 1, comboH - 1);
    if (comboRatio > 0 && state.comboCount > 0) {
      const cg = ctx.createLinearGradient(comboX, comboY, comboX + comboW, comboY);
      cg.addColorStop(0, "#8be8ff"); cg.addColorStop(1, "#78ffc7");
      ctx.fillStyle = cg; ctx.fillRect(comboX + 1.5, comboY + 1.5, (comboW - 3) * comboRatio, comboH - 3);
    }
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(225, 245, 255, 0.92)";
    ctx.font = "700 11px 'Trebuchet MS', sans-serif";
    ctx.fillText(state.comboCount > 1 ? `COMBO x${state.comboMultiplier.toFixed(2)}` : "COMBO", comboX + comboW, comboY + 24);

    // Chrono bar
    if (state.timeSlowLeft > 0) {
      const sw = 130; const sh = 10;
      const sx = CONFIG.width * 0.5 - sw * 0.5; const sy = 18;
      const sr = clamp(state.timeSlowLeft / CONFIG.chronoDuration, 0, 1);
      ctx.fillStyle = "rgba(14, 31, 49, 0.82)"; ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = "rgba(173, 226, 255, 0.6)"; ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.fillStyle = "rgba(157, 220, 255, 0.88)"; ctx.fillRect(sx + 1.5, sy + 1.5, (sw - 3) * sr, sh - 3);
      ctx.fillStyle = "rgba(219, 245, 255, 0.92)"; ctx.textAlign = "center";
      ctx.font = "700 11px 'Trebuchet MS', sans-serif";
      ctx.fillText(`CHRONO ${state.timeSlowLeft.toFixed(1)}s`, sx + sw * 0.5, sy + 24);
    }

    // Surge bar
    if (state.surgeOrb) {
      const sw = 130; const sh = 10;
      const sx = CONFIG.width * 0.5 - sw * 0.5;
      const sy = state.timeSlowLeft > 0 ? 46 : 18;
      const sr = clamp((state.surgeOrb.life || 0) / (state.surgeOrb.maxLife || CONFIG.surgeLife), 0, 1);
      ctx.fillStyle = "rgba(16, 32, 44, 0.82)"; ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = "rgba(188, 241, 255, 0.6)"; ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
      ctx.fillStyle = "rgba(184, 241, 255, 0.9)"; ctx.fillRect(sx + 1.5, sy + 1.5, (sw - 3) * sr, sh - 3);
      ctx.fillStyle = "rgba(226, 250, 255, 0.92)"; ctx.textAlign = "center";
      ctx.font = "700 11px 'Trebuchet MS', sans-serif";
      ctx.fillText(`SURGE ${state.surgeOrb.life.toFixed(1)}s`, sx + sw * 0.5, sy + 24);
    }
  }

  function drawBossHealthBar() {
    if (!state.miniBoss) return;
    const boss = state.miniBoss;
    const ratio = clamp(boss.health / boss.maxHealth, 0, 1);
    const w = 260; const h = 14;
    const x = CONFIG.width * 0.5 - w * 0.5; const y = 42;
    const phase = boss.phase || 1;
    ctx.fillStyle = "rgba(15, 26, 42, 0.82)"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(216, 235, 255, 0.46)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    const fgA = phase === 1 ? "#d89aff" : phase === 2 ? "#ffb778" : "#ff82ba";
    const fgB = phase === 1 ? "#f1d2ff" : phase === 2 ? "#ffe0b5" : "#ffd6ea";
    g.addColorStop(0, fgA); g.addColorStop(1, fgB);
    ctx.fillStyle = g; ctx.fillRect(x + 1.5, y + 1.5, (w - 3) * ratio, h - 3);
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(235, 247, 255, 0.92)";
    ctx.font = "700 12px 'Trebuchet MS', sans-serif";
    const phaseText = phase === 1 ? "PHASE I" : phase === 2 ? "PHASE II" : "PHASE III";
    const openText = (boss.volleyRecoverLeft || 0) > 0 ? " · BOSS-OPEN" : "";
    ctx.fillText(`BOSS ${phaseText}${openText}`, CONFIG.width * 0.5, y - 6);
  }

  function drawBossBanner() {
    let text = ""; let tone = "warn"; let alpha = 0;
    if (state.bossCalloutTimer > 0 && state.bossCalloutText) {
      text = state.bossCalloutText; tone = state.bossCalloutTone || "warn";
      alpha = clamp(Math.min(1, state.bossCalloutTimer / 0.35), 0, 1);
    } else if (state.bossIntroTimer > 0) {
      text = "Mini-boss detecte"; tone = "warn"; alpha = clamp(state.bossIntroTimer / 2.4, 0, 1);
    }
    if (!text) return;
    const palette = tone === "good" ? { bg: "75, 200, 145", fg: "226, 255, 240" } : tone === "bad" ? { bg: "220, 92, 125", fg: "255, 232, 239" } : { bg: "230, 150, 255", fg: "250, 228, 255" };
    ctx.font = "700 22px 'Trebuchet MS', sans-serif";
    const width = Math.min(420, ctx.measureText(text).width + 38);
    const x = CONFIG.width * 0.5 - width * 0.5; const y = 28; const h = 34;
    ctx.fillStyle = `rgba(${palette.bg}, ${0.18 + alpha * 0.26})`; ctx.fillRect(x, y, width, h);
    ctx.strokeStyle = `rgba(${palette.fg}, ${0.42 + alpha * 0.4})`; ctx.lineWidth = 1.4; ctx.strokeRect(x + 0.5, y + 0.5, width - 1, h - 1);
    ctx.fillStyle = `rgba(${palette.fg}, ${0.92 * alpha})`;
    ctx.textAlign = "center"; ctx.fillText(text, CONFIG.width * 0.5, y + 24);
  }

  // ─── LOOP ──────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!state.frame.lastTs) state.frame.lastTs = ts;
    const dt = Math.min(0.05, (ts - state.frame.lastTs) / 1000);
    state.frame.lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ─── PHYSICS HELPERS ───────────────────────────────────────────────────────
  function moveCircleWithCollisions(entity, dx, dy) {
    entity.x += dx; clampToBounds(entity); resolveObstacleOverlap(entity);
    entity.y += dy; clampToBounds(entity); resolveObstacleOverlap(entity);
  }
  function clampToBounds(entity) {
    entity.x = clamp(entity.x, entity.r, CONFIG.width - entity.r);
    entity.y = clamp(entity.y, entity.r, CONFIG.height - entity.r);
  }
  function resolveObstacleOverlap(entity) {
    for (const obstacle of OBSTACLES) {
      const nearestX = clamp(entity.x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(entity.y, obstacle.y, obstacle.y + obstacle.h);
      const dx = entity.x - nearestX; const dy = entity.y - nearestY;
      const dist = Math.hypot(dx, dy);
      if (dist === 0 || dist >= entity.r) continue;
      const push = entity.r - dist;
      entity.x += (dx / dist) * push; entity.y += (dy / dist) * push;
      clampToBounds(entity);
    }
  }
  function circleHitsAnyObstacle(x, y, r) {
    for (const obstacle of OBSTACLES) {
      const nearestX = clamp(x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(y, obstacle.y, obstacle.y + obstacle.h);
      const dx = x - nearestX; const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }
  function circlesOverlap(a, b) {
    const dx = a.x - b.x; const dy = a.y - b.y;
    const rr = a.r + b.r;
    return dx * dx + dy * dy <= rr * rr;
  }
  function circlesOverlapRadius(a, b, radius) {
    const dx = a.x - b.x; const dy = a.y - b.y;
    return dx * dx + dy * dy <= radius * radius;
  }

  // ─── INPUT ─────────────────────────────────────────────────────────────────
  function getMovementVector() {
    let dx = 0; let dy = 0;
    if (state.botInput) {
      dx += (state.botInput.left ? -1 : 0) + (state.botInput.right ? 1 : 0);
      dy += (state.botInput.up ? -1 : 0) + (state.botInput.down ? 1 : 0);
    }
    if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.keys.has("A")) dx -= 1;
    if (state.keys.has("ArrowRight") || state.keys.has("d") || state.keys.has("D")) dx += 1;
    if (state.keys.has("ArrowUp") || state.keys.has("w") || state.keys.has("W")) dy -= 1;
    if (state.keys.has("ArrowDown") || state.keys.has("s") || state.keys.has("S")) dy += 1;
    if (state.touch.active && state.player) {
      const rect = dom.canvas.getBoundingClientRect();
      const tx = ((state.touch.x - rect.left) / rect.width) * CONFIG.width;
      const ty = ((state.touch.y - rect.top) / rect.height) * CONFIG.height;
      const vx = tx - state.player.x; const vy = ty - state.player.y;
      if (Math.hypot(vx, vy) > CONFIG.touchDeadZone) { dx = vx; dy = vy; }
    }
    return { dx, dy };
  }

  // ─── LEADERBOARD ───────────────────────────────────────────────────────────
  function saveLeaderboardEntry(entry) {
    const board = loadLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.score - a.score || b.relics - a.relics || a.elapsed - b.elapsed);
    const trimmed = board.slice(0, CONFIG.leaderboardSize);
    localStorage.setItem(CONFIG.leaderboardKey, JSON.stringify(trimmed));
  }
  function loadLeaderboard() {
    try { const raw = localStorage.getItem(CONFIG.leaderboardKey); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  function renderLeaderboard() {
    const board = loadLeaderboard();
    dom.leaderboard.innerHTML = "";
    if (!board.length) { const li = document.createElement("li"); li.textContent = "Aucun score pour le moment"; dom.leaderboard.appendChild(li); return; }
    for (const item of board) {
      const li = document.createElement("li");
      const badge = item.victory ? "victoire" : "defaite";
      li.textContent = `${item.score} pts | ${item.relics} reliques | ${item.elapsed}s | ${badge}`;
      dom.leaderboard.appendChild(li);
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────
  function syncHud() {
    const player = state.player;
    const directive = state.directives.active;
    const dashReady = player && player.dashCooldownLeft <= 0;
    dom.livesVal.textContent = String(player ? Math.max(0, player.lives) : CONFIG.playerMaxLives);
    dom.timeVal.textContent = `${state.elapsed.toFixed(1)}s`;
    if (dom.goalVal) dom.goalVal.textContent = `${CONFIG.objectiveSeconds}s`;
    dom.scoreVal.textContent = String(Math.floor(state.score));
    dom.relicVal.textContent = String(state.relics);
    if (dom.comboVal) dom.comboVal.textContent = state.comboCount > 1 ? `x${state.comboMultiplier.toFixed(2)} (${state.comboTimer.toFixed(1)}s)` : "x1.00";
    if (dom.shieldVal) dom.shieldVal.textContent = String(player ? player.shieldHits || 0 : 0);
    dom.enemyVal.textContent = String(state.enemies.length + (state.miniBoss ? 1 : 0));
    if (dom.dashVal) dom.dashVal.textContent = dashReady ? "Pret" : player ? `${Math.max(player.dashCooldownLeft, 0).toFixed(1)}s` : "-";
    if (dom.dangerVal) {
      if (state.miniBoss) {
        const phase = state.miniBoss.phase || 1;
        dom.dangerVal.textContent = (state.miniBoss.volleyRecoverLeft || 0) > 0 ? "BOSS-OPEN" : phase === 1 ? "BOSS-I" : phase === 2 ? "BOSS-II" : "BOSS-III";
      } else if (state.difficulty < 1.06) dom.dangerVal.textContent = "I";
      else if (state.difficulty < 1.34) dom.dangerVal.textContent = "II";
      else dom.dangerVal.textContent = "III";
    }
    if (dom.contractTag) {
      dom.contractTag.textContent = directive ? directive.tag : state.running ? "SCAN" : "--";
      dom.contractTag.dataset.tone = directive ? directive.tone : "idle";
    }
    if (dom.contractTimer) dom.contractTimer.textContent = directive ? `${directive.timeLeft.toFixed(1)}s` : state.running ? `${Math.max(0, state.directives.cooldown).toFixed(1)}s` : "-";
    if (dom.contractText) {
      dom.contractText.textContent = directive
        ? `${directive.description} • ${getDirectiveProgressText(directive)}`
        : state.running
          ? "Analyse tactique en cours. La prochaine directive donnera un bonus de run."
          : "Directives optionnelles: objectifs courts, bonus immediats, plus de rythme.";
    }
    if (dom.contractFill) {
      const ratio = directive ? getDirectiveFillRatio(directive) : state.running ? 1 - clamp(state.directives.cooldown / CONFIG.directiveStartDelay, 0, 1) : 0;
      dom.contractFill.style.width = `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
      dom.contractFill.dataset.tone = directive ? directive.tone : "idle";
      dom.contractFill.style.opacity = directive ? "1" : state.running ? "0.72" : "0.4";
    }
    if (dom.eventText) {
      const intel = getIntelText();
      dom.eventText.textContent = directive ? `Gain: ${directive.rewardText} • ${intel}` : intel;
    }
    syncAudioUi();
    // Low HP heartbeat on lives element
    if (player && player.lives <= 2) {
      dom.livesVal.style.animation = "hp-critical 0.55s ease-in-out infinite";
    } else {
      dom.livesVal.style.animation = "";
    }
  }

  function syncAudioUi() {
    if (!dom.audioVal || !dom.audioBtn) return;
    const enabled = !!state.audio.enabled;
    dom.audioVal.textContent = enabled ? "ON" : "OFF";
    dom.audioBtn.classList.toggle("is-off", !enabled);
    dom.audioBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  function updateActionButton() {
    if (state.running && !state.finished) { dom.actionBtn.textContent = "En cours"; dom.actionBtn.disabled = true; return; }
    if (state.finished) { dom.actionBtn.textContent = "Rejouer"; dom.actionBtn.disabled = false; return; }
    dom.actionBtn.textContent = "Demarrer"; dom.actionBtn.disabled = false;
  }

  function showOverlay(html) { dom.overlay.innerHTML = html; dom.overlay.classList.remove("hidden"); }
  function hideOverlay() { dom.overlay.classList.add("hidden"); dom.overlay.textContent = ""; }

  // ─── AUDIO ─────────────────────────────────────────────────────────────────
  function ensureAudioReady() {
    if (!state.audio.enabled) return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!state.audio.ctx) {
      state.audio.ctx = new AudioCtx();
      state.audio.master = state.audio.ctx.createGain();
      state.audio.master.gain.value = 0.11;
      state.audio.master.connect(state.audio.ctx.destination);
    }
    if (state.audio.ctx.state !== "running") state.audio.ctx.resume().catch(() => {});
    return state.audio.ctx;
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = !!enabled;
    if (state.audio.enabled) ensureAudioReady();
    if (state.audio.master) state.audio.master.gain.setTargetAtTime(state.audio.enabled ? 0.11 : 0.0, state.audio.ctx.currentTime, 0.02);
    try { localStorage.setItem(CONFIG.audioEnabledKey, state.audio.enabled ? "1" : "0"); } catch {}
    syncAudioUi();
  }

  function toggleAudio() {
    const nextEnabled = !state.audio.enabled;
    setAudioEnabled(nextEnabled);
    if (nextEnabled) {
      playSfx("toggle");
      showBossCallout("Audio actif", 0.8, "good");
    } else {
      showBossCallout("Audio coupe", 0.8, "warn");
    }
  }

  function setReducedFx(enabled) {
    state.reducedFx = !!enabled;
    try { localStorage.setItem(CONFIG.reducedFxKey, state.reducedFx ? "1" : "0"); } catch {}
  }

  function playTone(startFreq, endFreq, duration, type = "sine", volume = 0.06) {
    const audioCtx = ensureAudioReady();
    if (!audioCtx || !state.audio.master) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain); gain.connect(state.audio.master);
    osc.start(now); osc.stop(now + duration + 0.01);
  }

  function playSfx(name) {
    if (!state.audio.enabled) return;
    if (name === "start") { playTone(300, 430, 0.14, "triangle", 0.04); return; }
    if (name === "dash") { playTone(520, 880, 0.08, "sawtooth", 0.045); return; }
    if (name === "relic") { playTone(780, 1090, 0.1, "triangle", 0.05); return; }
    if (name === "heal") { playTone(420, 660, 0.14, "sine", 0.05); return; }
    if (name === "shieldGain") { playTone(500, 760, 0.13, "triangle", 0.05); return; }
    if (name === "shieldBreak") { playTone(260, 150, 0.12, "sawtooth", 0.052); return; }
    if (name === "nearMiss") { playTone(640, 820, 0.06, "triangle", 0.035); return; }
    if (name === "chrono") { playTone(460, 320, 0.14, "triangle", 0.048); playTone(620, 440, 0.12, "sine", 0.038); return; }
    if (name === "surge") { playTone(520, 760, 0.11, "triangle", 0.047); playTone(760, 520, 0.09, "sine", 0.034); return; }
    if (name === "hit") { playTone(180, 70, 0.16, "square", 0.055); return; }
    if (name === "checkpoint") { playTone(360, 540, 0.12, "triangle", 0.05); playTone(540, 720, 0.12, "triangle", 0.04); return; }
    if (name === "bossSpawn") { playTone(120, 75, 0.25, "sawtooth", 0.07); return; }
    if (name === "bossCharge") { playTone(220, 300, 0.09, "square", 0.05); return; }
    if (name === "bossPhase") { playTone(260, 420, 0.16, "triangle", 0.06); return; }
    if (name === "bossPulse") { playTone(140, 90, 0.18, "sawtooth", 0.065); playTone(280, 210, 0.14, "triangle", 0.04); return; }
    if (name === "bossWarn") { playTone(320, 260, 0.1, "square", 0.048); playTone(260, 220, 0.08, "square", 0.036); return; }
    if (name === "bossNova") { playTone(280, 520, 0.11, "triangle", 0.05); playTone(520, 320, 0.11, "sine", 0.038); return; }
    if (name === "bossAim") { playTone(360, 470, 0.12, "triangle", 0.045); return; }
    if (name === "bossShot") { playTone(500, 260, 0.1, "square", 0.055); return; }
    if (name === "bossShotHit") { playTone(190, 110, 0.14, "sawtooth", 0.06); return; }
    if (name === "bossHit") { playTone(300, 180, 0.1, "square", 0.05); return; }
    if (name === "bossOpen") { playTone(330, 460, 0.08, "triangle", 0.04); return; }
    if (name === "bossBreak") { playTone(620, 260, 0.14, "sawtooth", 0.055); playTone(440, 220, 0.12, "triangle", 0.04); return; }
    if (name === "bossDefeat") { playTone(560, 300, 0.24, "triangle", 0.06); playTone(760, 420, 0.2, "sine", 0.05); return; }
    if (name === "win") { playTone(420, 760, 0.2, "triangle", 0.055); return; }
    if (name === "lose") { playTone(220, 80, 0.24, "square", 0.06); return; }
    if (name === "toggle") { playTone(420, 520, 0.08, "sine", 0.04); }
  }

  // ─── EVENTS ────────────────────────────────────────────────────────────────
  function handleKeyDown(event) {
    ensureAudioReady();
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) { queueDashRequest(); tryDash(); }
      return;
    }
    if (event.key === "p" || event.key === "P") { if (state.running) { state.paused = !state.paused; state.autoPaused = false; } return; }
    if (event.key === "r" || event.key === "R") { startGame(); return; }
    if (event.key === "m" || event.key === "M") { toggleAudio(); return; }
    if (event.key === "v" || event.key === "V") { setReducedFx(!state.reducedFx); showBossCallout(state.reducedFx ? "FX reduits" : "FX complets", 0.9, "warn"); playSfx("toggle"); return; }
    if (event.key.startsWith("Arrow") || ["w","W","a","A","s","S","d","D"].includes(event.key)) event.preventDefault();
    state.keys.add(event.key);
  }
  function handleKeyUp(event) { state.keys.delete(event.key); }

  function handleVisibilityChange(hidden = document.hidden) {
    if (hidden) {
      if (state.running && !state.finished && !state.paused) {
        state.paused = true; state.autoPaused = true;
        state.keys.clear(); state.touch.active = false;
        showBossCallout("Pause auto", 0.8, "warn");
      }
      return;
    }
    if (state.autoPaused && state.running && !state.finished) {
      state.autoPaused = false;
      showBossCallout("Reprendre: P", 0.9, "good");
    }
  }

  function bindTouchControls() {
    const updateTouch = (ev) => {
      ensureAudioReady();
      if (!ev.touches || !ev.touches[0]) return;
      state.touch.active = true; state.touch.x = ev.touches[0].clientX; state.touch.y = ev.touches[0].clientY;
      ev.preventDefault();
    };
    dom.canvas.addEventListener("touchstart", updateTouch, { passive: false });
    dom.canvas.addEventListener("touchmove", updateTouch, { passive: false });
    dom.canvas.addEventListener("touchend", () => { state.touch.active = false; });
    dom.canvas.addEventListener("touchcancel", () => { state.touch.active = false; });
  }

  function bindEvents() {
    dom.actionBtn.addEventListener("click", () => { ensureAudioReady(); if (state.running && !state.finished) return; startGame(); });
    if (dom.dashBtn) {
      dom.dashBtn.addEventListener("pointerdown", (event) => { ensureAudioReady(); event.preventDefault(); queueDashRequest(); tryDash(); }, { passive: false });
    }
    if (dom.audioBtn) {
      dom.audioBtn.addEventListener("click", () => { ensureAudioReady(); toggleAudio(); });
    }
    window.addEventListener("pointerdown", ensureAudioReady, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", () => { handleVisibilityChange(document.hidden); });
    bindTouchControls();
  }

  // ─── DEBUG API (preserved identically for tests) ───────────────────────────
  function setupDebugApi() {
    window.__RUINS_DASH_DEBUG__ = {
      getState() {
        const player = state.player; const boss = state.miniBoss;
        return {
          running: state.running, paused: state.paused, autoPaused: state.autoPaused,
          finished: state.finished, victory: state.victory, elapsed: state.elapsed,
          score: state.score, relics: state.relics, comboCount: state.comboCount,
          comboTimer: state.comboTimer, comboMultiplier: state.comboMultiplier,
          pendingDashLeft: state.pendingDashLeft, timeSlowLeft: state.timeSlowLeft,
          spawnRecoveryLeft: state.spawnRecoveryLeft, difficulty: state.difficulty,
          objectiveSeconds: CONFIG.objectiveSeconds, nextCheckpointAt: state.nextCheckpointAt,
          audioEnabled: state.audio.enabled, reducedFx: state.reducedFx,
          directives: {
            active: state.directives.active ? { type: state.directives.active.type, tag: state.directives.active.tag, tone: state.directives.active.tone, description: state.directives.active.description, rewardText: state.directives.active.rewardText, progress: state.directives.active.progress, target: state.directives.active.target, timeLeft: state.directives.active.timeLeft, maxTime: state.directives.active.maxTime } : null,
            cooldown: state.directives.cooldown,
            completed: state.directives.completed,
            failed: state.directives.failed,
          },
          stats: { ...state.stats },
          player: player ? { x: player.x, y: player.y, r: player.r, lives: player.lives, shieldHits: player.shieldHits || 0, invuln: player.invuln, dashCooldownLeft: player.dashCooldownLeft, dashTimeLeft: player.dashTimeLeft } : null,
          relic: state.relic ? { x: state.relic.x, y: state.relic.y, r: state.relic.r } : null,
          healOrb: state.healOrb ? { x: state.healOrb.x, y: state.healOrb.y, r: state.healOrb.r } : null,
          aegisOrb: state.aegisOrb ? { x: state.aegisOrb.x, y: state.aegisOrb.y, r: state.aegisOrb.r } : null,
          chronoOrb: state.chronoOrb ? { x: state.chronoOrb.x, y: state.chronoOrb.y, r: state.chronoOrb.r } : null,
          surgeOrb: state.surgeOrb ? { x: state.surgeOrb.x, y: state.surgeOrb.y, r: state.surgeOrb.r, life: state.surgeOrb.life } : null,
          miniBoss: boss ? { x: boss.x, y: boss.y, r: boss.r, health: boss.health, maxHealth: boss.maxHealth, phase: boss.phase || 1, stunLeft: boss.stunLeft, windupLeft: boss.windupLeft, chargeTimeLeft: boss.chargeTimeLeft, shockwaveCooldown: boss.shockwaveCooldown || 0, projectileCooldown: boss.projectileCooldown || 0, novaCooldown: boss.novaCooldown || 0, attackLockLeft: boss.attackLockLeft || 0, volleyRecoverLeft: boss.volleyRecoverLeft || 0 } : null,
          enemies: state.enemies.map(e => ({ type: e.type, x: e.x, y: e.y, r: e.r, baseSpeed: e.baseSpeed, stunLeft: e.stunLeft, lanceWindup: e.lanceWindup || 0, lanceTime: e.lanceTime || 0, spinWindup: e.spinWindup || 0, spinTime: e.spinTime || 0 })),
          bossTelegraphs: state.bossTelegraphs.map(item => ({ x: item.x, y: item.y, angle: item.angle, kind: item.kind, delay: item.delay, life: item.life, maxLife: item.maxLife })),
          bossProjectiles: state.bossProjectiles.map(item => ({ x: item.x, y: item.y, r: item.r, kind: item.kind, vx: item.vx, vy: item.vy, life: item.life })),
        };
      },
      startGame() { startGame(); return this.getState(); },
      setBotInput(input) { state.botInput = { left: !!input?.left, right: !!input?.right, up: !!input?.up, down: !!input?.down }; },
      step(dt = 1 / 60, input = null) {
        if (input) { this.setBotInput(input); if (input.dash) tryDash(); }
        const safeDt = clamp(Number(dt) || 0.016, 0.001, 0.09);
        update(safeDt); return this.getState();
      },
      clearBotInput() { state.botInput = null; },
      setAudioEnabled(enabled) { setAudioEnabled(!!enabled); },
      setReducedFx(enabled) { setReducedFx(!!enabled); },
      setPaused(enabled) { state.paused = !!enabled; if (!enabled) state.autoPaused = false; },
      simulateVisibility(hidden) { handleVisibilityChange(!!hidden); return this.getState(); },
      setPlayerPosition(x, y) {
        if (!state.player) return;
        state.player.x = clamp(Number(x) || state.player.x, state.player.r, CONFIG.width - state.player.r);
        state.player.y = clamp(Number(y) || state.player.y, state.player.r, CONFIG.height - state.player.r);
      },
      setPlayerLives(lives) {
        if (!state.player) return;
        state.player.lives = clamp(Math.round(Number(lives) || state.player.lives), 0, CONFIG.playerMaxLives);
      },
      spawnEnemy(type = "stalker", x = null, y = null) {
        if (!state.player) return null;
        const parsedX = Number(x); const parsedY = Number(y);
        const hasX = x !== null && x !== undefined && Number.isFinite(parsedX);
        const hasY = y !== null && y !== undefined && Number.isFinite(parsedY);
        const tx = clamp(hasX ? parsedX : state.player.x + rand(-160, 160), 18, CONFIG.width - 18);
        const ty = clamp(hasY ? parsedY : state.player.y + rand(-120, 120), 18, CONFIG.height - 18);
        const kind = ENEMY_STYLES[type] ? type : "stalker";
        const enemy = buildEnemy(tx, ty, kind);
        if (circleHitsAnyObstacle(enemy.x, enemy.y, enemy.r + 2)) {
          enemy.x = clamp(state.player.x + 80, enemy.r, CONFIG.width - enemy.r);
          enemy.y = clamp(state.player.y - 80, enemy.r, CONFIG.height - enemy.r);
        }
        state.enemies.push(enemy); return { ...enemy };
      },
      spawnChronoOrb() { if (!state.player) return null; state.chronoOrb = spawnChronoOrb(state.player); return state.chronoOrb ? { ...state.chronoOrb } : null; },
      spawnSurgeOrb() { if (!state.player) return null; state.surgeOrb = spawnSurgeOrb(state.player); return state.surgeOrb ? { ...state.surgeOrb } : null; },
      activateDirective(type = null) { return activateDirective(type); },
    };
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  function setupStars() {
    state.stars = [];
    for (let i = 0; i < CONFIG.starsCount; i++) {
      state.stars.push({
        x: rand(0, CONFIG.width), y: rand(0, CONFIG.height),
        size: rand(0.7, 2.2),
        speed: rand(1.8, 10),
        phase: rand(0, Math.PI * 2),
        depth: rand(0.2, 1.0), // new: parallax depth for brightness variation
      });
    }
  }

  function init() {
    try {
      const reducedRaw = localStorage.getItem(CONFIG.reducedFxKey);
      state.reducedFx = reducedRaw === "1";
      const audioRaw = localStorage.getItem(CONFIG.audioEnabledKey);
      if (audioRaw === "0") state.audio.enabled = false;
    } catch { state.reducedFx = false; }
    bindEvents();
    setupDebugApi();
    setupStars();
    renderLeaderboard();
    updateActionButton();
    showOverlay("Survis 60s. Boss a 30s (3 phases + salves Nova). Les DIRECTIVES donnent des bonus tactiques rapides. Dash en fenetre BOSS-OPEN. Combo reliques + Aegis/Chrono/SURGE a collecter. Espace = rush. M = audio. V = FX. Onglet masque = pause auto.");
    syncHud();
    requestAnimationFrame(loop);
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  init();
})();
