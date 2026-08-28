import "./styles.css";

type GameState = "intro" | "playing" | "upgrade" | "paused" | "gameover" | "victory";
type EnemyType = "scout" | "gunner" | "tank" | "boss";
type PickupType = "repair" | "charge";

interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireTimer: number;
  hitFlash: number;
  angle: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  hostile: boolean;
  pierce: number;
  life: number;
  color: string;
}

interface Pickup {
  x: number;
  y: number;
  type: PickupType;
  life: number;
  phase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  stat: string;
  apply: () => void;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

interface SpawnRing {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Ghost {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  driftX: number;
  driftY: number;
  phase: number;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app mount point");

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <a class="brand" href="#arena" aria-label="Neon Rift, aller au jeu">
        <span class="brand-sigil" aria-hidden="true"><i></i></span>
        <span><strong>NEON RIFT</strong><small>LAST BEACON</small></span>
      </a>
      <div class="top-stats">
        <div><small>MEILLEUR SCORE</small><strong id="best-score">000000</strong></div>
        <button id="sound-toggle" type="button" aria-pressed="true" aria-label="Désactiver le son">SON <span>●</span></button>
        <button id="pause-button" type="button" aria-label="Mettre en pause">PAUSE</button>
      </div>
    </header>

    <section class="hero-copy" aria-labelledby="game-title">
      <div>
        <p class="eyebrow">PROTOCOLE DE SURVIE // 05 VAGUES</p>
        <h1 id="game-title">Tiens la ligne.<br><em>Brise la faille.</em></h1>
      </div>
      <p>Le dernier phare de la cité est encerclé. Pilote le Spectre, absorbe les noyaux ennemis et construis ton arsenal avant l'arrivée du Gardien.</p>
    </section>

    <section class="game-frame" id="arena" aria-label="Arène de Neon Rift">
      <div class="hud" aria-live="polite">
        <div class="hud-cell"><span>VAGUE</span><strong id="wave-value">01 / 05</strong></div>
        <div class="hud-cell score-cell"><span>SCORE</span><strong id="score-value">000000</strong></div>
        <div class="hud-cell combo-cell"><span>CHAÎNE</span><strong id="combo-value">×1.0</strong></div>
        <div class="hud-cell health-cell">
          <span>INTÉGRITÉ</span>
          <div class="meter" role="progressbar" aria-label="Intégrité" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="health-fill"></i></div>
          <strong id="health-value">100</strong>
        </div>
        <div class="hud-cell dash-cell">
          <span>DASH</span>
          <div class="meter" role="progressbar" aria-label="Recharge du dash" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="dash-fill"></i></div>
        </div>
      </div>

      <div class="canvas-stage">
        <canvas id="game-canvas" width="1280" height="720" aria-label="Arène de combat vue du dessus"></canvas>
        <div class="screen-noise" aria-hidden="true"></div>
        <div class="vignette" aria-hidden="true"></div>

        <div class="boss-hud hidden" id="boss-hud">
          <span>LE GARDIEN DE LA FAILLE</span>
          <div><i id="boss-fill"></i></div>
        </div>

        <section class="overlay intro-overlay" id="intro-overlay" data-testid="intro-overlay">
          <div class="intro-grid">
            <div class="transmission">
              <p class="eyebrow">TRANSMISSION // PRIORITÉ OMEGA</p>
              <h2>LE DERNIER<br><em>PHARE</em></h2>
              <p class="intro-text">Survis à cinq vagues. Ton canon vise automatiquement la menace la plus proche. Chaque secteur sécurisé te permet de choisir une mutation permanente.</p>
              <button class="primary-button" id="start-button" data-testid="start-button" type="button"><span>LANCER L'INTERCEPTION</span><b>→</b></button>
            </div>
            <div class="briefing">
              <p class="eyebrow">SYSTÈMES DU SPECTRE</p>
              <ul>
                <li><kbd>WASD</kbd><span><strong>DÉPLACEMENT LIBRE</strong><small>Flèches également disponibles</small></span></li>
                <li><kbd>ESPACE</kbd><span><strong>DASH PHASÉ</strong><small>Invulnérable pendant la traversée</small></span></li>
                <li><kbd>SOURIS</kbd><span><strong>GUIDAGE MANUEL</strong><small>Sinon, verrouillage automatique</small></span></li>
                <li><kbd>P</kbd><span><strong>SUSPENSION</strong><small>Pause instantanée</small></span></li>
              </ul>
              <div class="enemy-codex">
                <span><i class="enemy-icon scout"></i>Éclaireur</span>
                <span><i class="enemy-icon gunner"></i>Artilleur</span>
                <span><i class="enemy-icon tank"></i>Colosse</span>
              </div>
            </div>
          </div>
        </section>

        <section class="overlay upgrade-overlay hidden" id="upgrade-overlay" data-testid="upgrade-overlay">
          <div class="upgrade-wrap">
            <p class="eyebrow">SECTEUR SÉCURISÉ // MUTATION DISPONIBLE</p>
            <h2>CHOISIS TON <em>AVANTAGE</em></h2>
            <p>Une seule amélioration peut être intégrée avant la prochaine vague.</p>
            <div class="upgrade-grid" id="upgrade-grid"></div>
          </div>
        </section>

        <section class="overlay result-overlay hidden" id="result-overlay" data-testid="result-overlay">
          <div class="result-card">
            <p class="eyebrow" id="result-kicker">TRANSMISSION INTERROMPUE</p>
            <h2 id="result-title">LE PHARE<br>S'EST ÉTEINT</h2>
            <div class="result-stats">
              <div><span>SCORE</span><strong id="result-score">0</strong></div>
              <div><span>VAGUE</span><strong id="result-wave">1 / 5</strong></div>
              <div><span>ÉLIMINATIONS</span><strong id="result-kills">0</strong></div>
            </div>
            <button class="primary-button" id="restart-button" type="button"><span>NOUVELLE INTERCEPTION</span><b>↻</b></button>
          </div>
        </section>

