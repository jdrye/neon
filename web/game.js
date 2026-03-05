"use strict";

/**
 * Ruins Dash - arcade survival edition.
 *
 * Goal:
 * - survive until dawn
 * - collect relics for score
 * - use Space dash to escape pressure
 */
(() => {
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

    enemySpawnBaseInterval: 8.4,
    enemySpawnMinInterval: 5.4,
    enemyMax: 5,
    enemyGraceSeconds: 3.8,
    enemySafeSpawnFromPlayer: 250,
    enemySafeSpawnFromRelic: 170,
    wispMinSpawnTime: 24,
    wispMaxActive: 1,
    wispBurstCooldownMin: 4.6,
    wispBurstCooldownMax: 6.8,
    wispBurstWindupMin: 0.26,
    wispBurstWindupMax: 0.4,
    wispBurstSpeedMul: 2.45,

    relicRadius: 12,
    relicCatchBonus: 22,
    relicSafeFromEnemy: 90,
    relicSafeFromPlayer: 90,

    healRadius: 11,
    healEveryRelics: 3,
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
    starsCount: 90,
    impactRingMax: 240,
    impactRingLife: 0.36,
    floatingTextLife: 0.72,

    leaderboardSize: 5,
    leaderboardKey: "ruins_dash_scores_v4",
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
  };

  const dom = {
    canvas: document.getElementById("game"),
    actionBtn: document.getElementById("actionBtn"),
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

    difficulty: 1,
    nextCheckpointAt: CONFIG.checkpointEverySeconds,

    player: null,
    enemies: [],
    relic: null,
    healOrb: null,
    aegisOrb: null,

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

    keys: new Set(),
    botInput: null,
    touch: { active: false, x: 0, y: 0 },
    frame: { lastTs: 0 },

    audio: {
      enabled: true,
      ctx: null,
      master: null,
    },

    reducedFx: false,
  };

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

  function startGame() {
    state.running = true;
    state.paused = false;
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

    state.difficulty = 1;
    state.nextCheckpointAt = CONFIG.checkpointEverySeconds;

    state.player = createPlayer();
    state.enemies = [];
    state.relic = spawnRelic(state.player);
    state.healOrb = null;
    state.aegisOrb = null;

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
    state.botInput = null;

    updateActionButton();
    dom.actionBtn.blur();
    hideOverlay();
    syncHud();
    playSfx("start");
  }

  function endGame(victory, message) {
    state.running = false;
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
      `<div class="${style}">${title}</div><div>${summaryMessage}</div><div>Score: ${Math.floor(state.score)}</div><div>Reliques: ${state.relics}</div><div>Temps: ${state.elapsed.toFixed(1)}s</div><div style="margin-top:.6rem; font-size:.95rem; font-weight:500;">Clique sur Rejouer pour relancer.</div>`
    );
  }

  function update(dt) {
    if (!state.running || state.paused || !state.player) {
      return;
    }

    state.hurtOverlay = Math.max(0, state.hurtOverlay - dt * CONFIG.hurtOverlayDecay);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0 && state.comboCount > 0) {
      breakCombo();
    }

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
    if (state.shakeTime <= 0) {
      state.shakePower = 0;
    }

    state.difficulty = computeDifficulty();

    const player = state.player;
    player.invuln = Math.max(0, player.invuln - dt);
    player.dashCooldownLeft = Math.max(0, player.dashCooldownLeft - dt);
    player.dashTimeLeft = Math.max(0, player.dashTimeLeft - dt);

    updatePlayer(dt, player);
    updateEnemies(dt, player);
    maybeSpawnMiniBoss(player);
    updateMiniBoss(dt, player);
    updateBossTelegraphs(dt);
    updateBossProjectiles(dt, player);

    maybeCollectRelic(player);
    maybeCollectHeal(player);
    maybeCollectAegis(player);
    maybeTakeDamage(player);
    maybeTriggerCheckpoint(player);

    updateParticles(dt);
    updateImpactRings(dt);
    updateTrails(dt, player);
    updateFloatingTexts(dt);

    if (player.lives <= 0) {
      endGame(false, "Les ombres ont pris le dessus.");
      return;
    }

    if (state.elapsed >= CONFIG.objectiveSeconds) {
      endGame(true, "Tu as tenu la ligne jusqu'a l'aube.");
      return;
    }

    syncHud();
  }

  function maybeSpawnMiniBoss(player) {
    if (state.bossSpawned || state.elapsed < CONFIG.bossSpawnAt) {
      return;
    }

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
    for (let i = 0; i < 120; i += 1) {
      const candidate = {
        x: rand(70, CONFIG.width - 70),
        y: rand(70, CONFIG.height - 70),
      };

      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 300) {
        continue;
      }

      if (circleHitsAnyObstacle(candidate.x, candidate.y, CONFIG.bossRadius)) {
        continue;
      }

      return {
        x: candidate.x,
        y: candidate.y,
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
        shockwaveWarned: false,
        attackLockLeft: 0,
        volleyRecoverLeft: 0,
        volleyPattern: 0,
      };
    }

    return {
      x: CONFIG.width * 0.5,
      y: 90,
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
      shockwaveWarned: false,
      attackLockLeft: 0,
      volleyRecoverLeft: 0,
      volleyPattern: 0,
    };
  }

  function getBossPhase(boss) {
    const ratio = boss.health / boss.maxHealth;
    if (ratio <= CONFIG.bossPhase3Ratio) {
      return 3;
    }
    if (ratio <= CONFIG.bossPhase2Ratio) {
      return 2;
    }
    return 1;
  }

  function getBossPhaseParams(phase) {
    if (phase === 2) {
      return {
        moveSpeedMul: 1.18,
        chargeWindupMul: 0.9,
        chargeDurationMul: 1.08,
        chargeSpeedMul: 1.2,
        chargeCooldownMin: 3.5,
        chargeCooldownMax: 5.1,
        minionEvery: 7.2,
      };
    }
    if (phase === 3) {
      return {
        moveSpeedMul: 1.34,
        chargeWindupMul: 0.75,
        chargeDurationMul: 1.17,
        chargeSpeedMul: 1.34,
        chargeCooldownMin: 2.4,
        chargeCooldownMax: 3.8,
        minionEvery: 5.8,
      };
    }
    return {
      moveSpeedMul: 1,
      chargeWindupMul: 1,
      chargeDurationMul: 1,
      chargeSpeedMul: 1,
      chargeCooldownMin: CONFIG.bossChargeCooldownMin,
      chargeCooldownMax: CONFIG.bossChargeCooldownMax,
      minionEvery: CONFIG.bossSpawnMinionEvery,
    };
  }

  function updateMiniBoss(dt, player) {
    const boss = state.miniBoss;
    if (!boss) {
      return;
    }

    const prevPhase = boss.phase;
    boss.phase = getBossPhase(boss);
    const phaseCfg = getBossPhaseParams(boss.phase);
    if (prevPhase !== boss.phase) {
      state.flashTimer = Math.max(state.flashTimer, 0.22);
      addImpactRing(
        boss.x,
        boss.y,
        boss.phase === 2 ? [255, 206, 140] : [241, 154, 255],
        190,
        0.42,
        3
      );
      showBossCallout(boss.phase === 2 ? "Phase II" : "Phase III", 1.25, "warn");
      playSfx("bossPhase");
    }

    boss.stunLeft = Math.max(0, boss.stunLeft - dt);
    boss.attackLockLeft = Math.max(0, (boss.attackLockLeft || 0) - dt);
    boss.volleyRecoverLeft = Math.max(0, (boss.volleyRecoverLeft || 0) - dt);
    boss.chargeCooldown = Math.max(0, boss.chargeCooldown - dt);
    boss.spawnMinionTimer = Math.max(0, boss.spawnMinionTimer - dt);
    boss.shockwaveCooldown = Math.max(0, (boss.shockwaveCooldown || 0) - dt);
    boss.projectileCooldown = Math.max(0, (boss.projectileCooldown || 0) - dt);

    const toPlayerX = player.x - boss.x;
    const toPlayerY = player.y - boss.y;
    const distToPlayer = Math.max(1, Math.hypot(toPlayerX, toPlayerY));
    const nx = toPlayerX / distToPlayer;
    const ny = toPlayerY / distToPlayer;

    if (boss.stunLeft <= 0 && boss.attackLockLeft <= 0) {
      if (boss.windupLeft > 0) {
        boss.windupLeft -= dt;
        if (boss.windupLeft <= 0) {
          boss.chargeTimeLeft = CONFIG.bossChargeDuration * phaseCfg.chargeDurationMul;
          boss.chargeDirX = nx;
          boss.chargeDirY = ny;
          playSfx("bossCharge");
          addImpactRing(boss.x, boss.y, [244, 216, 255], 120, 0.24, 2);
        }
      } else if (boss.chargeTimeLeft > 0) {
        boss.chargeTimeLeft -= dt;
        moveCircleWithCollisions(
          boss,
          boss.chargeDirX * CONFIG.bossChargeSpeed * phaseCfg.chargeSpeedMul * dt,
          boss.chargeDirY * CONFIG.bossChargeSpeed * phaseCfg.chargeSpeedMul * dt
        );
      } else {
        const sway = Math.sin(state.elapsed * 2.2) * 0.42;
        const perpX = -ny;
        const perpY = nx;
        const followX = nx + perpX * sway;
        const followY = ny + perpY * sway;
        const n = Math.hypot(followX, followY) || 1;
        moveCircleWithCollisions(
          boss,
          (followX / n) * boss.baseSpeed * phaseCfg.moveSpeedMul * dt,
          (followY / n) * boss.baseSpeed * phaseCfg.moveSpeedMul * dt
        );

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

    if (
      boss.phase >= 2 &&
      boss.projectileCooldown <= 0 &&
      boss.windupLeft <= 0 &&
      boss.chargeTimeLeft <= 0 &&
      boss.attackLockLeft <= 0
    ) {
      if (distToPlayer > CONFIG.bossMinVolleyDistance) {
        queueBossVolley(boss, player, boss.phase);
        boss.attackLockLeft = Math.max(
          boss.attackLockLeft,
          CONFIG.bossAttackLock + CONFIG.bossProjectileTelegraph * 0.35
        );
        boss.chargeCooldown = Math.max(boss.chargeCooldown, 1.35);
        boss.projectileCooldown =
          boss.phase === 2
            ? rand(CONFIG.bossProjectileCooldownMin, CONFIG.bossProjectileCooldownMax)
            : rand(CONFIG.bossProjectileCooldownMin * 0.82, CONFIG.bossProjectileCooldownMax * 0.84);
      } else {
        boss.projectileCooldown = 0.55;
      }
    }

    if (
      boss.spawnMinionTimer <= 0 &&
      state.enemies.length < CONFIG.enemyMax &&
      state.bossTelegraphs.length < 9 &&
      state.bossProjectiles.length < 12
    ) {
      const spawned = spawnBossMinion(boss, player);
      if (spawned) {
        state.enemies.push(spawned);
        boss.spawnMinionTimer = phaseCfg.minionEvery;
      }
    }
  }

  function spawnBossMinion(boss, player) {
    for (let i = 0; i < 24; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const radius = rand(56, 95);
      const x = boss.x + Math.cos(angle) * radius;
      const y = boss.y + Math.sin(angle) * radius;

      if (x < 24 || x > CONFIG.width - 24 || y < 24 || y > CONFIG.height - 24) {
        continue;
      }
      if (circleHitsAnyObstacle(x, y, 14)) {
        continue;
      }
      if (Math.hypot(x - player.x, y - player.y) < 130) {
        continue;
      }

      return buildEnemy(x, y, "lancer");
    }
    return null;
  }

  function queueBossVolley(boss, player, phase) {
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const baseAngle = Math.atan2(ny, nx);
    const pattern = boss.volleyPattern % 2 === 0 ? "fan" : "sweep";
    boss.volleyPattern = (boss.volleyPattern + 1) % 2;
    const speed = CONFIG.bossProjectileSpeed * (phase === 2 ? 1 : 1.08);

    if (pattern === "fan") {
      const lines = phase === 2 ? 3 : 4;
      const spread = phase === 2 ? 0.52 : 0.72;
      for (let i = 0; i < lines; i += 1) {
        const t = lines === 1 ? 0.5 : i / (lines - 1);
        const offset = -spread * 0.5 + spread * t;
        const a = baseAngle + offset;
        queueBossTelegraph(boss, a, speed, {
          kind: "fan",
          opensRecover: i === lines - 1,
          recoverDuration: CONFIG.bossVolleyRecover,
        });
      }
      showBossCallout("Salve eventail", 0.82, "warn");
    } else {
      const lines = phase === 2 ? 4 : 6;
      const spread = phase === 2 ? 1.05 : 1.28;
      for (let i = 0; i < lines; i += 1) {
        const t = lines === 1 ? 0.5 : i / (lines - 1);
        const offset = -spread * 0.5 + spread * t;
        const wave = phase === 3 ? Math.sin(i * 0.7) * 0.08 : 0;
        const a = baseAngle + offset + wave;
        queueBossTelegraph(boss, a, speed * (phase === 2 ? 1 : 1.03), {
          kind: "sweep",
          delay: i * CONFIG.bossSweepStepDelay,
          opensRecover: i === lines - 1,
          recoverDuration: CONFIG.bossVolleyRecover * 0.95,
        });
      }
      showBossCallout("Salve balayage", 0.92, "warn");
    }

    addImpactRing(boss.x, boss.y, [244, 210, 255], 150, 0.3, 2.2);
    playSfx("bossAim");
  }

  function queueBossTelegraph(boss, angle, speed, options = null) {
    const opt = options || {};
    const delay = Math.max(0, Number(opt.delay) || 0);
    state.bossTelegraphs.push({
      x: boss.x,
      y: boss.y,
      angle,
      speed,
      kind: opt.kind || "fan",
      delay,
      maxDelay: delay,
      life: CONFIG.bossProjectileTelegraph,
      maxLife: CONFIG.bossProjectileTelegraph,
      radius: CONFIG.bossProjectileRadius,
      opensRecover: !!opt.opensRecover,
      recoverDuration: Math.max(0.2, Number(opt.recoverDuration) || CONFIG.bossVolleyRecover),
    });
    if (state.bossTelegraphs.length > 28) {
      state.bossTelegraphs.splice(0, state.bossTelegraphs.length - 28);
    }
  }

  function updateBossTelegraphs(dt) {
    for (let i = state.bossTelegraphs.length - 1; i >= 0; i -= 1) {
      const telegraph = state.bossTelegraphs[i];
      if (telegraph.delay > 0) {
        telegraph.delay = Math.max(0, telegraph.delay - dt);
        continue;
      }

      telegraph.life -= dt;
      if (telegraph.life > 0) {
        continue;
      }

      const vx = Math.cos(telegraph.angle) * telegraph.speed;
      const vy = Math.sin(telegraph.angle) * telegraph.speed;
      state.bossProjectiles.push({
        x: telegraph.x,
        y: telegraph.y,
        vx,
        vy,
        kind: telegraph.kind || "fan",
        r: telegraph.radius,
        life: CONFIG.bossProjectileLife,
        nearMissed: false,
      });
      state.bossTelegraphs.splice(i, 1);
      playSfx("bossShot");
      addImpactRing(
        telegraph.x,
        telegraph.y,
        telegraph.kind === "sweep" ? [255, 204, 176] : [247, 208, 255],
        110,
        0.24,
        2
      );

      if (telegraph.opensRecover && state.miniBoss) {
        state.miniBoss.volleyRecoverLeft = Math.max(
          state.miniBoss.volleyRecoverLeft || 0,
          telegraph.recoverDuration
        );
        state.miniBoss.stunLeft = Math.max(state.miniBoss.stunLeft || 0, 0.24);
        state.miniBoss.attackLockLeft = Math.max(state.miniBoss.attackLockLeft || 0, 0.16);
        addImpactRing(state.miniBoss.x, state.miniBoss.y, [155, 248, 210], 180, 0.32, 2.6);
        showBossCallout("Fenetre dash", 0.75, "good");
        playSfx("bossOpen");
      }
    }
  }

  function updateBossProjectiles(dt, player) {
    for (let i = state.bossProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.bossProjectiles[i];
      projectile.life -= dt;
      if (projectile.life <= 0) {
        state.bossProjectiles.splice(i, 1);
        continue;
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      emitParticles(projectile.x, projectile.y, [255, 210, 250], 1, 20, 0.14, 1.3);

      const out =
        projectile.x < -20 ||
        projectile.x > CONFIG.width + 20 ||
        projectile.y < -20 ||
        projectile.y > CONFIG.height + 20;
      if (out || circleHitsAnyObstacle(projectile.x, projectile.y, projectile.r)) {
        state.bossProjectiles.splice(i, 1);
        continue;
      }

      maybeAwardNearMiss(player, projectile);

      if (state.player && player.invuln <= 0 && circlesOverlap(projectile, player)) {
        if (absorbShieldHit(player, projectile.x, projectile.y)) {
          state.bossProjectiles.splice(i, 1);
          continue;
        }

        player.lives -= 1;
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

    if (state.bossProjectiles.length > 80) {
      state.bossProjectiles.splice(0, state.bossProjectiles.length - 80);
    }
  }

  function maybeTriggerCheckpoint(player) {
    if (state.elapsed < state.nextCheckpointAt) {
      return;
    }

    state.nextCheckpointAt += CONFIG.checkpointEverySeconds;

    if (player.lives < CONFIG.playerMaxLives) {
      player.lives += 1;
    }
    player.invuln = Math.max(player.invuln, 0.4);
    state.score += CONFIG.checkpointScoreBonus;
    state.flashTimer = 0.2;

    const radius = CONFIG.checkpointPulseRadius;
    for (const enemy of state.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      if (dist > radius) {
        continue;
      }

      const push = (radius - dist) * 1.2 + 12;
      enemy.x += (dx / dist) * push;
      enemy.y += (dy / dist) * push;
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.45);
    }

    for (let i = state.bossProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.bossProjectiles[i];
      const pd = Math.hypot(projectile.x - player.x, projectile.y - player.y);
      if (pd < radius + 16) {
        state.bossProjectiles.splice(i, 1);
      }
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

    if (
      !state.aegisOrb &&
      player.shieldHits < CONFIG.shieldMaxHits &&
      state.elapsed >= CONFIG.bossSpawnAt - 2
    ) {
      state.aegisOrb = spawnAegisOrb(player);
    }

    emitParticles(player.x, player.y, [162, 239, 255], 34, 260, 0.78, 3.4);
    addImpactRing(player.x, player.y, [166, 235, 255], 250, 0.46, 3);
    triggerShake(0.2, 2.6);
    playSfx("checkpoint");
  }

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
    if (moveMag > 1) {
      player.moveX /= moveMag;
      player.moveY /= moveMag;
    }

    if (hasInput && moveMag > 0.06) {
      player.lastMoveX = player.moveX / moveMag;
      player.lastMoveY = player.moveY / moveMag;
    }

    const speed = CONFIG.playerSpeed * (player.dashTimeLeft > 0 ? CONFIG.dashBoost : 1);
    let moveX = player.moveX;
    let moveY = player.moveY;
    if (!hasInput && player.dashTimeLeft > 0) {
      moveX = player.lastMoveX;
      moveY = player.lastMoveY;
    }
    moveCircleWithCollisions(player, moveX * speed * dt, moveY * speed * dt);

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

    const earlyEase = 0.62 + Math.min(state.elapsed / 36, 1) * 0.38;

    for (const enemy of state.enemies) {
      enemy.stunLeft = Math.max(0, enemy.stunLeft - dt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx, dy));

      let dirX = dx / dist;
      let dirY = dy / dist;
      let speedMultiplier = 1;

      if (enemy.type === "drifter") {
        const perpX = -dirY;
        const perpY = dirX;
        const sway = Math.sin(state.elapsed * 2.7 + enemy.phase) * 0.7;
        dirX += perpX * sway;
        dirY += perpY * sway;
        const n = Math.hypot(dirX, dirY) || 1;
        dirX /= n;
        dirY /= n;
      }

      if (enemy.type === "lancer") {
        enemy.lanceCooldown = Math.max(0, (enemy.lanceCooldown || 0) - dt);
        enemy.lanceWindup = Math.max(0, (enemy.lanceWindup || 0) - dt);
        enemy.lanceTime = Math.max(0, (enemy.lanceTime || 0) - dt);

        if (enemy.lanceWindup > 0) {
          speedMultiplier = 0.28;
          enemy.lanceAimX = dx / dist;
          enemy.lanceAimY = dy / dist;
          if (enemy.lanceWindup <= 0.02) {
            enemy.lanceTime = 0.28;
            enemy.lanceDirX = enemy.lanceAimX || dx / dist;
            enemy.lanceDirY = enemy.lanceAimY || dy / dist;
          }
        } else if (enemy.lanceTime > 0) {
          dirX = enemy.lanceDirX || dirX;
          dirY = enemy.lanceDirY || dirY;
          speedMultiplier = 2.42;
        } else {
          if (enemy.lanceCooldown <= 0 && dist > 120 && dist < 340) {
            const windup = rand(0.34, 0.52);
            enemy.lanceWindup = windup;
            enemy.lanceWindupMax = windup;
            enemy.lanceAimX = dx / dist;
            enemy.lanceAimY = dy / dist;
            enemy.lanceCooldown = rand(4.4, 6.8);
          }

          const desiredDist = 185;
          const pull = (dist - desiredDist) * 0.008;
          const perpX = -dirY;
          const perpY = dirX;
          dirX = dirX * pull + perpX * 0.9;
          dirY = dirY * pull + perpY * 0.9;
          const n = Math.hypot(dirX, dirY) || 1;
          dirX /= n;
          dirY /= n;
          speedMultiplier = 0.92;
        }
      }

      if (enemy.type === "wisp") {
        enemy.wispBurstCooldown = Math.max(0, (enemy.wispBurstCooldown || 0) - dt);
        enemy.wispBurstWindup = Math.max(0, (enemy.wispBurstWindup || 0) - dt);
        enemy.wispBurstTime = Math.max(0, (enemy.wispBurstTime || 0) - dt);

        if (enemy.wispBurstWindup > 0) {
          speedMultiplier = 0.14;
          enemy.wispDirX = dx / dist;
          enemy.wispDirY = dy / dist;
          if (enemy.wispBurstWindup <= 0.02) {
            enemy.wispBurstTime = 0.2;
            enemy.wispDirX = dx / dist;
            enemy.wispDirY = dy / dist;
            addImpactRing(enemy.x, enemy.y, [166, 232, 255], 90, 0.2, 1.7);
          }
        } else if (enemy.wispBurstTime > 0) {
          dirX = enemy.wispDirX || dirX;
          dirY = enemy.wispDirY || dirY;
          speedMultiplier = CONFIG.wispBurstSpeedMul;
        } else {
          if (enemy.wispBurstCooldown <= 0 && dist > 140 && dist < 430) {
            const windup = rand(CONFIG.wispBurstWindupMin, CONFIG.wispBurstWindupMax);
            enemy.wispBurstWindup = windup;
            enemy.wispBurstWindupMax = windup;
            enemy.wispBurstCooldown = rand(CONFIG.wispBurstCooldownMin, CONFIG.wispBurstCooldownMax);
            enemy.wispDirX = dx / dist;
            enemy.wispDirY = dy / dist;
          }

          const desiredDist = 242;
          const pull = (dist - desiredDist) * 0.007;
          const perpX = -dirY;
          const perpY = dirX;
          const wobble = Math.sin(state.elapsed * 3.6 + enemy.phase * 1.8) * 0.5;
          dirX = dirX * pull + perpX * (1.02 + wobble * 0.35);
          dirY = dirY * pull + perpY * (1.02 + wobble * 0.35);
          const n = Math.hypot(dirX, dirY) || 1;
          dirX /= n;
          dirY /= n;
          speedMultiplier = 0.94;
        }
      }

      const baseSpeed = enemy.baseSpeed * state.difficulty * earlyEase;
      const speed = enemy.stunLeft > 0 ? baseSpeed * 0.2 : baseSpeed * speedMultiplier;

      moveCircleWithCollisions(enemy, dirX * speed * dt, dirY * speed * dt);
    }
  }

  function refreshComboMultiplier() {
    state.comboMultiplier = clamp(
      1 + Math.max(0, state.comboCount - 1) * CONFIG.comboStepMultiplier,
      1,
      CONFIG.comboMaxMultiplier
    );
  }

  function pushCombo(amount = 1) {
    state.comboCount = Math.max(1, state.comboCount + amount);
    state.comboTimer = Math.max(state.comboTimer, CONFIG.comboWindow);
    refreshComboMultiplier();
  }

  function breakCombo() {
    state.comboCount = 0;
    state.comboTimer = 0;
    state.comboMultiplier = 1;
  }

  function softenComboOnShield() {
    if (state.comboCount <= 0) {
      return;
    }
    state.comboCount = Math.max(0, state.comboCount - 1);
    state.comboTimer = Math.max(0, state.comboTimer - 0.8);
    if (state.comboCount <= 0 || state.comboTimer <= 0) {
      breakCombo();
      return;
    }
    refreshComboMultiplier();
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
    pushCombo(1);
    const relicScore = Math.floor(CONFIG.scorePerRelic * state.comboMultiplier);
    state.score += relicScore;
    state.flashTimer = 0.22;

    emitParticles(state.relic.x, state.relic.y, [145, 245, 187], 18, 170, 0.6, 3);
    triggerShake(0.18, 1.7);
    addFloatingText(state.relic.x, state.relic.y - 10, `+${relicScore}`, [167, 255, 200], 0.88, 17);
    if (state.comboCount >= 2) {
      addFloatingText(
        player.x,
        player.y - 28,
        `x${state.comboMultiplier.toFixed(2)}`,
        [194, 241, 255],
        0.56,
        14
      );
    }
    playSfx("relic");

    state.relic = spawnRelic(player);

    if (
      state.relics % CONFIG.healEveryRelics === 0 &&
      player.lives < CONFIG.playerMaxLives &&
      !state.healOrb
    ) {
      state.healOrb = spawnHealOrb(player);
    }

    if (
      state.relics % CONFIG.aegisEveryRelics === 0 &&
      player.shieldHits < CONFIG.shieldMaxHits &&
      !state.aegisOrb
    ) {
      state.aegisOrb = spawnAegisOrb(player);
    }
  }

  function maybeCollectHeal(player) {
    if (!state.healOrb) {
      return;
    }

    if (!circlesOverlapRadius(player, state.healOrb, player.r + state.healOrb.r + 8)) {
      return;
    }

    player.lives = Math.min(CONFIG.playerMaxLives, player.lives + 1);
    state.score += CONFIG.scorePerHeal;
    emitParticles(state.healOrb.x, state.healOrb.y, [152, 255, 168], 24, 210, 0.65, 3);
    addFloatingText(state.healOrb.x, state.healOrb.y - 8, "SOIN", [178, 255, 188], 0.72, 14);
    state.healOrb = null;
    playSfx("heal");
  }

  function maybeCollectAegis(player) {
    if (!state.aegisOrb) {
      return;
    }

    if (!circlesOverlapRadius(player, state.aegisOrb, player.r + state.aegisOrb.r + 8)) {
      return;
    }

    player.shieldHits = Math.min(CONFIG.shieldMaxHits, (player.shieldHits || 0) + 1);
    state.score += 70;
    emitParticles(state.aegisOrb.x, state.aegisOrb.y, [173, 246, 255], 22, 220, 0.64, 2.9);
    addImpactRing(state.aegisOrb.x, state.aegisOrb.y, [162, 240, 255], 170, 0.36, 2.4);
    addFloatingText(state.aegisOrb.x, state.aegisOrb.y - 10, "AEGIS", [184, 247, 255], 0.78, 14);
    state.aegisOrb = null;
    playSfx("shieldGain");
  }

  function absorbShieldHit(player, sourceX, sourceY) {
    if ((player.shieldHits || 0) <= 0) {
      return false;
    }

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
      const dx = sourceX - player.x;
      const dy = sourceY - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      moveCircleWithCollisions(player, -(dx / dist) * 20, -(dy / dist) * 20);
    }
    return true;
  }

  function maybeAwardNearMiss(player, projectile) {
    if (!player || player.invuln > 0 || projectile.nearMissed) {
      return;
    }

    const dx = player.x - projectile.x;
    const dy = player.y - projectile.y;
    const dist = Math.hypot(dx, dy);
    const safe = player.r + projectile.r + 2;
    const near = player.r + projectile.r + CONFIG.nearMissRadius;
    if (dist <= safe || dist > near) {
      return;
    }

    projectile.nearMissed = true;
    pushCombo(0.45);
    const bonus = Math.floor(CONFIG.nearMissBonus * state.comboMultiplier);
    state.score += bonus;
    addImpactRing(player.x, player.y, [188, 225, 255], 120, 0.24, 1.8);
    addFloatingText(player.x, player.y - 18, `NEAR +${bonus}`, [184, 232, 255], 0.5, 12);
    playSfx("nearMiss");
  }

  function maybeTakeDamage(player) {
    let hit = false;

    for (const enemy of state.enemies) {
      if (!circlesOverlap(player, enemy) || player.invuln > 0) {
        continue;
      }

      if (absorbShieldHit(player, enemy.x, enemy.y)) {
        const bdx = enemy.x - player.x;
        const bdy = enemy.y - player.y;
        const bdist = Math.max(0.1, Math.hypot(bdx, bdy));
        enemy.x += (bdx / bdist) * 56;
        enemy.y += (bdy / bdist) * 56;
        enemy.stunLeft = Math.max(enemy.stunLeft, 0.46);
        clampToBounds(enemy);
        resolveObstacleOverlap(enemy);
        continue;
      }

      player.lives -= 1;
      player.invuln = CONFIG.hitInvulnerability;
      state.flashTimer = 0.35;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      enemy.x += (dx / dist) * 52;
      enemy.y += (dy / dist) * 52;
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.38);
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);

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
        const bdx = boss.x - player.x;
        const bdy = boss.y - player.y;
        const bdist = Math.max(0.1, Math.hypot(bdx, bdy));
        boss.x += (bdx / bdist) * 54;
        boss.y += (bdy / bdist) * 54;
        boss.stunLeft = Math.max(boss.stunLeft, 0.34);
        clampToBounds(boss);
        resolveObstacleOverlap(boss);
      } else {
      player.lives -= 1;
      player.invuln = CONFIG.hitInvulnerability;
      state.flashTimer = 0.35;

      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      boss.x += (dx / dist) * 62;
      boss.y += (dy / dist) * 62;
      boss.stunLeft = Math.max(boss.stunLeft, 0.28);
      clampToBounds(boss);
      resolveObstacleOverlap(boss);

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

    if (hit) {
      playSfx("hit");
    }
  }

  function tryDash() {
    if (!state.running || !state.player || state.finished || state.paused) {
      return false;
    }

    const player = state.player;
    if (player.dashCooldownLeft > 0 || player.dashTimeLeft > 0) {
      return false;
    }

    player.dashTimeLeft = CONFIG.dashDuration;
    player.dashCooldownLeft = CONFIG.dashCooldown;
    player.invuln = Math.max(player.invuln, CONFIG.dashInvuln);

    if (Math.hypot(player.lastMoveX, player.lastMoveY) < 0.1) {
      player.lastMoveX = 1;
      player.lastMoveY = 0;
    }

    applyDashPulse(player);
    emitParticles(player.x, player.y, [127, 226, 255], 14, 180, 0.4, 2);
    addImpactRing(player.x, player.y, [131, 226, 255], 150, 0.28, 2.4);
    triggerShake(0.16, 1.6);
    playSfx("dash");
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

      const push = (CONFIG.dashShockRadius - dist) * 1.2 + 8;
      enemy.x += (dx / dist) * push;
      enemy.y += (dy / dist) * push;
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.42);

      emitParticles(enemy.x, enemy.y, [215, 241, 255], 4, 75, 0.24, 2);
      addImpactRing(enemy.x, enemy.y, [215, 241, 255], 95, 0.2, 1.8);
    }

    for (let i = state.bossProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.bossProjectiles[i];
      const dx = projectile.x - player.x;
      const dy = projectile.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= CONFIG.dashShockRadius + 10) {
        addImpactRing(projectile.x, projectile.y, [214, 241, 255], 90, 0.18, 1.8);
        state.bossProjectiles.splice(i, 1);
      }
    }

    const boss = state.miniBoss;
    if (boss) {
      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist <= CONFIG.dashShockRadius + 24) {
        const bonusWindow = (boss.volleyRecoverLeft || 0) > 0;
        const hitDamage = bonusWindow ? 2 : 1;
        const push = (CONFIG.dashShockRadius + 24 - dist) * 0.95 + 12;
        boss.x += (dx / dist) * push;
        boss.y += (dy / dist) * push;
        boss.stunLeft = Math.max(boss.stunLeft, 0.5);
        boss.health -= hitDamage;
        state.score += CONFIG.bossHitScore * hitDamage;
        if (bonusWindow) {
          boss.volleyRecoverLeft = 0;
        }
        pushCombo(bonusWindow ? 1.8 : 0.8);

        clampToBounds(boss);
        resolveObstacleOverlap(boss);
        emitParticles(boss.x, boss.y, [232, 175, 255], 16, 180, 0.58, 3);
        addImpactRing(boss.x, boss.y, [236, 179, 255], 175, 0.34, 3);
        if (bonusWindow) {
          emitParticles(boss.x, boss.y, [180, 255, 220], 18, 220, 0.46, 2.8);
          addImpactRing(boss.x, boss.y, [170, 255, 220], 210, 0.36, 3);
          triggerShake(0.22, 2.8);
          triggerHitStop(0.04);
          showBossCallout("Armure brisee", 0.7, "good");
          playSfx("bossBreak");
        } else {
          triggerShake(0.18, 2.4);
          triggerHitStop(0.025);
          playSfx("bossHit");
        }
        state.chromaPulse = Math.max(state.chromaPulse, 0.22);

        if (boss.health <= 0) {
          defeatMiniBoss(player);
        }
      }
    }
  }

  function defeatMiniBoss(player) {
    if (!state.miniBoss) {
      return;
    }

    const boss = state.miniBoss;
    state.score += CONFIG.bossDefeatScore;
    state.flashTimer = 0.36;
    emitParticles(boss.x, boss.y, [245, 187, 255], 64, 340, 1, 4.2);
    addImpactRing(boss.x, boss.y, [245, 187, 255], 320, 0.68, 4.2);
    triggerShake(0.45, 5.2);
    triggerHitStop(0.06);
    state.chromaPulse = Math.max(state.chromaPulse, 0.42);
    showBossCallout("Boss neutralise", 1.2, "good");
    playSfx("bossDefeat");

    // Reward: small arena reset when boss falls.
    if (state.enemies.length > 2) {
      state.enemies.sort(
        (a, b) =>
          Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y)
      );
      state.enemies.splice(0, Math.min(3, state.enemies.length));
    }

    if (player.lives < CONFIG.playerMaxLives) {
      player.lives += 1;
    }

    if (player.shieldHits < CONFIG.shieldMaxHits) {
      player.shieldHits += 1;
      addFloatingText(player.x, player.y - 22, "AEGIS +1", [182, 247, 255], 0.9, 15);
    }

    if (!state.healOrb) {
      state.healOrb = spawnHealOrb(player);
    }

    state.miniBoss = null;
    state.bossIntroTimer = 0;
  }

  function spawnEnemy(player, relic) {
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

      if (circleHitsAnyObstacle(point.x, point.y, 16)) {
        continue;
      }

      return buildEnemy(point.x, point.y);
    }

    const fallback = randomEdgePoint(Math.floor(Math.random() * 4));
    return buildEnemy(fallback.x, fallback.y);
  }

  function buildEnemy(x, y, forcedType = null) {
    let type = forcedType;
    if (!type) {
      const lancerCount = state.enemies.reduce((count, enemy) => count + (enemy.type === "lancer" ? 1 : 0), 0);
      const wispCount = state.enemies.reduce((count, enemy) => count + (enemy.type === "wisp" ? 1 : 0), 0);
      const lancerChance = clamp(
        (state.difficulty - 0.95) * 0.18 + state.elapsed * 0.0014,
        0.03,
        0.2
      );
      const wispChance = clamp(
        (state.elapsed - CONFIG.wispMinSpawnTime) * 0.006 + (state.difficulty - 1) * 0.18,
        0,
        0.1
      );
      const drifterChance = clamp((state.difficulty - 0.95) * 0.26, 0.05, 0.3);
      const roll = Math.random();
      if (roll < wispChance && wispCount < CONFIG.wispMaxActive) {
        type = "wisp";
      } else if (roll < wispChance + lancerChance && lancerCount < 2) {
        type = "lancer";
      } else if (roll < wispChance + lancerChance + drifterChance) {
        type = "drifter";
      } else {
        type = "stalker";
      }
    }

    const style = ENEMY_STYLES[type] || ENEMY_STYLES.stalker;
    return {
      type,
      x,
      y,
      r: style.radius,
      baseSpeed:
        type === "wisp"
          ? rand(56, 78)
          : type === "lancer"
          ? rand(54, 72)
          : type === "drifter"
            ? rand(66, 90)
            : rand(60, 96),
      phase: rand(0, Math.PI * 2),
      stunLeft: 0,
      lanceCooldown: rand(2.8, 4.2),
      lanceWindup: 0,
      lanceWindupMax: 0,
      lanceTime: 0,
      lanceDirX: 0,
      lanceDirY: 0,
      lanceAimX: 1,
      lanceAimY: 0,
      wispBurstCooldown: rand(CONFIG.wispBurstCooldownMin, CONFIG.wispBurstCooldownMax),
      wispBurstWindup: 0,
      wispBurstWindupMax: 0,
      wispBurstTime: 0,
      wispDirX: 0,
      wispDirY: 0,
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

  function spawnRelic(player) {
    for (let i = 0; i < 260; i += 1) {
      const candidate = {
        x: rand(44, CONFIG.width - 44),
        y: rand(44, CONFIG.height - 44),
        r: CONFIG.relicRadius,
      };

      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) {
        continue;
      }

      if (player) {
        const fromPlayer = Math.hypot(candidate.x - player.x, candidate.y - player.y);
        if (fromPlayer < CONFIG.relicSafeFromPlayer) {
          continue;
        }
      }

      let tooCloseToEnemy = false;
      for (const enemy of state.enemies) {
        if (Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) < CONFIG.relicSafeFromEnemy) {
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

  function spawnHealOrb(player) {
    for (let i = 0; i < 220; i += 1) {
      const candidate = {
        x: rand(42, CONFIG.width - 42),
        y: rand(42, CONFIG.height - 42),
        r: CONFIG.healRadius,
      };

      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) {
        continue;
      }

      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 120) {
        continue;
      }

      return candidate;
    }

    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.healRadius };
  }

  function spawnAegisOrb(player) {
    for (let i = 0; i < 220; i += 1) {
      const candidate = {
        x: rand(42, CONFIG.width - 42),
        y: rand(42, CONFIG.height - 42),
        r: CONFIG.aegisRadius,
      };

      if (circleHitsAnyObstacle(candidate.x, candidate.y, candidate.r)) {
        continue;
      }

      if (Math.hypot(candidate.x - player.x, candidate.y - player.y) < 130) {
        continue;
      }

      if (state.relic && Math.hypot(candidate.x - state.relic.x, candidate.y - state.relic.y) < 74) {
        continue;
      }

      if (state.healOrb && Math.hypot(candidate.x - state.healOrb.x, candidate.y - state.healOrb.y) < 74) {
        continue;
      }

      return candidate;
    }

    return { x: CONFIG.width * 0.5, y: CONFIG.height * 0.5, r: CONFIG.aegisRadius };
  }

  function computeDifficulty() {
    const timeRamp = clamp(state.elapsed / CONFIG.objectiveSeconds, 0, 1);
    const relicRamp = clamp(state.relics / 14, 0, 1);
    const bossRamp = state.miniBoss ? 0.12 : 0;
    const player = state.player;
    const livesRatio = player ? clamp(player.lives / CONFIG.playerMaxLives, 0, 1) : 1;
    const shieldBoost = player ? (player.shieldHits || 0) * 0.02 : 0;
    const mercy = clamp((0.42 - livesRatio) * 0.28, 0, 0.18);
    const d = 0.8 + timeRamp * 0.44 + relicRamp * 0.18 + bossRamp + shieldBoost - mercy;
    return clamp(d, 0.78, 1.62);
  }

  function currentSpawnInterval() {
    const player = state.player;
    const pressureEase =
      player && player.lives <= 1 ? 1.4 : player && player.lives <= 2 ? 0.8 : 0;
    const interval = CONFIG.enemySpawnBaseInterval - state.elapsed * 0.022 - state.relics * 0.07 + pressureEase;
    return Math.max(CONFIG.enemySpawnMinInterval, interval);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.97;
      particle.vy *= 0.97;
    }
  }

  function addFloatingText(x, y, text, rgb = [230, 245, 255], life = CONFIG.floatingTextLife, size = 13) {
    state.floatingTexts.push({
      x,
      y,
      text,
      life,
      maxLife: life,
      size,
      rgb,
      vy: -26,
    });
    if (state.floatingTexts.length > 60) {
      state.floatingTexts.splice(0, state.floatingTexts.length - 60);
    }
  }

  function updateFloatingTexts(dt) {
    for (let i = state.floatingTexts.length - 1; i >= 0; i -= 1) {
      const item = state.floatingTexts[i];
      item.life -= dt;
      if (item.life <= 0) {
        state.floatingTexts.splice(i, 1);
        continue;
      }
      item.y += item.vy * dt;
      item.vy *= 0.96;
    }
  }

  function updateTrails(dt, player) {
    if (player && !state.reducedFx) {
      state.trails.push({
        x: player.x,
        y: player.y,
        r: player.r,
        life: 0.26,
      });
    }

    for (let i = state.trails.length - 1; i >= 0; i -= 1) {
      state.trails[i].life -= dt;
      if (state.trails[i].life <= 0) {
        state.trails.splice(i, 1);
      }
    }

    const maxTrails = state.reducedFx ? 0 : 120;
    if (state.trails.length > maxTrails) {
      state.trails.splice(0, state.trails.length - maxTrails);
    }
  }

  function emitParticles(x, y, rgb, count, speed, life, size) {
    const spawnCount = state.reducedFx ? Math.max(1, Math.floor(count * 0.45)) : count;
    for (let i = 0; i < spawnCount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (state.reducedFx ? 0.78 : 1) * (0.35 + Math.random() * 0.9);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.72 + Math.random() * 0.62),
        maxLife: life,
        size: size * (0.72 + Math.random() * 0.8),
        rgb,
      });
    }
  }

  function addImpactRing(x, y, rgb, maxRadius = CONFIG.impactRingMax, life = CONFIG.impactRingLife, width = 2) {
    state.impactRings.push({
      x,
      y,
      rgb,
      radius: 10,
      maxRadius,
      life,
      maxLife: life,
      width,
    });
    if (state.impactRings.length > 80) {
      state.impactRings.splice(0, state.impactRings.length - 80);
    }
  }

  function updateImpactRings(dt) {
    for (let i = state.impactRings.length - 1; i >= 0; i -= 1) {
      const ring = state.impactRings[i];
      ring.life -= dt;
      if (ring.life <= 0) {
        state.impactRings.splice(i, 1);
        continue;
      }
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

    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.max(0.1, Math.hypot(dx, dy));
    if (dist < 210) {
      const push = (210 - dist) * 0.7;
      moveCircleWithCollisions(player, (dx / dist) * push, (dy / dist) * push);
      if (dist < 82 && player.invuln <= 0) {
        if (!absorbShieldHit(player, boss.x, boss.y)) {
          player.lives -= 1;
          player.invuln = Math.max(player.invuln, 0.9);
          state.flashTimer = Math.max(state.flashTimer, 0.28);
          state.hurtOverlay = Math.max(state.hurtOverlay, 0.46);
          triggerHitStop(0.035);
          breakCombo();
        }
      }
    }

    for (const enemy of state.enemies) {
      const ex = enemy.x - boss.x;
      const ey = enemy.y - boss.y;
      const ed = Math.max(0.1, Math.hypot(ex, ey));
      if (ed > 180) {
        continue;
      }
      const push = (180 - ed) * 0.9;
      enemy.x += (ex / ed) * push;
      enemy.y += (ey / ed) * push;
      clampToBounds(enemy);
      resolveObstacleOverlap(enemy);
      enemy.stunLeft = Math.max(enemy.stunLeft, 0.3);
    }

    for (let i = state.bossProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = state.bossProjectiles[i];
      const pd = Math.hypot(projectile.x - boss.x, projectile.y - boss.y);
      if (pd < 120) {
        state.bossProjectiles.splice(i, 1);
      }
    }
  }

  function triggerShake(duration, power) {
    state.shakeTime = Math.max(state.shakeTime, duration);
    state.shakePower = Math.max(state.shakePower, power);
  }

  function triggerHitStop(duration) {
    state.hitStopLeft = Math.max(state.hitStopLeft, duration);
  }

  function showBossCallout(text, duration = 0.9, tone = "warn") {
    state.bossCalloutText = text;
    state.bossCalloutTone = tone;
    state.bossCalloutTimer = Math.max(state.bossCalloutTimer, duration);
  }

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
    drawMiniBoss();
    drawBossTelegraphs();
    if (!state.reducedFx) {
      drawTrails();
    }
    drawEnemies();
    drawBossProjectiles();
    drawPlayer(player);
    drawImpactRings();
    drawParticles();
    drawFloatingTexts();
    drawWorldTimer();
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

    drawDamageVignette();

    if (state.paused) {
      ctx.fillStyle = "#00000080";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      ctx.fillStyle = "#e8f8ff";
      ctx.font = "700 44px Verdana, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pause", CONFIG.width / 2, CONFIG.height / 2);
    }

    ctx.restore();
  }

  function drawDamageVignette() {
    if (state.hurtOverlay <= 0) {
      return;
    }

    const p = clamp(state.hurtOverlay, 0, 1);
    const centerX = CONFIG.width * 0.5;
    const centerY = CONFIG.height * 0.5;
    const inner = Math.min(CONFIG.width, CONFIG.height) * (0.18 + p * 0.05);
    const outer = Math.max(CONFIG.width, CONFIG.height) * 0.7;
    const vignette = ctx.createRadialGradient(centerX, centerY, inner, centerX, centerY, outer);
    vignette.addColorStop(0, `rgba(255, 100, 150, ${0.02 + p * 0.03})`);
    vignette.addColorStop(1, `rgba(255, 60, 120, ${0.17 + p * 0.16})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    g.addColorStop(0, "#040c1d");
    g.addColorStop(0.45, "#0a1b34");
    g.addColorStop(1, "#0d2b45");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    for (const star of state.stars) {
      const x = (star.x - state.elapsed * star.speed + CONFIG.width * 4) % CONFIG.width;
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(state.elapsed * 2 + star.phase));
      ctx.fillStyle = `rgba(174, 231, 255, ${0.28 * tw})`;
      ctx.fillRect(x, star.y, star.size, star.size);
    }

    ctx.fillStyle = "rgba(87, 161, 227, 0.11)";
    ctx.beginPath();
    ctx.ellipse(190, 98, 245, 74, 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(760, 456, 332, 104, 0.08, 0, Math.PI * 2);
    ctx.fill();

    if (!state.reducedFx) {
      // Atmospheric lanes to break the flat grid and improve movement readability.
      const laneShift = state.elapsed * 46;
      for (let i = 0; i < 3; i += 1) {
        const y = 86 + i * 160 + Math.sin(state.elapsed * (1.4 + i * 0.3)) * 8;
        const lane = ctx.createLinearGradient(0, y - 22, CONFIG.width, y + 22);
        lane.addColorStop(0, "rgba(104, 175, 232, 0)");
        lane.addColorStop(0.25, "rgba(104, 175, 232, 0.08)");
        lane.addColorStop(0.75, "rgba(101, 199, 226, 0.09)");
        lane.addColorStop(1, "rgba(104, 175, 232, 0)");
        ctx.fillStyle = lane;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= CONFIG.width; x += 32) {
          const wave = Math.sin((x + laneShift * (0.4 + i * 0.2)) * 0.01 + i * 1.2) * 10;
          ctx.lineTo(x, y + wave);
        }
        ctx.lineTo(CONFIG.width, y + 42);
        ctx.lineTo(0, y + 42);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(123, 190, 238, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CONFIG.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, CONFIG.height);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(CONFIG.width, y + 0.5);
      ctx.stroke();
    }
  }

  function drawObstacles() {
    for (const obstacle of OBSTACLES) {
      const og = ctx.createLinearGradient(
        obstacle.x,
        obstacle.y,
        obstacle.x,
        obstacle.y + obstacle.h
      );
      og.addColorStop(0, "#2a4466f2");
      og.addColorStop(1, "#1a2f4af2");
      ctx.fillStyle = og;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);

      ctx.strokeStyle = "#9bdcff5a";
      ctx.lineWidth = 1;
      ctx.strokeRect(obstacle.x + 0.5, obstacle.y + 0.5, obstacle.w - 1, obstacle.h - 1);

      ctx.fillStyle = "rgba(214, 241, 255, 0.08)";
      ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.w - 4, Math.max(2, obstacle.h * 0.32));

      ctx.strokeStyle = "rgba(23, 57, 90, 0.5)";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + 10, obstacle.y + obstacle.h - 5);
      ctx.lineTo(obstacle.x + obstacle.w * 0.44, obstacle.y + obstacle.h - 9);
      ctx.lineTo(obstacle.x + obstacle.w - 12, obstacle.y + obstacle.h - 6);
      ctx.stroke();
    }
  }

  function drawRelic() {
    if (!state.relic) {
      return;
    }

    const relic = state.relic;
    const pulse = 0.72 + 0.28 * Math.sin(state.elapsed * 7.1);
    const spin = state.elapsed * 1.7;

    ctx.fillStyle = `rgba(139, 246, 167, ${0.22 + pulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, relic.r + 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(relic.x, relic.y);
    ctx.rotate(spin);
    ctx.fillStyle = "#87f6b6";
    ctx.beginPath();
    ctx.moveTo(0, -relic.r - 1);
    ctx.lineTo(relic.r * 0.85, 0);
    ctx.lineTo(0, relic.r + 1);
    ctx.lineTo(-relic.r * 0.85, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f1fff5";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "#d9fff0";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, relic.r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHealOrb() {
    if (!state.healOrb) {
      return;
    }

    const orb = state.healOrb;
    const pulse = 0.66 + 0.34 * Math.sin(state.elapsed * 6.5);

    ctx.fillStyle = `rgba(168, 255, 187, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a8ffbb";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e8ffe9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(orb.x - 5, orb.y);
    ctx.lineTo(orb.x + 5, orb.y);
    ctx.moveTo(orb.x, orb.y - 5);
    ctx.lineTo(orb.x, orb.y + 5);
    ctx.stroke();
  }

  function drawAegisOrb() {
    if (!state.aegisOrb) {
      return;
    }

    const orb = state.aegisOrb;
    const pulse = 0.68 + 0.32 * Math.sin(state.elapsed * 5.6);
    const spin = state.elapsed * 1.5;

    ctx.fillStyle = `rgba(166, 243, 255, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(183, 249, 255, 0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.rotate(spin);
    ctx.strokeStyle = "#dffbff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -orb.r - 1);
    ctx.lineTo(orb.r + 1, 0);
    ctx.lineTo(0, orb.r + 1);
    ctx.lineTo(-orb.r - 1, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#b7f8ff";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMiniBoss() {
    const boss = state.miniBoss;
    if (!boss) {
      return;
    }

    const phase = boss.phase || 1;
    const pulse = 0.74 + 0.26 * Math.sin(state.elapsed * 3.5);
    const shellColor =
      phase === 1 ? [214, 145, 255] : phase === 2 ? [255, 188, 129] : [255, 118, 182];
    const glowAlpha = phase === 1 ? 0.2 : phase === 2 ? 0.24 : 0.28;

    ctx.fillStyle = `rgba(${shellColor[0]}, ${shellColor[1]}, ${shellColor[2]}, ${0.12 + pulse * glowAlpha})`;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 16, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(
      boss.x - boss.r * 0.32,
      boss.y - boss.r * 0.42,
      boss.r * 0.3,
      boss.x,
      boss.y,
      boss.r * 1.2
    );
    if (phase === 1) {
      gradient.addColorStop(0, "#f4c9ff");
      gradient.addColorStop(1, "#a454d9");
    } else if (phase === 2) {
      gradient.addColorStop(0, "#ffe0b8");
      gradient.addColorStop(1, "#d58a4f");
    } else {
      gradient.addColorStop(0, "#ffc8dd");
      gradient.addColorStop(1, "#d34a86");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = phase === 1 ? "#f3deff" : phase === 2 ? "#ffe7c5" : "#ffd7ea";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.r + 1.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = boss.windupLeft > 0 ? "#ffe4aa" : phase === 3 ? "#fff2f7" : "#fff5ff";
    ctx.beginPath();
    ctx.arc(boss.x + 4, boss.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    if ((boss.volleyRecoverLeft || 0) > 0) {
      const open = clamp((boss.volleyRecoverLeft || 0) / CONFIG.bossVolleyRecover, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 16);
      ctx.strokeStyle = `rgba(166, 255, 220, ${0.3 + open * 0.45 + pulse * 0.12})`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.r + 11 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (phase >= 2 && (boss.projectileCooldown || 0) < 1.1) {
      const alertPulse = 0.5 + 0.5 * Math.sin(state.elapsed * 18);
      ctx.strokeStyle = `rgba(255, 206, 242, ${0.28 + alertPulse * 0.46})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.r + 13 + alertPulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    const bw = 86;
    const bh = 8;
    const bx = boss.x - bw * 0.5;
    const by = boss.y - boss.r - 20;
    ctx.fillStyle = "rgba(20, 20, 30, 0.75)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle =
      phase === 1 ? "rgba(248, 220, 255, 0.6)" : phase === 2 ? "rgba(255, 233, 201, 0.7)" : "rgba(255, 215, 236, 0.75)";
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    const hpRatio = clamp(boss.health / boss.maxHealth, 0, 1);
    ctx.fillStyle = phase === 1 ? "#f5b8ff" : phase === 2 ? "#ffce8b" : "#ff9bc9";
    ctx.fillRect(bx + 1.5, by + 1.5, (bw - 3) * hpRatio, bh - 3);

    if (phase === 3) {
      ctx.strokeStyle = "rgba(255, 147, 201, 0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.r + 10 + Math.sin(state.elapsed * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawBossTelegraphs() {
    ctx.save();
    for (const telegraph of state.bossTelegraphs) {
      const warm = telegraph.kind === "sweep";
      const warmup =
        telegraph.maxDelay > 0 ? clamp(1 - (telegraph.delay || 0) / telegraph.maxDelay, 0, 1) : 1;
      const alpha = clamp(telegraph.life / telegraph.maxLife, 0, 1);
      const arming = (telegraph.delay || 0) > 0 ? warmup * 0.55 : 1 - alpha;
      const len = warm ? 300 : 280;
      const ex = telegraph.x + Math.cos(telegraph.angle) * len;
      const ey = telegraph.y + Math.sin(telegraph.angle) * len;
      const core = warm ? "255, 176, 129" : "255, 121, 195";
      const edge = warm ? "255, 238, 210" : "255, 235, 245";
      const tip = warm ? "255, 227, 198" : "255, 214, 239";

      ctx.strokeStyle = `rgba(${core}, ${0.08 + arming * 0.26})`;
      ctx.lineWidth = 8 + arming * 4;
      ctx.beginPath();
      ctx.moveTo(telegraph.x, telegraph.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.setLineDash(warm ? [8, 10] : [12, 8]);
      ctx.lineDashOffset = -state.elapsed * (warm ? 220 : 180);
      ctx.strokeStyle = `rgba(${edge}, ${0.34 + arming * 0.58})`;
      ctx.lineWidth = 2.2 + arming * 1.6;
      ctx.beginPath();
      ctx.moveTo(telegraph.x, telegraph.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(${tip}, ${0.35 + arming * 0.48})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 4 + arming * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBossProjectiles() {
    for (const projectile of state.bossProjectiles) {
      const warm = projectile.kind === "sweep";
      const alpha = clamp(projectile.life / CONFIG.bossProjectileLife, 0, 1);
      const speed = Math.max(1, Math.hypot(projectile.vx, projectile.vy));
      const tailX = projectile.x - (projectile.vx / speed) * (16 + (1 - alpha) * 16);
      const tailY = projectile.y - (projectile.vy / speed) * (16 + (1 - alpha) * 16);

      ctx.strokeStyle = warm
        ? `rgba(255, 177, 132, ${0.26 + alpha * 0.3})`
        : `rgba(255, 162, 226, ${0.26 + alpha * 0.3})`;
      ctx.lineWidth = 3 + alpha * 2;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(projectile.x, projectile.y);
      ctx.stroke();

      ctx.fillStyle = warm
        ? `rgba(255, 214, 181, ${0.18 + alpha * 0.2})`
        : `rgba(255, 188, 238, ${0.18 + alpha * 0.2})`;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.r + 7.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = warm
        ? `rgba(255, 170, 115, ${0.8 + alpha * 0.18})`
        : `rgba(255, 162, 226, ${0.8 + alpha * 0.18})`;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = warm
        ? `rgba(255, 247, 233, ${0.55 + alpha * 0.35})`
        : `rgba(255, 242, 252, ${0.55 + alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(projectile.x - 1, projectile.y - 1, Math.max(1.7, projectile.r * 0.38), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTrails() {
    for (const trail of state.trails) {
      const alpha = Math.max(0, trail.life / 0.26) * 0.26;
      ctx.fillStyle = `rgba(121, 223, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      const style = ENEMY_STYLES[enemy.type] || ENEMY_STYLES.stalker;
      const stunned = enemy.stunLeft > 0;

      ctx.fillStyle = stunned ? "rgba(255, 215, 167, 0.16)" : "rgba(255, 167, 126, 0.12)";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = stunned ? "#ffd7a7" : style.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = stunned ? "#fff4e1" : style.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = stunned ? "#fff4d9" : "#fff2e9";
      ctx.beginPath();
      ctx.arc(
        enemy.x - enemy.r * 0.14,
        enemy.y - enemy.r * 0.12,
        Math.max(2, enemy.r * 0.25),
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (enemy.type === "wisp") {
        const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 9 + enemy.phase);
        ctx.strokeStyle = `rgba(181, 237, 255, ${0.32 + pulse * 0.26})`;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 5 + pulse * 2.4, 0, Math.PI * 2);
        ctx.stroke();

        if (enemy.wispBurstWindup > 0) {
          const total = Math.max(0.001, enemy.wispBurstWindupMax || enemy.wispBurstWindup);
          const p = clamp(1 - enemy.wispBurstWindup / total, 0, 1);
          const ax = enemy.wispDirX || 1;
          const ay = enemy.wispDirY || 0;
          const len = 54 + p * 70;
          ctx.strokeStyle = `rgba(188, 243, 255, ${0.28 + p * 0.46})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + ax * len, enemy.y + ay * len);
          ctx.stroke();
        }

        if (enemy.wispBurstTime > 0) {
          const bx = enemy.wispDirX || 0;
          const by = enemy.wispDirY || 0;
          ctx.strokeStyle = "rgba(174, 235, 255, 0.45)";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(enemy.x - bx * 3, enemy.y - by * 3);
          ctx.lineTo(enemy.x - bx * 20, enemy.y - by * 20);
          ctx.stroke();
        }
      }

      if (enemy.type === "lancer" && enemy.lanceWindup > 0) {
        const total = Math.max(0.001, enemy.lanceWindupMax || enemy.lanceWindup);
        const windupProgress = clamp(1 - enemy.lanceWindup / total, 0, 1);
        const aimX = enemy.lanceAimX || 1;
        const aimY = enemy.lanceAimY || 0;
        const lineLen = 72 + windupProgress * 86;

        ctx.strokeStyle = "rgba(248, 222, 255, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r + 6 + enemy.lanceWindup * 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 224, 248, ${0.34 + windupProgress * 0.42})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + aimX * lineLen, enemy.y + aimY * lineLen);
        ctx.stroke();
      }
    }
  }

  function drawPlayer(player) {
    if (!player) {
      return;
    }

    const blinking = player.invuln > 0 && Math.floor(performance.now() * 0.02) % 2 === 0;
    if (blinking) {
      return;
    }

    if (player.dashTimeLeft > 0) {
      ctx.fillStyle = "#58bfff54";
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 14, 0, Math.PI * 2);
      ctx.fill();
    }

    if ((player.shieldHits || 0) > 0) {
      const layers = Math.min(CONFIG.shieldMaxHits, player.shieldHits);
      for (let i = 0; i < layers; i += 1) {
        const t = i / Math.max(1, layers);
        const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * (8 + i * 2) + i);
        ctx.strokeStyle = `rgba(177, 246, 255, ${0.36 - t * 0.12 + pulse * 0.1})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r + 8 + i * 4 + pulse * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const dirMag = Math.max(0.1, Math.hypot(player.lastMoveX, player.lastMoveY));
    const nx = player.lastMoveX / dirMag;
    const ny = player.lastMoveY / dirMag;

    ctx.strokeStyle = "rgba(122, 223, 255, 0.46)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x - nx * 8, player.y - ny * 8);
    ctx.lineTo(player.x - nx * 18, player.y - ny * 18);
    ctx.stroke();

    ctx.fillStyle = "#77ddff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d8f8ff";
    ctx.beginPath();
    ctx.arc(player.x - 3, player.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e2fbff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(88, 191, 255, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + nx * (player.r + 5), player.y + ny * (player.r + 5));
    ctx.stroke();
  }

  function drawImpactRings() {
    for (const ring of state.impactRings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      const [r, g, b] = ring.rgb;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.75})`;
      ctx.lineWidth = ring.width * (0.55 + alpha);
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      const [r, g, b] = particle.rgb;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFloatingTexts() {
    ctx.textAlign = "center";
    for (const item of state.floatingTexts) {
      const a = clamp(item.life / item.maxLife, 0, 1);
      const [r, g, b] = item.rgb;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.2 + a * 0.75})`;
      ctx.font = `700 ${item.size}px 'Trebuchet MS', sans-serif`;
      ctx.fillText(item.text, item.x, item.y);
    }
  }

  function drawWorldTimer() {
    const x = 18;
    const y = 18;
    const w = 220;
    const h = 18;

    const ratio = clamp(state.elapsed / CONFIG.objectiveSeconds, 0, 1);

    ctx.fillStyle = "rgba(9, 20, 35, 0.75)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(123, 188, 242, 0.64)";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    const fg = ctx.createLinearGradient(x, y, x + w, y);
    fg.addColorStop(0, "#67d8ff");
    fg.addColorStop(1, "#7df5b3");
    ctx.fillStyle = fg;
    ctx.fillRect(x + 2, y + 2, (w - 4) * ratio, h - 4);

    const checkpointRatio = clamp(state.nextCheckpointAt / CONFIG.objectiveSeconds, 0, 1);
    const checkpointX = x + checkpointRatio * w;
    ctx.strokeStyle = "rgba(255, 241, 173, 0.55)";
    ctx.beginPath();
    ctx.moveTo(checkpointX, y - 3);
    ctx.lineTo(checkpointX, y + h + 3);
    ctx.stroke();

    if (!state.bossSpawned) {
      const bossRatio = clamp(CONFIG.bossSpawnAt / CONFIG.objectiveSeconds, 0, 1);
      const bossX = x + bossRatio * w;
      ctx.strokeStyle = "rgba(230, 158, 255, 0.58)";
      ctx.beginPath();
      ctx.moveTo(bossX, y - 3);
      ctx.lineTo(bossX, y + h + 3);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(225, 244, 255, 0.86)";
    ctx.font = "700 12px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `${Math.max(0, CONFIG.objectiveSeconds - state.elapsed).toFixed(1)}s`,
      x + w + 8,
      y + 13
    );

    const comboW = 130;
    const comboH = 10;
    const comboX = CONFIG.width - comboW - 18;
    const comboY = 18;
    const comboRatio = clamp(state.comboTimer / CONFIG.comboWindow, 0, 1);
    ctx.fillStyle = "rgba(12, 24, 39, 0.78)";
    ctx.fillRect(comboX, comboY, comboW, comboH);
    ctx.strokeStyle = "rgba(168, 219, 255, 0.45)";
    ctx.strokeRect(comboX + 0.5, comboY + 0.5, comboW - 1, comboH - 1);
    if (comboRatio > 0 && state.comboCount > 0) {
      const cg = ctx.createLinearGradient(comboX, comboY, comboX + comboW, comboY);
      cg.addColorStop(0, "#8be8ff");
      cg.addColorStop(1, "#78ffc7");
      ctx.fillStyle = cg;
      ctx.fillRect(comboX + 1.5, comboY + 1.5, (comboW - 3) * comboRatio, comboH - 3);
    }

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(225, 245, 255, 0.92)";
    ctx.fillText(
      state.comboCount > 1 ? `COMBO x${state.comboMultiplier.toFixed(2)}` : "COMBO",
      comboX + comboW,
      comboY + 24
    );
  }

  function drawBossBanner() {
    let text = "";
    let tone = "warn";
    let alpha = 0;

    if (state.bossCalloutTimer > 0 && state.bossCalloutText) {
      text = state.bossCalloutText;
      tone = state.bossCalloutTone || "warn";
      alpha = clamp(Math.min(1, state.bossCalloutTimer / 0.35), 0, 1);
    } else if (state.bossIntroTimer > 0) {
      text = "Mini-boss detecte";
      tone = "warn";
      alpha = clamp(state.bossIntroTimer / 2.4, 0, 1);
    }

    if (!text) {
      return;
    }

    const palette =
      tone === "good"
        ? { bg: "75, 200, 145", fg: "226, 255, 240" }
        : tone === "bad"
          ? { bg: "220, 92, 125", fg: "255, 232, 239" }
          : { bg: "230, 150, 255", fg: "250, 228, 255" };

    ctx.font = "700 23px 'Trebuchet MS', sans-serif";
    const width = Math.min(420, ctx.measureText(text).width + 34);
    const x = CONFIG.width * 0.5 - width * 0.5;
    const y = 28;
    const h = 34;
    ctx.fillStyle = `rgba(${palette.bg}, ${0.18 + alpha * 0.26})`;
    ctx.fillRect(x, y, width, h);
    ctx.strokeStyle = `rgba(${palette.fg}, ${0.4 + alpha * 0.4})`;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, h - 1);

    ctx.fillStyle = `rgba(${palette.fg}, ${0.9 * alpha})`;
    ctx.textAlign = "center";
    ctx.fillText(text, CONFIG.width * 0.5, y + 24);
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
    for (const obstacle of OBSTACLES) {
      const nearestX = clamp(entity.x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(entity.y, obstacle.y, obstacle.y + obstacle.h);
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
    for (const obstacle of OBSTACLES) {
      const nearestX = clamp(probe.x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(probe.y, obstacle.y, obstacle.y + obstacle.h);
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

  function getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (state.botInput) {
      dx += (state.botInput.left ? -1 : 0) + (state.botInput.right ? 1 : 0);
      dy += (state.botInput.up ? -1 : 0) + (state.botInput.down ? 1 : 0);
    }

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
      const vx = tx - state.player.x;
      const vy = ty - state.player.y;
      if (Math.hypot(vx, vy) > CONFIG.touchDeadZone) {
        dx = vx;
        dy = vy;
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
    const player = state.player;
    const dashReady = player && player.dashCooldownLeft <= 0;

    dom.livesVal.textContent = String(player ? Math.max(0, player.lives) : CONFIG.playerMaxLives);
    dom.timeVal.textContent = `${state.elapsed.toFixed(1)}s`;
    if (dom.goalVal) {
      dom.goalVal.textContent = `${CONFIG.objectiveSeconds}s`;
    }
    dom.scoreVal.textContent = String(Math.floor(state.score));
    dom.relicVal.textContent = String(state.relics);
    if (dom.comboVal) {
      dom.comboVal.textContent =
        state.comboCount > 1 ? `x${state.comboMultiplier.toFixed(2)} (${state.comboTimer.toFixed(1)}s)` : "x1.00";
    }
    if (dom.shieldVal) {
      dom.shieldVal.textContent = String(player ? player.shieldHits || 0 : 0);
    }
    dom.enemyVal.textContent = String(state.enemies.length + (state.miniBoss ? 1 : 0));

    if (dom.dashVal) {
      dom.dashVal.textContent = dashReady
        ? "Pret"
        : player
          ? `${Math.max(player.dashCooldownLeft, 0).toFixed(1)}s`
          : "-";
    }

    if (dom.dangerVal) {
      if (state.miniBoss) {
        const phase = state.miniBoss.phase || 1;
        if ((state.miniBoss.volleyRecoverLeft || 0) > 0) {
          dom.dangerVal.textContent = "BOSS-OPEN";
        } else {
          dom.dangerVal.textContent = phase === 1 ? "BOSS-I" : phase === 2 ? "BOSS-II" : "BOSS-III";
        }
      } else if (state.difficulty < 1.06) {
        dom.dangerVal.textContent = "I";
      } else if (state.difficulty < 1.34) {
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

  function ensureAudioReady() {
    if (!state.audio.enabled) {
      return null;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }

    if (!state.audio.ctx) {
      state.audio.ctx = new AudioCtx();
      state.audio.master = state.audio.ctx.createGain();
      state.audio.master.gain.value = 0.11;
      state.audio.master.connect(state.audio.ctx.destination);
    }

    if (state.audio.ctx.state === "suspended") {
      state.audio.ctx.resume().catch(() => {});
    }

    return state.audio.ctx;
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = enabled;
    if (state.audio.master) {
      state.audio.master.gain.setTargetAtTime(enabled ? 0.11 : 0.0, state.audio.ctx.currentTime, 0.02);
    }
  }

  function setReducedFx(enabled) {
    state.reducedFx = !!enabled;
    try {
      localStorage.setItem(CONFIG.reducedFxKey, state.reducedFx ? "1" : "0");
    } catch {
      // Ignore storage errors; gameplay still works with default visuals.
    }
  }

  function playTone(startFreq, endFreq, duration, type = "sine", volume = 0.06) {
    const audioCtx = ensureAudioReady();
    if (!audioCtx || !state.audio.master) {
      return;
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(state.audio.master);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  function playSfx(name) {
    if (!state.audio.enabled) {
      return;
    }

    if (name === "start") {
      playTone(300, 430, 0.14, "triangle", 0.04);
      return;
    }
    if (name === "dash") {
      playTone(520, 880, 0.08, "sawtooth", 0.045);
      return;
    }
    if (name === "relic") {
      playTone(780, 1090, 0.1, "triangle", 0.05);
      return;
    }
    if (name === "heal") {
      playTone(420, 660, 0.14, "sine", 0.05);
      return;
    }
    if (name === "shieldGain") {
      playTone(500, 760, 0.13, "triangle", 0.05);
      return;
    }
    if (name === "shieldBreak") {
      playTone(260, 150, 0.12, "sawtooth", 0.052);
      return;
    }
    if (name === "nearMiss") {
      playTone(640, 820, 0.06, "triangle", 0.035);
      return;
    }
    if (name === "hit") {
      playTone(180, 70, 0.16, "square", 0.055);
      return;
    }
    if (name === "checkpoint") {
      playTone(360, 540, 0.12, "triangle", 0.05);
      playTone(540, 720, 0.12, "triangle", 0.04);
      return;
    }
    if (name === "bossSpawn") {
      playTone(120, 75, 0.25, "sawtooth", 0.07);
      return;
    }
    if (name === "bossCharge") {
      playTone(220, 300, 0.09, "square", 0.05);
      return;
    }
    if (name === "bossPhase") {
      playTone(260, 420, 0.16, "triangle", 0.06);
      return;
    }
    if (name === "bossPulse") {
      playTone(140, 90, 0.18, "sawtooth", 0.065);
      playTone(280, 210, 0.14, "triangle", 0.04);
      return;
    }
    if (name === "bossWarn") {
      playTone(320, 260, 0.1, "square", 0.048);
      playTone(260, 220, 0.08, "square", 0.036);
      return;
    }
    if (name === "bossAim") {
      playTone(360, 470, 0.12, "triangle", 0.045);
      return;
    }
    if (name === "bossShot") {
      playTone(500, 260, 0.1, "square", 0.055);
      return;
    }
    if (name === "bossShotHit") {
      playTone(190, 110, 0.14, "sawtooth", 0.06);
      return;
    }
    if (name === "bossHit") {
      playTone(300, 180, 0.1, "square", 0.05);
      return;
    }
    if (name === "bossOpen") {
      playTone(330, 460, 0.08, "triangle", 0.04);
      return;
    }
    if (name === "bossBreak") {
      playTone(620, 260, 0.14, "sawtooth", 0.055);
      playTone(440, 220, 0.12, "triangle", 0.04);
      return;
    }
    if (name === "bossDefeat") {
      playTone(560, 300, 0.24, "triangle", 0.06);
      playTone(760, 420, 0.2, "sine", 0.05);
      return;
    }
    if (name === "win") {
      playTone(420, 760, 0.2, "triangle", 0.055);
      return;
    }
    if (name === "lose") {
      playTone(220, 80, 0.24, "square", 0.06);
      return;
    }
    if (name === "toggle") {
      playTone(420, 520, 0.08, "sine", 0.04);
    }
  }

  function handleKeyDown(event) {
    ensureAudioReady();

    if (event.code === "Space") {
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

    if (event.key === "m" || event.key === "M") {
      setAudioEnabled(!state.audio.enabled);
      if (state.audio.enabled) {
        playSfx("toggle");
      }
      return;
    }

    if (event.key === "v" || event.key === "V") {
      setReducedFx(!state.reducedFx);
      showBossCallout(state.reducedFx ? "FX reduits" : "FX complets", 0.9, "warn");
      playSfx("toggle");
      return;
    }

    if (
      event.key.startsWith("Arrow") ||
      event.key === "w" ||
      event.key === "W" ||
      event.key === "a" ||
      event.key === "A" ||
      event.key === "s" ||
      event.key === "S" ||
      event.key === "d" ||
      event.key === "D"
    ) {
      event.preventDefault();
    }

    state.keys.add(event.key);
  }

  function handleKeyUp(event) {
    state.keys.delete(event.key);
  }

  function bindTouchControls() {
    const updateTouch = (ev) => {
      ensureAudioReady();
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
      ensureAudioReady();
      if (state.running && !state.finished) {
        return;
      }
      startGame();
    });

    window.addEventListener("pointerdown", ensureAudioReady, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    bindTouchControls();
  }

  function setupDebugApi() {
    // Expose snapshot and deterministic stepping for automated balancing.
    window.__RUINS_DASH_DEBUG__ = {
      getState() {
        const player = state.player;
        const boss = state.miniBoss;
        return {
          running: state.running,
          paused: state.paused,
          finished: state.finished,
          victory: state.victory,
          elapsed: state.elapsed,
          score: state.score,
          relics: state.relics,
          comboCount: state.comboCount,
          comboTimer: state.comboTimer,
          comboMultiplier: state.comboMultiplier,
          difficulty: state.difficulty,
          objectiveSeconds: CONFIG.objectiveSeconds,
          nextCheckpointAt: state.nextCheckpointAt,
          audioEnabled: state.audio.enabled,
          reducedFx: state.reducedFx,
          player: player
            ? {
                x: player.x,
                y: player.y,
                r: player.r,
                lives: player.lives,
                shieldHits: player.shieldHits || 0,
                invuln: player.invuln,
                dashCooldownLeft: player.dashCooldownLeft,
                dashTimeLeft: player.dashTimeLeft,
              }
            : null,
          relic: state.relic
            ? { x: state.relic.x, y: state.relic.y, r: state.relic.r }
            : null,
          healOrb: state.healOrb
            ? { x: state.healOrb.x, y: state.healOrb.y, r: state.healOrb.r }
            : null,
          aegisOrb: state.aegisOrb
            ? { x: state.aegisOrb.x, y: state.aegisOrb.y, r: state.aegisOrb.r }
            : null,
          miniBoss: boss
            ? {
                x: boss.x,
                y: boss.y,
                r: boss.r,
                health: boss.health,
                maxHealth: boss.maxHealth,
                phase: boss.phase || 1,
                stunLeft: boss.stunLeft,
                windupLeft: boss.windupLeft,
                chargeTimeLeft: boss.chargeTimeLeft,
                shockwaveCooldown: boss.shockwaveCooldown || 0,
                projectileCooldown: boss.projectileCooldown || 0,
                attackLockLeft: boss.attackLockLeft || 0,
                volleyRecoverLeft: boss.volleyRecoverLeft || 0,
              }
            : null,
          enemies: state.enemies.map((enemy) => ({
            type: enemy.type,
            x: enemy.x,
            y: enemy.y,
            r: enemy.r,
            baseSpeed: enemy.baseSpeed,
            stunLeft: enemy.stunLeft,
            lanceWindup: enemy.lanceWindup || 0,
            lanceTime: enemy.lanceTime || 0,
          })),
          bossTelegraphs: state.bossTelegraphs.map((item) => ({
            x: item.x,
            y: item.y,
            angle: item.angle,
            life: item.life,
            maxLife: item.maxLife,
          })),
          bossProjectiles: state.bossProjectiles.map((item) => ({
            x: item.x,
            y: item.y,
            r: item.r,
            vx: item.vx,
            vy: item.vy,
            life: item.life,
          })),
        };
      },
      startGame() {
        startGame();
        return this.getState();
      },
      setBotInput(input) {
        state.botInput = {
          left: !!input?.left,
          right: !!input?.right,
          up: !!input?.up,
          down: !!input?.down,
        };
      },
      step(dt = 1 / 60, input = null) {
        if (input) {
          this.setBotInput(input);
          if (input.dash) {
            tryDash();
          }
        }
        const safeDt = clamp(Number(dt) || 0.016, 0.001, 0.09);
        update(safeDt);
        return this.getState();
      },
      clearBotInput() {
        state.botInput = null;
      },
      setAudioEnabled(enabled) {
        setAudioEnabled(!!enabled);
      },
      setReducedFx(enabled) {
        setReducedFx(!!enabled);
      },
    };
  }

  function setupStars() {
    state.stars = [];
    for (let i = 0; i < CONFIG.starsCount; i += 1) {
      state.stars.push({
        x: rand(0, CONFIG.width),
        y: rand(0, CONFIG.height),
        size: rand(0.8, 2.1),
        speed: rand(2.2, 12),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  function init() {
    try {
      const raw = localStorage.getItem(CONFIG.reducedFxKey);
      state.reducedFx = raw === "1";
    } catch {
      state.reducedFx = false;
    }

    bindEvents();
    setupDebugApi();
    setupStars();
    renderLeaderboard();
    updateActionButton();
    showOverlay(
      "Survis 60s. Boss a 30s (3 phases + patterns alternes). Dash en fenetre BOSS-OPEN. Combo reliques + Aegis a collecter. Espace = rush. M = audio. V = FX."
    );
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
