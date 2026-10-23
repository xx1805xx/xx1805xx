"""Native integration tests run on Linux too. macOS command responses are fixtures."""
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from native import agent


def result(output="", code=0, **extra):
    return {"command": "fixture", "exitCode": code, "output": output,
            "timedOut": False, "cancelled": False, "truncated": False, **extra}


class FakeRunner:
    def __init__(self, scan_result=None):
        self.cancel = threading.Event()
        self.scan_result = scan_result or result("Scanned files: 3\nInfected files: 0\n")
        self.commands = []

    def run(self, args, timeout=20):
        self.commands.append(args)
        if "--version" in args:
            return result("ClamAV fixture version")
        return self.scan_result


class RunnerTests(unittest.TestCase):
    def test_captures_real_exit_code_and_no_shell_evaluation(self):
        runner = agent.Runner(threading.Event())
        value = runner.run([sys.executable, "-c", "import sys; print(sys.argv[1]); sys.exit(7)", "$(do-not-run)"])
        self.assertEqual(value["exitCode"], 7)
        self.assertIn("$(do-not-run)", value["output"])

    def test_output_is_bounded(self):
        value = agent.Runner(threading.Event()).run([sys.executable, "-c", "print('a'*400000)"])
        self.assertTrue(value["truncated"])
        self.assertLessEqual(len(value["output"].encode()), agent.OUTPUT_LIMIT)

    def test_timeout_even_when_process_closes_stdout(self):
        started = time.monotonic()
        value = agent.Runner(threading.Event()).run([sys.executable, "-c", "import os,time; os.close(1); os.close(2); time.sleep(30)"], timeout=0.2)
        self.assertTrue(value["timedOut"])
        self.assertLess(time.monotonic() - started, 5)

    def test_cancel_terminates_running_command(self):
        event = threading.Event()
        timer = threading.Timer(0.2, event.set)
        timer.start()
        try:
            value = agent.Runner(event).run([sys.executable, "-c", "import time; time.sleep(30)"])
            self.assertTrue(value["cancelled"])
            self.assertNotEqual(value["exitCode"], 0)
        finally:
            timer.cancel()


