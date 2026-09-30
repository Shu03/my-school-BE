/*
  Warnings:

  - You are about to drop the column `status` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `permissionOverrides` on the `teacher_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `presetId` on the `teacher_profiles` table. All the data in the column will be lost.
  - You are about to drop the `permission_presets` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('HOMEWORK', 'MARKS');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "teacher_profiles" DROP CONSTRAINT "teacher_profiles_presetId_fkey";

-- AlterTable
ALTER TABLE "teacher_profiles" DROP COLUMN "permissionOverrides",
DROP COLUMN "presetId";

-- DropTable
DROP TABLE "permission_presets";

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "type" "AccessType" NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sectionId" TEXT,
    "subjectId" TEXT,
    "reason" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_days" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_requesterId_status_idx" ON "access_requests"("requesterId", "status");

-- CreateIndex
CREATE INDEX "access_requests_sectionId_subjectId_type_status_idx" ON "access_requests"("sectionId", "subjectId", "type", "status");

-- CreateIndex
CREATE INDEX "attendance_days_academicYearId_idx" ON "attendance_days"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_days_sectionId_date_key" ON "attendance_days"("sectionId", "date");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every section/date with existing attendance becomes a taken day
INSERT INTO "attendance_days" ("id", "sectionId", "academicYearId", "date", "markedById", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    a."sectionId",
    MIN(a."academicYearId"),
    a."date",
    MIN(tp."userId"),
    MIN(a."createdAt"),
    MAX(a."updatedAt")
FROM "attendance" a
LEFT JOIN "teacher_profiles" tp ON tp."id" = a."markedById"
GROUP BY a."sectionId", a."date";

-- Only absences are stored from now on
DELETE FROM "attendance" WHERE "status" = 'PRESENT';

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "status";

-- DropEnum
DROP TYPE "AttendanceStatus";
