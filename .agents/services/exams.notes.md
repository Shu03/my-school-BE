<!-- source-hash: 984a5f9f790d · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-exams by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp exams`. -->

## Purpose
Admin-managed exams per section and academic year. Each exam has one or more ExamSubjects (subject, totalMarks, date). Exams can be finalized, unlocked and discarded, and exam detail includes grade aggregates.
## Business rules & invariants
- `create` (exams.service.ts:163) requires a non-empty list of unique subjects (:129-137). Each subject's `classLevel` must equal the section's classLevel; this is checked sequentially, one query pair per subject (:139-146). The year defaults to the current one. If a term is given, it must belong to that year (:148-161).
- `create` does not check that the section belongs to the given academic year.
- State flags are `isFinalized` (bool) and `status` (ACTIVE/DISCARDED). Allowed transitions:
  - `finalize`: rejected if DISCARDED or already finalized (:399-409).
  - `unlock`: rejected if DISCARDED, with no check that the exam is finalized (:411-420).
  - `discard`: rejected if finalized (:422-431). Discard has no way back.
- `update`, `addSubject`, `updateSubject` and `removeSubject` require the exam to be neither finalized nor discarded (:310-397).
- `update` rejects an empty body (:311) and only covers name, type and termId.
- `addSubject` rejects a duplicate subject (:339). `removeSubject` refuses to remove the last subject (:388).
- `ExamSubject` is unique on `[examId, subjectId]`. Grades cascade on ExamSubject deletion (exam.prisma:47, 51, 66).
- `findAll` defaults to status ACTIVE and the current year, is paginated, and runs findMany and count in one `$transaction` (:197-247).
## Access control notes
- All mutations are `@Roles(ADMIN)`. GET list and GET `:id` allow ADMIN, TEACHER and STUDENT (exams.controller.ts:43-160).
- In `findAll`, a TEACHER is scoped by `accessPolicy.buildSectionScope`: assigned sections, or sections where the teacher holds any APPROVED AccessRequest of any type. A STUDENT is scoped to their ACTIVE enrollment in that year (:221-233).
- `findOne` uses `canViewSection` for teachers and an ACTIVE enrollment check for students; both return 403 on failure. The existence check runs first, so an unknown id gives 404 before the authorization check (existence leak).
- `findOne` returns grade count and average for all students, including to students (:279-305).
## Cross-module contracts
- `index.ts` exports ExamsModule, ExamsService and the types ExamBasic, ExamSubjectBasic and ExamWithSummary.
- GradesService uses `getByIdOrThrow` and `getExamSubjectOrThrow` (grades.service.ts:18, 133, 143).
- Consumes `AcademicYearsService`, `AccessPolicyService` (`buildSectionScope`, `canViewSection`) and the Grade table for aggregates.
## Known pitfalls / risks
- The state checks are read-then-write with no transaction or conditional `where`, so they can race. For example, `finalize` can run alongside grade entry, or `discard` alongside `finalize` (:399-431).
- `updateSubject` can lower `totalMarks` below marks that are already entered, and existing grades are not revalidated (:371-377).
- `removeSubject` silently deletes that subject's grades through the cascade.
- `:id` and `:subjectId` params have no ParseUUIDPipe, so an invalid UUID can reach Prisma.
- The subject-level check is N+1 (:143-145).
- The "Subject not found" and "Section not found" messages are hard-coded strings, not constants (:117, :121).
- A teacher holding an approved grant in a section (for any subject or type) can see every exam in that section.
- No unit spec files exist for this module.
## Test focus
- The state machine: finalize → update gives 400; unlock → update works; discard while finalized gives 400; every operation on a discarded exam gives 400.
- Removing the last subject gives 400. A duplicate subject gives 400. A subject whose classLevel does not match the section gives 400.
- A term from another year gives 400.
- A STUDENT not enrolled gets 403 on findOne, and the list excludes that exam.
- A teacher with an unrelated approved grant can see exams (scope leak).
- TEACHER calling POST/PATCH gets 403 from RolesGuard.
- Concurrent finalize and grade entry.
