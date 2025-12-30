#!/usr/bin/env python3
import json
import os
import socket
import time
import threading
import functools
import secrets
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

LOCK = threading.Lock()
EXPIRATION = 300  # seconds, conserve les joueurs un moment (présence en ligne)
PORT = int(os.environ.get("PORT", "8000"))
try:
    IDLE_TIMEOUT = float(os.environ.get("IDLE_TIMEOUT", "15"))
except (TypeError, ValueError):
    IDLE_TIMEOUT = 15.0
if IDLE_TIMEOUT <= 0:
    IDLE_TIMEOUT = 15.0
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE = os.path.join(BASE_DIR, "scores.json")

PLAYERS = {}  # sessionId -> player state (éphémère)
LEADERBOARD = []  # liste d'entrées de scores (persistée)

BOARD_TTL = 30 * 24 * 3600  # seconds, conserve les scores un moment
MAX_BOARD = 10
MAX_STORE = 100
MAX_BODY_BYTES = 16 * 1024
SAVE_INTERVAL = 2.0  # seconds
LAST_SAVE = 0.0


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalize_name(name):
    cleaned = " ".join(str(name or "").strip().split())
    if not cleaned:
        return "Pilote"
    return cleaned[:18]


def _normalize_color(color):
    cleaned = str(color or "").strip()
    if not cleaned:
        return "#7af6ff"
    return cleaned[:64]


def _score_sort_key(entry):
    return (
        _safe_float(entry.get("score", 0)),
        _safe_float(entry.get("time", 0)),
        _safe_float(entry.get("created", 0)),
    )


def _prune_leaderboard(now):
    if BOARD_TTL <= 0:
        return
    cutoff = now - BOARD_TTL
    global LEADERBOARD
    LEADERBOARD = [
        e for e in LEADERBOARD if _safe_float(e.get("created", now), now) >= cutoff
    ]


def load_board():
    """
    Charge le leaderboard depuis `scores.json`.

    Compatibilité:
    - Ancien format (liste d'objets avec `best`/`bestTime`) -> converti en entrées `score`/`time`.
    - Nouveau format (liste d'objets avec `score`/`time`).
    """
    global LEADERBOARD
    try:
        with open(SCORES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return
    except Exception:
        return

    if not isinstance(data, list):
        return

    loaded = []
    now = time.time()
    for raw in data:
        if not isinstance(raw, dict):
            continue
        score = raw.get("score", None)
        if score is None:
            score = raw.get("best", 0)
        t = raw.get("time", None)
        if t is None:
            t = raw.get("bestTime", 0)
        created = _safe_float(raw.get("created", raw.get("updated", now)), now)
        entry_id = str(raw.get("id") or "").strip()
        if not entry_id:
            entry_id = f"s-{int(created * 1000)}-{secrets.token_urlsafe(6)}"
        loaded.append(
            {
                "id": entry_id,
                "name": _normalize_name(raw.get("name")),
                "color": _normalize_color(raw.get("color")),
                "score": max(_safe_float(score, 0.0), 0.0),
                "time": max(_safe_float(t, 0.0), 0.0),
                "created": created,
            }
        )

    loaded.sort(key=_score_sort_key, reverse=True)
    LEADERBOARD = loaded[:MAX_STORE]


def save_board(force=False):
    global LAST_SAVE
    now = time.time()
    if not force and now - LAST_SAVE < SAVE_INTERVAL:
        return
    LAST_SAVE = now
    try:
        tmp = SCORES_FILE + ".tmp"
        board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_STORE]
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(board, f)
        os.replace(tmp, SCORES_FILE)
    except Exception:
        return


def _add_score_entry(name, score, t, color=None):
    now = time.time()
    entry = {
        "id": f"s-{int(now * 1000)}-{secrets.token_urlsafe(6)}",
        "name": _normalize_name(name),
        "color": _normalize_color(color),
        "score": max(_safe_float(score, 0.0), 0.0),
        "time": max(_safe_float(t, 0.0), 0.0),
        "created": now,
    }
    if entry["score"] <= 0:
        return None
    LEADERBOARD.append(entry)
    _prune_leaderboard(now)
    LEADERBOARD.sort(key=_score_sort_key, reverse=True)
    del LEADERBOARD[MAX_STORE:]
    # sur une soumission explicite de score, on force la persistance (le rythme est faible)
    save_board(force=True)
    return entry


