from __future__ import annotations

from functools import lru_cache

import pygame

from game.settings import PALETTE


@lru_cache(maxsize=128)
def make_tile_surface(tile_char: str, tile_size: int) -> pygame.Surface:
    surf = pygame.Surface((tile_size, tile_size), pygame.SRCALPHA)

    if tile_char in {"#", "X"}:
        base = PALETTE["stone"]
        dark = PALETTE["stone_dark"]
        moss = PALETTE["moss"]
        surf.fill(base)
        pygame.draw.rect(surf, dark, (0, tile_size - 8, tile_size, 8))
        pygame.draw.rect(surf, dark, (0, 0, tile_size, 2))
        for x in range(2, tile_size, 8):
            pygame.draw.rect(surf, dark, (x, 4, 2, tile_size - 10))
        pygame.draw.rect(surf, moss, (2, 2, tile_size // 2, 3))
        return surf

    if tile_char == "=":
        surf.fill((0, 0, 0, 0))
        pygame.draw.rect(surf, (145, 126, 170), (0, tile_size // 2, tile_size, tile_size // 2))
        pygame.draw.rect(surf, (214, 189, 239), (0, tile_size // 2, tile_size, 2))
        return surf

    if tile_char == "t":
        surf.fill((0, 0, 0, 0))
        pygame.draw.rect(surf, (104, 84, 70), (tile_size // 2 - 2, 6, 4, tile_size - 8))
        pygame.draw.rect(surf, PALETTE["torch"], (tile_size // 2 - 4, 1, 8, 8))
        return surf

    if tile_char == "b":
        surf.fill((0, 0, 0, 0))
        pygame.draw.rect(surf, (95, 72, 132), (tile_size // 2 - 2, 2, 4, tile_size - 4))
        pygame.draw.rect(surf, (152, 109, 214), (tile_size // 2 + 2, 4, tile_size // 2 - 4, 14))
        return surf

    if tile_char == "~":
        surf.fill((0, 0, 0, 0))
        for y in range(0, tile_size, 4):
            color = (76, 53 + y, 101 + y // 2)
            pygame.draw.line(surf, color, (0, y), (tile_size, y), 2)
        return surf

    return surf
