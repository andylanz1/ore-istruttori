-- AlterTable
ALTER TABLE "registrazioni_ore" ADD COLUMN "compenso" REAL;

-- CreateTable
CREATE TABLE "tariffe_istruttore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "attivita" TEXT NOT NULL,
    "compenso" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tariffe_istruttore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tariffe_istruttore_userId_attivita_key" ON "tariffe_istruttore"("userId", "attivita");
