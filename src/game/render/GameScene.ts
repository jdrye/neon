import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import type { InputController } from "../input";
import type { PulsePrismSimulation } from "../simulation/PulsePrismSimulation";
import type { EnemyKind, Snapshot } from "../types";
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

function enemyScale(kind: EnemyKind): number {
  if (kind === "boss") {
    return 1;
  }

  if (kind === "crusher") {
    return 0.82;
  }

  if (kind === "warden") {
    return 0.84;
  }

  if (kind === "lancer") {
    return 0.8;
  }

  return 0.62;
}

function enemyTexture(kind: EnemyKind): string {
  if (kind === "boss") {
    return TEXTURES.boss;
  }

  if (kind === "crusher") {
    return TEXTURES.crusher;
  }

  if (kind === "warden") {
    return TEXTURES.warden;
  }

  if (kind === "lancer") {
    return TEXTURES.lancer;
  }

  return TEXTURES.drone;
}

export class GameScene extends Phaser.Scene {
  private readonly deps: SceneDeps;
  private readonly enemies = new Map<number, Phaser.GameObjects.Image>();
  private readonly anchors = new Map<number, Phaser.GameObjects.Image>();
  private readonly projectiles = new Map<number, Phaser.GameObjects.Image>();
  private readonly shards = new Map<number, Phaser.GameObjects.Image>();
  private readonly pulses = new Map<number, Phaser.GameObjects.Image>();
  private readonly orbiters = new Map<number, Phaser.GameObjects.Image>();
  private readonly trail: Array<{ x: number; y: number; life: number; radius: number }> = [];
  private readonly seenPulses = new Set<number>();

  private anchorGraphics?: Phaser.GameObjects.Graphics;
  private trailGraphics?: Phaser.GameObjects.Graphics;
  private reticleGraphics?: Phaser.GameObjects.Graphics;
  private playerAura?: Phaser.GameObjects.Image;
  private playerSprite?: Phaser.GameObjects.Image;
  private latestSnapshot?: Snapshot;

  constructor(deps: SceneDeps) {
    super("game");
    this.deps = deps;
  }

  create(): void {
    generateTextures(this);

    this.cameras.main.setBackgroundColor("#050911");
    this.drawBackdrop();

    this.anchorGraphics = this.add.graphics().setDepth(2);
    this.trailGraphics = this.add.graphics().setDepth(4);
    this.playerAura = this.add
      .image(0, 0, TEXTURES.aura)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(5);
    this.playerSprite = this.add
      .image(0, 0, TEXTURES.player)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScale(0.72)
      .setDepth(6);
    this.reticleGraphics = this.add.graphics().setDepth(10);

    this.latestSnapshot = this.deps.simulation.peekSnapshot();
    this.sync(this.latestSnapshot);
  }

  update(_time: number, delta: number): void {
    const snapshot = this.deps.simulation.step(this.deps.input.sample(), delta / 1000);
    this.latestSnapshot = snapshot;
    this.sync(snapshot);
  }

  private drawBackdrop(): void {
    const background = this.add.graphics().setDepth(0);

    background.fillStyle(0x050911, 1);
    background.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    background.fillStyle(0x61f7ff, 0.06);
    background.fillCircle(250, 170, 210);
    background.fillStyle(0xff5ecf, 0.05);
    background.fillCircle(1040, 560, 250);
    background.fillStyle(0x7effc7, 0.04);
    background.fillCircle(710, 120, 180);

    background.lineStyle(1, 0x173051, 0.25);
    for (let x = 40; x < GAME_WIDTH; x += 64) {
      background.lineBetween(x, 28, x, GAME_HEIGHT - 28);
    }
    for (let y = 36; y < GAME_HEIGHT; y += 64) {
      background.lineBetween(28, y, GAME_WIDTH - 28, y);
    }

    background.lineStyle(2, 0x73f3ff, 0.12);
    background.strokeRoundedRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48, 28);
    background.lineStyle(1, 0xff72de, 0.12);
    background.strokeRoundedRect(14, 14, GAME_WIDTH - 28, GAME_HEIGHT - 28, 34);

