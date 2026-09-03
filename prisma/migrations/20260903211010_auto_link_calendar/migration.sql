-- Delete all rows to avoid NOT NULL constraint violations when adding userId
DELETE FROM "google_calendar_tokens";

-- DropForeignKey
ALTER TABLE "google_calendar_tokens" DROP CONSTRAINT "google_calendar_tokens_professionalId_fkey";

-- DropIndex
DROP INDEX "google_calendar_tokens_professionalId_key";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "google_calendar_tokens" DROP COLUMN "professionalId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "google_calendar_tokens_userId_key" ON "google_calendar_tokens"("userId");

-- AddForeignKey
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
