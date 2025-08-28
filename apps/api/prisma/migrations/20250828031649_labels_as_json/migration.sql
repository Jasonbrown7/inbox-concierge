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
    "gmailLabels" JSONB,
    "bucket" TEXT NOT NULL DEFAULT 'uncategorized',
    "score" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Thread" ("bucket", "fromAddress", "fromDomain", "gmailLabels", "id", "internalDate", "score", "snippet", "subject", "updatedAt", "userId") SELECT "bucket", "fromAddress", "fromDomain", "gmailLabels", "id", "internalDate", "score", "snippet", "subject", "updatedAt", "userId" FROM "Thread";
DROP TABLE "Thread";
ALTER TABLE "new_Thread" RENAME TO "Thread";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
