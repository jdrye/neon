#!/usr/bin/env python3
import json
import os
import sys

EXPECTED_KEYS = ("id", "name", "color", "score", "time", "created")


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    scores_path = os.path.join(os.path.dirname(base_dir), "scores.json")
    try:
        with open(scores_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"missing file: {scores_path}")
        return 1
    except Exception as exc:
        print(f"invalid json: {exc}")
        return 1

    if not isinstance(data, list):
        print("scores.json must contain a list")
        return 1

    errors = []
    for idx, entry in enumerate(data):
        if not isinstance(entry, dict):
            errors.append(f"entry {idx}: not an object")
            continue
        for key in EXPECTED_KEYS:
            if key not in entry:
                errors.append(f"entry {idx}: missing {key}")
        score = entry.get("score")
        time_val = entry.get("time")
        created = entry.get("created")
        if isinstance(score, (int, float)) and score < 0:
            errors.append(f"entry {idx}: score < 0")
        if isinstance(time_val, (int, float)) and time_val < 0:
            errors.append(f"entry {idx}: time < 0")
        if created is not None and not isinstance(created, (int, float)):
            errors.append(f"entry {idx}: created not numeric")

    if errors:
        print("scores.json validation errors:")
        for err in errors:
            print(f"- {err}")
        return 1

    print(f"scores.json ok ({len(data)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
