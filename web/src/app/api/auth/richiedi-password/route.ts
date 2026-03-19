import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Rate limit in-memory: telefono → timestamp ultima richiesta
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minuti

function generatePassword(): string {
  return crypto.randomBytes(4).toString("hex"); // 8 char esadecimali
}

export async function POST(req: NextRequest) {
  try {
    const { telefono } = await req.json();

    if (!telefono || typeof telefono !== "string") {
      return NextResponse.json(
        { error: "Numero di telefono richiesto" },
        { status: 400 }
      );
    }

    const cleaned = telefono.replace(/\s/g, "").replace(/^(\+39)/, "");
    if (!/^\d{9,10}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Formato numero non valido" },
        { status: 400 }
      );
    }

    const telefonoDb = `+39${cleaned}`;

    // Rate limit
    const lastRequest = rateLimitMap.get(telefonoDb);
    if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
      const minutiRimasti = Math.ceil(
        (RATE_LIMIT_MS - (Date.now() - lastRequest)) / 60000
      );
      return NextResponse.json(
        {
          error: `Attendi ${minutiRimasti} minuti prima di richiedere una nuova password`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telefono: telefonoDb },
    });

    if (!user || !user.attivo) {
      return NextResponse.json(
        { error: "Numero non trovato" },
        { status: 404 }
      );
    }

    // Genera e salva password
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invia via WhatsApp tramite n8n webhook
    const n8nUrl =
      process.env.N8N_WHATSAPP_WEBHOOK_URL ||
      "https://n8n.andrealanzone.it/webhook/whatsapp-andrea";

    const message1 = [
      `Ciao ${user.nome}!`,
      ``,
      `Ecco la tua password per accedere al portale ore O-Zone.`,
      `Accedi su: https://istruttori.olisticzone.it/login`,
      `Usa il tuo numero di telefono come utente.`,
    ].join("\n");

    // Msg 1: istruzioni
    const res1 = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: telefonoDb, text: message1 }),
    });

    if (!res1.ok) {
      console.error("Errore invio WhatsApp msg1:", res1.status, await res1.text());
      return NextResponse.json(
        { error: "Errore nell'invio del messaggio WhatsApp" },
        { status: 502 }
      );
    }

    // Msg 2: solo password (facile da copiare)
    const res2 = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: telefonoDb, text: password }),
    });

    if (!res2.ok) {
      console.error("Errore invio WhatsApp msg2:", res2.status, await res2.text());
    }

    // Aggiorna rate limit solo dopo successo
    rateLimitMap.set(telefonoDb, Date.now());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Errore richiedi-password:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
