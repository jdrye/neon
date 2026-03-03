from __future__ import annotations

from pathlib import Path

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
FPS = 60

TITLE = "Aventurier des Ruines"

GRAVITY = 2300.0
MAX_FALL_SPEED = 1200.0

MOVE_ACCEL = 4200.0
MOVE_DECEL = 5000.0
MAX_MOVE_SPEED = 290.0
AIR_CONTROL = 0.55

JUMP_SPEED = 760.0
COYOTE_TIME = 0.12
JUMP_BUFFER_TIME = 0.12

ATTACK_COOLDOWN = 0.32
ATTACK_ACTIVE_TIME = 0.11
ATTACK_RANGE = 42
ATTACK_DAMAGE = 34

DASH_SPEED = 640.0
DASH_TIME = 0.16
DASH_COOLDOWN = 1.15

PLAYER_MAX_HP = 5
PLAYER_LIVES = 3
DAMAGE_IFRAMES = 0.7

LEVELS_DIR = Path(__file__).resolve().parent / "assets" / "levels"
SAVE_FILE = Path(__file__).resolve().parent.parent / "savegame.json"

PALETTE = {
    "bg_sky": (29, 20, 44),
    "bg_far": (50, 35, 74),
    "bg_mid": (76, 53, 101),
    "stone": (103, 96, 130),
    "stone_dark": (66, 61, 89),
    "moss": (66, 138, 96),
    "torch": (255, 175, 90),
    "gold": (245, 211, 114),
    "hero": (233, 229, 244),
    "hero_cloak": (129, 112, 193),
    "enemy_goblin": (112, 201, 121),
    "enemy_skeleton": (213, 216, 226),
    "enemy_bat": (141, 111, 171),
    "projectile": (173, 223, 255),
    "ui_bg": (20, 15, 30),
    "ui_text": (244, 236, 255),
    "ui_good": (136, 246, 158),
    "ui_bad": (252, 141, 156),
}
