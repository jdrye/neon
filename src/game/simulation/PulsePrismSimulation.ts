import {
  ANCHOR_CAPTURE_TIME,
  ANCHORS_PER_SECTOR,
  ARENA_PADDING,
  BOSS_MAX_HEALTH,
  COMBO_TIMEOUT,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_INVULNERABILITY,
  PLAYER_BOLT_DAMAGE,
  PLAYER_BOLT_PIERCE,
  PLAYER_BOLT_SPEED,
  PLAYER_DRAG,
  PLAYER_FIRE_INTERVAL,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PULSE_COOLDOWN,
  PULSE_DAMAGE_RADIUS,
  PULSE_PUSH_RADIUS,
  SECTOR_COUNT
} from "../config";
import type {
  AnchorState,
  BossStatus,
  EnemyKind,
  EnemyState,
  GamePhase,
  InputFrame,
  OrbiterState,
  PlayerState,
  ProjectileState,
  PulseState,
  RoundSummary,
  ShardState,
  Snapshot,
  UpgradeId,
  UpgradeOption,
  Vector2
} from "../types";

type EnemyMode = "seek" | "windup" | "charge" | "recover";

interface EnemyRuntime extends EnemyState {
  speed: number;
  contactDamage: number;
  shootCooldown: number;
  stateTimer: number;
  mode: EnemyMode;
  orbitAngle: number;
  storedDirection: Vector2;
  orbiterCooldown: number;
}

interface ProjectileRuntime extends ProjectileState {
  damage: number;
  pierce: number;
}

interface PlayerTuning {
  fireInterval: number;
  boltDamage: number;
  boltSpeed: number;
  boltPierce: number;
  boltCount: number;
  spread: number;
  pulseCooldown: number;
  pulseDamage: number;
  pulseDamageRadius: number;
  pulsePushRadius: number;
  dashCooldown: number;
  dashImpactDamage: number;
  healOnSecure: number;
  healOnShard: number;
  anchorCaptureRate: number;
  orbiterCount: number;
}

const FIXED_STEP_MAX = 1 / 30;

const UPGRADE_POOL: Record<UpgradeId, UpgradeOption> = {
  overclock: {
    id: "overclock",
    title: "Overclock Lattice",
    description: "Raise fire cadence and bolt speed so the arena never settles."
  },
  lance: {
    id: "lance",
    title: "Prism Lance",
    description: "Primary bolts hit harder and pierce through stacked lines."
  },
  capacitor: {
    id: "capacitor",
    title: "Capacitor Bloom",
    description: "Pulse resets faster and detonates across a wider inner ring."
  },
  blink: {
    id: "blink",
    title: "Blink Weave",
    description: "Dash recycles sooner and slams harder through dense packs."
  },
  satellite: {
    id: "satellite",
    title: "Halo Satellites",
    description: "Deploy orbiting shards that chew through anything too close."
  },
  recycler: {
    id: "recycler",
    title: "Recycler Mesh",
    description: "Anchors and shards feed stability back into the prism core."
  },
  splitter: {
    id: "splitter",
    title: "Tri-Split Relay",
    description: "Your primary fire fans outward into a dense tactical spread."
  }
};

const ANCHOR_LAYOUTS: Vector2[][] = [
  [
    { x: 320, y: 190 },
    { x: 960, y: 530 }
  ],
  [
    { x: 278, y: 520 },
    { x: 1010, y: 210 }
  ],
  [
    { x: 420, y: 160 },
    { x: 900, y: 560 }
  ]
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function randomBetween(min: number, max: number): number {
  return lerp(min, max, Math.random());
}

function length(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vector2): Vector2 {
  const magnitude = length(vector);

  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude
  };
}

function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addVector(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

function subtractVector(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

function scaleVector(vector: Vector2, scalar: number): Vector2 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar
  };
}

function cloneVector(vector: Vector2): Vector2 {
  return {
    x: vector.x,
    y: vector.y
  };
}

function directionFromAngle(angle: number): Vector2 {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
}

