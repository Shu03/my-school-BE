<!-- source-hash: 7202c2c81625 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-students by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp students`. -->

## Purpose
Handles student profile reads and updates, enrolling a student in a section per academic year, enrollment history and status updates, and bulk promotion. It generates fee records as a side effect.
## Business rules & invariants
- `StudentEnrollment` is unique on `(studentId, academicYearId)`: one enrollment per year. P2002 in `enroll` → 409 (students.service.ts:344-347).
- `admissionNumber` is `@unique`. P2002 in `update` is not caught, so it surfaces as a 500 (:273-298).
- `enroll` (:300-350):
  - The section must belong to the target year, otherwise 400.
  - The roll number is either given or generated as the zero-padded count of ACTIVE enrollments + 1 (:82-92, `ROLL_NUMBER_PAD_WIDTH`).
  - It then calls `FeesService.generateFeeRecordForStudent`; failures are only logged (:331-341).
- `promote` (:399-494), per student:
  - Skips if the student is not found or is already enrolled in the target year.
  - Otherwise, in a transaction, marks the most recent ACTIVE enrollment as PROMOTED and creates the new one.
  - Roll numbers continue from the count of existing ACTIVE students in the target section.
  - Fee generation is best-effort.
- `updateEnrollment` (:373-397) requires `status` or `rollNumber`. Any status is accepted; there is no state-machine check. The enrollment must belong to the given student (`findFirst {id, studentId}`).
- `update` requires `dateOfBirth` or `admissionNumber`.
- Pagination defaults are page=1 and limit=20. Search covers firstName, lastName and admissionNumber, case-insensitive.
## Access control notes
- `POST promote`, `PATCH :id`, `POST :id/enroll`, `PATCH :id/enrollments/:enrollmentId`: ADMIN.
- `GET` (list) and `GET :id`: ADMIN, TEACHER, STUDENT.
- `GET :id/enrollments`: ADMIN, STUDENT.
- `findAll` scoping (:143-185):
  - STUDENT sees only their own profile.
  - TEACHER is limited to their `classAssignments` sections, class **and** subject roles alike, in that year. A `sectionId` they are not assigned to gives an empty result.
  - ADMIN is unrestricted.
- `findOne`:
  - Not found → 404 first.
  - STUDENT asking for another student → 403.
  - TEACHER → `assertTeacherHasAccessToStudent` (:94-124) checks for an ACTIVE enrollment in any assigned section, in **any** year → 403 otherwise.
- `findEnrollments`: STUDENT on another student → 403. Existence is checked first, so 404 vs 403 leaks whether an id exists.
- AccessPolicyService is not used; the service has its own teacher-scope logic.
## Cross-module contracts
- index.ts exports: `StudentsModule`, `StudentsService`, and the types `EnrollmentBasic`, `PromotionResult`, `StudentBasic`, `StudentWithEnrollment`. No outside callers found by grep.
- Consumes `AcademicYearsService.findCurrent`, `SectionsService.findOne`, `FeesService.generateFeeRecordForStudent`, and `PrismaService`.
## Known pitfalls / risks
- Roll-number generation is count-based and not atomic (:82-92, 413-423). Concurrent enrolls, or enrollments that were withdrawn, can produce duplicate or reused roll numbers, and no unique constraint on rollNumber exists.
- Several `:id` / `:enrollmentId` params have no `ParseUUIDPipe` (students.controller.ts:79, 93, 109, 122, 136-137), unlike the other modules.
- In `promote`, a P2002 from a concurrent create is not caught, so it becomes a 500. `promote` is N+1 (3 queries plus a transaction per student). `dto.studentIds` has no transaction across the whole batch, so partial success is possible.
- `enroll` does not wrap the enrollment and the fee record in one transaction, so a student can be enrolled without a fee record. That is only logged.
- `assertTeacherHasAccessToStudent` ignores the academic year: a teacher with an old assignment still sees a student who is ACTIVE in the same section.
- An `admissionNumber` clash on update → 500.
- `updateEnrollment` allows arbitrary status changes, e.g. reactivating a PROMOTED enrollment, which could give two ACTIVE enrollments across years.
- Spec files exist: students.controller.spec.ts and students.service.spec.ts.
## Test focus
- TEACHER listing with an unassigned `sectionId` → empty. `GET :id` on a student outside their sections → 403. Subject teacher sees their section.
- STUDENT `GET :id` or `:id/enrollments` for another student → 403. TEACHER on `:id/enrollments` → 403 (roles).
- Enroll twice in the same year → 409. Section from another year → 400.
- Concurrent enrolls in the same section: roll-number uniqueness.
- Promote: skip reasons, the old enrollment set to PROMOTED, roll numbers continuing, fee record created or missing, and partial failure.
- Duplicate `admissionNumber` update → expect 409, not 500.
- Non-UUID id → currently a Prisma error or 404; decide on the intended behaviour.
