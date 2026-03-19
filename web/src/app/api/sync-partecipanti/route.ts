import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SOGLIA_PARTECIPANTI } from "@/lib/attivita";

// POST /api/sync-partecipanti
// Called by n8n nightly to update participant counts from DBGym
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const { data, items } = body as {
    data: string;
    items: { attivita: string; oraInizio: string; partecipanti: number }[];
  };

  if (!data || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: "Formato non valido" }, { status: 400 });
  }

  const startOfDay = new Date(data + "T00:00:00.000Z");
  const endOfDay = new Date(data + "T23:59:59.999Z");

  let aggiornate = 0;
  let nonTrovate = 0;
  const dettagli: { attivita: string; oraInizio: string; partecipanti: number; registrazioni: number }[] = [];

  for (const item of items) {
    // Find all registrations matching this activity + time slot (any instructor)
    const registrazioni = await prisma.registrazioneOre.findMany({
      where: {
        data: { gte: startOfDay, lte: endOfDay },
        oraInizio: item.oraInizio,
        attivita: item.attivita,
      },
    });

    if (registrazioni.length === 0) {
      nonTrovate++;
      dettagli.push({ ...item, registrazioni: 0 });
      continue;
    }

    for (const reg of registrazioni) {
      if (!reg.userId) continue; // Skip TURNI lessons

      // Lookup tariff for this instructor + activity
      const tariffa = await prisma.tariffaIstruttore.findUnique({
        where: { userId_attivita: { userId: reg.userId, attivita: reg.attivita } },
      });

      let compenso: number | null = reg.compenso;
      if (tariffa) {
        if (tariffa.compensoAlto !== null && item.partecipanti >= SOGLIA_PARTECIPANTI) {
          compenso = tariffa.compensoAlto;
        } else {
          compenso = tariffa.compenso;
        }
      }

      await prisma.registrazioneOre.update({
        where: { id: reg.id },
        data: {
          partecipanti: item.partecipanti,
          compenso,
        },
      });

      aggiornate++;
    }

    dettagli.push({ ...item, registrazioni: registrazioni.length });
  }

  return NextResponse.json({
    ok: true,
    data,
    aggiornate,
    nonTrovate,
    dettagli,
  });
}
