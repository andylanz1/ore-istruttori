import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GIORNI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "responsabile" && role !== "admin") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const mese = parseInt(searchParams.get("mese") || String(now.getMonth() + 1));
  const anno = parseInt(searchParams.get("anno") || String(now.getFullYear()));

  const startOfMonth = new Date(anno, mese - 1, 1);
  const endOfMonth = new Date(anno, mese, 1);

  const lezioni = await prisma.registrazioneOre.findMany({
    where: { data: { gte: startOfMonth, lt: endOfMonth } },
    include: { user: { select: { id: true, nome: true, cognome: true } } },
    orderBy: [{ data: "asc" }, { oraInizio: "asc" }],
  });

  const result = lezioni.map((r) => {
    const dataStr = r.data.toISOString().slice(0, 10);
    const d = new Date(dataStr + "T12:00:00");
    return {
      id: r.id,
      data: dataStr,
      giornoSettimana: GIORNI[d.getDay()],
      oraInizio: r.oraInizio,
      attivita: r.attivita,
      istruttore: r.user ? { id: r.user.id, nome: r.user.nome, cognome: r.user.cognome } : null,
      partecipanti: r.partecipanti,
      compenso: r.compenso,
      stato: r.stato,
    };
  });

  return NextResponse.json({ lezioni: result, mese, anno });
}
