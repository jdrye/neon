import {
  STAGE_THRESHOLDS,
  SUIT_META,
  SUIT_ORDER,
  cardTitle,
  companionStageFromRank,
  createDeck,
  emptyColumnsThreshold,
  extraRedeals,
  isAlternatingTemperature,
  shuffle,
  voltOpenStacking
} from "./data";
import type { Card, CompanionState, GameState, Suit, TableauColumn } from "./types";

const BASE_REDEALS = 2;

function cloneCard(card: Card): Card {
  return { ...card };
}

function cloneColumn(column: TableauColumn): TableauColumn {
  return {
    cards: column.cards.map(cloneCard)
  };
}

function topCard(cards: Card[]): Card | undefined {
  return cards[cards.length - 1];
}

function firstFaceUpIndex(cards: Card[]): number {
  return cards.findIndex((card) => card.faceUp);
}

function revealTopIfNeeded(column: TableauColumn): boolean {
  const top = topCard(column.cards);

  if (!top || top.faceUp) {
    return false;
  }

  top.faceUp = true;
  return true;
}

function countHiddenCards(column: TableauColumn): number {
  return column.cards.filter((card) => !card.faceUp).length;
}

export class PocketPatienceEngine {
  private state: GameState = this.createFreshState();

  getState(): GameState {
    return {
      ...this.state,
      stock: this.state.stock.map(cloneCard),
      waste: this.state.waste.map(cloneCard),
      tableau: this.state.tableau.map(cloneColumn),
      foundations: {
        ember: this.state.foundations.ember.map(cloneCard),
        tide: this.state.foundations.tide.map(cloneCard),
        grove: this.state.foundations.grove.map(cloneCard),
        volt: this.state.foundations.volt.map(cloneCard)
      },
      companions: {
        ember: { ...this.state.companions.ember },
        tide: { ...this.state.companions.tide },
        grove: { ...this.state.companions.grove },
        volt: { ...this.state.companions.volt }
      },
      stats: { ...this.state.stats },
      journal: [...this.state.journal]
    };
  }

  startNewGame(): GameState {
    this.state = this.createFreshState();
    this.state.status = "playing";
    this.pushMessage(
      "Pocket Patience started. Build habitats, evolve companions, and complete any three sanctuaries."
    );
    this.updateStatus();
    return this.getState();
  }

  drawFromStock(): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    if (this.state.stock.length === 0) {
      return this.recycleWaste(false);
    }

    const nextCard = this.state.stock.pop();

    if (!nextCard) {
      return this.getState();
    }

