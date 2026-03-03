from __future__ import annotations

from pathlib import Path

from game.persistence import (
    load_progress,
    record_checkpoint,
    record_level_completion,
    save_progress,
)


def test_checkpoint_record_roundtrip(tmp_path: Path) -> None:
    save_path = tmp_path / "save.json"

    data = load_progress(save_path)
    updated = record_checkpoint(data, "level1", "cp2")
    save_progress(updated, save_path)

    loaded = load_progress(save_path)
    assert loaded["last_checkpoint"]["level1"] == "cp2"


def test_level_completion_best_time_and_board(tmp_path: Path) -> None:
    save_path = tmp_path / "save.json"
    data = load_progress(save_path)

    a = record_level_completion(
        data,
        level_id="level1",
        completion_time=95.2,
        collectibles=7,
        total_collectibles=10,
        score=1400,
    )
    b = record_level_completion(
        a,
        level_id="level1",
        completion_time=88.1,
        collectibles=8,
        total_collectibles=10,
        score=1500,
    )

    assert b["best_times"]["level1"] == 88.1
    assert b["leaderboard"][0]["score"] == 1500
