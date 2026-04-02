import type { InputFrame } from "./types";

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

export class InputController {
  private readonly pressed = new Set<string>();
  private dashQueued = false;
  private pulseQueued = false;

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
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
      dashPressed: this.dashQueued,
      pulsePressed: this.pulseQueued
    };

    this.dashQueued = false;
    this.pulseQueued = false;

    return frame;
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

  private handleBlur = (): void => {
    this.pressed.clear();
    this.dashQueued = false;
    this.pulseQueued = false;
  };
}

