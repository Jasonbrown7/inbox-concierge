/*
  Warnings:

  - You are about to drop the column `color` on the `Bucket` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Bucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bucket" ("createdAt", "description", "id", "isDefault", "name", "slug", "sortOrder", "updatedAt", "userId") SELECT "createdAt", "description", "id", "isDefault", "name", "slug", "sortOrder", "updatedAt", "userId" FROM "Bucket";
DROP TABLE "Bucket";
ALTER TABLE "new_Bucket" RENAME TO "Bucket";
CREATE INDEX "Bucket_userId_slug_idx" ON "Bucket"("userId", "slug");
CREATE UNIQUE INDEX "Bucket_userId_slug_key" ON "Bucket"("userId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
