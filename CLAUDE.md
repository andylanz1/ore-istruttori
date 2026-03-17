# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Progetto

**ore-istruttori** — sistema di gestione e distribuzione fogli ore per istruttori di un centro fitness (client: O-zone).

### Flusso MVP

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

### Dati gestiti

- **Google Sheet centrale**: anagrafica istruttori + compenso mensile per ognuno
- Il compenso viene inserito manualmente nello sheet (MVP), in futuro da PDF o interfaccia web
- n8n legge lo sheet, presenta i dati per check umano, poi invia WhatsApp

### Stack tecnologico

- **Database centrale**: Google Sheets (anagrafica + compensi mensili)
- **Automazione**: n8n v2.9.2 (lettura sheet, check umano, invio WhatsApp)
- **WhatsApp**: Evolution API (`http://evolution-api:8080/message/sendText/whatsapp-ipv4`)
- **Storage**: Google Drive (cartella per istruttore — per uso futuro con PDF)

### Infrastruttura n8n

- **VPS**: `ubuntu@130.162.254.137` (chiave SSH in global CLAUDE.md)
- **Container Docker**: `n8n-dcskgc44ok44k80scw8wkw4g`
- **URL**: `https://n8n.andrealanzone.it`
- **Workflow MVP**: ID `mvp-compensi-ozone` — "MVP Compensi Istruttori O-Zone"
- **Workflow WhatsApp**: ID `iJbFZk99OXfN4wHQ` — webhook `/whatsapp-andrea` (POST `{ number, text }`)
- **Backup locale workflow**: `n8n/workflows/mvp-compensi-ozone.json`
- **Comandi utili**:
  - Export: `docker exec n8n-dcskgc44ok44k80scw8wkw4g sh -c 'n8n export:workflow --id=<ID> --pretty --output=/tmp/wf.json 2>/dev/null'`
  - Import: pipe JSON in `docker exec -i n8n-dcskgc44ok44k80scw8wkw4g sh -c 'cat > /tmp/wf.json && n8n import:workflow --input=/tmp/wf.json'`

### Roadmap

- **MVP**: Google Sheet (compensi manuali) → n8n (check umano) → WhatsApp con cifra da fatturare
- **v1.5**: lettura PDF automatica → popola lo stesso Google Sheet
- **v2**: interfaccia web per inserimento manuale → popola lo stesso Google Sheet

### Google Sheet

- **ID**: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`
- **Tab "Anagrafica"**: Nome, Cognome, email, Telefono (+39...)
- **Tab per anno** (es. "2026"): Nome, Cognome, Gen...Dic (compensi in € interi), Notificato
- Valori compenso: numero intero (es. 1830) oppure vuoto/"-" = nessun compenso

### Principio architetturale

Google Sheet come hub centrale: tutti gli input (manuali, PDF, web) scrivono sullo sheet, n8n legge sempre dallo sheet. Modularità in ottica espansione.

### Documentazione

- Design: `docs/wip/mvp-compensi-whatsapp/design.md`
- Piano implementazione: `docs/wip/mvp-compensi-whatsapp/implementation.md`
- Validation report: `docs/wip/mvp-compensi-whatsapp/validation-report.md`
- Documentazione tecnica: `docs/wip/mvp-compensi-whatsapp/technical-docs.md`
- Piano test E2E: `docs/wip/mvp-compensi-whatsapp/test-plan.md`
- Guida operatore: `docs/operatore/guida-compensi.md`
- PRD: `.taskmaster/docs/prd.md`

## Struttura

Questo è un progetto-template per sviluppo AI-driven. Non è ancora un'applicazione tradizionale con build/test/lint. L'infrastruttura è composta da:

- `.claude/` — configurazione Claude Code (settings, comandi slash, agenti, script hooks)
- `.taskmaster/` — Task Master AI (config modelli, task database, docs, report)
- `.serena/` — analisi codebase con language server (TypeScript + Python abilitati)

## Task Master

Il workflow di sviluppo è guidato da Task Master. Comandi principali via slash:

```
/tm:list              # Lista task
/tm:next              # Prossimo task da lavorare
/tm:show <id>         # Dettaglio task
/tm:expand <id>       # Suddividi in subtask
/tm:set-status        # Aggiorna stato (pending/in-progress/done/review/deferred/cancelled)
/tm:parse-prd <file>  # Genera task da PRD
/tm:analyze-complexity # Analisi complessità
```

Equivalenti MCP: `get_tasks()`, `next_task()`, `get_task(id)`, `set_task_status(id, status)`, `expand_task(id)`.

## Modelli AI configurati

| Ruolo    | Modello     | Temp | Note              |
|----------|-------------|------|-------------------|
| main     | sonnet  | 0.2  | Task quotidiani   |
| research | opus    | 0.1  | Analisi approfondita |
| fallback | sonnet  | 0.2  | —                 |

## Convenzioni

- **Lingua**: comunicare in italiano. Inglese solo per nomi tecnici, comandi, codice.
- **Language server attivi**: TypeScript, Python (via Serena).
- **Hook pre-tool**: ogni comando Bash viene validato da `.claude/scripts/validate-bash.sh`.
- **Comandi Bash negati**: `rm` e `task-master` (usare gli MCP tools invece della CLI diretta).
- **CoVe** (`/cove`): disponibile per auto-verifica risposte su domande complesse (4 step: risposta iniziale → domande verifica → verifica indipendente → riconciliazione).

## Permessi e sicurezza

File e cartelle bloccati in lettura (vedi `.claude/settings.json` deny list): `.env`, `service-account-key.json`, `node_modules/`, `dist/`, `build/`, `venv/`, `__pycache__/`, `.git/`, file `.lock`, `.csv`, `.log`.
