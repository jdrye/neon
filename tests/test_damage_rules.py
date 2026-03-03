from __future__ import annotations

import pygame

from game.entities.enemies import spawn_enemy
from game.entities.player import Player


def test_player_iframe_prevents_immediate_double_hit() -> None:
    p = Player.spawn(10, 10)

    assert p.take_damage(1, 120) is True
    hp_after_first = p.hp

    assert p.take_damage(1, 120) is False
    assert p.hp == hp_after_first


def test_enemy_single_hit_per_attack_source() -> None:
    e = spawn_enemy(1, "goblin", 100, 100, 80, 140)

    dead_first = e.hurt(20, source_id=7)
    dead_second = e.hurt(20, source_id=7)

    assert dead_first is False
    assert dead_second is False
    assert e.hp == e.max_hp - 20

    e.hurt(999, source_id=8)
    assert e.dead is True
