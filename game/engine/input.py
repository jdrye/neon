from __future__ import annotations

from dataclasses import dataclass

import pygame


@dataclass
class InputState:
    left: bool = False
    right: bool = False
    jump_held: bool = False
    jump_pressed: bool = False
    attack_pressed: bool = False
    dash_pressed: bool = False
    interact_pressed: bool = False
    pause_pressed: bool = False
    menu_pressed: bool = False

    def begin_frame(self) -> None:
        self.jump_pressed = False
        self.attack_pressed = False
        self.dash_pressed = False
        self.interact_pressed = False
        self.pause_pressed = False
        self.menu_pressed = False

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_a, pygame.K_LEFT):
                self.left = True
            elif event.key in (pygame.K_d, pygame.K_RIGHT):
                self.right = True
            elif event.key == pygame.K_SPACE:
                self.jump_held = True
                self.jump_pressed = True
            elif event.key in (pygame.K_j,):
                self.attack_pressed = True
            elif event.key in (pygame.K_k, pygame.K_LSHIFT, pygame.K_RSHIFT):
                self.dash_pressed = True
            elif event.key == pygame.K_e:
                self.interact_pressed = True
            elif event.key == pygame.K_p:
                self.pause_pressed = True
            elif event.key == pygame.K_ESCAPE:
                self.menu_pressed = True
        elif event.type == pygame.KEYUP:
            if event.key in (pygame.K_a, pygame.K_LEFT):
                self.left = False
            elif event.key in (pygame.K_d, pygame.K_RIGHT):
                self.right = False
            elif event.key == pygame.K_SPACE:
                self.jump_held = False
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1:
                self.attack_pressed = True

    @property
    def move_axis(self) -> float:
        return float(self.right) - float(self.left)
