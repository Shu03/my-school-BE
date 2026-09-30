<!-- source-hash: 6a9c9b4b9daf · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-teachers by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp teachers`. -->

## Purpose
Manages teacher profiles (employeeCode, joiningDate) and TeacherClassAssignment rows (CLASS_TEACHER or SUBJECT_TEACHER per section). AccessPolicyService builds its access decisions on these assignments.
## Business rules & invariants
- `updateTeacher`:
  - At least one field is required (400) (teachers.service.ts:122-127).
  - employeeCode must be unique, excluding the teacher's own profile (:39-50).
- `createAssignment` (:153-221):
  - SUBJECT_TEACHER requires subjectId; CLASS_TEACHER must not have one.
  - The section must exist (404) and the subject must exist (404).
  - The subject's classLevel must equal the section's classLevel (400).
  - A section can have only one CLASS_TEACHER (400). This is only a pre-check.
- DB constraint `@@unique([teacherId, sectionId, subjectId])` (prisma/schema/teacher.prisma:38).
- `deleteAssignment`: the teacher must exist (404), the assignment must exist (404), and it must belong to that teacher (403) (:52-73, :244-251). It is a hard delete.
## Access control notes
- ADMIN only: GET / (list), PATCH :id, POST :id/assignments, DELETE assignment.
- ADMIN and TEACHER: GET :id and GET :id/assignments. For TEACHER, the service checks ownership (teacher.userId === sub) and returns 403 otherwise (:115, :230). 404 comes before 403.
- The role is compared as the string "TEACHER", not the `Role` enum.
## Cross-module contracts
- Exports: TeachersModule, TeachersService and types. No other module imports them (grep shows none).
- Its assignment data is consumed indirectly through `AccessPolicyService` and `RequestAccessService.findSubjectAccess`.
- Consumes: PrismaService only.
## Known pitfalls / risks
- Single-class-teacher race. Also, subjectId is NULL for CLASS_TEACHER, so the Postgres unique constraint does not stop duplicate CLASS_TEACHER rows (:196-207, teacher.prisma:38).
- Duplicate SUBJECT_TEACHER rows are not pre-checked. They hit P2002 and return 500.
- There is no check that the section is in the current academic year, and none that the teacher's user is active or has the TEACHER role.
- Deleting an assignment does not affect existing grants or pending requests. The teacher immediately loses assignment-based access.
- `findAllTeachers` is unbounded and has no pagination (:75-88). There is no ParseUUIDPipe on the ids.
- A malformed or unknown employeeCode update race can cause a 500. `joiningDate` is stored as a UTC date.
## Test focus
- A teacher viewing another teacher's profile or assignments gets 403. Their own gets 200. A missing id gets 404.
- A teacher calling POST/DELETE assignments or PATCH gets 403.
- A second CLASS_TEACHER for a section gets 400. Concurrent creates can produce duplicates.
- SUBJECT_TEACHER without subjectId, CLASS_TEACHER with subjectId, and a class-level mismatch all give 400.
- Deleting an assignment that belongs to another teacher gets 403.
- After deleting the assignment, `AccessPolicyService.resolveSubjectAccess` returns null.
