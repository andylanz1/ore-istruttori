/*
  Warnings:

  - You are about to drop the column `oraFine` on the `registrazioni_ore` table. All the data in the column will be lost.
  - You are about to drop the column `oraInizio` on the `registrazioni_ore` table. All the data in the column will be lost.
  - Added the required column `partecipanti` to the `registrazioni_ore` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_registrazioni_ore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "ore" REAL NOT NULL,
    "attivita" TEXT NOT NULL,
    "partecipanti" INTEGER NOT NULL,
    "note" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'bozza',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "registrazioni_ore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_registrazioni_ore" ("attivita", "createdAt", "data", "id", "note", "ore", "stato", "updatedAt", "userId") SELECT "attivita", "createdAt", "data", "id", "note", "ore", "stato", "updatedAt", "userId" FROM "registrazioni_ore";
DROP TABLE "registrazioni_ore";
ALTER TABLE "new_registrazioni_ore" RENAME TO "registrazioni_ore";
CREATE UNIQUE INDEX "registrazioni_ore_userId_data_attivita_key" ON "registrazioni_ore"("userId", "data", "attivita");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
