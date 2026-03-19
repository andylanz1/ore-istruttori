import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { compensoFissoMensile: true },
  });

  const [settimanaRegs, meseRegs, annoRegs, compensiStorici] = await Promise.all([
    prisma.registrazioneOre.findMany({
      where: { userId: session.user.id, data: { gte: startOfWeek } },
    }),
    prisma.registrazioneOre.findMany({
      where: { userId: session.user.id, data: { gte: startOfMonth } },
    }),
    prisma.registrazioneOre.findMany({
      where: { userId: session.user.id, data: { gte: startOfYear } },
      select: { compenso: true },
    }),
    prisma.compensoMensile.findMany({
      where: { userId: session.user.id, anno: now.getFullYear() },
      select: { mese: true, importo: true },
    }),
  ]);

  // Totale fatturato mese corrente (da lezioni)
  const totaleFatturatoMeseLezioni = meseRegs.reduce(
    (sum, r) => sum + (r.compenso ?? 0),
    0
  );

  // Totale fatturato anno da lezioni
  const totaleFatturatoAnnoLezioni = annoRegs.reduce(
    (sum, r) => sum + (r.compenso ?? 0),
    0
  );

  // Totale compensi storici (mesi chiusi, es. gen/feb)
  const totaleStoricoAnno = compensiStorici.reduce(
    (sum, c) => sum + c.importo,
    0
  );

  // Se ha un fisso mensile, quello è il fatturato mensile
  const fisso = user?.compensoFissoMensile ?? null;

  return NextResponse.json({
    settimanaLezioni: settimanaRegs.length,
    meseLezioni: meseRegs.length,
    totaleFatturatoMese: fisso ?? totaleFatturatoMeseLezioni,
    totaleFatturatoAnno: (fisso ?? totaleFatturatoMeseLezioni) + totaleStoricoAnno + totaleFatturatoAnnoLezioni - totaleFatturatoMeseLezioni,
    compensoFissoMensile: fisso,
    compensiStorici,
  });
}
