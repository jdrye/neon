import type { Card, Suit, SuitMeta, Temperature } from "./types";

export const SUIT_ORDER: Suit[] = ["ember", "tide", "grove", "volt"];

export const SUIT_META: Record<Suit, SuitMeta> = {
  ember: {
    suit: "ember",
    label: "Ember",
    habitat: "Cinder Den",
    accent: "#ff7a5c",
    temperature: "warm",
    companionStages: ["Cindercub", "Pyrelion", "Solflare"],
    abilityLabel: "Ashen Column",
    abilityDescription: "Captured Ember companions let empty columns accept lower ranks."
  },
  tide: {
    suit: "tide",
    label: "Tide",
    habitat: "Moonwash Reef",
    accent: "#63c7ff",
    temperature: "cool",
    companionStages: ["Ripplet", "Riptalon", "Abyssaur"],
    abilityLabel: "Deep Recall",
    abilityDescription: "Captured Tide companions extend your redeal budget."
  },
  grove: {
    suit: "grove",
    label: "Grove",
    habitat: "Verdant Nest",
    accent: "#7de294",
    temperature: "cool",
    companionStages: ["Budimp", "Thornelk", "Verdra"],
    abilityLabel: "Scout Charm",
    abilityDescription: "Companion milestones award charms you can spend to scout hidden cards."
  },
  volt: {
    suit: "volt",
    label: "Volt",
    habitat: "Storm Roost",
    accent: "#ffd86a",
    temperature: "warm",
    companionStages: ["Sparkit", "Voltusk", "Tempestral"],
    abilityLabel: "Open Stacking",
    abilityDescription: "Captured Volt companions relax tableau color restrictions."
  }
};

export const RANK_LABELS = [
  "",
  "Egg",
  "Cub",
  "Scout",
  "Fang",
  "Talon",
  "Rogue",
  "Alpha",
  "Myth",
  "Elder",
  "Prime",
  "Nova",
  "Crown",
  "Zenith"
];

export const STAGE_THRESHOLDS = [1, 7, 13];

function temperatureOfSuit(suit: Suit): Temperature {
  return SUIT_META[suit].temperature;
}

export function isAlternatingTemperature(a: Suit, b: Suit): boolean {
  return temperatureOfSuit(a) !== temperatureOfSuit(b);
}

export function createDeck(): Card[] {
  let nextId = 1;
  const deck: Card[] = [];

  for (const suit of SUIT_ORDER) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({
        id: `${suit}-${rank}-${nextId++}`,
        suit,
        rank,
        faceUp: false
      });
    }
  }

  return deck;
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }

  return next;
}

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? rank.toString();
}

export function cardTitle(card: Pick<Card, "suit" | "rank">): string {
  const suit = SUIT_META[card.suit];
  return `${suit.label} ${rankLabel(card.rank)}`;
}

export function companionStageFromRank(rank: number): 0 | 1 | 2 | 3 {
  if (rank >= 13) {
    return 3;
  }

  if (rank >= 7) {
    return 2;
  }

  if (rank >= 1) {
    return 1;
  }

  return 0;
}

export function emptyColumnsThreshold(emberStage: number): number {
  if (emberStage >= 3) {
    return 1;
  }

  if (emberStage >= 2) {
    return 11;
  }

  if (emberStage >= 1) {
    return 12;
  }

  return 13;
}

export function extraRedeals(tideStage: number): number {
  return tideStage;
}

export function voltOpenStacking(voltStage: number): boolean {
  return voltStage >= 1;
}
