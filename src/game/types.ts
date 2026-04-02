export type Suit = "ember" | "tide" | "grove" | "volt";
export type Temperature = "warm" | "cool";
export type GameStatus = "ready" | "playing" | "won" | "lost";
export type SelectionSource = "waste" | "tableau";
export type ToolMode = "scout" | null;

export interface Card {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
}

export interface TableauColumn {
  cards: Card[];
}

export interface CompanionState {
  suit: Suit;
  captureStage: 0 | 1 | 2 | 3;
  rankProgress: number;
}

export interface StatsState {
  score: number;
  moves: number;
  redealsLeft: number;
  charms: number;
  hiddenRevealed: number;
  foundationsCompleted: number;
}

export interface GameState {
  status: GameStatus;
  stock: Card[];
  waste: Card[];
  tableau: TableauColumn[];
  foundations: Record<Suit, Card[]>;
  companions: Record<Suit, CompanionState>;
  stats: StatsState;
  message: string;
  journal: string[];
  objective: string;
}

export interface SelectionState {
  source: SelectionSource;
  columnIndex?: number;
  cardIndex?: number;
}

export interface SuitMeta {
  suit: Suit;
  label: string;
  habitat: string;
  accent: string;
  temperature: Temperature;
  companionStages: [string, string, string];
  abilityLabel: string;
  abilityDescription: string;
}
