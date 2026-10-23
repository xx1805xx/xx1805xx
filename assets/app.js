"use strict";

const ICONS = {
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/>',
  "shield-check":
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8.5 11.5 2.5 2.5 5-5"/>',
  layers:
    '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  grid: '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><rect x="14.5" y="14.5" width="6" height="6" rx="1"/>',
  scan: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3M3 12h18"/><path d="M8 8h8v8H8Z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  bug: '<path d="M8 8a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0Z"/><path d="m8 9-4-2m12 2 4-2M8 13H3m13 0h5M8 17l-4 3m12-3 4 3M9 5 7 3m8 2 2-2M8 10h8m-4 0v9"/>',
  report:
    '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5M9 12h6m-6 4h6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3 2.5c-.5.2-.5 1-.5 2M12 17h.01"/>',
  chevrons: '<path d="m9 8 3-3 3 3m-6 8 3 3 3-3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  "arrow-right": '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  "arrow-up-right": '<path d="M6 18 18 6M7 6h11v11"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  fingerprint:
    '<path d="M4 10a8 8 0 0 1 16 0m-13 2v-2a5 5 0 0 1 10 0v5c0 3-1 5-2 7M10 19c1-2 1-4 1-7v-2a1 1 0 0 1 2 0v4c0 4-1 6-2 8M4 14c0 3-1 5-1 5m4-4c0 3-1 5-2 6m15-7v2c0 2 0 3-1 5"/>',
  files:
    '<path d="M15 7h-5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8Z"/><path d="M15 7v5h5M6 17H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8l3 3"/>',
  flag: '<path d="M5 21V4m0 0c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  "cloud-off":
    '<path d="m3 3 18 18M7 7a5 5 0 0 0-1 10h10m4-1a4 4 0 0 0-2-7 6 6 0 0 0-9-5"/>',
  upload:
    '<path d="M12 16V3m-5 5 5-5 5 5M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  key: '<circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-3-3 3-3m-6 0 3-3"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 12-2L20 8M4 16l2.5 3a7.5 7.5 0 0 0 12-2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  external:
    '<path d="M15 3h6v6m0-6L11 13M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  monitor:
    '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-5 0h10"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
};
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const safeName = (value) =>
  String(value ?? "").replace(
    /[\u202a-\u202e\u2066-\u2069]/g,
    (c) => `[U+${c.charCodeAt(0).toString(16).toUpperCase()}]`,
  );
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}
hydrateIcons();
const bytes = (value) =>
  value < 1024
    ? `${value} B`
    : value < 1024 ** 2
      ? `${(value / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 })} KiB`
      : `${(value / 1024 ** 2).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MiB`;
const date = (value) =>
  new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const STORAGE_KEY = "aegis.reports.v1";
const PREF_KEY = "aegis.remember.v1";
const MAX_REPORTS = 30;
let reports = [],
  sessionFiles = [],
  sessionActivity = [],
  remember = false;
let toastTimer,
  activeWorker = null,
  cancelWorker = null,
  scanning = false,
  cancelled = false;
let browserChecks = null;

