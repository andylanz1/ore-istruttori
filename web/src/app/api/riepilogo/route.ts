import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const [meseCount, settimanaCount] = await Promise.all([
    prisma.registrazioneOre.count({
      where: {
        userId: session.user.id,
        data: { gte: startOfMonth },
      },
    }),
    prisma.registrazioneOre.count({
      where: {
        userId: session.user.id,
        data: { gte: startOfWeek },
      },
    }),
  ]);

  return NextResponse.json({
    meseLezioni: meseCount,
    settimanaLezioni: settimanaCount,
  });
}
