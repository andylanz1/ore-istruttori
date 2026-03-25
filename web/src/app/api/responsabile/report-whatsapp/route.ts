import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAPIENZA_MAX } from "@/lib/attivita";

const GIORNI_SETTIMANA = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

function getGiornoSettimana(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return GIORNI_SETTIMANA[d.getDay()];
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "responsabile" && role !== "admin") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();
  const mese = body.mese || now.getMonth() + 1;
  const anno = body.anno || now.getFullYear();

  const startOfMonth = new Date(anno, mese - 1, 1);
  const endOfMonth = new Date(anno, mese, 1);

  const meseNome = startOfMonth.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  const istruttori = await prisma.user.findMany({
    where: { ruolo: { in: ["istruttore", "responsabile"] }, attivo: true },
    include: {
      registrazioniOre: {
        where: { data: { gte: startOfMonth, lt: endOfMonth } },
      },
      compensiMensili: {
        where: { mese, anno },
      },
    },
    orderBy: { cognome: "asc" },
  });

  const tutteLezioni = await prisma.registrazioneOre.findMany({
    where: { data: { gte: startOfMonth, lt: endOfMonth } },
    include: { user: { select: { nome: true, cognome: true } } },
  });

  // Build stats
  const userId = (session.user as { id: string }).id;
  const isResponsabile = role === "responsabile";

  const stats = istruttori.map((ist) => {
    const lezioni = ist.registrazioniOre.filter(
      (r) => r.stato === "confermato" || r.stato === "da_confermare"
    );
    const compensoStorico = ist.compensiMensili.length > 0 ? ist.compensiMensili[0].importo : null;
    const fisso = ist.compensoFissoMensile;
    const compensoLezioni = lezioni.reduce((s, r) => s + (r.compenso ?? 0), 0);
    const compenso = compensoStorico ?? fisso ?? compensoLezioni;
    const ore = lezioni.reduce(
      (s, r) => s + (r.attivita === "PT 30 Min" ? 0.5 : 1),
      0
    );
    const compensoOra = ore > 0 ? compenso / ore : 0;

    const lezioniGruppo = lezioni.filter((r) => r.partecipanti !== null && r.partecipanti > 0);
    const totPart = lezioniGruppo.reduce((s, r) => s + (r.partecipanti ?? 0), 0);
    const mediaPart = lezioniGruppo.length > 0 ? totPart / lezioniGruppo.length : 0;

    let riempSum = 0;
    let riempCount = 0;
    for (const r of lezioniGruppo) {
      const cap = CAPIENZA_MAX[r.attivita];
      if (cap && r.partecipanti !== null) {
        riempSum += (r.partecipanti / cap) * 100;
        riempCount++;
      }
    }
    const riemp = riempCount > 0 ? riempSum / riempCount : 0;

    return {
      nome: `${ist.nome} ${ist.cognome}`,
      lezioni: lezioni.length,
      ore,
      compenso,
      // Se responsabile, nascondi il proprio compenso/ora
      compensoOra: isResponsabile && ist.id === userId ? 0 : compensoOra,
      mediaPart,
      riemp,
      fisso,
      isStorico: compensoStorico !== null,
      isSelf: isResponsabile && ist.id === userId,
    };
  });

  // Turni disponibili
  const turni = tutteLezioni.filter((r) => r.userId === null && r.stato === "da_confermare");

  // Turni reclamati
  const reclamati = tutteLezioni.filter(
    (r) => r.userId !== null && r.stato === "confermato" && r.sorgente === "dbgym"
  );

  // Lezioni da confermare
  const daConfermare = tutteLezioni.filter(
    (r) => r.userId !== null && r.stato === "da_confermare"
  );

  // Sort rankings
  const byOre = [...stats].sort((a, b) => b.ore - a.ore);
  const byCompenso = [...stats].sort((a, b) => b.compenso - a.compenso);
  const byPartecipanti = [...stats].sort((a, b) => b.mediaPart - a.mediaPart);
  const byCompensoOra = [...stats].filter((s) => s.ore > 0 && s.compensoOra > 0).sort((a, b) => b.compensoOra - a.compensoOra);

  // Build message
  const lines: string[] = [];
  lines.push(`REPORT MENSILE ${meseNome.toUpperCase()}`);
  lines.push(`O-Zone Wellness Boutique`);
  lines.push("");

  // Totali
  const totLezioni = stats.reduce((s, i) => s + i.lezioni, 0);
  const totCompenso = stats.reduce((s, i) => s + i.compenso, 0);
  const avgRiemp = stats.filter((s) => s.riemp > 0);
  const avgRiempVal = avgRiemp.length > 0
    ? avgRiemp.reduce((s, i) => s + i.riemp, 0) / avgRiemp.length
    : 0;

  lines.push(`TOTALI`);
  lines.push(`Lezioni: ${totLezioni}`);
  lines.push(`Compensi: ${totCompenso.toFixed(0)}EUR`);
  lines.push(`Riempimento medio: ${avgRiempVal.toFixed(0)}%`);
  if (avgRiempVal < 80) {
    lines.push(`ATTENZIONE: riempimento sotto l'80%, situazione da migliorare`);
  }
  lines.push("");

  // Per istruttore (con spaziatura)
  lines.push(`DETTAGLIO ISTRUTTORI`);
  lines.push("");
  for (const s of stats) {
    const tag = s.isStorico ? " (storico)" : s.fisso ? " (fisso)" : "";
    lines.push(`${s.nome}${tag}`);
    lines.push(`  ${s.lezioni} lezioni, ${s.ore}h, ${s.compenso.toFixed(0)}EUR`);
    if (s.mediaPart > 0) {
      const riempWarning = s.riemp > 0 && s.riemp < 80 ? " -- ATTENZIONE" : "";
      lines.push(`  ${s.mediaPart.toFixed(1)} pers/lez, riempimento ${s.riemp.toFixed(0)}%${riempWarning}`);
    }
    if (s.ore > 0 && !s.isSelf) {
      lines.push(`  Compenso/ora: ${s.compensoOra.toFixed(1)}EUR/h`);
    }
    lines.push("");
  }

  // Classifiche
  lines.push(`CLASSIFICHE`);
  lines.push(`Piu ore: ${byOre.slice(0, 3).map((s, i) => `${i + 1}. ${s.nome} (${s.ore}h)`).join(", ")}`);
  lines.push(`Piu compenso: ${byCompenso.slice(0, 3).map((s, i) => `${i + 1}. ${s.nome} (${s.compenso.toFixed(0)}EUR)`).join(", ")}`);
  lines.push(`Piu partecipanti: ${byPartecipanti.slice(0, 3).map((s, i) => `${i + 1}. ${s.nome} (${s.mediaPart.toFixed(1)}/lez)`).join(", ")}`);
  if (byCompensoOra.length > 0) {
    lines.push(`Miglior EUR/ora: ${byCompensoOra.slice(0, 3).map((s, i) => `${i + 1}. ${s.nome} (${s.compensoOra.toFixed(1)}EUR/h)`).join(", ")}`);
  }
  lines.push("");

  // Controllo
  lines.push(`CONTROLLO`);
  lines.push(`Turni disponibili (non reclamati): ${turni.length}`);
  lines.push(`Lezioni da confermare: ${daConfermare.length}`);
  lines.push(`Lezioni confermate: ${reclamati.length}`);

  if (turni.length > 0) {
    lines.push("");
    lines.push(`TURNI NON RECLAMATI:`);
    for (const t of turni.slice(0, 20)) {
      const dataStr = t.data.toISOString().slice(0, 10);
      const giorno = getGiornoSettimana(dataStr);
      const isSabato = giorno === "sabato";
      // note field contains "Rifiutato da Nome Cognome" if someone refused
      const nota = t.note;
      let dettaglio = "";
      if (isSabato) {
        dettaglio = " (sabato)";
      } else if (nota && nota.startsWith("Rifiutato da ")) {
        dettaglio = ` - ${nota}`;
      } else {
        dettaglio = " (turno di rotazione)";
      }
      lines.push(`  ${dataStr} ${t.oraInizio} ${t.attivita}${dettaglio}`);
    }
    if (turni.length > 20) lines.push(`  ... e altri ${turni.length - 20}`);
  }

  if (daConfermare.length > 0) {
    lines.push("");
    lines.push(`DA CONFERMARE:`);
    for (const l of daConfermare.slice(0, 20)) {
      const chi = l.user ? `${l.user.nome} ${l.user.cognome}` : "?";
      lines.push(`  ${l.data.toISOString().slice(0, 10)} ${l.oraInizio} ${l.attivita} - ${chi}`);
    }
    if (daConfermare.length > 20) lines.push(`  ... e altre ${daConfermare.length - 20}`);
  }

  const text = lines.join("\n");

  // Get the phone number of the requesting user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telefono: true, nome: true },
  });

  if (!user?.telefono) {
    return NextResponse.json({ error: "Telefono non trovato" }, { status: 400 });
  }

  // Send via n8n webhook
  const n8nUrl =
    process.env.N8N_WHATSAPP_WEBHOOK_URL ||
    "http://n8n-dcskgc44ok44k80scw8wkw4g:5678/webhook/whatsapp-andrea";

  const res = await fetch(n8nUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number: user.telefono, text }),
  });

  if (!res.ok) {
    console.error("Errore invio WhatsApp report:", res.status, await res.text());
    return NextResponse.json(
      { error: "Errore nell'invio del messaggio WhatsApp" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, preview: text });
}
