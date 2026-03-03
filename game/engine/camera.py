from __future__ import annotations

from dataclasses import dataclass

import pygame


@dataclass
class Camera:
    width: int
    height: int
    world_width: int
    world_height: int
    x: float = 0.0
    y: float = 0.0

    def follow(self, target: pygame.Rect, dt: float) -> None:
        tx = target.centerx - self.width * 0.5
        ty = target.centery - self.height * 0.5
        blend = min(1.0, dt * 8.0)
        self.x += (tx - self.x) * blend
        self.y += (ty - self.y) * blend
        self.clamp_to_world()

    def clamp_to_world(self) -> None:
        max_x = max(0, self.world_width - self.width)
        max_y = max(0, self.world_height - self.height)
        self.x = max(0, min(self.x, max_x))
        self.y = max(0, min(self.y, max_y))

    def world_to_screen(self, x: float, y: float) -> tuple[int, int]:
        return int(x - self.x), int(y - self.y)

    def apply(self, rect: pygame.Rect) -> pygame.Rect:
        return rect.move(-int(self.x), -int(self.y))
