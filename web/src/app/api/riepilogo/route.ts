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

  const [settimanaRegs, meseRegs, annoRegs] = await Promise.all([
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
  ]);

  // Totale fatturato anno (solo registrazioni con compenso calcolato)
  const totaleFatturatoAnno = annoRegs.reduce(
    (sum, r) => sum + (r.compenso ?? 0),
    0
  );

  // Totale fatturato mese
  const totaleFatturatoMese = meseRegs.reduce(
    (sum, r) => sum + (r.compenso ?? 0),
    0
  );

  // Se ha un fisso mensile, quello è il fatturato mensile
  const fisso = user?.compensoFissoMensile ?? null;
  const mesiPassati = now.getMonth(); // 0 = gennaio

  return NextResponse.json({
    settimanaLezioni: settimanaRegs.length,
    meseLezioni: meseRegs.length,
    totaleFatturatoMese: fisso ?? totaleFatturatoMese,
    totaleFatturatoAnno: fisso ? fisso * (mesiPassati + 1) : totaleFatturatoAnno,
    compensoFissoMensile: fisso,
  });
}
