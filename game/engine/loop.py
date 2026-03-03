from __future__ import annotations

from dataclasses import dataclass
import os

import pygame

from game import settings
from game.engine.camera import Camera
from game.engine.input import InputState
from game.entities.enemies import Enemy, spawn_enemy
from game.entities.player import Player
from game.gfx import (
    Particle,
    draw_background,
    draw_checkpoint,
    draw_collectible,
    draw_enemy,
    draw_exit,
    draw_particles,
    draw_player,
)
from game.persistence import (
    load_progress,
    record_checkpoint,
    record_level_completion,
    save_progress,
)
from game.ui.hud import draw_hint, draw_hud, draw_pause_badge
from game.ui.menus import draw_center_modal, draw_game_over, draw_victory
from game.world.level import Checkpoint, CollectibleSpawn, Level
from game.world.tiles import make_tile_surface


@dataclass(slots=True)
class CheckpointState:
    data: Checkpoint
    active: bool = False

    @property
    def rect(self) -> pygame.Rect:
        return pygame.Rect(self.data.x - 14, self.data.y - 52, 28, 52)


@dataclass(slots=True)
class Collectible:
    id: str
    kind: str
    x: int
    y: int
    collected: bool = False

    @property
    def rect(self) -> pygame.Rect:
        size = 18 if self.kind == "amulet" else 14
        return pygame.Rect(self.x - size // 2, self.y - size // 2, size, size)


class GameLoop:
    def __init__(self) -> None:
        os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
        os.environ.setdefault("XDG_CONFIG_HOME", "/tmp")
        pygame.init()

        self.screen = pygame.display.set_mode((settings.SCREEN_WIDTH, settings.SCREEN_HEIGHT))
        pygame.display.set_caption(settings.TITLE)
        self.clock = pygame.time.Clock()

        self.input = InputState()
        self.running = True

        self.save_data = load_progress()
        self.level_id = "level1"
        self.level = self._load_level(self.level_id)

        self.camera = Camera(
            width=settings.SCREEN_WIDTH,
            height=settings.SCREEN_HEIGHT,
            world_width=self.level.world_width,
            world_height=self.level.world_height,
        )

        self.mode = "menu"  # menu, playing, paused, victory, game_over
        self.player = Player.spawn(*self.level.spawn_player)

        self.checkpoints: list[CheckpointState] = []
        self.collectibles: list[Collectible] = []
        self.enemies: list[Enemy] = []
        self.particles: list[Particle] = []

        self.entity_id = 1
        self.current_checkpoint = pygame.Vector2(*self.level.spawn_player)
        self.current_checkpoint_id = "start"

        self.score = 0
        self.gold = 0
        self.collected_count = 0
        self.elapsed_time = 0.0
        self.deaths = 0
        self.combo = 0
        self.combo_timer = 0.0
        self.combo_multiplier = 1.0

        self.attack_swing_id = 0
        self.attack_hits: set[int] = set()
        self.hint_text = ""

        self._build_run_state(reset_lives=True)

    def _load_level(self, level_id: str) -> Level:
        path = settings.LEVELS_DIR / f"{level_id}.json"
        return Level.load(path)

    def _build_run_state(self, reset_lives: bool) -> None:
        spawn_x, spawn_y = self.level.spawn_player
        self.player.reset_at(spawn_x, spawn_y, keep_lives=not reset_lives)
        if reset_lives:
            self.player.lives = settings.PLAYER_LIVES

        self.camera.world_width = self.level.world_width
        self.camera.world_height = self.level.world_height
        self.camera.x = max(0.0, spawn_x - settings.SCREEN_WIDTH * 0.5)
        self.camera.y = max(0.0, spawn_y - settings.SCREEN_HEIGHT * 0.5)
        self.camera.clamp_to_world()

        self.checkpoints = [CheckpointState(data=cp, active=False) for cp in self.level.checkpoints]
        self.collectibles = [
            Collectible(id=item.id, kind=item.kind, x=item.x, y=item.y)
            for item in self.level.collectibles
        ]

        self.enemies = []
        for spawn in self.level.enemies:
            enemy = spawn_enemy(
                self.entity_id,
                spawn.type,
                spawn.x,
                spawn.y,
                spawn.patrol_left,
                spawn.patrol_right,
            )
            self.entity_id += 1
            self.enemies.append(enemy)

        self.particles.clear()

        self.current_checkpoint.xy = (spawn_x, spawn_y)
        self.current_checkpoint_id = "start"

        self.score = 0
        self.gold = 0
        self.collected_count = 0
        self.elapsed_time = 0.0
        self.deaths = 0
        self.combo = 0
        self.combo_timer = 0.0
        self.combo_multiplier = 1.0

        self.attack_swing_id = 0
        self.attack_hits.clear()

    def start_new_run(self) -> None:
        self.level = self._load_level(self.level_id)
        self._build_run_state(reset_lives=True)
        self.mode = "playing"

    def run(self) -> None:
        while self.running:
            dt = min(1 / 30, self.clock.tick(settings.FPS) / 1000.0)
            self.input.begin_frame()

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                    continue
                self.input.handle_event(event)

            self._handle_global_controls()

            if self.mode == "playing":
                self._update_playing(dt)
            elif self.mode == "paused":
                pass

            self._render()

        pygame.quit()

    def _handle_global_controls(self) -> None:
        if self.input.menu_pressed:
            if self.mode == "playing":
                self.mode = "paused"
            elif self.mode == "paused":
                self.mode = "playing"
            elif self.mode in {"victory", "game_over"}:
                self.mode = "menu"

        if self.input.pause_pressed:
            if self.mode == "playing":
                self.mode = "paused"
            elif self.mode == "paused":
                self.mode = "playing"

        if self.mode == "menu" and self.input.interact_pressed:
            self.start_new_run()

        if self.mode in {"victory", "game_over"} and self.input.jump_pressed:
            self.start_new_run()

    def _update_playing(self, dt: float) -> None:
        self.elapsed_time += dt

        self.combo_timer = max(0.0, self.combo_timer - dt)
        if self.combo_timer <= 0:
            self.combo = 0
        self.combo_multiplier = 1.0 + min(2.0, self.combo * 0.12)

        prev_attack_timer = self.player.attack_timer
        self.player.update(dt, self.level, self.input)

        if prev_attack_timer <= 0 and self.player.attack_timer > 0:
            self.attack_swing_id += 1
            self.attack_hits.clear()

        self._update_enemies(dt)
        self._update_collectibles()
        self._update_checkpoints()
        self._update_particles(dt)
        self._handle_player_attack()
        self._handle_exit()

        self.camera.follow(self.player.rect, dt)

    def _update_enemies(self, dt: float) -> None:
        player_rect = self.player.rect
        for enemy in self.enemies:
            enemy.update(dt, self.level, player_rect)

        for enemy in self.enemies:
            if enemy.dead:
                continue
            if not enemy.rect.colliderect(player_rect):
                continue
            if enemy.contact_cooldown > 0.0:
                continue
            knock = 220 if enemy.rect.centerx < player_rect.centerx else -220
            got_hit = self.player.take_damage(enemy.damage, knock)
            if got_hit:
                enemy.contact_cooldown = 0.7
                self._emit_hit(self.player.rect.centerx, self.player.rect.centery, settings.PALETTE["ui_bad"], 8)

        # Remove dead enemies and grant rewards.
        survivors: list[Enemy] = []
        for enemy in self.enemies:
            if not enemy.dead:
                survivors.append(enemy)
                continue
            self.score += int(enemy.score_value * self.combo_multiplier)
            self.gold += enemy.collectible_drop
            self.combo += 1
            self.combo_timer = 2.0
            self._emit_hit(enemy.rect.centerx, enemy.rect.centery, settings.PALETTE["gold"], 10)

        self.enemies = survivors

        if self.player.hp <= 0:
            self._on_player_death()

    def _on_player_death(self) -> None:
        self.deaths += 1
        self.player.lives -= 1
        if self.player.lives <= 0:
            self.mode = "game_over"
            return

        self.player.reset_at(self.current_checkpoint.x, self.current_checkpoint.y, keep_lives=True)
        self.combo = 0
        self.combo_timer = 0
        self._emit_hit(self.player.rect.centerx, self.player.rect.centery, settings.PALETTE["ui_bad"], 20)

    def _update_collectibles(self) -> None:
        for item in self.collectibles:
            if item.collected:
                continue
            if not self.player.rect.colliderect(item.rect):
                continue
            item.collected = True
            self.collected_count += 1
            if item.kind == "amulet":
                self.score += int(300 * self.combo_multiplier)
                self.gold += 3
                self._emit_hit(item.x, item.y, settings.PALETTE["ui_good"], 10)
            else:
                self.score += int(70 * self.combo_multiplier)
                self.gold += 1
                self._emit_hit(item.x, item.y, settings.PALETTE["gold"], 6)

    def _update_checkpoints(self) -> None:
        self.hint_text = ""
        for cp_state in self.checkpoints:
            if not self.player.rect.colliderect(cp_state.rect):
                continue

            self.hint_text = "[E] Activer checkpoint"
            if self.input.interact_pressed and not cp_state.active:
                for other in self.checkpoints:
                    other.active = False
                cp_state.active = True
                self.current_checkpoint.xy = (cp_state.data.x, cp_state.data.y)
                self.current_checkpoint_id = cp_state.data.id
                self.save_data = record_checkpoint(self.save_data, self.level_id, cp_state.data.id)
                save_progress(self.save_data)
                self._emit_hit(cp_state.data.x, cp_state.data.y - 12, settings.PALETTE["ui_good"], 16)

    def _handle_player_attack(self) -> None:
        attack_rect = self.player.attack_rect()
        if attack_rect is None:
            return

        for enemy in self.enemies:
            if enemy.dead:
                continue
            if enemy.id in self.attack_hits:
                continue
            if not attack_rect.colliderect(enemy.rect):
                continue

            killed = enemy.hurt(settings.ATTACK_DAMAGE, source_id=self.attack_swing_id)
            self.attack_hits.add(enemy.id)
            knock = 180 if self.player.facing > 0 else -180
            enemy.velocity.x += knock
            self._emit_hit(enemy.rect.centerx, enemy.rect.centery, settings.PALETTE["projectile"], 8)
            if killed:
                enemy.dead = True

    def _handle_exit(self) -> None:
        exit_rect = pygame.Rect(
            self.level.exit.x,
            self.level.exit.y,
            self.level.exit.width,
            self.level.exit.height,
        )

        if not self.player.rect.colliderect(exit_rect):
            return

        self.hint_text = "[E] Entrer dans la porte"
        if not self.input.interact_pressed:
            return

        self._complete_level()

    def _complete_level(self) -> None:
        self.mode = "victory"
        self.save_data = record_level_completion(
            self.save_data,
            level_id=self.level_id,
            completion_time=self.elapsed_time,
            collectibles=self.collected_count,
            total_collectibles=len(self.collectibles),
            score=self.score,
        )
        save_progress(self.save_data)

    def _update_particles(self, dt: float) -> None:
        self.particles = [p for p in self.particles if p.update(dt)]

    def _emit_hit(self, x: int, y: int, color: tuple[int, int, int], count: int) -> None:
        for _ in range(count):
            self.particles.append(
                Particle(
                    x=float(x),
                    y=float(y),
                    vx=float((pygame.time.get_ticks() + self.entity_id * 13) % 180 - 90),
                    vy=float((pygame.time.get_ticks() + self.entity_id * 17) % 160 - 80),
                    life=0.32,
                    max_life=0.32,
                    color=color,
                    size=2,
                )
            )

    def _render(self) -> None:
        draw_background(self.screen, self.camera.x)

        world_surface = self.screen
        self._draw_level_tiles(world_surface)

        cam_vec = pygame.Vector2(self.camera.x, self.camera.y)

        for cp in self.checkpoints:
            draw_checkpoint(world_surface, self.camera.apply(cp.rect), cp.active)

        for collectible in self.collectibles:
            if collectible.collected:
                continue
            screen_pos = (
                int(collectible.x - self.camera.x),
                int(collectible.y - self.camera.y),
            )
            draw_collectible(world_surface, collectible.kind, screen_pos, self.elapsed_time)

        exit_rect = pygame.Rect(
            self.level.exit.x,
            self.level.exit.y,
            self.level.exit.width,
            self.level.exit.height,
        )
        draw_exit(world_surface, self.camera.apply(exit_rect), unlocked=True)

        for enemy in self.enemies:
            draw_enemy(world_surface, enemy.kind, self.camera.apply(enemy.rect), enemy.hit_flash)

        draw_player(
            world_surface,
            self.camera.apply(self.player.rect),
            self.player.facing,
            self.player.dash_active,
        )

        attack_rect = self.player.attack_rect()
        if attack_rect is not None:
            pygame.draw.rect(world_surface, (255, 244, 171), self.camera.apply(attack_rect), width=1)

        draw_particles(world_surface, self.particles, cam_vec)

        draw_hud(
            self.screen,
            hp=self.player.hp,
            max_hp=settings.PLAYER_MAX_HP,
            lives=max(0, self.player.lives),
            gold=self.gold,
            collectibles=self.collected_count,
            total_collectibles=len(self.collectibles),
            timer=self.elapsed_time,
            dash_cd=self.player.dash_cooldown,
            combo_multiplier=self.combo_multiplier,
            level_name="Ruines du Bastion",
        )

        if self.hint_text:
            draw_hint(self.screen, self.hint_text)

        if self.mode == "menu":
            board = self.save_data.get("leaderboard", [])
            top = board[0] if board else None
            top_line = (
                f"Record local: {top['score']} pts en {int(top['time'] // 60):02d}:{int(top['time'] % 60):02d}"
                if top
                else "Record local: --"
            )
            draw_center_modal(
                self.screen,
                "Aventurier des Ruines",
                [
                    "Plateformer medieval-fantasy procedurale",
                    "A/D ou fleches: bouger  |  Espace: sauter",
                    "J: epee  |  K/Shift: dash  |  E: interagir",
                    top_line,
                    "Atteins la porte apres le checkpoint.",
                ],
                "Appuie sur E pour commencer",
            )
        elif self.mode == "paused":
            draw_pause_badge(self.screen)
            draw_hint(self.screen, "Pause - Espace/P pour reprendre, ESC pour menu")
        elif self.mode == "victory":
            best = self.save_data.get("best_times", {}).get(self.level_id)
            draw_victory(
                self.screen,
                score=self.score,
                time_s=self.elapsed_time,
                collectibles=self.collected_count,
                total_collectibles=len(self.collectibles),
                best_time=best,
            )
        elif self.mode == "game_over":
            draw_game_over(
                self.screen,
                score=self.score,
                time_s=self.elapsed_time,
                collectibles=self.collected_count,
                total_collectibles=len(self.collectibles),
                deaths=self.deaths,
            )

        pygame.display.flip()

    def _draw_level_tiles(self, surface: pygame.Surface) -> None:
        ts = self.level.tile_size
        left = max(0, int(self.camera.x // ts) - 2)
        right = min(self.level.width_tiles - 1, int((self.camera.x + settings.SCREEN_WIDTH) // ts) + 2)
        top = max(0, int(self.camera.y // ts) - 2)
        bottom = min(self.level.height_tiles - 1, int((self.camera.y + settings.SCREEN_HEIGHT) // ts) + 2)

        for ty in range(top, bottom + 1):
            row = self.level.grid[ty]
            for tx in range(left, right + 1):
                ch = row[tx]
                if ch == ".":
                    continue
                tile = make_tile_surface(ch, ts)
                sx = tx * ts - int(self.camera.x)
                sy = ty * ts - int(self.camera.y)
                surface.blit(tile, (sx, sy))


def run_game() -> None:
    GameLoop().run()
