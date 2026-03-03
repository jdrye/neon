from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from game.settings import SAVE_FILE

DEFAULT_SAVE: dict[str, Any] = {
    "last_unlocked_level": 1,
    "best_times": {},
    "last_checkpoint": {},
    "leaderboard": [],
}


def load_progress(path: Path | None = None) -> dict[str, Any]:
    save_path = path or SAVE_FILE
    if not save_path.exists():
        return deepcopy(DEFAULT_SAVE)

    try:
        payload = json.loads(save_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return deepcopy(DEFAULT_SAVE)

    merged = deepcopy(DEFAULT_SAVE)
    if isinstance(payload, dict):
        merged.update(payload)

    if not isinstance(merged.get("best_times"), dict):
        merged["best_times"] = {}
    if not isinstance(merged.get("last_checkpoint"), dict):
        merged["last_checkpoint"] = {}
    if not isinstance(merged.get("leaderboard"), list):
        merged["leaderboard"] = []

    return merged


def save_progress(data: dict[str, Any], path: Path | None = None) -> None:
    save_path = path or SAVE_FILE
    save_path.parent.mkdir(parents=True, exist_ok=True)
    save_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def record_checkpoint(data: dict[str, Any], level_id: str, checkpoint_id: str) -> dict[str, Any]:
    updated = deepcopy(data)
    checkpoints = updated.setdefault("last_checkpoint", {})
    checkpoints[level_id] = checkpoint_id
    return updated


def record_level_completion(
    data: dict[str, Any],
    *,
    level_id: str,
    completion_time: float,
    collectibles: int,
    total_collectibles: int,
    score: int,
) -> dict[str, Any]:
    updated = deepcopy(data)

    current_best = updated.setdefault("best_times", {}).get(level_id)
    if current_best is None or completion_time < float(current_best):
        updated["best_times"][level_id] = float(completion_time)

    if level_id.startswith("level"):
        try:
            lvl_num = int(level_id.replace("level", ""))
        except ValueError:
            lvl_num = 1
        updated["last_unlocked_level"] = max(updated.get("last_unlocked_level", 1), lvl_num)

    board = updated.setdefault("leaderboard", [])
    board.append(
        {
            "level": level_id,
            "score": int(score),
            "time": float(completion_time),
            "collectibles": int(collectibles),
            "total_collectibles": int(total_collectibles),
        }
    )
    board.sort(key=lambda item: (item["score"], -item["time"]), reverse=True)
    del board[10:]

    return updated
