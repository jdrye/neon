from __future__ import annotations

from dataclasses import dataclass, field

import pygame

from game.world.level import Level
from game.world.physics import move_and_collide


@dataclass(slots=True)
class Enemy:
    id: int
    kind: str
    position: pygame.Vector2
    velocity: pygame.Vector2
    patrol_left: float
    patrol_right: float
    hp: int
    max_hp: int
    speed: float
    damage: int
    score_value: int
    collectible_drop: int
    size: tuple[int, int]
    is_flying: bool = False
    facing: int = -1
    on_ground: bool = False
    aggro_range: float = 240.0
    contact_cooldown: float = 0.0
    hit_flash: float = 0.0
    dead: bool = False
    damaged_sources: set[int] = field(default_factory=set)

    @property
    def rect(self) -> pygame.Rect:
        return pygame.Rect(int(self.position.x), int(self.position.y), self.size[0], self.size[1])

    def update(self, dt: float, level: Level, player_rect: pygame.Rect) -> None:
        if self.dead:
            return

        self.contact_cooldown = max(0.0, self.contact_cooldown - dt)
        self.hit_flash = max(0.0, self.hit_flash - dt)

        player_dx = player_rect.centerx - self.rect.centerx
        distance_abs = abs(player_dx)

        direction = self.facing
        if distance_abs <= self.aggro_range:
            direction = 1 if player_dx > 0 else -1

        if self.kind in {"goblin", "skeleton"}:
            if distance_abs > self.aggro_range:
                if self.rect.centerx <= self.patrol_left:
                    direction = 1
                elif self.rect.centerx >= self.patrol_right:
                    direction = -1

            self.facing = direction
            self.velocity.x = direction * self.speed
            self.velocity.y = min(self.velocity.y + 2200 * dt, 1200)

            new_pos, collisions = move_and_collide(
                self.position,
                self.size,
                self.velocity,
                dt,
                level,
                allow_one_way=True,
            )
            self.position = new_pos
            self.on_ground = collisions.down

            if collisions.left or collisions.right:
                self.facing *= -1
                self.velocity.x = 0
            if collisions.down:
                self.velocity.y = 0
            if collisions.up:
                self.velocity.y = 0
            return

        # Bat-like flying enemy
        if self.kind == "bat":
            self.facing = direction
            target_y = player_rect.centery - 60
            dy = target_y - self.rect.centery
            self.velocity.x = self.facing * self.speed
            self.velocity.y = max(-180.0, min(180.0, dy * 1.2))
            self.position.x += self.velocity.x * dt
            self.position.y += self.velocity.y * dt

            # Clamp bat inside level bounds and patrol lane.
            self.position.x = max(self.patrol_left, min(self.position.x, self.patrol_right))
            self.position.y = max(40, min(self.position.y, level.world_height - 120))

            if self.position.x <= self.patrol_left + 2:
                self.facing = 1
            elif self.position.x >= self.patrol_right - 2:
                self.facing = -1

    def hurt(self, damage: int, source_id: int | None = None) -> bool:
        if self.dead:
            return False
        if source_id is not None and source_id in self.damaged_sources:
            return False
        if source_id is not None:
            self.damaged_sources.add(source_id)

        self.hp -= damage
        self.hit_flash = 0.15
        if self.hp <= 0:
            self.dead = True
            return True
        return False


def spawn_enemy(enemy_id: int, kind: str, x: float, y: float, patrol_left: float, patrol_right: float) -> Enemy:
    if kind == "skeleton":
        return Enemy(
            id=enemy_id,
            kind=kind,
            position=pygame.Vector2(x, y),
            velocity=pygame.Vector2(),
            patrol_left=patrol_left,
            patrol_right=patrol_right,
            hp=90,
            max_hp=90,
            speed=78,
            damage=2,
            score_value=120,
            collectible_drop=2,
            size=(24, 42),
            aggro_range=270,
        )

    if kind == "bat":
        return Enemy(
            id=enemy_id,
            kind=kind,
            position=pygame.Vector2(x, y),
            velocity=pygame.Vector2(),
            patrol_left=patrol_left,
            patrol_right=patrol_right,
            hp=58,
            max_hp=58,
            speed=132,
            damage=1,
            score_value=95,
            collectible_drop=1,
            size=(28, 18),
            is_flying=True,
            aggro_range=340,
        )

    # goblin default
    return Enemy(
        id=enemy_id,
        kind="goblin",
        position=pygame.Vector2(x, y),
        velocity=pygame.Vector2(),
        patrol_left=patrol_left,
        patrol_right=patrol_right,
        hp=62,
        max_hp=62,
        speed=98,
        damage=1,
        score_value=80,
        collectible_drop=1,
        size=(24, 36),
        aggro_range=220,
    )
