import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  // Get all CompensoMensile records (historical data)
  const compensiStorici = await prisma.compensoMensile.findMany({
    include: { user: { select: { id: true, nome: true, cognome: true } } },
    orderBy: [{ anno: "asc" }, { mese: "asc" }],
  });

  // Get current month data from RegistrazioneOre
  const now = new Date();
  const meseCorrente = now.getMonth() + 1;
  const annoCorrente = now.getFullYear();
  const startOfMonth = new Date(annoCorrente, meseCorrente - 1, 1);
  const endOfMonth = new Date(annoCorrente, meseCorrente, 1);

  const istruttori = await prisma.user.findMany({
    where: { ruolo: { in: ["istruttore", "responsabile"] }, attivo: true },
    select: { id: true, nome: true, cognome: true, compensoFissoMensile: true },
  });

  const lezioniMeseCorrente = await prisma.registrazioneOre.findMany({
    where: {
      data: { gte: startOfMonth, lt: endOfMonth },
      stato: { in: ["confermato", "da_confermare"] },
    },
  });

  // Build trend data: each month has a total and per-instructor breakdown
  const mesiMap = new Map<string, Map<string, number>>();

  // Historical months from CompensoMensile
  for (const c of compensiStorici) {
    const key = `${c.anno}-${String(c.mese).padStart(2, "0")}`;
    if (!mesiMap.has(key)) mesiMap.set(key, new Map());
    const istKey = c.user.id;
    mesiMap.get(key)!.set(istKey, (mesiMap.get(key)!.get(istKey) ?? 0) + c.importo);
  }

  // Current month from RegistrazioneOre (sum compenso per instructor)
  const meseCorrenteKey = `${annoCorrente}-${String(meseCorrente).padStart(2, "0")}`;
  if (!mesiMap.has(meseCorrenteKey)) mesiMap.set(meseCorrenteKey, new Map());
  const correnteMap = mesiMap.get(meseCorrenteKey)!;

  for (const ist of istruttori) {
    const lezioniIst = lezioniMeseCorrente.filter((l) => l.userId === ist.id);
    if (lezioniIst.length === 0 && !ist.compensoFissoMensile) continue;
    const compensoLezioni = lezioniIst.reduce((s, l) => s + (l.compenso ?? 0), 0);
    const compenso = ist.compensoFissoMensile ?? compensoLezioni;
    if (compenso > 0) {
      correnteMap.set(ist.id, compenso);
    }
  }

  // Build the istruttori name map
  const nomiMap = new Map<string, string>();
  for (const c of compensiStorici) {
    nomiMap.set(c.user.id, `${c.user.nome} ${c.user.cognome}`);
  }
  for (const ist of istruttori) {
    nomiMap.set(ist.id, `${ist.nome} ${ist.cognome}`);
  }

  // Build trend array
  const MESI_NOMI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const trend = Array.from(mesiMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, istMap]) => {
      const [y, m] = key.split("-");
      const label = `${MESI_NOMI[parseInt(m) - 1]} ${y.slice(2)}`;
      const entry: Record<string, string | number> = { mese: label };
      let totale = 0;
      for (const [istId, importo] of istMap) {
        entry[istId] = Math.round(importo);
        totale += importo;
      }
      entry.totale = Math.round(totale);
      return entry;
    });

  // List of all instructor IDs that appear in trend
  const allIstIds = new Set<string>();
  for (const [, istMap] of mesiMap) {
    for (const id of istMap.keys()) allIstIds.add(id);
  }

  const istruttoriTrend = Array.from(allIstIds).map((id) => ({
    id,
    nome: nomiMap.get(id) ?? id,
  }));

  return NextResponse.json({ trend, istruttori: istruttoriTrend });
}
