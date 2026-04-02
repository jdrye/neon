import Phaser from "phaser";

import {
  DASH_COOLDOWN,
  GAME_HEIGHT,
  GAME_WIDTH,
  PULSE_COOLDOWN,
  SECTOR_COUNT
} from "./config";
import { InputController } from "./input";
import { GameScene } from "./render/GameScene";
import { PulsePrismSimulation } from "./simulation/PulsePrismSimulation";
import type { GamePhase, Snapshot, UpgradeId, UpgradeOption } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatScore(score: number): string {
  return Math.round(score).toString().padStart(6, "0");
}

function formatCooldown(remaining: number): string {
  return remaining <= 0 ? "Ready" : `${remaining.toFixed(1)}s`;
}

export class GameApp {
  private readonly simulation = new PulsePrismSimulation();
  private readonly input: InputController;
  private readonly game: Phaser.Game;

  private readonly introOverlay: HTMLDivElement;
  private readonly draftOverlay: HTMLDivElement;
  private readonly draftCards: HTMLDivElement;
  private readonly summaryOverlay: HTMLDivElement;
  private readonly objectiveTitle: HTMLSpanElement;
  private readonly objectiveDetail: HTMLParagraphElement;
  private readonly scoreValue: HTMLSpanElement;
  private readonly comboValue: HTMLSpanElement;
  private readonly multiplierValue: HTMLSpanElement;
  private readonly killValue: HTMLSpanElement;
  private readonly elapsedValue: HTMLSpanElement;
  private readonly sectorValue: HTMLSpanElement;
  private readonly anchorValue: HTMLSpanElement;
  private readonly threatFill: HTMLSpanElement;
  private readonly integrityValue: HTMLSpanElement;
  private readonly integrityFill: HTMLSpanElement;
  private readonly dashFill: HTMLSpanElement;
  private readonly pulseFill: HTMLSpanElement;
  private readonly weaponFill: HTMLSpanElement;
  private readonly dashTimer: HTMLSpanElement;
  private readonly pulseTimer: HTMLSpanElement;
  private readonly weaponTimer: HTMLSpanElement;
  private readonly bossChip: HTMLSpanElement;
  private readonly loadoutList: HTMLUListElement;
  private readonly loadoutCount: HTMLSpanElement;
  private readonly summaryVerdict: HTMLParagraphElement;
  private readonly summaryRank: HTMLSpanElement;
  private readonly summaryScore: HTMLSpanElement;
  private readonly summaryAnchors: HTMLSpanElement;
  private readonly summaryKills: HTMLSpanElement;
  private readonly summaryTime: HTMLSpanElement;
  private readonly summaryLoadout: HTMLUListElement;
  private readonly startButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private phase: GamePhase = "ready";

