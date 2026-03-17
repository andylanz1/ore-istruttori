# Documentazione Tecnica — MVP Compensi WhatsApp

## Architettura

```
Google Sheet ──► n8n Workflow ──► Evolution API ──► WhatsApp
                     │
                     └──► Riepilogo WhatsApp ad Andrea
```

## Infrastruttura

| Componente | Dettaglio |
|------------|-----------|
| n8n | v2.9.2, Docker container `n8n-dcskgc44ok44k80scw8wkw4g` |
| VPS | `ubuntu@130.162.254.137` |
| n8n URL | https://n8n.andrealanzone.it |
| WhatsApp API | Evolution API `http://evolution-api:8080` (interno Docker) |
| Instance | `whatsapp-ipv4` |
| Google Sheet | ID `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg` |

## Workflow n8n

**ID**: `mvp-compensi-ozone`
**Nome**: "MVP Compensi Istruttori O-Zone"

### Pipeline (12 nodi funzionali)

| # | Nodo | Tipo | Funzione |
|---|------|------|----------|
| 1 | Avvia Workflow | manualTrigger | Avvio manuale dall'operatore |
| 2 | Leggi Compensi | googleSheets | Legge tab anno corrente (es. "2026") |
| 3 | Filtra Mese e Importo | code | Seleziona mese precedente, filtra righe senza importo, esclude già notificati (colonna "Notificato") |
| 4 | Leggi Anagrafica | googleSheets | Legge tab "Anagrafica" con telefoni |
| 5 | Componi Messaggio | code | Join Nome+Cognome, compone messaggio italiano |
| 6 | Check Umano (Approval) | wait | Pausa per approvazione operatore |
| 7 | Ripristina Dati | code | Recupera dati dopo resume del Wait node |
| 8 | Invio WhatsApp | httpRequest | POST a Evolution API per ogni istruttore |
| 9 | Riepilogo | code | Aggrega successi/fallimenti |
| 10 | Notifica Operatore | httpRequest | Invia riepilogo WhatsApp ad Andrea |
| 11 | Filtra Successi | code | Filtra solo invii riusciti per aggiornamento Sheet |
| 12 | Aggiorna Sheet | googleSheets | Scrive colonna "Notificato" per gli invii riusciti |

### Credenziali

| Credenziale | ID n8n | Uso |
|-------------|--------|-----|
| Google Sheets OAuth2 | `1XC3SunLRPTjtUwA` | Lettura sheet compensi e anagrafica |
| Evolution API key | (inline nel nodo) | Invio messaggi WhatsApp |

### Idempotenza

Il meccanismo anti-duplicati usa la colonna **"Notificato"** nel tab anno del Google Sheet:
- Dopo ogni invio riuscito, il nodo "Aggiorna Sheet" scrive il codice mese (es. `Feb`) nella colonna "Notificato"
- Il nodo "Filtra Mese e Importo" confronta il valore di "Notificato" con la colonna del mese target: se coincidono, l'istruttore viene saltato

**Per reinviare a un istruttore già notificato:**
1. Aprire il Google Sheet, tab anno corrente
2. Cancellare il valore nella colonna "Notificato" per quell'istruttore
3. Rieseguire il workflow

### Gestione errori

- **Invio WhatsApp** (`onError: "continueRegularOutput"`): se un messaggio fallisce, il workflow continua con gli altri
- **Riepilogo e Tracking**: classifica successi/fallimenti e traccia solo i successi
- **Notifica Operatore**: invia sempre il riepilogo, anche se parziale

## Comandi utili

```bash
# SSH alla VPS
ssh -i ~/Documents/ssh-key-2026-01-18.key ubuntu@130.162.254.137

# Export workflow
docker exec n8n-dcskgc44ok44k80scw8wkw4g n8n export:workflow --id=mvp-compensi-ozone

# Import workflow (da file locale)
cat workflow.json | docker exec -i n8n-dcskgc44ok44k80scw8wkw4g sh -c 'cat > /tmp/wf.json && n8n import:workflow --input=/tmp/wf.json'

# Lista workflow
docker exec n8n-dcskgc44ok44k80scw8wkw4g n8n list:workflow
```

## Backup

Il file JSON del workflow è versionato in:
`n8n/workflows/mvp-compensi-ozone.json`

## Manutenzione annuale

A gennaio di ogni anno:
1. Creare il nuovo tab nell'anno nel Google Sheet (es. "2027")
2. Il workflow legge automaticamente il tab in base a `$now.year`
3. Copiare le righe con Nome/Cognome dal tab dell'anno precedente
