import Phaser from "phaser";

export const TEXTURES = {
  aura: "player-aura",
  player: "player-prism",
  drone: "enemy-drone",
  crusher: "enemy-crusher",
  lancer: "enemy-lancer",
  warden: "enemy-warden",
  boss: "enemy-boss",
  shard: "energy-shard",
  ring: "pulse-ring",
  bolt: "player-bolt",
  enemyBolt: "enemy-bolt",
  anchor: "anchor-core",
  orbiter: "halo-orbiter"
} as const;

function point(x: number, y: number): Phaser.Geom.Point {
  return new Phaser.Geom.Point(x, y);
}

export function generateTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURES.player)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.setVisible(false);

  graphics.clear();
  graphics.fillStyle(0xffffff, 0.06);
  graphics.fillCircle(64, 64, 54);
  graphics.fillStyle(0xffffff, 0.12);
  graphics.fillCircle(64, 64, 34);
  graphics.generateTexture(TEXTURES.aura, 128, 128);

  graphics.clear();
  const prism = [
    point(48, 8),
    point(86, 34),
    point(70, 84),
    point(26, 84),
    point(10, 34)
  ];
  graphics.fillStyle(0xffffff, 0.16);
  graphics.fillPoints(prism, true);
  graphics.lineStyle(4, 0xffffff, 1);
  graphics.strokePoints(prism, true);
  graphics.lineStyle(2, 0xffffff, 0.85);
  graphics.strokeLineShape(new Phaser.Geom.Line(48, 8, 48, 84));
  graphics.strokeLineShape(new Phaser.Geom.Line(10, 34, 86, 34));
  graphics.generateTexture(TEXTURES.player, 96, 96);

  graphics.clear();
  const drone = [point(32, 4), point(60, 32), point(32, 60), point(4, 32)];
  graphics.fillStyle(0xffffff, 0.14);
  graphics.fillPoints(drone, true);
  graphics.lineStyle(3, 0xffffff, 1);
  graphics.strokePoints(drone, true);
  graphics.generateTexture(TEXTURES.drone, 64, 64);

  graphics.clear();
  const crusher = [
    point(40, 4),
    point(68, 18),
    point(68, 54),
    point(40, 68),
    point(12, 54),
    point(12, 18)
  ];
  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillPoints(crusher, true);
  graphics.lineStyle(4, 0xffffff, 1);
  graphics.strokePoints(crusher, true);
  graphics.lineStyle(2, 0xffffff, 0.9);
  graphics.strokeLineShape(new Phaser.Geom.Line(12, 18, 68, 54));
  graphics.strokeLineShape(new Phaser.Geom.Line(68, 18, 12, 54));
  graphics.generateTexture(TEXTURES.crusher, 80, 80);

  graphics.clear();
  const lancer = [point(10, 14), point(58, 32), point(10, 50), point(26, 32)];
  graphics.fillStyle(0xffffff, 0.16);
  graphics.fillPoints(lancer, true);
  graphics.lineStyle(3, 0xffffff, 1);
  graphics.strokePoints(lancer, true);
  graphics.generateTexture(TEXTURES.lancer, 68, 64);

  graphics.clear();
  graphics.fillStyle(0xffffff, 0.16);
  graphics.fillRoundedRect(10, 10, 44, 44, 10);
  graphics.lineStyle(3, 0xffffff, 1);
  graphics.strokeRoundedRect(10, 10, 44, 44, 10);
  graphics.lineStyle(2, 0xffffff, 0.88);
  graphics.strokeCircle(32, 32, 12);
  graphics.generateTexture(TEXTURES.warden, 64, 64);

  graphics.clear();
  const boss = [
    point(60, 6),
    point(98, 24),
    point(116, 60),
    point(98, 98),
    point(60, 116),
    point(24, 98),
    point(6, 60),
    point(24, 24)
  ];
  graphics.fillStyle(0xffffff, 0.2);
  graphics.fillPoints(boss, true);
  graphics.lineStyle(5, 0xffffff, 1);
  graphics.strokePoints(boss, true);
  graphics.lineStyle(2, 0xffffff, 0.92);
  graphics.strokeCircle(60, 60, 20);
  graphics.strokeLineShape(new Phaser.Geom.Line(24, 24, 98, 98));
  graphics.strokeLineShape(new Phaser.Geom.Line(98, 24, 24, 98));
  graphics.generateTexture(TEXTURES.boss, 120, 120);

  graphics.clear();
  const shard = [point(20, 2), point(38, 20), point(20, 38), point(2, 20)];
  graphics.fillStyle(0xffffff, 0.24);
  graphics.fillPoints(shard, true);
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.strokePoints(shard, true);
  graphics.generateTexture(TEXTURES.shard, 40, 40);

  graphics.clear();
  graphics.lineStyle(4, 0xffffff, 0.95);
  graphics.strokeCircle(72, 72, 60);
  graphics.lineStyle(2, 0xffffff, 0.35);
  graphics.strokeCircle(72, 72, 48);
  graphics.generateTexture(TEXTURES.ring, 144, 144);

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRoundedRect(4, 10, 40, 10, 5);
  graphics.generateTexture(TEXTURES.bolt, 48, 30);

  graphics.clear();
  const enemyBolt = [point(2, 14), point(34, 2), point(46, 14), point(34, 26)];
  graphics.fillStyle(0xffffff, 1);
  graphics.fillPoints(enemyBolt, true);
  graphics.generateTexture(TEXTURES.enemyBolt, 48, 28);

  graphics.clear();
  const anchor = [
    point(36, 6),
    point(62, 22),
    point(62, 50),
    point(36, 66),
    point(10, 50),
    point(10, 22)
  ];
  graphics.fillStyle(0xffffff, 0.14);
  graphics.fillPoints(anchor, true);
  graphics.lineStyle(3, 0xffffff, 0.95);
  graphics.strokePoints(anchor, true);
  graphics.lineStyle(2, 0xffffff, 0.8);
  graphics.strokeCircle(36, 36, 12);
  graphics.generateTexture(TEXTURES.anchor, 72, 72);

  graphics.clear();
  const orbiter = [
    point(18, 2),
    point(34, 18),
    point(18, 34),
    point(2, 18)
  ];
  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillPoints(orbiter, true);
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.strokePoints(orbiter, true);
  graphics.generateTexture(TEXTURES.orbiter, 36, 36);

  graphics.destroy();
}
