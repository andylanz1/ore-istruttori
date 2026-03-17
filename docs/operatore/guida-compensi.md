# Guida Operatore — Notifica Compensi Istruttori

## Prerequisiti

Prima di avviare il workflow, verificare che:

1. I **compensi** del mese siano inseriti nel Google Sheet, tab dell'anno corrente (es. "2026")
2. I **numeri di telefono** siano aggiornati nel tab "Anagrafica" (formato +39...)
3. Il workflow elabora automaticamente il **mese precedente** (es. a marzo elabora febbraio)

## Procedura mensile

### 1. Inserire i compensi

- Aprire il [Google Sheet](https://docs.google.com/spreadsheets/d/1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg)
- Andare al tab dell'anno corrente (es. "2026")
- Inserire gli importi nella colonna del mese (es. "Feb" per febbraio)
- Lasciare vuoto o mettere "-" per chi non ha compenso

### 2. Avviare il workflow

- Aprire n8n: **https://n8n.andrealanzone.it**
- Selezionare il workflow **"MVP Compensi Istruttori O-Zone"**
- Cliccare **"Execute Workflow"** (pulsante play)

### 3. Verificare e approvare

Il workflow si ferma al nodo **"Check Umano (Approval)"** e mostra:
- Elenco istruttori con compenso
- Messaggio che verrà inviato a ciascuno

Per approvare:
- Nella UI di n8n, cliccare sul nodo "Check Umano (Approval)"
- Cliccare il pulsante **"Resume"** per confermare l'invio

### 4. Conferma

Dopo l'invio, ricevi un messaggio WhatsApp di riepilogo con:
- Numero di messaggi inviati con successo
- Eventuali errori (nome, telefono, causa)

## Formato messaggio inviato

Ogni istruttore riceve:

> Ciao {Nome}, il compenso di {mese} è di €{importo}. Emetti fattura. Grazie!

Esempio: *Ciao Stefania, il compenso di febbraio è di €1.855. Emetti fattura. Grazie!*

## Troubleshooting

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| "Nessun istruttore con compenso per {mese}" | Colonna del mese vuota nello sheet | Inserire i compensi nella colonna corretta |
| Istruttore non trovato in Anagrafica | Nome/Cognome non corrispondono tra i due tab | Verificare che Nome e Cognome siano identici |
| "Tutti gli istruttori sono già stati notificati" | Workflow già eseguito per questo mese | Normale — protezione anti-duplicati attiva |
| Messaggio non arrivato | Numero telefono errato o WhatsApp non attivo | Verificare il formato +39 in Anagrafica |
| Errore API WhatsApp | Servizio Evolution API non raggiungibile | Contattare supporto tecnico |

## Note importanti

- Il workflow ha una **protezione anti-duplicati**: se lo esegui due volte per lo stesso mese, la seconda volta salta gli istruttori già notificati
- Per **reinviare** a un istruttore già notificato, cancellare il valore nella colonna "Notificato" del tab anno nello Sheet per quell'istruttore
- Il mese target è sempre il **mese precedente** rispetto alla data di esecuzione