function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 6000);
}
function navigate() {
  const names = {
    overview: "Panoramica",
    device: "Il mio dispositivo",
    files: "Analisi file",
    browser: "Check del browser",
    vulnerabilities: "Vulnerabilità",
    reports: "Report",
    guide: "Guida e trasparenza",
  };
  const view = location.hash.slice(1) || "overview";
  if (!names[view]) {
    location.replace("#overview");
    return;
  }
  document.querySelectorAll(".view").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
  document.querySelectorAll("[data-view]").forEach((link) => {
    const active = link.dataset.view === view;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("breadcrumb-title").textContent = names[view];
  document.title = `Aegis — ${names[view]}`;
  $("sidebar").classList.remove("open");
  $("menu-toggle").setAttribute("aria-expanded", "false");
  if (view === "reports") renderReports();
  window.scrollTo({ top: 0, behavior: "instant" });
}
window.addEventListener("hashchange", () => {
  navigate();
  $("main").focus({ preventScroll: true });
});
$("menu-toggle").addEventListener("click", () => {
  const open = $("sidebar").classList.toggle("open");
  $("menu-toggle").setAttribute("aria-expanded", String(open));
  $("menu-toggle").setAttribute(
    "aria-label",
    open ? "Chiudi menu" : "Apri menu",
  );
});
document.addEventListener("click", (e) => {
  if (
    !$("sidebar").contains(e.target) &&
    !$("menu-toggle").contains(e.target)
  ) {
    $("sidebar").classList.remove("open");
    $("menu-toggle").setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("sidebar").classList.remove("open");
    $("menu-toggle").setAttribute("aria-expanded", "false");
  }
});

function loadReports() {
  try {
    remember = localStorage.getItem(PREF_KEY) === "true";
    if (remember) {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored))
        reports = stored
          .filter(
            (r) =>
              r &&
              typeof r.id === "string" &&
              ["file", "browser", "vulnerability", "device"].includes(r.type) &&
              typeof r.title === "string" &&
              !Number.isNaN(Date.parse(r.createdAt)) &&
              r.data &&
              typeof r.data === "object",
          )
          .slice(0, MAX_REPORTS);
    }
  } catch {
    remember = false;
    reports = [];
  }
  $("remember-reports").checked = remember;
}
function persist() {
  if (!remember) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    remember = false;
    $("remember-reports").checked = false;
    try {
      localStorage.removeItem(PREF_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Browser storage may be disabled. */
    }
    toast(
      "Memoria locale non disponibile. I report restano soltanto in questa sessione.",
    );
  }
}
function addReport(type, title, status, summary, data) {
  const report = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    status,
    summary,
    data,
    createdAt: new Date().toISOString(),
    appVersion: "1.0.0",
  };
  reports.unshift(report);
  reports = reports.slice(0, MAX_REPORTS);
  sessionActivity.unshift(report);
  sessionActivity = sessionActivity.slice(0, MAX_REPORTS);
  persist();
  updateDashboard();
  renderReports();
  return report;
}
function reportBadge(report) {
  if (report.status === "error")
    return '<span class="badge error">Non completato</span>';
  if (report.type === "file") {
    const findings = report.data.findings || [];
    if (findings.some((f) => f.level === "test"))
      return '<span class="badge test">Firma di test</span>';
    if (findings.some((f) => f.level === "warning"))
      return '<span class="badge warning">Da rivedere</span>';
    return '<span class="badge info">Nessun allarme dalle regole</span>';
  }
  if (report.type === "browser")
    return `<span class="badge ${report.status === "warning" ? "warning" : "info"}">${report.status === "warning" ? "Da rivedere" : "Controlli completati"}</span>`;
  if (report.type === "device")
    return `<span class="badge ${report.status === "warning" ? "warning" : "info"}">${report.status === "warning" ? "Verificare gli esiti" : "Vedi copertura"}</span>`;
  return `<span class="badge ${report.status === "warning" ? "warning" : "info"}">${report.status === "warning" ? "Segnalazioni presenti" : "Nessuna corrispondenza"}</span>`;
}
function updateDashboard() {
  $("stat-files").textContent = sessionFiles.filter((f) => f.complete).length;
  $("stat-findings").textContent = sessionFiles.filter((f) =>
    f.findings?.some((item) => ["test", "warning"].includes(item.level)),
  ).length;
  $("report-count").textContent = reports.length;
  $("recent-count").textContent = sessionActivity.length;
  if (!sessionActivity.length) {
    $("recent-activity").innerHTML =
      `<div class="empty-inline"><span class="empty-icon">${icon("activity")}</span><div><strong>Si comincia da qui.</strong><p>Avvia la tua prima analisi: i risultati appariranno in questo spazio.</p></div><a href="#files" class="button ghost">Analizza un file${icon("arrow-up-right")}</a></div>`;
    return;
  }
  $("recent-activity").innerHTML = sessionActivity
    .slice(0, 4)
    .map(
      (report) =>
        `<div class="report-row"><span class="stat-icon ${report.status === "warning" ? "amber" : "green"}">${icon(report.type === "file" ? "files" : report.type === "browser" ? "globe" : report.type === "device" ? "monitor" : "bug")}</span><div><h3>${esc(safeName(report.title))}</h3><p>${esc(date(report.createdAt))} · ${esc(report.summary)}</p></div>${reportBadge(report)}</div>`,
    )
    .join("");
}

