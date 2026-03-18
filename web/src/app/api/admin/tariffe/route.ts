import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/tariffe — crea nuova tariffa
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { userId, attivita, compenso, compensoAlto } = await request.json();

  if (!userId || !attivita || compenso === undefined) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  const tariffa = await prisma.tariffaIstruttore.create({
    data: {
      userId,
      attivita,
      compenso,
      ...(compensoAlto !== undefined ? { compensoAlto } : {}),
    },
  });

  return NextResponse.json(tariffa, { status: 201 });
}
