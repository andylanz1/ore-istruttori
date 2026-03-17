# Piano di Implementazione: MVP Compensi + WhatsApp

## Prerequisiti

- Accesso al Google Sheet `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`
- Credenziali Google Sheets configurate su n8n (OAuth2)
- Accesso a n8n del cliente (VPS `ubuntu@130.162.254.137`)
- Workflow WhatsApp esistente su n8n (da collegare o replicare la logica)

## Task 1: Struttura Google Sheet

Verificare che lo sheet contenga:
- Tab "Anagrafica" con colonne: Nome, Cognome, Email, Telefono (+39...), Indirizzo, Drive Folder ID
- Tab "2026" con colonne: Nome, Cognome, Gen, Feb, Mar, Apr, Mag, Giu, Lug, Ago, Set, Ott, Nov, Dic
- Dati dei ~9 istruttori popolati in entrambi i tab
- Compensi di febbraio inseriti nel tab "2026"

## Task 2: Workflow n8n — Lettura Sheet

Creare un nuovo workflow su n8n:

1. **Manual Trigger** — avvio manuale dall'operatore
2. **Google Sheets node** — leggere il tab dell'anno corrente
   - Configurare credenziali OAuth2 per Google Sheets
   - Sheet ID: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`
   - Tab name: espressione `{{ $now.year }}` (restituisce "2026")
3. **Code node** — determinare il mese target e filtrare
   - Mappare il numero del mese al nome colonna (1→"Gen", 2→"Feb"...)
   - Estrarre il valore della colonna mese per ogni riga
   - Filtrare via le righe senza importo

Nota: valutare se usare il mese corrente o il mese precedente come default. L'operatore inserisce i compensi a inizio mese per il mese precedente, quindi probabilmente serve il mese precedente.

## Task 3: Workflow n8n — Join Anagrafica

4. **Google Sheets node** — leggere tab "Anagrafica"
5. **Merge node** o **Code node** — join su Nome+Cognome
   - Da Compensi: nome, cognome, importo
   - Da Anagrafica: telefono, email
   - Output: oggetto unificato per ogni istruttore

## Task 4: Workflow n8n — Composizione messaggio

6. **Code node** o **Set node** — per ogni istruttore, comporre:
   - Campo `messaggio`: `"Ciao {Nome}, il compenso di {mese} è di €{importo}. Emetti fattura. Grazie!"`
   - Campo `telefono`: dal join con anagrafica
   - Il nome del mese deve essere in italiano e minuscolo ("febbraio", "marzo"...)

## Task 5: Workflow n8n — Check umano

7. **Wait/Form node** — presentare riepilogo all'operatore
   - Opzione A: `Wait for Webhook` con form HTML custom
   - Opzione B: `n8n Form Trigger` (se supportato dalla versione)
   - Opzione C: invio email/messaggio riepilogativo con link approve/reject
   - Mostrare: tabella con Nome, Importo, Messaggio per ogni istruttore
   - L'operatore approva o esclude singoli istruttori

## Task 6: Workflow n8n — Invio WhatsApp

8. **WhatsApp node** o **HTTP Request node** — inviare messaggio
   - Collegare al workflow WhatsApp già esistente, oppure:
   - Configurare WhatsApp Business API direttamente
   - Loop su ogni istruttore approvato
   - Inviare il messaggio preformato al numero di telefono

Verificare con il cliente: quale provider WhatsApp viene usato? (WhatsApp Business API, Twilio, 360dialog, WABA...)

## Task 7: Test end-to-end

- Inserire un compenso test nello sheet
- Avviare il workflow
- Verificare che il messaggio arrivi correttamente
- Verificare formattazione importo (separatore migliaia, simbolo €)
- Verificare gestione mese corretto

## Note implementative

- **Mese target**: l'operatore di solito inserisce a inizio mese N i compensi del mese N-1. Valutare se aggiungere un parametro input per specificare il mese, invece di calcolarlo automaticamente.
- **Formattazione importo**: usare il punto come separatore migliaia (€1.830) come da uso italiano.
- **Errori WhatsApp**: loggare gli errori di invio e notificare l'operatore. Non fallire silenziosamente.
- **Idempotenza**: il workflow può essere rieseguito senza doppioni? Valutare un meccanismo (es. campo "notificato" nascosto, o check log esecuzioni precedenti).