function openFiles() {
  if (scanning) {
    toast("Un’analisi è già in corso. Attendi oppure interrompila.");
    return;
  }
  $("file-input").click();
}
for (const name of ["drop-overview", "drop-files"]) {
  const zone = $(name);
  zone.addEventListener("click", openFiles);
  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFiles();
    }
  });
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", (e) => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove("dragging");
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    if (scanning) {
      toast("Attendi il completamento dell’analisi in corso.");
      return;
    }
    if (e.dataTransfer.files.length)
      scanFiles(Array.from(e.dataTransfer.files));
    else toast("Trascina uno o più file. Le cartelle non sono supportate.");
  });
}
$("file-input").addEventListener("change", (e) => {
  const selected = Array.from(e.target.files);
  e.target.value = "";
  if (selected.length) scanFiles(selected);
});
// Do not let a dropped file navigate away from the application.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

function scanOne(file, completed, total) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(
        new URL(
          "./scanner.js",
          document.currentScript?.src ||
            new URL("./assets/app.js", document.baseURI),
        ),
      );
    } catch {
      reject(
        new Error(
          "Impossibile avviare il motore locale. Apri il sito via HTTPS o con un server locale.",
        ),
      );
      return;
    }
    activeWorker = worker;
    cancelWorker = () => {
      worker.terminate();
      reject(new DOMException("Analisi interrotta", "AbortError"));
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        const percent = Math.round(
          ((completed + (data.total ? data.bytesRead / data.total : 1)) /
            total) *
            100,
        );
        $("scan-percent").textContent = `${percent}%`;
        $("scan-progress-bar").value = percent;
      } else if (data.type === "result") {
        worker.terminate();
        activeWorker = null;
        cancelWorker = null;
        resolve(data.result);
      } else if (data.type === "error") {
        worker.terminate();
        activeWorker = null;
        cancelWorker = null;
        reject(new Error(data.error));
      }
    };
    worker.onerror = (e) => {
      e.preventDefault();
      worker.terminate();
      activeWorker = null;
      cancelWorker = null;
      reject(
        new Error(
          "Il motore locale ha incontrato un errore. Questo file non è stato analizzato completamente.",
        ),
      );
    };
    worker.postMessage({ file });
  });
}
async function scanFiles(files) {
  if (scanning) return;
  if (files.length > 50) {
    toast(
      "Puoi analizzare fino a 50 file per volta. Seleziona un gruppo più piccolo.",
    );
    return;
  }
  if (typeof Worker === "undefined") {
    toast(
      "Questo browser non supporta il motore di analisi locale. Prova un browser aggiornato.",
    );
    return;
  }
  scanning = true;
  cancelled = false;
  location.hash = "files";
  $("scan-cancel").hidden = false;
  $("scan-progress").hidden = false;
  $("scan-progress-bar").value = 0;
  $("scan-percent").textContent = "0%";
  $("file-results").innerHTML = "";
  $("queue-label").textContent =
    `${files.length} ${files.length === 1 ? "file selezionato" : "file selezionati"}`;
  for (const id of ["drop-files", "drop-overview"])
    $(id).setAttribute("aria-busy", "true");
  let completed = 0,
    errors = 0;
  try {
    for (const file of files) {
      if (cancelled) break;
      $("scan-current").textContent =
        `${completed + errors + 1}/${files.length} · ${safeName(file.name)}`;
      try {
        if (file.size > 128 * 1024 * 1024)
          throw new Error(
            "Il file supera 128 MiB. Nessun byte è stato analizzato. Usa un antivirus locale per file più grandi.",
          );
        const result = await scanOne(file, completed + errors, files.length);
        sessionFiles.push(result);
        const warning = result.findings.some((f) =>
          ["test", "warning"].includes(f.level),
        );
        addReport(
          "file",
          result.name,
          warning ? "warning" : "info",
          `${bytes(result.size)} · ${warning ? "Elementi da verificare" : "Nessun allarme dalle regole limitate"}`,
          result,
        );
        renderFile(result);
        completed++;
      } catch (error) {
        if (error.name === "AbortError") break;
        errors++;
        const result = {
          name: file.name,
          size: file.size,
          complete: false,
          bytesRead: null,
          error: error.message,
          findings: [],
          limits: [
            "L’analisi non è stata completata; nessun giudizio sul file.",
          ],
        };
        addReport("file", file.name, "error", error.message, result);
        renderFile(result);
      }
    }
  } finally {
    if (activeWorker) activeWorker.terminate();
    activeWorker = null;
    cancelWorker = null;
    scanning = false;
    $("scan-cancel").hidden = true;
    $("scan-progress").hidden = true;
    for (const id of ["drop-files", "drop-overview"])
      $(id).removeAttribute("aria-busy");
    const remaining = files.length - completed - errors;
    $("queue-label").textContent =
      `${completed} ${completed === 1 ? "analisi completata" : "analisi completate"}${errors ? ` · ${errors} non completate` : ""}${remaining ? ` · ${remaining} non analizzat${remaining === 1 ? "o" : "i"}` : ""}`;
    toast(
      cancelled
        ? `Analisi interrotta. ${remaining} file non analizzati completamente.`
        : `Controllo terminato: ${completed} file letti completamente${errors ? `, ${errors} non analizzati` : ""}.`,
    );
  }
}
$("scan-cancel").addEventListener("click", () => {
  cancelled = true;
  if (cancelWorker) cancelWorker();
});
function renderFile(result) {
  const el = document.createElement("article");
  el.className = "panel file-result";
  const warning = result.findings?.some((f) =>
    ["test", "warning"].includes(f.level),
  );
  const report = {
    type: "file",
    status: result.complete ? (warning ? "warning" : "info") : "error",
    data: result,
  };
  el.innerHTML = `<div class="result-title"><span class="stat-icon ${warning ? "amber" : "green"}">${icon("files")}</span><div><h3>${esc(safeName(result.name))}</h3><p>${esc(bytes(result.size))}${result.format ? ` · ${esc(result.format)}` : ""}</p></div>${reportBadge(report)}</div>${!result.complete ? `<div class="result-findings"><div class="finding warning"><strong>Analisi non completata</strong><p>${esc(result.error)}</p></div></div>` : `<div class="result-findings">${result.findings.length ? result.findings.map((f) => `<div class="finding ${esc(f.level)}"><strong>${esc(f.title)}</strong><p>${esc(f.detail)}</p></div>`).join("") : '<div class="finding"><strong>Nessun indicatore rilevato dalle regole disponibili</strong><p>Le regole limitate non hanno trovato corrispondenze. Questo risultato non esclude malware o comportamenti dannosi e non certifica la sicurezza del file.</p></div>'}</div><div class="result-hash"><div><small>SHA-256</small>${result.sha256 ? `<code>${esc(result.sha256)}</code>` : `<p class="quiet-note">${esc(result.hashNote)}</p>`}</div>${result.sha256 ? `<button class="icon-button hash-copy" aria-label="Copia SHA-256" data-hash="${esc(result.sha256)}">${icon("copy")}</button>` : ""}</div><div class="result-meta"><span><strong>${esc(bytes(result.bytesRead))}</strong> letti · tutti i byte</span><span>Entropia: <strong>${esc(result.entropy)} / 8 bit per byte</strong> · descrittiva, non diagnostica</span></div>`}`;
  el.querySelector("[data-hash]")?.addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(e.currentTarget.dataset.hash);
      toast("Impronta SHA-256 copiata.");
    } catch {
      toast(
        "Appunti non disponibili. Seleziona e copia manualmente l’impronta.",
      );
    }
  });
  $("file-results").append(el);
}

