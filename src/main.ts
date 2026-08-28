import "./styles.css";

type FallingKind = "shard" | "glitch" | "battery";

interface FallingItem {
  id: number;
  lane: number;
  y: number;
  speed: number;
  kind: FallingKind;
  rotation: number;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) throw new Error("Missing #app mount point");

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#game" aria-label="Neon Relay, aller au jeu">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>NEON RELAY</span>
      </a>
      <div class="top-actions">
        <button class="icon-button" id="sound-toggle" type="button" aria-pressed="true" aria-label="Désactiver le son">SON ●</button>
        <button class="icon-button" id="pause-button" type="button" aria-label="Mettre en pause">PAUSE</button>
      </div>
    </header>

    <section class="game-layout" id="game" aria-label="Jeu Neon Relay">
      <aside class="mission-panel">
        <p class="eyebrow">MISSION 01</p>
        <h1>Restaure le signal.</h1>
        <p class="mission-copy">Traverse la grille, récupère les fragments cyan et repousse les anomalies avant qu'elles n'atteignent le relais.</p>
        <div class="key-list" aria-label="Commandes clavier">
          <div><kbd>←</kbd><kbd>→</kbd><span>Changer de voie</span></div>
          <div><kbd>A</kbd><kbd>D</kbd><span>Changer de voie</span></div>
          <div><kbd>ESPACE</kbd><span>Impulsion</span></div>
          <div><kbd>P</kbd><span>Pause</span></div>
        </div>
        <div class="legend">
          <span><i class="legend-dot shard"></i> Fragment +100</span>
          <span><i class="legend-dot battery"></i> Recharge</span>
          <span><i class="legend-dot glitch"></i> Anomalie</span>
        </div>
      </aside>

      <div class="cabinet">
        <div class="hud" aria-live="polite">
          <div><span>SCORE</span><strong id="score">000000</strong></div>
          <div><span>NIVEAU</span><strong id="level">01</strong></div>
          <div><span>RELAIS</span><strong id="lives">◆ ◆ ◆</strong></div>
        </div>

        <div class="canvas-wrap">
          <canvas id="game-canvas" width="720" height="840" aria-label="Zone de jeu à quatre voies"></canvas>
          <div class="scanlines" aria-hidden="true"></div>

          <section class="overlay" id="intro-overlay" data-testid="intro-overlay">
            <div class="overlay-card">
              <p class="eyebrow">TRANSMISSION ENTRANTE</p>
              <h2>NEON RELAY</h2>
              <p>Le réseau est tombé. Synchronise trois relais pour relancer la ville.</p>
              <button class="primary-button" id="start-button" data-testid="start-button" type="button">LANCER LA MISSION</button>
              <small>Meilleur score : <span id="best-score">000000</span></small>
            </div>
          </section>

          <section class="overlay hidden" id="result-overlay" data-testid="result-overlay">
            <div class="overlay-card">
              <p class="eyebrow" id="result-kicker">SIGNAL PERDU</p>
              <h2 id="result-title">FIN DE TRANSMISSION</h2>
              <p id="result-copy">Score final : 0</p>
              <button class="primary-button" id="restart-button" type="button">REJOUER</button>
            </div>
          </section>

          <div class="pause-card hidden" id="pause-card" role="status">PAUSE</div>
        </div>

        <div class="energy-row">
          <span>IMPULSION</span>
          <div class="energy-track" role="progressbar" aria-label="Charge de l'impulsion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div id="energy-fill"></div>
          </div>
          <strong id="combo">×1</strong>
        </div>

        <div class="touch-controls" aria-label="Commandes tactiles">
          <button id="left-button" type="button" aria-label="Aller à gauche">←</button>
          <button id="pulse-button" type="button">IMPULSION</button>
          <button id="right-button" type="button" aria-label="Aller à droite">→</button>
        </div>
      </div>

      <aside class="status-panel">
        <p class="eyebrow">ÉTAT DU RÉSEAU</p>
        <ol class="relay-list">
          <li class="active"><span>01</span><div><strong>SECTEUR NORD</strong><small id="relay-one">EN COURS · 0%</small></div></li>
          <li><span>02</span><div><strong>SECTEUR EST</strong><small id="relay-two">HORS LIGNE</small></div></li>
          <li><span>03</span><div><strong>SECTEUR CENTRAL</strong><small id="relay-three">HORS LIGNE</small></div></li>
        </ol>
        <div class="objective-card">
          <span>OBJECTIF</span>
          <strong>3 × 1 500</strong>
          <p>Atteins 4 500 points pour rétablir le réseau.</p>
        </div>
        <p class="status-message" id="status-message">Prêt pour la synchronisation.</p>
      </aside>
    </section>

    <footer>
      <span>NEON RELAY / BUILD 1.0</span>
      <span>JEU LOCAL · AUCUNE DONNÉE TRANSMISE</span>
    </footer>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const ctx = canvas.getContext("2d")!;
