from __future__ import annotations

from pathlib import Path

from game.world.level import Level


def test_level_load_basic_fields() -> None:
    path = Path(__file__).resolve().parents[1] / "game" / "assets" / "levels" / "level1.json"
    level = Level.load(path)

    assert level.tile_size == 32
    assert level.world_width > 0
    assert level.world_height > 0
    assert level.spawn_player[0] >= 0
    assert len(level.checkpoints) >= 1
    assert len(level.enemies) >= 2
    assert level.exit.width > 0
    assert level.exit.height > 0


def test_level_grid_rows_same_width() -> None:
    path = Path(__file__).resolve().parents[1] / "game" / "assets" / "levels" / "level1.json"
    level = Level.load(path)

    widths = {len(row) for row in level.grid}
    assert len(widths) == 1
