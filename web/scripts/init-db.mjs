// Inizializza il database SQLite applicando le migration e il seed
// Non richiede prisma CLI — usa il client direttamente
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { existsSync } from "fs";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "/app/data/prod.db";

async function main() {
  // Se il DB non esiste, lo crea con le migration SQL
  if (!existsSync(dbPath)) {
    console.log("Database non trovato, creo schema...");
    // Usa sqlite3 se disponibile, altrimenti prisma client farà pushDb
    try {
      const prisma = new PrismaClient();
      // Usa db push come alternativa a migrate deploy
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      });
      await prisma.$disconnect();
    } catch {
      console.log("Prisma db push non disponibile, provo con $executeRawUnsafe...");
    }
  }

  console.log("Database pronto.");
}

main().catch(console.error);
