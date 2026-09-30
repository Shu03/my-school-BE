<!-- source-hash: 263fefb5629b · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-request-access by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp request-access`. -->

## Purpose
Lets teachers ask for HOMEWORK or MARKS access to one section + subject pair, and lets admins approve, reject, revoke or directly grant that access. It also exports `AccessPolicyService`, which other modules call to decide what a teacher may do.
## Business rules & invariants
- Only an active TEACHER with a teacherProfile can request or receive access; otherwise 400 (`assertRequesterIsActiveTeacher`, request-access.service.ts:97-116).
- Scope rules (`assertValidScope`, :118-155): sectionId and subjectId are both required; each must exist (404 if not); the subject's classLevel must match the section's; the section must be in the current academic year (`AcademicYearsService.findCurrent`).
- A request or grant is rejected if the teacher already has access (`resolveSubjectAccess`: CLASS_TEACHER, SUBJECT_TEACHER or GRANTED) (:158-184). It is also rejected if a PENDING request already exists for the same user, type and scope (:186-207).
- Status transitions (`setStatus` :224-244 uses a conditional `updateMany where status=expected`):
  - PENDING→CANCELLED (`cancel` :348, requester only)
  - PENDING→APPROVED (`approve` :360)
  - PENDING→REJECTED (`reject` :375)
  - APPROVED→REVOKED (`revoke` :390)
  - Any other transition returns 400 INVALID_STATUS.
- `grant` (:297-325) creates the row directly as APPROVED, with requestedBy = reviewedBy = the admin.
- `create` sets requestedById to the requester (:291).
- `AccessPolicyService.resolveSubjectAccess` (access-policy.service.ts:56-82): an assignment wins over a grant. `orderBy role asc` prefers CLASS_TEACHER. A class teacher covers every subject in the section.
- `buildSectionScope` (:114-124): the teacher is assigned to the section OR has any APPROVED request for it, of any type.
- Lists use `$transaction([findMany, count])` with pagination (:246-273).
## Access control notes
- TEACHER routes: POST /, GET mine, PATCH :id/cancel. ADMIN routes: GET /, POST grants, GET sections/:sectionId/subjects/:subjectId, approve, reject, revoke. ADMIN and TEACHER: GET :id (controller :40-148).
- `findOne` returns 403 when a non-admin is not the requester (:341). This happens after the existence check, so a missing id gives 404 and someone else's id gives 403 (this reveals that the id exists).
- `cancel` returns 403 when the caller is not the requester, including admins (:351).
- All ids go through `ParseUUIDPipe`.
## Cross-module contracts
- Exports (index.ts): RequestAccessModule, RequestAccessService, AccessPolicyService, and the types.
- `AccessPolicyService` is used by the attendance, grades, homework and exams services and by dashboard/teacher-dashboard.service.ts. Their modules import RequestAccessModule.
- Consumes: AcademicYearsService.findCurrent, JwtPayload (auth), PrismaService.
## Known pitfalls / risks
- Read-then-create race: the duplicate-pending and existing-access checks (:281-282, :303-309) have no DB unique constraint behind them. access.prisma only has indexes (:40-41), so parallel POSTs can create duplicates.
- `hasApprovedAccess`/`buildSectionScope` do not re-check the academic year, whether the section is still current, or whether the requester is still an active teacher. Old APPROVED grants keep working until they are revoked.
- `buildSectionScope` ignores `type`: a MARKS grant also makes the section visible for homework and attendance scoping (access-policy.service.ts:118-121).
- `findSubjectAccess` uses an unbounded `findMany` (:437-441). With no assignment, `classTeacher` can be null.
- `setStatus` makes an extra read after the update. If `count === 0` it re-reads the row and reports the current status (:237-241). This is OK but not wrapped in a transaction.
- `findOne` returns 404 vs 403, which lets a caller probe whether an id exists.
## Test focus
- A teacher calling GET :id on another teacher's request gets 403; a missing id gets 404; an admin gets 200.
- A teacher (or admin) cancelling someone else's request gets 403. Cancelling an APPROVED request gets 400.
- Concurrent approve and reject on one PENDING request: exactly one succeeds and the other gets 400.
- Revoking a request that is not APPROVED gets 400. After revoke, `resolveSubjectAccess` returns null.
- Create is rejected when the teacher is already class teacher or subject teacher, or has a pending request. Subject level mismatch and a section outside the current year give 400.
- Grant for an inactive teacher, a non-teacher, or a user with no teacherProfile gives 400.
- Parallel duplicate create (race) produces duplicate rows.
- A MARKS grant widens `buildSectionScope` into homework/attendance.
