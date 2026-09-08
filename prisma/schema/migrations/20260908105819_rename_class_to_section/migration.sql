-- Rename Class -> Section, gradeLevel -> classLevel, classId -> sectionId.
-- Non-destructive: renames tables/columns/constraints/indexes to preserve data.

-- Rename table classes -> sections and its gradeLevel column
ALTER TABLE "classes" RENAME TO "sections";
ALTER TABLE "sections" RENAME COLUMN "gradeLevel" TO "classLevel";
ALTER TABLE "sections" RENAME CONSTRAINT "classes_pkey" TO "sections_pkey";
ALTER TABLE "sections" RENAME CONSTRAINT "classes_academicYearId_fkey" TO "sections_academicYearId_fkey";
ALTER INDEX "classes_academicYearId_idx" RENAME TO "sections_academicYearId_idx";
ALTER INDEX "classes_gradeLevel_academicYearId_idx" RENAME TO "sections_classLevel_academicYearId_idx";
ALTER INDEX "classes_name_academicYearId_key" RENAME TO "sections_name_academicYearId_key";

-- attendance.classId -> sectionId
ALTER TABLE "attendance" RENAME COLUMN "classId" TO "sectionId";
ALTER TABLE "attendance" RENAME CONSTRAINT "attendance_classId_fkey" TO "attendance_sectionId_fkey";
ALTER INDEX "attendance_classId_date_idx" RENAME TO "attendance_sectionId_date_idx";

-- exams.classId -> sectionId
ALTER TABLE "exams" RENAME COLUMN "classId" TO "sectionId";
ALTER TABLE "exams" RENAME CONSTRAINT "exams_classId_fkey" TO "exams_sectionId_fkey";
ALTER INDEX "exams_classId_academicYearId_idx" RENAME TO "exams_sectionId_academicYearId_idx";

-- fee_structures.gradeLevel -> classLevel
ALTER TABLE "fee_structures" RENAME COLUMN "gradeLevel" TO "classLevel";
ALTER INDEX "fee_structures_gradeLevel_academicYearId_key" RENAME TO "fee_structures_classLevel_academicYearId_key";

-- homework.classId -> sectionId
ALTER TABLE "homework" RENAME COLUMN "classId" TO "sectionId";
ALTER TABLE "homework" RENAME CONSTRAINT "homework_classId_fkey" TO "homework_sectionId_fkey";
ALTER INDEX "homework_classId_academicYearId_idx" RENAME TO "homework_sectionId_academicYearId_idx";

-- student_enrollments.classId -> sectionId
ALTER TABLE "student_enrollments" RENAME COLUMN "classId" TO "sectionId";
ALTER TABLE "student_enrollments" RENAME CONSTRAINT "student_enrollments_classId_fkey" TO "student_enrollments_sectionId_fkey";
ALTER INDEX "student_enrollments_classId_academicYearId_idx" RENAME TO "student_enrollments_sectionId_academicYearId_idx";

-- subjects.gradeLevel -> classLevel
ALTER TABLE "subjects" RENAME COLUMN "gradeLevel" TO "classLevel";
ALTER INDEX "subjects_code_gradeLevel_key" RENAME TO "subjects_code_classLevel_key";
ALTER INDEX "subjects_gradeLevel_idx" RENAME TO "subjects_classLevel_idx";
ALTER INDEX "subjects_name_gradeLevel_key" RENAME TO "subjects_name_classLevel_key";

-- teacher_class_assignments.classId -> sectionId
ALTER TABLE "teacher_class_assignments" RENAME COLUMN "classId" TO "sectionId";
ALTER TABLE "teacher_class_assignments" RENAME CONSTRAINT "teacher_class_assignments_classId_fkey" TO "teacher_class_assignments_sectionId_fkey";
ALTER INDEX "teacher_class_assignments_classId_idx" RENAME TO "teacher_class_assignments_sectionId_idx";
ALTER INDEX "teacher_class_assignments_teacherId_classId_subjectId_key" RENAME TO "teacher_class_assignments_teacherId_sectionId_subjectId_key";
