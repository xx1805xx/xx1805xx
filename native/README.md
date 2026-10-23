# Agente macOS · prototipo di test

Questa versione aggiunge al sito un servizio locale per macOS, scritto con la libreria standard di Python. Non è una app firmata/notarizzata o un prodotto EDR. Non esegue scansioni remote e non garantisce l'assenza di compromissione. Il Mac dell'utente non è accessibile dall'ambiente cloud di sviluppo.

## Primo test sul Mac

1. Scarica lo [ZIP del progetto](https://github.com/xx1805xx/xx1805xx/archive/refs/heads/gh-pages.zip) ed estrailo.
2. Serve **Python 3.9 o successivo**. Se manca, installalo dal [sito ufficiale](https://www.python.org/downloads/macos/). Il launcher aggiunge al PATH i percorsi standard di Homebrew Apple Silicon e Intel; non installa alcun software.
3. Nella cartella estratta avvia `Avvia Aegis.command`. Oppure apri il Terminale in quella cartella ed esegui:

   ```sh
   bash "Avvia Aegis.command"
   ```

4. Il Terminale resta aperto e il browser apre automaticamente **l'interfaccia locale dell'agente**. Se non si apre, usa l'indirizzo mostrato dal Terminale. La pagina pubblica non può controllare direttamente l'agente; non c'è un servizio in cloud che riceve i risultati.
5. Scegli Download, cartella utente o una cartella dal selettore nativo; premi **Scansiona il Mac**.
6. Leggi gli esiti e i controlli non disponibili. Esporta il report JSON per conservarlo. Per fermare l'agente premi **Ctrl+C** nel suo Terminale.

Non disabilitare Gatekeeper o altre protezioni per eseguire il test. Il codice è leggibile; per una distribuzione normale serviranno un'app firmata e notarizzata e un installer. Non c'è ancora un pacchetto autonomo senza Python.

### Motore antivirus facoltativo

I controlli di configurazione funzionano senza ClamAV. La scansione antivirus richiede **ClamAV e firme disponibili**. Se usi già [Homebrew](https://brew.sh/):

```sh
brew install clamav
```

Avvia di nuovo l'agente. Lascia selezionato “Aggiorna le firme”: FreshClam usa una configurazione temporanea controllata da Aegis e scarica le firme ufficiali in `~/Library/Application Support/Aegis/clamav`. Le configurazioni Homebrew non vengono sovrascritte. L'aggiornamento può scaricare centinaia di MB e richiede accesso ai servizi ClamAV, incluso `database.clamav.net`. La verifica di firme/checksum non viene disattivata. Un errore di verifica blocca la scansione.

L'agente non installa Homebrew, Python o ClamAV e non chiede `sudo`. Se il motore manca o le firme non sono disponibili il report dice **Non disponibile**, non “nessun virus”. Un aggiornamento fallito per problemi di rete può lasciare utilizzabili firme preesistenti: in quel caso l'esito dichiara l'aggiornamento fallito e non garantisce l'attualità delle firme. La data di modifica dei file database non è una prova della loro data di pubblicazione.

## Controlli implementati

| Controllo           | Fonte                                                 | Significato e limite                                                                                                                                    |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardware e macOS    | `sysctl`, `sw_vers`, architettura del processo Python | Modello identificativo, chip e build letti dal sistema; nessun seriale o UUID. Su Rosetta l'architettura del processo può differire da quella del chip. |
| FileVault           | `fdesetup status`                                     | Stato della cifratura, non presenza di malware.                                                                                                         |
| Gatekeeper          | `spctl --status`                                      | Stato dichiarato delle valutazioni. Errori o formati non riconosciuti restano errori.                                                                   |
| SIP                 | `csrutil status`                                      | Configurazioni personalizzate richiedono verifica; non vengono dichiarate pienamente attive.                                                            |
| Firewall            | `socketfilterfw --getglobalstate`                     | Stato del firewall applicativo; nessuna prova della raggiungibilità da Internet.                                                                        |
| TCP in ascolto      | `lsof` con output strutturato `-Fpcn`                 | Solo socket visibili all'utente. Un servizio non loopback può essere legittimo e protetto dalla rete; UDP non incluso.                                  |
| Avvio automatico    | Plist in tre cartelle LaunchAgents/LaunchDaemons      | Inventario parziale, non classificazione malware. Comandi e argomenti dei plist non vengono raccolti, perché possono contenere segreti.                 |
| XProtect            | Info.plist dei bundle in percorsi conosciuti          | Presenza/versione, non verifica dell'aggiornamento o scansione avviata da XProtect.                                                                     |
| Aggiornamenti Apple | `softwareupdate --list`, solo se selezionato          | Consultazione online senza installazione o mappatura automatica delle CVE.                                                                              |
| Antivirus           | ClamAV nella cartella scelta                          | Firme ufficiali e motore installato dall'utente; nessuna rimozione. Esiti, errori, conteggi e limiti conservati nel report.                             |

Il report distingue **verificato, informazione, da rivedere, non disponibile, errore e non eseguito**. `complete` indica il completamento della procedura senza controlli bloccati/in errore, non una scansione esaustiva o un Mac sicuro. Un controllo non selezionato è esplicitamente saltato. Anche con tutti gli esiti positivi restano fuori memoria, settori raw, tutte le CVE, tutte le tecniche di persistenza, injection, esfiltrazione e corruzione di file senza una baseline.

ClamAV è limitato a 128 MiB per file, 512 MiB per contenitore espanso, 120 secondi per contenitore e un'ora totale. Sono esclusi i collegamenti simbolici e quanto macOS non permette di leggere. I limiti segnalati, output troncati, letture negate, zero file o errori del motore impediscono un esito positivo complessivo. I database e gli archivi possono avere ulteriori limiti del motore. Una sequenza EICAR è un test innocuo, non un virus reale. Le segnalazioni richiedono verifica e nessun file viene cancellato, spostato o modificato.

## Protocollo e confine di fiducia

- Ascolto solo su **127.0.0.1**, porta libera scelta dal sistema. Nessun accesso da LAN o Internet.
- UI servita dall'agente stesso; nessun CORS verso la pagina pubblica. Bootstrap con header dedicato, token casuale per processo e header di autenticazione sulle API operative.
- Host esatto, Origin e Fetch Metadata verificati contro richieste esterne e DNS rebinding. Le pagine locali non possono essere incorporate in frame.
- Il token resta in memoria JavaScript e non finisce in URL, log o localStorage. Il servizio non difende da malware già attivo con accesso al processo dell'utente o da codice compromesso nell'app stessa.
- Nessuna shell nelle API e nessun endpoint per eseguire comandi arbitrari. Il client sceglie un ambito enumerato; le cartelle personalizzate arrivano solo dal selettore macOS attivato dall'utente.
- Output e durata dei processi limitati, una scansione per volta, processi appartenenti all'agente terminati in caso di interruzione/timeout. Nessun daemon o avvio automatico installato.
- Solo risorse UI in una allowlist vengono servite. `.git`, codice nativo e file arbitrari non sono esposti dal server locale.
- Report in memoria di default; il salvataggio nel browser è facoltativo. Nomi di file e indirizzi nei report possono essere privati: valutali prima di condividerli. Nessun upload automatico.

## Stato delle verifiche

Il protocollo HTTP, i limiti e l'interruzione di subprocessi sono testati realmente nell'ambiente Linux. I comandi macOS e gli esiti ClamAV sono testati con **fixture simulate**: questo non dimostra una scansione reale su macOS, compatibilità con un chip specifico o rilevamento reale di malware. Il primo test sul Mac dell'utente è ancora necessario. Nessuna fixture viene usata come risultato nell'app in esecuzione.

```sh
npm test
# Oppure solo il backend, senza dipendenze npm:
python3 -m unittest discover -s tests -p 'test_agent.py' -v
```

## Prima di renderlo un prodotto

Servono test su Mac reali e versioni macOS supportate, packaging firmato e notarizzato, un meccanismo di aggiornamento firmato, revisione indipendente del protocollo e delle dipendenze, gestione esplicita di Full Disk Access quando utile e policy per i dati. Per Windows e Android occorrono implementazioni dedicate. Non si può estendere questa architettura a una scansione completa di iOS aggirando la sandbox.

I controlli producono oggetti con id, stato, evidenza e limiti: possono diventare moduli separati per piattaforma senza cambiare il contratto del report. L'eventuale raccolta centralizzata dei report deve essere un servizio distinto, con autenticazione, isolamento dei clienti, consenso, cifratura e retention; non è presente né attiva in questo prototipo.

Riferimenti dei comandi ClamAV: [clamscan](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamscan.1.in) e [freshclam](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/freshclam.1.in), consultati dai sorgenti ufficiali.