    nextCard.faceUp = true;
    this.state.waste.push(nextCard);
    this.state.stats.moves += 1;
    this.pushMessage(`You revealed ${cardTitle(nextCard)} from the expedition deck.`);
    this.finishAction();
    return this.getState();
  }

  recycleWaste(useCharm: boolean): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    if (this.state.stock.length > 0 || this.state.waste.length === 0) {
      return this.getState();
    }

    if (useCharm) {
      if (this.state.stats.charms <= 0) {
        return this.getState();
      }

      this.state.stats.charms -= 1;
      this.state.stock = this.state.waste
        .splice(0)
        .reverse()
        .map((card) => ({ ...card, faceUp: false }));
      this.pushMessage("Charm spent. The Tide companion rewound the expedition deck.");
      this.finishAction();
      return this.getState();
    }

    if (this.state.stats.redealsLeft <= 0) {
      this.pushMessage("No redeals left. You need a charm or a live move.");
      this.finishAction();
      return this.getState();
    }

    this.state.stats.redealsLeft -= 1;
    this.state.stock = this.state.waste
      .splice(0)
      .reverse()
      .map((card) => ({ ...card, faceUp: false }));
    this.pushMessage("You shuffled the waste back into the expedition deck.");
    this.finishAction();
    return this.getState();
  }

  scoutColumn(columnIndex: number): GameState {
    if (this.state.status !== "playing" || this.state.stats.charms <= 0) {
      return this.getState();
    }

    const column = this.state.tableau[columnIndex];

    if (!column || countHiddenCards(column) === 0) {
      this.pushMessage("Scout needs a column with a hidden creature card.");
      return this.getState();
    }

    const hiddenIndex = [...column.cards].reverse().findIndex((card) => !card.faceUp);
    const actualIndex = column.cards.length - 1 - hiddenIndex;
    column.cards[actualIndex].faceUp = true;
    this.state.stats.charms -= 1;
    this.state.stats.hiddenRevealed += 1;
    this.state.stats.score += 20;
    this.pushMessage(`Scout charm revealed ${cardTitle(column.cards[actualIndex])}.`);
    this.finishAction();
    return this.getState();
  }

  moveWasteToFoundation(): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    const card = topCard(this.state.waste);

    if (!card || !this.canMoveToFoundation(card)) {
      this.pushMessage("The waste top cannot enter any habitat right now.");
      return this.getState();
    }

    this.state.waste.pop();
    this.state.foundations[card.suit].push(card);
    this.state.stats.moves += 1;
    this.state.stats.score += 30;
    this.pushMessage(`${cardTitle(card)} joined the ${SUIT_META[card.suit].habitat}.`);
    this.finishAction();
    return this.getState();
  }

  moveWasteToTableau(targetColumnIndex: number): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    const card = topCard(this.state.waste);
    const targetColumn = this.state.tableau[targetColumnIndex];

    if (!card || !targetColumn || !this.canPlaceOnTableau(card, targetColumn)) {
      this.pushMessage("That tableau lane cannot accept the waste top.");
      return this.getState();
    }

    this.state.waste.pop();
    targetColumn.cards.push(card);
    this.state.stats.moves += 1;
    this.state.stats.score += 10;
    this.pushMessage(`${cardTitle(card)} slid from waste to tableau.`);
    this.finishAction();
    return this.getState();
  }

  moveTableauToFoundation(columnIndex: number): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    const column = this.state.tableau[columnIndex];
    const card = topCard(column.cards);

    if (!column || !card || !card.faceUp || !this.canMoveToFoundation(card)) {
      this.pushMessage("That creature cannot evolve into its habitat yet.");
      return this.getState();
    }

    column.cards.pop();
    this.state.foundations[card.suit].push(card);
    this.state.stats.moves += 1;
    this.state.stats.score += 30;
    this.pushMessage(`${cardTitle(card)} evolved inside ${SUIT_META[card.suit].habitat}.`);

    if (revealTopIfNeeded(column)) {
      this.state.stats.hiddenRevealed += 1;
      this.state.stats.score += 15;
      this.pushMessage("A hidden wild card was uncovered.");
    }

    this.finishAction();
    return this.getState();
  }

  moveTableauStack(
    sourceColumnIndex: number,
    sourceCardIndex: number,
    targetColumnIndex: number
  ): GameState {
    if (this.state.status !== "playing") {
      return this.getState();
    }

    if (sourceColumnIndex === targetColumnIndex) {
      return this.getState();
    }

    const sourceColumn = this.state.tableau[sourceColumnIndex];
    const targetColumn = this.state.tableau[targetColumnIndex];

    if (!sourceColumn || !targetColumn) {
      return this.getState();
    }

    const movingStack = sourceColumn.cards.slice(sourceCardIndex);

    if (
      movingStack.length === 0 ||
      movingStack.some((card) => !card.faceUp) ||
      !this.isValidFaceUpRun(movingStack) ||
      !this.canPlaceOnTableau(movingStack[0], targetColumn)
    ) {
      this.pushMessage("That run cannot move onto the target lane.");
      return this.getState();
    }

    sourceColumn.cards = sourceColumn.cards.slice(0, sourceCardIndex);
    targetColumn.cards.push(...movingStack);
    this.state.stats.moves += 1;
    this.state.stats.score += 12;
    this.pushMessage(
      `${movingStack.length}-card run moved to a new lane.`
    );

    if (revealTopIfNeeded(sourceColumn)) {
      this.state.stats.hiddenRevealed += 1;
      this.state.stats.score += 15;
      this.pushMessage("A hidden wild card was uncovered.");
    }

    this.finishAction();
    return this.getState();
  }

  autoMoveSelection(
    sourceColumnIndex: number,
    sourceCardIndex: number
  ): GameState {
    const sourceColumn = this.state.tableau[sourceColumnIndex];

    if (!sourceColumn) {
      return this.getState();
    }

    const card = sourceColumn.cards[sourceCardIndex];

    if (!card || !card.faceUp) {
      return this.getState();
    }

    if (
      sourceCardIndex === sourceColumn.cards.length - 1 &&
      this.canMoveToFoundation(card)
    ) {
      return this.moveTableauToFoundation(sourceColumnIndex);
    }

    for (let targetIndex = 0; targetIndex < this.state.tableau.length; targetIndex += 1) {
      if (targetIndex === sourceColumnIndex) {
        continue;
      }

      if (this.canPlaceOnTableau(card, this.state.tableau[targetIndex])) {
        return this.moveTableauStack(sourceColumnIndex, sourceCardIndex, targetIndex);
      }
    }

    this.pushMessage("No automatic move found for that stack.");
    return this.getState();
  }

  private createFreshState(): GameState {
    const deck = shuffle(createDeck());
    const tableau: TableauColumn[] = [];

    for (let columnIndex = 0; columnIndex < 7; columnIndex += 1) {
      const cards = deck.splice(0, columnIndex + 1);
      cards[cards.length - 1].faceUp = true;
      tableau.push({ cards });
    }

    const companions = Object.fromEntries(
      SUIT_ORDER.map((suit) => [
        suit,
        {
          suit,
          captureStage: 0,
          rankProgress: 0
        } satisfies CompanionState
      ])
    ) as Record<Suit, CompanionState>;

    return {
      status: "ready",
      stock: deck,
      waste: [],
      tableau,
      foundations: {
        ember: [],
        tide: [],
        grove: [],
        volt: []
      },
      companions,
      stats: {
        score: 0,
        moves: 0,
        redealsLeft: BASE_REDEALS,
        charms: 1,
        hiddenRevealed: 0,
        foundationsCompleted: 0
      },
      message: "Pocket Patience is ready.",
      journal: [],
      objective: "Complete any three habitats to crown a pocket squad."
    };
  }

  private canMoveToFoundation(card: Card): boolean {
    const pile = this.state.foundations[card.suit];
    return pile.length + 1 === card.rank;
  }

  private canPlaceOnTableau(card: Card, targetColumn: TableauColumn): boolean {
    const targetCard = topCard(targetColumn.cards);

    if (!targetCard) {
      return card.rank >= emptyColumnsThreshold(this.state.companions.ember.captureStage);
    }

    if (targetCard.rank !== card.rank + 1) {
      return false;
    }

    if (voltOpenStacking(this.state.companions.volt.captureStage)) {
      return targetCard.suit !== card.suit;
    }

    return isAlternatingTemperature(targetCard.suit, card.suit);
  }

  private isValidFaceUpRun(cards: Card[]): boolean {
    for (let index = 0; index < cards.length - 1; index += 1) {
      const current = cards[index];
      const next = cards[index + 1];

      if (current.rank !== next.rank + 1) {
        return false;
      }

      if (voltOpenStacking(this.state.companions.volt.captureStage)) {
        if (current.suit === next.suit) {
          return false;
        }
      } else if (!isAlternatingTemperature(current.suit, next.suit)) {
        return false;
      }
    }

    return true;
  }

  private finishAction(): void {
    this.updateCompanions();
    this.updateStatus();
  }

  private updateCompanions(): void {
    for (const suit of SUIT_ORDER) {
      const progress = this.state.foundations[suit].length;
      const nextStage = companionStageFromRank(progress);
      const companion = this.state.companions[suit];

      if (nextStage > companion.captureStage) {
        const stageName = SUIT_META[suit].companionStages[nextStage - 1];
        const previousStage = companion.captureStage;
        companion.captureStage = nextStage;
        this.state.stats.charms += 1;
        this.state.stats.score += nextStage === 3 ? 150 : 70;
        this.pushMessage(`${stageName} joined the team from ${SUIT_META[suit].habitat}.`);

        if (nextStage === 3) {
          this.state.stats.foundationsCompleted += 1;
        }

        if (suit === "tide") {
          const before = extraRedeals(previousStage);
          const after = extraRedeals(nextStage);
          this.state.stats.redealsLeft += after - before;
        }
      }

      companion.rankProgress = progress;
    }
  }

  private updateStatus(): void {
    const crownedCompanions = SUIT_ORDER.filter(
      (suit) => this.state.companions[suit].captureStage >= 3
    ).length;

    if (crownedCompanions >= 3) {
      this.state.status = "won";
      this.state.message = "Three companions reached Zenith form. Expedition complete.";
      return;
    }

    this.state.status = "playing";

    if (!this.hasAnyLegalMove()) {
      this.state.status = "lost";
      this.state.message = "No legal moves remain. The wild deck closed around the expedition.";
    }
  }

  private hasAnyLegalMove(): boolean {
    if (this.state.stock.length > 0) {
      return true;
    }

    if (this.state.waste.length > 0 && this.state.stats.redealsLeft > 0) {
      return true;
    }

    if (this.state.waste.length > 0 && this.state.stats.charms > 0) {
      return true;
    }

    const wasteCard = topCard(this.state.waste);

    if (wasteCard) {
      if (this.canMoveToFoundation(wasteCard)) {
        return true;
      }

      for (const column of this.state.tableau) {
        if (this.canPlaceOnTableau(wasteCard, column)) {
          return true;
        }
      }
    }

    for (let sourceColumnIndex = 0; sourceColumnIndex < this.state.tableau.length; sourceColumnIndex += 1) {
      const sourceColumn = this.state.tableau[sourceColumnIndex];

      for (let cardIndex = firstFaceUpIndex(sourceColumn.cards); cardIndex >= 0 && cardIndex < sourceColumn.cards.length; cardIndex += 1) {
        const card = sourceColumn.cards[cardIndex];

        if (!card.faceUp) {
          continue;
        }

        if (
          cardIndex === sourceColumn.cards.length - 1 &&
          this.canMoveToFoundation(card)
        ) {
          return true;
        }

        const movingStack = sourceColumn.cards.slice(cardIndex);

        if (!this.isValidFaceUpRun(movingStack)) {
          continue;
        }

        for (let targetColumnIndex = 0; targetColumnIndex < this.state.tableau.length; targetColumnIndex += 1) {
          if (sourceColumnIndex === targetColumnIndex) {
            continue;
          }

          if (this.canPlaceOnTableau(card, this.state.tableau[targetColumnIndex])) {
            return true;
          }
        }
      }
    }

    if (
      this.state.stats.charms > 0 &&
      this.state.tableau.some((column) => countHiddenCards(column) > 0)
    ) {
      return true;
    }

    return false;
  }

  private pushMessage(message: string): void {
    this.state.message = message;
    this.state.journal = [message, ...this.state.journal].slice(0, 8);
  }
}
