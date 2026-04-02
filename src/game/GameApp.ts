import {
  SUIT_META,
  SUIT_ORDER,
  STAGE_THRESHOLDS,
  cardTitle,
  rankLabel
} from "./data";
import { PocketPatienceEngine } from "./PocketPatienceEngine";
import type {
  Card,
  CompanionState,
  GameState,
  SelectionState,
  Suit,
  ToolMode
} from "./types";

function cardColor(card: Card): string {
  return SUIT_META[card.suit].accent;
}

function formatFoundationProgress(rank: number): string {
  if (rank <= 0) {
    return "Dormant";
  }

  if (rank >= 13) {
    return "Zenith";
  }

  return `${rankLabel(rank)} ${rank}`;
}

export class GameApp {
  private readonly engine = new PocketPatienceEngine();
  private readonly root: HTMLDivElement;

  private selection: SelectionState | null = null;
  private toolMode: ToolMode = null;

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.root.addEventListener("click", this.handleClick);
    this.render(this.engine.getState());
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;

    if (!target) {
      return;
    }

    const actionTarget = target.closest<HTMLElement>("[data-action]");

    if (actionTarget) {
      const action = actionTarget.dataset.action;

      if (action === "start") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.startNewGame());
        return;
      }

      if (action === "draw-stock") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.drawFromStock());
        return;
      }

      if (action === "recycle-stock") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.recycleWaste(false));
        return;
      }

      if (action === "use-recall") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.recycleWaste(true));
        return;
      }

      if (action === "use-scout") {
        this.selection = null;
        this.toolMode = this.toolMode === "scout" ? null : "scout";
        this.render(this.engine.getState());
        return;
      }

      if (action === "move-waste-foundation") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.moveWasteToFoundation());
        return;
      }
    }

    const columnTarget = target.closest<HTMLElement>("[data-column-index]");
    const wasteCardTarget = target.closest<HTMLElement>("[data-waste-top='true']");
    const foundationTarget = target.closest<HTMLElement>("[data-foundation-suit]");

    if (this.toolMode === "scout" && columnTarget) {
      const columnIndex = Number(columnTarget.dataset.columnIndex);
      this.toolMode = null;
      this.selection = null;
      this.render(this.engine.scoutColumn(columnIndex));
      return;
    }

    if (wasteCardTarget) {
      this.handleWasteClick();
      return;
    }

    if (columnTarget) {
      const columnIndex = Number(columnTarget.dataset.columnIndex);
      const cardTarget = target.closest<HTMLElement>("[data-card-index]");

      if (cardTarget) {
        const cardIndex = Number(cardTarget.dataset.cardIndex);
        this.handleTableauCardClick(columnIndex, cardIndex);
        return;
      }

      this.handleColumnClick(columnIndex);
      return;
    }

    if (foundationTarget) {
      if (this.selection?.source === "waste") {
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.moveWasteToFoundation());
        return;
      }

      if (
        this.selection?.source === "tableau" &&
        this.selection.columnIndex !== undefined
      ) {
        const sourceIndex = this.selection.columnIndex;
        this.selection = null;
        this.toolMode = null;
        this.render(this.engine.moveTableauToFoundation(sourceIndex));
        return;
      }
    }

    this.selection = null;
    this.toolMode = null;
    this.render(this.engine.getState());
  };

  private handleWasteClick(): void {
    if (this.selection?.source === "waste") {
      this.selection = null;
    } else {
      this.selection = { source: "waste" };
    }

    this.toolMode = null;
    this.render(this.engine.getState());
  }

  private handleTableauCardClick(columnIndex: number, cardIndex: number): void {
    if (
      this.selection?.source === "tableau" &&
      this.selection.columnIndex === columnIndex &&
      this.selection.cardIndex === cardIndex
    ) {
      this.selection = null;
      this.render(this.engine.autoMoveSelection(columnIndex, cardIndex));
      return;
    }

    if (this.selection?.source === "waste") {
      this.selection = null;
      this.toolMode = null;
      this.render(this.engine.moveWasteToTableau(columnIndex));
      return;
    }

    if (
      this.selection?.source === "tableau" &&
      this.selection.columnIndex !== undefined &&
      this.selection.cardIndex !== undefined
    ) {
      const nextState = this.engine.moveTableauStack(
        this.selection.columnIndex,
        this.selection.cardIndex,
        columnIndex
      );
      this.selection = null;
      this.toolMode = null;
      this.render(nextState);
      return;
    }

    this.selection = {
      source: "tableau",
      columnIndex,
      cardIndex
    };
    this.toolMode = null;
    this.render(this.engine.getState());
  }

  private handleColumnClick(columnIndex: number): void {
    if (
      this.selection?.source === "tableau" &&
      this.selection.columnIndex !== undefined &&
      this.selection.cardIndex !== undefined
    ) {
      const nextState = this.engine.moveTableauStack(
        this.selection.columnIndex,
        this.selection.cardIndex,
        columnIndex
      );
      this.selection = null;
      this.toolMode = null;
      this.render(nextState);
      return;
    }

    if (this.selection?.source === "waste") {
      this.selection = null;
      this.toolMode = null;
      this.render(this.engine.moveWasteToTableau(columnIndex));
      return;
    }

    this.selection = null;
    this.toolMode = null;
    this.render(this.engine.getState());
  }

  private render(state: GameState): void {
    this.root.innerHTML = `
      <main class="shell">
        <section class="app-frame">
          <header class="hero panel">
            <div>
              <span class="eyebrow">CARD CREATURE EXPEDITION</span>
              <h1>Pocket Patience</h1>
              <p>Un solitaire de sanctuaires où tu fais évoluer une escouade de compagnons en complétant trois habitats sur quatre.</p>
            </div>
            <div class="hero__actions">
              <button class="button" data-action="start" data-testid="start-button">
                ${state.status === "ready" ? "Start Expedition" : "New Expedition"}
              </button>
              <div class="hero__status">
                <span class="label">Objective</span>
                <strong data-testid="objective-copy">${state.objective}</strong>
              </div>
            </div>
          </header>

          <section class="top-strip">
            <article class="panel stat-panel">
              <span class="label">Score</span>
              <strong class="stat-value" data-testid="score-value">${state.stats.score}</strong>
            </article>
            <article class="panel stat-panel">
              <span class="label">Moves</span>
              <strong class="stat-value">${state.stats.moves}</strong>
            </article>
            <article class="panel stat-panel">
              <span class="label">Redeals</span>
              <strong class="stat-value" data-testid="redeal-value">${state.stats.redealsLeft}</strong>
            </article>
            <article class="panel stat-panel">
              <span class="label">Charms</span>
              <strong class="stat-value" data-testid="charm-value">${state.stats.charms}</strong>
            </article>
            <article class="panel stat-panel">
              <span class="label">Crowned</span>
              <strong class="stat-value" data-testid="crowned-value">${state.stats.foundationsCompleted} / 3</strong>
            </article>
          </section>

          <section class="layout">
            <aside class="panel sidebar">
              <div class="sidebar__section">
                <div class="sidebar__header">
                  <span class="eyebrow">Companions</span>
                  <span class="tiny">Capture and evolve 3</span>
                </div>
                <div class="companion-grid" data-testid="companion-grid">
                  ${SUIT_ORDER.map((suit) => this.renderCompanionCard(state.companions[suit])).join("")}
                </div>
              </div>

              <div class="sidebar__section">
                <div class="sidebar__header">
                  <span class="eyebrow">Field Tools</span>
                  <span class="tiny">${this.toolMode === "scout" ? "Scout a hidden card" : "No tool armed"}</span>
                </div>
                <div class="tool-grid">
                  <button class="button button--secondary" data-action="use-scout" ${state.stats.charms <= 0 || state.status !== "playing" ? "disabled" : ""}>
                    Scout Hidden
                  </button>
                  <button class="button button--secondary" data-action="use-recall" ${state.stats.charms <= 0 || state.waste.length === 0 || state.stock.length > 0 || state.status !== "playing" ? "disabled" : ""}>
                    Recall Waste
                  </button>
                  <button class="button button--ghost" data-action="move-waste-foundation" ${state.waste.length === 0 || state.status !== "playing" ? "disabled" : ""}>
                    Waste to Habitat
                  </button>
                </div>
              </div>

              <div class="sidebar__section">
                <span class="eyebrow">How It Works</span>
                <ul class="notes-list">
                  <li>Build descending runs in the tableau and ascending habitats by biome.</li>
                  <li>Each habitat evolves one companion at ranks 1, 7, and 13.</li>
                  <li>Ember softens empty-column rules, Tide grants redeals, Volt relaxes stacking.</li>
                  <li>Spend charms to scout a hidden card or recall the waste into stock.</li>
                </ul>
              </div>
            </aside>

            <section class="board panel">
              <div class="board__top">
                <div class="stock-row">
                  ${this.renderDeckArea(state)}
                </div>
                <div class="foundation-row" data-testid="foundation-row">
                  ${SUIT_ORDER.map((suit) => this.renderFoundation(state, suit)).join("")}
                </div>
              </div>

              <div class="tableau-grid" data-testid="tableau-grid">
                ${state.tableau
                  .map((column, columnIndex) => this.renderColumn(state, column.cards, columnIndex))
                  .join("")}
              </div>
            </section>

            <aside class="panel sidebar sidebar--log">
              <div class="sidebar__section">
                <span class="eyebrow">Field Log</span>
                <p class="message" data-testid="message">${state.message}</p>
                <ul class="log-list" data-testid="journal-list">
                  ${state.journal.map((entry) => `<li>${entry}</li>`).join("")}
                </ul>
              </div>
            </aside>
          </section>

          ${this.renderOverlay(state)}
        </section>
      </main>
    `;
  }

  private renderDeckArea(state: GameState): string {
    const wasteTop = state.waste[state.waste.length - 1];

    return `
      <button
        class="deck deck--stock ${state.stock.length === 0 ? "deck--empty" : ""}"
        data-action="${state.stock.length === 0 ? "recycle-stock" : "draw-stock"}"
        data-testid="stock-button"
        ${state.status !== "playing" ? "disabled" : ""}
      >
        <span class="deck__label">Stock</span>
        <strong>${state.stock.length}</strong>
      </button>

      <div class="deck deck--waste ${wasteTop ? "deck--active" : "deck--empty"}" data-testid="waste-pile">
        ${
          wasteTop
            ? this.renderCard(wasteTop, {
                selected: this.selection?.source === "waste",
                wasteTop: true
              })
            : '<span class="deck__placeholder">Waste</span>'
        }
      </div>
    `;
  }

  private renderFoundation(state: GameState, suit: Suit): string {
    const pile = state.foundations[suit];
    const top = pile[pile.length - 1];
    const suitMeta = SUIT_META[suit];
    const stage = state.companions[suit].captureStage;

    return `
      <div class="foundation-slot" data-foundation-suit="${suit}">
        <div class="foundation-slot__header">
          <span class="label">${suitMeta.label}</span>
          <strong>${formatFoundationProgress(pile.length)}</strong>
        </div>
        <div class="foundation-card" style="--accent:${suitMeta.accent}">
          ${
            top
              ? this.renderCard(top, { compact: true })
              : `<div class="card card--ghost" style="--accent:${suitMeta.accent}">
                  <span>${suitMeta.habitat}</span>
                </div>`
          }
        </div>
        <div class="foundation-slot__footer">
          <span>Stage ${stage}</span>
          <span>${suitMeta.companionStages[Math.max(0, stage - 1)] ?? "Dormant"}</span>
        </div>
      </div>
    `;
  }

  private renderColumn(state: GameState, cards: Card[], columnIndex: number): string {
    return `
      <div class="tableau-column" data-column-index="${columnIndex}">
        <div class="tableau-column__header">
          <span class="label">Lane ${columnIndex + 1}</span>
          <span>${cards.length}</span>
        </div>
        <div class="tableau-stack">
          ${
            cards.length === 0
              ? `<div class="column-placeholder ${this.selection ? "column-placeholder--active" : ""}">Empty lane</div>`
              : cards
                  .map((card, cardIndex) =>
                    this.renderCard(card, {
                      columnIndex,
                      cardIndex,
                      stacked: true,
                      selected:
                        this.selection?.source === "tableau" &&
                        this.selection.columnIndex === columnIndex &&
                        this.selection.cardIndex === cardIndex
                    })
                  )
                  .join("")
          }
        </div>
      </div>
    `;
  }

  private renderCompanionCard(companion: CompanionState): string {
    const meta = SUIT_META[companion.suit];
    const currentName =
      companion.captureStage === 0
        ? "Dormant"
        : meta.companionStages[companion.captureStage - 1];

    return `
      <article class="companion-card" style="--accent:${meta.accent}">
        <header>
          <span class="label">${meta.label}</span>
          <strong>${currentName}</strong>
        </header>
        <div class="companion-card__stages">
          ${STAGE_THRESHOLDS.map(
            (threshold, index) => `
              <span class="${companion.rankProgress >= threshold ? "stage-dot stage-dot--filled" : "stage-dot"}">
                ${index + 1}
              </span>
            `
          ).join("")}
        </div>
        <p>${meta.abilityDescription}</p>
      </article>
    `;
  }

  private renderCard(
    card: Card,
    options: {
      columnIndex?: number;
      cardIndex?: number;
      selected?: boolean;
      stacked?: boolean;
      wasteTop?: boolean;
      compact?: boolean;
    } = {}
  ): string {
    if (!card.faceUp) {
      return `
        <div class="card card--back ${options.stacked ? "card--stacked" : ""}" ${options.cardIndex !== undefined ? `style="--stack-index:${options.cardIndex}"` : ""}>
          <span class="card__crest">*</span>
        </div>
      `;
    }

    const meta = SUIT_META[card.suit];
    const selected = options.selected ? "card--selected" : "";
    const stacked = options.stacked ? "card--stacked" : "";
    const compact = options.compact ? "card--compact" : "";

    return `
      <button
        class="card ${selected} ${stacked} ${compact}"
        ${options.cardIndex !== undefined && options.stacked ? `style="--accent:${cardColor(card)};--stack-index:${options.cardIndex}"` : `style="--accent:${cardColor(card)}"`}
        ${options.columnIndex !== undefined ? `data-column-index="${options.columnIndex}"` : ""}
        ${options.cardIndex !== undefined ? `data-card-index="${options.cardIndex}"` : ""}
        ${options.wasteTop ? 'data-waste-top="true"' : ""}
      >
        <span class="card__suit">${meta.label}</span>
        <strong class="card__name">${rankLabel(card.rank)}</strong>
        <span class="card__title">${cardTitle(card)}</span>
      </button>
    `;
  }

  private renderOverlay(state: GameState): string {
    if (state.status === "ready") {
      return `
        <div class="overlay" data-testid="intro-overlay">
          <div class="overlay__card">
            <span class="eyebrow">NEW FORMAT</span>
            <h2>Pocket Patience</h2>
            <p>Cette version échange l’arène contre un jeu de cartes original: un Klondike d’expédition où chaque habitat fait évoluer un compagnon de poche.</p>
            <ul class="notes-list">
              <li>Complète trois habitats pour gagner, pas les quatre.</li>
              <li>Les compagnons gagnent des paliers à 1, 7 et 13.</li>
              <li>Les charmes servent à révéler une carte cachée ou recycler la défausse.</li>
              <li>Les règles du tableau s’assouplissent au fil des captures.</li>
            </ul>
            <button class="button" data-action="start" data-testid="overlay-start-button">Start Expedition</button>
          </div>
        </div>
      `;
    }

    if (state.status === "won" || state.status === "lost") {
      return `
        <div class="overlay" data-testid="summary-overlay">
          <div class="overlay__card">
            <span class="eyebrow">${state.status === "won" ? "SQUAD COMPLETE" : "EXPEDITION FAILED"}</span>
            <h2>${state.status === "won" ? "Three Habitats Crowned" : "No Moves Left"}</h2>
            <p>${state.message}</p>
            <div class="summary-stats">
              <div><span class="label">Score</span><strong>${state.stats.score}</strong></div>
              <div><span class="label">Moves</span><strong>${state.stats.moves}</strong></div>
              <div><span class="label">Charms</span><strong>${state.stats.charms}</strong></div>
              <div><span class="label">Reveals</span><strong>${state.stats.hiddenRevealed}</strong></div>
            </div>
            <button class="button" data-action="start" data-testid="restart-button">Run It Again</button>
          </div>
        </div>
      `;
    }

    return "";
  }
}
