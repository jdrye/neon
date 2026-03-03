from __future__ import annotations

import pygame

from game import settings


def draw_hud(
    surface: pygame.Surface,
    *,
    hp: int,
    max_hp: int,
    lives: int,
    gold: int,
    collectibles: int,
    total_collectibles: int,
    timer: float,
    dash_cd: float,
    combo_multiplier: float,
    level_name: str,
) -> None:
    panel = pygame.Rect(16, 14, 420, 106)
    pygame.draw.rect(surface, settings.PALETTE["ui_bg"], panel, border_radius=12)
    pygame.draw.rect(surface, (126, 102, 164), panel, width=2, border_radius=12)

    font_small = pygame.font.SysFont("consolas", 18, bold=True)
    font_tiny = pygame.font.SysFont("consolas", 14)

    title = font_small.render(level_name, True, settings.PALETTE["ui_text"])
    surface.blit(title, (26, 20))

    for i in range(max_hp):
        x = 26 + i * 22
        y = 50
        color = (110, 72, 94)
        if i < hp:
            color = settings.PALETTE["ui_bad"]
        _draw_heart(surface, x, y, color)

    lives_text = font_tiny.render(f"Vies: {lives}", True, settings.PALETTE["ui_text"])
    surface.blit(lives_text, (26, 76))

    gold_text = font_tiny.render(f"Or: {gold}", True, settings.PALETTE["gold"])
    col_text = font_tiny.render(
        f"Reliques: {collectibles}/{total_collectibles}",
        True,
        settings.PALETTE["ui_good"],
    )
    timer_text = font_tiny.render(f"Temps: {format_time(timer)}", True, settings.PALETTE["ui_text"])
    combo_text = font_tiny.render(
        f"Combo x{combo_multiplier:.2f}",
        True,
        settings.PALETTE["ui_good"],
    )

    surface.blit(gold_text, (210, 50))
    surface.blit(col_text, (210, 70))
    surface.blit(timer_text, (210, 90))
    surface.blit(combo_text, (320, 20))

    dash_panel = pygame.Rect(16, 126, 220, 26)
    pygame.draw.rect(surface, settings.PALETTE["ui_bg"], dash_panel, border_radius=8)
    pygame.draw.rect(surface, (126, 102, 164), dash_panel, width=2, border_radius=8)

    ratio = 1.0 - min(1.0, dash_cd / settings.DASH_COOLDOWN)
    bar = pygame.Rect(dash_panel.x + 4, dash_panel.y + 4, int((dash_panel.width - 8) * ratio), 18)
    pygame.draw.rect(surface, settings.PALETTE["projectile"], bar, border_radius=6)
    txt = font_tiny.render("Dash [K/Shift]", True, settings.PALETTE["ui_text"])
    surface.blit(txt, (dash_panel.x + 8, dash_panel.y + 4))


def draw_hint(surface: pygame.Surface, text: str) -> None:
    font = pygame.font.SysFont("consolas", 18, bold=True)
    render = font.render(text, True, settings.PALETTE["ui_text"])
    box = render.get_rect(center=(surface.get_width() // 2, surface.get_height() - 30))
    panel = box.inflate(24, 12)
    pygame.draw.rect(surface, settings.PALETTE["ui_bg"], panel, border_radius=10)
    pygame.draw.rect(surface, (120, 92, 158), panel, width=2, border_radius=10)
    surface.blit(render, box)


def draw_pause_badge(surface: pygame.Surface) -> None:
    font = pygame.font.SysFont("consolas", 28, bold=True)
    txt = font.render("PAUSE", True, settings.PALETTE["ui_text"])
    box = txt.get_rect(center=(surface.get_width() // 2, 40))
    panel = box.inflate(30, 14)
    pygame.draw.rect(surface, settings.PALETTE["ui_bg"], panel, border_radius=10)
    pygame.draw.rect(surface, (172, 138, 220), panel, width=2, border_radius=10)
    surface.blit(txt, box)


def _draw_heart(surface: pygame.Surface, x: int, y: int, color: tuple[int, int, int]) -> None:
    pygame.draw.circle(surface, color, (x + 5, y + 4), 5)
    pygame.draw.circle(surface, color, (x + 11, y + 4), 5)
    pygame.draw.polygon(surface, color, [(x, y + 6), (x + 16, y + 6), (x + 8, y + 16)])


def format_time(seconds: float) -> str:
    sec = int(max(0.0, seconds))
    return f"{sec // 60:02d}:{sec % 60:02d}"
