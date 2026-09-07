import { Game, WIDTH, HEIGHT, clamp, type Vec, type Enemy } from "./game";
const TAU = Math.PI * 2;
export class Renderer {
  ctx: CanvasRenderingContext2D;
  viewWidth = WIDTH;
  offsetX = 0;
  offsetY = 0;
  viewHeight = HEIGHT;
  reduced = false;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
  }
  worldPoint(x: number, y: number): Vec {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((x - r.left) / r.width) * this.viewWidth + this.offsetX,
      y: ((y - r.top) / r.height) * this.viewHeight + this.offsetY,
    };
  }
  draw(game: Game, time: number) {
    const c = this.ctx,
      w = this.canvas.width,
      h = this.canvas.height;
    if (!w || !h) return;
    this.viewHeight = HEIGHT;
    this.viewWidth = (HEIGHT * w) / h;
    if (this.viewWidth > WIDTH) {
      this.viewWidth = WIDTH;
      this.viewHeight = (WIDTH * h) / w;
    }
    this.offsetX = clamp(
      game.player.x - this.viewWidth / 2,
      0,
      WIDTH - this.viewWidth,
    );
    this.offsetY = clamp(
      game.player.y - this.viewHeight / 2,
      0,
      HEIGHT - this.viewHeight,
    );
    if (game.phase === "hangar") {
      this.offsetX = (WIDTH - this.viewWidth) / 2;
      this.offsetY = (HEIGHT - this.viewHeight) / 2;
    }
    c.setTransform(
      w / this.viewWidth,
      0,
      0,
      h / this.viewHeight,
      (-this.offsetX * w) / this.viewWidth,
      (-this.offsetY * h) / this.viewHeight,
    );
    c.fillStyle = "#080d1c";
    c.fillRect(this.offsetX, this.offsetY, this.viewWidth, this.viewHeight);
    const glow = c.createRadialGradient(600, 365, 30, 600, 365, 650);
    glow.addColorStop(0, "#15273d");
    glow.addColorStop(0.55, "#10172c");
    glow.addColorStop(1, "#080d1c");
    c.fillStyle = glow;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    c.save();
    if (!this.reduced && game.shake)
      c.translate(
        Math.sin(time * 71) * game.shake,
        Math.cos(time * 83) * game.shake,
      );
    c.lineWidth = 1;
    c.strokeStyle = "#29405035";
    c.beginPath();
    for (let x = 0; x <= WIDTH; x += 48) {
      c.moveTo(x, 0);
      c.lineTo(x, HEIGHT);
    }
    for (let y = 0; y <= HEIGHT; y += 48) {
      c.moveTo(0, y);
      c.lineTo(WIDTH, y);
    }
    c.stroke();
    c.strokeStyle = "#61788815";
    c.lineWidth = 1;
    for (let i = 0; i < 46; i++) {
      const x = (i * 277 + 71) % WIDTH,
        y = (i * 137 + 53) % HEIGHT;
      c.beginPath();
      c.moveTo(x - 3, y);
      c.lineTo(x + 3, y);
      c.moveTo(x, y - 3);
      c.lineTo(x, y + 3);
      c.stroke();
    }
    this.beacon(time, game.phase === "hangar");
    c.strokeStyle = "#8fffee28";
    c.lineWidth = 2;
    c.strokeRect(23, 23, WIDTH - 46, HEIGHT - 46);
    c.strokeStyle = "#8fffee66";
    [
      [23, 23, 1, 1],
      [WIDTH - 23, 23, -1, 1],
      [23, HEIGHT - 23, 1, -1],
      [WIDTH - 23, HEIGHT - 23, -1, -1],
    ].forEach(([x, y, dx, dy]) => {
      c.beginPath();
      c.moveTo(x + dx * 38, y);
      c.lineTo(x, y);
      c.lineTo(x, y + dy * 38);
      c.stroke();
    });
    if (game.phase === "hangar") {
      const pos = {
        ...game.player,
        x: 850,
        y: 340,
        angle: -0.6,
        invulnerable: 0,
        dashTime: 0,
      };
      this.ship(pos, game.ship.color, 4, time);
      c.restore();
      return;
    }
    for (const relay of game.relays) {
      c.save();
      c.translate(relay.x, relay.y);
      c.strokeStyle = relay.captured ? "#8fffee33" : "#8fffee55";
      c.fillStyle = relay.captured ? "#8fffee07" : "#8fffee08";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 70, 0, TAU);
      c.fill();
      c.setLineDash([4, 8]);
      c.stroke();
      c.setLineDash([]);
      if (relay.progress > 0) {
        c.strokeStyle = "#8fffee";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + TAU * relay.progress);
        c.stroke();
      }
      c.strokeStyle = relay.captured ? "#8fffee" : "#72a9af";
      c.lineWidth = 2;
      c.strokeRect(-10, -10, 20, 20);
      c.fillStyle = relay.captured ? "#8fffee" : "#72a9af";
      c.fillRect(-3, -3, 6, 6);
      c.font = "10px ui-monospace, monospace";
      c.textAlign = "center";
      c.fillText(relay.captured ? "RELAIS ACTIVÉ" : "CAPTURER", 0, 42);
      c.restore();
    }
    for (const drop of game.drops) {
      c.save();
      c.translate(drop.x, drop.y);
      c.globalAlpha = Math.min(1, drop.life);
      c.strokeStyle = drop.kind === "heal" ? "#ffd38b" : "#8fffee";
      c.fillStyle = drop.kind === "heal" ? "#ffd38b20" : "#8fffee25";
      if (drop.kind === "heal") {
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-6, 0);
        c.lineTo(6, 0);
        c.moveTo(0, -6);
        c.lineTo(0, 6);
        c.stroke();
      } else {
        c.rotate(Math.PI / 4 + time * 0.7);
        c.fillRect(-4, -4, 8, 8);
        c.strokeRect(-4, -4, 8, 8);
      }
      c.restore();
    }
    for (const e of game.enemies) this.enemy(e, time);
    c.lineCap = "round";
    for (const b of game.bullets) {
      c.strokeStyle = b.hostile ? "#ff9a90" : game.ship.color;
      c.lineWidth = b.hostile ? 5 : 3;
      c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      c.stroke();
      if (b.hostile) {
        c.fillStyle = "#ffe8de";
        c.beginPath();
        c.arc(b.x, b.y, 2, 0, TAU);
        c.fill();
      }
    }
    if (!this.reduced)
      for (const p of game.particles) {
        c.globalAlpha = Math.max(0, p.life / p.total);
        c.fillStyle = p.color;
        c.fillRect(p.x, p.y, p.size, p.size);
      }
    c.globalAlpha = 1;
    for (const r of game.rings) {
      c.globalAlpha = r.life / r.total;
      c.strokeStyle = r.color;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(r.x, r.y, r.radius, 0, TAU);
      c.stroke();
    }
    c.globalAlpha = 1;
    this.ship(game.player, game.ship.color, 1, time);
    // A cropped portrait view retains directional information about distant threats.
    for (const e of game.enemies) {
      if (
        e.hp <= 0 ||
        e.born > 0 ||
        (e.x > this.offsetX + 18 &&
          e.x < this.offsetX + this.viewWidth - 18 &&
          e.y > this.offsetY + 18 &&
          e.y < this.offsetY + this.viewHeight - 18)
      )
        continue;
      const x = clamp(
          e.x,
          this.offsetX + 18,
          this.offsetX + this.viewWidth - 18,
        ),
        y = clamp(e.y, this.offsetY + 18, this.offsetY + this.viewHeight - 18);
      c.save();
      c.translate(x, y);
      c.rotate(Math.atan2(e.y - y, e.x - x));
      c.fillStyle = e.kind === "boss" ? "#ffd38b" : "#ff827e";
      c.beginPath();
      c.moveTo(7, 0);
      c.lineTo(-4, -4);
      c.lineTo(-4, 4);
      c.fill();
      c.restore();
    }
    c.restore();
  }
  beacon(time: number, intro: boolean) {
    const c = this.ctx;
    c.save();
    c.translate(600, 365);
    c.rotate(this.reduced ? 0 : time * 0.025);
    c.strokeStyle = "#8fffee0b";
    c.lineWidth = 1;
    [90, 112, 220, 280].forEach((r) => {
      c.beginPath();
      c.arc(0, 0, r, 0, TAU);
      c.stroke();
    });
    c.setLineDash([18, 12]);
    c.strokeStyle = "#8fffee16";
    c.beginPath();
    c.arc(0, 0, 180, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.rotate(Math.PI / 4);
    c.strokeStyle = intro ? "#8fffee20" : "#8fffee35";
    c.strokeRect(-31, -31, 62, 62);
    c.strokeRect(-22, -22, 44, 44);
    c.fillStyle = "#8fffee0c";
    c.fillRect(-22, -22, 44, 44);
    c.fillStyle = "#8fffee66";
    c.fillRect(-5, -5, 10, 10);
    c.restore();
  }
  ship(
    p: Vec & { angle: number; invulnerable: number; dashTime: number },
    color: string,
    scale: number,
    time: number,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    c.scale(scale, scale);
    if (p.invulnerable > 0) {
      c.strokeStyle = color + "66";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 25, 0, TAU);
      c.stroke();
    }
    const flame = this.reduced ? 12 : 12 + Math.sin(time * 45) * 5;
    const g = c.createLinearGradient(-12, 0, -38, 0);
    g.addColorStop(0, color + "bb");
    g.addColorStop(1, color + "00");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-10, -6);
    c.lineTo(-16 - flame * (p.dashTime > 0 ? 2 : 1), 0);
    c.lineTo(-10, 6);
    c.fill();
    c.shadowColor = color;
    c.shadowBlur = this.reduced ? 0 : 13;
    c.strokeStyle = color;
    c.fillStyle = "#152c3a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(21, 0);
    c.lineTo(-14, -14);
    c.lineTo(-8, 0);
    c.lineTo(-14, 14);
    c.closePath();
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(11, 0);
    c.lineTo(-5, -4);
    c.lineTo(-5, 4);
    c.closePath();
    c.fill();
    c.restore();
  }
  enemy(e: Enemy, time: number) {
    const c = this.ctx;
    const color =
      e.kind === "gunner"
        ? "#c0a5ff"
        : e.kind === "brute"
          ? "#ffd38b"
          : "#ff827e";
    c.save();
    c.translate(e.x, e.y);
    if (e.born > 0) {
      c.globalAlpha = 0.7;
      c.strokeStyle = color;
      c.setLineDash([4, 5]);
      c.beginPath();
      c.arc(0, 0, e.radius + 25 * e.born, 0, TAU);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 0.25;
    }
    if ((e.kind === "boss" || e.kind === "brute") && e.timer < 0.7) {
      c.strokeStyle = color + "44";
      c.lineWidth = e.kind === "boss" ? 2 : 1;
      c.beginPath();
      c.arc(0, 0, e.radius + 14 + e.timer * 24, 0, TAU);
      c.stroke();
      if (e.kind === "brute") {
        c.save();
        c.rotate(e.angle);
        c.fillStyle = "#ffd38b13";
        c.fillRect(0, -14, 170, 28);
        c.restore();
      }
    }
    c.rotate(e.kind === "gunner" ? time * 0.6 : e.angle);
    c.strokeStyle = e.flash > 0 ? "#fff" : color;
    c.fillStyle = e.flash > 0 ? "#fff8" : color + "15";
    c.lineWidth = e.kind === "boss" ? 3 : 1.5;
    c.beginPath();
    const sides =
      e.kind === "hunter"
        ? 3
        : e.kind === "gunner"
          ? 6
          : e.kind === "boss"
            ? 8
            : 4;
    for (let i = 0; i < sides; i++) {
      const a = (i * TAU) / sides;
      c.lineTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius);
    }
    c.closePath();
    c.fill();
    c.stroke();
    if (e.kind === "boss") {
      c.rotate(-time * 0.4);
      c.strokeRect(-21, -21, 42, 42);
      c.fillStyle = color;
      c.beginPath();
      c.arc(0, 0, 9, 0, TAU);
      c.fill();
    } else {
      c.fillStyle = color;
      c.fillRect(-3, -3, 6, 6);
    }
    c.restore();
    if (e.hp < e.maxHp && e.kind !== "boss") {
      c.fillStyle = "#ffffff15";
      c.fillRect(e.x - e.radius, e.y - e.radius - 9, e.radius * 2, 3);
      c.fillStyle = color;
      c.fillRect(
        e.x - e.radius,
        e.y - e.radius - 9,
        e.radius * 2 * Math.max(0, e.hp / e.maxHp),
        3,
      );
    }
  }
}
