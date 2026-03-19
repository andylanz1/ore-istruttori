import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NICKNAMES: Record<string, { nome: string; cognome: string }> = {
  stefania: { nome: "Stefania", cognome: "Mallardi" },
  eliseba: { nome: "Eliseba", cognome: "Malacrida" },
  carla: { nome: "Carla", cognome: "De Sarno" },
  fede: { nome: "Federica", cognome: "Tirone" },
  "federica 2": { nome: "Federica", cognome: "Giani" },
  vanessa: { nome: "Vanessa", cognome: "Sanfilippo" },
  annamaria: { nome: "Anna", cognome: "Bettini" },
  stefanone: { nome: "Stefano", cognome: "Martire" },
  raky: { nome: "Rachele", cognome: "Galbiati" },
};

async function main() {
  for (const [nickname, { nome, cognome }] of Object.entries(NICKNAMES)) {
    const user = await prisma.user.findFirst({
      where: { nome, cognome },
    });

    if (!user) {
      console.log(`❌ Utente non trovato: ${nome} ${cognome}`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { dbgymNickname: nickname },
    });

    console.log(`✅ ${nome} ${cognome} → dbgymNickname: "${nickname}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
