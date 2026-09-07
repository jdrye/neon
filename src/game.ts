export const WIDTH = 1200;
export const HEIGHT = 760;
export type Phase =
  "hangar" | "playing" | "paused" | "upgrade" | "defeat" | "victory";
export type ShipId = "spectre" | "aegis" | "nova";
export type EnemyKind = "hunter" | "gunner" | "brute" | "boss";
export interface Vec {
  x: number;
  y: number;
}
export interface Ship {
  id: ShipId;
  name: string;
  role: string;
  description: string;
  hp: number;
  speed: number;
  damage: number;
  interval: number;
  color: string;
}
export const SHIPS: Ship[] = [
  {
    id: "spectre",
    name: "Spectre",
    role: "Équilibré",
    description: "Rapide, précis. Le choix idéal pour une première sortie.",
    hp: 100,
    speed: 255,
    damage: 20,
    interval: 0.24,
    color: "#8fffee",
  },
  {
    id: "aegis",
    name: "Bastion",
    role: "Résistant",
    description: "Une coque renforcée et un canon lourd. Chaque tir compte.",
    hp: 150,
    speed: 205,
    damage: 36,
    interval: 0.38,
    color: "#ffd38b",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Agile",
    description: "Un essaim de tirs, une coque légère. Reste en mouvement.",
    hp: 75,
    speed: 305,
    damage: 12,
    interval: 0.135,
    color: "#c0a5ff",
  },
];
export const SECTORS = [
  { name: "La lisière", subtitle: "Premiers échos", quota: 16, interval: 1.35 },
  {
    name: "Les docks",
    subtitle: "Signaux hostiles",
    quota: 24,
    interval: 1.15,
  },
  { name: "Le réseau", subtitle: "Zone de rupture", quota: 30, interval: 1.02 },
  {
    name: "Le point aveugle",
    subtitle: "Dernière approche",
    quota: 38,
    interval: 0.88,
  },
  {
    name: "Le cœur de la faille",
    subtitle: "Le Gardien vous attend",
    quota: 1,
    interval: 2.4,
  },
];
export interface Player extends Vec {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  interval: number;
  angle: number;
  dash: number;
  dashTime: number;
  invulnerable: number;
  fire: number;
  energy: number;
  projectiles: number;
  pierce: number;
  magnet: number;
  dashCooldown: number;
  regen: number;
  pulsePower: number;
}
export interface Enemy extends Vec {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  timer: number;
  angle: number;
  flash: number;
  born: number;
  charge: number;
  attack: number;
}
export interface Bullet extends Vec {
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  hostile: boolean;
  life: number;
  pierce: number;
  hit: number[];
}
export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  total: number;
  color: string;
  size: number;
}
export interface Drop extends Vec {
  kind: "energy" | "heal";
  life: number;
}
export interface Ring extends Vec {
  radius: number;
  max: number;
  life: number;
  total: number;
  color: string;
}
export interface Relay extends Vec {
  progress: number;
  captured: boolean;
}
export interface Input {
  x: number;
  y: number;
  aim: Vec | null;
}
export type SoundEvent =
  | "shoot"
  | "hit"
  | "kill"
  | "damage"
  | "dash"
  | "pulse"
  | "pickup"
  | "relay"
  | "sector"
  | "victory"
  | "defeat";
