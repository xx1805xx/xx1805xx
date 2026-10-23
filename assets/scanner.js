"use strict";

// Indicators are deliberately small and auditable. This is not an antivirus engine.
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_HASH_BYTES = 32 * 1024 * 1024;
const CHUNK_BYTES = 1024 * 1024;
const EICAR = [
  "X5O!P%@AP[4",
  "\\PZX54(P^)7CC)7}$",
  "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
].join("");
const RULES = [
  {
    id: "encoded-powershell",
    pattern:
      /(?:powershell|pwsh)[^\r\n]{0,160}-(?:enc(?:odedcommand)?|e)\s+[a-z\d+/]{12}/i,
    title: "Comando PowerShell codificato",
    detail:
      "È presente una riga compatibile con l’esecuzione di un comando PowerShell codificato. Può avere usi legittimi: fai verificare il contesto prima di eseguirlo.",
  },
  {
    id: "download-execute",
    pattern:
      /(?:iex|invoke-expression)[^\r\n]{0,180}(?:downloadstring|invoke-webrequest)|(?:downloadstring|invoke-webrequest)[^\r\n]{0,180}(?:iex|invoke-expression)/i,
    title: "Possibile download ed esecuzione di codice",
    detail:
      "Una sequenza testuale combina download ed esecuzione di codice. È un indizio euristico, non una conferma di malware.",
  },
  {
    id: "shell-pipe",
    pattern:
      /(?:curl|wget)\s+[^\r\n]{1,240}\|\s*(?:sudo\s+)?(?:bash|sh|zsh)\b/i,
    title: "Download passato direttamente a una shell",
    detail:
      "Il testo contiene un comando che può eseguire subito contenuto scaricato. Verifica l’origine e leggi il codice prima di usarlo.",
  },
];

function formatOf(bytes) {
  const starts = (...values) => values.every((value, i) => bytes[i] === value);
  if (starts(0x4d, 0x5a))
    return {
      label: "Eseguibile DOS/Windows (intestazione MZ)",
      executable: true,
    };
  if (starts(0x7f, 0x45, 0x4c, 0x46))
    return { label: "Eseguibile o libreria ELF", executable: true };
  if (
    starts(0xcf, 0xfa, 0xed, 0xfe) ||
    starts(0xce, 0xfa, 0xed, 0xfe) ||
    starts(0xfe, 0xed, 0xfa, 0xcf) ||
    starts(0xfe, 0xed, 0xfa, 0xce)
  )
    return { label: "Eseguibile o libreria Mach-O", executable: true };
  if (starts(0xca, 0xfe, 0xba, 0xbe))
    return {
      label: "Classe Java o binario universale Mach-O",
      executable: true,
    };
  if (
    starts(0x50, 0x4b, 0x03, 0x04) ||
    starts(0x50, 0x4b, 0x05, 0x06) ||
    starts(0x50, 0x4b, 0x07, 0x08)
  )
    return { label: "Contenitore ZIP (contenuto non estratto)", archive: true };
  if (starts(0x1f, 0x8b))
    return { label: "Archivio GZIP (contenuto non estratto)", archive: true };
  if (
    starts(0x52, 0x61, 0x72, 0x21) ||
    starts(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)
  )
    return { label: "Archivio RAR/7z (contenuto non estratto)", archive: true };
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return { label: "Documento PDF" };
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return { label: "Immagine PNG" };
  if (starts(0xff, 0xd8, 0xff)) return { label: "Immagine JPEG" };
  if (starts(0x47, 0x49, 0x46, 0x38)) return { label: "Immagine GIF" };
  if (starts(0x00, 0x61, 0x73, 0x6d))
    return { label: "Modulo WebAssembly", executable: true };
  if (starts(0x23, 0x21))
    return { label: "Script con intestazione shebang", executable: true };
  return {
    label: bytes.length
      ? "Formato non identificato dall’intestazione"
      : "File vuoto",
  };
}