class Handler(SimpleHTTPRequestHandler):
    timeout = IDLE_TIMEOUT

    def handle_one_request(self):
        try:
            return super().handle_one_request()
        except (socket.timeout, ConnectionResetError, BrokenPipeError):
            self.close_connection = True
            return

    def end_headers(self):
        header_buf = getattr(self, "_headers_buffer", None) or []
        if not any(b.lower().startswith(b"connection:") for b in header_buf):
            self.send_header("Connection", "close")
        super().end_headers()
        self.close_connection = True

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _write_json(self, status_code, payload):
        resp = json.dumps(payload).encode()
        self.send_response(status_code)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/state", "/api/score", "/api/leave"):
            return super().do_POST()

        try:
            length = int(self.headers.get("Content-Length", "0") or 0)
        except ValueError:
            self.send_error(400, "bad Content-Length")
            return
        if length < 0:
            self.send_error(400, "bad Content-Length")
            return
        if length > MAX_BODY_BYTES:
            self.send_error(413, "payload too large")
            return
        raw = self.rfile.read(length) if length else b""
        try:
            data = json.loads(raw or b"{}")
        except Exception:
            self.send_error(400, "bad json")
            return

        if parsed.path == "/api/score":
            name = _normalize_name(data.get("name"))
            score = _safe_float(data.get("score", 0), 0.0)
            t = _safe_float(data.get("time", 0), 0.0)
            color = _normalize_color(data.get("color"))
            with LOCK:
                entry = _add_score_entry(name=name, score=score, t=t, color=color)
                board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_BOARD]
                now = time.time()
            if not entry:
                self.send_error(400, "invalid score")
                return
            self._write_json(200, {"ok": True, "board": board, "serverTime": now})
            return

        if parsed.path == "/api/leave":
            session_id = str(
                data.get("sessionId")
                or data.get("sid")
                or data.get("id")
                or ""
            ).strip()
            if not session_id:
                self.send_error(400, "missing sessionId")
                return

            with LOCK:
                removed = PLAYERS.pop(session_id, None) is not None
                now = time.time()

            self._write_json(200, {"ok": True, "removed": removed, "serverTime": now})
            return

        session_id = str(
            data.get("sessionId")
            or data.get("sid")
            or data.get("id")
            or ""
        ).strip()
        if not session_id:
            self.send_error(400, "missing sessionId")
            return

        now = time.time()
        since = _safe_float(data.get("since", 0), 0.0)
        with LOCK:
            prev = PLAYERS.get(session_id, {})
            incoming_score = _safe_float(data.get("score", 0), 0.0)
            incoming_time = _safe_float(data.get("time", 0), 0.0)
            incoming_best = _safe_float(data.get("best", incoming_score), 0.0)
            incoming_best_time = _safe_float(data.get("bestTime", incoming_time), 0.0)

            best_score = max(incoming_best, _safe_float(prev.get("best", 0), 0.0))
            best_time = max(incoming_best_time, _safe_float(prev.get("bestTime", 0), 0.0))

            PLAYERS[session_id] = {
                "id": session_id,
                "clientId": str(data.get("clientId") or prev.get("clientId") or "").strip() or None,
                "x": _safe_float(data.get("x", 0), 0.0),
                "y": _safe_float(data.get("y", 0), 0.0),
                "color": _normalize_color(data.get("color", prev.get("color"))),
                "name": _normalize_name(data.get("name", prev.get("name"))),
                "score": incoming_score if incoming_score > 0 else best_score,
                "time": incoming_time if incoming_time > 0 else best_time,
                "best": best_score,
                "bestTime": best_time,
                "ts": now,
            }
            # prune stale players
            for key in list(PLAYERS.keys()):
                if now - PLAYERS[key]["ts"] > EXPIRATION:
                    del PLAYERS[key]

            if since > 0:
                peers = [
                    v for k, v in PLAYERS.items() if k != session_id and v.get("ts", 0) > since
                ]
            else:
                peers = [v for k, v in PLAYERS.items() if k != session_id]

            _prune_leaderboard(now)
            board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_BOARD]

        self._write_json(200, {"ok": True, "players": peers, "board": board, "serverTime": now})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/state", "/api/board"):
            return super().do_GET()
        with LOCK:
            now = time.time()
            _prune_leaderboard(now)
            board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_BOARD]
        self._write_json(200, {"ok": True, "board": board, "serverTime": now})

    def log_message(self, format, *args):
        return


class Server(ThreadingHTTPServer):
    block_on_close = False
    allow_reuse_address = True


def main():
    load_board()
    handler = functools.partial(Handler, directory=BASE_DIR)
    srv = Server(("0.0.0.0", PORT), handler)
    print(f"Space Cleaner server listening on http://0.0.0.0:{PORT}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
