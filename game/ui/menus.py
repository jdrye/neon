from __future__ import annotations

import pygame

from game import settings


def draw_center_modal(
    surface: pygame.Surface,
    title: str,
    lines: list[str],
    footer: str,
) -> None:
    width, height = surface.get_size()
    modal = pygame.Rect(width // 2 - 360, height // 2 - 220, 720, 440)
    pygame.draw.rect(surface, (18, 13, 30), modal, border_radius=16)
    pygame.draw.rect(surface, (132, 99, 184), modal, width=2, border_radius=16)

    title_font = pygame.font.SysFont("consolas", 42, bold=True)
    body_font = pygame.font.SysFont("consolas", 21)
    foot_font = pygame.font.SysFont("consolas", 18, bold=True)

    title_surf = title_font.render(title, True, (255, 219, 172))
    surface.blit(title_surf, title_surf.get_rect(center=(modal.centerx, modal.top + 60)))

    y = modal.top + 120
    for line in lines:
        line_surf = body_font.render(line, True, settings.PALETTE["ui_text"])
        surface.blit(line_surf, line_surf.get_rect(center=(modal.centerx, y)))
        y += 38

    footer_surf = foot_font.render(footer, True, (160, 255, 177))
    surface.blit(footer_surf, footer_surf.get_rect(center=(modal.centerx, modal.bottom - 46)))


def draw_game_over(
    surface: pygame.Surface,
    *,
    score: int,
    time_s: float,
    collectibles: int,
    total_collectibles: int,
    deaths: int,
) -> None:
    lines = [
        f"Score: {score}",
        f"Temps: {int(time_s // 60):02d}:{int(time_s % 60):02d}",
        f"Collectibles: {collectibles}/{total_collectibles}",
        f"Morts: {deaths}",
    ]
    draw_center_modal(surface, "Game Over", lines, "ENTREE: Recommencer  |  ESC: Menu")


def draw_victory(
    surface: pygame.Surface,
    *,
    score: int,
    time_s: float,
    collectibles: int,
    total_collectibles: int,
    best_time: float | None,
) -> None:
    best = "--:--" if best_time is None else f"{int(best_time // 60):02d}:{int(best_time % 60):02d}"
    lines = [
        f"Score: {score}",
        f"Temps: {int(time_s // 60):02d}:{int(time_s % 60):02d}",
        f"Collectibles: {collectibles}/{total_collectibles}",
        f"Meilleur temps: {best}",
    ]
    draw_center_modal(surface, "Victoire", lines, "ENTREE: Rejouer  |  ESC: Menu")