self.onmessage = async ({ data }) => {
  const file = data.file;
  try {
    if (!file || file.size > MAX_FILE_BYTES)
      throw new Error(
        "Limite di 128 MiB per file superato. Il file non è stato letto.",
      );
    const findings = [];
    const add = (id, level, title, detail) => {
      if (!findings.some((f) => f.id === id))
        findings.push({ id, level, title, detail });
    };
    if (/[\u202a-\u202e\u2066-\u2069]/.test(file.name))
      add(
        "bidi-name",
        "warning",
        "Caratteri direzionali nel nome",
        "Il nome contiene caratteri Unicode che possono alterare l’ordine visibile dell’estensione. Verifica il nome reale del file.",
      );
    if (
      /\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png|txt|zip)\.(?:exe|scr|com|bat|cmd|ps1|vbs|js|jse|hta|msi|lnk)$/i.test(
        file.name,
      )
    )
      add(
        "double-extension",
        "warning",
        "Doppia estensione potenzialmente ingannevole",
        "Il nome assomiglia a un documento, ma termina con un’estensione eseguibile o attiva. Non aprirlo senza verificarne la provenienza.",
      );
    const executableExtension =
      /\.(?:exe|dll|scr|com|bat|cmd|ps1|vbs|js|jse|wsf|msi|hta|sh|elf|apk|app|dmg|lnk)$/i.test(
        file.name,
      );
    const frequencies = new Uint32Array(256);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let tail = "",
      bytesRead = 0,
      format = null,
      first = true;
    const hashAvailable = file.size <= MAX_HASH_BYTES && !!self.crypto?.subtle;
    const hashChunks = [];
    const inspectText = (text) => {
      if (text.includes(EICAR))
        add(
          "eicar",
          "test",
          "Firma di test EICAR rilevata",
          "È presente la sequenza standard EICAR: un test antivirus innocuo, non un virus reale. La ricerca riguarda la sequenza nei byte letti e non i file dentro eventuali archivi.",
        );
      for (const rule of RULES)
        if (rule.pattern.test(text))
          add(rule.id, "warning", rule.title, rule.detail);
    };
    // Read bounded slices, including the final byte. Carry text across chunk boundaries.
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      const buffer = await file
        .slice(offset, Math.min(file.size, offset + CHUNK_BYTES))
        .arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (first) {
        format = formatOf(bytes);
        first = false;
      }
      for (let i = 0; i < bytes.length; i++) frequencies[bytes[i]]++;
      if (hashAvailable) hashChunks.push(bytes);
      const text = tail + decoder.decode(bytes, { stream: true });
      inspectText(text);
      tail = text.slice(-1024);
      bytesRead += bytes.length;
      self.postMessage({ type: "progress", bytesRead, total: file.size });
    }
    inspectText(tail + decoder.decode());
    if (bytesRead !== file.size)
      throw new Error("Lettura incompleta: il risultato non è valido.");
    format ||= formatOf(new Uint8Array());
    if (format.executable || executableExtension)
      add(
        "active-content",
        "info",
        "File potenzialmente eseguibile",
        "L’intestazione o l’estensione indica codice o un formato attivo. Questo dato, da solo, non implica la presenza di malware.",
      );
    if (
      format.executable &&
      /\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|txt)$/i.test(file.name)
    )
      add(
        "header-mismatch",
        "warning",
        "Intestazione attiva con estensione da documento",
        "I byte iniziali indicano un formato eseguibile o attivo, mentre l’estensione suggerisce un documento o un’immagine. Fai verificare il file.",
      );
    if (format.archive)
      add(
        "archive",
        "info",
        "Contenitore non decompresso",
        "I byte del contenitore sono stati letti, ma i file al suo interno non sono stati estratti o analizzati. Usa un antivirus per verificare il contenuto.",
      );
    let sha256 = null;
    if (hashAvailable) {
      const all = new Uint8Array(bytesRead);
      let pos = 0;
      for (const chunk of hashChunks) {
        all.set(chunk, pos);
        pos += chunk.length;
      }
      const digest = await crypto.subtle.digest("SHA-256", all);
      sha256 = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    }
    let entropy = 0;
    if (bytesRead)
      for (const frequency of frequencies)
        if (frequency) {
          const p = frequency / bytesRead;
          entropy -= p * Math.log2(p);
        }
    self.postMessage({
      type: "result",
      result: {
        name: file.name,
        size: file.size,
        mime: file.type || "Non dichiarato",
        bytesRead,
        complete: true,
        format: format.label,
        sha256,
        hashNote: sha256
          ? null
          : file.size > MAX_HASH_BYTES
            ? "SHA-256 non calcolato: limite di memoria di 32 MiB. La lettura e le regole hanno coperto tutti i byte."
            : "SHA-256 non disponibile: API crittografiche assenti in questo contesto.",
        entropy: Number(entropy.toFixed(3)),
        findings,
        rulesVersion: "aegis-local-1.0",
        limits: [
          "Non è un antivirus; le regole sono limitate e possono produrre falsi positivi e falsi negativi.",
          "Nessuna esecuzione, decompressione, scansione di memoria o verifica della firma digitale.",
          "Lettura completa dei byte dei soli file scelti; nessun accesso ai settori del disco.",
          "Nessun indicatore rilevato non certifica un file sicuro.",
        ],
      },
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message || "Impossibile leggere questo file.",
    });
  }
};