        <div class="pause-overlay hidden" id="pause-overlay" role="status"><span>SYSTÈME SUSPENDU</span><strong>PAUSE</strong><small>Appuie sur P pour reprendre</small></div>
        <div class="wave-banner hidden" id="wave-banner"><small>SECTEUR</small><strong id="wave-banner-value">01</strong><span id="wave-banner-name">PÉRIPHÉRIE</span></div>
      </div>

      <div class="mobile-controls" aria-label="Commandes tactiles">
        <div class="dpad">
          <button data-move="up" aria-label="Monter">↑</button>
          <button data-move="left" aria-label="Aller à gauche">←</button>
          <button data-move="down" aria-label="Descendre">↓</button>
          <button data-move="right" aria-label="Aller à droite">→</button>
        </div>
        <button class="dash-button" id="mobile-dash" type="button">DASH</button>
      </div>
    </section>

    <section class="feature-strip" aria-label="Caractéristiques du jeu">
      <article><span>01</span><div><strong>COMBAT RÉACTIF</strong><p>Déplacement libre, verrouillage automatique et dash invulnérable.</p></div></article>
      <article><span>02</span><div><strong>ARSENAL ÉVOLUTIF</strong><p>Construis une configuration différente à chaque tentative.</p></div></article>
      <article><span>03</span><div><strong>AFFRONTEMENT FINAL</strong><p>Survis aux secteurs pour défier le Gardien de la faille.</p></div></article>
    </section>

    <footer><span>NEON RIFT // BUILD 2.0</span><span>CLAVIER · SOURIS · TACTILE</span><span>AUCUNE DONNÉE TRANSMISE</span></footer>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas")!;
const ctx = canvas.getContext("2d")!;
const W = canvas.width;
const H = canvas.height;
const ARENA = { left: 48, top: 48, right: W - 48, bottom: H - 48 };

const ui = {
  intro: document.querySelector<HTMLElement>("#intro-overlay")!,
  upgrade: document.querySelector<HTMLElement>("#upgrade-overlay")!,
  result: document.querySelector<HTMLElement>("#result-overlay")!,
  pause: document.querySelector<HTMLElement>("#pause-overlay")!,
  boss: document.querySelector<HTMLElement>("#boss-hud")!,
  waveBanner: document.querySelector<HTMLElement>("#wave-banner")!,
  score: document.querySelector<HTMLElement>("#score-value")!,
  wave: document.querySelector<HTMLElement>("#wave-value")!,
  combo: document.querySelector<HTMLElement>("#combo-value")!,
  health: document.querySelector<HTMLElement>("#health-value")!,
  healthFill: document.querySelector<HTMLElement>("#health-fill")!,
  dashFill: document.querySelector<HTMLElement>("#dash-fill")!,
  bossFill: document.querySelector<HTMLElement>("#boss-fill")!,
  best: document.querySelector<HTMLElement>("#best-score")!,
  upgradeGrid: document.querySelector<HTMLElement>("#upgrade-grid")!
};

const keys = new Set<string>();
const touchMoves = new Set<string>();
const pointer = { x: W / 2, y: H / 2, activeUntil: 0 };
const waveNames = ["PÉRIPHÉRIE", "CANAL ROUGE", "NŒUD FANTÔME", "CŒUR DE VERRE", "LA FAILLE"];
const stars = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 1.5 + .2, phase: Math.random() * Math.PI * 2 }));

let state: GameState = "intro";
let previousState: GameState = "playing";
let lastTime = performance.now();
let elapsed = 0;
let wave = 1;
let score = 0;
let kills = 0;
let combo = 1;
let comboTimer = 0;
let waveSpawnRemaining = 0;
let spawnTimer = 0;
let waveStarted = false;
let nextEnemyId = 1;
let shake = 0;
let flash = 0;
let bannerTimer = 0;
let audioEnabled = true;
let audioContext: AudioContext | null = null;
let shotSoundTimer = 0;

const player = {
  x: W / 2,
  y: H / 2,
  radius: 17,
  hp: 100,
  maxHp: 100,
  speed: 285,
  damage: 22,
  fireRate: 245,
  fireTimer: 0,
  bulletSpeed: 760,
  multishot: 1,
  pierce: 0,
  dashTimer: 0,
  dashCooldown: 1500,
  dashDuration: 0,
  invulnerable: 0,
  shield: 0,
  aimAngle: -Math.PI / 2
};

let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let pickups: Pickup[] = [];
let particles: Particle[] = [];
let floatingTexts: FloatingText[] = [];
let shockwaves: Shockwave[] = [];
let spawnRings: SpawnRing[] = [];
let ghosts: Ghost[] = [];
let muzzleFlash = 0;
let lastComboStep = 1;
const nebulae: Nebula[] = Array.from({ length: 5 }, () => ({
  x: Math.random() * W, y: Math.random() * H, radius: 140 + Math.random() * 180,
  color: [`rgba(127,255,234,`, `rgba(160,108,255,`, `rgba(255,71,126,`][Math.floor(Math.random() * 3)],
  driftX: (Math.random() - .5) * .012, driftY: (Math.random() - .5) * .012, phase: Math.random() * Math.PI * 2
}));

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function sound(frequency: number, duration = .08, type: OscillatorType = "triangle", volume = .035) {
  if (!audioEnabled) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function burst(x: number, y: number, color: string, count = 12, force = 180) {
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * force + 25;
    const life = 280 + Math.random() * 420;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: 1.5 + Math.random() * 3.5, color });
  }
}

function spawnFloatingText(x: number, y: number, text: string, color: string, size = 13) {
  floatingTexts.push({ x: x + (Math.random() - .5) * 14, y, vy: -46, text, color, size, life: 620, maxLife: 620 });
}

function spawnShockwave(x: number, y: number, color: string, maxRadius = 90, width = 3) {
  shockwaves.push({ x, y, radius: 4, maxRadius, color, life: 420, maxLife: 420, width });
}

function spawnMaterializeRing(x: number, y: number, color: string) {
  spawnRings.push({ x, y, radius: 4, color, life: 480, maxLife: 480 });
}