const introOverlay = document.querySelector<HTMLElement>("#intro-overlay")!;
const resultOverlay = document.querySelector<HTMLElement>("#result-overlay")!;
const pauseCard = document.querySelector<HTMLElement>("#pause-card")!;
const scoreElement = document.querySelector<HTMLElement>("#score")!;
const levelElement = document.querySelector<HTMLElement>("#level")!;
const livesElement = document.querySelector<HTMLElement>("#lives")!;
const comboElement = document.querySelector<HTMLElement>("#combo")!;
const energyFill = document.querySelector<HTMLElement>("#energy-fill")!;
const energyTrack = document.querySelector<HTMLElement>(".energy-track")!;
const statusMessage = document.querySelector<HTMLElement>("#status-message")!;

const LANES = 4;
const LANE_WIDTH = canvas.width / LANES;
const PLAYER_Y = canvas.height - 105;
const TARGET_SCORE = 4500;
let playerLane = 1;
let targetLane = 1;
let items: FallingItem[] = [];
let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
let score = 0;
let lives = 3;
let energy = 100;
let combo = 1;
let comboTimer = 0;
let level = 1;
let running = false;
let paused = false;
let lastTime = 0;
let spawnTimer = 0;
let nextId = 0;
let audioEnabled = true;
let audioContext: AudioContext | null = null;

