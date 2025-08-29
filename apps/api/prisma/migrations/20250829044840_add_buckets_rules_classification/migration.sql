/*
  Warnings:

  - You are about to drop the column `gmailLabels` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `Thread` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Bucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rule_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Thread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "snippet" TEXT,
    "fromAddress" TEXT,
    "fromDomain" TEXT,
    "internalDate" DATETIME,
    "headers" JSONB,
    "bucket" TEXT NOT NULL DEFAULT 'uncategorized',
    "classificationSource" TEXT,
    "classificationScore" REAL,
    "classificationReason" TEXT,
    "classifiedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Thread" ("bucket", "fromAddress", "fromDomain", "id", "internalDate", "snippet", "subject", "updatedAt", "userId") SELECT "bucket", "fromAddress", "fromDomain", "id", "internalDate", "snippet", "subject", "updatedAt", "userId" FROM "Thread";
DROP TABLE "Thread";
ALTER TABLE "new_Thread" RENAME TO "Thread";
CREATE INDEX "Thread_userId_bucket_idx" ON "Thread"("userId", "bucket");
CREATE INDEX "Thread_userId_internalDate_idx" ON "Thread"("userId", "internalDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Bucket_userId_slug_idx" ON "Bucket"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Bucket_userId_slug_key" ON "Bucket"("userId", "slug");

-- CreateIndex
CREATE INDEX "Rule_userId_priority_idx" ON "Rule"("userId", "priority");
