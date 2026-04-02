import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/ore/mese?anno=2026&mese=3
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const anno = parseInt(request.nextUrl.searchParams.get("anno") ?? "");
  const mese = parseInt(request.nextUrl.searchParams.get("mese") ?? "");

  if (!anno || !mese || mese < 1 || mese > 12) {
    return NextResponse.json({ error: "anno e mese richiesti (mese 1-12)" }, { status: 400 });
  }

  const startOfMonth = new Date(Date.UTC(anno, mese - 1, 1));
  const endOfMonth = new Date(Date.UTC(anno, mese, 0, 23, 59, 59, 999));

  const registrazioni = await prisma.registrazioneOre.findMany({
    where: {
      userId: session.user.id,
      data: { gte: startOfMonth, lte: endOfMonth },
      stato: { not: "rifiutato" },
    },
    orderBy: [{ data: "asc" }, { oraInizio: "asc" }],
    select: {
      id: true,
      data: true,
      oraInizio: true,
      attivita: true,
      partecipanti: true,
      compenso: true,
      stato: true,
      sorgente: true,
      note: true,
    },
  });

  return NextResponse.json(registrazioni);
}
