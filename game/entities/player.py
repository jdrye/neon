from __future__ import annotations

from dataclasses import dataclass

import pygame

from game import settings
from game.world.level import Level
from game.world.physics import move_and_collide


@dataclass(slots=True)
class Player:
    position: pygame.Vector2
    velocity: pygame.Vector2
    facing: int = 1
    on_ground: bool = False
    coyote_timer: float = 0.0
    jump_buffer_timer: float = 0.0
    attack_cooldown: float = 0.0
    attack_timer: float = 0.0
    dash_cooldown: float = 0.0
    dash_timer: float = 0.0
    invuln_timer: float = 0.0
    hp: int = settings.PLAYER_MAX_HP
    lives: int = settings.PLAYER_LIVES

    width: int = 24
    height: int = 42

    @classmethod
    def spawn(cls, x: float, y: float) -> "Player":
        return cls(position=pygame.Vector2(x, y), velocity=pygame.Vector2(0.0, 0.0))

    @property
    def rect(self) -> pygame.Rect:
        return pygame.Rect(int(self.position.x), int(self.position.y), self.width, self.height)

    @property
    def attack_active(self) -> bool:
        # Keep only a short active window inside the animation timer.
        return self.attack_timer > settings.ATTACK_ACTIVE_TIME * 0.45

    @property
    def dash_active(self) -> bool:
        return self.dash_timer > 0.0

    def reset_at(self, x: float, y: float, keep_lives: bool = True) -> None:
        lives = self.lives if keep_lives else settings.PLAYER_LIVES
        self.position.xy = (x, y)
        self.velocity.xy = (0.0, 0.0)
        self.facing = 1
        self.on_ground = False
        self.coyote_timer = 0.0
        self.jump_buffer_timer = 0.0
        self.attack_cooldown = 0.0
        self.attack_timer = 0.0
        self.dash_cooldown = 0.0
        self.dash_timer = 0.0
        self.invuln_timer = 0.8
        self.hp = settings.PLAYER_MAX_HP
        self.lives = lives

    def update(self, dt: float, level: Level, input_state: object) -> None:
        self.attack_cooldown = max(0.0, self.attack_cooldown - dt)
        self.attack_timer = max(0.0, self.attack_timer - dt)
        self.dash_cooldown = max(0.0, self.dash_cooldown - dt)
        self.dash_timer = max(0.0, self.dash_timer - dt)
        self.invuln_timer = max(0.0, self.invuln_timer - dt)

        if input_state.jump_pressed:
            self.jump_buffer_timer = settings.JUMP_BUFFER_TIME
        else:
            self.jump_buffer_timer = max(0.0, self.jump_buffer_timer - dt)

        if self.on_ground:
            self.coyote_timer = settings.COYOTE_TIME
        else:
            self.coyote_timer = max(0.0, self.coyote_timer - dt)

        axis = float(input_state.move_axis)
        if axis != 0:
            self.facing = 1 if axis > 0 else -1

        accel = settings.MOVE_ACCEL if self.on_ground else settings.MOVE_ACCEL * settings.AIR_CONTROL
        target_speed = axis * settings.MAX_MOVE_SPEED
        self.velocity.x = approach(self.velocity.x, target_speed, accel * dt)

        if axis == 0:
            self.velocity.x = approach(self.velocity.x, 0.0, settings.MOVE_DECEL * dt)

        if input_state.dash_pressed and self.dash_cooldown <= 0.0:
            self.dash_timer = settings.DASH_TIME
            self.dash_cooldown = settings.DASH_COOLDOWN
            self.velocity.x = self.facing * settings.DASH_SPEED
            self.velocity.y = 0.0

        if self.jump_buffer_timer > 0.0 and self.coyote_timer > 0.0:
            self.jump_buffer_timer = 0.0
            self.coyote_timer = 0.0
            self.on_ground = False
            self.velocity.y = -settings.JUMP_SPEED

        if input_state.attack_pressed and self.attack_cooldown <= 0.0:
            self.attack_cooldown = settings.ATTACK_COOLDOWN
            self.attack_timer = settings.ATTACK_ACTIVE_TIME

        if not self.dash_active:
            self.velocity.y = min(
                self.velocity.y + settings.GRAVITY * dt,
                settings.MAX_FALL_SPEED,
            )

            if not input_state.jump_held and self.velocity.y < 0.0:
                self.velocity.y += settings.GRAVITY * 1.45 * dt

        new_pos, collisions = move_and_collide(
            self.position,
            (self.width, self.height),
            self.velocity,
            dt,
            level,
            allow_one_way=True,
        )
        self.position = new_pos

        if collisions.left or collisions.right:
            self.velocity.x = 0.0
        if collisions.down:
            self.velocity.y = 0.0
        if collisions.up:
            self.velocity.y = 0.0

        self.on_ground = collisions.down

    def attack_rect(self) -> pygame.Rect | None:
        if not self.attack_active:
            return None
        base = self.rect
        width = settings.ATTACK_RANGE
        if self.facing > 0:
            return pygame.Rect(base.right - 3, base.centery - 14, width, 28)
        return pygame.Rect(base.left - width + 3, base.centery - 14, width, 28)

    def take_damage(self, amount: int, knockback_x: float) -> bool:
        if self.invuln_timer > 0.0:
            return False
        self.hp -= amount
        self.invuln_timer = settings.DAMAGE_IFRAMES
        self.velocity.x += knockback_x
        self.velocity.y = min(self.velocity.y, -220.0)
        return True


def approach(value: float, target: float, max_delta: float) -> float:
    if value < target:
        return min(target, value + max_delta)
    return max(target, value - max_delta)