async function runBrowserChecks() {
  $("run-browser").disabled = true;
  const secure = window.isSecureContext;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    location.hostname,
  );
  const secureDetail =
    location.protocol === "https:"
      ? "Questa pagina usa HTTPS e il browser la considera un contesto sicuro. Non verifica la sicurezza del dispositivo o di altri siti."
      : loopback && secure
        ? "L’indirizzo di loopback è considerato attendibile per lo sviluppo. La pagina è in HTTP locale: questo controllo non dimostra una connessione HTTPS."
        : "Questa pagina non è in un contesto sicuro. Aprila via HTTPS per proteggere il trasporto e rendere disponibili le API sensibili.";
  const checks = [
    {
      id: "secure",
      title: "Contesto di sicurezza della pagina",
      status: secure ? "info" : "warning",
      label: secure
        ? loopback
          ? "Locale attendibile"
          : "HTTPS"
        : "Da rivedere",
      icon: "lock",
      detail: secureDetail,
      evidence: {
        secureContext: secure,
        protocol: location.protocol,
        loopback,
      },
    },
  ];
  let cryptoPassed = false;
  try {
    if (crypto.subtle) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode("abc"),
      );
      const actual = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      cryptoPassed =
        actual ===
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    }
  } catch {
    cryptoPassed = false;
  }
  checks.push({
    id: "crypto",
    title: "API crittografiche · test SHA-256",
    status: cryptoPassed ? "info" : "warning",
    label: cryptoPassed ? "Test superato" : "Non disponibile",
    icon: "key",
    detail: cryptoPassed
      ? "Calcolata l’impronta della stringa di prova “abc” e confrontata con il valore SHA-256 noto. Questo verifica l’API usata da Aegis, non la presenza di malware."
      : "L’API SHA-256 non ha superato il test o non è disponibile. Gli hash dei file potrebbero non essere calcolabili. Prova un browser aggiornato in HTTPS.",
    evidence: { knownAnswerTest: cryptoPassed },
  });
  const meta = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]',
  );
  const policy = meta?.content || "";
  const restricted =
    policy.includes("script-src 'self'") &&
    policy.includes("object-src 'none'") &&
    !/unsafe-(inline|eval)/.test(policy);
  checks.push({
    id: "csp",
    title: "Policy sui contenuti di questa applicazione",
    status: restricted ? "info" : "warning",
    label: restricted ? "Policy presente" : "Da rivedere",
    icon: "code",
    detail: restricted
      ? "La pagina dichiara una Content Security Policy che limita script e oggetti incorporati. È una misura di riduzione del rischio, non una garanzia contro ogni attacco. Questo controllo legge la policy dichiarata; non è un penetration test."
      : "La policy dichiarata nella pagina non soddisfa i controlli minimi di Aegis. Eventuali policy aggiunte dal server non sono valutate da questo controllo.",
    evidence: { source: "meta", declaredPolicy: policy },
  });
  let storageAvailable = false;
  const probeKey = `aegis.probe.${Date.now()}`;
  try {
    sessionStorage.setItem(probeKey, "1");
    storageAvailable = sessionStorage.getItem(probeKey) === "1";
    sessionStorage.removeItem(probeKey);
  } catch {
    /* Not a security vulnerability. */
  }
  checks.push({
    id: "storage",
    title: "Disponibilità della memoria di sessione",
    status: "info",
    label: storageAvailable ? "Disponibile" : "Limitata",
    icon: "layers",
    detail: storageAvailable
      ? "La memoria di sessione è utilizzabile. La cronologia persistente resta disattivata finché non scegli “Ricorda i report”. La disponibilità dello storage non misura la sicurezza del browser."
      : "La memoria di sessione è bloccata o limitata. Può dipendere dalle preferenze di privacy: non è, da sola, una vulnerabilità.",
    evidence: { sessionStorageAvailable: storageAvailable },
  });
  checks.push({
    id: "scope",
    title: "Accessi sensibili richiesti da Aegis",
    status: "info",
    label: "Nessuna richiesta",
    icon: "shield",
    detail:
      "Aegis non richiede fotocamera, microfono o posizione e legge soltanto i file selezionati. Questo non controlla i permessi concessi ad altri siti, applicazioni o estensioni.",
    evidence: {
      cameraRequested: false,
      microphoneRequested: false,
      locationRequested: false,
      scope: "Questa applicazione",
    },
  });
  browserChecks = checks;
  const warnings = checks.filter((c) => c.status === "warning").length;
  $("browser-summary").innerHTML =
    `<span class="stat-icon ${warnings ? "amber" : "green"}">${icon("globe")}</span><div><h2>${checks.length} controlli completati${warnings ? ` · ${warnings} da rivedere` : ""}.</h2><p>Rilevati ${esc(date(new Date()))}. Riguardano questa pagina, non l’intero dispositivo.</p></div>`;
  $("browser-results").innerHTML = checks
    .map(
      (c) =>
        `<article class="panel browser-check"><span class="stat-icon ${c.status === "warning" ? "amber" : "green"}">${icon(c.icon)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.detail)}</p></div><span class="badge ${c.status === "warning" ? "warning" : "info"}">${esc(c.label)}</span></article>`,
    )
    .join("");
  for (const id of ["secure", "csp", "crypto"]) {
    const check = checks.find((c) => c.id === id),
      pill = $(`preview-${id}`);
    pill.textContent = check.label;
    pill.className = `neutral-pill ${check.status === "warning" ? "warn" : "good"}`;
  }
  addReport(
    "browser",
    "Check del browser",
    warnings ? "warning" : "info",
    `${checks.length} controlli · ${warnings} da rivedere`,
    {
      checks,
      scope:
        "Solo la pagina e le API accessibili. Non è una scansione del dispositivo.",
    },
  );
  $("run-browser").disabled = false;
  toast(`${checks.length} controlli del browser completati.`);
}
$("run-browser").addEventListener("click", runBrowserChecks);
$("quick-browser").addEventListener("click", () => {
  location.hash = "browser";
  runBrowserChecks();
});

