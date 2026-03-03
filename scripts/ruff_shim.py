#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
from pathlib import Path

def iter_py_files(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        p = Path(raw)
        if p.is_file() and p.suffix == ".py":
            files.append(p)
            continue
        if p.is_dir():
            for child in p.rglob("*.py"):
                if any(part.startswith(".") for part in child.parts):
                    continue
                files.append(child)
    seen = sorted(set(files))
    return seen


def run_check(paths: list[str]) -> int:
    errors: list[str] = []
    for file in iter_py_files(paths):
        text = file.read_text(encoding="utf-8")
        try:
            ast.parse(text, filename=str(file))
        except SyntaxError as exc:
            errors.append(f"{file}:{exc.lineno}:{exc.offset}: syntax error: {exc.msg}")
            continue

        for lineno, line in enumerate(text.splitlines(), start=1):
            if "\t" in line:
                errors.append(f"{file}:{lineno}:1: tab character not allowed")
            if line.rstrip(" ") != line:
                errors.append(f"{file}:{lineno}:1: trailing whitespace")

    if errors:
        for item in errors:
            print(item)
        return 1

    print("ruff-shim check: OK")
    return 0


def run_format(paths: list[str]) -> int:
    changed = 0
    for file in iter_py_files(paths):
        text = file.read_text(encoding="utf-8")
        lines = [line.replace("\t", "    ").rstrip(" ") for line in text.splitlines()]
        normalized = "\n".join(lines)
        if normalized and not normalized.endswith("\n"):
            normalized += "\n"

        if normalized != text:
            file.write_text(normalized, encoding="utf-8")
            changed += 1

    print(f"ruff-shim format: {changed} file(s) updated")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_check = sub.add_parser("check")
    p_check.add_argument("paths", nargs="+", default=["."])

    p_format = sub.add_parser("format")
    p_format.add_argument("paths", nargs="+", default=["."])

    args = parser.parse_args()

    if args.cmd == "check":
        return run_check(args.paths)
    return run_format(args.paths)


if __name__ == "__main__":
    raise SystemExit(main())