function tone(frequency: number, duration: number, type: OscillatorType = "sine") {
  if (!audioEnabled) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function resetGame() {
  playerLane = 1;
  targetLane = 1;
  items = [];
  particles = [];
  score = 0;
  lives = 3;
  energy = 100;
  combo = 1;
  comboTimer = 0;
  level = 1;
  spawnTimer = 250;
  updateHud();
}

function startGame() {
  resetGame();
  running = true;
  paused = false;
  lastTime = performance.now();
  introOverlay.classList.add("hidden");
  resultOverlay.classList.add("hidden");
  pauseCard.classList.add("hidden");
  tone(220, 0.12, "square");
  requestAnimationFrame(loop);
}

function move(direction: number) {
  if (!running || paused) return;
  targetLane = Math.max(0, Math.min(LANES - 1, targetLane + direction));
  tone(120 + targetLane * 35, 0.04, "square");
}

function pulse() {
  if (!running || paused || energy < 35) return;
  energy -= 35;
  const playerX = playerLane * LANE_WIDTH + LANE_WIDTH / 2;
  let destroyed = 0;
  items = items.filter((item) => {
    const itemX = item.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const distance = Math.hypot(itemX - playerX, item.y - PLAYER_Y);
    if (item.kind === "glitch" && distance < 240) {
      burst(itemX, item.y, "#ff3d87", 14);
      destroyed += 1;
      return false;
    }
    return true;
  });
  score += destroyed * 50;
  burst(playerX, PLAYER_Y, "#73f6e5", 24);
  tone(90, 0.22, "sawtooth");
  statusMessage.textContent = destroyed ? `${destroyed} anomalie${destroyed > 1 ? "s" : ""} neutralisée${destroyed > 1 ? "s" : ""}.` : "Impulsion émise.";
  updateHud();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseCard.classList.toggle("hidden", !paused);
  document.querySelector("#pause-button")!.textContent = paused ? "REPRENDRE" : "PAUSE";
  if (!paused) {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function spawnItem() {
  const random = Math.random();
  const kind: FallingKind = random < 0.54 ? "shard" : random < 0.91 ? "glitch" : "battery";
  items.push({
    id: nextId++,
    lane: Math.floor(Math.random() * LANES),
    y: -60,
    speed: 175 + level * 24 + Math.random() * 55,
    kind,
    rotation: Math.random() * Math.PI
  });
}

function burst(x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
  }
}

function collect(item: FallingItem) {
  const x = item.lane * LANE_WIDTH + LANE_WIDTH / 2;
  if (item.kind === "shard") {
    score += 100 * combo;
    combo = Math.min(8, combo + 1);
    comboTimer = 2400;
    energy = Math.min(100, energy + 8);
    burst(x, PLAYER_Y, "#73f6e5", 12);
    tone(430 + combo * 35, 0.08, "triangle");
    statusMessage.textContent = `Fragment synchronisé · combo ×${combo}`;
  } else if (item.kind === "battery") {
    energy = Math.min(100, energy + 50);
    score += 25;
    burst(x, PLAYER_Y, "#ffe66d", 14);
    tone(680, 0.12, "sine");
    statusMessage.textContent = "Impulsion rechargée.";
  } else {
    lives -= 1;
    combo = 1;
    comboTimer = 0;
    burst(x, PLAYER_Y, "#ff3d87", 22);
    tone(80, 0.3, "sawtooth");
    statusMessage.textContent = "Impact détecté. Intégrité du relais réduite.";
  }
}

function update(delta: number) {
  playerLane += (targetLane - playerLane) * Math.min(1, delta * 0.014);
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = Math.max(300, 790 - level * 55) + Math.random() * 180;
  }

  comboTimer -= delta;
  if (comboTimer <= 0) combo = 1;
  energy = Math.min(100, energy + delta * 0.005);

  for (const item of items) {
    item.y += item.speed * (delta / 1000);
    item.rotation += delta * 0.0015;
  }

  const collisions = items.filter((item) => item.y > PLAYER_Y - 46 && item.y < PLAYER_Y + 54 && Math.abs(item.lane - playerLane) < 0.34);
  collisions.forEach(collect);
  const collisionIds = new Set(collisions.map((item) => item.id));
  items = items.filter((item) => item.y < canvas.height + 80 && !collisionIds.has(item.id));

  for (const particle of particles) {
    particle.x += particle.vx * delta / 1000;
    particle.y += particle.vy * delta / 1000;
    particle.vy += 80 * delta / 1000;
    particle.life -= delta / 650;
  }
  particles = particles.filter((particle) => particle.life > 0);

  level = Math.min(9, Math.floor(score / 700) + 1);
  updateHud();
  if (lives <= 0) endGame(false);
  if (score >= TARGET_SCORE) endGame(true);
}

function updateHud() {
  scoreElement.textContent = Math.max(0, score).toString().padStart(6, "0");
  levelElement.textContent = level.toString().padStart(2, "0");
  livesElement.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? "◆" : "◇").join(" ");
  comboElement.textContent = `×${combo}`;
  energyFill.style.width = `${energy}%`;
  energyTrack.setAttribute("aria-valuenow", String(Math.round(energy)));
  const sectors = [
    document.querySelector<HTMLElement>("#relay-one")!,
    document.querySelector<HTMLElement>("#relay-two")!,
    document.querySelector<HTMLElement>("#relay-three")!
  ];
  const entries = document.querySelectorAll<HTMLElement>(".relay-list li");
  sectors.forEach((sector, index) => {
    const sectorStart = index * 1500;
    const progress = Math.min(100, Math.max(0, ((score - sectorStart) / 1500) * 100));
    sector.textContent = progress >= 100 ? "SYNCHRONISÉ" : progress > 0 || index === 0 ? `EN COURS · ${Math.floor(progress)}%` : "HORS LIGNE";
    entries[index].classList.toggle("complete", progress >= 100);
    entries[index].classList.toggle("active", progress > 0 && progress < 100 || index === 0 && score === 0);
  });
}

function endGame(victory: boolean) {
  if (!running) return;
  running = false;
  const best = Math.max(Number(localStorage.getItem("neon-relay-best") ?? 0), score);
  localStorage.setItem("neon-relay-best", String(best));
  document.querySelector("#result-kicker")!.textContent = victory ? "RÉSEAU RESTAURÉ" : "SIGNAL PERDU";
  document.querySelector("#result-title")!.textContent = victory ? "MISSION ACCOMPLIE" : "FIN DE TRANSMISSION";
  document.querySelector("#result-copy")!.textContent = `Score final : ${score.toLocaleString("fr-FR")} · Record : ${best.toLocaleString("fr-FR")}`;
  resultOverlay.classList.remove("hidden");
  tone(victory ? 620 : 110, 0.45, victory ? "triangle" : "sawtooth");
}