function resetPlayer() {
  Object.assign(player, {
    x: W / 2, y: H / 2, hp: 100, maxHp: 100, speed: 285, damage: 22,
    fireRate: 245, fireTimer: 0, bulletSpeed: 760, multishot: 1, pierce: 0,
    dashTimer: 0, dashCooldown: 1500, dashDuration: 0, invulnerable: 0, shield: 0, aimAngle: -Math.PI / 2
  });
}

function startGame() {
  resetPlayer();
  enemies = [];
  bullets = [];
  pickups = [];
  particles = [];
  floatingTexts = [];
  shockwaves = [];
  spawnRings = [];
  ghosts = [];
  wave = 1;
  score = 0;
  kills = 0;
  combo = 1;
  comboTimer = 0;
  lastComboStep = 1;
  muzzleFlash = 0;
  nextEnemyId = 1;
  ui.intro.classList.add("hidden");
  ui.result.classList.add("hidden");
  ui.upgrade.classList.add("hidden");
  ui.pause.classList.add("hidden");
  ui.boss.classList.add("hidden");
  state = "playing";
  beginWave(1);
  sound(190, .18, "sawtooth", .05);
  updateHud();
}

function beginWave(number: number) {
  wave = number;
  waveStarted = true;
  waveSpawnRemaining = number === 5 ? 1 : 7 + number * 5;
  spawnTimer = 750;
  bannerTimer = 1900;
  ui.waveBanner.classList.remove("hidden");
  document.querySelector("#wave-banner-value")!.textContent = String(number).padStart(2, "0");
  document.querySelector("#wave-banner-name")!.textContent = waveNames[number - 1];
  if (number === 5) ui.boss.classList.remove("hidden");
}

function edgeSpawn() {
  const side = Math.floor(Math.random() * 4);
  const margin = 25;
  if (side === 0) return { x: ARENA.left + Math.random() * (ARENA.right - ARENA.left), y: ARENA.top - margin };
  if (side === 1) return { x: ARENA.right + margin, y: ARENA.top + Math.random() * (ARENA.bottom - ARENA.top) };
  if (side === 2) return { x: ARENA.left + Math.random() * (ARENA.right - ARENA.left), y: ARENA.bottom + margin };
  return { x: ARENA.left - margin, y: ARENA.top + Math.random() * (ARENA.bottom - ARENA.top) };
}

function spawnEnemy(forcedType?: EnemyType, position?: { x: number; y: number }) {
  const pos = position ?? edgeSpawn();
  let type = forcedType;
  if (!type) {
    const roll = Math.random();
    type = wave < 2 ? "scout" : roll < .52 ? "scout" : roll < .82 || wave < 3 ? "gunner" : "tank";
  }
  const stats = {
    scout: { radius: 15, hp: 38 + wave * 7, speed: 112 + wave * 5, fire: 99999 },
    gunner: { radius: 19, hp: 70 + wave * 10, speed: 68 + wave * 3, fire: 1250 },
    tank: { radius: 28, hp: 180 + wave * 24, speed: 43 + wave * 2, fire: 99999 },
    boss: { radius: 62, hp: 2600, speed: 38, fire: 780 }
  }[type];
  enemies.push({
    id: nextEnemyId++, type, x: pos.x, y: pos.y, vx: 0, vy: 0, radius: stats.radius,
    hp: stats.hp, maxHp: stats.hp, speed: stats.speed, fireTimer: stats.fire * (.65 + Math.random() * .5), hitFlash: 0, angle: Math.random() * Math.PI * 2
  });
  const ringColor = type === "gunner" ? "#a06cff" : type === "tank" ? "#ffd166" : type === "boss" ? "#ffffff" : "#ff477e";
  spawnMaterializeRing(pos.x, pos.y, ringColor);
}

function movementVector() {
  let x = 0;
  let y = 0;
  if (keys.has("arrowleft") || keys.has("a") || keys.has("q") || touchMoves.has("left")) x -= 1;
  if (keys.has("arrowright") || keys.has("d") || touchMoves.has("right")) x += 1;
  if (keys.has("arrowup") || keys.has("w") || keys.has("z") || touchMoves.has("up")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s") || touchMoves.has("down")) y += 1;
  return normalize(x, y);
}

function dash() {
  if (state !== "playing" || player.dashTimer > 0) return;
  const moving = movementVector();
  if (![...keys, ...touchMoves].some((key) => ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "q", "d", "w", "z", "s", "left", "right", "up", "down"].includes(key))) {
    moving.x = Math.cos(player.aimAngle + Math.PI);
    moving.y = Math.sin(player.aimAngle + Math.PI);
  }
  player.dashDuration = 210;
  player.dashTimer = player.dashCooldown;
  player.invulnerable = 330;
  burst(player.x, player.y, "#7fffea", 28, 250);
  const steps = 6;
  for (let index = 1; index <= steps; index++) {
    const t = index / steps;
    ghosts.push({
      x: clamp(player.x + moving.x * 115 * t, ARENA.left + player.radius, ARENA.right - player.radius),
      y: clamp(player.y + moving.y * 115 * t, ARENA.top + player.radius, ARENA.bottom - player.radius),
      angle: player.aimAngle, life: 260, maxLife: 260
    });
  }
  player.x = clamp(player.x + moving.x * 115, ARENA.left + player.radius, ARENA.right - player.radius);
  player.y = clamp(player.y + moving.y * 115, ARENA.top + player.radius, ARENA.bottom - player.radius);
  shake = 9;
  sound(105, .22, "sawtooth", .055);
}

function nearestEnemy() {
  return enemies.reduce<Enemy | null>((closest, enemy) => !closest || distance(player, enemy) < distance(player, closest) ? enemy : closest, null);
}

function firePlayerBullet() {
  const target = nearestEnemy();
  if (!target) return;
  const usePointer = performance.now() < pointer.activeUntil;
  const angle = usePointer ? Math.atan2(pointer.y - player.y, pointer.x - player.x) : Math.atan2(target.y - player.y, target.x - player.x);
  player.aimAngle = angle;
  const spread = .13;
  for (let index = 0; index < player.multishot; index++) {
    const offset = (index - (player.multishot - 1) / 2) * spread;
    bullets.push({
      x: player.x + Math.cos(angle) * 24, y: player.y + Math.sin(angle) * 24,
      vx: Math.cos(angle + offset) * player.bulletSpeed, vy: Math.sin(angle + offset) * player.bulletSpeed,
      radius: 4.5, damage: player.damage, hostile: false, pierce: player.pierce, life: 1500, color: "#7fffea"
    });
  }
  player.fireTimer = player.fireRate;
  muzzleFlash = 90;
  if (shotSoundTimer <= 0) {
    sound(330, .035, "square", .012);
    shotSoundTimer = 150;
  }
}

