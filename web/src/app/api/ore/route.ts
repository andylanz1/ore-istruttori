import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { richiedePartecipanti, SOGLIA_PARTECIPANTI } from "@/lib/attivita";

// GET /api/ore?data=2026-03-17
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const data = request.nextUrl.searchParams.get("data");
  if (!data) return NextResponse.json({ error: "Data richiesta" }, { status: 400 });

  const startOfDay = new Date(data + "T00:00:00.000Z");
  const endOfDay = new Date(data + "T23:59:59.999Z");

  const registrazioni = await prisma.registrazioneOre.findMany({
    where: {
      userId: session.user.id,
      data: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { oraInizio: "asc" },
  });

  return NextResponse.json(registrazioni);
}

// POST /api/ore
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();
  const { data, oraInizio, attivita, partecipanti, note } = body;

  if (!data || !oraInizio || !attivita) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  // Per attività con partecipanti, il campo è obbligatorio
  if (richiedePartecipanti(attivita) && !partecipanti) {
    return NextResponse.json({ error: "Numero partecipanti obbligatorio per questa attività" }, { status: 400 });
  }

  // Calcolo compenso automatico dalla tariffa
  let compenso: number | undefined;
  const tariffa = await prisma.tariffaIstruttore.findUnique({
    where: { userId_attivita: { userId: session.user.id, attivita } },
  });

  if (tariffa) {
    if (tariffa.compensoAlto !== null && partecipanti >= SOGLIA_PARTECIPANTI) {
      compenso = tariffa.compensoAlto;
    } else {
      compenso = tariffa.compenso;
    }
  }

  const registrazione = await prisma.registrazioneOre.create({
    data: {
      userId: session.user.id,
      data: new Date(data + "T00:00:00.000Z"),
      oraInizio,
      attivita,
      partecipanti: partecipanti ? parseInt(partecipanti) : null,
      compenso: compenso ?? null,
      note,
    },
  });

  return NextResponse.json(registrazione, { status: 201 });
}
