import Phaser from "phaser";

import {
  DASH_COOLDOWN,
  GAME_HEIGHT,
  GAME_WIDTH,
  PULSE_COOLDOWN,
  ROUND_DURATION
} from "./config";
import { InputController } from "./input";
import { GameScene } from "./render/GameScene";
import { PulsePrismSimulation } from "./simulation/PulsePrismSimulation";
import type { GamePhase, Snapshot } from "./types";

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatScore(score: number): string {
  return Math.round(score).toString().padStart(5, "0");
}

export class GameApp {
  private readonly simulation = new PulsePrismSimulation();
  private readonly input = new InputController();
  private readonly game: Phaser.Game;

  private readonly introOverlay: HTMLDivElement;
  private readonly summaryOverlay: HTMLDivElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly comboValue: HTMLSpanElement;
  private readonly multiplierValue: HTMLSpanElement;
  private readonly timeValue: HTMLSpanElement;
  private readonly waveValue: HTMLSpanElement;
  private readonly integrityValue: HTMLSpanElement;
  private readonly integrityFill: HTMLSpanElement;
  private readonly dashFill: HTMLSpanElement;
  private readonly pulseFill: HTMLSpanElement;
  private readonly summaryVerdict: HTMLParagraphElement;
  private readonly summaryRank: HTMLSpanElement;
  private readonly summaryScore: HTMLSpanElement;
  private readonly summaryWave: HTMLSpanElement;
  private readonly summaryChain: HTMLSpanElement;
  private readonly startButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private phase: GamePhase = "ready";

