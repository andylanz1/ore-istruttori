import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/utenti/[id] — aggiorna dati utente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const data: { compensoFissoMensile?: number | null } = {};
  if ("compensoFissoMensile" in body) {
    data.compensoFissoMensile = body.compensoFissoMensile;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  return NextResponse.json({ id: user.id, compensoFissoMensile: user.compensoFissoMensile });
}
