import { expect, test } from "@playwright/test";
import { Game, SHIPS, SECTORS, type Input } from "../src/game";
const still: Input = { x: 0, y: 0, aim: null };
const advance = (g: Game, seconds: number, input = still) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, input);
};
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("les appareils ont des caractéristiques distinctes ; le mouvement reste borné et la pause fige le monde", () => {
  const g = new Game(seeded(42));
  for (const ship of SHIPS) {
    g.reset(ship.id);
    expect(g.player.hp).toBe(ship.hp);
    expect(g.player.speed).toBe(ship.speed);
  }
  advance(g, 0.5, { x: 1, y: 1, aim: null });
  expect(g.player.x).toBeGreaterThan(600);
  expect(g.player.y).toBeGreaterThan(480);
  g.pause();
  const before = JSON.stringify({
    player: g.player,
    elapsed: g.elapsed,
    enemies: g.enemies,
  });
  advance(g, 2, { x: 1, y: 0, aim: null });
  expect(
    JSON.stringify({
      player: g.player,
      elapsed: g.elapsed,
      enemies: g.enemies,
    }),
  ).toBe(before);
  g.pause();
  g.player.x = 1164;
  advance(g, 0.3, { x: 1, y: 0, aim: null });
  expect(g.player.x).toBe(1165);
});

test("le dash traverse sans dégâts, doit recharger et se réinitialise à chaque sortie", () => {
  const g = new Game();
  g.reset("spectre");
  g.player.invulnerable = 0;
  expect(g.dash()).toBe(true);
  expect(g.dash()).toBe(false);
  g.hurt(30);
  expect(g.player.hp).toBe(100);
  advance(g, 0.3);
  expect(g.player.y).toBeLessThan(300);
  expect(g.player.dash).toBeGreaterThan(2);
  g.hurt(30);
  expect(g.player.hp).toBe(70);
  g.reset("aegis");
  expect(g.player.hp).toBe(150);
  expect(g.player.dash).toBe(0);
  expect(g.elapsed).toBe(0);
});

test("capture et collecte rechargent l’impulsion, qui efface les tirs proches et endommage les ennemis", () => {
  const g = new Game(seeded(17));
  g.reset("spectre");
  g.spawnTimer = 100;
  g.player.hp = 50;
  g.player.x = g.relays[0].x;
  g.player.y = g.relays[0].y;
  advance(g, 2.7);
  expect(g.relays[0].captured).toBe(true);
  expect(g.player.hp).toBe(70);
  expect(g.player.energy).toBe(80);
  g.drops.push({ x: g.player.x, y: g.player.y, kind: "energy", life: 3 });
  advance(g, 0.02);
  expect(g.player.energy).toBe(89);
  expect(g.pulse()).toBe(false);
  g.player.energy = 100;
  g.spawn("brute");
  const enemy = g.enemies[0];
  enemy.x = g.player.x + 100;
  enemy.y = g.player.y;
  enemy.born = 0;
  g.shoot(g.player, 0, true, 10, 0);
  expect(g.pulse()).toBe(true);
  expect(g.player.energy).toBe(0);
  expect(enemy.hp).toBeLessThanOrEqual(0);
  expect(g.bullets.filter((b) => b.hostile)).toHaveLength(0);
});

test("les tirs rapides utilisent le trajet complet et ne frappent pas deux fois une cible perforée", () => {
  const g = new Game(seeded(1));
  g.reset("spectre");
  g.spawnTimer = 100;
  g.player.fire = 100;
  g.player.pierce = 1;
  g.spawn("brute");
  const e = g.enemies[0];
  Object.assign(e, { x: 650, y: 300, born: 0, speed: 0, timer: 10 });
  g.shoot({ x: 550, y: 300 }, 0, false, 20, 6000);
  g.update(0.02, still);
  expect(e.hp).toBe(e.maxHp - 20);
  g.update(0.02, still);
  expect(e.hp).toBe(e.maxHp - 20);
});

test("chaque secteur offre trois choix uniques et un seul choix ouvre le secteur suivant", () => {
  const g = new Game(seeded(8));
  g.reset("spectre");
  g.spawnTimer = 100;
  g.spawned = SECTORS[0].quota;
  g.sectorKills = SECTORS[0].quota;
  g.player.hp = 60;
  g.update(0.016, still);
  expect(g.phase).toBe("upgrade");
  expect(g.player.hp).toBe(75);
  expect(new Set(g.choices.map((u) => u.id)).size).toBe(3);
  expect(g.choose("missing")).toBe(false);
  expect(g.sector).toBe(0);
  const selected = g.choices[0].id;
  expect(g.choose(selected)).toBe(true);
  expect(g.phase).toBe("playing");
  expect(g.sector).toBe(1);
  expect(g.installed).toEqual([selected]);
  expect(g.choose(selected)).toBe(false);
});

test("une défaite est terminale même si un projectile pourrait tuer le boss dans la même image", () => {
  const g = new Game();
  g.reset("spectre");
  g.sector = 4;
  g.beginSector();
  g.spawnTimer = 100;
  g.player.hp = 1;
  g.player.invulnerable = 0;
  g.player.fire = 100;
  const boss = g.enemies[0];
  Object.assign(boss, { x: 800, y: 300, hp: 1, born: 0, speed: 0, timer: 10 });
  g.shoot({ x: g.player.x - 20, y: g.player.y }, 0, true, 30, 0);
  g.shoot({ x: boss.x - 20, y: boss.y }, 0, false, 100, 0);
  g.update(0.016, still);
  expect(g.phase).toBe("defeat");
  expect(g.player.hp).toBe(0);
  const score = g.score;
  g.finish(true);
  g.hit(boss, 100);
  expect(g.phase).toBe("defeat");
  expect(g.score).toBe(score);
});

test("une partie entière reste gagnable avec chacun des trois appareils sans blocage de progression", () => {
  for (const ship of SHIPS) {
    const g = new Game(seeded(613));
    g.reset(ship.id);
    for (let frame = 0; frame < 60 * 360; frame++) {
      if (g.phase === "upgrade") {
        const priorities = [
          "regen",
          "split",
          "damage",
          "fire",
          "hull",
          "pierce",
        ];
        const choice = [...g.choices].sort((a, b) => {
          const rank = (id: string) =>
            priorities.includes(id) ? priorities.indexOf(id) : 100;
          return rank(a.id) - rank(b.id);
        })[0];
        g.choose(choice.id);
      }
      if (g.phase === "defeat" || g.phase === "victory") break;
      const angle = g.elapsed * 0.48,
        target = {
          x: 600 + Math.cos(angle) * 390,
          y: 380 + Math.sin(angle) * 225,
        };
      const dx = target.x - g.player.x,
        dy = target.y - g.player.y,
        length = Math.hypot(dx, dy);
      if (
        g.enemies.some(
          (e) => Math.hypot(e.x - g.player.x, e.y - g.player.y) < 105,
        )
      ) {
        if (g.player.energy >= 100) g.pulse();
        if (g.player.dash <= 0) g.dash();
      }
      g.update(1 / 60, {
        x: dx / Math.max(1, length),
        y: dy / Math.max(1, length),
        aim: null,
      });
      g.events = [];
    }
    expect(g.phase, `${ship.name} doit atteindre la victoire`).toBe("victory");
    expect(g.sector).toBe(4);
    expect(g.kills).toBeGreaterThan(108);
    expect(g.elapsed).toBeLessThan(360);
  }
});