  constructor(root: HTMLDivElement) {
    root.innerHTML = this.renderMarkup();

    const stage = root.querySelector<HTMLDivElement>("#game-stage");

    if (!stage) {
      throw new Error("Game stage element not found.");
    }

    this.input = new InputController(stage);
    this.introOverlay = root.querySelector<HTMLDivElement>("[data-testid='intro-overlay']")!;
    this.draftOverlay = root.querySelector<HTMLDivElement>("[data-testid='draft-overlay']")!;
    this.draftCards = root.querySelector<HTMLDivElement>("[data-testid='draft-cards']")!;
    this.summaryOverlay = root.querySelector<HTMLDivElement>("[data-testid='summary-overlay']")!;
    this.objectiveTitle = root.querySelector<HTMLSpanElement>("[data-testid='objective-title']")!;
    this.objectiveDetail = root.querySelector<HTMLParagraphElement>("[data-testid='objective-detail']")!;
    this.scoreValue = root.querySelector<HTMLSpanElement>("[data-testid='score-value']")!;
    this.comboValue = root.querySelector<HTMLSpanElement>("[data-testid='combo-value']")!;
    this.multiplierValue = root.querySelector<HTMLSpanElement>("[data-testid='multiplier-value']")!;
    this.killValue = root.querySelector<HTMLSpanElement>("[data-testid='kill-value']")!;
    this.elapsedValue = root.querySelector<HTMLSpanElement>("[data-testid='elapsed-value']")!;
    this.sectorValue = root.querySelector<HTMLSpanElement>("[data-testid='sector-value']")!;
    this.anchorValue = root.querySelector<HTMLSpanElement>("[data-testid='anchor-value']")!;
    this.threatFill = root.querySelector<HTMLSpanElement>("[data-testid='threat-fill']")!;
    this.integrityValue = root.querySelector<HTMLSpanElement>("[data-testid='integrity-value']")!;
    this.integrityFill = root.querySelector<HTMLSpanElement>("[data-testid='integrity-fill']")!;
    this.dashFill = root.querySelector<HTMLSpanElement>("[data-testid='dash-fill']")!;
    this.pulseFill = root.querySelector<HTMLSpanElement>("[data-testid='pulse-fill']")!;
    this.weaponFill = root.querySelector<HTMLSpanElement>("[data-testid='weapon-fill']")!;
    this.dashTimer = root.querySelector<HTMLSpanElement>("[data-testid='dash-timer']")!;
    this.pulseTimer = root.querySelector<HTMLSpanElement>("[data-testid='pulse-timer']")!;
    this.weaponTimer = root.querySelector<HTMLSpanElement>("[data-testid='weapon-timer']")!;
    this.bossChip = root.querySelector<HTMLSpanElement>("[data-testid='boss-chip']")!;
    this.loadoutList = root.querySelector<HTMLUListElement>("[data-testid='loadout-list']")!;
    this.loadoutCount = root.querySelector<HTMLSpanElement>("[data-testid='loadout-count']")!;
    this.summaryVerdict = root.querySelector<HTMLParagraphElement>("[data-testid='summary-verdict']")!;
    this.summaryRank = root.querySelector<HTMLSpanElement>("[data-testid='summary-rank']")!;
    this.summaryScore = root.querySelector<HTMLSpanElement>("[data-testid='summary-score']")!;
    this.summaryAnchors = root.querySelector<HTMLSpanElement>("[data-testid='summary-anchors']")!;
    this.summaryKills = root.querySelector<HTMLSpanElement>("[data-testid='summary-kills']")!;
    this.summaryTime = root.querySelector<HTMLSpanElement>("[data-testid='summary-time']")!;
    this.summaryLoadout = root.querySelector<HTMLUListElement>("[data-testid='summary-loadout']")!;
    this.startButton = root.querySelector<HTMLButtonElement>("[data-testid='start-button']")!;
    this.restartButton = root.querySelector<HTMLButtonElement>("[data-testid='restart-button']")!;

    this.startButton.addEventListener("click", () => this.startRound());
    this.restartButton.addEventListener("click", () => this.startRound());
    root.addEventListener("click", this.handleRootClick);
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

    this.renderHud(this.simulation.peekSnapshot());
  }

  private startRound(): void {
    this.simulation.startRound();
    this.renderHud(this.simulation.peekSnapshot());
    window.focus();
  }

  private handleRootClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const upgradeButton = target?.closest<HTMLButtonElement>("[data-upgrade-id]");

    if (!upgradeButton) {
      return;
    }

