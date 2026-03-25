// sync-agenda.js — Sync Agenda Avanzata appointments from DBGym to ore-istruttori
// Runs inside n8n container: node /tmp/sync-agenda.js [YYYY-MM-DD] [YYYY-MM-DD]
// If no dates given, syncs today only
//
// Queries DBGym via mcp-dbgym REST API (no tedious dependency needed)
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

const dateFrom = process.argv[2] || new Date().toISOString().slice(0, 10);
const dateTo = process.argv[3] || dateFrom;

// Resource → dbgymNickname mapping (istruttori ore-istruttori)
const RESOURCE_MAP = {
  "I. Stefano": "stefanone",
  "Stefania": "stefania",
  "Eliseba": "eliseba",
  "I. Fede": "fede",
  "I. Rachele": "raky",
  "Vanessa": "vanessa",
};

// DBGym DescrizioneTipo → app attivita
const SERVICE_MAP = {
  "Personal Training": "PT 1h",
  "Personal Training 30 min": "PT 30 Min",
  "Duetto": "PT 1h",
  "consulenza osteopatica": "Check-up",
  "Osteopatia": "OSTEO",
};

const INSTRUCTOR_RESOURCES = Object.keys(RESOURCE_MAP);

const sql = `
SELECT
  CONVERT(VARCHAR(10), DataOraInizio, 120) AS data,
  CONVERT(VARCHAR(5), DataOraInizio, 108) AS oraInizio,
  DescrizioneTipo,
  DescrizioneRisorsa,
  COUNT(*) AS numClienti
FROM dbgym.dbo.RVW_AgendaAvanzataUtentiConRisorse
WHERE DataOraInizio >= CAST('${dateFrom}' AS DATETIME)
  AND DataOraInizio < DATEADD(day, 1, CAST('${dateTo}' AS DATETIME))
  AND Annullato = 0
  AND DescrizioneTipo IN ('Personal Training','Personal Training 30 min','Duetto','consulenza osteopatica','Osteopatia')
  AND DescrizioneRisorsa IN (${INSTRUCTOR_RESOURCES.map(r => `'${r}'`).join(",")})
GROUP BY CONVERT(VARCHAR(10), DataOraInizio, 120),
         CONVERT(VARCHAR(5), DataOraInizio, 108),
         DescrizioneTipo,
         DescrizioneRisorsa
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
        "Authorization": `Bearer ${DBGYM_API_KEY}`,
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
          try { resolve(JSON.parse(d)); } catch { resolve(d); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`Sync agenda ${dateFrom} → ${dateTo}`);
  const rows = await queryDbgym();
  console.log(`DBGym returned ${rows.length} rows`);

  // Group by date
  const byDate = {};
  for (const row of rows) {
    const d = row.data;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push({
      attivita: SERVICE_MAP[row.DescrizioneTipo] || row.DescrizioneTipo,
      oraInizio: row.oraInizio,
      partecipanti: row.numClienti || 1,
      dbgymNickname: RESOURCE_MAP[row.DescrizioneRisorsa] || row.DescrizioneRisorsa,
    });
  }

  let totalCreate = 0, totalUpdate = 0, totalSkip = 0;
  for (const [data, items] of Object.entries(byDate)) {
    console.log(`\n${data}: ${items.length} appuntamenti`);
    const result = await postSync(data, items);
    console.log(`  → create=${result.create}, aggiornate=${result.aggiornate}, skipped=${result.skipped}`);
    totalCreate += result.create || 0;
    totalUpdate += result.aggiornate || 0;
    totalSkip += result.skipped || 0;
    if (result.dettagli) {
      for (const d of result.dettagli) {
        console.log(`    ${d.oraInizio} ${d.attivita} (${d.dbgymNickname}): ${d.azione}`);
      }
    }
  }

  console.log(`\nTotale: ${totalCreate} create, ${totalUpdate} aggiornate, ${totalSkip} skip`);
}

main().catch((e) => { console.error("ERRORE:", e.message); process.exit(1); });
