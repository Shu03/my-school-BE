/*
  Warnings:

  - You are about to drop the column `date` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `totalMarks` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `examId` on the `grades` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[examSubjectId,studentId]` on the table `grades` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `examSubjectId` to the `grades` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_examId_fkey";

-- DropIndex
DROP INDEX "exams_subjectId_academicYearId_idx";

-- DropIndex
DROP INDEX "grades_examId_idx";

-- DropIndex
DROP INDEX "grades_examId_studentId_key";

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "date",
DROP COLUMN "subjectId",
DROP COLUMN "totalMarks";

-- AlterTable
ALTER TABLE "grades" DROP COLUMN "examId",
ADD COLUMN     "examSubjectId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "exam_subjects" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_subjects_subjectId_idx" ON "exam_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subjects_examId_subjectId_key" ON "exam_subjects"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "grades_examSubjectId_idx" ON "grades"("examSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "grades_examSubjectId_studentId_key" ON "grades"("examSubjectId", "studentId");

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "exam_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
