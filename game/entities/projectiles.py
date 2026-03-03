from __future__ import annotations

from dataclasses import dataclass

import pygame


@dataclass(slots=True)
class ArcaneBolt:
    """Optional lightweight projectile primitive (available for future expansion)."""

    id: int
    rect: pygame.Rect
    velocity: pygame.Vector2
    damage: int
    life: float

    def update(self, dt: float) -> bool:
        self.life -= dt
        self.rect.x += int(self.velocity.x * dt)
        self.rect.y += int(self.velocity.y * dt)
        return self.life > 0
