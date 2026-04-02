import Phaser from "phaser";

import type { InputController } from "../input";
import type { PulsePrismSimulation } from "../simulation/PulsePrismSimulation";
import type { EnemyState, Snapshot } from "../types";
import { generateTextures, TEXTURES } from "./generateTextures";

type SnapshotListener = (snapshot: Snapshot) => void;

interface SceneDeps {
  input: InputController;
  simulation: PulsePrismSimulation;
  onSnapshot: SnapshotListener;
}

function tintFromHue(hue: number): number {
  return Phaser.Display.Color.HSLToColor(hue / 360, 0.85, 0.62).color;
}

export class GameScene extends Phaser.Scene {
  private readonly deps: SceneDeps;
  private readonly enemies = new Map<number, Phaser.GameObjects.Image>();
  private readonly shards = new Map<number, Phaser.GameObjects.Image>();
  private readonly pulses = new Map<number, Phaser.GameObjects.Image>();
  private readonly trail: Array<{ x: number; y: number; life: number }> = [];

  private trailGraphics?: Phaser.GameObjects.Graphics;
  private arenaGlow?: Phaser.GameObjects.Graphics;
  private playerAura?: Phaser.GameObjects.Image;
  private playerSprite?: Phaser.GameObjects.Image;
  private latestSnapshot?: Snapshot;

  constructor(deps: SceneDeps) {
    super("game");
    this.deps = deps;
  }

  create(): void {
    generateTextures(this);

    this.cameras.main.setBackgroundColor("#040817");
    this.drawBackdrop();

    this.trailGraphics = this.add.graphics();
    this.playerAura = this.add.image(0, 0, TEXTURES.aura).setBlendMode(Phaser.BlendModes.ADD);
    this.playerSprite = this.add.image(0, 0, TEXTURES.player).setScale(0.58);
    this.playerSprite.setBlendMode(Phaser.BlendModes.SCREEN);

    this.latestSnapshot = this.deps.simulation.step(
      {
        moveX: 0,
        moveY: 0,
        dashPressed: false,
        pulsePressed: false
      },
      0
    );
    this.sync(this.latestSnapshot);
  }

  update(_time: number, delta: number): void {
    const snapshot = this.deps.simulation.step(this.deps.input.sample(), delta / 1000);
    this.latestSnapshot = snapshot;
    this.sync(snapshot);
  }

  private drawBackdrop(): void {
    const background = this.add.graphics();

    background.fillStyle(0x07111d, 1);
    background.fillRect(0, 0, 960, 540);

    background.lineStyle(1, 0x123251, 0.32);
    for (let x = 24; x < 960; x += 48) {
      background.lineBetween(x, 24, x, 516);
    }
    for (let y = 24; y < 540; y += 48) {
      background.lineBetween(24, y, 936, y);
    }

    background.fillStyle(0x55f7ff, 0.08);
    background.fillCircle(180, 120, 130);
    background.fillStyle(0xff5ecf, 0.08);
    background.fillCircle(760, 420, 160);

    this.arenaGlow = this.add.graphics();
    this.arenaGlow.lineStyle(2, 0x7bf6ff, 0.45);
    this.arenaGlow.strokeRoundedRect(22, 22, 916, 496, 24);
    this.arenaGlow.lineStyle(1, 0xff5ecf, 0.2);
    this.arenaGlow.strokeRoundedRect(14, 14, 932, 512, 30);
  }

  private sync(snapshot: Snapshot): void {
    this.syncTrail(snapshot);
    this.syncPlayer(snapshot);
    this.syncEnemies(snapshot.enemies);
    this.syncShards(snapshot);
    this.syncPulses(snapshot);
    this.deps.onSnapshot(snapshot);
  }