let lookupRunning = false;
function safeUrl(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
function renderVulnerabilities(vulns, query, timestamp) {
  if (!vulns.length) {
    $("vulnerability-results").innerHTML =
      `<div class="panel lookup-status"><span class="stat-icon green">${icon("search")}</span><div><h3>Nessuna corrispondenza per ${esc(query.package.name)} ${esc(query.version)}</h3><p>OSV non ha restituito segnalazioni per questa coppia esatta. Non certifica l’assenza di vulnerabilità. Verifica nome, ecosistema e versione; la ricerca non comprende il resto del dispositivo.</p></div></div>`;
    return;
  }
  $("vulnerability-results").innerHTML =
    `<div class="lookup-header"><div><h2>${vulns.length} segnalazion${vulns.length === 1 ? "e" : "i"} per ${esc(query.package.name)} ${esc(query.version)}</h2><p>Fonte: OSV · ${esc(date(timestamp))}. La presenza nel database non dimostra che il dispositivo sia vulnerabile.</p></div><span class="badge warning">Da verificare</span></div>` +
    vulns
      .map((v) => {
        const osv = `https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`;
        const severity = (v.database_specific?.severity || "")
          .toString()
          .slice(0, 50);
        const fixed = (v.affected || []).flatMap((a) =>
          (a.ranges || []).flatMap((r) =>
            (r.events || []).filter((e) => e.fixed).map((e) => e.fixed),
          ),
        );
        const external = (v.references || []).find(
          (ref) => ref.type === "ADVISORY" && safeUrl(ref.url),
        );
        return `<article class="panel vuln-card"><div class="vuln-top"><span class="stat-icon amber">${icon("bug")}</span><h3>${esc(v.id)}</h3><span class="badge warning">${esc(severity || "Gravità non classificata")}</span></div><p class="vuln-summary">${esc(v.summary || (v.details || "").slice(0, 500) || "Consulta la scheda originale per i dettagli della segnalazione.")}</p><p class="vuln-aliases">${v.aliases?.length ? `Identificativi associati: ${esc(v.aliases.join(" · "))}<br>` : ""}${fixed.length ? `Versioni di correzione indicate negli intervalli: ${esc([...new Set(fixed)].join(", "))}. Verifica l’intervallo applicabile nella scheda originale.` : "Nessuna versione di correzione riportata negli intervalli della risposta."}${v.withdrawn ? "<br>Attenzione: questa segnalazione risulta ritirata." : ""}</p><div class="vuln-links"><a class="text-link" href="${esc(osv)}" target="_blank" rel="noopener noreferrer">Scheda OSV${icon("external")}</a>${external ? `<a class="text-link" href="${esc(safeUrl(external.url))}" target="_blank" rel="noopener noreferrer">Avviso originale${icon("external")}</a>` : ""}</div></article>`;
      })
      .join("");
}
$("vulnerability-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (lookupRunning) return;
  const name = $("package-name").value.trim(),
    version = $("package-version").value.trim();
  if (!name || !version) {
    toast("Inserisci nome del pacchetto e versione esatta.");
    return;
  }
  const query = { package: { name, ecosystem: $("ecosystem").value }, version };
  lookupRunning = true;
  $("vulnerability-submit").disabled = true;
  $("vulnerability-results").innerHTML =
    '<div class="panel lookup-status"><span class="spinner" aria-hidden="true"></span><div><h3>Consultazione di OSV in corso…</h3><p>Invio di ecosistema, nome e versione. Nessun file viene inviato.</p></div></div>';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok)
      throw new Error(`OSV ha risposto con HTTP ${response.status}.`);
    const payload = await response.json();
    if (payload.vulns !== undefined && !Array.isArray(payload.vulns))
      throw new Error("OSV ha restituito una risposta non valida.");
    const vulns = (payload.vulns || []).filter(
      (v) => v && typeof v.id === "string",
    );
    const timestamp = new Date().toISOString();
    renderVulnerabilities(vulns, query, timestamp);
    addReport(
      "vulnerability",
      `${name} ${version}`,
      vulns.length ? "warning" : "info",
      `${query.package.ecosystem} · ${vulns.length} segnalazioni OSV`,
      {
        query,
        vulns,
        source: "https://api.osv.dev/v1/query",
        queriedAt: timestamp,
        limits: [
          "Ricerca per nome/versione inseriti, non inventario del dispositivo.",
          "Nessuna corrispondenza non certifica l’assenza di vulnerabilità.",
          "Verificare gli intervalli e la sfruttabilità nella scheda originale.",
        ],
      },
    );
  } catch (error) {
    const reason =
      error.name === "AbortError"
        ? "Il servizio non ha risposto entro 20 secondi."
        : error.message.includes("HTTP") || error.message.includes("non valida")
          ? error.message
          : "Il browser non riesce a raggiungere api.osv.dev. La rete, il servizio o una policy possono bloccare la richiesta.";
    $("vulnerability-results").innerHTML =
      `<div class="panel lookup-status"><span class="stat-icon amber">${icon("cloud-off")}</span><div><h3>Ricerca non completata</h3><p>${esc(reason)} Nessun esito sulla sicurezza è stato prodotto. Puoi riprovare o consultare direttamente il catalogo.</p><a class="text-link" href="https://osv.dev/list?q=${encodeURIComponent(name)}" target="_blank" rel="noopener noreferrer">Cerca ${esc(name)} su OSV${icon("external")}</a></div></div>`;
  } finally {
    clearTimeout(timeout);
    lookupRunning = false;
    $("vulnerability-submit").disabled = false;
  }
});

