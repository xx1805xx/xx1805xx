# FORMA Club — Schede e coaching online

Concept interattivo in italiano per la vendita di servizi di allenamento: scheda singola, coaching mensile e percorso di 90 giorni. Nessuna vendita di prodotti fisici.

## Esperienza
- Tre piani confrontabili con prezzo complessivo, durata, prestazioni e rinnovo manuale.
- Percorso in tre passaggi: obiettivi e routine; canale del confronto; riepilogo e acquisto simulato.
- Messaggi, chiamata o videochiamata; scelta di una preferenza di data per i canali sincroni.
- Area personale con acquisti, consulenze modificabili, conversazione locale e scheda PDF di esempio.
- Interfaccia responsive, controlli da tastiera, dialoghi nativi e rispetto delle preferenze di movimento ridotto.

## Limiti
Pagamenti, ordini, appuntamenti e messaggi sono solo simulati. Nessuna autenticazione, email, chiamata o consegna personalizzata reale. Il PDF è uguale per tutti ed esplicitamente illustrativo. Prezzi, disponibilità e condizioni sono proposte dimostrative, non prestazioni acquistabili. I font sono Google Fonts con fallback di sistema; nessun tracker pubblicitario.

LocalStorage con chiave `forma_coaching_demo_v2`: nome di fantasia, scelte generali, ordini e messaggi demo. Non inserire dati sensibili. Non viene importato il carrello della precedente vetrina prodotti.

## Sviluppo
HTML/CSS/JS statici, nessuna installazione o compilazione. Percorsi relativi compatibili con GitHub Pages. Modificare `index.html`, `style.css`, `app.js`. Il PDF è generato dallo script `scripts/make_sample_pdf.py` (Python + reportlab), senza dipendenze client. Pubblicare l'intera cartella `forma-club`.
