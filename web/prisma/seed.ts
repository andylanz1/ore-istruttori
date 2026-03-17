import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminHash = await bcrypt.hash("admin2026", 10);
  await prisma.user.upsert({
    where: { email: "admin@olisticzone.it" },
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
    where: { email: "responsabile@olisticzone.it" },
    update: {},
    create: {
      nome: "Responsabile",
      cognome: "Fitness",
      email: "responsabile@olisticzone.it",
      telefono: "+393279451839",
      passwordHash: respHash,
      ruolo: "responsabile",
    },
  });

  // Istruttore di test
  const testHash = await bcrypt.hash("test2026", 10);
  await prisma.user.upsert({
    where: { email: "test@olisticzone.it" },
    update: {},
    create: {
      nome: "Mario",
      cognome: "Rossi",
      email: "test@olisticzone.it",
      telefono: "+393331234567",
      passwordHash: testHash,
      ruolo: "istruttore",
    },
  });

  console.log("Seed completato:");
  console.log("  Admin:         admin@olisticzone.it         / admin2026");
  console.log("  Responsabile:  responsabile@olisticzone.it  / resp2026");
  console.log("  Istruttore:    test@olisticzone.it          / test2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
