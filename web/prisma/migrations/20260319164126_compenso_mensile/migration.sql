-- CreateTable
CREATE TABLE "compensi_mensili" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mese" INTEGER NOT NULL,
    "anno" INTEGER NOT NULL,
    "importo" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "compensi_mensili_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "compensi_mensili_userId_mese_anno_key" ON "compensi_mensili"("userId", "mese", "anno");
