# ore-istruttori

Sistema di gestione e distribuzione fogli ore per istruttori di un centro fitness (client: O-zone).

## Flusso MVP

1. **Input**: operatore inserisce compensi mensili nel Google Sheet (tab anno, es. "2026")
2. **Trigger**: avvio manuale workflow n8n
3. **Lettura**: n8n legge compensi (tab anno) + anagrafica dallo sheet
4. **Filtro**: seleziona mese precedente, filtra righe senza importo
5. **Composizione**: join anagrafica, messaggio preformato per ogni istruttore
6. **Idempotenza**: esclude istruttori già notificati (Static Data)
7. **Check umano**: revisione e approvazione via n8n (Wait node)
8. **Invio WhatsApp**: messaggio a ogni istruttore via Evolution API
9. **Riepilogo**: aggrega successi/fallimenti, aggiorna tracking
10. **Notifica operatore**: riepilogo via Telegram (@olisticzone_bot)

Template messaggio: `"Ciao {Nome}, il compenso di {mese} è di €{importo}. Emetti fattura. Grazie!"`

## Stack

- **Database**: Google Sheets (anagrafica + compensi mensili)
- **Automazione**: n8n v2.9.2 (lettura sheet, check umano, invio WhatsApp)
- **WhatsApp**: Evolution API (`http://evolution-api:8080/message/sendText/whatsapp-ipv4`)
- **Storage**: Google Drive (cartella per istruttore — per uso futuro con PDF)

## Infrastruttura n8n

- **VPS**: `ubuntu@130.162.254.137` (chiave SSH in global CLAUDE.md)
- **Container Docker**: `n8n-dcskgc44ok44k80scw8wkw4g`
- **URL**: `https://n8n.andrealanzone.it`
- **Workflow MVP**: ID `mvp-compensi-ozone` — "MVP Compensi Istruttori O-Zone"
- **Workflow WhatsApp**: ID `iJbFZk99OXfN4wHQ` — webhook `/whatsapp-andrea` (POST `{ number, text }`)
- **Backup locale**: `n8n/workflows/mvp-compensi-ozone.json`

## Google Sheet

- **ID**: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`
- **Tab "Anagrafica"**: Nome, Cognome, email, Telefono (+39...)
- **Tab per anno** (es. "2026"): Nome, Cognome, Gen...Dic (compensi in € interi), Notificato
- Valori compenso: numero intero (es. 1830) oppure vuoto/"-" = nessun compenso

## Roadmap

- **MVP**: Google Sheet → n8n (check umano) → WhatsApp con cifra da fatturare
- **v1.5**: lettura PDF automatica → popola Google Sheet
- **v2**: interfaccia web per inserimento manuale

## Documentazione

- Design: `docs/wip/mvp-compensi-whatsapp/design.md`
- Piano implementazione: `docs/wip/mvp-compensi-whatsapp/implementation.md`
- Guida operatore: `docs/operatore/guida-compensi.md`
- PRD: `.taskmaster/docs/prd.md`

## Task Master

Integrazione via MCP (`mcp__task-master-ai__*`). La CLI è in deny list — usare sempre gli strumenti MCP.
