#!/usr/bin/env python3
"""Serve the unique web game on port 8000.

This server intentionally stays minimal:
- static files are served from ./web
- /health returns a small JSON payload
- default bind is 0.0.0.0:8000 for systemd usage
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"


def parse_args() -> argparse.Namespace:
    """Parse runtime options (CLI > environment > defaults)."""
    parser = argparse.ArgumentParser(description="Neon single-game web server")
    parser.add_argument(
        "--host",
        default=os.environ.get("HOST", "0.0.0.0"),
        help="Host interface to bind (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="TCP port to listen on (default: 8000)",
    )
    return parser.parse_args()


def validate_runtime_config(port: int) -> None:
    """Fail fast on invalid configuration before binding the socket."""
    if not WEB_DIR.exists() or not WEB_DIR.is_dir():
        raise FileNotFoundError(f"Static directory not found: {WEB_DIR}")
    if port < 1 or port > 65535:
        raise ValueError(f"Invalid port: {port}")


class GameRequestHandler(SimpleHTTPRequestHandler):
    """HTTP handler dedicated to the single game web app."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self) -> None:
        """Expose a lightweight health endpoint for service supervision."""
        if self.path.split("?", 1)[0] == "/health":
            self._send_health()
            return
        super().do_GET()

    def end_headers(self) -> None:
        """Add simple cache policy: HTML should refresh, assets can be cached."""
        request_path = self.path.split("?", 1)[0]
        if request_path.endswith(".html") or request_path in {"/", ""}:
            self.send_header("Cache-Control", "no-store")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        """Emit compact UTC logs suitable for `journalctl`."""
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        client_ip = self.client_address[0] if self.client_address else "unknown"
        message = fmt % args
        print(f"[{stamp}] {client_ip} {self.command} {self.path} {message}")

    def _send_health(self) -> None:
        payload = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


class GameServer(ThreadingHTTPServer):
    """Threaded HTTP server with safe socket reuse."""

    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    args = parse_args()
    validate_runtime_config(args.port)

    bind_addr = (args.host, args.port)
    with GameServer(bind_addr, GameRequestHandler) as server:
        print(f"Game server listening on http://{args.host}:{args.port}")
        server.serve_forever()


if __name__ == "__main__":
    main()
