export type GamePhase = "ready" | "running" | "draft" | "won" | "lost";
export type EnemyKind = "drone" | "crusher" | "lancer" | "warden" | "boss";
export type AnchorStatus = "charging" | "secured";
export type UpgradeId =
  | "overclock"
  | "lance"
  | "capacitor"
  | "blink"
  | "satellite"
  | "recycler"
  | "splitter";

export interface Vector2 {
  x: number;
  y: number;
}

export interface InputFrame {
  moveX: number;
  moveY: number;
  aim: Vector2;
  pointerActive: boolean;
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
  dashCooldownMax: number;
  pulseCooldown: number;
  pulseCooldownMax: number;
  primaryCooldown: number;
  primaryCooldownMax: number;
  invulnerability: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  health: number;
  maxHealth: number;
  hue: number;
  hitFlash: number;
  telegraph: number;
}

export interface AnchorState {
  id: number;
  position: Vector2;
  radius: number;
  progress: number;
  required: number;
  status: AnchorStatus;
}

export interface ProjectileState {
  id: number;
  owner: "player" | "enemy";
  position: Vector2;
  velocity: Vector2;
  radius: number;
  ttl: number;
  hue: number;
  scale: number;
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

export interface OrbiterState {
  id: number;
  position: Vector2;
  angle: number;
  radius: number;
  orbitDistance: number;
  hue: number;
}

export interface UpgradeOption {
  id: UpgradeId;
  title: string;
  description: string;
}

export interface BossStatus {
  health: number;
  maxHealth: number;
  label: string;
  phase: string;
}

export interface RoundSummary {
  verdict: string;
  rank: string;
  score: number;
  sector: number;
  bestChain: number;
  anchorsSecured: number;
  killCount: number;
  upgrades: number;
  elapsed: number;
}

export interface Snapshot {
  phase: GamePhase;
  width: number;
  height: number;
  elapsed: number;
  score: number;
  combo: number;
  multiplier: number;
  bestChain: number;
  killCount: number;
  sector: number;
  totalSectors: number;
  anchorsSecured: number;
  anchorsTotal: number;
  objectiveTitle: string;
  objectiveDetail: string;
  threatLevel: number;
  player: PlayerState;
  enemies: EnemyState[];
  anchors: AnchorState[];
  projectiles: ProjectileState[];
  shards: ShardState[];
  pulses: PulseState[];
  orbiters: OrbiterState[];
  draftOptions: UpgradeOption[];
  selectedUpgrades: UpgradeOption[];
  boss?: BossStatus;
  summary: RoundSummary;
}
