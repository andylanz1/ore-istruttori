# Report Validazione Google Sheet

**Data**: 2026-03-05
**Sheet ID**: `1kEYyzKTAr3H2eTBH3lkoXvM50fRmOVshEoXQ5J7dSzg`

## Tab Anagrafica

**Header**: Nome, Cognome, email, Telefono

| # | Nome | Cognome | Telefono | Note |
|---|------|---------|----------|------|
| 1 | Stefano | Martire | +393494909018 | OK |
| 2 | Stefania | Mallardi | +393807851371 | OK |
| 3 | Eliseba | Malacrida | +393385660033 | OK |
| 4 | Carla | — | +393420218337 | Cognome mancante |
| 5 | Federica | Giani | +393459717019 | OK |
| 6 | Federica | Tirone | +393289418378 | OK |
| 7 | Vanessa | — | +393406660506 | Cognome mancante |
| 8 | Anna | — | +393479650503 | Cognome mancante |
| 9 | Rachele | Galbiati | +393299151421 | OK |

**Istruttori totali**: 9
**Telefoni formato +39**: 9/9
**Email compilate**: 0/9 (non bloccante per MVP)
**Colonne Indirizzo / Drive Folder ID**: assenti (non bloccanti per MVP)

## Tab 2026

**Header**: Nome, Cognome, Gen, Feb, Mar, Apr, Mag, Giu, Lug, Ago, Set, Ott, Nov, Dic, Notificato

| Nome | Cognome | Feb |
|------|---------|-----|
| Stefano | Martire | — |
| Stefania | Mallardi | 1855 |
| Eliseba | Malacrida | 650 |
| Carla | — | 250 |
| Federica | Giani | 500 |
| Federica | Tirone | 1830 |
| Vanessa | — | 1980 |
| Anna | — | — |
| Rachele | Galbiati | — |

**Istruttori con compenso Feb**: 6/9
**Colonna Notificato**: presente (utile per idempotenza, Task 32)

## Note per il workflow n8n

- Compenso vuoto o "-" = nessun compenso → escludere dal messaggio
- Il join Anagrafica ↔ 2026 avviene su Nome (+ Cognome se presente)
- Due "Federica" presenti → il join DEVE usare Nome+Cognome
- Colonna "Notificato" nel tab 2026: da usare per tracking idempotenza

## Esito

**Validazione**: SUPERATA
**Pronto per workflow n8n**: SI