    for (let index = 0; index < 90; index += 1) {
      const alpha = 0.12 + Math.random() * 0.2;
      background.fillStyle(0xffffff, alpha);
      background.fillCircle(
        Math.random() * GAME_WIDTH,
        Math.random() * GAME_HEIGHT,
        0.8 + Math.random() * 1.6
      );
    }
  }

  private sync(snapshot: Snapshot): void {
    this.syncTrail(snapshot);
    this.syncAnchors(snapshot);
    this.syncProjectiles(snapshot);
    this.syncShards(snapshot);
    this.syncPulses(snapshot);
    this.syncOrbiters(snapshot);
    this.syncPlayer(snapshot);
    this.syncEnemies(snapshot);
    this.syncReticle(snapshot);
    this.deps.onSnapshot(snapshot);
  }

  private syncPlayer(snapshot: Snapshot): void {
    if (!this.playerAura || !this.playerSprite) {
      return;
    }

    const player = snapshot.player;
    const blink = player.invulnerability > 0 ? 0.42 + Math.sin(snapshot.elapsed * 24) * 0.2 : 0;

    this.playerAura.setPosition(player.position.x, player.position.y);
    this.playerAura.setScale(player.dashTimer > 0 ? 1.18 : 0.94 + snapshot.combo * 0.002);
    this.playerAura.setTint(player.dashTimer > 0 ? 0xff89df : 0x67f7ff);
    this.playerAura.setAlpha(player.dashTimer > 0 ? 0.98 : 0.7);

    this.playerSprite.setPosition(player.position.x, player.position.y);
    this.playerSprite.setAngle(snapshot.elapsed * 110);
    this.playerSprite.setTint(snapshot.boss ? 0xffcf6d : 0x7cf7ff);
    this.playerSprite.setAlpha(1 - blink * 0.45);
  }

  private syncEnemies(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const enemy of snapshot.enemies) {
      active.add(enemy.id);
      let sprite = this.enemies.get(enemy.id);

      if (!sprite) {
        sprite = this.add
          .image(enemy.position.x, enemy.position.y, enemyTexture(enemy.kind))
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setDepth(enemy.kind === "boss" ? 7 : 6);
        this.enemies.set(enemy.id, sprite);
      }

      const tint =
        enemy.telegraph > 0.5 ? 0xff8fe4 : tintFromHue(enemy.hue);

      sprite.setPosition(enemy.position.x, enemy.position.y);
      sprite.setScale(enemyScale(enemy.kind) * (1 + enemy.telegraph * 0.05));
      sprite.setTint(tint);
      sprite.setAlpha(enemy.hitFlash > 0 ? 1 : enemy.kind === "boss" ? 0.98 : 0.94);
      sprite.setAngle(
        enemy.kind === "boss"
          ? snapshot.elapsed * 18
          : Math.atan2(enemy.velocity.y, enemy.velocity.x) * (180 / Math.PI)
      );
    }

    for (const [id, sprite] of this.enemies.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.enemies.delete(id);
    }
  }

  private syncAnchors(snapshot: Snapshot): void {
    if (!this.anchorGraphics) {
      return;
    }

    const active = new Set<number>();
    this.anchorGraphics.clear();

    if (snapshot.anchors.length > 1) {
      this.anchorGraphics.lineStyle(2, 0x6af6ff, 0.1);
      this.anchorGraphics.beginPath();
      this.anchorGraphics.moveTo(
        snapshot.anchors[0].position.x,
        snapshot.anchors[0].position.y
      );

      for (let index = 1; index < snapshot.anchors.length; index += 1) {
        this.anchorGraphics.lineTo(
          snapshot.anchors[index].position.x,
          snapshot.anchors[index].position.y
        );
      }

      this.anchorGraphics.strokePath();
    }

    for (const anchor of snapshot.anchors) {
      active.add(anchor.id);
      let sprite = this.anchors.get(anchor.id);

      if (!sprite) {
        sprite = this.add
          .image(anchor.position.x, anchor.position.y, TEXTURES.anchor)
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setDepth(3);
        this.anchors.set(anchor.id, sprite);
      }

      const progress = anchor.progress / anchor.required;
      const tint = anchor.status === "secured" ? 0x82ffd3 : 0x73f6ff;

      sprite.setPosition(anchor.position.x, anchor.position.y);
      sprite.setTint(tint);
      sprite.setScale(anchor.status === "secured" ? 1.12 : 0.98 + progress * 0.08);
      sprite.setAlpha(anchor.status === "secured" ? 0.95 : 0.88);
      sprite.setAngle(snapshot.elapsed * 25);

      this.anchorGraphics.lineStyle(
        anchor.status === "secured" ? 6 : 4,
        anchor.status === "secured" ? 0x82ffd3 : 0x6af6ff,
        anchor.status === "secured" ? 0.55 : 0.32
      );
      this.anchorGraphics.strokeCircle(
        anchor.position.x,
        anchor.position.y,
        anchor.radius
      );

      this.anchorGraphics.lineStyle(5, 0xff8de2, anchor.status === "secured" ? 0.16 : 0.82);
      this.anchorGraphics.beginPath();
      this.anchorGraphics.arc(
        anchor.position.x,
        anchor.position.y,
        anchor.radius - 10,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress
      );
      this.anchorGraphics.strokePath();
    }

    for (const [id, sprite] of this.anchors.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.anchors.delete(id);
    }
  }

  private syncProjectiles(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const projectile of snapshot.projectiles) {
      active.add(projectile.id);
      let sprite = this.projectiles.get(projectile.id);

      if (!sprite) {
        sprite = this.add
          .image(
            projectile.position.x,
            projectile.position.y,
            projectile.owner === "player" ? TEXTURES.bolt : TEXTURES.enemyBolt
          )
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(7);
        this.projectiles.set(projectile.id, sprite);
      }

      sprite.setPosition(projectile.position.x, projectile.position.y);
      sprite.setScale(projectile.scale);
      sprite.setTint(tintFromHue(projectile.hue));
      sprite.setAlpha(Math.min(1, projectile.ttl));
      sprite.setAngle(
        Math.atan2(projectile.velocity.y, projectile.velocity.x) * (180 / Math.PI)
      );
    }

    for (const [id, sprite] of this.projectiles.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.projectiles.delete(id);
    }
  }

  private syncShards(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const shard of snapshot.shards) {
      active.add(shard.id);
      let sprite = this.shards.get(shard.id);

      if (!sprite) {
        sprite = this.add
          .image(shard.position.x, shard.position.y, TEXTURES.shard)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(5);
        this.shards.set(shard.id, sprite);
      }

      sprite.setPosition(shard.position.x, shard.position.y);
      sprite.setTint(0xffd96b);
      sprite.setScale(0.58);
      sprite.setAlpha(Math.min(1, shard.ttl));
      sprite.setAngle(snapshot.elapsed * 240 + shard.id * 18);
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
        sprite = this.add
          .image(pulse.position.x, pulse.position.y, TEXTURES.ring)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(4);
        this.pulses.set(pulse.id, sprite);
      }

      if (!this.seenPulses.has(pulse.id)) {
        this.seenPulses.add(pulse.id);

        if (pulse.maxRadius >= 260) {
          this.cameras.main.shake(110, 0.0026);
        }
      }

      const progress = pulse.age / pulse.duration;
      sprite.setPosition(pulse.position.x, pulse.position.y);
      sprite.setScale(pulse.radius / 60);
      sprite.setTint(progress < 0.28 ? 0x74f7ff : progress < 0.6 ? 0xff8de2 : 0x8affd0);
      sprite.setAlpha(0.86 - progress * 0.72);
    }

    for (const [id, sprite] of this.pulses.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.pulses.delete(id);
    }
  }

  private syncOrbiters(snapshot: Snapshot): void {
    const active = new Set<number>();

    for (const orbiter of snapshot.orbiters) {
      active.add(orbiter.id);
      let sprite = this.orbiters.get(orbiter.id);

      if (!sprite) {
        sprite = this.add
          .image(orbiter.position.x, orbiter.position.y, TEXTURES.orbiter)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(6);
        this.orbiters.set(orbiter.id, sprite);
      }

      sprite.setPosition(orbiter.position.x, orbiter.position.y);
      sprite.setTint(tintFromHue(orbiter.hue));
      sprite.setScale(0.74);
      sprite.setAlpha(0.96);
      sprite.setAngle(orbiter.angle * (180 / Math.PI));
    }

    for (const [id, sprite] of this.orbiters.entries()) {
      if (active.has(id)) {
        continue;
      }

      sprite.destroy();
      this.orbiters.delete(id);
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
        life: snapshot.player.dashTimer > 0 ? 1.05 : 0.76,
        radius: snapshot.player.dashTimer > 0 ? 32 : 20
      });
    }

    this.trail.splice(18);
    this.trailGraphics.clear();

    for (let index = this.trail.length - 1; index >= 0; index -= 1) {
      const trailPoint = this.trail[index];
      trailPoint.life -= 0.08;

      if (trailPoint.life <= 0) {
        this.trail.splice(index, 1);
        continue;
      }

      this.trailGraphics.fillStyle(
        index % 2 === 0 ? 0x71f7ff : 0xff77dd,
        trailPoint.life * 0.16
      );
      this.trailGraphics.fillCircle(
        trailPoint.x,
        trailPoint.y,
        trailPoint.radius * trailPoint.life
      );
    }
  }

  private syncReticle(snapshot: Snapshot): void {
    if (!this.reticleGraphics) {
      return;
    }

    this.reticleGraphics.clear();

    const pointer = this.deps.input.getPointerState();

    if (!pointer.active) {
      return;
    }

    this.reticleGraphics.lineStyle(1.5, 0x73f6ff, 0.24);
    this.reticleGraphics.lineBetween(
      snapshot.player.position.x,
      snapshot.player.position.y,
      pointer.position.x,
      pointer.position.y
    );
    this.reticleGraphics.lineStyle(2.5, 0xff8de2, 0.75);
    this.reticleGraphics.strokeCircle(pointer.position.x, pointer.position.y, 12);
    this.reticleGraphics.lineStyle(1, 0x73f6ff, 0.6);
    this.reticleGraphics.strokeCircle(pointer.position.x, pointer.position.y, 22);
  }
}
