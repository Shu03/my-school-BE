/*
  Warnings:

  - You are about to drop the column `classTeacherId` on the `classes` table. All the data in the column will be lost.

*/
-- Backfill: convert existing Class.classTeacherId into CLASS_TEACHER assignments
INSERT INTO "teacher_class_assignments" ("id", "teacherId", "classId", "subjectId", "role", "createdAt")
SELECT gen_random_uuid()::text, c."classTeacherId", c."id", NULL, 'CLASS_TEACHER', now()
FROM "classes" c
WHERE c."classTeacherId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "teacher_class_assignments" tca
    WHERE tca."classId" = c."id"
      AND tca."role" = 'CLASS_TEACHER'
  );

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_classTeacherId_fkey";

-- AlterTable
ALTER TABLE "classes" DROP COLUMN "classTeacherId";
