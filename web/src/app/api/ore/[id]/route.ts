import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/ore/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { id } = await params;

  // Verifica che la registrazione appartenga all'utente
  const registrazione = await prisma.registrazioneOre.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!registrazione) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  if (registrazione.sorgente === "dbgym") {
    return NextResponse.json(
      { error: "Le lezioni da DBGym non possono essere eliminate. Usa Rifiuta." },
      { status: 400 }
    );
  }

  await prisma.registrazioneOre.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
