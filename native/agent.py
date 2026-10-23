#!/usr/bin/env python3
"""Read-only macOS checks, served only to the same-origin local UI."""
from __future__ import annotations

import argparse
import copy
import hmac
import json
import mimetypes
import os
from pathlib import Path
import platform
import plistlib
import re
import secrets
import selectors
import shutil
import signal
import subprocess
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import webbrowser

VERSION = "0.2.0-test"
ROOT = Path(__file__).resolve().parent.parent
OUTPUT_LIMIT = 256 * 1024
LIMITS = [
    "Report di test, non una certificazione di sicurezza o un'analisi forense.",
    "Nessun accesso raw ai settori, alla memoria o ai dati delle altre app protetti da macOS.",
    "Nessuna ricerca esaustiva di CVE, prova di injection o verifica di furti e corruzione dei dati.",
    "File e processi non accessibili all'utente possono restare esclusi. Nessun sudo o modifica delle protezioni.",
    "Nessun file viene cancellato o messo in quarantena. Le segnalazioni richiedono verifica.",
]


def now():
    return datetime.now(timezone.utc).isoformat()


def private_text(text):
    return str(text).replace(str(Path.home()), "~")


class Runner:
    """Bounded capture, no shell, cancellable process group, preserved exit status."""
    def __init__(self, cancel):
        self.cancel = cancel

    def run(self, args, timeout=20):
        started = time.monotonic()
        result = {"command": private_text(" ".join(map(str, args))), "exitCode": None,
                  "output": "", "timedOut": False, "cancelled": False, "truncated": False}
        if self.cancel.is_set():
            result["cancelled"] = True
            return result
        try:
            process = subprocess.Popen(list(map(str, args)), stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
        except OSError as error:
            result["output"] = private_text(error)
            return result
        capture = bytearray()
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        try:
            while selector.get_map() or process.poll() is None:
                if self.cancel.is_set() or time.monotonic() - started > timeout:
                    result["cancelled"] = self.cancel.is_set()
                    result["timedOut"] = not result["cancelled"]
                    try:
                        os.killpg(process.pid, signal.SIGTERM)
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
                    except ProcessLookupError:
                        pass
                    # Descendants can keep the stdout pipe open after their parent exits.
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                for key, _ in selector.select(timeout=0.1):
                    chunk = os.read(key.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    capture.extend(chunk)
                    if len(capture) > OUTPUT_LIMIT:
                        del capture[:-OUTPUT_LIMIT]
                        result["truncated"] = True
            result["exitCode"] = process.wait()
        finally:
            selector.close()
            process.stdout.close()
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
        result["output"] = private_text(capture.decode("utf-8", errors="replace"))
        result["durationSeconds"] = round(time.monotonic() - started, 2)
        return result


def check(check_id, title, status, detail, evidence=None):
    return {"id": check_id, "title": title, "status": status, "detail": detail,
            "evidence": evidence or {}, "checkedAt": now()}


def setting_check(runner, check_id, title, args, enabled, disabled, limitation):
    result = runner.run(args)
    if result["cancelled"]:
        return check(check_id, title, "skipped", "Controllo interrotto.", result)
    if result["exitCode"] != 0 or result["timedOut"] or result["truncated"]:
        return check(check_id, title, "error", "Non è stato possibile verificare questa impostazione. " + limitation, result)
    output = result["output"].lower()
    if "custom configuration" in output:
        return check(check_id, title, "warning", "Configurazione personalizzata: verificare manualmente le protezioni effettive. " + limitation, result)
    if enabled in output:
        return check(check_id, title, "pass", "L'impostazione risulta attiva. " + limitation, result)
    if disabled in output:
        return check(check_id, title, "warning", "L'impostazione risulta disattivata. " + limitation, result)
    return check(check_id, title, "error", "Risposta non riconosciuta: nessun esito dedotto. " + limitation, result)


def hardware(runner):
    values = {}
    for key, command in [
        ("modelIdentifier", ["/usr/sbin/sysctl", "-n", "hw.model"]),
        ("chip", ["/usr/sbin/sysctl", "-n", "machdep.cpu.brand_string"]),
        ("macOS", ["/usr/bin/sw_vers", "-productVersion"]),
        ("build", ["/usr/bin/sw_vers", "-buildVersion"]),
    ]:
        result = runner.run(command)
        values[key] = result["output"].strip() if result["exitCode"] == 0 else "Non rilevato"
    values["architecture"] = platform.machine()
    # Never collect serial numbers, hardware UUID, Apple ID, hostnames or usernames.
    return check("hardware", "Identificazione del Mac", "error" if "Non rilevato" in values.values() else "info",
                 "Identificativo hardware, chip e versione macOS letti dal sistema. Nessun numero di serie raccolto.", values)


def listeners(runner):
    result = runner.run(["/usr/sbin/lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"])
    if result["cancelled"]:
        return check("listeners", "Porte TCP in ascolto", "skipped", "Controllo interrotto.", result)
    if result["exitCode"] not in (0, 1) or result["timedOut"] or result["truncated"] or (result["exitCode"] == 1 and result["output"].strip()):
        return check("listeners", "Porte TCP in ascolto", "error", "Impossibile ottenere un elenco attendibile.", result)
    sockets, pid, command = [], None, None
    for line in result["output"].splitlines():
        if line.startswith("p"):
            pid = line[1:]
        elif line.startswith("c"):
            command = line[1:]
        elif line.startswith("n"):
            address = line[1:]
            loopback = address.startswith(("127.", "[::1]:", "::1:"))
            sockets.append({"pid": pid, "process": command, "address": address, "loopback": loopback})
    nonlocal_count = sum(not item["loopback"] for item in sockets)
    return check("listeners", "Porte TCP in ascolto", "warning" if nonlocal_count else "info",
        f"{len(sockets)} socket visibili; {nonlocal_count} non limitati esplicitamente al loopback. "
        "Non implica esposizione a Internet o vulnerabilità: firewall e rete possono bloccarli. "
        "Senza privilegi alcuni processi possono non essere visibili; UDP non incluso.",
        {"sockets": sockets[:200], "totalVisible": len(sockets), "listTruncated": len(sockets) > 200, "command": result["command"]})


def persistence_inventory():
    folders = [Path.home()/"Library/LaunchAgents", Path("/Library/LaunchAgents"), Path("/Library/LaunchDaemons")]
    items, errors = [], []
    for folder in folders:
        try:
            if not folder.exists():
                continue
            for entry in sorted(folder.glob("*.plist"))[:500]:
                try:
                    if entry.is_symlink():
                        errors.append(private_text(entry) + ": collegamento simbolico non letto")
                        continue
                    if entry.stat().st_size > 1024 * 1024:
                        errors.append(private_text(entry) + ": plist oltre 1 MiB non letto")
                        continue
                    with entry.open("rb") as stream:
                        data = plistlib.load(stream)
                    # Commands/arguments may contain personal data or credentials: do not collect them.
                    items.append({"path": private_text(entry), "label": str(data.get("Label", "Non dichiarata")),
                                  "runAtLoad": bool(data.get("RunAtLoad", False))})
                except (OSError, ValueError, plistlib.InvalidFileException, AttributeError) as error:
                    errors.append(private_text(entry) + ": " + type(error).__name__)
        except OSError as error:
            errors.append(private_text(folder) + ": " + type(error).__name__)
    return check("persistence", "Elementi di avvio · inventario parziale", "info",
        "Inventario di plist di terze parti in tre cartelle LaunchAgents/LaunchDaemons, massimo 500 per cartella. "
        "La presenza non dimostra malware. Login Items, estensioni e altri metodi di persistenza non sono inclusi.",
        {"items": items, "readErrors": errors, "perDirectoryLimit": 500})


def xprotect():
    for bundle in [Path("/Library/Apple/System/Library/CoreServices/XProtect.bundle"),
                   Path("/System/Library/CoreServices/XProtect.bundle")]:
        try:
            with (bundle/"Contents/Info.plist").open("rb") as stream:
                data = plistlib.load(stream)
            return check("xprotect", "Metadati XProtect", "info",
                "Trovato il bundle XProtect. Questo non prova che sia aggiornato, in esecuzione o che non ci siano malware.",
                {"bundle": str(bundle), "version": str(data.get("CFBundleShortVersionString", data.get("CFBundleVersion", "Non dichiarata")))})
        except (OSError, ValueError, plistlib.InvalidFileException):
            pass
    return check("xprotect", "Metadati XProtect", "skipped", "Bundle non leggibile nei percorsi conosciuti. Nessuna conclusione sulla protezione del Mac.")


def clam_check(runner, folder, update_signatures, progress=None):
    engine = shutil.which("clamscan")
    if not engine:
        return check("malware", "Scansione antivirus · ClamAV", "blocked",
            "ClamAV non è installato: nessuna scansione antivirus è stata eseguita. "
            "Se usi Homebrew, installalo con brew install clamav; poi ripeti il controllo. Aegis non installa software automaticamente.")
    db = Path.home()/"Library/Application Support/Aegis/clamav"
    try:
        db.mkdir(mode=0o700, parents=True, exist_ok=True)
    except OSError as error:
        return check("malware", "Scansione antivirus · ClamAV", "error", "Impossibile preparare la cartella delle firme.", {"error": private_text(error)})
    refresh = None
    if update_signatures:
        updater = shutil.which("freshclam")
        if updater:
            if progress:
                progress("Aggiornamento firme ClamAV · download locale, può richiedere diversi minuti")
            with tempfile.TemporaryDirectory(prefix="aegis-freshclam-") as temp:
                config = Path(temp)/"freshclam.conf"
                config.write_text("DatabaseMirror database.clamav.net\nConnectTimeout 15\nReceiveTimeout 60\n", encoding="utf-8")
                refresh = runner.run([updater, "--stdout", "--config-file=" + str(config), "--datadir=" + str(db)], timeout=600)
        else:
            refresh = {"exitCode": None, "output": "freshclam non disponibile", "cancelled": False}
    if runner.cancel.is_set():
        return check("malware", "Scansione antivirus · ClamAV", "skipped", "Operazione interrotta.", {"signatureUpdate": refresh})
    if refresh and refresh.get("exitCode") in (51, 54):
        return check("malware", "Scansione antivirus · ClamAV", "blocked",
            "Verifica checksum o firma del database fallita. Nessuna scansione avviata: ripristinare firme verificate prima di riprovare.", {"signatureUpdate": refresh})
    databases = [p for p in db.iterdir() if p.suffix in (".cvd", ".cld") and p.is_file()]
    if not databases:
        return check("malware", "Scansione antivirus · ClamAV", "blocked",
            "Nessun database di firme nel percorso Aegis. Abilita l'aggiornamento firme e verifica l'accesso a database.clamav.net. "
            "Non è stato prodotto un esito sui file.", {"signatureUpdate": refresh})
    version = runner.run([engine, "--version"])
    if progress:
        progress("ClamAV · analisi dei file nella cartella scelta")
    result = runner.run([engine, "--stdout", "--recursive", "--infected", "--database=" + str(db),
        "--follow-dir-symlinks=0", "--follow-file-symlinks=0", "--max-filesize=128M", "--max-scansize=512M",
        "--max-scantime=120000", "--alert-exceeds-max=yes", "--", str(folder)], timeout=3600)
    output = result["output"]
    count = re.search(r"^Scanned files:\s*(\d+)\s*$", output, re.M)
    findings = []
    for line in output.splitlines():
        if line.endswith(" FOUND") and ": " in line:
            name, signature = line[:-6].rsplit(": ", 1)
            kind = "coverage" if "Limits.Exceeded" in signature else "test" if "eicar" in signature.lower() else "detection"
            findings.append({"path": name, "signature": signature, "kind": kind})
    update_failed = bool(refresh and refresh.get("exitCode") != 0)
    interrupted = result["cancelled"] or result["timedOut"]
    partial = interrupted or result["exitCode"] not in (0, 1) or result["truncated"] or not count or int(count.group(1)) == 0
    partial = partial or bool(re.search(r"WARNING:|ERROR:|Permission denied", output, re.I)) or any(f["kind"] == "coverage" for f in findings)
    status = "skipped" if result["cancelled"] else "error" if partial else "warning" if result["exitCode"] == 1 or update_failed else "pass"
    evidence = {"scope": private_text(folder), "engineVersion": version["output"].strip().split("/", 1)[0], "signatureUpdate": refresh,
        "signatureFiles": [{"name": p.name, "fileModifiedAt": datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat()} for p in databases],
        "scan": result, "filesReportedScanned": int(count.group(1)) if count else None, "findings": findings,
        "coverageIncomplete": bool(partial), "signatureUpdateFailed": update_failed,
        "limits": {"maxFileSize": "128 MiB", "maxExpandedContainer": "512 MiB", "maxTimePerContainer": "120 s", "totalTimeout": "3600 s", "followSymlinks": False}}
    if partial or result["cancelled"]:
        detail = "Scansione incompleta o non attendibile: controlla errori, limiti e conteggi. Nessun esito complessivo di sicurezza."
    elif result["exitCode"] == 1:
        detail = f"ClamAV ha restituito segnalazioni su {count.group(1)} file riportati come scansionati. "
        detail += "EICAR indica un test innocuo; i limiti indicano copertura incompleta. Nessun file è stato eliminato."
    else:
        detail = f"ClamAV non ha segnalato corrispondenze nei {count.group(1)} file riportati come scansionati, entro i limiti dichiarati. "
        detail += "Non certifica l'assenza di malware nel Mac o nei file esclusi."
    if update_failed:
        detail += " L'aggiornamento delle firme è fallito: il motore ha usato le firme già presenti, la cui attualità non è garantita."
    return check("malware", "Scansione antivirus · ClamAV", status, detail, evidence)


class Service:
    def __init__(self, root=ROOT):
        self.root = Path(root)
        self.token = secrets.token_urlsafe(32)
        self.cancel = threading.Event()
        self.stopping = threading.Event()
        self.lock = threading.RLock()
        self.thread = None
        self.selected = None
        self.job = {"state": "idle", "report": None, "current": "Nessuna scansione avviata"}

    def state(self):
        with self.lock:
            return {"version": VERSION, "supported": platform.system() == "Darwin",
                "selectedDirectory": private_text(self.selected) if self.selected else None,
                "clamavAvailable": bool(shutil.which("clamscan")), "job": copy.deepcopy(self.job)}

    def start(self, options):
        if platform.system() != "Darwin":
            raise ValueError("Questa versione dell'agente supporta solo macOS. Nessun controllo macOS eseguito su questa macchina.")
        if set(options) - {"scope", "scanMalware", "updateSignatures", "appleUpdates"}:
            raise ValueError("Opzioni sconosciute.")
        for key in ("scanMalware", "updateSignatures", "appleUpdates"):
            if key in options and not isinstance(options[key], bool):
                raise ValueError("Le opzioni dei controlli devono essere booleane.")
        scope = options.get("scope", "downloads")
        scopes = {"downloads": Path.home()/"Downloads", "home": Path.home(), "selected": self.selected}
        if scope not in scopes or scopes[scope] is None:
            raise ValueError("Scegli una cartella valida nell'interfaccia locale.")
        folder = scopes[scope].resolve()
        if not folder.is_dir() or str(folder) in ("/", "/System", "/dev", "/proc", "/sys"):
            raise ValueError("Cartella non disponibile o radice non supportata: scegli una cartella dati.")
        with self.lock:
            if self.job["state"] == "running":
                raise RuntimeError("Una scansione è già in corso.")
            self.cancel.clear()
            report = {"schema": "aegis-native-report-1", "agentVersion": VERSION, "id": secrets.token_hex(12),
                "startedAt": now(), "platform": "macOS", "scope": private_text(folder), "options": options,
                "checks": [], "limits": LIMITS, "complete": False}
            self.job = {"state": "running", "current": "Preparazione", "report": report}
            self.thread = threading.Thread(target=self.scan, args=(folder, options), daemon=True)
            self.thread.start()

    def scan(self, folder, options):
        runner = Runner(self.cancel)
        def progress(label):
            with self.lock:
                self.job["current"] = label
        steps = [
            ("hardware", "Identificazione del Mac", lambda: hardware(runner)),
            ("filevault", "FileVault · cifratura del disco", lambda: setting_check(runner, "filevault", "FileVault · cifratura del disco", ["/usr/bin/fdesetup", "status"], "filevault is on", "filevault is off", "Non rileva malware o esfiltrazioni.")),
            ("gatekeeper", "Gatekeeper", lambda: setting_check(runner, "gatekeeper", "Gatekeeper", ["/usr/sbin/spctl", "--status"], "assessments enabled", "assessments disabled", "Lo stato attivo non certifica le applicazioni installate.")),
            ("sip", "System Integrity Protection", lambda: setting_check(runner, "sip", "System Integrity Protection", ["/usr/bin/csrutil", "status"], "status: enabled", "status: disabled", "Configurazioni personalizzate o output diversi richiedono verifica manuale.")),
            ("firewall", "Firewall applicativo macOS", lambda: setting_check(runner, "firewall", "Firewall applicativo macOS", ["/usr/libexec/ApplicationFirewall/socketfilterfw", "--getglobalstate"], "firewall is enabled", "firewall is disabled", "Non è una prova dell'effettiva raggiungibilità di servizi dalla rete.")),
            ("listeners", "Porte TCP in ascolto", lambda: listeners(runner)),
            ("persistence", "Elementi di avvio", persistence_inventory),
            ("xprotect", "Metadati XProtect", xprotect),
        ]
        if options.get("appleUpdates", False):
            def updates():
                result = runner.run(["/usr/sbin/softwareupdate", "--list"], timeout=180)
                # Inventory only: do not infer CVEs or install anything from human-readable output.
                return check("updates", "Aggiornamenti disponibili · Apple", "info" if result["exitCode"] == 0 and not result["timedOut"] and not result["truncated"] else "error",
                    "Consultazione Apple, senza installazione. Leggi l'output: non è una mappatura delle CVE e il formato può cambiare.", result)
            steps.append(("updates", "Consultazione aggiornamenti Apple", updates))
        else:
            steps.append(("updates", "Aggiornamenti Apple", lambda: check("updates", "Aggiornamenti Apple", "skipped", "Controllo online non selezionato. Nessuna conclusione sullo stato degli aggiornamenti.")))
        steps.append(("malware", "Scansione antivirus", lambda: clam_check(runner, folder, options.get("updateSignatures", True), progress=progress) if options.get("scanMalware", True) else check("malware", "Scansione antivirus · ClamAV", "skipped", "Scansione antivirus non selezionata.")))
        try:
            for check_id, label, action in steps:
                with self.lock:
                    self.job["current"] = label
                if self.cancel.is_set():
                    item = check(check_id, label, "skipped", "Non eseguito: scansione interrotta.")
                else:
                    try:
                        item = action()
                    except Exception as error:
                        item = check(check_id, label, "error", "Controllo non completato; nessun esito dedotto.", {"error": private_text(str(error))})
                with self.lock:
                    self.job["report"]["checks"].append(item)
        finally:
            with self.lock:
                report = self.job["report"]
                report["finishedAt"] = now()
                report["complete"] = not self.cancel.is_set() and all(c["status"] not in ("error", "blocked") for c in report["checks"])
                report["coverage"] = {status: sum(c["status"] == status for c in report["checks"]) for status in ("pass", "warning", "info", "blocked", "error", "skipped")}
                self.job["state"] = "cancelled" if self.cancel.is_set() else "finished"
                self.job["current"] = "Interrotta" if self.cancel.is_set() else "Controlli terminati: verificare copertura e limiti"


class Server(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, service):
        self.service = service
        super().__init__(address, Handler)
        self.origin = f"http://127.0.0.1:{self.server_port}"


class Handler(BaseHTTPRequestHandler):
    server_version = "AegisLocal/0.2"
    def log_message(self, *_):
        pass  # No API tokens, personal paths or report contents in access logs.

    def respond(self, code, body, mime="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", mime + ("; charset=utf-8" if mime.startswith(("text/", "application/json")) else ""))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def allowed_origin(self):
        if self.headers.get("Host") != urlsplit(self.server.origin).netloc:
            self.respond(403, {"error": "Host non autorizzato"})
            return False
        origin = self.headers.get("Origin")
        if origin is not None and origin != self.server.origin:
            self.respond(403, {"error": "Origine non autorizzata"})
            return False
        if self.headers.get("Sec-Fetch-Site") in ("cross-site", "same-site"):
            self.respond(403, {"error": "Richiesta esterna rifiutata"})
            return False
        return True

    def authenticated(self):
        token = self.headers.get("X-Aegis-Token", "")
        if not hmac.compare_digest(token, self.server.service.token):
            self.respond(401, {"error": "Sessione locale non autorizzata"})
            return False
        return True

    def do_OPTIONS(self):
        self.respond(403, {"error": "Nessun accesso CORS: usare l'interfaccia aperta dall'agente"})

    def do_GET(self):
        if not self.allowed_origin():
            return
        path = urlsplit(self.path).path
        if path == "/api/session":
            if self.headers.get("X-Aegis-Client") != "local-ui":
                self.respond(403, {"error": "Usare l'interfaccia locale"})
                return
            self.respond(200, {"token": self.server.service.token, "version": VERSION})
        elif path == "/api/state":
            if self.authenticated():
                self.respond(200, self.server.service.state())
        elif path.startswith("/api/"):
            self.respond(404, {"error": "Endpoint inesistente"})
        else:
            # Serve a fixed UI allowlist, never arbitrary files, .git, native code or directories.
            names = {"/": "index.html", "/index.html": "index.html", "/404.html": "404.html", "/robots.txt": "robots.txt"}
            for name in ("app.js", "device.js", "scanner.js", "style.css", "device.css", "type.css", "manrope.ttf", "favicon.svg"):
                names["/assets/" + name] = "assets/" + name
            if path not in names:
                self.respond(404, {"error": "Risorsa non disponibile"})
                return
            file = self.server.service.root/names[path]
            if file.is_symlink() or not file.is_file():
                self.respond(404, {"error": "Risorsa non disponibile"})
                return
            self.respond(200, file.read_bytes(), mimetypes.guess_type(file.name)[0] or "application/octet-stream")

    def do_POST(self):
        if not self.allowed_origin() or not self.authenticated():
            return
        if self.headers.get("Content-Type") != "application/json":
            self.respond(415, {"error": "Usare JSON"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 4096 or self.headers.get("Transfer-Encoding"):
                raise ValueError("Dimensione richiesta non valida")
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError("Oggetto JSON richiesto")
            path = urlsplit(self.path).path
            service = self.server.service
            if path == "/api/scan":
                service.start(data)
                self.respond(202, service.state())
            elif path == "/api/cancel":
                service.cancel.set()
                self.respond(200, {"cancelRequested": True})
            elif path == "/api/choose-directory":
                if platform.system() != "Darwin":
                    raise ValueError("Selezione cartella disponibile solo su macOS")
                with service.lock:
                    if service.job["state"] == "running":
                        raise RuntimeError("Attendi il termine della scansione")
                    result = Runner(service.stopping).run(["/usr/bin/osascript", "-e", 'POSIX path of (choose folder with prompt "Scegli la cartella da analizzare con Aegis")'], timeout=120)
                    if result["exitCode"] != 0:
                        raise ValueError("Selezione annullata o non disponibile")
                    # Runner redacts home in output; expand only this local, OS-selected path.
                    folder = Path(result["output"].strip()).expanduser().resolve()
                    if not folder.is_dir():
                        raise ValueError("Cartella non disponibile")
                    service.selected = folder
                self.respond(200, {"selectedDirectory": private_text(folder)})
            else:
                self.respond(404, {"error": "Endpoint inesistente"})
        except RuntimeError as error:
            self.respond(409, {"error": str(error)})
        except (ValueError, TypeError, OSError) as error:
            self.respond(400, {"error": private_text(error)})


def main():
    parser = argparse.ArgumentParser(description="Aegis: agente locale di test per macOS, senza sudo o cancellazioni.")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    def stop(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, stop)
    service = Service()
    server = Server(("127.0.0.1", args.port), service)
    print("Aegis agente locale di test " + VERSION, flush=True)
    print("Interfaccia locale: " + server.origin + "/#device", flush=True)
    print("Report solo in memoria. Nessun accesso remoto; Ctrl+C per terminare.", flush=True)
    if platform.system() != "Darwin":
        print("Questo host non è macOS: avvio UI disponibile, controlli nativi disabilitati.", flush=True)
    if not args.no_browser:
        webbrowser.open(server.origin + "/#device")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        service.cancel.set()
        service.stopping.set()
        server.server_close()
        if service.thread:
            service.thread.join(timeout=5)


if __name__ == "__main__":
    main()
