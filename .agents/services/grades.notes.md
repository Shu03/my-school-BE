<!-- source-hash: c8a81174e83d · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-grades by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp grades`. -->

## Purpose
Bulk entry and retrieval of marks per ExamSubject, plus a class summary for one exam subject and a student's grade history.
## Business rules & invariants
- `enterGrades` (grades.service.ts:127) rejects an exam that is finalized or discarded (400) and returns 404 if the ExamSubject does not exist.
- Each mark must satisfy 0 ≤ marks ≤ totalMarks (:96-100, 152-154).
- Every student must have an ACTIVE enrollment in the exam's section and year. The error lists the invalid ids (:102-125).
- Entry is an upsert-by-replacement: `deleteMany` then `createMany` inside a `$transaction` (:163-179). `gradedById` is the TeacherProfile id, or null for admins.
- Grade is unique on `[examSubjectId, studentId]` (exam.prisma:70). Duplicate studentIds inside one request are not rejected, so `createMany` would fail with a Prisma error.
- The summary computes average, max, min and percentages in memory (:250-266).
## Access control notes
- POST grades allows ADMIN and TEACHER. GET grades allows ADMIN, TEACHER and STUDENT. GET summary allows ADMIN and TEACHER. GET `grades/student/:studentId` allows ADMIN, TEACHER and STUDENT (grades.controller.ts).
- Entering marks as a teacher requires `resolveSubjectAccess(MARKS, section, subject)`: class teacher, subject teacher for that subject, or an approved MARKS grant. Otherwise 403 (:79-94).
- Reading grades or the summary as a teacher requires `isAssignedToSection` OR `hasApprovedAccess(MARKS)`. Any subject teacher in the section can therefore read every subject's marks (:184-202).
- A STUDENT reading grades is filtered to their own row (:216-219). The summary returns 403 for students in the service as well (:236).
- Student history: a STUDENT can only see their own record. A TEACHER needs an assignment in a section where the student is ACTIVE in that year (:293-319).
- Checks for existence (404) run before authorization in the read paths (:209-215, :233-242).
## Cross-module contracts
- `index.ts` exports GradesModule, GradesService and types. A grep found no external importers.
- Consumes `ExamsService` (from `@modules/exams`), `AccessPolicyService` and `AcademicYearsService`.
## Known pitfalls / risks
- The finalized/discarded check is not inside the transaction, so it races with `finalize`.
- A STUDENT can read their own grades for any exam, even one outside their section, without an enrollment check (:216).
- A STUDENT can also see grades before the exam is finalized.
- The history query does not filter out DISCARDED exams (:321-338).
- Duplicate studentIds in `records` cause an unhandled P2002 error, probably a 500.
- `percentage` divides by totalMarks; the DTOs were not read, so it is unconfirmed whether totalMarks can be 0.
- `grade.findMany` calls are unbounded.
- `GRADE_STUDENT_INCLUDE` returns the full user row minus the password (email, phone and similar) to other viewers (:32-42).
- No spec files exist for this module.
## Test focus
- A subject teacher enters marks for another subject and gets 403. With an approved MARKS grant the entry succeeds.
- Entry on a finalized or discarded exam gives 400.
- Marks greater than totalMarks, or a non-enrolled or inactive student, give 400.
- Duplicate studentIds in one request (expected to return 500).
- A STUDENT sees only their own row. The same student gets 403 on the summary and 403 on another student's history.
- Re-entering marks replaces the old ones, and other students' grades are left alone.
- A teacher from another section gets 403 on history.
