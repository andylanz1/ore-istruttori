import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SOGLIA_PARTECIPANTI } from "@/lib/attivita";

// POST /api/sync-lezioni
// Called by n8n nightly — creates "da_confermare" lessons from DBGym
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const { data, items } = body as {
    data: string;
    items: {
      attivita: string;
      oraInizio: string;
      partecipanti: number;
      dbgymNickname: string;
    }[];
  };

  if (!data || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: "Formato non valido" }, { status: 400 });
  }

  const giorno = new Date(data + "T00:00:00.000Z");

  let create = 0;
  let aggiornate = 0;
  let skipped = 0;
  const dettagli: { attivita: string; oraInizio: string; dbgymNickname: string; azione: string }[] = [];

  for (const item of items) {
    const nickname = item.dbgymNickname?.trim().toLowerCase();
    const isTurni = nickname === "turni";

    // Find instructor by dbgymNickname
    let userId: string | null = null;
    if (!isTurni && nickname) {
      const user = await prisma.user.findFirst({
        where: {
          dbgymNickname: {
            equals: nickname,
          },
        },
      });

      // Try alternate forms (e.g. "federica 2" vs "federica2")
      if (!user) {
        const altNickname = nickname.includes(" ")
          ? nickname.replace(/\s+/g, "")
          : null;
        if (altNickname) {
          const altUser = await prisma.user.findFirst({
            where: { dbgymNickname: altNickname },
          });
          if (altUser) userId = altUser.id;
        }
      } else {
        userId = user.id;
      }

      if (!userId) {
        dettagli.push({ ...pick(item), azione: `istruttore "${nickname}" non trovato` });
        skipped++;
        continue;
      }
    }

    // Check for existing record (idempotency)
    const existing = isTurni
      ? await prisma.registrazioneOre.findFirst({
          where: {
            data: giorno,
            oraInizio: item.oraInizio,
            attivita: item.attivita,
            userId: null,
            sorgente: "dbgym",
          },
        })
      : await prisma.registrazioneOre.findFirst({
          where: {
            data: giorno,
            oraInizio: item.oraInizio,
            userId: userId!,
          },
        });

    // For TURNI: skip if an instructor is already assigned to same slot
    if (isTurni && !existing) {
      const giàAssegnata = await prisma.registrazioneOre.findFirst({
        where: {
          data: giorno,
          oraInizio: item.oraInizio,
          attivita: item.attivita,
          userId: { not: null },
        },
      });
      if (giàAssegnata) {
        dettagli.push({ ...pick(item), azione: "skip (già assegnata a istruttore)" });
        skipped++;
        continue;
      }
    }

    if (existing) {
      if (existing.stato === "da_confermare") {
        // Update participant count + recalculate compenso
        const compenso = await calcolaCompenso(userId, item.attivita, item.partecipanti);
        await prisma.registrazioneOre.update({
          where: { id: existing.id },
          data: {
            partecipanti: item.partecipanti,
            compenso,
            attivita: item.attivita,
          },
        });
        dettagli.push({ ...pick(item), azione: "aggiornata" });
        aggiornate++;
      } else {
        // Already confirmed/rejected — don't touch
        dettagli.push({ ...pick(item), azione: `skip (stato=${existing.stato})` });
        skipped++;
      }
      continue;
    }

    // Create new lesson
    const compenso = await calcolaCompenso(userId, item.attivita, item.partecipanti);

    await prisma.registrazioneOre.create({
      data: {
        userId,
        data: giorno,
        oraInizio: item.oraInizio,
        attivita: item.attivita,
        partecipanti: item.partecipanti,
        compenso,
        stato: "da_confermare",
        sorgente: "dbgym",
      },
    });

    dettagli.push({ ...pick(item), azione: "creata" });
    create++;
  }

  return NextResponse.json({
    ok: true,
    data,
    create,
    aggiornate,
    skipped,
    dettagli,
  });
}

async function calcolaCompenso(
  userId: string | null,
  attivita: string,
  partecipanti: number
): Promise<number | null> {
  if (!userId) return null;

  const tariffa = await prisma.tariffaIstruttore.findUnique({
    where: { userId_attivita: { userId, attivita } },
  });

  if (!tariffa) return null;

  if (tariffa.compensoAlto !== null && partecipanti >= SOGLIA_PARTECIPANTI) {
    return tariffa.compensoAlto;
  }
  return tariffa.compenso;
}

function pick(item: { attivita: string; oraInizio: string; dbgymNickname: string }) {
  return { attivita: item.attivita, oraInizio: item.oraInizio, dbgymNickname: item.dbgymNickname };
}
