# Piano di Test E2E — MVP Compensi WhatsApp

## Test 1: Happy Path

**Obiettivo**: Verificare il flusso completo con dati reali.

1. Verificare che lo sheet abbia compensi per febbraio (colonna "Feb")
2. Aprire n8n → workflow "MVP Compensi Istruttori O-Zone"
3. Click "Execute Workflow"
4. Verificare che il nodo "Filtra Mese e Importo" produca 6 item (6 istruttori con compenso Feb)
5. Verificare che "Componi Messaggio" mostri nome, telefono, messaggio per ciascuno
6. Al nodo "Check Umano", verificare il riepilogo e cliccare "Resume"
7. Verificare che i messaggi WhatsApp arrivino agli istruttori
8. Verificare che il riepilogo arrivi ad Andrea (393279451839)

**Risultato atteso**: 6 messaggi inviati, riepilogo "6/6 inviati"

## Test 2: Mese vuoto

**Obiettivo**: Verificare che il workflow gestisca correttamente un mese senza compensi.

1. Assicurarsi che la colonna "Mar" (marzo) sia vuota per tutti
2. Impostare temporaneamente il mese target a marzo (o eseguire ad aprile)
3. Il workflow deve fermarsi con errore: "Nessun istruttore con compenso per marzo"

**Risultato atteso**: Errore chiaro, nessun invio

## Test 3: Dati parziali

**Obiettivo**: Verificare che vengano notificati solo gli istruttori con compenso.

1. Già verificabile con i dati reali di febbraio: 6/9 istruttori hanno compenso
2. Eseguire il workflow
3. Verificare che solo 6 messaggi vengano composti (non 9)

**Risultato atteso**: Solo gli istruttori con importo > 0 ricevono il messaggio

## Test 4: Idempotenza

**Obiettivo**: Verificare che una seconda esecuzione non invii duplicati.

1. Eseguire il workflow per febbraio (dopo Test 1)
2. Rieseguire lo stesso workflow
3. Il nodo "Check Idempotenza" deve bloccare con: "Tutti gli istruttori sono già stati notificati"

**Risultato atteso**: Nessun invio duplicato, errore chiaro

## Test 5: Recupero errori

**Obiettivo**: Verificare che un errore su un numero non blocchi gli altri invii.

1. In Anagrafica, inserire temporaneamente un numero non valido (es. "000") per un istruttore
2. Eseguire il workflow e approvare
3. Verificare che gli altri messaggi vengano inviati
4. Verificare che il riepilogo mostri il fallimento con dettaglio dell'errore
5. Ripristinare il numero corretto

**Risultato atteso**: N-1 successi, 1 fallimento nel riepilogo

## Checklist pre-produzione

- [ ] Test 1 superato
- [ ] Test 2 superato
- [ ] Test 3 superato
- [ ] Test 4 superato
- [ ] Test 5 superato
- [ ] Formato importo corretto (€1.855, non €1855)
- [ ] Nome mese in italiano minuscolo ("febbraio")
- [ ] Messaggio riepilogo operatore ricevuto
- [ ] Guida operatore revisionata con cliente