function fireHostile(enemy: Enemy, radial = false) {
  const baseAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const count = radial ? 10 : enemy.type === "boss" ? 3 : 1;
  for (let index = 0; index < count; index++) {
    const angle = radial ? enemy.angle + index * Math.PI * 2 / count : baseAngle + (index - (count - 1) / 2) * .22;
    const speed = enemy.type === "boss" ? 270 : 235;
    bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: enemy.type === "boss" ? 8 : 6, damage: enemy.type === "boss" ? 14 : 10, hostile: true, pierce: 0, life: 4600, color: "#ff477e" });
  }
  enemy.fireTimer = enemy.type === "boss" ? 720 : 1400;
}

function damagePlayer(amount: number) {
  if (player.invulnerable > 0) return;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invulnerable = 500;
    burst(player.x, player.y, "#ffd166", 22, 220);
    sound(520, .16, "triangle", .045);
    return;
  }
  player.hp -= amount;
  player.invulnerable = 700;
  combo = 1;
  comboTimer = 0;
  lastComboStep = 1;
  flash = 110;
  shake = 18;
  burst(player.x, player.y, "#ff477e", 28, 260);
  spawnFloatingText(player.x, player.y - 26, `-${Math.round(amount)}`, "#ff477e", 15);
  sound(72, .35, "sawtooth", .065);
  if (player.hp <= 0) finishGame(false);
}

function killEnemy(enemy: Enemy) {
  kills += 1;
  const values = { scout: 100, gunner: 180, tank: 320, boss: 2500 };
  score += Math.round(values[enemy.type] * combo);
  combo = Math.min(9.9, combo + (enemy.type === "boss" ? 1 : .15));
  comboTimer = 2400;
  const color = enemy.type === "gunner" ? "#a06cff" : enemy.type === "tank" ? "#ffd166" : enemy.type === "boss" ? "#ffffff" : "#ff477e";
  burst(enemy.x, enemy.y, color, enemy.type === "boss" ? 90 : 20, enemy.type === "boss" ? 420 : 220);
  spawnShockwave(enemy.x, enemy.y, color, enemy.type === "boss" ? 260 : enemy.type === "tank" ? 130 : 70, enemy.type === "boss" ? 6 : 3);
  spawnFloatingText(enemy.x, enemy.y - enemy.radius - 6, `+${Math.round(values[enemy.type] * combo)}`, "#ffd166", enemy.type === "boss" ? 20 : 12);
  if (Math.floor(combo) > lastComboStep && combo >= 2) {
    lastComboStep = Math.floor(combo);
    spawnFloatingText(player.x, player.y - 46, `CHAÎNE ×${lastComboStep}`, "#7fffea", 14);
  }
  shake = Math.max(shake, enemy.type === "boss" ? 30 : enemy.type === "tank" ? 13 : 6);
  if (enemy.type !== "boss" && Math.random() < .16) pickups.push({ x: enemy.x, y: enemy.y, type: Math.random() < .45 ? "repair" : "charge", life: 8000, phase: Math.random() * Math.PI * 2 });
  sound(enemy.type === "boss" ? 58 : 140 + Math.random() * 70, enemy.type === "boss" ? .7 : .08, "sawtooth", enemy.type === "boss" ? .08 : .02);
  if (enemy.type === "boss") finishGame(true);
}

function updatePlayer(delta: number) {
  const moving = movementVector();
  const hasMovement = Math.abs(moving.x) + Math.abs(moving.y) > .1;
  const speed = player.speed * (player.dashDuration > 0 ? 2.2 : 1);
  if (hasMovement) {
    player.x = clamp(player.x + moving.x * speed * delta / 1000, ARENA.left + player.radius, ARENA.right - player.radius);
    player.y = clamp(player.y + moving.y * speed * delta / 1000, ARENA.top + player.radius, ARENA.bottom - player.radius);
    if (Math.random() < delta / 26) particles.push({ x: player.x - moving.x * 18, y: player.y - moving.y * 18, vx: -moving.x * 75 + (Math.random() - .5) * 40, vy: -moving.y * 75 + (Math.random() - .5) * 40, life: 260, maxLife: 260, size: 2 + Math.random() * 3, color: "#7fffea" });
  }
  player.fireTimer -= delta;
  player.dashTimer -= delta;
  player.dashDuration -= delta;
  player.invulnerable -= delta;
  shotSoundTimer -= delta;
  if (player.fireTimer <= 0) firePlayerBullet();
}

function updateEnemies(delta: number) {
  for (const enemy of enemies) {
    const toPlayer = normalize(player.x - enemy.x, player.y - enemy.y);
    const playerDistance = distance(player, enemy);
    enemy.angle += delta * .0007;
    enemy.fireTimer -= delta;
    enemy.hitFlash -= delta;
    if (enemy.type === "scout" || enemy.type === "tank") {
      enemy.vx += (toPlayer.x * enemy.speed - enemy.vx) * .06;
      enemy.vy += (toPlayer.y * enemy.speed - enemy.vy) * .06;
    } else if (enemy.type === "gunner") {
      const direction = playerDistance < 220 ? -1 : playerDistance > 350 ? 1 : 0;
      const strafe = Math.sin(elapsed * .001 + enemy.id) * .45;
      enemy.vx += ((toPlayer.x * direction - toPlayer.y * strafe) * enemy.speed - enemy.vx) * .05;
      enemy.vy += ((toPlayer.y * direction + toPlayer.x * strafe) * enemy.speed - enemy.vy) * .05;
      if (enemy.fireTimer <= 0) fireHostile(enemy);
    } else {
      const direction = playerDistance > 280 ? 1 : -.3;
      enemy.vx += (toPlayer.x * enemy.speed * direction - toPlayer.y * 20 - enemy.vx) * .025;
      enemy.vy += (toPlayer.y * enemy.speed * direction + toPlayer.x * 20 - enemy.vy) * .025;
      if (enemy.fireTimer <= 0) fireHostile(enemy, Math.random() < .36);
      if (Math.random() < delta / 7000 && enemies.filter((item) => item.type !== "boss").length < 5) {
        spawnEnemy("scout", { x: enemy.x + (Math.random() - .5) * 120, y: enemy.y + (Math.random() - .5) * 120 });
      }
    }
    enemy.x += enemy.vx * delta / 1000;
    enemy.y += enemy.vy * delta / 1000;
    if (playerDistance < player.radius + enemy.radius) {
      damagePlayer(enemy.type === "tank" ? 24 : enemy.type === "boss" ? 30 : 15);
      enemy.x -= toPlayer.x * 28;
      enemy.y -= toPlayer.y * 28;
    }
  }
}