  private syncPlayer(snapshot: Snapshot): void {
    if (!this.playerSprite || !this.playerAura) {
      return;
    }

    const player = snapshot.player;
    const spin = snapshot.elapsed * 80;
    const blink = player.invulnerability > 0 ? 0.55 + Math.sin(snapshot.elapsed * 26) * 0.25 : 0;

    this.playerSprite.setPosition(player.position.x, player.position.y);
    this.playerSprite.setAngle(spin);
    this.playerSprite.setTint(0x7bf6ff);
    this.playerSprite.setAlpha(1 - blink * 0.5);

    this.playerAura.setPosition(player.position.x, player.position.y);
    this.playerAura.setScale(player.dashTimer > 0 ? 1.15 : 0.92);
    this.playerAura.setTint(player.dashTimer > 0 ? 0xff8de2 : 0x59f4ff);
    this.playerAura.setAlpha(player.dashTimer > 0 ? 0.95 : 0.68);
  }

  private syncEnemies(enemies: EnemyState[]): void {
    const active = new Set<number>();

    for (const enemy of enemies) {
      active.add(enemy.id);

      let sprite = this.enemies.get(enemy.id);

      if (!sprite) {
        sprite = this.add.image(
          enemy.position.x,
          enemy.position.y,
          enemy.kind === "crusher" ? TEXTURES.crusher : TEXTURES.drone
        );
        sprite.setBlendMode(Phaser.BlendModes.SCREEN);
        this.enemies.set(enemy.id, sprite);
      }

      sprite.setPosition(enemy.position.x, enemy.position.y);
      sprite.setScale(enemy.kind === "crusher" ? 0.72 : 0.58);
      sprite.setTint(tintFromHue(enemy.hue));
      sprite.setAlpha(enemy.hitFlash > 0 ? 1 : 0.95);
      sprite.setAngle(enemy.kind === "crusher" ? enemy.position.x * 0.08 : enemy.position.y * 0.16);
    }

    for (const [id, sprite] of this.enemies.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.enemies.delete(id);
    }
  }

  private syncShards(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const shard of snapshot.shards) {
      active.add(shard.id);

      let sprite = this.shards.get(shard.id);

      if (!sprite) {
        sprite = this.add.image(shard.position.x, shard.position.y, TEXTURES.shard);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.shards.set(shard.id, sprite);
      }

      sprite.setPosition(shard.position.x, shard.position.y);
      sprite.setScale(0.45);
      sprite.setTint(0xffd86b);
      sprite.setAlpha(Math.min(1, shard.ttl));
      sprite.setAngle(snapshot.elapsed * 240 + shard.id * 12);
    }

    for (const [id, sprite] of this.shards.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.shards.delete(id);
    }
  }

  private syncPulses(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const pulse of snapshot.pulses) {
      active.add(pulse.id);

      let sprite = this.pulses.get(pulse.id);

      if (!sprite) {
        sprite = this.add.image(pulse.position.x, pulse.position.y, TEXTURES.ring);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.pulses.set(pulse.id, sprite);
      }

      const progress = pulse.age / pulse.duration;
      const radiusBase = 56;

      sprite.setPosition(pulse.position.x, pulse.position.y);
      sprite.setScale(pulse.radius / radiusBase);
      sprite.setTint(progress < 0.35 ? 0x8ff8ff : 0xff8de2);
      sprite.setAlpha(0.85 - progress * 0.75);
    }

    for (const [id, sprite] of this.pulses.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.pulses.delete(id);
    }
  }

  private syncTrail(snapshot: Snapshot): void {
    if (!this.trailGraphics) {
      return;
    }

    if (snapshot.phase === "running") {
      this.trail.unshift({
        x: snapshot.player.position.x,
        y: snapshot.player.position.y,
        life: snapshot.player.dashTimer > 0 ? 1.1 : 0.8
      });
    }

    this.trail.splice(12);

    this.trailGraphics.clear();

    for (const trailPoint of this.trail) {
      trailPoint.life -= 0.09;
    }

    for (let index = this.trail.length - 1; index >= 0; index -= 1) {
      const trailPoint = this.trail[index];

      if (trailPoint.life <= 0) {
        this.trail.splice(index, 1);
        continue;
      }

      this.trailGraphics.fillStyle(index === 0 ? 0x7bf6ff : 0xff72dd, trailPoint.life * 0.18);
      this.trailGraphics.fillCircle(
        trailPoint.x,
        trailPoint.y,
        24 * trailPoint.life
      );
    }
  }
}

