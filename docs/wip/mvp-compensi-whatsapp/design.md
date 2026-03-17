# Design: MVP Compensi Istruttori + Notifica WhatsApp

## Obiettivo

Automatizzare la notifica dei compensi mensili agli istruttori del centro fitness O-Zone via WhatsApp, partendo da un Google Sheet compilato manualmente.

## Architettura

```
Google Sheet (input manuale)
        |
   n8n workflow
   ├── 1. Trigger manuale
   ├── 2. Leggi compensi (tab anno corrente)
   ├── 3. Filtra righe con importo presente
   ├── 4. Leggi anagrafica (tab Anagrafica)
   ├── 5. Join + componi messaggio
   ├── 6. Check umano (approval)
   └── 7. Invio WhatsApp per ogni istruttore approvato
```

## Google Sheet

**Spreadsheet ID**: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`

### Tab "Anagrafica" (fisso)

| Colonna | Tipo | Note |
|---|---|---|
| Nome | testo | |
| Cognome | testo | |
| Email | testo | |
| Telefono | testo | Formato internazionale `+39...` (richiesto da API WhatsApp) |
| Indirizzo | testo | |
| Drive Folder ID | testo | Per uso futuro (v1.5, upload PDF in cartella personale) |

### Tab per anno (es. "2026", "2027"...)

| Colonna | Tipo | Note |
|---|---|---|
| Nome | testo | Chiave join con Anagrafica |
| Cognome | testo | Chiave join con Anagrafica |
| Gen...Dic | numero | Compenso in € (intero). Cella vuota = niente da notificare |

Ogni anno un nuovo tab. n8n legge il tab con nome = anno corrente (`{{$now.year}}`).

## Workflow n8n — dettaglio nodi

### Nodo 1: Manual Trigger
- Tipo: `Manual Trigger`
- L'operatore avvia quando ha finito di inserire i compensi nel tab

### Nodo 2: Leggi Compensi
- Tipo: `Google Sheets` (Read)
- Spreadsheet: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`
- Tab: dinamico, nome = anno corrente
- Restituisce tutte le righe con Nome, Cognome, e colonne mese

### Nodo 3: Determina mese corrente + Filtra
- Tipo: `Code` (JavaScript)
- Logica:
  - Determina il nome della colonna mese corrente (o mese precedente, a seconda di quando si esegue)
  - Per ogni riga, estrae il valore della colonna del mese target
  - Filtra via le righe dove il compenso è vuoto/null/0

### Nodo 4: Leggi Anagrafica
- Tipo: `Google Sheets` (Read)
- Tab: "Anagrafica"
- Restituisce Nome, Cognome, Telefono, Email per ogni istruttore

### Nodo 5: Join + Componi messaggio
- Tipo: `Merge` + `Code`
- Join su Nome + Cognome tra dati compensi e anagrafica
- Per ogni istruttore costruisce:
  - `telefono`: numero dal tab Anagrafica
  - `messaggio`: `"Ciao {Nome}, il compenso di {mese} è di €{importo}. Emetti fattura. Grazie!"`
  - `importo`: valore dal tab Compensi

### Nodo 6: Check umano
- Tipo: `Wait` (webhook approval) o `Form` node
- Mostra riepilogo: lista istruttori con nome, importo, messaggio
- L'operatore può approvare tutto, o escludere singoli istruttori

### Nodo 7: Invio WhatsApp
- Tipo: da definire (WhatsApp Business API node, o sub-workflow esistente)
- Per ogni istruttore approvato, invia il messaggio al numero di telefono
- Nota: il workflow WhatsApp è già esistente su n8n del cliente

## Template messaggio WhatsApp

```
Ciao {Nome}, il compenso di {mese} è di €{importo}. Emetti fattura. Grazie!
```

Esempi:
- "Ciao Federica, il compenso di febbraio è di €1830. Emetti fattura. Grazie!"
- "Ciao Stefano, il compenso di febbraio è di €850. Emetti fattura. Grazie!"

## Prevenzione doppioni

La logica anti-doppioni è gestita internamente da n8n (es. variabile di stato, o log delle esecuzioni), non sullo sheet. Lo sheet resta pulito per l'inserimento manuale.

## Roadmap futura

- **v1.5**: aggiunta processing PDF che popola automaticamente il tab compensi
- **v2**: interfaccia web per inserimento manuale che scrive sullo stesso sheet
- Entrambe le evoluzioni scrivono sullo stesso Google Sheet — il workflow n8n non cambia