function updateBullets(delta: number) {
  for (const bullet of bullets) {
    bullet.x += bullet.vx * delta / 1000;
    bullet.y += bullet.vy * delta / 1000;
    bullet.life -= delta;
    if (bullet.hostile && distance(bullet, player) < bullet.radius + player.radius) {
      bullet.life = 0;
      damagePlayer(bullet.damage);
    }
    if (!bullet.hostile) {
      for (const enemy of enemies) {
        if (enemy.hp > 0 && distance(bullet, enemy) < bullet.radius + enemy.radius) {
          enemy.hp -= bullet.damage;
          enemy.hitFlash = 70;
          burst(bullet.x, bullet.y, "#7fffea", 4, 80);
          spawnFloatingText(bullet.x, bullet.y, String(Math.round(bullet.damage)), "#f4fffd", 10);
          if (bullet.pierce > 0) bullet.pierce -= 1;
          else bullet.life = 0;
          if (enemy.hp <= 0) killEnemy(enemy);
          break;
        }
      }
    }
  }
  bullets = bullets.filter((bullet) => bullet.life > 0 && bullet.x > -80 && bullet.x < W + 80 && bullet.y > -80 && bullet.y < H + 80);
  enemies = enemies.filter((enemy) => enemy.hp > 0);
}

function updatePickups(delta: number) {
  for (const pickup of pickups) {
    pickup.life -= delta;
    pickup.phase += delta * .004;
    const toward = normalize(player.x - pickup.x, player.y - pickup.y);
    if (distance(pickup, player) < 140) {
      pickup.x += toward.x * 230 * delta / 1000;
      pickup.y += toward.y * 230 * delta / 1000;
    }
    if (distance(pickup, player) < player.radius + 13) {
      pickup.life = 0;
      if (pickup.type === "repair") player.hp = Math.min(player.maxHp, player.hp + 22);
      else player.dashTimer = Math.max(0, player.dashTimer - 900);
      score += 35;
      burst(pickup.x, pickup.y, pickup.type === "repair" ? "#62ff9d" : "#ffd166", 14, 140);
      sound(pickup.type === "repair" ? 620 : 760, .12, "triangle", .035);
    }
  }
  pickups = pickups.filter((pickup) => pickup.life > 0);
}

function updateParticles(delta: number) {
  for (const particle of particles) {
    particle.x += particle.vx * delta / 1000;
    particle.y += particle.vy * delta / 1000;
    particle.vx *= .985;
    particle.vy *= .985;
    particle.life -= delta;
  }
  particles = particles.filter((particle) => particle.life > 0);
}

function updateFloatingTexts(delta: number) {
  for (const text of floatingTexts) {
    text.y += text.vy * delta / 1000;
    text.vy *= .94;
    text.life -= delta;
  }
  floatingTexts = floatingTexts.filter((text) => text.life > 0);
}

function updateShockwaves(delta: number) {
  for (const wave of shockwaves) {
    wave.life -= delta;
    const t = 1 - clamp(wave.life / wave.maxLife, 0, 1);
    wave.radius = wave.maxRadius * (1 - (1 - t) * (1 - t));
  }
  shockwaves = shockwaves.filter((wave) => wave.life > 0);
}

function updateSpawnRings(delta: number) {
  for (const ring of spawnRings) {
    ring.life -= delta;
    const t = 1 - clamp(ring.life / ring.maxLife, 0, 1);
    ring.radius = 6 + t * 46;
  }
  spawnRings = spawnRings.filter((ring) => ring.life > 0);
}

function updateGhosts(delta: number) {
  for (const ghost of ghosts) ghost.life -= delta;
  ghosts = ghosts.filter((ghost) => ghost.life > 0);
}

function updateWave(delta: number) {
  if (!waveStarted) return;
  spawnTimer -= delta;
  if (waveSpawnRemaining > 0 && spawnTimer <= 0) {
    spawnEnemy(wave === 5 ? "boss" : undefined);
    waveSpawnRemaining -= 1;
    spawnTimer = wave === 5 ? 999999 : Math.max(280, 820 - wave * 85) + Math.random() * 240;
  }
  if (waveSpawnRemaining === 0 && enemies.length === 0) {
    waveStarted = false;
    if (wave >= 5) finishGame(true);
    else showUpgrades();
  }
}

function update(delta: number) {
  elapsed += delta;
  bannerTimer -= delta;
  comboTimer -= delta;
  flash -= delta;
  shake *= .88;
  if (bannerTimer <= 0) ui.waveBanner.classList.add("hidden");
  if (comboTimer <= 0) combo = Math.max(1, combo - delta * .0015);
  updatePlayer(delta);
  updateEnemies(delta);
  updateBullets(delta);
  updatePickups(delta);
  updateParticles(delta);
  updateFloatingTexts(delta);
  updateShockwaves(delta);
  updateSpawnRings(delta);
  updateGhosts(delta);
  muzzleFlash -= delta;
  updateWave(delta);
  updateHud();
}

