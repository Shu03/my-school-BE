<!-- source-hash: 12f8b01e3cbd · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-subjects by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp subjects`. -->

## Purpose

A subject catalogue keyed by `(name, classLevel)` and `(code, classLevel)`. Subjects are not tied to an academic year. Deletion is guarded against teacher assignments and approved access requests.

## Business rules & invariants

- `create` (subjects.service.ts:66-78) checks name and code uniqueness per classLevel (`assertNameNotTaken` :28-45, `assertCodeNotTaken` :47-64). The schema has matching uniques (academic.prisma:80-81).
- DTO: name at most 100 chars, code at most 10 chars, classLevel an integer ≥1, description at most 500 chars and optional (create-subject.dto.ts).
- `findAll` (:81-96) filters optionally by classLevel and by a case-insensitive `contains` search on name.
- `findOne` (:99-125) includes teacherAssignments with the teacher and user (password omitted) and the section.
- `update` (:128-160) needs name, code or description, otherwise 400. classLevel cannot be changed, and uniqueness is checked against the existing classLevel.
- `delete` (:164-188) returns 404 if the subject is missing. It returns 400 if any teacherClassAssignment references it, or if any `AccessRequest` with status APPROVED exists (`ERROR_SUBJECT_HAS_ACTIVE_ACCESS`).

## Access control notes

- ADMIN only: POST, PATCH /:id, DELETE /:id (subjects.controller.ts:38-80).
- No @Roles, so any authenticated role can call GET / and GET /:id (:49, :58). The service does no scoping.

## Cross-module contracts

- Exports `SubjectsModule`, `SubjectsService` and types.
- Grep found no uses of `SubjectsService` outside the module. Other modules query `prisma.subject` directly.
- Reads `teacherClassAssignment` and `accessRequest` via Prisma.

## Known pitfalls / risks

- Race between the delete checks and the delete (:167-187): no transaction, so an assignment or approval created in between can cause an FK error or leave orphans, depending on the onDelete rules.
- Only APPROVED access requests block deletion. PENDING requests referencing the subject are not checked.
- Information leak: GET /subjects/:id exposes every teacher assignment with the teacher's user record (only the password omitted) to STUDENT callers (:102-114).
- Assignments are not filtered by academic year, so `findOne` includes past years' assignments. Any historical assignment also blocks deletion forever.
- Delete does not check ExamSubject or Homework references. Those relations are required with the default Restrict, so deleting a subject in use raises P2003 → 500 (exam.prisma:48, homework.prisma:14). Non-approved AccessRequests have an optional relation and get `subjectId` set to null.
- Uniqueness checks are check-then-write, so a race gives P2002 → 409 via the global filter. The name check is case-sensitive, so "Math" and "math" can coexist.
- `findAll` has no pagination.

## Test focus

- Create with a duplicate name or code at the same classLevel gives 400. The same name at a different level is OK.
- Update with no fields gives 400. Renaming to its own current name is OK. A code clash gives 400.
- Delete is blocked by an assignment (400 with a count), blocked by an APPROVED access request, and allowed with only PENDING or REJECTED requests. A nonexistent id gives 404.
- STUDENT/TEACHER get 403 on POST/PATCH/DELETE. Check what GET /:id exposes to a STUDENT (teacher PII).
- Search is case-insensitive, and the classLevel filter works.
- Concurrent assignment creation during delete (race).
