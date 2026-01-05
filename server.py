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
RATE_LOCK = threading.Lock()
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
DRY_RUN = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes", "on")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN") or os.environ.get("RESET_TOKEN") or ""
TRUST_PROXY = os.environ.get("TRUST_PROXY", "").strip().lower() in ("1", "true", "yes", "on")
try:
    MAX_SESSIONS_PER_IP = int(os.environ.get("MAX_SESSIONS_PER_IP", "6"))
except (TypeError, ValueError):
    MAX_SESSIONS_PER_IP = 6
try:
    RATE_LIMIT_RPS = float(os.environ.get("RATE_LIMIT_RPS", "20"))
except (TypeError, ValueError):
    RATE_LIMIT_RPS = 20.0
try:
    default_burst = 0 if RATE_LIMIT_RPS <= 0 else max(int(RATE_LIMIT_RPS * 2), 1)
    RATE_LIMIT_BURST = float(os.environ.get("RATE_LIMIT_BURST", str(default_burst)))
except (TypeError, ValueError):
    RATE_LIMIT_BURST = 0 if RATE_LIMIT_RPS <= 0 else max(int(RATE_LIMIT_RPS * 2), 1)
try:
    CACHE_MAX_AGE = int(os.environ.get("CACHE_MAX_AGE", "300"))
except (TypeError, ValueError):
    CACHE_MAX_AGE = 300

PLAYERS = {}  # sessionId -> player state (éphémère)
LEADERBOARD = []  # liste d'entrées de scores (persistée)
IP_LIMITER = {}  # ip -> {tokens, last}

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


def _safe_int(value, default=0):
    try:
        return int(value)
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


def _normalize_client_id(value):
    cleaned = " ".join(str(value or "").strip().split())
    if not cleaned:
        return None
    # limite defensive
    return cleaned[:64]


def _normalize_instance_id(value):
    cleaned = " ".join(str(value or "").strip().split())
    if not cleaned:
        return None
    return cleaned[:64]


def _normalize_session_id(value):
    cleaned = " ".join(str(value or "").strip().split())
    if not cleaned:
        return None
    return cleaned[:64]


def _get_client_ip(handler):
    if TRUST_PROXY:
        forwarded = handler.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = handler.headers.get("X-Real-IP", "").strip()
        if real_ip:
            return real_ip
    if handler.client_address:
        return handler.client_address[0]
    return "unknown"


def _consume_rate_limit(ip, now):
    if RATE_LIMIT_RPS <= 0 or RATE_LIMIT_BURST <= 0:
        return True
    with RATE_LOCK:
        state = IP_LIMITER.get(ip)
        if not state:
            IP_LIMITER[ip] = {"tokens": RATE_LIMIT_BURST - 1.0, "last": now}
            return True
        tokens = float(state.get("tokens", 0.0))
        last = float(state.get("last", now))
        tokens = min(RATE_LIMIT_BURST, tokens + max(0.0, now - last) * RATE_LIMIT_RPS)
        if tokens < 1.0:
            state["tokens"] = tokens
            state["last"] = now
            return False
        state["tokens"] = tokens - 1.0
        state["last"] = now
    return True


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
    if DRY_RUN:
        return
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


def _record_session_best(player):
    if not isinstance(player, dict):
        return None
    if player.get("scoreRecorded"):
        return None
    best_score = max(_safe_float(player.get("best", player.get("score", 0)), 0.0), 0.0)
    best_time = max(
        _safe_float(player.get("bestTime", player.get("time", 0)), 0.0), 0.0
    )
    player["scoreRecorded"] = True
    if best_score <= 0:
        return None
    return _add_score_entry(
        name=player.get("name"),
        score=best_score,
        t=best_time,
        color=player.get("color"),
    )