const upgrades: Upgrade[] = [
  { id: "damage", name: "CANON NOVA", description: "Les projectiles infligent davantage de dégâts.", stat: "+30% dégâts", apply: () => player.damage *= 1.3 },
  { id: "rate", name: "CŒUR RAPIDE", description: "Le cycle du canon se contracte fortement.", stat: "+24% cadence", apply: () => player.fireRate *= .76 },
  { id: "multi", name: "PRISME TRIPLE", description: "Ajoute un projectile à chaque salve.", stat: "+1 projectile", apply: () => player.multishot += 1 },
  { id: "pierce", name: "PHASE DENSE", description: "Les tirs traversent une cible supplémentaire.", stat: "+1 perforation", apply: () => player.pierce += 1 },
  { id: "speed", name: "MOTEUR ION", description: "Le Spectre gagne en vitesse de déplacement.", stat: "+18% vitesse", apply: () => player.speed *= 1.18 },
  { id: "dash", name: "SAUT QUANTIQUE", description: "Le dash phasé se recharge plus vite.", stat: "−25% recharge", apply: () => player.dashCooldown *= .75 },
  { id: "hull", name: "COQUE VIVANTE", description: "Renforce et répare intégralement le vaisseau.", stat: "+30 intégrité", apply: () => { player.maxHp += 30; player.hp = player.maxHp; } },
  { id: "shield", name: "ÉGIDE SOLAIRE", description: "Annule les deux prochains impacts.", stat: "+2 boucliers", apply: () => player.shield += 2 },
  { id: "velocity", name: "MUNITIONS VECTEUR", description: "Les projectiles accélèrent et grossissent.", stat: "+25% vélocité", apply: () => player.bulletSpeed *= 1.25 }
];

function showUpgrades() {
  state = "upgrade";
  bullets = bullets.filter((bullet) => !bullet.hostile);
  player.hp = Math.min(player.maxHp, player.hp + 18);
  const choices = [...upgrades].sort(() => Math.random() - .5).slice(0, 3);
  ui.upgradeGrid.innerHTML = choices.map((upgrade, index) => `
    <button class="upgrade-card" type="button" data-upgrade="${upgrade.id}">
      <span>0${index + 1}</span>
      <i aria-hidden="true"></i>
      <strong>${upgrade.name}</strong>
      <p>${upgrade.description}</p>
      <b>${upgrade.stat}</b>
    </button>
  `).join("");
  ui.upgrade.classList.remove("hidden");
  ui.upgradeGrid.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.addEventListener("click", () => {
      const upgrade = upgrades.find((item) => item.id === button.dataset.upgrade)!;
      upgrade.apply();
      ui.upgrade.classList.add("hidden");
      sound(470, .25, "triangle", .05);
      burst(player.x, player.y, "#ffd166", 35, 260);
      state = "playing";
      beginWave(wave + 1);
    });
  });
}

function finishGame(victory: boolean) {
  if (state === "gameover" || state === "victory") return;
  state = victory ? "victory" : "gameover";
  const best = Math.max(score, Number(localStorage.getItem("neon-rift-best") ?? 0));
  localStorage.setItem("neon-rift-best", String(best));
  ui.best.textContent = String(best).padStart(6, "0");
  document.querySelector("#result-kicker")!.textContent = victory ? "FAILLE SCELLÉE // CITÉ SÉCURISÉE" : "TRANSMISSION INTERROMPUE";
  document.querySelector("#result-title")!.innerHTML = victory ? "LE PHARE<br><em>RAYONNE</em>" : "LE PHARE<br>S'EST ÉTEINT";
  document.querySelector("#result-score")!.textContent = score.toLocaleString("fr-FR");
  document.querySelector("#result-wave")!.textContent = `${wave} / 5`;
  document.querySelector("#result-kills")!.textContent = String(kills);
  ui.result.classList.remove("hidden");
  ui.boss.classList.add("hidden");
  sound(victory ? 640 : 62, victory ? .7 : .5, victory ? "triangle" : "sawtooth", .07);
}

function togglePause() {
  if (!["playing", "paused"].includes(state)) return;
  if (state === "paused") {
    state = previousState;
    ui.pause.classList.add("hidden");
    document.querySelector("#pause-button")!.textContent = "PAUSE";
    lastTime = performance.now();
  } else {
    previousState = state;
    state = "paused";
    ui.pause.classList.remove("hidden");
    document.querySelector("#pause-button")!.textContent = "REPRENDRE";
  }
}

function updateHud() {
  ui.score.textContent = String(Math.round(score)).padStart(6, "0");
  ui.wave.textContent = `${String(wave).padStart(2, "0")} / 05`;
  ui.combo.textContent = `×${combo.toFixed(1)}`;
  ui.health.textContent = String(Math.max(0, Math.ceil(player.hp)));
  const healthPercent = clamp(player.hp / player.maxHp * 100, 0, 100);
  ui.healthFill.style.width = `${healthPercent}%`;
  ui.healthFill.parentElement!.setAttribute("aria-valuenow", String(Math.round(healthPercent)));
  const dashPercent = clamp((1 - player.dashTimer / player.dashCooldown) * 100, 0, 100);
  ui.dashFill.style.width = `${dashPercent}%`;
  ui.dashFill.parentElement!.setAttribute("aria-valuenow", String(Math.round(dashPercent)));
  const boss = enemies.find((enemy) => enemy.type === "boss");
  if (boss) ui.bossFill.style.width = `${clamp(boss.hp / boss.maxHp * 100, 0, 100)}%`;
}

