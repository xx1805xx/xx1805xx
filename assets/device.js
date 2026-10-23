"use strict";
(() => {
  let token = null,
    connected = false,
    polling = false,
    timer = null,
    lastReportId = null,
    latest = null,
    renderedKey = null;
  const statusText = {
    pass: "Verificato",
    info: "Informazione",
    warning: "Da rivedere",
    blocked: "Non disponibile",
    error: "Errore / incompleto",
    skipped: "Non eseguito",
  };
  const statusClass = (status) =>
    ["warning", "blocked", "skipped"].includes(status)
      ? "warning"
      : status === "error"
        ? "error"
        : "info";
  const isLocal = location.hostname === "127.0.0.1";
  function browserPlatform() {
    const ua = navigator.userAgent;
    const hint = navigator.userAgentData?.platform || navigator.platform || "";
    if (/iPhone|iPod/.test(ua)) return "iPhone · indicazione del browser";
    if (/iPad/.test(ua) || (/Mac/.test(hint) && navigator.maxTouchPoints > 1))
      return "Possibile iPad · indicazione del browser";
    if (/Android/.test(ua)) return "Android · indicazione del browser";
    if (/Mac/.test(hint)) return "Mac · indicazione del browser";
    if (/Win/.test(hint)) return "Windows · indicazione del browser";
    return "Dispositivo non identificato con certezza";
  }
  $("device-detected").textContent = browserPlatform();
  if (/iPhone|iPad/.test($("device-detected").textContent))
    $("platform-instructions").textContent =
      "Stai usando probabilmente iOS/iPadOS. Questo agente non funziona su iPhone o iPad e non può aggirare la protezione dei dati delle altre app. Prova il pacchetto su un Mac.";
  async function api(path, data) {
    const headers = { "X-Aegis-Token": token, "X-Aegis-Client": "local-ui" };
    if (data !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(path, {
      method: data === undefined ? "GET" : "POST",
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
      credentials: "omit",
      signal: AbortSignal.timeout(135000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }
  function renderReport(report, running) {
    const checks = report.checks || [];
    const hardware = checks.find((c) => c.id === "hardware");
    if (hardware?.evidence) {
      const values = hardware.evidence;
      $("device-detected").textContent =
        `${values.modelIdentifier || "Mac"} · ${values.chip || "Chip non rilevato"}`;
      $("device-detection-note").textContent =
        `macOS ${values.macOS || "non rilevato"} · build ${values.build || "non rilevata"} · ${values.architecture || "architettura non rilevata"}. Fonte: agente locale, non user-agent.`;
    }
    const counts = Object.keys(statusText)
      .map((status) => [
        status,
        checks.filter((c) => c.status === status).length,
      ])
      .filter(([, count]) => count);
    $("native-report").innerHTML =
      `<div class="native-report-heading"><div><h2>${running ? "Evidenze in arrivo" : "Il report del tuo Mac"}</h2><p>Ambito antivirus: ${esc(report.scope)} · avvio ${esc(date(report.startedAt))}<br>${running ? "Scansione in corso: questi esiti sono parziali." : report.complete ? "Procedura terminata. Consulta controlli non eseguiti e limitazioni; nessuna certificazione di sicurezza." : "Copertura incompleta o controlli non disponibili: nessun esito complessivo di sicurezza."}</p></div><button class="button secondary" id="native-export">${icon("download")}Esporta report ${running ? "parziale" : "JSON"}</button></div><div class="native-counts">${counts.map(([status, count]) => `<span class="badge ${statusClass(status)}">${count} ${esc(statusText[status])}</span>`).join("")}</div>${checks.map((c) => `<article class="panel native-check"><div class="native-check-heading"><span class="stat-icon ${["warning", "error", "blocked"].includes(c.status) ? "amber" : "green"}">${icon(c.status === "pass" ? "check" : "info")}</span><h3>${esc(c.title)}</h3><span class="badge ${statusClass(c.status)}">${esc(statusText[c.status] || "Sconosciuto")}</span></div><p>${esc(c.detail)}</p><details><summary>Evidenze tecniche</summary><pre>${esc(JSON.stringify(c.evidence, null, 2))}</pre></details></article>`).join("")}<article class="panel info-panel"><h3>Copertura dichiarata</h3><ul class="native-report-limits">${(report.limits || []).map((limit) => `<li>${esc(limit)}</li>`).join("")}</ul></article>`;
    $("native-export").addEventListener("click", () =>
      downloadJson(
        { ...report, exportedWhileRunning: running },
        `aegis-mac-${report.id}${running ? "-parziale" : ""}.json`,
      ),
    );
  }
  function render(state) {
    latest = state;
    const running = state.job.state === "running";
    $("agent-setup").hidden = state.supported;
    $("agent-controls").hidden = !state.supported;
    $("agent-status").textContent = state.supported
      ? "Agente locale collegato"
      : "Host non supportato";
    $("agent-version").textContent = `v${state.version} · test`;
    $("native-options-fields").disabled = running;
    $("native-start").hidden = running;
    $("native-cancel").hidden = !running;
    $("native-cancel").disabled = false;
    $("native-progress").hidden = !running;
    $("native-current").textContent = state.job.current;
    $("native-progress-note").textContent =
      `${state.job.report?.checks?.length || 0} controlli restituiti. Antivirus e aggiornamenti possono richiedere tempo; nessuna percentuale stimata.`;
    if (!state.supported)
      $("platform-instructions").textContent =
        "L’agente è raggiungibile ma questa macchina non è macOS. I controlli macOS sono disabilitati: non stai analizzando il tuo Mac da remoto.";
    if (state.selectedDirectory) {
      $("scope-selected").disabled = running;
      $("selected-directory").textContent = state.selectedDirectory;
    }
    if (state.job.report) {
      const key = `${state.job.report.id}:${state.job.report.checks.length}:${state.job.state}`;
      if (key !== renderedKey) {
        renderReport(state.job.report, running);
        renderedKey = key;
      }
      if (!running && state.job.report.id !== lastReportId) {
        lastReportId = state.job.report.id;
        const report = state.job.report;
        const limited =
          report.checks.some((c) =>
            ["error", "blocked", "warning"].includes(c.status),
          ) || state.job.state === "cancelled";
        if (
          !reports.some(
            (existing) =>
              existing.type === "device" && existing.data.id === report.id,
          )
        )
          addReport(
            "device",
            "Controlli del Mac",
            limited ? "warning" : "info",
            `${report.checks.length} esiti · ambito ${report.scope}`,
            report,
          );
      }
    }
  }
  async function poll() {
    if (!connected || polling) return;
    polling = true;
    try {
      render(await api("/api/state"));
    } catch {
      connected = false;
      $("agent-status").textContent = "Collegamento perso";
      $("native-start").disabled = true;
      $("native-cancel").disabled = true;
      $("native-progress").hidden = true;
      toast(
        "Collegamento con l’agente perso. I risultati possono essere parziali: riapri l’indirizzo mostrato nel suo Terminale.",
      );
    } finally {
      polling = false;
      if (connected)
        timer = setTimeout(poll, latest?.job.state === "running" ? 1000 : 5000);
    }
  }
  async function connect() {
    if (!isLocal) return;
    try {
      const response = await fetch("/api/session", {
        headers: { "X-Aegis-Client": "local-ui" },
        credentials: "omit",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const session = await response.json();
      if (typeof session.token !== "string") return;
      token = session.token;
      connected = true;
      await poll();
    } catch {
      /* The ordinary static development server has no native agent. */
    }
  }
  $("native-scan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!connected) {
      toast("Avvia prima l’agente sul Mac.");
      return;
    }
    $("native-start").disabled = true;
    clearTimeout(timer);
    try {
      const state = await api("/api/scan", {
        scope: document.querySelector('input[name="native-scope"]:checked')
          .value,
        scanMalware: $("native-malware").checked,
        updateSignatures: $("native-signatures").checked,
        appleUpdates: $("native-updates").checked,
      });
      render(state);
    } catch (error) {
      toast(error.message);
    } finally {
      $("native-start").disabled = !connected;
      if (connected) timer = setTimeout(poll, 500);
    }
  });
  $("native-cancel").addEventListener("click", async () => {
    $("native-cancel").disabled = true;
    try {
      await api("/api/cancel", {});
      toast(
        "Interruzione richiesta. Attendi la chiusura del processo in corso.",
      );
    } catch (error) {
      toast(error.message);
    }
  });
  $("choose-native-folder").addEventListener("click", async () => {
    $("choose-native-folder").disabled = true;
    try {
      const result = await api("/api/choose-directory", {});
      $("selected-directory").textContent = result.selectedDirectory;
      $("scope-selected").disabled = false;
      $("scope-selected").checked = true;
    } catch (error) {
      toast(error.message);
    } finally {
      $("choose-native-folder").disabled = false;
    }
  });
  $("copy-launch").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText('bash "Avvia Aegis.command"');
      toast("Comando copiato. Eseguilo nella cartella estratta sul Mac.");
    } catch {
      toast("Seleziona e copia il comando mostrato.");
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (latest?.job.state === "running") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  connect();
})();
