-- AlterTable: add date columns with a temporary default to backfill existing rows
ALTER TABLE "announcements" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "endDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: give existing announcements a 7-day window from their creation date
UPDATE "announcements" SET "startDate" = "createdAt", "endDate" = "createdAt" + INTERVAL '7 days';

-- Drop defaults so future rows must supply explicit dates
ALTER TABLE "announcements" ALTER COLUMN "startDate" DROP DEFAULT,
ALTER COLUMN "endDate" DROP DEFAULT;
