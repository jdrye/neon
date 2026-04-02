export type GamePhase = "ready" | "running" | "won" | "lost";
export type EnemyKind = "drone" | "crusher";

export interface Vector2 {
  x: number;
  y: number;
}

export interface InputFrame {
  moveX: number;
  moveY: number;
  dashPressed: boolean;
  pulsePressed: boolean;
}

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  radius: number;
  health: number;
  maxHealth: number;
  dashTimer: number;
  dashCooldown: number;
  pulseCooldown: number;
  invulnerability: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  hue: number;
  hitFlash: number;
}

export interface ShardState {
  id: number;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  ttl: number;
}

export interface PulseState {
  id: number;
  position: Vector2;
  radius: number;
  maxRadius: number;
  age: number;
  duration: number;
}

export interface RoundSummary {
  verdict: string;
  rank: string;
  score: number;
  wave: number;
  bestChain: number;
  survivalTime: number;
}

export interface Snapshot {
  phase: GamePhase;
  width: number;
  height: number;
  elapsed: number;
  timeLeft: number;
  wave: number;
  score: number;
  combo: number;
  multiplier: number;
  killCount: number;
  player: PlayerState;
  enemies: EnemyState[];
  shards: ShardState[];
  pulses: PulseState[];
  summary: RoundSummary;
}

