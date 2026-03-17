import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { data, oraInizio, oraFine, attivita, note } = body;

  if (!data || !oraInizio || !oraFine || !attivita) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  // Calcola ore
  const [hI, mI] = oraInizio.split(":").map(Number);
  const [hF, mF] = oraFine.split(":").map(Number);
  const ore = (hF * 60 + mF - (hI * 60 + mI)) / 60;

  if (ore <= 0) {
    return NextResponse.json({ error: "L'ora di fine deve essere dopo l'ora di inizio" }, { status: 400 });
  }

  const registrazione = await prisma.registrazioneOre.create({
    data: {
      userId: session.user.id,
      data: new Date(data + "T00:00:00.000Z"),
      oraInizio,
      oraFine,
      ore,
      attivita,
      note,
    },
  });

  return NextResponse.json(registrazione, { status: 201 });
}
