import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const now = new Date();

  // Inizio mese
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Inizio settimana (lunedì)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const [meseRegs, settimanaRegs] = await Promise.all([
    prisma.registrazioneOre.findMany({
      where: {
        userId: session.user.id,
        data: { gte: startOfMonth },
      },
    }),
    prisma.registrazioneOre.findMany({
      where: {
        userId: session.user.id,
        data: { gte: startOfWeek },
      },
    }),
  ]);

  return NextResponse.json({
    meseTotaleOre: meseRegs.reduce((s, r) => s + r.ore, 0),
    meseRegistrazioni: meseRegs.length,
    settimanaTotaleOre: settimanaRegs.reduce((s, r) => s + r.ore, 0),
  });
}
