from __future__ import annotations

from dataclasses import dataclass

import pygame

from game import settings


@dataclass(slots=True)
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    life: float
    max_life: float
    color: tuple[int, int, int]
    size: int = 2

    def update(self, dt: float) -> bool:
        self.life -= dt
        if self.life <= 0.0:
            return False
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vx *= 0.9
        self.vy *= 0.9
        return True


def draw_background(surface: pygame.Surface, camera_x: float) -> None:
    w, h = surface.get_size()
    surface.fill(settings.PALETTE["bg_sky"])

    far_offset = int(camera_x * 0.2) % max(1, w)
    mid_offset = int(camera_x * 0.45) % max(1, w)

    for i in range(-1, 3):
        x = i * w - far_offset
        pygame.draw.polygon(
            surface,
            settings.PALETTE["bg_far"],
            [(x, h), (x + w * 0.33, h * 0.52), (x + w * 0.66, h), (x, h)],
        )

    for i in range(-1, 3):
        x = i * w - mid_offset
        pygame.draw.polygon(
            surface,
            settings.PALETTE["bg_mid"],
            [(x, h), (x + w * 0.22, h * 0.63), (x + w * 0.44, h), (x, h)],
        )


def draw_player(surface: pygame.Surface, rect: pygame.Rect, facing: int, dash_active: bool) -> None:
    body = rect.inflate(-6, -4)
    cloak = pygame.Rect(body.x + (2 if facing > 0 else 0), body.y + 14, body.w - 2, body.h - 14)

    if dash_active:
        trail = rect.inflate(12, 8)
        pygame.draw.rect(surface, (173, 223, 255, 80), trail, border_radius=6)

    pygame.draw.rect(surface, settings.PALETTE["hero"], body, border_radius=5)
    pygame.draw.rect(surface, settings.PALETTE["hero_cloak"], cloak, border_radius=4)

    eye_x = body.centerx + (3 if facing > 0 else -3)
    pygame.draw.rect(surface, (38, 32, 52), (eye_x, body.y + 8, 3, 3))

    sword = pygame.Rect(rect.centerx + (10 if facing > 0 else -18), rect.centery - 4, 8, 3)
    pygame.draw.rect(surface, (220, 220, 240), sword)


def draw_enemy(surface: pygame.Surface, kind: str, rect: pygame.Rect, hit_flash: float) -> None:
    if kind == "goblin":
        color = settings.PALETTE["enemy_goblin"]
    elif kind == "skeleton":
        color = settings.PALETTE["enemy_skeleton"]
    else:
        color = settings.PALETTE["enemy_bat"]

    if hit_flash > 0:
        color = (255, 184, 194)

    pygame.draw.rect(surface, color, rect, border_radius=4)
    pygame.draw.rect(surface, (30, 24, 40), (rect.centerx - 5, rect.y + 6, 3, 3))
    pygame.draw.rect(surface, (30, 24, 40), (rect.centerx + 2, rect.y + 6, 3, 3))


def draw_collectible(surface: pygame.Surface, kind: str, center: tuple[int, int], t: float) -> None:
    x, y = center
    bob = int((pygame.math.Vector2(0, 1).rotate(t * 120).x) * 2)
    if kind == "amulet":
        pygame.draw.circle(surface, (122, 232, 190), (x, y + bob), 8)
        pygame.draw.circle(surface, (35, 90, 75), (x, y + bob), 3)
    else:
        pygame.draw.circle(surface, settings.PALETTE["gold"], (x, y + bob), 6)
        pygame.draw.circle(surface, (150, 120, 60), (x, y + bob), 2)


def draw_checkpoint(surface: pygame.Surface, rect: pygame.Rect, active: bool) -> None:
    pole = pygame.Rect(rect.x + rect.w // 2 - 2, rect.y, 4, rect.h)
    pygame.draw.rect(surface, (99, 79, 64), pole)
    flag_color = (255, 188, 120) if active else (156, 112, 188)
    pygame.draw.polygon(
        surface,
        flag_color,
        [(pole.right, pole.y + 4), (pole.right + 16, pole.y + 10), (pole.right, pole.y + 18)],
    )


def draw_exit(surface: pygame.Surface, rect: pygame.Rect, unlocked: bool) -> None:
    color = (138, 214, 167) if unlocked else (98, 83, 130)
    pygame.draw.rect(surface, color, rect, border_radius=6)
    pygame.draw.rect(surface, (45, 34, 62), rect, width=2, border_radius=6)
    pygame.draw.circle(surface, (240, 222, 169), (rect.right - 10, rect.centery), 3)


def draw_particles(surface: pygame.Surface, particles: list[Particle], camera: pygame.Vector2) -> None:
    for p in particles:
        alpha = max(0.0, min(1.0, p.life / p.max_life))
        color = (
            int(p.color[0] * alpha),
            int(p.color[1] * alpha),
            int(p.color[2] * alpha),
        )
        pygame.draw.rect(
            surface,
            color,
            pygame.Rect(int(p.x - camera.x), int(p.y - camera.y), p.size, p.size),
        )
