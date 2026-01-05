import time
import unittest

import server


class ServerUtilsTests(unittest.TestCase):
    def setUp(self):
        self._orig_leaderboard = list(server.LEADERBOARD)
        self._orig_dry_run = server.DRY_RUN
        server.LEADERBOARD = []
        server.DRY_RUN = True

    def tearDown(self):
        server.LEADERBOARD = self._orig_leaderboard
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

    def test_record_session_best(self):
        player = {"name": "Ada", "color": "#fff", "best": 12, "bestTime": 4}
        server._record_session_best(player)
        self.assertTrue(player.get("scoreRecorded"))
        self.assertEqual(len(server.LEADERBOARD), 1)
        self.assertEqual(server.LEADERBOARD[0]["name"], "Ada")

    def test_prune_leaderboard(self):
        now = time.time()
        server.LEADERBOARD = [
            {"score": 10, "time": 1, "created": now - server.BOARD_TTL - 10},
            {"score": 5, "time": 1, "created": now},
        ]
        server._prune_leaderboard(now)
        self.assertEqual(len(server.LEADERBOARD), 1)


if __name__ == "__main__":
    unittest.main()
