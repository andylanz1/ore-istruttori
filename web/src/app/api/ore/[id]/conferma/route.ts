import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOGLIA_PARTECIPANTI } from "@/lib/attivita";

// PATCH /api/ore/[id]/conferma
// Actions: conferma, rifiuta, reclama (for TURNI)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const { azione } = (await request.json()) as { azione: "conferma" | "rifiuta" | "reclama" };

  if (!["conferma", "rifiuta", "reclama"].includes(azione)) {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  const registrazione = await prisma.registrazioneOre.findUnique({ where: { id } });

  if (!registrazione) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  if (registrazione.stato !== "da_confermare") {
    return NextResponse.json({ error: "Lezione già gestita" }, { status: 400 });
  }

  if (azione === "conferma") {
    // Only the assigned instructor can confirm
    if (registrazione.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    await prisma.registrazioneOre.update({
      where: { id },
      data: { stato: "confermato" },
    });

    return NextResponse.json({ ok: true, stato: "confermato" });
  }

  if (azione === "rifiuta") {
    // Only the assigned instructor can reject
    if (registrazione.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    await prisma.registrazioneOre.update({
      where: { id },
      data: { stato: "rifiutato" },
    });

    return NextResponse.json({ ok: true, stato: "rifiutato" });
  }

  if (azione === "reclama") {
    // Only TURNI lessons (userId=null) can be claimed
    if (registrazione.userId !== null) {
      return NextResponse.json({ error: "Lezione già assegnata" }, { status: 400 });
    }

    // Calculate compenso for the claiming instructor
    let compenso: number | null = null;
    const tariffa = await prisma.tariffaIstruttore.findUnique({
      where: {
        userId_attivita: { userId: session.user.id, attivita: registrazione.attivita },
      },
    });

    if (tariffa) {
      if (
        tariffa.compensoAlto !== null &&
        registrazione.partecipanti !== null &&
        registrazione.partecipanti >= SOGLIA_PARTECIPANTI
      ) {
        compenso = tariffa.compensoAlto;
      } else {
        compenso = tariffa.compenso;
      }
    }

    await prisma.registrazioneOre.update({
      where: { id },
      data: {
        userId: session.user.id,
        compenso,
        stato: "confermato",
      },
    });

    return NextResponse.json({ ok: true, stato: "confermato" });
  }
}