function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderReports() {
  $("export-all").disabled = !reports.length;
  $("clear-reports").disabled = !reports.length;
  if (!reports.length) {
    $("reports-list").innerHTML =
      `<div class="panel empty-state"><span class="stat-icon green">${icon("report")}</span><h2>Le evidenze iniziano da un controllo.</h2><p>Nessun report disponibile. Analizza un file o verifica il browser: qui troverai risultati, dettagli e limitazioni.</p><a href="#files" class="button primary">Analizza un file${icon("arrow-right")}</a><a href="#browser" class="button secondary">Check del browser</a></div>`;
    return;
  }
  $("reports-list").innerHTML =
    `<div class="panel">${reports.map((report) => `<article class="report-row"><span class="stat-icon ${report.status === "warning" ? "amber" : "green"}">${icon(report.type === "file" ? "files" : report.type === "browser" ? "globe" : report.type === "device" ? "monitor" : "bug")}</span><div><h3>${esc(safeName(report.title))}</h3><p>${esc(date(report.createdAt))} · ${esc(report.summary)}</p><details><summary>Dettagli e limiti</summary><pre>${esc(JSON.stringify(report.data, null, 2))}</pre></details></div>${reportBadge(report)}<button class="button secondary" data-export="${esc(report.id)}" aria-label="Esporta report ${esc(safeName(report.title))}">${icon("download")}JSON</button></article>`).join("")}</div>`;
  $("reports-list")
    .querySelectorAll("[data-export]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const report = reports.find((r) => r.id === button.dataset.export);
        if (report) downloadJson(report, `aegis-report-${report.id}.json`);
      }),
    );
}
$("export-all").addEventListener("click", () => {
  if (!reports.length) return;
  downloadJson(
    {
      application: "Aegis",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      scope:
        "Rapporti di controlli limitati. Non costituiscono certificazione di sicurezza del dispositivo.",
      reports,
    },
    `aegis-report-${new Date().toISOString().slice(0, 10)}.json`,
  );
});
$("remember-reports").addEventListener("change", (e) => {
  const requested = e.target.checked;
  try {
    if (requested) {
      localStorage.setItem(PREF_KEY, "true");
      remember = true;
      persist();
      if (remember)
        toast(
          "Memoria locale attiva. Fino a 30 report salvati solo in questo browser.",
        );
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREF_KEY);
      remember = false;
      toast(
        "Memoria locale disattivata. I report attuali restano solo nella sessione.",
      );
    }
  } catch {
    e.target.checked = remember;
    toast("Il browser non permette di aggiornare la memoria locale.");
  }
});
$("clear-reports").addEventListener("click", () => {
  if (reports.length) $("confirm-dialog").showModal();
});
$("confirm-cancel").addEventListener("click", () =>
  $("confirm-dialog").close(),
);
$("confirm-delete").addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    toast(
      "Impossibile eliminare i report persistenti: controlla la memoria del sito nel browser.",
    );
    return;
  }
  reports = [];
  sessionActivity = [];
  sessionFiles = [];
  $("confirm-dialog").close();
  updateDashboard();
  renderReports();
  $("file-results").innerHTML = "";
  toast("Report eliminati. Nessun file originale è stato modificato.");
});
window.addEventListener("beforeunload", (e) => {
  if (scanning) {
    e.preventDefault();
    e.returnValue = "";
  }
});
loadReports();
updateDashboard();
renderReports();
navigate();