  constructor(root: HTMLDivElement) {
    root.innerHTML = this.renderMarkup();

    const stage = root.querySelector<HTMLDivElement>("#game-stage");
    this.introOverlay = root.querySelector<HTMLDivElement>("[data-testid='intro-overlay']")!;
    this.summaryOverlay = root.querySelector<HTMLDivElement>("[data-testid='summary-overlay']")!;
    this.scoreValue = root.querySelector<HTMLSpanElement>("[data-testid='score-value']")!;
    this.comboValue = root.querySelector<HTMLSpanElement>("[data-testid='combo-value']")!;
    this.multiplierValue = root.querySelector<HTMLSpanElement>("[data-testid='multiplier-value']")!;
    this.timeValue = root.querySelector<HTMLSpanElement>("[data-testid='time-value']")!;
    this.waveValue = root.querySelector<HTMLSpanElement>("[data-testid='wave-value']")!;
    this.integrityValue = root.querySelector<HTMLSpanElement>("[data-testid='integrity-value']")!;
    this.integrityFill = root.querySelector<HTMLSpanElement>("[data-testid='integrity-fill']")!;
    this.dashFill = root.querySelector<HTMLSpanElement>("[data-testid='dash-fill']")!;
    this.pulseFill = root.querySelector<HTMLSpanElement>("[data-testid='pulse-fill']")!;
    this.summaryVerdict = root.querySelector<HTMLParagraphElement>("[data-testid='summary-verdict']")!;
    this.summaryRank = root.querySelector<HTMLSpanElement>("[data-testid='summary-rank']")!;
    this.summaryScore = root.querySelector<HTMLSpanElement>("[data-testid='summary-score']")!;
    this.summaryWave = root.querySelector<HTMLSpanElement>("[data-testid='summary-wave']")!;
    this.summaryChain = root.querySelector<HTMLSpanElement>("[data-testid='summary-chain']")!;
    this.startButton = root.querySelector<HTMLButtonElement>("[data-testid='start-button']")!;
    this.restartButton = root.querySelector<HTMLButtonElement>("[data-testid='restart-button']")!;

    if (!stage) {
      throw new Error("Game stage element not found.");
    }

    this.startButton.addEventListener("click", () => this.startRound());
    this.restartButton.addEventListener("click", () => this.startRound());
    window.addEventListener("keydown", this.handleGlobalKeyDown);

    const scene = new GameScene({
      input: this.input,
      simulation: this.simulation,
      onSnapshot: (snapshot) => this.renderHud(snapshot)
    });

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: stage,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#040817",
      render: {
        antialias: true,
        roundPixels: false
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
      },
      fps: {
        target: 60,
        forceSetTimeOut: true
      },
      scene: [scene]
    });
  }

  private renderHud(snapshot: Snapshot): void {
    this.scoreValue.textContent = formatScore(snapshot.score);
    this.comboValue.textContent = snapshot.combo.toString().padStart(2, "0");
    this.multiplierValue.textContent = `x${snapshot.multiplier.toFixed(2)}`;
    this.timeValue.textContent = formatTime(snapshot.timeLeft);
    this.waveValue.textContent = snapshot.wave.toString();
    this.integrityValue.textContent = `${Math.round(snapshot.player.health)}%`;
    this.integrityFill.style.setProperty(
      "--fill",
      `${snapshot.player.health / snapshot.player.maxHealth}`
    );
    this.dashFill.style.setProperty(
      "--fill",
      `${1 - snapshot.player.dashCooldown / DASH_COOLDOWN}`
    );
    this.pulseFill.style.setProperty(
      "--fill",
      `${1 - snapshot.player.pulseCooldown / PULSE_COOLDOWN}`
    );

    if (snapshot.phase !== this.phase) {
      this.phase = snapshot.phase;
      this.syncOverlays(snapshot);
    }

    if (snapshot.phase === "won" || snapshot.phase === "lost") {
      this.summaryVerdict.textContent = snapshot.summary.verdict;
      this.summaryRank.textContent = snapshot.summary.rank;
      this.summaryScore.textContent = formatScore(snapshot.summary.score);
      this.summaryWave.textContent = snapshot.summary.wave.toString();
      this.summaryChain.textContent = snapshot.summary.bestChain.toString();
    }
  }

  private syncOverlays(snapshot: Snapshot): void {
    if (snapshot.phase === "running") {
      this.introOverlay.hidden = true;
      this.summaryOverlay.hidden = true;
      return;
    }

    if (snapshot.phase === "ready") {
      this.introOverlay.hidden = false;
      this.summaryOverlay.hidden = true;
      return;
    }

    this.introOverlay.hidden = true;
    this.summaryOverlay.hidden = false;
  }

  private startRound(): void {
    this.simulation.startRound();
    this.phase = "running";
    this.introOverlay.hidden = true;
    this.summaryOverlay.hidden = true;
    window.focus();
  }

  private handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "Enter") {
      return;
    }

    if (this.phase === "ready" || this.phase === "won" || this.phase === "lost") {
      this.startRound();
      event.preventDefault();
    }
  };

  private renderMarkup(): string {
    return `
      <main class="shell">
        <section class="frame">
          <div id="game-stage" class="stage" data-testid="stage"></div>

          <div class="hud-cluster hud-cluster--status">
            <div class="panel panel--brand">
              <span class="eyebrow">NEON SURVIVAL</span>
              <h1>Pulse Prism</h1>
              <p>Hold the lattice for ${formatTime(ROUND_DURATION)}. Dash through threats, pulse the swarm, harvest the shards.</p>
            </div>
            <div class="panel panel--metrics">
              <span class="label">Score</span>
              <span class="value value--score" data-testid="score-value">00000</span>
              <div class="metric-row">
                <span>Combo</span>
                <span data-testid="combo-value">00</span>
              </div>
              <div class="metric-row">
                <span>Multiplier</span>
                <span data-testid="multiplier-value">x1.00</span>
              </div>
            </div>
          </div>

          <div class="hud-chip hud-chip--center">
            <span>Wave <strong data-testid="wave-value">1</strong></span>
            <span>Time <strong data-testid="time-value">${formatTime(ROUND_DURATION)}</strong></span>
          </div>

          <div class="hud-cluster hud-cluster--systems">
            <div class="panel panel--systems">
              <div class="metric-row metric-row--tight">
                <span>Integrity</span>
                <span data-testid="integrity-value">100%</span>
              </div>
              <div class="meter">
                <span class="meter__fill meter__fill--health" data-testid="integrity-fill" style="--fill:1"></span>
              </div>
              <div class="cooldown">
                <div class="metric-row metric-row--tight">
                  <span>Dash</span>
                  <span>Space</span>
                </div>
                <div class="meter meter--thin">
                  <span class="meter__fill meter__fill--dash" data-testid="dash-fill" style="--fill:1"></span>
                </div>
              </div>
              <div class="cooldown">
                <div class="metric-row metric-row--tight">
                  <span>Pulse</span>
                  <span>Shift</span>
                </div>
                <div class="meter meter--thin">
                  <span class="meter__fill meter__fill--pulse" data-testid="pulse-fill" style="--fill:1"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="hud-chip hud-chip--footer">
            <span>Move with WASD or arrows</span>
            <span>Dash through drones</span>
            <span>Pulse crushers before they pin you</span>
          </div>

          <div class="overlay" data-testid="intro-overlay">
            <div class="overlay__card">
              <span class="eyebrow">ARCADE RUN</span>
              <h2>Pulse Prism</h2>
              <p>Keep the prism stable for ninety seconds. Crushers need repeated hits, and every shard you collect extends your scoring chain.</p>
              <div class="overlay__stats">
                <span>Dash can pierce enemies and buy breathing room.</span>
                <span>Pulse clears the inner ring and pushes the rest.</span>
              </div>
              <button type="button" class="button" data-testid="start-button">Begin Run</button>
            </div>
          </div>

          <div class="overlay" data-testid="summary-overlay" hidden>
            <div class="overlay__card overlay__card--summary">
              <span class="eyebrow">RUN REPORT</span>
              <span class="rank" data-testid="summary-rank">A</span>
              <p data-testid="summary-verdict">The prism held through the blackout.</p>
              <div class="summary-grid">
                <div>
                  <span class="label">Score</span>
                  <strong data-testid="summary-score">00000</strong>
                </div>
                <div>
                  <span class="label">Wave</span>
                  <strong data-testid="summary-wave">1</strong>
                </div>
                <div>
                  <span class="label">Best Chain</span>
                  <strong data-testid="summary-chain">0</strong>
                </div>
              </div>
              <button type="button" class="button" data-testid="restart-button">Restart Run</button>
            </div>
          </div>
        </section>
      </main>
    `;
  }
}

