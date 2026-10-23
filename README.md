# Aegis

**Novità: [agente macOS di test](native/README.md).** Dalla sezione “Il mio dispositivo” puoi scaricare il progetto, avviare `Avvia Aegis.command` sul Mac ed eseguire controlli nativi e una scansione ClamAV quando il motore è installato. Serve Python 3.9+. Il sito pubblico non accede al Mac da remoto. I controlli macOS richiedono ancora una prova su hardware reale; l'ambiente di sviluppo è Linux.

Sito statico in italiano per analisi locali limitate dei file, controlli del contesto del browser, ricerca di vulnerabilità di pacchetti e report esportabili. HTML, CSS e JavaScript nativi; nessun backend, account, tracker o dipendenza applicativa. Compatibile con GitHub Pages e i suoi sottopercorsi.

## Avvio

Dal checkout:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Aprire il sito tramite il server locale o un hosting HTTPS. Non aprire `index.html` con `file://`: Web Worker e Web Crypto richiedono un’origine compatibile. Per la pubblicazione, servire l’intero checkout statico, inclusi `assets/`. `.nojekyll` è già presente. La pubblicazione online resta un’operazione separata. `robots.txt` conserva la scelta preesistente di non indicizzare il sito; `404.html` è rimasto invariato.

## Funzionalità e limiti

- **File scelti dall’utente:** lettura di tutti i byte in blocchi di 1 MiB, massimo 50 file per analisi e 128 MiB per file. Il motore gira in un Web Worker e non modifica i file. Interruzione disponibile; un’analisi incompleta non produce un risultato completato.
- **Indicatori:** sequenza di test innocua EICAR (anche a cavallo dei blocchi), doppie estensioni, caratteri Unicode direzionali, intestazioni eseguibili mascherate e tre semplici pattern di comandi. File eseguibile non significa malware. Possibili falsi positivi e falsi negativi. Non è un motore antivirus né una sandbox di esecuzione.
- **SHA-256:** calcolato con Web Crypto fino a 32 MiB. Web Crypto richiede l’intero input in memoria; oltre questo limite la lettura e le regole proseguono, ma l’hash viene esplicitamente omesso. L’entropia è descrittiva, non un indicatore diagnostico.
- **Archivi:** si legge il contenitore senza decomprimerlo. Nessuna analisi dei file al suo interno, macro, firme digitali o documenti cifrati.
- **Browser:** contesto sicuro, test crittografico con risposta nota, policy CSP dichiarata dalla pagina, disponibilità dello storage di sessione e accessi sensibili richiesti dall’app. Non sono controlli di sistema, patch, permessi di altri siti o estensioni.
- **OSV:** l’utente inserisce ecosistema, pacchetto e versione. Una richiesta esplicita invia soltanto questi tre dati a `https://api.osv.dev/v1/query`. Nessun file viene inviato. La consultazione richiede accesso Internet e CORS supportato dal servizio. Errori di rete e risposte vuote sono distinti. Le versioni corrette sono estratte dagli intervalli dell’avviso e vanno verificate nella scheda originale. Non è un inventario automatico del dispositivo.
- **Report:** JSON esportabile, memoria di sessione di default, conservazione locale facoltativa fino a 30 report. I report possono contenere nomi, hash e versioni software: trattarli come informazioni private. La disattivazione elimina la copia persistente; la cancellazione richiede conferma e non tocca gli originali.

Un sito web **non può** fare una scansione forense bit per bit dell’intero disco, leggere memoria e processi arbitrari, rilevare tutti i virus, verificare ogni CVE del dispositivo, accertare furti o riparare danni. Queste attività richiedono strumenti installati, autorizzazioni adeguate e, nei casi seri, un professionista. L’interfaccia non simula queste capacità e non assegna punteggi di sicurezza inventati.

## Verifiche automatiche

Node.js e Python 3 sono necessari solo per il workflow di sviluppo/test; l’app pubblicata richiede soltanto un browser moderno.

```sh
npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/aegis-npm-cache
# Solo se non è disponibile /usr/bin/chromium o un altro Chromium locale:
npx playwright install chromium
npm run check
npm test
```

La suite avvia e termina un server di test indipendente sulla porta 8765. `AEGIS_TEST_PORT` cambia la porta; `CHROMIUM_PATH` seleziona un eseguibile Chromium. Le verifiche coprono lettura completa, SHA-256, firma di test fra blocchi, euristiche, limiti, interruzione, export, privacy, persistenza, cancellazione, API del browser, gestione sicura dei contenuti e layout da 360 a 1440 px. Le fixture EICAR sono costruite in memoria: nessun malware reale.

**I test OSV usano risposte simulate**, incluse assenza di corrispondenze, segnalazioni e rete indisponibile. La richiesta live a OSV è stata bloccata dal proxy di questo ambiente con HTTP 403: l’integrazione remota non è verificata dal vivo. Le funzioni locali restano indipendenti. Le schermate di controllo vengono scritte in `/tmp/aegis-desktop.png` e `/tmp/aegis-mobile.png`.

## Fonti consultabili

- [MDN: accesso ai file e consenso](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), consultata anche nel [repository ufficiale](https://github.com/mdn/content/blob/main/files/en-us/web/api/file_system_api/index.md).
- [MDN: digest Web Crypto e limite dell’input non streaming](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest), consultata nel [repository ufficiale](https://github.com/mdn/content/blob/main/files/en-us/web/api/subtlecrypto/digest/index.md).
- [EICAR: specifica e file di test innocuo](https://www.eicar.org/download-anti-malware-testfile/).
- [OSV: progetto e documentazione API](https://github.com/google/osv.dev).
- [NVD: catalogo CVE](https://nvd.nist.gov/vuln/search).

Manrope è distribuito localmente con [licenza SIL OFL](assets/OFL-Manrope.txt), dal repository Google Fonts. Nessun font è richiesto a servizi esterni durante l’uso.
