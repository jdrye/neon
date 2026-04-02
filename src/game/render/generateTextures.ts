import Phaser from "phaser";

export const TEXTURES = {
  aura: "player-aura",
  player: "player-prism",
  drone: "enemy-drone",
  crusher: "enemy-crusher",
  shard: "energy-shard",
  ring: "pulse-ring"
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
  graphics.fillStyle(0xffffff, 0.08);
  graphics.fillCircle(48, 48, 42);
  graphics.fillStyle(0xffffff, 0.16);
  graphics.fillCircle(48, 48, 28);
  graphics.generateTexture(TEXTURES.aura, 96, 96);

  graphics.clear();
  const prism = [point(48, 8), point(86, 78), point(48, 62), point(10, 78)];
  graphics.fillStyle(0xffffff, 0.14);
  graphics.fillPoints(prism, true);
  graphics.lineStyle(4, 0xffffff, 1);
  graphics.strokePoints(prism, true);
  graphics.lineStyle(2, 0xffffff, 0.9);
  graphics.strokeLineShape(new Phaser.Geom.Line(48, 8, 48, 62));
  graphics.generateTexture(TEXTURES.player, 96, 96);

  graphics.clear();
  const drone = [point(32, 6), point(58, 32), point(32, 58), point(6, 32)];
  graphics.fillStyle(0xffffff, 0.15);
  graphics.fillPoints(drone, true);
  graphics.lineStyle(3, 0xffffff, 1);
  graphics.strokePoints(drone, true);
  graphics.generateTexture(TEXTURES.drone, 64, 64);

  graphics.clear();
  const crusher = [
    point(40, 6),
    point(66, 18),
    point(66, 50),
    point(40, 62),
    point(14, 50),
    point(14, 18)
  ];
  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillPoints(crusher, true);
  graphics.lineStyle(4, 0xffffff, 1);
  graphics.strokePoints(crusher, true);
  graphics.lineStyle(2, 0xffffff, 0.9);
  graphics.strokeLineShape(new Phaser.Geom.Line(14, 18, 66, 50));
  graphics.strokeLineShape(new Phaser.Geom.Line(66, 18, 14, 50));
  graphics.generateTexture(TEXTURES.crusher, 80, 80);

  graphics.clear();
  const shard = [point(20, 2), point(38, 20), point(20, 38), point(2, 20)];
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillPoints(shard, true);
  graphics.lineStyle(2, 0xffffff, 1);
  graphics.strokePoints(shard, true);
  graphics.generateTexture(TEXTURES.shard, 40, 40);

  graphics.clear();
  graphics.lineStyle(3, 0xffffff, 0.95);
  graphics.strokeCircle(64, 64, 56);
  graphics.lineStyle(1.5, 0xffffff, 0.3);
  graphics.strokeCircle(64, 64, 46);
  graphics.generateTexture(TEXTURES.ring, 128, 128);

  graphics.destroy();
}
