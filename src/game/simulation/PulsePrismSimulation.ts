import {
  ARENA_PADDING,
  COMBO_TIMEOUT,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  HIT_INVULNERABILITY,
  PLAYER_DRAG,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PULSE_COOLDOWN,
  PULSE_DAMAGE_RADIUS,
  PULSE_PUSH_RADIUS,
  ROUND_DURATION,
  WAVE_LENGTH
} from "../config";
import type {
  EnemyKind,
  EnemyState,
  GamePhase,
  InputFrame,
  PlayerState,
  PulseState,
  RoundSummary,
  ShardState,
  Snapshot,
  Vector2
} from "../types";

const FIXED_STEP_MAX = 1 / 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
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

function cloneVector(vector: Vector2): Vector2 {
  return {
    x: vector.x,
    y: vector.y
  };
}

function scaleVector(vector: Vector2, scalar: number): Vector2 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar
  };
}

function addVector(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

function randomBetween(min: number, max: number): number {
  return lerp(min, max, Math.random());
}

function formatRank(score: number): string {
  if (score >= 9_500) {
    return "S";
  }

  if (score >= 7_500) {
    return "A";
  }

  if (score >= 5_500) {
    return "B";
  }

  if (score >= 3_500) {
    return "C";
  }

  return "D";
}

export class PulsePrismSimulation {
  private phase: GamePhase = "ready";
  private elapsed = 0;
  private timeLeft = ROUND_DURATION;
  private wave = 1;
  private score = 0;
  private combo = 0;
  private bestChain = 0;
  private killCount = 0;
  private comboTimer = 0;
  private spawnTimer = 0.8;
  private nextEnemyId = 1;
  private nextShardId = 1;
  private nextPulseId = 1;
  private lastMove: Vector2 = { x: 0, y: -1 };

  private player: PlayerState = this.createPlayer();
  private enemies: EnemyState[] = [];
  private shards: ShardState[] = [];
  private pulses: PulseState[] = [];

  startRound(): void {
    this.reset();
    this.phase = "running";
  }

  step(input: InputFrame, deltaSeconds: number): Snapshot {
    const dt = Math.min(deltaSeconds, FIXED_STEP_MAX);

    this.updateVisualTimers(dt);

    if (this.phase !== "running") {
      return this.getSnapshot();
    }

    this.elapsed += dt;
    this.timeLeft = clamp(ROUND_DURATION - this.elapsed, 0, ROUND_DURATION);
    this.wave = Math.max(1, Math.floor(this.elapsed / WAVE_LENGTH) + 1);
    this.score += dt * (12 + this.wave * 0.8);

    this.updatePlayer(input, dt);
    this.updateEnemies(dt);
    this.resolveCollisions();
    this.updateShards(dt);
    this.updateCombo(dt);
    this.updateSpawning(dt);

    if (this.timeLeft <= 0) {
      this.phase = "won";
    }

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.phase = "lost";
    }

    return this.getSnapshot();
  }

  private reset(): void {
    this.phase = "ready";
    this.elapsed = 0;
    this.timeLeft = ROUND_DURATION;
    this.wave = 1;
    this.score = 0;
    this.combo = 0;
    this.bestChain = 0;
    this.killCount = 0;
    this.comboTimer = 0;
    this.spawnTimer = 0.8;
    this.nextEnemyId = 1;
    this.nextShardId = 1;
    this.nextPulseId = 1;
    this.lastMove = { x: 0, y: -1 };
    this.player = this.createPlayer();
    this.enemies = [];
    this.shards = [];
    this.pulses = [];
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
      pulseCooldown: 0,
      invulnerability: 0
    };
  }

  private updatePlayer(input: InputFrame, dt: number): void {
    const player = this.player;
    const movement = normalize({ x: input.moveX, y: input.moveY });

    if (movement.x !== 0 || movement.y !== 0) {
      this.lastMove = movement;
    }

    if (input.dashPressed && player.dashCooldown <= 0) {
      const direction =
        movement.x !== 0 || movement.y !== 0 ? movement : this.lastMove;

      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      player.invulnerability = Math.max(player.invulnerability, DASH_DURATION);
      player.velocity = scaleVector(direction, DASH_SPEED);
      this.createPulse(player.position, 110, 0.22);
    }

    if (input.pulsePressed && player.pulseCooldown <= 0) {
      player.pulseCooldown = PULSE_COOLDOWN;
      this.emitPulseBlast();
    }

    if (player.dashTimer > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt);
      player.position = addVector(player.position, scaleVector(player.velocity, dt));
    } else {
      const targetVelocity = scaleVector(movement, PLAYER_SPEED);
      player.velocity = {
        x: lerp(player.velocity.x, targetVelocity.x, 1 - PLAYER_DRAG),
        y: lerp(player.velocity.y, targetVelocity.y, 1 - PLAYER_DRAG)
      };
      player.position = addVector(player.position, scaleVector(player.velocity, dt));
    }

    player.position.x = clamp(
      player.position.x,
      ARENA_PADDING,
      GAME_WIDTH - ARENA_PADDING
    );
    player.position.y = clamp(
      player.position.y,
      ARENA_PADDING,
      GAME_HEIGHT - ARENA_PADDING
    );
  }

  private emitPulseBlast(): void {
    const center = cloneVector(this.player.position);
    this.createPulse(center, PULSE_PUSH_RADIUS, 0.36);

    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const delta = {
        x: enemy.position.x - center.x,
        y: enemy.position.y - center.y
      };
      const dist = Math.max(1, length(delta));
      const direction = normalize(delta);

      if (dist <= PULSE_PUSH_RADIUS) {
        const pushStrength = lerp(510, 120, dist / PULSE_PUSH_RADIUS);
        enemy.velocity.x += direction.x * pushStrength;
        enemy.velocity.y += direction.y * pushStrength;
      }

      if (dist <= PULSE_DAMAGE_RADIUS) {
        const damage = enemy.kind === "crusher" ? 1 : 99;
        this.damageEnemy(index, damage, direction);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const player = this.player;

    for (const enemy of this.enemies) {
      const toPlayer = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y
      });
      const tangent = { x: -toPlayer.y, y: toPlayer.x };
      const swirl = enemy.kind === "drone" ? Math.sin(this.elapsed * 3 + enemy.id) * 0.35 : 0;
      const desired = normalize({
        x: toPlayer.x + tangent.x * swirl,
        y: toPlayer.y + tangent.y * swirl
      });
      const acceleration = enemy.kind === "crusher" ? 0.7 : 1;

      enemy.velocity.x += desired.x * enemy.speed * acceleration * dt * 3.2;
      enemy.velocity.y += desired.y * enemy.speed * acceleration * dt * 3.2;

      const maxSpeed = enemy.kind === "crusher" ? enemy.speed * 1.12 : enemy.speed * 1.24;
      const currentSpeed = length(enemy.velocity);

      if (currentSpeed > maxSpeed) {
        const limited = scaleVector(normalize(enemy.velocity), maxSpeed);
        enemy.velocity.x = limited.x;
        enemy.velocity.y = limited.y;
      }

      enemy.position = addVector(enemy.position, scaleVector(enemy.velocity, dt));
      enemy.velocity.x *= enemy.kind === "crusher" ? 0.96 : 0.975;
      enemy.velocity.y *= enemy.kind === "crusher" ? 0.96 : 0.975;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
    }
  }

  private resolveCollisions(): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      const hitDistance = enemy.radius + this.player.radius;

      if (distance(enemy.position, this.player.position) > hitDistance) {
        continue;
      }

      if (this.player.dashTimer > 0) {
        const push = normalize({
          x: enemy.position.x - this.player.position.x,
          y: enemy.position.y - this.player.position.y
        });
        const damage = enemy.kind === "crusher" ? 2 : 99;
        this.damageEnemy(index, damage, push);
        continue;
      }

      if (this.player.invulnerability <= 0) {
        const damage = enemy.kind === "crusher" ? 26 : 14;
        this.player.health = Math.max(0, this.player.health - damage);
        this.player.invulnerability = HIT_INVULNERABILITY;
        this.combo = Math.max(0, this.combo - 2);
        this.comboTimer = Math.min(this.comboTimer, 1.2);

        const retreat = normalize({
          x: this.player.position.x - enemy.position.x,
          y: this.player.position.y - enemy.position.y
        });
        this.player.velocity.x += retreat.x * 260;
        this.player.velocity.y += retreat.y * 260;
        enemy.velocity.x -= retreat.x * 320;
        enemy.velocity.y -= retreat.y * 320;
      }
    }
  }

  private updateShards(dt: number): void {
    for (let index = this.shards.length - 1; index >= 0; index -= 1) {
      const shard = this.shards[index];
      const toPlayer = {
        x: this.player.position.x - shard.position.x,
        y: this.player.position.y - shard.position.y
      };
      const dist = Math.max(1, length(toPlayer));

      if (dist < 160) {
        const magnet = scaleVector(normalize(toPlayer), lerp(55, 520, 1 - dist / 160));
        shard.velocity.x += magnet.x * dt;
        shard.velocity.y += magnet.y * dt;
      }

      shard.position = addVector(shard.position, scaleVector(shard.velocity, dt));
      shard.velocity.x *= 0.985;
      shard.velocity.y *= 0.985;
      shard.ttl -= dt;

      if (dist <= this.player.radius + shard.radius + 4) {
        this.collectShard(index);
        continue;
      }

      if (shard.ttl <= 0) {
        this.shards.splice(index, 1);
      }
    }
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

  private updateSpawning(dt: number): void {
    this.spawnTimer -= dt;

    while (this.spawnTimer <= 0) {
      this.spawnEnemy();

      if (this.wave >= 4 && Math.random() < 0.16) {
        this.spawnEnemy();
      }

      const intervalFloor = clamp(0.4, 0.4, 1.2);
      const interval = Math.max(intervalFloor, 1.28 - this.wave * 0.095);
      this.spawnTimer += interval;
    }
  }

  private spawnEnemy(): void {
    const side = Math.floor(Math.random() * 4);
    const inset = 24;
    let position: Vector2;

    if (side === 0) {
      position = { x: randomBetween(0, GAME_WIDTH), y: -inset };
    } else if (side === 1) {
      position = { x: GAME_WIDTH + inset, y: randomBetween(0, GAME_HEIGHT) };
    } else if (side === 2) {
      position = { x: randomBetween(0, GAME_WIDTH), y: GAME_HEIGHT + inset };
    } else {
      position = { x: -inset, y: randomBetween(0, GAME_HEIGHT) };
    }

    const kind: EnemyKind =
      this.wave >= 3 && Math.random() < Math.min(0.36, 0.12 + this.wave * 0.035)
        ? "crusher"
        : "drone";

    const enemy: EnemyState =
      kind === "crusher"
        ? {
            id: this.nextEnemyId,
            kind,
            position,
            velocity: { x: 0, y: 0 },
            radius: 22,
            speed: randomBetween(82, 96) + this.wave * 4,
            health: 3,
            maxHealth: 3,
            hue: randomBetween(22, 42),
            hitFlash: 0
          }
        : {
            id: this.nextEnemyId,
            kind,
            position,
            velocity: { x: 0, y: 0 },
            radius: 12,
            speed: randomBetween(120, 148) + this.wave * 6,
            health: 1,
            maxHealth: 1,
            hue: randomBetween(178, 332),
            hitFlash: 0
          };

    this.nextEnemyId += 1;
    this.enemies.push(enemy);
  }

  private damageEnemy(index: number, damage: number, direction: Vector2): void {
    const enemy = this.enemies[index];

    if (!enemy) {
      return;
    }

    enemy.health -= damage;
    enemy.hitFlash = 1;
    enemy.velocity.x += direction.x * 180;
    enemy.velocity.y += direction.y * 180;

    if (enemy.health > 0) {
      return;
    }

    const bonus = enemy.kind === "crusher" ? 320 : 145;
    this.killCount += 1;
    this.score += bonus * this.getMultiplier();
    this.spawnShards(enemy.position, enemy.kind === "crusher" ? 3 : 1);
    this.enemies.splice(index, 1);
  }

  private spawnShards(origin: Vector2, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(70, 210);

      this.shards.push({
        id: this.nextShardId,
        position: cloneVector(origin),
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        radius: 8,
        ttl: 8.5
      });

      this.nextShardId += 1;
    }
  }

  private collectShard(index: number): void {
    this.shards.splice(index, 1);
    this.combo += 1;
    this.bestChain = Math.max(this.bestChain, this.combo);
    this.comboTimer = COMBO_TIMEOUT;
    this.score += 65 * this.getMultiplier();
    this.player.pulseCooldown = Math.max(0, this.player.pulseCooldown - 0.08);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - 0.06);
  }

  private createPulse(position: Vector2, maxRadius: number, duration: number): void {
    this.pulses.push({
      id: this.nextPulseId,
      position: cloneVector(position),
      radius: 18,
      maxRadius,
      age: 0,
      duration
    });

    this.nextPulseId += 1;
  }

  private updateVisualTimers(dt: number): void {
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.pulseCooldown = Math.max(0, this.player.pulseCooldown - dt);

    for (let index = this.pulses.length - 1; index >= 0; index -= 1) {
      const pulse = this.pulses[index];
      pulse.age += dt;
      const progress = clamp(pulse.age / pulse.duration, 0, 1);
      pulse.radius = lerp(18, pulse.maxRadius, progress);

      if (progress >= 1) {
        this.pulses.splice(index, 1);
      }
    }
  }

  private getMultiplier(): number {
    return 1 + Math.floor(this.combo / 4) * 0.25;
  }

  private getSummary(): RoundSummary {
    const score = Math.round(this.score);

    return {
      verdict:
        this.phase === "won"
          ? "The prism held through the blackout."
          : "The lattice fractured before extraction.",
      rank: formatRank(score),
      score,
      wave: this.wave,
      bestChain: this.bestChain,
      survivalTime: Math.round(this.elapsed)
    };
  }

  private getSnapshot(): Snapshot {
    return {
      phase: this.phase,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      elapsed: this.elapsed,
      timeLeft: this.timeLeft,
      wave: this.wave,
      score: this.score,
      combo: this.combo,
      multiplier: this.getMultiplier(),
      killCount: this.killCount,
      player: {
        ...this.player,
        position: cloneVector(this.player.position),
        velocity: cloneVector(this.player.velocity)
      },
      enemies: this.enemies.map((enemy) => ({
        ...enemy,
        position: cloneVector(enemy.position),
        velocity: cloneVector(enemy.velocity)
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
      summary: this.getSummary()
    };
  }
}

