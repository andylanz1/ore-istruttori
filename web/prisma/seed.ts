import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminHash = await bcrypt.hash("admin2026", 10);
  await prisma.user.upsert({
    where: { telefono: "+393279451839" },
    update: {},
    create: {
      nome: "Admin",
      cognome: "O-Zone",
      email: "admin@olisticzone.it",
      telefono: "+393279451839",
      passwordHash: adminHash,
      ruolo: "admin",
    },
  });

  // Responsabile Fitness
  const respHash = await bcrypt.hash("resp2026", 10);
  await prisma.user.upsert({
    where: { telefono: "+393279451840" },
    update: {},
    create: {
      nome: "Responsabile",
      cognome: "Fitness",
      email: "responsabile@olisticzone.it",
      telefono: "+393279451840",
      passwordHash: respHash,
      ruolo: "responsabile",
    },
  });

  // Istruttore di test (senza password — dovrà richiederla via WhatsApp)
  await prisma.user.upsert({
    where: { telefono: "+393331234567" },
    update: {},
    create: {
      nome: "Mario",
      cognome: "Rossi",
      email: "test@olisticzone.it",
      telefono: "+393331234567",
      passwordHash: null,
      ruolo: "istruttore",
    },
  });

  console.log("Seed completato:");
  console.log("  Admin:         tel 3279451839  / admin2026");
  console.log("  Responsabile:  tel 3279451840  / resp2026");
  console.log("  Istruttore:    tel 3331234567  / (richiedi via WhatsApp)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
