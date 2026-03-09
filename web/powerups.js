// powerups.js

export class DoubleScoreOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.duration = 10; // secondes
    this.active = false;
  }

  draw(ctx) {
    ctx.fillStyle = this.active ? "#FFD700" : "#FF8C00";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }

  activate(player) {
    this.active = true;
    player.scoreMultiplier = 2;
    setTimeout(() => {
      player.scoreMultiplier = 1;
      this.active = false;
    }, this.duration * 1000);
  }
}