function polygon(sides: number, radius: number, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index++) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawBackground(time: number) {
  ctx.fillStyle = "#030711";
  ctx.fillRect(0, 0, W, H);
  for (const cloud of nebulae) {
    cloud.x += cloud.driftX;
    cloud.y += cloud.driftY;
    if (cloud.x < -cloud.radius) cloud.x = W + cloud.radius;
    if (cloud.x > W + cloud.radius) cloud.x = -cloud.radius;
    if (cloud.y < -cloud.radius) cloud.y = H + cloud.radius;
    if (cloud.y > H + cloud.radius) cloud.y = -cloud.radius;
    const pulse = .05 + (Math.sin(time * .0003 + cloud.phase) + 1) * .025;
    const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
    gradient.addColorStop(0, `${cloud.color}${pulse})`);
    gradient.addColorStop(1, `${cloud.color}0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }
  const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 440);
  glow.addColorStop(0, "rgba(31, 91, 106, .20)");
  glow.addColorStop(1, "rgba(3, 7, 17, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  for (const star of stars) {
    const alpha = .18 + (Math.sin(time * .0015 + star.phase) + 1) * .12;
    ctx.fillStyle = `rgba(186, 226, 229, ${alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.strokeStyle = "rgba(89, 216, 211, .07)";
  ctx.lineWidth = 1;
  const gridOffset = time * .012 % 56;
  for (let x = ARENA.left + gridOffset; x < ARENA.right; x += 56) {
    ctx.beginPath(); ctx.moveTo(x, ARENA.top); ctx.lineTo(x, ARENA.bottom); ctx.stroke();
  }
  for (let y = ARENA.top + gridOffset; y < ARENA.bottom; y += 56) {
    ctx.beginPath(); ctx.moveTo(ARENA.left, y); ctx.lineTo(ARENA.right, y); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(127, 255, 234, .27)";
  ctx.strokeRect(ARENA.left, ARENA.top, ARENA.right - ARENA.left, ARENA.bottom - ARENA.top);
  const corner = 22;
  ctx.strokeStyle = "#7fffea";
  ctx.beginPath();
  ctx.moveTo(ARENA.left, ARENA.top + corner); ctx.lineTo(ARENA.left, ARENA.top); ctx.lineTo(ARENA.left + corner, ARENA.top);
  ctx.moveTo(ARENA.right - corner, ARENA.top); ctx.lineTo(ARENA.right, ARENA.top); ctx.lineTo(ARENA.right, ARENA.top + corner);
  ctx.moveTo(ARENA.right, ARENA.bottom - corner); ctx.lineTo(ARENA.right, ARENA.bottom); ctx.lineTo(ARENA.right - corner, ARENA.bottom);
  ctx.moveTo(ARENA.left + corner, ARENA.bottom); ctx.lineTo(ARENA.left, ARENA.bottom); ctx.lineTo(ARENA.left, ARENA.bottom - corner);
  ctx.stroke();
}

function drawPlayer(time: number) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.aimAngle + Math.PI / 2);
  ctx.globalAlpha = player.invulnerable > 0 && Math.floor(time / 70) % 2 ? .35 : 1;
  ctx.shadowColor = "#7fffea";
  ctx.shadowBlur = 20 + Math.sin(time * .008) * 4;
  ctx.strokeStyle = "#7fffea";
  ctx.fillStyle = "rgba(127, 255, 234, .12)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(17, 17); ctx.lineTo(0, 11); ctx.lineTo(-17, 17); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#f4fffd";
  ctx.beginPath(); ctx.arc(0, 1, 4, 0, Math.PI * 2); ctx.fill();
  if (player.shield > 0) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.globalAlpha = .55 + Math.sin(time * .01) * .2;
    ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(enemy: Enemy, time: number) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);
  const isHit = enemy.hitFlash > 0;
  if (enemy.type === "scout") {
    ctx.shadowColor = "#ff477e"; ctx.shadowBlur = 16; ctx.strokeStyle = isHit ? "#fff" : "#ff477e"; ctx.fillStyle = "rgba(255,71,126,.12)"; ctx.lineWidth = 3;
    polygon(4, enemy.radius, Math.PI / 4); ctx.fill(); ctx.stroke();
    ctx.rotate(-enemy.angle * 2); polygon(3, enemy.radius * .48, time * .003); ctx.stroke();
  } else if (enemy.type === "gunner") {
    ctx.shadowColor = "#a06cff"; ctx.shadowBlur = 18; ctx.strokeStyle = isHit ? "#fff" : "#a06cff"; ctx.fillStyle = "rgba(160,108,255,.13)"; ctx.lineWidth = 3;
    polygon(6, enemy.radius); ctx.fill(); ctx.stroke();
    ctx.rotate(-enemy.angle * 1.8); ctx.beginPath(); ctx.arc(0, 0, enemy.radius * .48, 0, Math.PI * 1.55); ctx.stroke();
  } else if (enemy.type === "tank") {
    ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 18; ctx.strokeStyle = isHit ? "#fff" : "#ffd166"; ctx.fillStyle = "rgba(255,209,102,.12)"; ctx.lineWidth = 4;
    polygon(8, enemy.radius); ctx.fill(); ctx.stroke();
    ctx.rotate(-enemy.angle * 1.4); polygon(4, enemy.radius * .55, Math.PI / 4); ctx.stroke();
  } else {
    ctx.shadowColor = "#ff477e"; ctx.shadowBlur = 35; ctx.strokeStyle = isHit ? "#fff" : "#ff477e"; ctx.fillStyle = "rgba(255,71,126,.09)"; ctx.lineWidth = 4;
    polygon(10, enemy.radius); ctx.fill(); ctx.stroke();
    ctx.rotate(-enemy.angle * 1.7); polygon(6, enemy.radius * .7); ctx.stroke();
    ctx.rotate(enemy.angle * 3.1); polygon(4, enemy.radius * .36, Math.PI / 4); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 7 + Math.sin(time * .009) * 2, 0, Math.PI * 2); ctx.fill();
  }
  if (enemy.type !== "boss" && enemy.hp < enemy.maxHp) {
    ctx.rotate(-enemy.angle);
    ctx.fillStyle = "rgba(255,255,255,.13)"; ctx.fillRect(-enemy.radius, enemy.radius + 9, enemy.radius * 2, 3);
    ctx.fillStyle = "#ff477e"; ctx.fillRect(-enemy.radius, enemy.radius + 9, enemy.radius * 2 * enemy.hp / enemy.maxHp, 3);
  }
  ctx.restore();
}

function drawBullet(bullet: Bullet) {
  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.shadowColor = bullet.color; ctx.shadowBlur = 14; ctx.fillStyle = bullet.color;
  ctx.beginPath(); ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .36; ctx.strokeStyle = bullet.color; ctx.lineWidth = bullet.radius;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-bullet.vx * .025, -bullet.vy * .025); ctx.stroke();
  ctx.restore();
}

