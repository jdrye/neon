from __future__ import annotations

from dataclasses import dataclass

import pygame

from game.world.level import Level


@dataclass(slots=True)
class CollisionState:
    left: bool = False
    right: bool = False
    up: bool = False
    down: bool = False


def move_and_collide(
    position: pygame.Vector2,
    size: tuple[int, int],
    velocity: pygame.Vector2,
    dt: float,
    level: Level,
    *,
    allow_one_way: bool = True,
    drop_through: bool = False,
) -> tuple[pygame.Vector2, CollisionState]:
    """Move an axis-aligned box with tile collisions.

    Args:
        position: top-left world position (float precision).
        size: collider size.
        velocity: world velocity in px/s.
        dt: delta time in seconds.
        level: loaded tile level.
        allow_one_way: include one-way platforms in vertical solve.
        drop_through: ignore one-way platforms this frame.
    """
    # Sub-step movement to avoid tunneling on large dt or high velocity.
    max_disp = max(abs(velocity.x * dt), abs(velocity.y * dt))
    step_px = max(1.0, level.tile_size * 0.45)
    steps = max(1, int(max_disp // step_px) + 1)
    step_dt = dt / steps

    pos = pygame.Vector2(position.x, position.y)
    merged = CollisionState()

    for _ in range(steps):
        pos, col = _move_single(
            pos,
            size,
            velocity,
            step_dt,
            level,
            allow_one_way=allow_one_way,
            drop_through=drop_through,
        )
        merged.left = merged.left or col.left
        merged.right = merged.right or col.right
        merged.up = merged.up or col.up
        merged.down = merged.down or col.down

    return pos, merged


def _move_single(
    position: pygame.Vector2,
    size: tuple[int, int],
    velocity: pygame.Vector2,
    dt: float,
    level: Level,
    *,
    allow_one_way: bool,
    drop_through: bool,
) -> tuple[pygame.Vector2, CollisionState]:
    w, h = size
    result = CollisionState()

    # Horizontal pass
    nx = position.x + velocity.x * dt
    rect_x = pygame.Rect(round(nx), round(position.y), w, h)
    for tile_rect, kind in level.iter_collision_tiles(rect_x, include_one_way=False):
        if kind != "solid" or not rect_x.colliderect(tile_rect):
            continue

        if velocity.x > 0:
            rect_x.right = tile_rect.left
            result.right = True
        elif velocity.x < 0:
            rect_x.left = tile_rect.right
            result.left = True

    # Vertical pass
    ny = position.y + velocity.y * dt
    rect_y = pygame.Rect(rect_x.x, round(ny), w, h)
    prev_bottom = position.y + h
    for tile_rect, kind in level.iter_collision_tiles(rect_y, include_one_way=allow_one_way):
        if not rect_y.colliderect(tile_rect):
            continue

        if kind == "solid":
            if velocity.y > 0:
                rect_y.bottom = tile_rect.top
                result.down = True
            elif velocity.y < 0:
                rect_y.top = tile_rect.bottom
                result.up = True
            continue

        # One-way collision (only when falling from above).
        if kind == "one_way" and not drop_through and velocity.y >= 0:
            within_prev = prev_bottom <= tile_rect.top + 4
            crosses_top = rect_y.bottom >= tile_rect.top
            overlap_x = rect_y.right > tile_rect.left and rect_y.left < tile_rect.right
            if within_prev and crosses_top and overlap_x:
                rect_y.bottom = tile_rect.top
                result.down = True

    return pygame.Vector2(float(rect_y.x), float(rect_y.y)), result