function rotateVector(vector: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

function formatRank(score: number): string {
  if (score >= 32_000) {
    return "S";
  }

  if (score >= 24_000) {
    return "A";
  }

  if (score >= 17_000) {
    return "B";
  }

  if (score >= 11_000) {
    return "C";
  }

  return "D";
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export class PulsePrismSimulation {
  private phase: GamePhase = "ready";
  private elapsed = 0;
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private bestChain = 0;
  private killCount = 0;
  private sector = 1;
  private anchorsSecured = 0;
  private spawnTimer = 0.9;
  private nextAnchorId = 1;
  private nextEnemyId = 1;
  private nextProjectileId = 1;
  private nextShardId = 1;
  private nextPulseId = 1;
  private nextOrbiterId = 1;
  private bossPendingAfterDraft = false;
  private lastMove: Vector2 = { x: 0, y: -1 };
  private lastAim: Vector2 = { x: 0, y: -1 };

  private player: PlayerState = this.createPlayer();
  private tuning: PlayerTuning = this.createTuning();
  private enemies: EnemyRuntime[] = [];
  private anchors: AnchorState[] = [];
  private projectiles: ProjectileRuntime[] = [];
  private shards: ShardState[] = [];
  private pulses: PulseState[] = [];
  private orbiters: OrbiterState[] = [];
  private draftOptions: UpgradeOption[] = [];
  private selectedUpgrades: UpgradeOption[] = [];

  startRound(): void {
    this.reset();
    this.beginSector(1);
  }

  selectUpgrade(upgradeId: UpgradeId): void {
    if (this.phase !== "draft") {
      return;
    }

    const selected = this.draftOptions.find((option) => option.id === upgradeId);

    if (!selected) {
      return;
    }

    this.selectedUpgrades.push(selected);
    this.applyUpgrade(selected.id);
    this.draftOptions = [];
    this.phase = "running";

    if (this.bossPendingAfterDraft) {
      this.startBossFight();
      return;
    }

    this.beginSector(this.sector + 1);
  }

  peekSnapshot(): Snapshot {
    return this.getSnapshot();
  }

  step(input: InputFrame, deltaSeconds: number): Snapshot {
    const dt = Math.min(deltaSeconds, FIXED_STEP_MAX);

    this.updateVisualTimers(dt);

    if (this.phase !== "running") {
      return this.getSnapshot();
    }

    this.elapsed += dt;

    this.updatePlayer(input, dt);
    this.updateAnchors(dt);

    if (this.phase !== "running") {
      return this.getSnapshot();
    }

    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateOrbiters(dt);
    this.resolveEnemyBodyCollisions();
    this.updateShards(dt);
    this.updateCombo(dt);

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.phase = "lost";
    }

    return this.getSnapshot();
  }

  private reset(): void {
    this.phase = "ready";
    this.elapsed = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestChain = 0;
    this.killCount = 0;
    this.sector = 1;
    this.anchorsSecured = 0;
    this.spawnTimer = 0.9;
    this.nextAnchorId = 1;
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.nextShardId = 1;
    this.nextPulseId = 1;
    this.nextOrbiterId = 1;
    this.bossPendingAfterDraft = false;
    this.lastMove = { x: 0, y: -1 };
    this.lastAim = { x: 0, y: -1 };
    this.player = this.createPlayer();
    this.tuning = this.createTuning();
    this.enemies = [];
    this.anchors = [];
    this.projectiles = [];
    this.shards = [];
    this.pulses = [];
    this.orbiters = [];
    this.draftOptions = [];
    this.selectedUpgrades = [];
  }

  private createPlayer(): PlayerState {
    return {
      position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_RADIUS,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      dashTimer: 0,
      dashCooldown: 0,
      dashCooldownMax: DASH_COOLDOWN,
      pulseCooldown: 0,
      pulseCooldownMax: PULSE_COOLDOWN,
      primaryCooldown: 0,
      primaryCooldownMax: PLAYER_FIRE_INTERVAL,
      invulnerability: 0
    };
  }

  private createTuning(): PlayerTuning {
    return {
      fireInterval: PLAYER_FIRE_INTERVAL,
      boltDamage: PLAYER_BOLT_DAMAGE,
      boltSpeed: PLAYER_BOLT_SPEED,
      boltPierce: PLAYER_BOLT_PIERCE,
      boltCount: 1,
      spread: 0.16,
      pulseCooldown: PULSE_COOLDOWN,
      pulseDamage: 1,
      pulseDamageRadius: PULSE_DAMAGE_RADIUS,
      pulsePushRadius: PULSE_PUSH_RADIUS,
      dashCooldown: DASH_COOLDOWN,
      dashImpactDamage: 2,
      healOnSecure: 10,
      healOnShard: 0,
      anchorCaptureRate: 1,
      orbiterCount: 0
    };
  }

  private beginSector(nextSector: number): void {
    this.phase = "running";
    this.sector = nextSector;
    this.bossPendingAfterDraft = false;
    this.enemies = [];
    this.projectiles = [];
    this.shards = [];
    this.anchors = ANCHOR_LAYOUTS[nextSector - 1].map((position) => ({
      id: this.nextAnchorId++,
      position: cloneVector(position),
      radius: 82,
      progress: 0,
      required: ANCHOR_CAPTURE_TIME,
      status: "charging"
    }));
    this.spawnTimer = 1.08;
    this.createPulse({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }, 230, 0.42);
  }

  private startBossFight(): void {
    this.phase = "running";
    this.anchors = [];
    this.enemies = [];
    this.projectiles = [];
    this.shards = [];
    this.spawnTimer = 2.8;
    this.createPulse({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }, 310, 0.48);
    this.enemies.push({
      id: this.nextEnemyId++,
      kind: "boss",
      position: { x: GAME_WIDTH / 2, y: 168 },
      velocity: { x: 0, y: 0 },
      radius: 54,
      speed: 108,
      health: BOSS_MAX_HEALTH,
      maxHealth: BOSS_MAX_HEALTH,
      hue: 18,
      hitFlash: 0,
      telegraph: 0,
      contactDamage: 24,
      shootCooldown: 1.2,
      stateTimer: 3.6,
      mode: "seek",
      orbitAngle: 0,
      storedDirection: { x: 0, y: 1 },
      orbiterCooldown: 0
    });
  }

  private updateVisualTimers(dt: number): void {
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.pulseCooldown = Math.max(0, this.player.pulseCooldown - dt);
    this.player.primaryCooldown = Math.max(0, this.player.primaryCooldown - dt);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);

    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      pulse.age += dt;
      pulse.radius = lerp(20, pulse.maxRadius, clamp(pulse.age / pulse.duration, 0, 1));

      if (pulse.age >= pulse.duration) {
        this.pulses.splice(index, 1);
      }
    }

    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4.2);
      enemy.telegraph = Math.max(0, enemy.telegraph - dt * 2.4);
      enemy.orbiterCooldown = Math.max(0, enemy.orbiterCooldown - dt);
      enemy.shootCooldown -= dt;
      enemy.stateTimer -= dt;
    }
  }

  private updatePlayer(input: InputFrame, dt: number): void {
    const movement = normalize({ x: input.moveX, y: input.moveY });

    if (movement.x !== 0 || movement.y !== 0) {
      this.lastMove = movement;
    }

    let aimDirection = input.pointerActive
      ? normalize(subtractVector(input.aim, this.player.position))
      : { x: 0, y: 0 };

    if (aimDirection.x === 0 && aimDirection.y === 0) {
      aimDirection = movement.x !== 0 || movement.y !== 0 ? movement : this.lastAim;
    }

    if (aimDirection.x !== 0 || aimDirection.y !== 0) {
      this.lastAim = aimDirection;
    }

    if (input.dashPressed && this.player.dashCooldown <= 0) {
      const dashDirection =
        movement.x !== 0 || movement.y !== 0 ? movement : this.lastAim;

      this.player.dashTimer = DASH_DURATION;
      this.player.dashCooldown = this.tuning.dashCooldown;
      this.player.dashCooldownMax = this.tuning.dashCooldown;
      this.player.invulnerability = Math.max(this.player.invulnerability, DASH_DURATION);
      this.player.velocity = scaleVector(dashDirection, DASH_SPEED);
      this.createPulse(this.player.position, 110, 0.2);
    }

    if (input.pulsePressed && this.player.pulseCooldown <= 0) {
      this.player.pulseCooldown = this.tuning.pulseCooldown;
      this.player.pulseCooldownMax = this.tuning.pulseCooldown;
      this.emitPulseBlast();
    }

    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
      this.player.position = addVector(
        this.player.position,
        scaleVector(this.player.velocity, dt)
      );
    } else {
      const targetVelocity = scaleVector(movement, PLAYER_SPEED);
      this.player.velocity = {
        x: lerp(this.player.velocity.x, targetVelocity.x, 1 - PLAYER_DRAG),
        y: lerp(this.player.velocity.y, targetVelocity.y, 1 - PLAYER_DRAG)
      };
      this.player.position = addVector(
        this.player.position,
        scaleVector(this.player.velocity, dt)
      );
    }

    if (this.player.primaryCooldown <= 0) {
      this.firePrimary(aimDirection);
      this.player.primaryCooldown = this.tuning.fireInterval;
      this.player.primaryCooldownMax = this.tuning.fireInterval;
    }

    this.player.position.x = clamp(
      this.player.position.x,
      ARENA_PADDING,
      GAME_WIDTH - ARENA_PADDING
    );
    this.player.position.y = clamp(
      this.player.position.y,
      ARENA_PADDING,
      GAME_HEIGHT - ARENA_PADDING
    );
  }

  private firePrimary(direction: Vector2): void {
    if (direction.x === 0 && direction.y === 0) {
      return;
    }

    const shotCount = this.tuning.boltCount;
    const startAngle = -((shotCount - 1) * this.tuning.spread) / 2;

    for (let index = 0; index < shotCount; index += 1) {
      const angle = startAngle + index * this.tuning.spread;
      const spreadDirection = rotateVector(direction, angle);
      const velocity = scaleVector(spreadDirection, this.tuning.boltSpeed);

      this.projectiles.push({
        id: this.nextProjectileId++,
        owner: "player",
        position: addVector(this.player.position, scaleVector(spreadDirection, 24)),
        velocity,
        radius: 8,
        ttl: 1.1,
        hue: index % 2 === 0 ? 188 : 328,
        scale: shotCount > 1 ? 0.92 : 1,
        damage: this.tuning.boltDamage,
        pierce: this.tuning.boltPierce
      });
    }
  }

  private emitPulseBlast(): void {
    const center = cloneVector(this.player.position);
    this.createPulse(center, this.tuning.pulsePushRadius, 0.42);

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const delta = subtractVector(enemy.position, center);
      const dist = Math.max(1, length(delta));
      const direction = normalize(delta);

      if (dist <= this.tuning.pulsePushRadius) {
        const pushStrength = lerp(620, 140, dist / this.tuning.pulsePushRadius);
        enemy.velocity.x += direction.x * pushStrength;
        enemy.velocity.y += direction.y * pushStrength;
      }

      if (dist <= this.tuning.pulseDamageRadius) {
        const pulseDamage = enemy.kind === "boss" ? this.tuning.pulseDamage : this.tuning.pulseDamage;
        this.damageEnemy(index, pulseDamage, direction);
      }
    }
  }

  private updateAnchors(dt: number): void {
    if (this.anchors.length === 0) {
      return;
    }

    let unsecured = 0;

    for (const anchor of this.anchors) {
      if (anchor.status === "secured") {
        continue;
      }

      unsecured += 1;

      const playerInside = distance(anchor.position, this.player.position) <= anchor.radius;
      const contested = this.enemies.some(
        (enemy) =>
          enemy.kind !== "boss" &&
          distance(enemy.position, anchor.position) <= anchor.radius * 0.92
      );

      if (playerInside) {
        const captureDelta = dt * this.tuning.anchorCaptureRate * (contested ? 0.55 : 1);
        anchor.progress = clamp(anchor.progress + captureDelta, 0, anchor.required);
      } else {
        anchor.progress = clamp(anchor.progress - dt * 0.26, 0, anchor.required);
      }

      if (anchor.progress >= anchor.required) {
        this.secureAnchor(anchor);
      }
    }

    if (unsecured === 0) {
      this.handleSectorComplete();
    }
  }

  private secureAnchor(anchor: AnchorState): void {
    if (anchor.status === "secured") {
      return;
    }

    anchor.status = "secured";
    anchor.progress = anchor.required;
    this.anchorsSecured += 1;
    this.score += 520 * this.getMultiplier();
    this.combo += 2;
    this.bestChain = Math.max(this.bestChain, this.combo);
    this.comboTimer = COMBO_TIMEOUT;
    this.player.health = clamp(
      this.player.health + this.tuning.healOnSecure,
      0,
      this.player.maxHealth
    );
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - 0.25);
    this.player.pulseCooldown = Math.max(0, this.player.pulseCooldown - 0.35);
    this.spawnShards(anchor.position, 4);
    this.createPulse(anchor.position, 220, 0.46);

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const dist = distance(enemy.position, anchor.position);

      if (dist <= 120) {
        const direction = normalize(subtractVector(enemy.position, anchor.position));
        this.damageEnemy(index, 1, direction);
      }
    }
  }

  private handleSectorComplete(): void {
    if (this.phase !== "running") {
      return;
    }

    this.clearCombatField();

    const draftOptions = this.pickDraftOptions();

    if (draftOptions.length === 0) {
      if (this.sector >= SECTOR_COUNT) {
        this.startBossFight();
      } else {
        this.beginSector(this.sector + 1);
      }

      return;
    }

    this.draftOptions = draftOptions;
    this.bossPendingAfterDraft = this.sector >= SECTOR_COUNT;
    this.phase = "draft";
  }

  private pickDraftOptions(): UpgradeOption[] {
    const available = Object.values(UPGRADE_POOL).filter(
      (option) =>
        !this.selectedUpgrades.some((selected) => selected.id === option.id)
    );

    const result: UpgradeOption[] = [];

    while (available.length > 0 && result.length < 3) {
      const index = Math.floor(Math.random() * available.length);
      result.push(available.splice(index, 1)[0]);
    }

    return result;
  }

  private applyUpgrade(upgradeId: UpgradeId): void {
    if (upgradeId === "overclock") {
      this.tuning.fireInterval *= 0.76;
      this.tuning.boltSpeed += 140;
      return;
    }

    if (upgradeId === "lance") {
      this.tuning.boltDamage += 1;
      this.tuning.boltPierce += 1;
      return;
    }

    if (upgradeId === "capacitor") {
      this.tuning.pulseCooldown *= 0.74;
      this.tuning.pulseDamage += 1;
      this.tuning.pulseDamageRadius += 42;
      this.tuning.pulsePushRadius += 56;
      return;
    }

    if (upgradeId === "blink") {
      this.tuning.dashCooldown *= 0.78;
      this.tuning.dashImpactDamage += 2;
      return;
    }

    if (upgradeId === "satellite") {
      this.tuning.orbiterCount += 1;
      this.rebuildOrbiters();
      return;
    }

    if (upgradeId === "recycler") {
      this.tuning.healOnSecure += 10;
      this.tuning.healOnShard += 1;
      return;
    }

    if (upgradeId === "splitter") {
      this.tuning.boltCount = Math.min(5, this.tuning.boltCount + 2);
      this.tuning.spread = 0.18;
    }
  }

  private rebuildOrbiters(): void {
    this.orbiters = [];

    for (let index = 0; index < this.tuning.orbiterCount; index += 1) {
      this.orbiters.push({
        id: this.nextOrbiterId++,
        position: cloneVector(this.player.position),
        angle: (Math.PI * 2 * index) / Math.max(1, this.tuning.orbiterCount),
        radius: 11,
        orbitDistance: 62 + index * 10,
        hue: 50 + index * 40
      });
    }
  }

  private updateSpawning(dt: number): void {
    this.spawnTimer -= dt;

    if (this.getBoss() && this.spawnTimer <= 0) {
      this.spawnBossSupport();
      this.spawnTimer += 2.6;
      return;
    }

    if (this.anchors.length === 0 || this.spawnTimer > 0) {
      return;
    }

    const targetAnchor = pickRandom(
      this.anchors.filter((anchor) => anchor.status === "charging")
    );

    if (!targetAnchor) {
      return;
    }

    const kind = this.chooseEnemyKind();
    this.spawnEnemy(kind, targetAnchor.position);

    if (this.sector >= 2 && Math.random() < 0.28) {
      this.spawnEnemy("drone", targetAnchor.position);
    }

    const averageProgress = this.getAverageAnchorProgress();
    this.spawnTimer += Math.max(0.52, 1.34 - this.sector * 0.12 - averageProgress * 0.24);
  }

  private chooseEnemyKind(): EnemyKind {
    const roll = Math.random();

    if (this.sector === 1) {
      return roll < 0.72 ? "drone" : "crusher";
    }

    if (this.sector === 2) {
      if (roll < 0.42) {
        return "drone";
      }

      if (roll < 0.72) {
        return "lancer";
      }

      return "crusher";
    }

    if (roll < 0.34) {
      return "drone";
    }

    if (roll < 0.58) {
      return "lancer";
    }

    if (roll < 0.8) {
      return "crusher";
    }

    return "warden";
  }

  private spawnEnemy(kind: EnemyKind, target: Vector2): void {
    const angle = randomBetween(0, Math.PI * 2);
    const spawnDistance = randomBetween(290, 410);
    const spawnPosition = {
      x: clamp(target.x + Math.cos(angle) * spawnDistance, -80, GAME_WIDTH + 80),
      y: clamp(target.y + Math.sin(angle) * spawnDistance, -80, GAME_HEIGHT + 80)
    };

    const enemy = this.createEnemy(kind, spawnPosition);
    this.enemies.push(enemy);
  }

  private spawnBossSupport(): void {
    const boss = this.getBoss();

    if (!boss) {
      return;
    }

    const kind = Math.random() < 0.55 ? "drone" : "lancer";
    this.spawnEnemy(kind, boss.position);
  }

  private createEnemy(kind: EnemyKind, position: Vector2): EnemyRuntime {
    if (kind === "crusher") {
      return {
        id: this.nextEnemyId++,
        kind,
        position,
        velocity: { x: 0, y: 0 },
        radius: 24,
        speed: 102 + this.sector * 8,
        health: 4,
        maxHealth: 4,
        hue: randomBetween(24, 40),
        hitFlash: 0,
        telegraph: 0,
        contactDamage: 19,
        shootCooldown: 0,
        stateTimer: randomBetween(0.8, 1.4),
        mode: "seek",
        orbitAngle: 0,
        storedDirection: { x: 0, y: 1 },
        orbiterCooldown: 0
      };
    }

    if (kind === "lancer") {
      return {
        id: this.nextEnemyId++,
        kind,
        position,
        velocity: { x: 0, y: 0 },
        radius: 16,
        speed: 154 + this.sector * 8,
        health: 2,
        maxHealth: 2,
        hue: randomBetween(312, 344),
        hitFlash: 0,
        telegraph: 0,
        contactDamage: 16,
        shootCooldown: 0,
        stateTimer: randomBetween(0.9, 1.5),
        mode: "seek",
        orbitAngle: 0,
        storedDirection: { x: 0, y: 1 },
        orbiterCooldown: 0
      };
    }

    if (kind === "warden") {
      return {
        id: this.nextEnemyId++,
        kind,
        position,
        velocity: { x: 0, y: 0 },
        radius: 20,
        speed: 132,
        health: 3,
        maxHealth: 3,
        hue: randomBetween(92, 128),
        hitFlash: 0,
        telegraph: 0,
        contactDamage: 15,
        shootCooldown: randomBetween(0.9, 1.4),
        stateTimer: 0,
        mode: "seek",
        orbitAngle: randomBetween(0, Math.PI * 2),
        storedDirection: { x: 0, y: 1 },
        orbiterCooldown: 0
      };
    }

    return {
      id: this.nextEnemyId++,
      kind: "drone",
      position,
      velocity: { x: 0, y: 0 },
      radius: 12,
      speed: 170 + this.sector * 9,
      health: 1,
      maxHealth: 1,
      hue: randomBetween(188, 332),
      hitFlash: 0,
      telegraph: 0,
      contactDamage: 11,
      shootCooldown: 0,
      stateTimer: 0,
      mode: "seek",
      orbitAngle: randomBetween(0, Math.PI * 2),
      storedDirection: { x: 0, y: 1 },
      orbiterCooldown: 0
    };
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.kind === "boss") {
        this.updateBoss(enemy, dt);
      } else if (enemy.kind === "drone") {
        this.updateDrone(enemy, dt);
      } else if (enemy.kind === "crusher") {
        this.updateCrusher(enemy, dt);
      } else if (enemy.kind === "lancer") {
        this.updateLancer(enemy, dt);
      } else {
        this.updateWarden(enemy, dt);
      }

      enemy.position = addVector(enemy.position, scaleVector(enemy.velocity, dt));

      const damping =
        enemy.kind === "crusher"
          ? 0.96
          : enemy.kind === "lancer" && enemy.mode === "charge"
            ? 0.992
            : 0.978;

      enemy.velocity.x *= damping;
      enemy.velocity.y *= damping;
    }
  }

  private updateDrone(enemy: EnemyRuntime, dt: number): void {
    const toPlayer = normalize(subtractVector(this.player.position, enemy.position));
    const tangent = { x: -toPlayer.y, y: toPlayer.x };
    const drift = Math.sin(this.elapsed * 2.6 + enemy.id) * 0.34;
    const desired = normalize(addVector(toPlayer, scaleVector(tangent, drift)));
    this.steerEnemy(enemy, desired, enemy.speed * dt * 3.8);
  }

  private updateCrusher(enemy: EnemyRuntime, dt: number): void {
    const desired = normalize(subtractVector(this.player.position, enemy.position));
    this.steerEnemy(enemy, desired, enemy.speed * dt * 3.1);

    if (enemy.stateTimer <= 0 && distance(enemy.position, this.player.position) < 180) {
      enemy.velocity = addVector(enemy.velocity, scaleVector(desired, 280));
      enemy.stateTimer = 1.3;
      enemy.telegraph = 0.24;
    }
  }

  private updateLancer(enemy: EnemyRuntime, dt: number): void {
    if (enemy.mode === "seek") {
      const toPlayer = normalize(subtractVector(this.player.position, enemy.position));
      const tangent = { x: -toPlayer.y, y: toPlayer.x };
      const desired = normalize(addVector(scaleVector(toPlayer, 0.72), tangent));
      this.steerEnemy(enemy, desired, enemy.speed * dt * 3.2);

      if (enemy.stateTimer <= 0 && distance(enemy.position, this.player.position) < 460) {
        enemy.mode = "windup";
        enemy.stateTimer = 0.56;
        enemy.telegraph = 0.95;
        enemy.storedDirection = normalize(
          subtractVector(this.player.position, enemy.position)
        );
      }

      return;
    }

    if (enemy.mode === "windup") {
      enemy.velocity.x *= 0.86;
      enemy.velocity.y *= 0.86;

      if (enemy.stateTimer <= 0) {
        enemy.mode = "charge";
        enemy.stateTimer = 0.38;
        enemy.velocity = scaleVector(enemy.storedDirection, 820);
        enemy.telegraph = 0.3;
      }

      return;
    }

    if (enemy.mode === "charge") {
      if (enemy.stateTimer <= 0) {
        enemy.mode = "recover";
        enemy.stateTimer = 0.5;
      }

      return;
    }

    enemy.velocity.x *= 0.9;
    enemy.velocity.y *= 0.9;

    if (enemy.stateTimer <= 0) {
      enemy.mode = "seek";
      enemy.stateTimer = randomBetween(1, 1.5);
    }
  }

  private updateWarden(enemy: EnemyRuntime, dt: number): void {
    const activeAnchor = this.findNearestActiveAnchor(enemy.position);

    if (activeAnchor) {
      enemy.orbitAngle += dt * 1.4;
      const orbitOffset = scaleVector(
        directionFromAngle(enemy.orbitAngle),
        activeAnchor.radius * 1.45
      );
      const desiredPoint = addVector(activeAnchor.position, orbitOffset);
      const desired = normalize(subtractVector(desiredPoint, enemy.position));
      this.steerEnemy(enemy, desired, enemy.speed * dt * 4);
    } else {
      const toPlayer = normalize(subtractVector(this.player.position, enemy.position));
      const tangent = { x: -toPlayer.y, y: toPlayer.x };
      const desired = normalize(addVector(toPlayer, scaleVector(tangent, 0.75)));
      this.steerEnemy(enemy, desired, enemy.speed * dt * 3.1);
    }

    if (enemy.shootCooldown <= 0) {
      const direction = normalize(subtractVector(this.player.position, enemy.position));
      this.spawnProjectile({
        owner: "enemy",
        position: enemy.position,
        direction,
        speed: 380,
        damage: 10,
        ttl: 2.2,
        radius: 7,
        hue: enemy.hue,
        scale: 0.92,
        pierce: 0
      });
      enemy.shootCooldown = 1.6;
    }
  }

  private updateBoss(enemy: EnemyRuntime, dt: number): void {
    const healthRatio = enemy.health / enemy.maxHealth;
    const moveTarget = {
      x: GAME_WIDTH / 2 + Math.sin(this.elapsed * 0.6) * 250,
      y: 170 + Math.cos(this.elapsed * 0.82) * 70
    };
    const desired = normalize(subtractVector(moveTarget, enemy.position));
    this.steerEnemy(enemy, desired, enemy.speed * dt * 3.5);

    if (enemy.shootCooldown <= 0) {
      const direction = normalize(subtractVector(this.player.position, enemy.position));
      const volleyCount = healthRatio > 0.66 ? 3 : healthRatio > 0.33 ? 4 : 5;
      const startAngle = -((volleyCount - 1) * 0.12) / 2;

      for (let index = 0; index < volleyCount; index += 1) {
        const spreadDirection = rotateVector(direction, startAngle + index * 0.12);
        this.spawnProjectile({
          owner: "enemy",
          position: enemy.position,
          direction: spreadDirection,
          speed: 440,
          damage: 11,
          ttl: 2.8,
          radius: 9,
          hue: 18,
          scale: 1.08,
          pierce: 0
        });
      }

      enemy.shootCooldown = lerp(1.28, 0.62, 1 - healthRatio);
    }

    if (enemy.stateTimer <= 0) {
      enemy.telegraph = 1.2;
      this.createPulse(enemy.position, 190, 0.32);

      for (let burst = 0; burst < 14; burst += 1) {
        const direction = directionFromAngle((Math.PI * 2 * burst) / 14);
        this.spawnProjectile({
          owner: "enemy",
          position: enemy.position,
          direction,
          speed: 300,
          damage: 9,
          ttl: 3.2,
          radius: 8,
          hue: 24,
          scale: 0.9,
          pierce: 0
        });
      }

      if (healthRatio < 0.72) {
        this.spawnBossSupport();
      }

      enemy.stateTimer = lerp(4.4, 2.15, 1 - healthRatio);
    }
  }

  private steerEnemy(enemy: EnemyRuntime, desired: Vector2, amount: number): void {
    enemy.velocity.x += desired.x * amount;
    enemy.velocity.y += desired.y * amount;
  }

  private spawnProjectile(config: {
    owner: "player" | "enemy";
    position: Vector2;
    direction: Vector2;
    speed: number;
    damage: number;
    ttl: number;
    radius: number;
    hue: number;
    scale: number;
    pierce: number;
  }): void {
    this.projectiles.push({
      id: this.nextProjectileId++,
      owner: config.owner,
      position: addVector(config.position, scaleVector(config.direction, 18)),
      velocity: scaleVector(config.direction, config.speed),
      radius: config.radius,
      ttl: config.ttl,
      hue: config.hue,
      scale: config.scale,
      damage: config.damage,
      pierce: config.pierce
    });
  }

  private updateProjectiles(dt: number): void {
    for (let projectileIndex = this.projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
      const projectile = this.projectiles[projectileIndex];
      projectile.position = addVector(
        projectile.position,
        scaleVector(projectile.velocity, dt)
      );
      projectile.ttl -= dt;

      const outsideArena =
        projectile.position.x < -100 ||
        projectile.position.x > GAME_WIDTH + 100 ||
        projectile.position.y < -100 ||
        projectile.position.y > GAME_HEIGHT + 100;

      if (projectile.ttl <= 0 || outsideArena) {
        this.projectiles.splice(projectileIndex, 1);
        continue;
      }

      if (projectile.owner === "player") {
        let removeProjectile = false;

        for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = this.enemies[enemyIndex];

          if (
            distance(projectile.position, enemy.position) >
            projectile.radius + enemy.radius
          ) {
            continue;
          }

          const direction = normalize(
            subtractVector(enemy.position, projectile.position)
          );
          this.damageEnemy(enemyIndex, projectile.damage, direction);
          projectile.pierce -= 1;

          if (projectile.pierce < 0) {
            removeProjectile = true;
            break;
          }
        }

        if (removeProjectile) {
          this.projectiles.splice(projectileIndex, 1);
        }

        continue;
      }

      if (
        distance(projectile.position, this.player.position) <=
        projectile.radius + this.player.radius
      ) {
        const direction = normalize(
          subtractVector(this.player.position, projectile.position)
        );

        if (this.player.dashTimer > 0) {
          this.projectiles.splice(projectileIndex, 1);
          continue;
        }

        if (this.player.invulnerability <= 0) {
          this.applyPlayerHit(projectile.damage, direction);
        }

        this.projectiles.splice(projectileIndex, 1);
      }
    }
  }

  private updateOrbiters(dt: number): void {
    for (let orbiterIndex = 0; orbiterIndex < this.orbiters.length; orbiterIndex += 1) {
      const orbiter = this.orbiters[orbiterIndex];
      orbiter.angle += dt * (2.2 + orbiterIndex * 0.1);
      orbiter.position = addVector(
        this.player.position,
        scaleVector(directionFromAngle(orbiter.angle), orbiter.orbitDistance)
      );

      for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = this.enemies[enemyIndex];

        if (
          enemy.orbiterCooldown > 0 ||
          distance(orbiter.position, enemy.position) > orbiter.radius + enemy.radius
        ) {
          continue;
        }

        enemy.orbiterCooldown = 0.3;
        const direction = normalize(
          subtractVector(enemy.position, orbiter.position)
        );
        this.damageEnemy(enemyIndex, 1, direction);
      }
    }
  }

  private resolveEnemyBodyCollisions(): void {
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = this.enemies[enemyIndex];

      if (
        distance(enemy.position, this.player.position) >
        enemy.radius + this.player.radius
      ) {
        continue;
      }

      const direction = normalize(
        subtractVector(enemy.position, this.player.position)
      );

      if (this.player.dashTimer > 0) {
        this.damageEnemy(enemyIndex, this.tuning.dashImpactDamage, direction);
        continue;
      }

      if (this.player.invulnerability <= 0) {
        this.applyPlayerHit(enemy.contactDamage, scaleVector(direction, -1));
      }
    }
  }

  private updateShards(dt: number): void {
    for (let shardIndex = this.shards.length - 1; shardIndex >= 0; shardIndex -= 1) {
      const shard = this.shards[shardIndex];
      const toPlayer = subtractVector(this.player.position, shard.position);
      const dist = Math.max(1, length(toPlayer));

      if (dist < 190) {
        const magnet = scaleVector(normalize(toPlayer), lerp(80, 560, 1 - dist / 190));
        shard.velocity.x += magnet.x * dt;
        shard.velocity.y += magnet.y * dt;
      }

      shard.position = addVector(shard.position, scaleVector(shard.velocity, dt));
      shard.velocity.x *= 0.985;
      shard.velocity.y *= 0.985;
      shard.ttl -= dt;

      if (dist <= shard.radius + this.player.radius + 10) {
        this.collectShard(shardIndex);
        continue;
      }

      if (shard.ttl <= 0) {
        this.shards.splice(shardIndex, 1);
      }
    }
  }

  private collectShard(shardIndex: number): void {
    this.shards.splice(shardIndex, 1);
    this.combo += 1;
    this.bestChain = Math.max(this.bestChain, this.combo);
    this.comboTimer = COMBO_TIMEOUT;
    this.score += 70 * this.getMultiplier();
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - 0.08);
    this.player.pulseCooldown = Math.max(0, this.player.pulseCooldown - 0.12);
    this.player.health = clamp(
      this.player.health + this.tuning.healOnShard,
      0,
      this.player.maxHealth
    );
  }

  private updateCombo(dt: number): void {
    if (this.combo <= 0) {
      this.comboTimer = 0;
      return;
    }

    this.comboTimer -= dt;

    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
  }

  private applyPlayerHit(damage: number, direction: Vector2): void {
    this.player.health = Math.max(0, this.player.health - damage);
    this.player.invulnerability = HIT_INVULNERABILITY;
    this.combo = Math.max(0, this.combo - 3);
    this.comboTimer = Math.min(this.comboTimer, 1.4);
    this.player.velocity.x += direction.x * 230;
    this.player.velocity.y += direction.y * 230;
    this.createPulse(this.player.position, 100, 0.2);
  }

  private damageEnemy(index: number, damage: number, direction: Vector2): void {
    const enemy = this.enemies[index];

    if (!enemy) {
      return;
    }

    enemy.health -= damage;
    enemy.hitFlash = 1;
    enemy.velocity.x += direction.x * 190;
    enemy.velocity.y += direction.y * 190;

    if (enemy.health > 0) {
      return;
    }

    if (enemy.kind === "boss") {
      this.killCount += 1;
      this.score += 8000;
      this.createPulse(enemy.position, 420, 0.66);
      this.enemies.splice(index, 1);
      this.phase = "won";
      return;
    }

    this.killCount += 1;
    this.combo += 1;
    this.bestChain = Math.max(this.bestChain, this.combo);
    this.comboTimer = COMBO_TIMEOUT;
    this.score += this.getEnemyScore(enemy.kind) * this.getMultiplier();
    this.spawnShards(
      enemy.position,
      enemy.kind === "crusher" ? 3 : enemy.kind === "warden" ? 2 : 1
    );
    this.enemies.splice(index, 1);
  }

  private getEnemyScore(kind: EnemyKind): number {
    if (kind === "crusher") {
      return 260;
    }

    if (kind === "lancer") {
      return 210;
    }

    if (kind === "warden") {
      return 320;
    }

    return 135;
  }

  private spawnShards(origin: Vector2, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(90, 220);
      this.shards.push({
        id: this.nextShardId++,
        position: cloneVector(origin),
        velocity: scaleVector(directionFromAngle(angle), speed),
        radius: 8,
        ttl: 9
      });
    }
  }

  private clearCombatField(): void {
    this.enemies = [];
    this.projectiles = [];
    this.shards = [];
    this.createPulse({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }, 260, 0.4);
  }

  private createPulse(position: Vector2, maxRadius: number, duration: number): void {
    this.pulses.push({
      id: this.nextPulseId++,
      position: cloneVector(position),
      radius: 20,
      maxRadius,
      age: 0,
      duration
    });
  }

  private findNearestActiveAnchor(position: Vector2): AnchorState | undefined {
    const activeAnchors = this.anchors.filter((anchor) => anchor.status === "charging");

    if (activeAnchors.length === 0) {
      return undefined;
    }

    return activeAnchors.reduce((closest, anchor) =>
      distance(anchor.position, position) < distance(closest.position, position)
        ? anchor
        : closest
    );
  }

  private getAverageAnchorProgress(): number {
    const activeAnchors = this.anchors.filter((anchor) => anchor.status === "charging");

    if (activeAnchors.length === 0) {
      return 1;
    }

    const total = activeAnchors.reduce(
      (sum, anchor) => sum + anchor.progress / anchor.required,
      0
    );

    return total / activeAnchors.length;
  }

  private getBoss(): EnemyRuntime | undefined {
    return this.enemies.find((enemy) => enemy.kind === "boss");
  }

  private getMultiplier(): number {
    return 1 + Math.floor(this.combo / 4) * 0.25;
  }

  private getObjective(): { title: string; detail: string } {
    if (this.phase === "ready") {
      return {
        title: "Stabilize the anchor lattice",
        detail:
          "Secure two anchors per sector, draft one protocol between sectors, then fracture the Overseer."
      };
    }

    if (this.phase === "draft") {
      return {
        title: "Choose a protocol shift",
        detail:
          "The sector is stable. Pick one upgrade to bend the rest of the run around your strengths."
      };
    }

    if (this.getBoss()) {
      return {
        title: "Fracture the Overseer",
        detail:
          "Track the core with mouse aim, keep moving through the needle volleys, and only spend pulse when the arena closes."
      };
    }

    const sectorAnchorIndex =
      this.anchors.filter((anchor) => anchor.status === "secured").length;

    return {
      title: "Secure the live anchors",
      detail: `Sector ${this.sector} / ${SECTOR_COUNT} • ${sectorAnchorIndex} / ${ANCHORS_PER_SECTOR} anchor clusters stabilized`
    };
  }

  private getThreatLevel(): number {
    const boss = this.getBoss();

    if (boss) {
      return 0.58 + (1 - boss.health / boss.maxHealth) * 0.42;
    }

    let weight = 0;

    for (const enemy of this.enemies) {
      if (enemy.kind === "crusher") {
        weight += 2.3;
      } else if (enemy.kind === "lancer") {
        weight += 1.9;
      } else if (enemy.kind === "warden") {
        weight += 2.6;
      } else {
        weight += 1;
      }
    }

    weight += this.projectiles.filter((projectile) => projectile.owner === "enemy").length * 0.18;

    return clamp(weight / (4 + this.sector * 3.4), 0.08, 1);
  }

  private getBossStatus(): BossStatus | undefined {
    const boss = this.getBoss();

    if (!boss) {
      return undefined;
    }

    const ratio = boss.health / boss.maxHealth;

    return {
      health: boss.health,
      maxHealth: boss.maxHealth,
      label: "Overseer",
      phase: ratio > 0.66 ? "Phase One" : ratio > 0.33 ? "Phase Two" : "Phase Three"
    };
  }

  private getSummary(): RoundSummary {
    const score = Math.round(this.score);

    return {
      verdict:
        this.phase === "won"
          ? "The lattice held. The Overseer lost the sector map."
          : "The prism collapsed before the lattice could stabilize.",
      rank: formatRank(score),
      score,
      sector: Math.min(this.sector, SECTOR_COUNT),
      bestChain: this.bestChain,
      anchorsSecured: this.anchorsSecured,
      killCount: this.killCount,
      upgrades: this.selectedUpgrades.length,
      elapsed: Math.round(this.elapsed)
    };
  }

  private getSnapshot(): Snapshot {
    const objective = this.getObjective();

    return {
      phase: this.phase,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      elapsed: this.elapsed,
      score: this.score,
      combo: this.combo,
      multiplier: this.getMultiplier(),
      bestChain: this.bestChain,
      killCount: this.killCount,
      sector: this.sector,
      totalSectors: SECTOR_COUNT,
      anchorsSecured: this.anchorsSecured,
      anchorsTotal: SECTOR_COUNT * ANCHORS_PER_SECTOR,
      objectiveTitle: objective.title,
      objectiveDetail: objective.detail,
      threatLevel: this.getThreatLevel(),
      player: {
        ...this.player,
        dashCooldownMax: this.tuning.dashCooldown,
        pulseCooldownMax: this.tuning.pulseCooldown,
        primaryCooldownMax: this.tuning.fireInterval,
        position: cloneVector(this.player.position),
        velocity: cloneVector(this.player.velocity)
      },
      enemies: this.enemies.map((enemy) => ({
        id: enemy.id,
        kind: enemy.kind,
        position: cloneVector(enemy.position),
        velocity: cloneVector(enemy.velocity),
        radius: enemy.radius,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        hue: enemy.hue,
        hitFlash: enemy.hitFlash,
        telegraph: enemy.telegraph
      })),
      anchors: this.anchors.map((anchor) => ({
        ...anchor,
        position: cloneVector(anchor.position)
      })),
      projectiles: this.projectiles.map((projectile) => ({
        id: projectile.id,
        owner: projectile.owner,
        position: cloneVector(projectile.position),
        velocity: cloneVector(projectile.velocity),
        radius: projectile.radius,
        ttl: projectile.ttl,
        hue: projectile.hue,
        scale: projectile.scale
      })),
      shards: this.shards.map((shard) => ({
        ...shard,
        position: cloneVector(shard.position),
        velocity: cloneVector(shard.velocity)
      })),
      pulses: this.pulses.map((pulse) => ({
        ...pulse,
        position: cloneVector(pulse.position)
      })),
      orbiters: this.orbiters.map((orbiter) => ({
        ...orbiter,
        position: cloneVector(orbiter.position)
      })),
      draftOptions: this.draftOptions.map((option) => ({ ...option })),
      selectedUpgrades: this.selectedUpgrades.map((option) => ({ ...option })),
      boss: this.getBossStatus(),
      summary: this.getSummary()
    };
  }
}