export interface Upgrade {
  id: string;
  name: string;
  category: string;
  description: string;
  stat: string;
  icon: string;
  apply: (p: Player) => void;
}
export const UPGRADES: Upgrade[] = [
  {
    id: "damage",
    name: "Surcharge",
    category: "Puissance",
    description: "Chaque impact frappe plus fort.",
    stat: "+25 % de dégâts",
    icon: "↗",
    apply: (p) => {
      p.damage *= 1.25;
    },
  },
  {
    id: "fire",
    name: "Accélérateur",
    category: "Cadence",
    description: "Un flux de tirs plus dense.",
    stat: "+22 % de cadence",
    icon: "≋",
    apply: (p) => {
      p.interval /= 1.22;
    },
  },
  {
    id: "split",
    name: "Prisme",
    category: "Arsenal",
    description: "Élargit la salve de votre canon.",
    stat: "+1 projectile",
    icon: "⋔",
    apply: (p) => {
      p.projectiles += 1;
    },
  },
  {
    id: "pierce",
    name: "Traverse",
    category: "Arsenal",
    description: "Les tirs traversent une cible de plus.",
    stat: "+1 perforation",
    icon: "⇥",
    apply: (p) => {
      p.pierce += 1;
    },
  },
  {
    id: "hull",
    name: "Seconde peau",
    category: "Survie",
    description: "Renforce et répare votre coque.",
    stat: "+30 coque · +45 PV",
    icon: "◇",
    apply: (p) => {
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 45);
    },
  },
  {
    id: "dash",
    name: "Déphasage",
    category: "Mobilité",
    description: "Traversez les menaces plus souvent.",
    stat: "Recharge du dash −25 %",
    icon: "»",
    apply: (p) => {
      p.dashCooldown *= 0.75;
    },
  },
  {
    id: "magnet",
    name: "Attracteur",
    category: "Énergie",
    description: "Récupérez les noyaux à distance.",
    stat: "+100 portée de collecte",
    icon: "⊙",
    apply: (p) => {
      p.magnet += 100;
    },
  },
  {
    id: "regen",
    name: "Reconstruction",
    category: "Survie",
    description: "Votre coque se répare en continu.",
    stat: "+1,5 PV par seconde",
    icon: "+",
    apply: (p) => {
      p.regen += 1.5;
    },
  },
  {
    id: "pulse",
    name: "Onde de choc",
    category: "Énergie",
    description: "L’impulsion frappe plus fort et se recharge.",
    stat: "+50 % de dégâts · +50 énergie",
    icon: "◎",
    apply: (p) => {
      p.pulsePower *= 1.5;
      p.energy = Math.min(100, p.energy + 50);
    },
  },
];
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export class Game {
  phase: Phase = "hangar";
  ship = SHIPS[0];
  sector = 0;
  score = 0;
  kills = 0;
  sectorKills = 0;
  elapsed = 0;
  sectorElapsed = 0;
  combo = 1;
  comboTime = 0;
  spawnTimer = 1;
  spawned = 0;
  id = 0;
  shake = 0;
  banner = 0;
  player!: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  drops: Drop[] = [];
  rings: Ring[] = [];
  relays: Relay[] = [];
  choices: Upgrade[] = [];
  installed: string[] = [];
  events: SoundEvent[] = [];
  lastDirection: Vec = { x: 0, y: -1 };
  constructor(public random: () => number = Math.random) {
    this.reset("spectre", false);
  }
  reset(shipId: ShipId, start = true) {
    this.ship = SHIPS.find((s) => s.id === shipId) || SHIPS[0];
    this.player = {
      x: WIDTH / 2,
      y: HEIGHT / 2 + 100,
      hp: this.ship.hp,
      maxHp: this.ship.hp,
      speed: this.ship.speed,
      damage: this.ship.damage,
      interval: this.ship.interval,
      angle: -Math.PI / 2,
      dash: 0,
      dashTime: 0,
      invulnerable: 1.8,
      fire: 0,
      energy: 40,
      projectiles: 1,
      pierce: 0,
      magnet: 110,
      dashCooldown: 2.6,
      regen: 0,
      pulsePower: 1,
    };
    this.score =
      this.kills =
      this.sector =
      this.elapsed =
      this.comboTime =
      this.shake =
      this.id =
        0;
    this.combo = 1;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.drops = [];
    this.rings = [];
    this.installed = [];
    this.choices = [];
    this.events = [];
    this.lastDirection = { x: 0, y: -1 };
    this.beginSector();
    this.phase = start ? "playing" : "hangar";
  }
  beginSector() {
    this.sectorKills = this.spawned = this.sectorElapsed = 0;
    this.spawnTimer = 1.4;
    this.banner = 3;
    this.bullets = [];
    this.enemies = [];
    this.drops = [];
    this.player.invulnerable = 1.5;
    this.relays = [
      { x: 230, y: 220, progress: 0, captured: false },
      { x: 970, y: 540, progress: 0, captured: false },
    ];
    this.phase = "playing";
    this.events.push("sector");
    if (this.sector === 4) this.spawn("boss");
  }
  pause() {
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
  }
  dash() {
    if (this.phase !== "playing" || this.player.dash > 0) return false;
    this.player.dash = this.player.dashCooldown;
    this.player.dashTime = 0.19;
    this.player.invulnerable = Math.max(0.28, this.player.invulnerable);
    this.events.push("dash");
    return true;
  }
  pulse() {
    if (this.phase !== "playing" || this.player.energy < 100) return false;
    this.player.energy = 0;
    this.player.invulnerable = Math.max(0.45, this.player.invulnerable);
    this.shake = 9;
    this.rings.push({
      ...this.player,
      radius: 15,
      max: 420,
      life: 0.65,
      total: 0.65,
      color: "#8fffee",
    });
    this.bullets = this.bullets.filter(
      (b) => !b.hostile || distance(b, this.player) > 420,
    );
    for (const e of this.enemies) {
      if (this.phase !== "playing") break;
      if (distance(e, this.player) < 420 + e.radius)
        this.hit(e, 145 * this.player.pulsePower);
    }
    this.events.push("pulse");
    return true;
  }
  choose(id: string) {
    if (this.phase !== "upgrade") return false;
    const choice = this.choices.find((c) => c.id === id);
    if (!choice) return false;
    choice.apply(this.player);
    this.installed.push(choice.id);
    this.sector++;
    this.beginSector();
    return true;
  }
  spawn(kind?: EnemyKind) {
    const edge = Math.floor(this.random() * 4);
    const x =
      edge === 0
        ? 38
        : edge === 1
          ? WIDTH - 38
          : 60 + this.random() * (WIDTH - 120);
    const y =
      edge === 2
        ? 38
        : edge === 3
          ? HEIGHT - 38
          : 60 + this.random() * (HEIGHT - 120);
    const roll = this.random();
    kind ||=
      this.sector > 1 && roll < 0.23
        ? "brute"
        : this.sector > 0 && roll < 0.52
          ? "gunner"
          : "hunter";
    const hp =
      kind === "boss"
        ? 2400
        : (kind === "brute" ? 105 : kind === "gunner" ? 52 : 32) *
          (1 + this.sector * 0.12);
    this.enemies.push({
      id: ++this.id,
      kind,
      x: kind === "boss" ? WIDTH / 2 : x,
      y: kind === "boss" ? 160 : y,
      hp,
      maxHp: hp,
      radius:
        kind === "boss"
          ? 48
          : kind === "brute"
            ? 23
            : kind === "gunner"
              ? 17
              : 13,
      speed:
        kind === "boss"
          ? 44
          : kind === "brute"
            ? 57
            : kind === "gunner"
              ? 72
              : 93 + this.sector * 9,
      timer: 1.5 + this.random(),
      angle: 0,
      flash: 0,
      born: 0.7,
      charge: 0,
      attack: 0,
    });
    this.spawned++;
  }
  hit(enemy: Enemy, damage: number) {
    if (enemy.hp <= 0 || this.phase !== "playing") return;
    enemy.hp -= damage;
    enemy.flash = 0.1;
    if (enemy.hp > 0) return;
    this.kills++;
    this.sectorKills++;
    this.combo = Math.min(5, this.combo + 0.15);
    this.comboTime = 3.5;
    this.score += Math.round(
      (enemy.kind === "boss"
        ? 2500
        : enemy.kind === "brute"
          ? 140
          : enemy.kind === "gunner"
            ? 100
            : 60) * this.combo,
    );
    this.burst(
      enemy,
      enemy.kind === "boss" ? 50 : 13,
      enemy.kind === "gunner" ? "#c0a5ff" : "#ff827e",
    );
    this.drops.push({
      x: enemy.x,
      y: enemy.y,
      kind: this.random() < 0.12 ? "heal" : "energy",
      life: 16,
    });
    this.events.push("kill");
    if (enemy.kind === "boss") {
      this.finish(true);
    }
  }
  hurt(damage: number) {
    if (this.player.invulnerable > 0 || this.phase !== "playing") return;
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.invulnerable = 0.8;
    this.combo = 1;
    this.comboTime = 0;
    this.shake = 7;
    this.events.push("damage");
    this.burst(this.player, 12, "#ff827e");
    if (this.player.hp <= 0) this.finish(false);
  }
  finish(won: boolean) {
    if (this.phase !== "playing") return;
    this.phase = won ? "victory" : "defeat";
    this.bullets = [];
    this.score += won ? Math.round(this.player.hp * 20) : 0;
    this.events.push(won ? "victory" : "defeat");
  }
  burst(at: Vec, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const a = this.random() * Math.PI * 2,
        s = 35 + this.random() * 170,
        life = 0.25 + this.random() * 0.5;
      this.particles.push({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        total: life,
        color,
        size: 1 + this.random() * 3,
      });
    }
    if (this.particles.length > 450)
      this.particles.splice(0, this.particles.length - 450);
  }
  shoot(
    at: Vec,
    angle: number,
    hostile: boolean,
    damage = this.player.damage,
    speed = 700,
  ) {
    this.bullets.push({
      x: at.x + Math.cos(angle) * 20,
      y: at.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: hostile ? 5 : 3,
      damage,
      hostile,
      life: hostile ? 6 : 1.7,
      pierce: hostile ? 0 : this.player.pierce,
      hit: [],
    });
  }
  update(dt: number, input: Input) {
    if (this.phase !== "playing") return;
    dt = Math.min(0.05, Math.max(0, dt));
    this.elapsed += dt;
    this.sectorElapsed += dt;
    this.banner = Math.max(0, this.banner - dt);
    this.shake = Math.max(0, this.shake - dt * 24);
    const p = this.player;
    p.dash = Math.max(0, p.dash - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    p.fire -= dt;
    this.comboTime -= dt;
    if (this.comboTime <= 0) this.combo = Math.max(1, this.combo - dt * 0.45);
    const len = Math.hypot(input.x, input.y);
    const move =
      len > 0
        ? { x: input.x / Math.max(1, len), y: input.y / Math.max(1, len) }
        : { x: 0, y: 0 };
    if (len > 0.1 && p.dashTime <= 0) this.lastDirection = move;
    const dashing = p.dashTime > 0;
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.x = clamp(
      p.x + (dashing ? this.lastDirection.x * 1100 : move.x * p.speed) * dt,
      35,
      WIDTH - 35,
    );
    p.y = clamp(
      p.y + (dashing ? this.lastDirection.y * 1100 : move.y * p.speed) * dt,
      35,
      HEIGHT - 35,
    );
    if (dashing) this.burst(p, 2, this.ship.color);
    let target: Vec | null = input.aim;
    if (!target) {
      let nearest = Infinity;
      for (const e of this.enemies) {
        const d = distance(e, p);
        if (e.hp > 0 && e.born <= 0 && d < nearest) {
          nearest = d;
          target = e;
        }
      }
    }
    if (target) {
      p.angle = Math.atan2(target.y - p.y, target.x - p.x);
      if (p.fire <= 0) {
        for (let i = 0; i < p.projectiles; i++)
          this.shoot(p, p.angle + (i - (p.projectiles - 1) / 2) * 0.14, false);
        p.fire = p.interval;
        this.events.push("shoot");
      }
    }
    this.spawnTimer -= dt;
    const sector = SECTORS[this.sector];
    if (
      this.spawnTimer <= 0 &&
      (this.sector === 4 || this.spawned < sector.quota)
    ) {
      if (this.enemies.length < 26)
        this.spawn(
          this.sector === 4
            ? this.random() < 0.5
              ? "hunter"
              : "gunner"
            : undefined,
        );
      this.spawnTimer = sector.interval;
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.born -= dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.born > 0) continue;
      const d = distance(e, p);
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.timer -= dt;
      let speed = e.speed;
      if (e.kind === "gunner") {
        speed *= d < 240 ? -0.5 : d < 340 ? 0 : 1;
        if (e.timer <= 0) {
          this.shoot(e, e.angle, true, 12, 230);
          e.timer = 2.1 - this.sector * 0.12;
        }
      }
      if (e.kind === "brute") {
        if (e.timer < 0.7 && e.timer > 0) speed = 0;
        if (e.timer <= 0) {
          e.charge = 0.5;
          e.timer = 3;
        }
        if (e.charge > 0) {
          speed = 310;
          e.charge -= dt;
        }
      }
      if (e.kind === "boss") {
        speed = d < 260 ? 0 : e.speed;
        if (e.timer <= 0) {
          const enraged = e.hp < e.maxHp / 2;
          const n = enraged ? 18 : 12;
          if (e.attack % 2 === 0)
            for (let i = 0; i < n; i++)
              this.shoot(
                e,
                (i * Math.PI * 2) / n + e.attack * 0.17,
                true,
                15,
                enraged ? 205 : 170,
              );
          else
            for (let i = -2; i <= 2; i++)
              this.shoot(e, e.angle + i * 0.18, true, 18, 280);
          e.attack++;
          e.timer = enraged ? 1.45 : 2.1;
          this.rings.push({
            x: e.x,
            y: e.y,
            radius: 45,
            max: 110,
            life: 0.45,
            total: 0.45,
            color: "#ff827e",
          });
        }
      }
      e.x = clamp(e.x + Math.cos(e.angle) * speed * dt, 25, WIDTH - 25);
      e.y = clamp(e.y + Math.sin(e.angle) * speed * dt, 25, HEIGHT - 25);
      if (d < e.radius + 13)
        this.hurt(e.kind === "boss" ? 25 : e.kind === "brute" ? 22 : 12);
    }
    if (this.phase !== "playing") return;
    for (const b of this.bullets) {
      if (this.phase !== "playing") break;
      const old = { x: b.x, y: b.y };
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.hostile) {
        if (segmentDistance(p, old, b) < 13 + b.radius) {
          this.hurt(b.damage);
          b.life = 0;
        }
      } else
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.born > 0 || b.hit.includes(e.id)) continue;
          if (segmentDistance(e, old, b) < e.radius + b.radius) {
            this.hit(e, b.damage);
            b.hit.push(e.id);
            if (b.pierce-- <= 0) {
              b.life = 0;
              break;
            }
          }
        }
    }
    if (this.phase !== "playing") return;
    this.bullets = this.bullets
      .filter(
        (b) =>
          b.life > 0 &&
          b.x > -30 &&
          b.x < WIDTH + 30 &&
          b.y > -30 &&
          b.y < HEIGHT + 30,
      )
      .slice(-350);
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    for (const d of this.drops) {
      d.life -= dt;
      const dist = distance(d, p);
      if (dist < p.magnet) {
        const speed = (210 + (p.magnet - dist) * 3) * dt;
        d.x += ((p.x - d.x) / Math.max(1, dist)) * Math.min(speed, dist);
        d.y += ((p.y - d.y) / Math.max(1, dist)) * Math.min(speed, dist);
      }
      if (dist < 24) {
        if (d.kind === "heal") p.hp = Math.min(p.maxHp, p.hp + 18);
        else p.energy = Math.min(100, p.energy + 9);
        this.score += 15;
        d.life = 0;
        this.events.push("pickup");
      }
    }
    this.drops = this.drops.filter((d) => d.life > 0);
    for (const relay of this.relays) {
      if (relay.captured) continue;
      relay.progress = clamp(
        relay.progress + (distance(relay, p) < 70 ? dt / 2.6 : -dt / 7),
        0,
        1,
      );
      if (relay.progress >= 1) {
        relay.captured = true;
        p.energy = Math.min(100, p.energy + 40);
        p.hp = Math.min(p.maxHp, p.hp + 20);
        this.score += 350;
        this.events.push("relay");
        this.rings.push({
          x: relay.x,
          y: relay.y,
          radius: 65,
          max: 180,
          life: 0.8,
          total: 0.8,
          color: "#8fffee",
        });
      }
    }
    this.particles.forEach((a) => {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.life -= dt;
    });
    this.particles = this.particles.filter((a) => a.life > 0);
    this.rings.forEach((r) => {
      r.life -= dt;
      r.radius = r.max * (1 - r.life / r.total);
    });
    this.rings = this.rings.filter((r) => r.life > 0);
    if (
      this.phase === "playing" &&
      this.sector < 4 &&
      this.sectorKills >= sector.quota &&
      this.enemies.length === 0
    ) {
      this.phase = "upgrade";
      p.hp = Math.min(p.maxHp, p.hp + 15);
      p.energy = Math.min(100, p.energy + 20);
      this.bullets = [];
      const pool = [...UPGRADES];
      this.choices = [];
      for (let i = 0; i < 3; i++)
        this.choices.push(
          pool.splice(Math.floor(this.random() * pool.length), 1)[0],
        );
      this.events.push("sector");
    }
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
  }
}
function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = clamp(
    ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    0,
    1,
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
