// sync-lezioni-gruppo.js — Sync group class lessons from DBGym to ore-istruttori
// Runs inside n8n container: node /tmp/sync-lezioni-gruppo.js [YYYY-MM-DD] [YYYY-MM-DD]
// If no dates given, syncs yesterday only
//
// Queries DBGym via mcp-dbgym REST API
// Env vars: SYNC_API_KEY, APP_HOST, DBGYM_API_URL, DBGYM_API_KEY

const http = require("http");

const SYNC_API_KEY = process.env.SYNC_API_KEY;
const APP_HOST = process.env.APP_HOST || "ore-istruttori:3000";
const DBGYM_API_URL = process.env.DBGYM_API_URL || "http://mcp-dbgym:3100";
const DBGYM_API_KEY = process.env.DBGYM_API_KEY;

if (!SYNC_API_KEY || !DBGYM_API_KEY) {
  console.error("SYNC_API_KEY and DBGYM_API_KEY env vars required");
  process.exit(1);
}

// Default: yesterday
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const dateFrom = process.argv[2] || yesterday();
const dateTo = process.argv[3] || dateFrom;

// DBGym corso → app attivita mapping
const CORSO_MAP = {
  "STUDIO 1 REFORMER": "Pilates Sala 1",
  "STUDIO 2 REFORMER": "Pilates Sala 2",
  "IN-TRINITY": "In-Trinity",
  "WBS POSTURALE": "WBS",
  "PILOGA": "Piloga",
  "SHAPE & TONE": "Functional",
  "EASY STUDIO 1": "Easy Reformer",
  "EASY STUDIO 2": "Easy Reformer",
  "WBS EASY POSTURALE": "Easy WBS",
  "ESTATE REFORMER": "Pilates Sala 1",
  "ESTATE WBS": "WBS",
};

const sql = `
SELECT
  CONVERT(VARCHAR(10), CAST(pi.DataInizio AS DATE), 23) AS data,
  CONVERT(VARCHAR(5), pi.DataInizio, 108) AS oraInizio,
  pl.Descrizione AS corso_dbgym,
  pll.Note AS istruttore_note,
  COUNT(DISTINCT pi.IDUtente) AS partecipanti
FROM dbgym.dbo.PrenotazioniIscrizione pi
INNER JOIN dbgym.dbo.PrenotazioniLezioni pll
    ON pi.IDPrenotazioneLezione = pll.IDPrenotazioneLezione
INNER JOIN dbgym.dbo.Prenotazioni pl
    ON pi.IDPrenotazione = pl.IDPrenotazione
WHERE CAST(pi.DataInizio AS DATE) >= '${dateFrom}'
  AND CAST(pi.DataInizio AS DATE) <= '${dateTo}'
  AND pi.IDUtente IS NOT NULL
  AND pi.IDPrenotazione <> 172
  AND pl.Attivo <> 0
  AND NOT EXISTS (
    SELECT 1 FROM dbgym.dbo.PrenotazioniIscrizione blocco
    WHERE blocco.IDPrenotazioneLezione = pi.IDPrenotazioneLezione
      AND CAST(blocco.DataInizio AS DATE) = CAST(pi.DataInizio AS DATE)
      AND blocco.IDUtente IS NULL
      AND blocco.Note LIKE '%Blocco%'
  )
GROUP BY CONVERT(VARCHAR(10), CAST(pi.DataInizio AS DATE), 23),
         CONVERT(VARCHAR(5), pi.DataInizio, 108),
         pl.Descrizione,
         pll.Note
ORDER BY data, oraInizio
`;

function queryDbgym() {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/query", DBGYM_API_URL);
    const body = JSON.stringify({ sql });
    const opts = {
      hostname: url.hostname,
      port: parseInt(url.port) || 3100,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DBGYM_API_KEY}`,
      },
    };

    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", (chunk) => (d += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(d);
          if (res.statusCode >= 400) {
            reject(new Error(`dbgym API ${res.statusCode}: ${parsed.error || d}`));
          } else {
            resolve(parsed.rows);
          }
        } catch {
          reject(new Error(`dbgym API parse error: ${d}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function postSync(data, items) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ data, items });
    const req = http.request(
      {
        hostname: APP_HOST.split(":")[0],
        port: parseInt(APP_HOST.split(":")[1]) || 3000,
        path: "/api/sync-lezioni",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SYNC_API_KEY,
        },
      },
      (res) => {
        let d = "";
        res.on("data", (chunk) => (d += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve(d);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`Sync lezioni gruppo ${dateFrom} → ${dateTo}`);
  const rows = await queryDbgym();
  console.log(`DBGym returned ${rows.length} rows`);

  if (rows.length === 0) {
    console.log("Nessuna lezione trovata nel range.");
    return;
  }

  // Map and group by date
  const byDate = {};
  let unmapped = 0;

  for (const row of rows) {
    const attivita = CORSO_MAP[row.corso_dbgym];
    if (!attivita) {
      console.warn(`  ⚠ Corso non mappato: "${row.corso_dbgym}" (${row.data} ${row.oraInizio})`);
      unmapped++;
      continue;
    }

    const d = row.data;
    if (!byDate[d]) byDate[d] = [];

    // istruttore_note from DBGym = nickname (e.g. "fede", "TURNI", "stefanone")
    const nickname = (row.istruttore_note || "").trim();

    byDate[d].push({
      attivita,
      oraInizio: row.oraInizio,
      partecipanti: row.partecipanti,
      dbgymNickname: nickname,
    });
  }

  if (unmapped > 0) {
    console.log(`\n${unmapped} righe con corsi non mappati (skippate)`);
  }

  let totalCreate = 0,
    totalUpdate = 0,
    totalSkip = 0;

  for (const [data, items] of Object.entries(byDate)) {
    console.log(`\n${data}: ${items.length} lezioni`);
    const result = await postSync(data, items);

    if (result.error) {
      console.error(`  ERRORE: ${result.error}`);
      continue;
    }

    console.log(
      `  → create=${result.create}, aggiornate=${result.aggiornate}, skipped=${result.skipped}`
    );
    totalCreate += result.create || 0;
    totalUpdate += result.aggiornate || 0;
    totalSkip += result.skipped || 0;

    if (result.dettagli) {
      for (const d of result.dettagli) {
        console.log(`    ${d.oraInizio} ${d.attivita} (${d.dbgymNickname}): ${d.azione}`);
      }
    }
  }

  console.log(
    `\nTotale: ${totalCreate} create, ${totalUpdate} aggiornate, ${totalSkip} skip`
  );
}

main().catch((e) => {
  console.error("ERRORE:", e.message);
  process.exit(1);
});
