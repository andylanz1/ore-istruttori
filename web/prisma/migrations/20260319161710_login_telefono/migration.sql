/*
  Warnings:

  - Made the column `telefono` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tariffe_istruttore" ADD COLUMN "compensoAlto" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_registrazioni_ore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "data" DATETIME NOT NULL,
    "oraInizio" TEXT NOT NULL,
    "attivita" TEXT NOT NULL,
    "partecipanti" INTEGER,
    "compenso" REAL,
    "note" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'bozza',
    "sorgente" TEXT NOT NULL DEFAULT 'manuale',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "registrazioni_ore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_registrazioni_ore" ("attivita", "compenso", "createdAt", "data", "id", "note", "oraInizio", "partecipanti", "stato", "updatedAt", "userId") SELECT "attivita", "compenso", "createdAt", "data", "id", "note", "oraInizio", "partecipanti", "stato", "updatedAt", "userId" FROM "registrazioni_ore";
DROP TABLE "registrazioni_ore";
ALTER TABLE "new_registrazioni_ore" RENAME TO "registrazioni_ore";
CREATE UNIQUE INDEX "registrazioni_ore_userId_data_oraInizio_key" ON "registrazioni_ore"("userId", "data", "oraInizio");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT NOT NULL,
    "passwordHash" TEXT,
    "ruolo" TEXT NOT NULL DEFAULT 'istruttore',
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "compensoFissoMensile" REAL,
    "dbgymNickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("attivo", "cognome", "createdAt", "email", "id", "nome", "passwordHash", "ruolo", "telefono", "updatedAt") SELECT "attivo", "cognome", "createdAt", "email", "id", "nome", "passwordHash", "ruolo", "telefono", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_telefono_key" ON "users"("telefono");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
