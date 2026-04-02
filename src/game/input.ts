import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import type { InputFrame, Vector2 } from "./types";

const MOVEMENT_KEYS = new Map<string, [number, number]>([
  ["KeyW", [0, -1]],
  ["ArrowUp", [0, -1]],
  ["KeyS", [0, 1]],
  ["ArrowDown", [0, 1]],
  ["KeyA", [-1, 0]],
  ["ArrowLeft", [-1, 0]],
  ["KeyD", [1, 0]],
  ["ArrowRight", [1, 0]]
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class InputController {
  private readonly pressed = new Set<string>();
  private readonly viewport: HTMLElement;
  private dashQueued = false;
  private pulseQueued = false;
  private pointerPosition: Vector2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  private pointerActive = false;

  constructor(viewport: HTMLElement) {
    this.viewport = viewport;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handlePointerMove);
    window.addEventListener("blur", this.handleBlur);
  }

  sample(): InputFrame {
    let moveX = 0;
    let moveY = 0;

    for (const key of this.pressed) {
      const delta = MOVEMENT_KEYS.get(key);

      if (!delta) {
        continue;
      }

      moveX += delta[0];
      moveY += delta[1];
    }

    const frame = {
      moveX,
      moveY,
      aim: { ...this.pointerPosition },
      pointerActive: this.pointerActive,
      dashPressed: this.dashQueued,
      pulsePressed: this.pulseQueued
    };

    this.dashQueued = false;
    this.pulseQueued = false;

    return frame;
  }

  getPointerState(): { active: boolean; position: Vector2 } {
    return {
      active: this.pointerActive,
      position: { ...this.pointerPosition }
    };
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (MOVEMENT_KEYS.has(event.code)) {
      this.pressed.add(event.code);
      event.preventDefault();
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      this.dashQueued = true;
      event.preventDefault();
      return;
    }

    if (
      (event.code === "ShiftLeft" || event.code === "ShiftRight") &&
      !event.repeat
    ) {
      this.pulseQueued = true;
      event.preventDefault();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private handlePointerMove = (event: MouseEvent): void => {
    const bounds = this.viewport.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const relativeX = (event.clientX - bounds.left) / bounds.width;
    const relativeY = (event.clientY - bounds.top) / bounds.height;

    this.pointerPosition = {
      x: clamp(relativeX, 0, 1) * GAME_WIDTH,
      y: clamp(relativeY, 0, 1) * GAME_HEIGHT
    };
    this.pointerActive = true;
  };

  private handleBlur = (): void => {
    this.pressed.clear();
    this.dashQueued = false;
    this.pulseQueued = false;
  };
}