function drawPickup(pickup: Pickup) {
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.rotate(pickup.phase);
  const color = pickup.type === "repair" ? "#62ff9d" : "#ffd166";
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.lineWidth = 3;
  polygon(pickup.type === "repair" ? 4 : 6, 11, Math.PI / 4); ctx.stroke();
  ctx.rotate(-pickup.phase * 2); polygon(3, 5); ctx.stroke();
  ctx.restore();
}

function drawGhosts() {
  for (const ghost of ghosts) {
    const alpha = clamp(ghost.life / ghost.maxLife, 0, 1) * .35;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.angle + Math.PI / 2);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#7fffea";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(17, 17); ctx.lineTo(0, 11); ctx.lineTo(-17, 17); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
}

function drawSpawnRings() {
  for (const ring of spawnRings) {
    const alpha = clamp(ring.life / ring.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * .8;
    ctx.strokeStyle = ring.color;
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = alpha * .4;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius * .55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawShockwaves() {
  for (const wave of shockwaves) {
    const alpha = clamp(wave.life / wave.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * .75;
    ctx.strokeStyle = wave.color;
    ctx.shadowColor = wave.color;
    ctx.shadowBlur = 22;
    ctx.lineWidth = wave.width;
    ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawFloatingTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 12px 'Space Grotesk', sans-serif";
  for (const text of floatingTexts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.shadowColor = text.color;
    ctx.shadowBlur = 8;
    ctx.font = `600 ${text.size}px 'Space Grotesk', sans-serif`;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function drawMuzzleFlash() {
  if (muzzleFlash <= 0) return;
  const alpha = clamp(muzzleFlash / 90, 0, 1);
  const tipX = player.x + Math.cos(player.aimAngle) * 30;
  const tipY = player.y + Math.sin(player.aimAngle) * 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f4fffd";
  ctx.shadowColor = "#7fffea";
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(tipX, tipY, 5 + alpha * 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawGhosts() {
  for (const ghost of ghosts) {
    const alpha = clamp(ghost.life / ghost.maxLife, 0, 1) * .35;
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.angle + Math.PI / 2);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#7fffea";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(17, 17); ctx.lineTo(0, 11); ctx.lineTo(-17, 17); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
}

function drawSpawnRings() {
  for (const ring of spawnRings) {
    const alpha = clamp(ring.life / ring.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * .8;
    ctx.strokeStyle = ring.color;
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = alpha * .4;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius * .55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawShockwaves() {
  for (const wave of shockwaves) {
    const alpha = clamp(wave.life / wave.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * .75;
    ctx.strokeStyle = wave.color;
    ctx.shadowColor = wave.color;
    ctx.shadowBlur = 22;
    ctx.lineWidth = wave.width;
    ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawFloatingTexts() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 12px 'Space Grotesk', sans-serif";
  for (const text of floatingTexts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = text.color;
    ctx.shadowColor = text.color;
    ctx.shadowBlur = 8;
    ctx.font = `600 ${text.size}px 'Space Grotesk', sans-serif`;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();
}

function drawMuzzleFlash() {
  if (muzzleFlash <= 0) return;
  const alpha = clamp(muzzleFlash / 90, 0, 1);
  const tipX = player.x + Math.cos(player.aimAngle) * 30;
  const tipY = player.y + Math.sin(player.aimAngle) * 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f4fffd";
  ctx.shadowColor = "#7fffea";
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(tipX, tipY, 5 + alpha * 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function draw(time: number) {
  const dx = shake > .5 ? (Math.random() - .5) * shake : 0;
  const dy = shake > .5 ? (Math.random() - .5) * shake : 0;
  ctx.save();
  ctx.translate(dx, dy);
  drawBackground(time);
  drawSpawnRings();
  drawShockwaves();
  pickups.forEach(drawPickup);
  drawGhosts();
  bullets.forEach(drawBullet);
  enemies.forEach((enemy) => drawEnemy(enemy, time));
  drawParticles();
  drawPlayer(time);
  drawMuzzleFlash();
  drawFloatingTexts();
  ctx.restore();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 71, 126, ${flash / 650})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (state === "playing" && player.hp / player.maxHp < .3) {
    const pulse = .16 + (Math.sin(time * .006) + 1) * .1;
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .72);
    vignette.addColorStop(0, "rgba(255,71,126,0)");
    vignette.addColorStop(1, `rgba(255,71,126,${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }
}

function loop(time: number) {
  const delta = Math.min(40, time - lastTime);
  lastTime = time;
  if (state === "playing") update(delta);
  else {
    elapsed += delta;
    updateParticles(delta);
    updateFloatingTexts(delta);
    updateShockwaves(delta);
    updateSpawnRings(delta);
    updateGhosts(delta);
    shake *= .88;
  }
  draw(time);
  requestAnimationFrame(loop);
}

document.querySelector("#start-button")!.addEventListener("click", startGame);
document.querySelector("#restart-button")!.addEventListener("click", startGame);
document.querySelector("#pause-button")!.addEventListener("click", togglePause);
document.querySelector("#mobile-dash")!.addEventListener("click", dash);
document.querySelector("#sound-toggle")!.addEventListener("click", (event) => {
  audioEnabled = !audioEnabled;
  const button = event.currentTarget as HTMLButtonElement;
  button.setAttribute("aria-pressed", String(audioEnabled));
  button.setAttribute("aria-label", audioEnabled ? "Désactiver le son" : "Activer le son");
  button.innerHTML = `SON <span>${audioEnabled ? "●" : "○"}</span>`;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === " ") dash();
  if (key === "p" || key === "escape") togglePause();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) / rect.width * W;
  pointer.y = (event.clientY - rect.top) / rect.height * H;
  pointer.activeUntil = performance.now() + 2800;
});

document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const direction = button.dataset.move!;
  const start = (event: Event) => { event.preventDefault(); touchMoves.add(direction); };
  const stop = (event: Event) => { event.preventDefault(); touchMoves.delete(direction); };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", stop);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") togglePause();
});

ui.best.textContent = String(Number(localStorage.getItem("neon-rift-best") ?? 0)).padStart(6, "0");
updateHud();
requestAnimationFrame(loop);
