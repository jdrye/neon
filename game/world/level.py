from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pygame

SOLID_TILES = {"#", "X"}
ONE_WAY_TILES = {"="}
DECOR_TILES = {"t", "b", "~", ":"}
COLLECTIBLE_TILES = {"o", "a"}


@dataclass(slots=True)
class EnemySpawn:
    type: str
    x: int
    y: int
    patrol_left: int
    patrol_right: int


@dataclass(slots=True)
class Checkpoint:
    id: str
    x: int
    y: int


@dataclass(slots=True)
class CollectibleSpawn:
    id: str
    kind: str
    x: int
    y: int


@dataclass(slots=True)
class ExitDoor:
    x: int
    y: int
    width: int
    height: int


@dataclass(slots=True)
class Level:
    tile_size: int
    grid: list[str]
    spawn_player: tuple[int, int]
    checkpoints: list[Checkpoint]
    enemies: list[EnemySpawn]
    exit: ExitDoor
    collectibles: list[CollectibleSpawn]

    @property
    def width_tiles(self) -> int:
        return len(self.grid[0]) if self.grid else 0

    @property
    def height_tiles(self) -> int:
        return len(self.grid)

    @property
    def world_width(self) -> int:
        return self.width_tiles * self.tile_size

    @property
    def world_height(self) -> int:
        return self.height_tiles * self.tile_size

    @classmethod
    def load(cls, path: Path) -> "Level":
        payload = json.loads(path.read_text(encoding="utf-8"))
        tile_size = int(payload["tile_size"])
        grid = [str(line) for line in payload["grid"]]
        if not grid:
            raise ValueError("grid cannot be empty")

        width = len(grid[0])
        if any(len(row) != width for row in grid):
            raise ValueError("all rows in grid must have same length")

        spawn_data = payload["spawn_player"]
        spawn = (int(spawn_data["x"]), int(spawn_data["y"]))

        checkpoints = [
            Checkpoint(
                id=str(item["id"]),
                x=int(item["x"]),
                y=int(item["y"]),
            )
            for item in payload.get("checkpoints", [])
        ]

        enemies = [
            EnemySpawn(
                type=str(item["type"]),
                x=int(item["x"]),
                y=int(item["y"]),
                patrol_left=int(item.get("patrol_left", item["x"] - 96)),
                patrol_right=int(item.get("patrol_right", item["x"] + 96)),
            )
            for item in payload.get("enemies", [])
        ]

        exit_data = payload["exit"]
        exit_door = ExitDoor(
            x=int(exit_data["x"]),
            y=int(exit_data["y"]),
            width=int(exit_data.get("width", 48)),
            height=int(exit_data.get("height", 72)),
        )

        collectibles = [
            CollectibleSpawn(
                id=str(item["id"]),
                kind=str(item.get("kind", "coin")),
                x=int(item["x"]),
                y=int(item["y"]),
            )
            for item in payload.get("collectibles", [])
        ]

        # Allow collectibles encoded directly in tilemap.
        auto_collectibles = []
        for ty, row in enumerate(grid):
            row_list = list(row)
            for tx, ch in enumerate(row):
                if ch not in COLLECTIBLE_TILES:
                    continue
                kind = "amulet" if ch == "a" else "coin"
                auto_collectibles.append(
                    CollectibleSpawn(
                        id=f"tile_{tx}_{ty}",
                        kind=kind,
                        x=tx * tile_size + tile_size // 2,
                        y=ty * tile_size + tile_size // 2,
                    )
                )
                row_list[tx] = "."
            grid[ty] = "".join(row_list)

        collectibles.extend(auto_collectibles)

        return cls(
            tile_size=tile_size,
            grid=grid,
            spawn_player=spawn,
            checkpoints=checkpoints,
            enemies=enemies,
            exit=exit_door,
            collectibles=collectibles,
        )

    def tile_at(self, tx: int, ty: int) -> str:
        if tx < 0 or ty < 0 or ty >= self.height_tiles or tx >= self.width_tiles:
            return "."
        return self.grid[ty][tx]

    def iter_collision_tiles(
        self,
        rect: pygame.Rect,
        include_one_way: bool = True,
    ) -> Iterable[tuple[pygame.Rect, str]]:
        ts = self.tile_size
        tx0 = max(0, rect.left // ts - 1)
        tx1 = min(self.width_tiles - 1, rect.right // ts + 1)
        ty0 = max(0, rect.top // ts - 1)
        ty1 = min(self.height_tiles - 1, rect.bottom // ts + 1)

        for ty in range(ty0, ty1 + 1):
            row = self.grid[ty]
            for tx in range(tx0, tx1 + 1):
                ch = row[tx]
                if ch in SOLID_TILES:
                    yield pygame.Rect(tx * ts, ty * ts, ts, ts), "solid"
                elif include_one_way and ch in ONE_WAY_TILES:
                    yield pygame.Rect(tx * ts, ty * ts, ts, ts), "one_way"

    def iter_tiles(self) -> Iterable[tuple[int, int, str]]:
        for ty, row in enumerate(self.grid):
            for tx, ch in enumerate(row):
                if ch == ".":
                    continue
                yield tx, ty, ch