class Handler(SimpleHTTPRequestHandler):
    timeout = IDLE_TIMEOUT

    def handle_one_request(self):
        try:
            return super().handle_one_request()
        except (socket.timeout, ConnectionResetError, BrokenPipeError):
            self.close_connection = True
            return

    def _mark_response(self, status_code, resp_len=0):
        self._last_status = status_code
        self._last_response_len = resp_len

    def _log_api(self, method, path, status, duration_ms, req_len, resp_len, ip):
        print(
            f"[api] {method} {path} {status} {duration_ms:.1f}ms "
            f"in={req_len} out={resp_len} ip={ip}"
        )

    def _cache_control_for_path(self):
        if CACHE_MAX_AGE <= 0:
            return "no-store"
        path = (self.path or "").split("?", 1)[0]
        if path in ("", "/") or path.endswith(".html") or path.endswith(".json"):
            return "no-cache"
        return f"public, max-age={CACHE_MAX_AGE}"

    def end_headers(self):
        header_buf = getattr(self, "_headers_buffer", None) or []
        if not any(b.lower().startswith(b"connection:") for b in header_buf):
            self.send_header("Connection", "close")
        if self.command in ("GET", "HEAD") and not self.path.startswith("/api"):
            if not any(b.lower().startswith(b"cache-control:") for b in header_buf):
                self.send_header("Cache-Control", self._cache_control_for_path())
        super().end_headers()
        self.close_connection = True

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")

    def _write_json(self, status_code, payload):
        resp = json.dumps(payload).encode()
        self._mark_response(status_code, len(resp))
        self.send_response(status_code)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

    def send_error(self, code, message=None, explain=None):
        self._mark_response(code, 0)
        return super().send_error(code, message, explain)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/state", "/api/score", "/api/leave", "/api/reset"):
            return super().do_POST()
        start = time.perf_counter()
        ip = _get_client_ip(self)
        req_len = 0
        self._last_status = None
        self._last_response_len = 0

        try:
            try:
                length = int(self.headers.get("Content-Length", "0") or 0)
            except ValueError:
                self.send_error(400, "bad Content-Length")
                return
            req_len = length
            if length < 0:
                self.send_error(400, "bad Content-Length")
                return
            if length > MAX_BODY_BYTES:
                if length:
                    try:
                        self.rfile.read(length)
                    except Exception:
                        pass
                self.send_error(413, "payload too large")
                return
            if not _consume_rate_limit(ip, time.time()):
                if length:
                    try:
                        self.rfile.read(length)
                    except Exception:
                        pass
                self.send_error(429, "too many requests")
                return
            raw = self.rfile.read(length) if length else b""
            try:
                data = json.loads(raw or b"{}")
            except Exception:
                self.send_error(400, "bad json")
                return

            if parsed.path == "/api/reset":
                token = (data.get("token") or data.get("adminToken") or "").strip()
                header_token = (self.headers.get("X-Admin-Token") or "").strip()
                if not ADMIN_TOKEN:
                    self.send_error(403, "reset disabled")
                    return
                if not token:
                    token = header_token
                if token != ADMIN_TOKEN:
                    self.send_error(403, "invalid token")
                    return
                with LOCK:
                    LEADERBOARD.clear()
                    save_board(force=True)
                    now = time.time()
                self._write_json(200, {"ok": True, "cleared": True, "serverTime": now})
                return

            if parsed.path == "/api/score":
                name = _normalize_name(data.get("name"))
                score = _safe_float(data.get("score", 0), 0.0)
                t = _safe_float(data.get("time", 0), 0.0)
                color = _normalize_color(data.get("color"))
                session_id = _normalize_session_id(
                    data.get("sessionId") or data.get("sid") or data.get("id")
                )
                with LOCK:
                    entry = _add_score_entry(name=name, score=score, t=t, color=color)
                    if session_id and session_id in PLAYERS and entry:
                        player = PLAYERS[session_id]
                        player["scoreRecorded"] = True
                        prev_best = max(_safe_float(player.get("best", 0), 0.0), 0.0)
                        prev_time = max(_safe_float(player.get("bestTime", 0), 0.0), 0.0)
                        if entry["score"] > prev_best or (
                            entry["score"] == prev_best and entry["time"] > prev_time
                        ):
                            player["best"] = entry["score"]
                            player["bestTime"] = entry["time"]
                            player["score"] = entry["score"]
                            player["time"] = entry["time"]
                    board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_BOARD]
                    now = time.time()
                if not entry:
                    self.send_error(400, "invalid score")
                    return
                self._write_json(200, {"ok": True, "board": board, "serverTime": now})
                return

            if parsed.path == "/api/leave":
                session_id = _normalize_session_id(
                    data.get("sessionId") or data.get("sid") or data.get("id")
                )
                client_id = _normalize_client_id(data.get("clientId"))
                instance_id = _normalize_instance_id(data.get("instanceId"))
                if not session_id and not client_id:
                    self.send_error(400, "missing sessionId/clientId")
                    return

                with LOCK:
                    removed_ids = []
                    if client_id:
                        for sid, player in list(PLAYERS.items()):
                            if _normalize_client_id(player.get("clientId")) != client_id:
                                continue
                            player_instance = _normalize_instance_id(player.get("instanceId"))
                            if instance_id:
                                if player_instance != instance_id:
                                    continue
                            else:
                                if player_instance:
                                    continue
                            _record_session_best(player)
                            removed_ids.append(sid)
                            del PLAYERS[sid]
                    if session_id and session_id in PLAYERS:
                        _record_session_best(PLAYERS[session_id])
                        removed_ids.append(session_id)
                        del PLAYERS[session_id]
                    now = time.time()

                self._write_json(
                    200,
                    {
                        "ok": True,
                        "removed": bool(removed_ids),
                        "removedIds": removed_ids,
                        "serverTime": now,
                    },
                )
                return

            session_id = _normalize_session_id(
                data.get("sessionId") or data.get("sid") or data.get("id")
            )
            if not session_id:
                self.send_error(400, "missing sessionId")
                return

            now = time.time()
            since = _safe_float(data.get("since", 0), 0.0)
            too_many = False
            peers = []
            board = []
            with LOCK:
                prev = PLAYERS.get(session_id, {})
                session_is_new = session_id not in PLAYERS
                if MAX_SESSIONS_PER_IP > 0 and session_is_new:
                    current = sum(1 for p in PLAYERS.values() if p.get("ip") == ip)
                    if current >= MAX_SESSIONS_PER_IP:
                        too_many = True
                if not too_many:
                    client_id = _normalize_client_id(
                        data.get("clientId") or prev.get("clientId")
                    )
                    instance_id = _normalize_instance_id(
                        data.get("instanceId") or prev.get("instanceId")
                    )

                    # anti-dup: si un même clientId revient avec une autre session (reload/onglet), on nettoie ses anciennes sessions
                    if client_id:
                        for sid, player in list(PLAYERS.items()):
                            if sid == session_id:
                                continue
                            if _normalize_client_id(player.get("clientId")) != client_id:
                                continue
                            player_instance = _normalize_instance_id(player.get("instanceId"))
                            if instance_id:
                                if player_instance != instance_id:
                                    continue
                            else:
                                if player_instance:
                                    continue
                            del PLAYERS[sid]

                    incoming_score = max(_safe_float(data.get("score", 0), 0.0), 0.0)
                    incoming_time = max(_safe_float(data.get("time", 0), 0.0), 0.0)

                    # compat: si le client envoie best/bestTime on les prend en compte
                    incoming_best = max(
                        _safe_float(data.get("best", incoming_score), 0.0), 0.0
                    )
                    incoming_best_time = max(
                        _safe_float(data.get("bestTime", incoming_time), 0.0), 0.0
                    )

                    prev_best = max(_safe_float(prev.get("best", 0), 0.0), 0.0)
                    prev_best_time = max(_safe_float(prev.get("bestTime", 0), 0.0), 0.0)

                    incoming_pulse_seq = max(_safe_int(data.get("pulseSeq", 0), 0), 0)
                    prev_pulse_seq = max(_safe_int(prev.get("pulseSeq", 0), 0), 0)
                    pulse_seq = max(incoming_pulse_seq, prev_pulse_seq)
                    pulse_at = _safe_float(prev.get("pulseAt", 0), 0.0)
                    if incoming_pulse_seq > prev_pulse_seq:
                        pulse_at = now

                    # meilleur (score, puis time en tie-break)
                    best_score = prev_best
                    best_time = prev_best_time
                    if (incoming_best > best_score) or (
                        incoming_best == best_score and incoming_best_time > best_time
                    ):
                        best_score, best_time = incoming_best, incoming_best_time
                    if (incoming_score > best_score) or (
                        incoming_score == best_score and incoming_time > best_time
                    ):
                        best_score, best_time = incoming_score, incoming_time

                    PLAYERS[session_id] = {
                        "id": session_id,
                        "clientId": client_id,
                        "instanceId": instance_id,
                        "x": _safe_float(data.get("x", 0), 0.0),
                        "y": _safe_float(data.get("y", 0), 0.0),
                        "color": _normalize_color(data.get("color", prev.get("color"))),
                        "name": _normalize_name(data.get("name", prev.get("name"))),
                        # "score/time" = meilleur de la session (ce que tu veux afficher dans le classement)
                        "score": best_score,
                        "time": best_time,
                        "best": best_score,
                        "bestTime": best_time,
                        # champs additionnels non cassants (utile si tu veux afficher du "live" côté client plus tard)
                        "currentScore": incoming_score,
                        "currentTime": incoming_time,
                        "pulseSeq": pulse_seq,
                        "pulseAt": pulse_at,
                        "ts": now,
                        "ip": ip,
                        "scoreRecorded": bool(prev.get("scoreRecorded", False)),
                    }
                    # prune stale players
                    for key in list(PLAYERS.keys()):
                        if now - PLAYERS[key]["ts"] > EXPIRATION:
                            _record_session_best(PLAYERS[key])
                            del PLAYERS[key]

                    if since > 0:
                        peers = [
                            v
                            for k, v in PLAYERS.items()
                            if k != session_id and v.get("ts", 0) > since
                        ]
                    else:
                        peers = [v for k, v in PLAYERS.items() if k != session_id]

                    _prune_leaderboard(now)
                    board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[
                        :MAX_BOARD
                    ]

            if too_many:
                self.send_error(429, "too many sessions")
                return

            self._write_json(
                200, {"ok": True, "players": peers, "board": board, "serverTime": now}
            )
        finally:
            if self._last_status is not None:
                duration = (time.perf_counter() - start) * 1000
                self._log_api(
                    "POST",
                    parsed.path,
                    self._last_status,
                    duration,
                    req_len,
                    self._last_response_len,
                    ip,
                )

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/state", "/api/board"):
            return super().do_GET()
        start = time.perf_counter()
        ip = _get_client_ip(self)
        self._last_status = None
        self._last_response_len = 0
        try:
            if not _consume_rate_limit(ip, time.time()):
                self.send_error(429, "too many requests")
                return
            with LOCK:
                now = time.time()
                _prune_leaderboard(now)
                board = sorted(LEADERBOARD, key=_score_sort_key, reverse=True)[:MAX_BOARD]
            self._write_json(200, {"ok": True, "board": board, "serverTime": now})
        finally:
            if self._last_status is not None:
                duration = (time.perf_counter() - start) * 1000
                self._log_api(
                    "GET",
                    parsed.path,
                    self._last_status,
                    duration,
                    0,
                    self._last_response_len,
                    ip,
                )

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