function drawGrid(time: number) {
  ctx.fillStyle = "#070b16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.4, 20, canvas.width / 2, canvas.height * 0.4, 560);
  gradient.addColorStop(0, "rgba(30, 83, 101, .24)");
  gradient.addColorStop(1, "rgba(7, 11, 22, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 1;
  for (let lane = 1; lane < LANES; lane++) {
    ctx.strokeStyle = "rgba(115, 246, 229, .12)";
    ctx.beginPath();
    ctx.moveTo(lane * LANE_WIDTH, 0);
    ctx.lineTo(lane * LANE_WIDTH, canvas.height);
    ctx.stroke();
  }
  const offset = (time * 0.08) % 72;
  for (let y = offset - 72; y < canvas.height; y += 72) {
    ctx.strokeStyle = "rgba(115, 246, 229, .07)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawItem(item: FallingItem) {
  const x = item.lane * LANE_WIDTH + LANE_WIDTH / 2;
  ctx.save();
  ctx.translate(x, item.y);
  ctx.rotate(item.rotation);
  if (item.kind === "shard") {
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#73f6e5";
    ctx.fillStyle = "#73f6e5";
    ctx.beginPath();
    ctx.moveTo(0, -23); ctx.lineTo(17, 0); ctx.lineTo(0, 23); ctx.lineTo(-17, 0); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#eafffb";
    ctx.stroke();
  } else if (item.kind === "battery") {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffe66d";
    ctx.strokeStyle = "#ffe66d";
    ctx.lineWidth = 5;
    ctx.strokeRect(-18, -24, 36, 48);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(6, -12); ctx.lineTo(1, 0); ctx.lineTo(9, 0); ctx.lineTo(-5, 14); ctx.lineTo(0, 0); ctx.stroke();
  } else {
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#ff3d87";
    ctx.strokeStyle = "#ff3d87";
    ctx.fillStyle = "rgba(255, 61, 135, .13)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = i % 2 ? 21 : 32;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(13, 13); ctx.moveTo(13, -13); ctx.lineTo(-13, 13); ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(time: number) {
  const x = playerLane * LANE_WIDTH + LANE_WIDTH / 2;
  ctx.save();
  ctx.translate(x, PLAYER_Y);
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#73f6e5";
  ctx.strokeStyle = "#73f6e5";
  ctx.fillStyle = "rgba(115, 246, 229, .14)";
  ctx.lineWidth = 5;
  const pulseScale = 1 + Math.sin(time * 0.006) * 0.05;
  ctx.scale(pulseScale, pulseScale);
  ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(30, 27); ctx.lineTo(0, 16); ctx.lineTo(-30, 27); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f3fffd";
  ctx.beginPath(); ctx.arc(0, 3, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function draw(time: number) {
  drawGrid(time);
  items.forEach(drawItem);
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  drawPlayer(time);
}

function loop(time: number) {
  if (!running || paused) return;
  const delta = Math.min(40, time - lastTime);
  lastTime = time;
  update(delta);
  draw(time);
  if (running) requestAnimationFrame(loop);
}

document.querySelector("#start-button")!.addEventListener("click", startGame);
document.querySelector("#restart-button")!.addEventListener("click", startGame);
document.querySelector("#left-button")!.addEventListener("click", () => move(-1));
document.querySelector("#right-button")!.addEventListener("click", () => move(1));
document.querySelector("#pulse-button")!.addEventListener("click", pulse);
document.querySelector("#pause-button")!.addEventListener("click", togglePause);
document.querySelector("#sound-toggle")!.addEventListener("click", (event) => {
  audioEnabled = !audioEnabled;
  const button = event.currentTarget as HTMLButtonElement;
  button.setAttribute("aria-pressed", String(audioEnabled));
  button.setAttribute("aria-label", audioEnabled ? "Désactiver le son" : "Activer le son");
  button.textContent = audioEnabled ? "SON ●" : "SON ○";
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a" || event.key.toLowerCase() === "q") move(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") move(1);
  if (event.key === " ") pulse();
  if (event.key.toLowerCase() === "p" || event.key === "Escape") togglePause();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && running && !paused) togglePause();
});

document.querySelector("#best-score")!.textContent = Number(localStorage.getItem("neon-relay-best") ?? 0).toString().padStart(6, "0");
updateHud();
draw(0);
