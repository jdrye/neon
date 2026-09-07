import "./styles.css";
import {
  Game,
  SHIPS,
  SECTORS,
  UPGRADES,
  type ShipId,
  type Phase,
} from "./game";
import { Renderer } from "./render";
import { Synth } from "./audio";

interface Records {
  best: number;
  runs: number;
  wins: number;
  kills: number;
  sound: boolean;
  reduced: boolean;
}
const defaults: Records = {
  best: 0,
  runs: 0,
  wins: 0,
  kills: 0,
  sound: true,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
function readRecords(): Records {
  try {
    const data = JSON.parse(localStorage.getItem("neon-rift-v3") || "{}");
    const result = { ...defaults };
    for (const key of ["best", "runs", "wins", "kills"] as const)
      if (
        typeof data[key] === "number" &&
        Number.isFinite(data[key]) &&
        data[key] >= 0
      )
        result[key] = data[key];
    for (const key of ["sound", "reduced"] as const)
      if (typeof data[key] === "boolean") result[key] = data[key];
    const old = Number(localStorage.getItem("neon-rift-best"));
    if (Number.isFinite(old)) result.best = Math.max(result.best, old);
    return result;
  } catch {
    return { ...defaults };
  }
}
const records = readRecords();
function saveRecords() {
  try {
    localStorage.setItem("neon-rift-v3", JSON.stringify(records));
    localStorage.setItem("neon-rift-best", String(records.best));
  } catch {
    /* Private mode remains playable. */
  }
}
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<main class="cockpit">
  <header class="topbar">
    <a class="brand" href="#" id="brand" aria-label="Neon Rift, accueil"><span class="brand-mark" aria-hidden="true">N<span>∕</span></span><span>NEON RIFT<small>LE DERNIER PHARE</small></span></a>
    <div class="top-right"><span class="record">RECORD <b id="best-score">0</b></span><button id="sound-toggle" class="icon-button" aria-label="Désactiver le son" aria-pressed="true">SON <span>ON</span></button><button id="help-button" class="icon-button" aria-label="Commandes et réglages">?</button><button id="pause-button" class="icon-button" aria-label="Mettre en pause" disabled>Ⅱ</button></div>
  </header>
  <section class="arena" aria-label="Jeu Neon Rift">
    <div class="hud" id="hud" hidden>
      <div class="sector-info"><span class="label">SECTEUR <b id="wave-value">01 / 05</b></span><strong id="sector-name">La lisière</strong><div class="sector-track">${SECTORS.map((_, i) => `<i data-sector="${i}"></i>`).join("")}</div></div>
      <div class="health-info"><div class="label">COQUE <b id="health-value">100 / 100</b></div><div class="meter" id="health-meter" role="progressbar" aria-label="Coque" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="health-fill"></i></div></div>
      <div class="score-info"><span class="label">SCORE <b id="combo-value">×1,0</b></span><strong id="score-value">000000</strong></div>
    </div>
    <div class="stage" id="stage">
      <canvas id="game-canvas" aria-label="Arène de combat. Déplacez-vous pour éviter les ennemis, le canon tire automatiquement."></canvas>
      <div class="stage-shade" aria-hidden="true"></div>
      <div class="boss-hud" id="boss-hud" hidden><div><span>LE GARDIEN</span><span id="boss-phase">PHASE 01</span></div><div class="meter"><i id="boss-fill"></i></div></div>
      <div class="mission" id="mission" hidden><span id="objective">Neutraliser les menaces</span><b id="objective-count">0 / 16</b></div>
      <section class="hangar overlay" id="intro-overlay" data-testid="intro-overlay">
        <div class="intro-copy"><p class="eyebrow"><span></span> TRANSMISSION 001 · SIGNAL ACTIF</p><h1>LE DERNIER<br><em>PHARE.</em></h1><p class="intro-description">La cité s’éteint. Vous êtes son dernier signal.<br>Traversez cinq secteurs. Refermez la faille.</p><div class="mission-tags"><span>5 secteurs</span><span>≈ 3 minutes</span><span>Une seule vie</span></div></div>
        <div class="ship-readout" aria-hidden="true"><span>APPAREIL SÉLECTIONNÉ</span><strong id="ship-readout">01 / SPECTRE</strong><span>CANON AUTONOME · PILOTAGE LIBRE</span></div>
        <div class="launch-deck"><div class="deck-heading"><span class="eyebrow">01 — CHOISISSEZ VOTRE APPAREIL</span><span class="hangar-stats" id="hangar-stats"></span></div><div class="ship-grid" role="group" aria-label="Choisir un appareil">${SHIPS.map((s, i) => `<button class="ship-card ${i === 0 ? "selected" : ""}" data-ship="${s.id}" aria-pressed="${i === 0}" style="--ship-color:${s.color}"><span class="ship-card-top"><b>0${i + 1}</b><span>${s.role}</span><i aria-hidden="true">${i === 0 ? "◈" : i === 1 ? "⬡" : "⋔"}</i></span><strong>${s.name}</strong><span class="ship-description">${s.description}</span><span class="ship-stat">${s.hp} COQUE <span>·</span> ${s.speed === 255 ? "VITESSE ++" : s.speed === 205 ? "VITESSE +" : "VITESSE +++"}</span></button>`).join("")}</div><div class="launch-row"><p>Le canon vise et tire automatiquement.<br><span>Votre priorité : bouger, esquiver, survivre.</span></p><button class="primary-button" id="start-button" data-testid="start-button">LANCER LA MISSION <span aria-hidden="true">↗</span></button></div></div>
      </section>
      <section class="overlay centered" id="upgrade-overlay" data-testid="upgrade-overlay" hidden><div class="upgrade-wrap"><p class="eyebrow" id="upgrade-kicker">SECTEUR SÉCURISÉ</p><h2>Un cran au-dessus.</h2><p class="overlay-description">Coque réparée de 15 PV. Choisissez une amélioration pour la suite.</p><div class="upgrade-grid" id="upgrade-grid"></div><p class="keyboard-hint">Appuyez sur <kbd>1</kbd>, <kbd>2</kbd> ou <kbd>3</kbd> pour choisir.</p></div></section>
      <section class="overlay centered" id="result-overlay" data-testid="result-overlay" hidden><div class="result-wrap"><p class="eyebrow" id="result-kicker"></p><h2 id="result-title"></h2><p class="overlay-description" id="result-description"></p><div class="result-stats"><div><span>SCORE FINAL</span><strong id="result-score"></strong></div><div><span>SECTEUR</span><strong id="result-wave"></strong></div><div><span>ÉLIMINATIONS</span><strong id="result-kills"></strong></div><div><span>DURÉE</span><strong id="result-time"></strong></div></div><p class="result-badge" id="result-badge"></p><div class="result-actions"><button class="primary-button" id="restart-button">REJOUER <span aria-hidden="true">↻</span></button><button class="secondary-button" id="hangar-button">Changer d’appareil</button></div></div></section>
      <div class="wave-banner" id="wave-banner" hidden><span id="wave-banner-value"></span><strong id="wave-banner-name"></strong></div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="touch-controls" id="touch-controls" hidden><div class="joystick" id="joystick" aria-label="Joystick de déplacement"><span class="joystick-cross"></span><i id="joystick-knob"></i></div><div class="touch-actions"><button id="mobile-pulse" aria-label="Déclencher l’impulsion">◎<small>IMPULSION</small></button><button id="mobile-dash" aria-label="Effectuer un dash">»<small>DASH</small></button></div></div>
    </div>
    <div class="combat-footer" id="combat-footer" hidden><div class="loadout" id="loadout"><span class="label">SPECTRE</span><span id="installed-upgrades">Canon standard</span></div><div class="abilities"><button id="dash-action" class="ability"><kbd>ESPACE</kbd><span>DASH <b id="dash-status">PRÊT</b><i><span id="dash-fill"></span></i></span></button><button id="pulse-action" class="ability pulse"><kbd>E</kbd><span>IMPULSION <b id="pulse-status">40 %</b><i><span id="pulse-fill"></span></i></span></button></div></div>
  </section>
  <footer class="bottom-line"><span id="footer-tip">ZQSD / WASD / FLÈCHES · DÉPLACEMENT <span class="desktop-only">&nbsp; ESPACE · DASH &nbsp; E · IMPULSION</span></span><span>NEON RIFT <b>03.00</b></span></footer>
</main>
<dialog id="pause-dialog" aria-labelledby="pause-title"><div id="pause-overlay"><p class="eyebrow">SIGNAL EN ATTENTE</p><h2 id="pause-title">On reprend<br>son souffle.</h2><p>La mission est suspendue.</p><button class="primary-button" id="resume-button">REPRENDRE <span aria-hidden="true">→</span></button><button class="secondary-button" id="pause-restart">Recommencer la mission</button><button class="text-button" id="pause-hangar">Retour au hangar</button></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-heading"><p class="eyebrow">MANUEL DE VOL</p><button class="icon-button" id="close-help" aria-label="Fermer les commandes">×</button></div><h2 id="help-title">Gardez le signal.</h2><p>Éliminez les menaces de chaque secteur puis le Gardien. Les tirs sont automatiques. Maintenez le clic sur l’arène pour viser manuellement.</p><div class="control-list"><div><kbd>ZQSD / WASD / ↑↓←→</kbd><span>Déplacer l’appareil</span></div><div><kbd>ESPACE</kbd><span>Dash invulnérable</span></div><div><kbd>E</kbd><span>Impulsion à 100 % d’énergie</span></div><div><kbd>P / ÉCHAP</kbd><span>Pause / reprise</span></div></div><p><strong>Les relais circulaires</strong> se capturent en restant à l’intérieur 2,6 secondes : +20 PV et +40 énergie. Les noyaux ennemis rechargent aussi l’impulsion. Celle-ci détruit les tirs proches et frappe les ennemis à portée.</p><p class="touch-help">Sur écran tactile : joystick à gauche, dash et impulsion à droite.</p><label class="setting"><span>Réduire les effets visuels</span><input id="reduced-toggle" type="checkbox"></label></dialog>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const game = new Game();
const renderer = new Renderer($<HTMLCanvasElement>("game-canvas"));
const synth = new Synth();
synth.enabled = records.sound;
renderer.reduced = records.reduced;
let selected: ShipId = "spectre",
  lastPhase: Phase = "hangar",
  previous = 0,
  uiTimer = 0,
  pointerAim: { x: number; y: number } | null = null,
  toastTimer = 0,
  helpWasPlaying = false;
const keys = new Set<string>();
const touch = { x: 0, y: 0, pointer: -1 };
const pauseDialog = $<HTMLDialogElement>("pause-dialog"),
  helpDialog = $<HTMLDialogElement>("help-dialog");
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
const timeFmt = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
function clearInput() {
  keys.clear();
  pointerAim = null;
  touch.x = touch.y = 0;
  touch.pointer = -1;
  $("joystick-knob").style.transform = "translate(-50%, -50%)";
}
function showToast(text: string) {
  $("toast").textContent = text;
  toastTimer = 3;
}
function updateRecordsUI() {
  $("best-score").textContent = fmt(records.best);
  $("hangar-stats").textContent = records.runs
    ? `${records.runs} SORTIES · ${records.wins} VICTOIRES`
    : "PRÊT POUR UNE PREMIÈRE SORTIE";
}
function soundUI() {
  $("sound-toggle").setAttribute("aria-pressed", String(records.sound));
  $("sound-toggle").setAttribute(
    "aria-label",
    records.sound ? "Désactiver le son" : "Activer le son",
  );
  $("sound-toggle").innerHTML =
    `SON <span>${records.sound ? "ON" : "OFF"}</span>`;
}
function start() {
  clearInput();
  pauseDialog.close();
  helpDialog.close();
  game.reset(selected);
  void synth.unlock();
  lastPhase = "hangar";
  syncPhase();
}
function hangar() {
  clearInput();
  pauseDialog.close();
  game.reset(selected, false);
  syncPhase();
}
function togglePause() {
  if (helpDialog.open) return;
  clearInput();
  game.pause();
  syncPhase();
}
function syncPhase() {
  const phase = game.phase;
  document.body.dataset.state = phase;
  $("intro-overlay").hidden = phase !== "hangar";
  $("upgrade-overlay").hidden = phase !== "upgrade";
  $("result-overlay").hidden = phase !== "victory" && phase !== "defeat";
  $("hud").hidden = phase === "hangar";
  $("combat-footer").hidden = phase === "hangar";
  $("mission").hidden = phase !== "playing";
  $("touch-controls").hidden = phase !== "playing";
  $<HTMLButtonElement>("pause-button").disabled =
    phase !== "playing" && phase !== "paused";
  $("pause-button").textContent = phase === "paused" ? "▶" : "Ⅱ";
  $("pause-button").setAttribute(
    "aria-label",
    phase === "paused" ? "Reprendre" : "Mettre en pause",
  );
  if (phase === lastPhase) return;
  clearInput();
  if (phase === "paused" && !helpDialog.open) {
    if (!pauseDialog.open) pauseDialog.showModal();
  } else if (pauseDialog.open) pauseDialog.close();
  if (phase === "playing") {
    $("game-canvas").focus({ preventScroll: true });
  }
  if (phase === "hangar") {
    $("start-button").focus({ preventScroll: true });
  }
  if (phase === "upgrade") {
    $("upgrade-kicker").textContent =
      `SECTEUR ${String(game.sector + 1).padStart(2, "0")} SÉCURISÉ · ${SECTORS[game.sector + 1].name.toUpperCase()} EN APPROCHE`;
    $("upgrade-grid").innerHTML = game.choices
      .map(
        (u, i) =>
          `<button class="upgrade-card" data-upgrade="${u.id}"><span class="upgrade-top">${u.category}<kbd>${i + 1}</kbd></span><i>${u.icon}</i><strong>${u.name}</strong><span>${u.description}</span><b>${u.stat}</b></button>`,
      )
      .join("");
    $("upgrade-grid")
      .querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
  }
  if (phase === "victory" || phase === "defeat") {
    const won = phase === "victory",
      newBest = game.score > records.best;
    records.runs++;
    records.kills += game.kills;
    if (won) records.wins++;
    records.best = Math.max(records.best, game.score);
    saveRecords();
    updateRecordsUI();
    $("result-kicker").textContent = won
      ? "TRANSMISSION RÉTABLIE"
      : "SIGNAL PERDU";
    $("result-title").textContent = won
      ? "La cité vous doit l’aube."
      : "Ce n’est pas la fin.";
    $("result-description").textContent = won
      ? "Le Gardien est tombé. Le dernier phare brille encore."
      : "Chaque sortie vous rapproche du cœur de la faille.";
    $("result-score").textContent = fmt(game.score);
    $("result-wave").textContent = `${game.sector + 1} / 5`;
    $("result-kills").textContent = String(game.kills);
    $("result-time").textContent = timeFmt(game.elapsed);
    $("result-badge").textContent = newBest
      ? "↗ NOUVEAU RECORD PERSONNEL"
      : `${fmt(records.kills)} ÉLIMINATIONS AU TOTAL · ${records.wins} VICTOIRES`;
    $("restart-button").focus({ preventScroll: true });
  }
  lastPhase = phase;
  updateHUD();
}
function updateHUD() {
  const p = game.player,
    sector = SECTORS[game.sector];
  $("wave-value").textContent = `0${game.sector + 1} / 05`;
  $("sector-name").textContent = sector.name;
  $("health-value").textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $("health-fill").style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("health-meter").setAttribute("aria-valuenow", String(Math.round(p.hp)));
  $("health-meter").setAttribute("aria-valuemax", String(p.maxHp));
  $("health-meter").classList.toggle("low", p.hp / p.maxHp < 0.3);
  $("score-value").textContent = String(game.score).padStart(6, "0");
  $("combo-value").textContent = `×${game.combo.toFixed(1).replace(".", ",")}`;
  $("objective-count").textContent =
    game.sector === 4 ? "" : `${game.sectorKills} / ${sector.quota}`;
  $("objective").textContent =
    game.sector === 4 ? "Vaincre le Gardien" : "Neutraliser les menaces";
  $("dash-status").textContent = p.dash > 0 ? `${p.dash.toFixed(1)} S` : "PRÊT";
  $("dash-fill").style.width = `${(1 - p.dash / p.dashCooldown) * 100}%`;
  $("pulse-status").textContent =
    p.energy >= 100 ? "PRÊTE" : `${Math.floor(p.energy)} %`;
  $("pulse-fill").style.width = `${p.energy}%`;
  $("pulse-action").classList.toggle("ready", p.energy >= 100);
  $("mobile-pulse").classList.toggle("ready", p.energy >= 100);
  $("mobile-dash").classList.toggle("ready", p.dash <= 0);
  $<HTMLButtonElement>("dash-action").disabled =
    p.dash > 0 || game.phase !== "playing";
  $<HTMLButtonElement>("pulse-action").disabled =
    p.energy < 100 || game.phase !== "playing";
  document.querySelectorAll<HTMLElement>("[data-sector]").forEach((el) => {
    el.classList.toggle("done", Number(el.dataset.sector) < game.sector);
    el.classList.toggle("current", Number(el.dataset.sector) === game.sector);
  });
  const boss = game.enemies.find((e) => e.kind === "boss" && e.hp > 0);
  $("boss-hud").hidden = !boss || game.phase !== "playing";
  if (boss) {
    $("boss-fill").style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    $("boss-phase").textContent =
      boss.hp < boss.maxHp / 2 ? "PHASE 02 · SURCHARGE" : "PHASE 01";
  }
  $("wave-banner").hidden = game.banner <= 0 || game.phase !== "playing";
  $("wave-banner-value").textContent = `SECTEUR 0${game.sector + 1}`;
  $("wave-banner-name").textContent = sector.name;
  $("loadout").querySelector(".label")!.textContent =
    game.ship.name.toUpperCase();
  $("installed-upgrades").textContent = game.installed.length
    ? game.installed
        .map((id) => UPGRADES.find((u) => u.id === id)!.name)
        .join(" · ")
    : "Canon standard";
}
$("start-button").onclick = start;
$("restart-button").onclick = start;
$("pause-restart").onclick = start;
$("hangar-button").onclick = hangar;
$("pause-hangar").onclick = hangar;
$("pause-button").onclick = togglePause;
$("resume-button").onclick = togglePause;
$("brand").onclick = (e) => {
  e.preventDefault();
  if (game.phase === "playing" || game.phase === "paused") togglePause();
  else hangar();
};
$("sound-toggle").onclick = () => {
  records.sound = !records.sound;
  synth.setEnabled(records.sound);
  soundUI();
  saveRecords();
};
$("help-button").onclick = () => {
  helpWasPlaying = game.phase === "playing";
  if (helpWasPlaying) {
    game.pause();
    clearInput();
  }
  helpDialog.showModal();
  syncPhase();
};
function closeHelp() {
  helpDialog.close();
  if (helpWasPlaying && game.phase === "paused") {
    game.pause();
    syncPhase();
  }
  helpWasPlaying = false;
}
$("close-help").onclick = closeHelp;
helpDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeHelp();
});
pauseDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  togglePause();
});
$<HTMLInputElement>("reduced-toggle").checked = records.reduced;
$("reduced-toggle").onchange = () => {
  records.reduced = $<HTMLInputElement>("reduced-toggle").checked;
  renderer.reduced = records.reduced;
  document.body.classList.toggle("reduced-motion", records.reduced);
  saveRecords();
};
document.querySelectorAll<HTMLButtonElement>("[data-ship]").forEach(
  (button) =>
    (button.onclick = () => {
      selected = button.dataset.ship as ShipId;
      game.reset(selected, false);
      document.querySelectorAll("[data-ship]").forEach((b) => {
        b.classList.toggle("selected", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      const index = SHIPS.findIndex((s) => s.id === selected);
      $("ship-readout").textContent =
        `0${index + 1} / ${SHIPS[index].name.toUpperCase()}`;
    }),
);
$("upgrade-grid").onclick = (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-upgrade]",
  );
  if (target) {
    game.choose(target.dataset.upgrade!);
    syncPhase();
  }
};
function dash() {
  void synth.unlock();
  game.dash();
  updateHUD();
}
function pulse() {
  void synth.unlock();
  if (!game.pulse() && game.phase === "playing")
    showToast("Récupérez des noyaux pour charger l’impulsion.");
  syncPhase();
  updateHUD();
}
$("dash-action").onclick = dash;
$("pulse-action").onclick = pulse;
$("mobile-dash").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  dash();
});
$("mobile-pulse").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  pulse();
});
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (helpDialog.open || pauseDialog.open) {
    if (pauseDialog.open && key === "p" && !e.repeat) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  if (
    (key === "p" || key === "escape") &&
    !e.repeat &&
    (game.phase === "playing" || game.phase === "paused")
  ) {
    e.preventDefault();
    togglePause();
    return;
  }
  if (
    game.phase === "upgrade" &&
    ["1", "2", "3", "&", "é", '"'].includes(key)
  ) {
    const index = ["1", "&"].includes(key)
      ? 0
      : ["2", "é"].includes(key)
        ? 1
        : 2;
    game.choose(game.choices[index].id);
    syncPhase();
    return;
  }
  if (game.phase !== "playing") return;
  if (
    [
      " ",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "w",
      "a",
      "s",
      "d",
      "z",
      "q",
      "e",
    ].includes(key)
  ) {
    if ((e.target as HTMLElement).tagName === "BUTTON" && key === " ") return;
    e.preventDefault();
    keys.add(key);
    if (!e.repeat && key === " ") dash();
    if (!e.repeat && key === "e") pulse();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  clearInput();
  if (game.phase === "playing") {
    game.pause();
    syncPhase();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
    if (game.phase === "playing") {
      game.pause();
      syncPhase();
    }
  }
});
const canvas = $<HTMLCanvasElement>("game-canvas");
canvas.tabIndex = -1;
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && game.phase === "playing") {
    pointerAim = renderer.worldPoint(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerAim) pointerAim = renderer.worldPoint(e.clientX, e.clientY);
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
  canvas.addEventListener(type, () => (pointerAim = null)),
);
const joystick = $("joystick");
function joystickMove(e: PointerEvent) {
  if (e.pointerId !== touch.pointer) return;
  const r = joystick.getBoundingClientRect(),
    dx = e.clientX - r.left - r.width / 2,
    dy = e.clientY - r.top - r.height / 2,
    len = Math.hypot(dx, dy),
    max = r.width * 0.32;
  touch.x = dx / Math.max(max, len);
  touch.y = dy / Math.max(max, len);
  $("joystick-knob").style.transform =
    `translate(calc(-50% + ${touch.x * max}px), calc(-50% + ${touch.y * max}px))`;
}
joystick.addEventListener("pointerdown", (e) => {
  if (touch.pointer !== -1) return;
  touch.pointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  joystickMove(e);
  e.preventDefault();
});
joystick.addEventListener("pointermove", joystickMove);
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
  joystick.addEventListener(type, (e) => {
    if ((e as PointerEvent).pointerId === touch.pointer) {
      touch.x = touch.y = 0;
      touch.pointer = -1;
      $("joystick-knob").style.transform = "translate(-50%, -50%)";
    }
  }),
);
new ResizeObserver(() => renderer.resize()).observe($("stage"));
renderer.resize();
updateRecordsUI();
soundUI();
updateHUD();
document.body.dataset.state = "hangar";
document.body.classList.toggle("reduced-motion", records.reduced);
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000 || 0, 0.05);
  previous = now;
  const input = {
    x:
      touch.x +
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("q") || keys.has("arrowleft")),
    y:
      touch.y +
      Number(keys.has("s") || keys.has("arrowdown")) -
      Number(keys.has("w") || keys.has("z") || keys.has("arrowup")),
    aim: pointerAim,
  };
  game.update(dt, input);
  for (const event of game.events) {
    synth.play(event);
    if (event === "relay") showToast("Relais activé · +20 coque · +40 énergie");
  }
  game.events = [];
  syncPhase();
  renderer.draw(game, now / 1000);
  uiTimer += dt;
  if (uiTimer > 0.09) {
    updateHUD();
    uiTimer = 0;
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").textContent = "";
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