    this.selectUpgrade(upgradeButton.dataset.upgradeId as UpgradeId);
  };

  private handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code === "Enter" &&
      (this.phase === "ready" || this.phase === "won" || this.phase === "lost")
    ) {
      this.startRound();
      event.preventDefault();
      return;
    }

    if (this.phase !== "draft") {
      return;
    }

    const options = this.simulation.peekSnapshot().draftOptions;

    if (event.code === "Digit1" && options[0]) {
      this.selectUpgrade(options[0].id);
      event.preventDefault();
    }

    if (event.code === "Digit2" && options[1]) {
      this.selectUpgrade(options[1].id);
      event.preventDefault();
    }

    if (event.code === "Digit3" && options[2]) {
      this.selectUpgrade(options[2].id);
      event.preventDefault();
    }
  };

  private selectUpgrade(upgradeId: UpgradeId): void {
    this.simulation.selectUpgrade(upgradeId);
    this.renderHud(this.simulation.peekSnapshot());
  }

  private renderHud(snapshot: Snapshot): void {
    this.objectiveTitle.textContent = snapshot.objectiveTitle;
    this.objectiveDetail.textContent = snapshot.objectiveDetail;
    this.scoreValue.textContent = formatScore(snapshot.score);
    this.comboValue.textContent = snapshot.combo.toString().padStart(2, "0");
    this.multiplierValue.textContent = `x${snapshot.multiplier.toFixed(2)}`;
    this.killValue.textContent = snapshot.killCount.toString();
    this.elapsedValue.textContent = formatTime(snapshot.elapsed);
    this.sectorValue.textContent = snapshot.boss
      ? snapshot.boss.label
      : `${snapshot.sector} / ${snapshot.totalSectors}`;
    this.anchorValue.textContent = `${snapshot.anchorsSecured} / ${snapshot.anchorsTotal}`;
    this.threatFill.style.setProperty("--fill", snapshot.threatLevel.toString());
    this.integrityValue.textContent = `${Math.round(snapshot.player.health)} / ${snapshot.player.maxHealth}`;
    this.integrityFill.style.setProperty(
      "--fill",
      (snapshot.player.health / snapshot.player.maxHealth).toString()
    );
    this.dashFill.style.setProperty(
      "--fill",
      clamp(
        1 - snapshot.player.dashCooldown / snapshot.player.dashCooldownMax,
        0,
        1
      ).toString()
    );
    this.pulseFill.style.setProperty(
      "--fill",
      clamp(
        1 - snapshot.player.pulseCooldown / snapshot.player.pulseCooldownMax,
        0,
        1
      ).toString()
    );
    this.weaponFill.style.setProperty(
      "--fill",
      clamp(
        1 - snapshot.player.primaryCooldown / snapshot.player.primaryCooldownMax,
        0,
        1
      ).toString()
    );
    this.dashTimer.textContent = formatCooldown(snapshot.player.dashCooldown);
    this.pulseTimer.textContent = formatCooldown(snapshot.player.pulseCooldown);
    this.weaponTimer.textContent = formatCooldown(snapshot.player.primaryCooldown);
    this.bossChip.hidden = !snapshot.boss;
    this.bossChip.textContent = snapshot.boss
      ? `${snapshot.boss.label} • ${snapshot.boss.phase}`
      : "Boss Inactive";

    this.renderLoadout(snapshot.selectedUpgrades, this.loadoutList, true);

    if (snapshot.phase !== this.phase) {
      this.phase = snapshot.phase;
      this.syncOverlays(snapshot);
    } else if (snapshot.phase === "draft") {
      this.renderDraftCards(snapshot.draftOptions);
    }

    if (snapshot.phase === "won" || snapshot.phase === "lost") {
      this.summaryVerdict.textContent = snapshot.summary.verdict;
      this.summaryRank.textContent = snapshot.summary.rank;
      this.summaryScore.textContent = formatScore(snapshot.summary.score);
      this.summaryAnchors.textContent = `${snapshot.summary.anchorsSecured} / ${snapshot.anchorsTotal}`;
      this.summaryKills.textContent = snapshot.summary.killCount.toString();
      this.summaryTime.textContent = formatTime(snapshot.summary.elapsed);
      this.renderLoadout(snapshot.selectedUpgrades, this.summaryLoadout, false);
    }
  }

  private syncOverlays(snapshot: Snapshot): void {
    if (snapshot.phase === "running") {
      this.introOverlay.hidden = true;
      this.draftOverlay.hidden = true;
      this.summaryOverlay.hidden = true;
      return;
    }

    if (snapshot.phase === "ready") {
      this.introOverlay.hidden = false;
      this.draftOverlay.hidden = true;
      this.summaryOverlay.hidden = true;
      return;
    }

    if (snapshot.phase === "draft") {
      this.introOverlay.hidden = true;
      this.draftOverlay.hidden = false;
      this.summaryOverlay.hidden = true;
      this.renderDraftCards(snapshot.draftOptions);
      return;
    }

    this.introOverlay.hidden = true;
    this.draftOverlay.hidden = true;
    this.summaryOverlay.hidden = false;
  }

  private renderDraftCards(options: UpgradeOption[]): void {
    this.draftCards.innerHTML = options
      .map(
        (option, index) => `
          <button type="button" class="draft-card" data-upgrade-id="${option.id}">
            <span class="draft-card__index">0${index + 1}</span>
            <strong>${option.title}</strong>
            <p>${option.description}</p>
          </button>
        `
      )
      .join("");
  }

  private renderLoadout(
    upgrades: UpgradeOption[],
    container: HTMLUListElement,
    includePlaceholder: boolean
  ): void {
    this.loadoutCount.textContent =
      upgrades.length === 0
        ? "No protocol installed"
        : `${upgrades.length} protocol${upgrades.length > 1 ? "s" : ""} online`;

    if (upgrades.length === 0) {
      container.innerHTML = includePlaceholder
        ? '<li class="tag tag--ghost">Draft upgrades between sectors to specialize the run.</li>'
        : '<li class="tag tag--ghost">No upgrade selected</li>';
      return;
    }

    container.innerHTML = upgrades
      .map((upgrade) => `<li class="tag">${upgrade.title}</li>`)
      .join("");
  }

  private renderMarkup(): string {
    return `
      <main class="shell">
        <section class="frame">
          <div id="game-stage" class="stage" data-testid="stage"></div>

          <div class="hud-stack hud-stack--left">
            <div class="panel panel--brand">
              <span class="eyebrow">NEON TACTICAL ARENA</span>
              <h1>Pulse Prism</h1>
              <div class="mission-copy">
                <span class="label">Objective</span>
                <span class="mission-copy__title" data-testid="objective-title">Stabilize the anchor lattice</span>
                <p data-testid="objective-detail">Secure two anchors per sector, draft one protocol between sectors, then fracture the Overseer.</p>
              </div>
            </div>

            <div class="panel panel--score">
              <span class="label">Score</span>
              <span class="value value--score" data-testid="score-value">000000</span>
              <div class="stats-grid">
                <div>
                  <span class="label">Combo</span>
                  <strong data-testid="combo-value">00</strong>
                </div>
                <div>
                  <span class="label">Multiplier</span>
                  <strong data-testid="multiplier-value">x1.00</strong>
                </div>
                <div>
                  <span class="label">Kills</span>
                  <strong data-testid="kill-value">0</strong>
                </div>
                <div>
                  <span class="label">Elapsed</span>
                  <strong data-testid="elapsed-value">0:00</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="ribbon" data-testid="status-ribbon">
            <div class="ribbon__group">
              <span class="ribbon__label">Sector</span>
              <strong data-testid="sector-value">1 / ${SECTOR_COUNT}</strong>
            </div>
            <div class="ribbon__group ribbon__group--threat">
              <span class="ribbon__label">Threat</span>
              <div class="meter meter--compact">
                <span class="meter__fill meter__fill--threat" data-testid="threat-fill" style="--fill:0.12"></span>
              </div>
            </div>
            <div class="ribbon__group">
              <span class="ribbon__label">Anchors</span>
              <strong data-testid="anchor-value">0 / ${SECTOR_COUNT * 2}</strong>
            </div>
          </div>

          <div class="hud-stack hud-stack--right">
            <div class="panel panel--systems">
              <div class="panel__heading">
                <span class="eyebrow">Core Systems</span>
                <span class="badge" data-testid="boss-chip" hidden>Boss Inactive</span>
              </div>

              <div class="metric-row metric-row--tight">
                <span>Stability</span>
                <strong data-testid="integrity-value">120 / 120</strong>
              </div>
              <div class="meter">
                <span class="meter__fill meter__fill--health" data-testid="integrity-fill" style="--fill:1"></span>
              </div>

              <div class="cooldown">
                <div class="metric-row metric-row--tight">
                  <span>Dash</span>
                  <strong data-testid="dash-timer">Ready</strong>
                </div>
                <div class="meter meter--thin">
                  <span class="meter__fill meter__fill--dash" data-testid="dash-fill" style="--fill:1"></span>
                </div>
              </div>

              <div class="cooldown">
                <div class="metric-row metric-row--tight">
                  <span>Pulse</span>
                  <strong data-testid="pulse-timer">Ready</strong>
                </div>
                <div class="meter meter--thin">
                  <span class="meter__fill meter__fill--pulse" data-testid="pulse-fill" style="--fill:1"></span>
                </div>
              </div>

              <div class="cooldown">
                <div class="metric-row metric-row--tight">
                  <span>Weapon</span>
                  <strong data-testid="weapon-timer">Ready</strong>
                </div>
                <div class="meter meter--thin">
                  <span class="meter__fill meter__fill--weapon" data-testid="weapon-fill" style="--fill:1"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel panel--loadout">
            <div class="panel__heading">
              <span class="eyebrow">Protocol Stack</span>
              <span class="tiny" data-testid="loadout-count">No protocol installed</span>
            </div>
            <ul class="tag-list" data-testid="loadout-list">
              <li class="tag tag--ghost">Draft upgrades between sectors to specialize the run.</li>
            </ul>
          </div>

          <div class="control-chip">
            <span>WASD move</span>
            <span>Mouse aim</span>
            <span>Auto-fire</span>
            <span>Space dash</span>
            <span>Shift pulse</span>
          </div>

          <div class="overlay" data-testid="intro-overlay">
            <div class="overlay__card">
              <span class="eyebrow">LATTICE BREACH</span>
              <h2>Pulse Prism</h2>
              <p>Each run is now a three-sector tactical arena. Capture live anchors under pressure, draft one protocol after every sector, then crack the Overseer in a boss finale.</p>
              <div class="overlay__stats">
                <span>Primary fire is automatic and follows the mouse.</span>
                <span>Dash pierces traffic. Pulse is a scarce crowd reset.</span>
                <span>Secure anchors to heal, score, and open your next protocol draft.</span>
              </div>
              <button type="button" class="button" data-testid="start-button">Begin Run</button>
            </div>
          </div>

          <div class="overlay" data-testid="draft-overlay" hidden>
            <div class="overlay__card overlay__card--draft">
              <span class="eyebrow">PROTOCOL DRAFT</span>
              <h2>Choose Your Shift</h2>
              <p>The sector is stable for a moment. Pick one upgrade to change how the next sector and boss fight unfold.</p>
              <div class="draft-grid" data-testid="draft-cards"></div>
            </div>
          </div>

          <div class="overlay" data-testid="summary-overlay" hidden>
            <div class="overlay__card overlay__card--summary">
              <span class="eyebrow">RUN REPORT</span>
              <span class="rank" data-testid="summary-rank">A</span>
              <p data-testid="summary-verdict">The lattice held.</p>
              <div class="summary-grid">
                <div>
                  <span class="label">Score</span>
                  <strong data-testid="summary-score">000000</strong>
                </div>
                <div>
                  <span class="label">Anchors</span>
                  <strong data-testid="summary-anchors">0 / 6</strong>
                </div>
                <div>
                  <span class="label">Kills</span>
                  <strong data-testid="summary-kills">0</strong>
                </div>
                <div>
                  <span class="label">Elapsed</span>
                  <strong data-testid="summary-time">0:00</strong>
                </div>
              </div>
              <ul class="tag-list tag-list--summary" data-testid="summary-loadout">
                <li class="tag tag--ghost">No upgrade selected</li>
              </ul>
              <button type="button" class="button" data-testid="restart-button">Restart Run</button>
            </div>
          </div>
        </section>
      </main>
    `;
  }
}
