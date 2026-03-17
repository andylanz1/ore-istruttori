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
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(registrazioni);
}

// POST /api/ore
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();
  const { data, ore, attivita, partecipanti, note } = body;

  if (!data || !ore || !attivita || partecipanti === undefined || partecipanti === null) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  if (typeof ore !== "number" || ore <= 0) {
    return NextResponse.json({ error: "Ore non valide" }, { status: 400 });
  }

  if (typeof partecipanti !== "number" || partecipanti < 0) {
    return NextResponse.json({ error: "Numero partecipanti non valido" }, { status: 400 });
  }

  const registrazione = await prisma.registrazioneOre.create({
    data: {
      userId: session.user.id,
      data: new Date(data + "T00:00:00.000Z"),
      ore,
      attivita,
      partecipanti,
      note,
    },
  });

  return NextResponse.json(registrazione, { status: 201 });
}
