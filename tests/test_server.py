import io
import json
import time
import unittest

import server


class FakeHandler:
    def __init__(self, method, path, payload=None, headers=None, ip="127.0.0.1"):
        raw = b""
        if payload is not None:
            raw = json.dumps(payload).encode("utf-8")
        self.command = method
        self.path = path
        self.rfile = io.BytesIO(raw)
        self.wfile = io.BytesIO()
        self.client_address = (ip, 12345)
        self.headers = {"Content-Length": str(len(raw))}
        if headers:
            self.headers.update(headers)
        self._last_status = None
        self._last_response_len = 0
        self.json_payload = None
        self.error_payload = None

    def _mark_response(self, status_code, resp_len=0):
        self._last_status = status_code
        self._last_response_len = resp_len

    def _log_api(self, method, path, status, duration_ms, req_len, resp_len, ip):
        return

    def send_error(self, code, message=None, explain=None):
        self._mark_response(code, 0)
        self.error_payload = {"code": code, "message": message}

    def _write_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self._mark_response(status_code, len(body))
        self.json_payload = payload


class ServerUtilsTests(unittest.TestCase):
    def setUp(self):
        self._orig_leaderboard = list(server.LEADERBOARD)
        self._orig_players = dict(server.PLAYERS)
        self._orig_ip_limiter = dict(server.IP_LIMITER)
        self._orig_dry_run = server.DRY_RUN
        server.LEADERBOARD = []
        server.PLAYERS = {}
        server.IP_LIMITER = {}
        server.DRY_RUN = True

    def tearDown(self):
        server.LEADERBOARD = self._orig_leaderboard
        server.PLAYERS = self._orig_players
        server.IP_LIMITER = self._orig_ip_limiter
        server.DRY_RUN = self._orig_dry_run

    def test_normalize_name(self):
        self.assertEqual(server._normalize_name("  "), "Pilote")
        self.assertEqual(server._normalize_name("Test  Name"), "Test Name")
        self.assertEqual(server._normalize_name("A" * 30), "A" * 18)

    def test_normalize_color(self):
        self.assertEqual(server._normalize_color("  "), "#7af6ff")
        self.assertEqual(server._normalize_color("#abcdef"), "#abcdef")

    def test_score_sort_key(self):
        entry = {"score": 10, "time": 5, "created": 2}
        self.assertEqual(server._score_sort_key(entry), (10.0, 5.0, 2.0))

    def test_upsert_score_entry_unique_per_client(self):
        server._upsert_score_entry("Ada", 100, 20, color="#fff", client_id="c1")
        server._upsert_score_entry("Ada", 80, 25, color="#000", client_id="c1")
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["score"], 100)
        server._upsert_score_entry("Ada", 130, 19, color="#123", client_id="c1")
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["score"], 130)

    def test_record_session_best(self):
        player = {
            "name": "Ada",
            "color": "#fff",
            "best": 12,
            "bestTime": 4,
            "clientId": "c1",
        }
        server._record_session_best(player)
        self.assertTrue(player.get("scoreRecorded"))
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["name"], "Ada")
        server._record_session_best(player)
        self.assertEqual(len(server.LEADERBOARD), 1)

    def test_prune_leaderboard(self):
        now = time.time()
        server.LEADERBOARD = [
            {"score": 10, "time": 1, "created": now - server.BOARD_TTL - 10},
            {"score": 5, "time": 1, "created": now},
        ]
        server._prune_leaderboard(now)
        self.assertEqual(len(server.LEADERBOARD), 1)


