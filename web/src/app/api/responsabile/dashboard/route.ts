import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAPIENZA_MAX } from "@/lib/attivita";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "responsabile" && role !== "admin") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const mese = parseInt(searchParams.get("mese") || String(now.getMonth() + 1));
  const anno = parseInt(searchParams.get("anno") || String(now.getFullYear()));

  const startOfMonth = new Date(anno, mese - 1, 1);
  const endOfMonth = new Date(anno, mese, 1);

  // All active instructors
  const istruttori = await prisma.user.findMany({
    where: { ruolo: { in: ["istruttore", "responsabile"] }, attivo: true },
    include: {
      registrazioniOre: {
        where: { data: { gte: startOfMonth, lt: endOfMonth } },
      },
      tariffe: true,
      compensiMensili: {
        where: { mese, anno },
      },
    },
    orderBy: { cognome: "asc" },
  });

  // All lessons of the month (including turni)
  const tutteLezioni = await prisma.registrazioneOre.findMany({
    where: { data: { gte: startOfMonth, lt: endOfMonth } },
    include: { user: { select: { nome: true, cognome: true } } },
  });

  // Build per-instructor stats
  const userId = (session.user as { id: string }).id;
  const isResponsabile = role === "responsabile";

  const stats = istruttori.map((ist) => {
    const lezioni = ist.registrazioniOre.filter(
      (r) => r.stato === "confermato" || r.stato === "da_confermare"
    );
    const confermate = lezioni.filter((r) => r.stato === "confermato");
    const daConfermare = lezioni.filter((r) => r.stato === "da_confermare");

    // Compenso: storico (CompensoMensile) > fisso mensile > somma lezioni
    const compensoStorico = ist.compensiMensili.length > 0 ? ist.compensiMensili[0].importo : null;
    const fisso = ist.compensoFissoMensile;
    const compensoLezioni = lezioni.reduce((s, r) => s + (r.compenso ?? 0), 0);
    const compensoTotale = compensoStorico ?? fisso ?? compensoLezioni;

    // Compenso OSTEO (Digielle) — sempre calcolato dalla somma lezioni OSTEO
    const lezioniOsteo = lezioni.filter((r) => r.attivita === "OSTEO");
    const compensoOsteo = lezioniOsteo.reduce((s, r) => s + (r.compenso ?? 0), 0);
    const oreOsteo = lezioniOsteo.length; // OSTEO = 1h ciascuna
    const compensoOzone = compensoTotale - compensoOsteo;

    // Ore (each lesson = 1h unless PT 30 Min = 0.5h)
    const ore = lezioni.reduce((s, r) => {
      return s + (r.attivita === "PT 30 Min" ? 0.5 : 1);
    }, 0);
    const oreNoOsteo = ore - oreOsteo;

    // Compenso per ora (calcolato solo su ore O-zone, senza OSTEO)
    const compensoPerOra = oreNoOsteo > 0 ? compensoOzone / oreNoOsteo : 0;

    // Partecipanti (solo lezioni di gruppo con partecipanti)
    const lezioniGruppo = lezioni.filter(
      (r) => r.partecipanti !== null && r.partecipanti > 0
    );
    const totalePartecipanti = lezioniGruppo.reduce(
      (s, r) => s + (r.partecipanti ?? 0),
      0
    );
    const mediaPartecipanti =
      lezioniGruppo.length > 0 ? totalePartecipanti / lezioniGruppo.length : 0;

    // % riempimento (basato su capienza max per attivita)
    let riempimentoSum = 0;
    let riempimentoCount = 0;
    for (const r of lezioniGruppo) {
      const cap = CAPIENZA_MAX[r.attivita];
      if (cap && r.partecipanti !== null) {
        riempimentoSum += (r.partecipanti / cap) * 100;
        riempimentoCount++;
      }
    }
    const riempimentoMedio =
      riempimentoCount > 0 ? riempimentoSum / riempimentoCount : 0;

    return {
      id: ist.id,
      nome: ist.nome,
      cognome: ist.cognome,
      ruolo: ist.ruolo,
      compensoFissoMensile: fisso,
      compensoStorico: compensoStorico,
      lezioniTotali: lezioni.length,
      lezioniConfermate: confermate.length,
      lezioniDaConfermare: daConfermare.length,
      ore,
      oreOsteo,
      compensoTotale,
      compensoOzone,
      compensoOsteo,
      // Se responsabile, nascondi il proprio compenso/ora
      compensoPerOra: isResponsabile && ist.id === userId ? 0 : Math.round(compensoPerOra * 100) / 100,
      totalePartecipanti,
      mediaPartecipanti: Math.round(mediaPartecipanti * 10) / 10,
      riempimentoMedio: Math.round(riempimentoMedio * 10) / 10,
    };
  });

  // Lezioni rifiutate → diventate turno (userId=null, sorgente=dbgym)
  const turniDisponibili = tutteLezioni.filter(
    (r) => r.userId === null && r.stato === "da_confermare"
  );

  // Turni reclamati (confermati che erano turni — hanno sorgente=dbgym e stato=confermato
  // but were originally turni. We can detect by checking if they were claimed by someone
  // not the original assignee. For simplicity: all confermati with sorgente=dbgym)
  // Actually, "rifiutate" = lessons that are now turni (userId=null)
  // "reclamate" = lessons that were turni but got claimed (we can't distinguish perfectly
  // from data alone, but lessons where userId != null and stato=confermato and sorgente=dbgym
  // are either originally assigned+confirmed OR reclaimed)

  // For the report, let's show:
  // 1. Turni ancora disponibili (userId=null, da_confermare)
  // 2. All lessons with their status for the control table
  const controlloLezioni = tutteLezioni.map((r) => ({
    id: r.id,
    data: r.data.toISOString().slice(0, 10),
    oraInizio: r.oraInizio,
    attivita: r.attivita,
    partecipanti: r.partecipanti,
    compenso: r.compenso,
    stato: r.stato,
    sorgente: r.sorgente,
    istruttore: r.user ? `${r.user.nome} ${r.user.cognome}` : null,
    isTurno: r.userId === null,
  }));

  // Totali
  const totLezioni = stats.reduce((s, i) => s + i.lezioniTotali, 0);
  const totCompenso = stats.reduce((s, i) => s + i.compensoTotale, 0);
  const totCompensoOzone = stats.reduce((s, i) => s + i.compensoOzone, 0);
  const totCompensoDigielle = stats.reduce((s, i) => s + i.compensoOsteo, 0);
  const totPartecipanti = stats.reduce((s, i) => s + i.totalePartecipanti, 0);
  const avgRiempimento =
    stats.filter((s) => s.riempimentoMedio > 0).length > 0
      ? stats
          .filter((s) => s.riempimentoMedio > 0)
          .reduce((s, i) => s + i.riempimentoMedio, 0) /
        stats.filter((s) => s.riempimentoMedio > 0).length
      : 0;

  // Lista istruttori attivi (per assegnazione turni)
  const istruttoriAttivi = istruttori.map((ist) => ({
    id: ist.id,
    nome: ist.nome,
    cognome: ist.cognome,
  }));

  return NextResponse.json({
    mese,
    anno,
    istruttori: stats,
    istruttoriAttivi,
    turniDisponibili: turniDisponibili.length,
    controlloLezioni,
    totali: {
      lezioni: totLezioni,
      compenso: Math.round(totCompenso),
      compensoOzone: Math.round(totCompensoOzone),
      compensoDigielle: Math.round(totCompensoDigielle),
      partecipanti: totPartecipanti,
      riempimentoMedio: Math.round(avgRiempimento * 10) / 10,
    },
  });
}
