import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOGLIA_PARTECIPANTI } from "@/lib/attivita";

// PATCH /api/ore/[id]/conferma
// Actions: conferma, rifiuta, reclama (for TURNI), annulla
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;
  const { azione } = (await request.json()) as { azione: "conferma" | "rifiuta" | "reclama" | "annulla" };

  if (!["conferma", "rifiuta", "reclama", "annulla"].includes(azione)) {
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  }

  const registrazione = await prisma.registrazioneOre.findUnique({ where: { id } });

  if (!registrazione) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  if (azione === "annulla") {
    if (registrazione.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }
    if (registrazione.stato !== "confermato") {
      return NextResponse.json({ error: "Solo lezioni confermate possono essere annullate" }, { status: 400 });
    }

    await prisma.registrazioneOre.update({
      where: { id },
      data: { stato: "da_confermare" },
    });

    return NextResponse.json({ ok: true, stato: "da_confermare" });
  }

  if (registrazione.stato !== "da_confermare") {
    return NextResponse.json({ error: "Lezione già gestita" }, { status: 400 });
  }

  if (azione === "conferma") {
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
    if (registrazione.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    // Track who refused in the note field
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { nome: true, cognome: true },
    });
    const rifiutatoDa = user ? `${user.nome} ${user.cognome}` : "sconosciuto";

    // Rejected lesson becomes a TURNO — available for others to claim
    await prisma.registrazioneOre.update({
      where: { id },
      data: {
        userId: null,
        compenso: null,
        stato: "da_confermare",
        note: `Rifiutato da ${rifiutatoDa}`,
      },
    });

    return NextResponse.json({ ok: true, stato: "da_confermare" });
  }

  if (azione === "reclama") {
    if (registrazione.userId !== null) {
      return NextResponse.json({ error: "Lezione già assegnata" }, { status: 400 });
    }

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