class ServerApiTests(unittest.TestCase):
    def setUp(self):
        self._orig = {
            "LEADERBOARD": list(server.LEADERBOARD),
            "PLAYERS": dict(server.PLAYERS),
            "IP_LIMITER": dict(server.IP_LIMITER),
            "DRY_RUN": server.DRY_RUN,
            "ADMIN_TOKEN": server.ADMIN_TOKEN,
            "MAX_SESSIONS_PER_IP": server.MAX_SESSIONS_PER_IP,
            "RATE_LIMIT_RPS": server.RATE_LIMIT_RPS,
            "RATE_LIMIT_BURST": server.RATE_LIMIT_BURST,
        }
        server.LEADERBOARD = []
        server.PLAYERS = {}
        server.IP_LIMITER = {}
        server.DRY_RUN = True
        server.ADMIN_TOKEN = ""
        server.MAX_SESSIONS_PER_IP = 6
        server.RATE_LIMIT_RPS = 50.0
        server.RATE_LIMIT_BURST = 100.0

    def tearDown(self):
        server.LEADERBOARD = self._orig["LEADERBOARD"]
        server.PLAYERS = self._orig["PLAYERS"]
        server.IP_LIMITER = self._orig["IP_LIMITER"]
        server.DRY_RUN = self._orig["DRY_RUN"]
        server.ADMIN_TOKEN = self._orig["ADMIN_TOKEN"]
        server.MAX_SESSIONS_PER_IP = self._orig["MAX_SESSIONS_PER_IP"]
        server.RATE_LIMIT_RPS = self._orig["RATE_LIMIT_RPS"]
        server.RATE_LIMIT_BURST = self._orig["RATE_LIMIT_BURST"]

    def _post(self, path, payload=None, headers=None, ip="127.0.0.1"):
        h = FakeHandler("POST", path, payload=payload, headers=headers, ip=ip)
        server.Handler.do_POST(h)
        return h._last_status, h.json_payload, h.error_payload

    def _get(self, path, headers=None, ip="127.0.0.1"):
        h = FakeHandler("GET", path, payload=None, headers=headers, ip=ip)
        server.Handler.do_GET(h)
        return h._last_status, h.json_payload, h.error_payload

    def test_state_score_leave_flow_records_server_tracked_best(self):
        status, payload, _ = self._post(
            "/api/state",
            {
                "sessionId": "s1",
                "clientId": "c1",
                "name": "Ada",
                "x": 10,
                "y": 20,
                "score": 120,
                "time": 20,
            },
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertIn("boardDaily", payload)

        status, _, _ = self._post(
            "/api/score",
            {
                "sessionId": "s1",
                "clientId": "c1",
                "name": "Ada",
                "score": 99999,
                "time": 20,
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["score"], 120)

        status, payload, _ = self._post("/api/leave", {"sessionId": "s1"})
        self.assertEqual(status, 200)
        self.assertTrue(payload["removed"])
        self.assertEqual(len(server.PLAYERS), 0)

    def test_score_endpoint_keeps_single_entry_per_client(self):
        status, _, _ = self._post(
            "/api/score",
            {"clientId": "c1", "name": "Ada", "score": 100, "time": 20},
        )
        self.assertEqual(status, 200)

        status, _, _ = self._post(
            "/api/score",
            {"clientId": "c1", "name": "Ada", "score": 90, "time": 25},
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["score"], 100)

        status, payload, _ = self._post(
            "/api/score",
            {"clientId": "c1", "name": "Ada", "score": 140, "time": 19},
        )
        self.assertEqual(status, 200)
        self.assertIn("boardDaily", payload)
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["score"], 140)

    def test_rate_limit_returns_429(self):
        server.RATE_LIMIT_RPS = 1.0
        server.RATE_LIMIT_BURST = 1.0
        server.IP_LIMITER = {}

        first_status, _, _ = self._get("/api/board")
        second_status, _, _ = self._get("/api/board")
        self.assertEqual(first_status, 200)
        self.assertEqual(second_status, 429)

    def test_reset_requires_valid_token(self):
        server.ADMIN_TOKEN = "secret-reset"
        status, _, _ = self._post(
            "/api/score",
            {"clientId": "c1", "name": "Ada", "score": 100, "time": 20},
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(server.LEADERBOARD), 1)

        status, _, err = self._post("/api/reset", {"token": "bad"})
        self.assertEqual(status, 403)
        self.assertEqual(err["message"], "invalid token")

        status, payload, _ = self._post(
            "/api/reset",
            {},
            headers={"X-Admin-Token": "secret-reset"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["cleared"])
        self.assertEqual(len(server.LEADERBOARD), 0)

    def test_max_sessions_per_ip_enforced(self):
        server.MAX_SESSIONS_PER_IP = 1
        status, _, _ = self._post(
            "/api/state", {"sessionId": "s1", "clientId": "c1"}, ip="10.0.0.1"
        )
        self.assertEqual(status, 200)

        status, _, err = self._post(
            "/api/state", {"sessionId": "s2", "clientId": "c2"}, ip="10.0.0.1"
        )
        self.assertEqual(status, 429)
        self.assertEqual(err["message"], "too many sessions")


if __name__ == "__main__":
    unittest.main()
