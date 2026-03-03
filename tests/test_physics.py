from __future__ import annotations

import pygame

from game.world.level import Level
from game.world.physics import move_and_collide


def _make_level() -> Level:
    return Level(
        tile_size=32,
        grid=[
            "........",
            "........",
            "........",
            "########",
            "########",
        ],
        spawn_player=(32, 32),
        checkpoints=[],
        enemies=[],
        exit=type("ExitDoor", (), {"x": 0, "y": 0, "width": 32, "height": 32})(),
        collectibles=[],
    )


def test_move_and_collide_floor() -> None:
    level = _make_level()
    pos = pygame.Vector2(64.0, 32.0)
    vel = pygame.Vector2(0.0, 700.0)

    new_pos, col = move_and_collide(pos, (24, 42), vel, 0.25, level)

    assert col.down is True
    assert new_pos.y <= 96 - 42  # tile y=3 starts at 96


def test_move_and_collide_wall() -> None:
    level = Level(
        tile_size=32,
        grid=[
            "...#....",
            "...#....",
            "...#....",
            "########",
            "########",
        ],
        spawn_player=(32, 32),
        checkpoints=[],
        enemies=[],
        exit=type("ExitDoor", (), {"x": 0, "y": 0, "width": 32, "height": 32})(),
        collectibles=[],
    )

    pos = pygame.Vector2(60.0, 32.0)
    vel = pygame.Vector2(260.0, 0.0)

    new_pos, col = move_and_collide(pos, (24, 42), vel, 0.5, level)

    assert col.right is True
    assert new_pos.x + 24 <= 3 * 32