class MacFixtureTests(unittest.TestCase):
    def test_settings_distinguish_enabled_disabled_unknown_failed_and_custom(self):
        cases = [(result("status: enabled"), "pass"), (result("status: disabled"), "warning"),
                 (result("Something new"), "error"), (result("status: enabled", 1), "error"),
                 (result("status: enabled (Custom Configuration)"), "warning")]
        for response, status in cases:
            runner = FakeRunner(response)
            item = agent.setting_check(runner, "sip", "SIP", ["fixture"], "status: enabled", "status: disabled", "Limit.")
            self.assertEqual(item["status"], status)

    def test_listeners_are_inventory_not_proof_of_internet_exposure(self):
        runner = FakeRunner(result("p12\ncBrowser\nn127.0.0.1:5555\np13\ncService\nn*:8080\n"))
        item = agent.listeners(runner)
        self.assertEqual(item["status"], "warning")
        self.assertEqual(len(item["evidence"]["sockets"]), 2)
        self.assertIn("Non implica esposizione", item["detail"])

    def test_missing_engine_is_blocked_and_never_clean(self):
        with patch("native.agent.shutil.which", return_value=None):
            item = agent.clam_check(FakeRunner(), Path("/tmp"), True)
        self.assertEqual(item["status"], "blocked")
        self.assertIn("nessuna scansione", item["detail"])

    def test_missing_signatures_is_blocked(self):
        with tempfile.TemporaryDirectory() as temp, patch("native.agent.Path.home", return_value=Path(temp)), patch("native.agent.shutil.which", return_value="/fixture/clamscan"):
            item = agent.clam_check(FakeRunner(), Path(temp), False)
        self.assertEqual(item["status"], "blocked")

    def test_failed_signature_verification_blocks_scan_even_with_existing_database(self):
        with tempfile.TemporaryDirectory() as temp, patch("native.agent.Path.home", return_value=Path(temp)), patch("native.agent.shutil.which", return_value="/fixture/tool"):
            db = Path(temp)/"Library/Application Support/Aegis/clamav"
            db.mkdir(parents=True)
            (db/"daily.cvd").write_bytes(b"fixture")
            runner = FakeRunner(result("Signature verification failed", 54))
            item = agent.clam_check(runner, Path(temp), True)
            self.assertEqual(item["status"], "blocked")
            self.assertFalse(any("--recursive" in command for command in runner.commands))

    def test_engine_exit_codes_coverage_limits_and_test_signatures(self):
        cases = [
            (result("Scanned files: 3\nInfected files: 0\n"), "pass"),
            (result("~/test.txt: Eicar-Test-Signature FOUND\nScanned files: 3\nInfected files: 1\n", 1), "warning"),
            (result("Database error", 2), "error"),
            (result("Scanned files: 0\nInfected files: 0\n"), "error"),
            (result("WARNING: Permission denied\nScanned files: 3\n"), "error"),
            (result("~/big.zip: Heuristics.Limits.Exceeded.MaxFileSize FOUND\nScanned files: 3\n", 1), "error"),
            (result("Scanned files: 3\n", truncated=True), "error"),
        ]
        with tempfile.TemporaryDirectory() as temp, patch("native.agent.Path.home", return_value=Path(temp)), patch("native.agent.shutil.which", return_value="/fixture/clamscan"):
            db = Path(temp)/"Library/Application Support/Aegis/clamav"
            db.mkdir(parents=True)
            (db/"daily.cvd").write_bytes(b"fixture, NOT a real signature database")
            for response, status in cases:
                runner = FakeRunner(response)
                item = agent.clam_check(runner, Path(temp), False)
                self.assertEqual(item["status"], status)
                command = runner.commands[-1]
                self.assertNotIn("--remove", command)
                self.assertIn("--follow-dir-symlinks=0", command)
                self.assertEqual(command[-2], "--")
                if "Eicar" in response["output"]:
                    self.assertEqual(item["evidence"]["findings"][0]["kind"], "test")

    def test_no_mac_hardware_is_fabricated_on_linux(self):
        with patch("native.agent.platform.system", return_value="Linux"):
            service = agent.Service()
            with self.assertRaisesRegex(ValueError, "solo macOS"):
                service.start({})
            self.assertIsNone(service.state()["job"]["report"])

    def test_arbitrary_paths_or_commands_are_rejected(self):
        with patch("native.agent.platform.system", return_value="Darwin"):
            for payload in [{"command": "anything"}, {"scope": "/"}, {"scope": "$(whoami)"}, {"scanMalware": "yes"}]:
                with self.assertRaises(ValueError):
                    agent.Service().start(payload)

    def test_one_active_job_and_cancellation_report(self):
        started = threading.Event()
        release = threading.Event()
        def fake_hardware(_runner):
            started.set()
            release.wait(3)
            return agent.check("hardware", "Fixture", "info", "Fixture, not real hardware")
        with tempfile.TemporaryDirectory() as temp, patch("native.agent.Path.home", return_value=Path(temp)), patch("native.agent.platform.system", return_value="Darwin"), patch("native.agent.hardware", side_effect=fake_hardware):
            (Path(temp)/"Downloads").mkdir()
            service = agent.Service()
            service.start({"scanMalware": False})
            self.assertTrue(started.wait(2))
            with self.assertRaises(RuntimeError):
                service.start({})
            service.cancel.set()
            release.set()
            service.thread.join(3)
            state = service.state()
            self.assertEqual(state["job"]["state"], "cancelled")
            self.assertFalse(state["job"]["report"]["complete"])
            self.assertTrue(any(c["status"] == "skipped" for c in state["job"]["report"]["checks"]))


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = agent.Service()
        cls.server = agent.Server(("127.0.0.1", 0), cls.service)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, path, method="GET", body=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        conn.close()
        return result

    def auth(self, **extra):
        return {"X-Aegis-Token": self.service.token, "Content-Type": "application/json", **extra}

    def test_bootstrap_requires_custom_header_and_rejects_other_origins(self):
        self.assertEqual(self.request("/api/session")[0], 403)
        self.assertEqual(self.request("/api/session", headers={"X-Aegis-Client": "local-ui", "Origin": "https://evil.example"})[0], 403)
        status, headers, body = self.request("/api/session", headers={"X-Aegis-Client": "local-ui"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["token"], self.service.token)
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_token_required_for_state_and_mutations(self):
        self.assertEqual(self.request("/api/state")[0], 401)
        self.assertEqual(self.request("/api/cancel", "POST", "{}", {"Content-Type": "application/json"})[0], 401)
        self.assertEqual(self.request("/api/state", headers=self.auth())[0], 200)

    def test_wrong_host_origin_and_cross_site_metadata_are_rejected(self):
        self.assertEqual(self.request("/api/state", headers=self.auth(Host="attacker.example"))[0], 403)
        self.assertEqual(self.request("/api/state", headers=self.auth(Origin="https://xx1805xx.github.io"))[0], 403)
        self.assertEqual(self.request("/api/state", headers=self.auth(**{"Sec-Fetch-Site": "cross-site"}))[0], 403)
        self.assertEqual(self.request("/api/state", "OPTIONS")[0], 403)

    def test_only_ui_assets_are_served_and_framing_is_denied(self):
        for path in ["/.git/config", "/native/agent.py", "/README.md", "/assets/../native/agent.py", "/assets/%2e%2e/native/agent.py"]:
            self.assertEqual(self.request(path)[0], 404)
        status, headers, body = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn(b'id="device-title"', body)
        self.assertEqual(headers["X-Frame-Options"], "DENY")

    def test_malformed_or_unbounded_requests_are_rejected(self):
        self.assertEqual(self.request("/api/cancel", "POST", "not json", self.auth())[0], 400)
        self.assertEqual(self.request("/api/cancel", "POST", "[]", self.auth())[0], 400)
        self.assertEqual(self.request("/api/cancel", "POST", "a"*4100, self.auth())[0], 400)
        self.assertEqual(self.request("/api/cancel", "POST", "{}", {"X-Aegis-Token": self.service.token})[0], 415)


if __name__ == "__main__":
    unittest.main()
