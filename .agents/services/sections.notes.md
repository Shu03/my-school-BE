<!-- source-hash: ae8bc8de20b8 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-sections by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp sections`. -->

## Purpose

CRUD (minus delete) for class sections within an academic year, for example "10-A" at classLevel 10. It also shows the section's class teacher.

## Business rules & invariants

- `create` (sections.service.ts:49-67) uses the given academicYearId or falls back to the current year (404 if none). The name must be unique within the year (`assertClassNameNotTaken` :30-47, schema `@@unique([name, academicYearId])` academic.prisma:59).
- DTO: name at most 20 chars, classLevel an integer ≥1, academicYearId an optional UUID (create-section.dto.ts).
- `findAll` (:69-86) is scoped to the given year or the current one, with an optional classLevel filter, sorted by classLevel then name.
- `findOne` (:88-117) includes the academicYear and the first `CLASS_TEACHER` assignment's teacher, with the password omitted. It returns 404 "Class not found".
- `update` (:119-143) needs name or classLevel, otherwise 400. Name uniqueness is re-checked within the section's own year.
- There is no delete endpoint.

## Access control notes

- ADMIN only: POST /sections and PATCH /sections/:id (sections.controller.ts:27-56).
- No @Roles, so any authenticated role can call GET /sections and GET /sections/:id (:38, :47). The service does no scoping by the caller's own section or assignments.

## Cross-module contracts

- Exports `SectionsModule`, `SectionsService` and types.
- `SectionsService.findOne` is used by students.service.ts:309 and :406 when assigning or moving students to a section.
- Consumes `AcademicYearsService.findCurrent`.

## Known pitfalls / risks

- Information leak: any STUDENT can list every section and see class-teacher user details for any section (only the password is omitted) (:105-113).
- `update` lets classLevel change with no checks on enrolled students or subject assignments, whose Subjects are keyed by classLevel (:140). This can leave teacherClassAssignments with a subject of the wrong level.
- When creating with an explicit academicYearId, the year's existence isn't checked, so a bad id surfaces as a Prisma FK error.
- The uniqueness check is check-then-write with no transaction, so a race gives P2002 → 409 via the global filter.
- `findAll` also defaults to the current year, so with no current year the list call returns 404.
- `findOne` uses `findFirst` for the class teacher. If duplicate CLASS_TEACHER rows exist, which one is returned is nondeterministic.
- `findAll` has no pagination.

## Test focus

- Create defaults to the current year, and returns 404 when there is none.
- A duplicate name in the same year gives 400, while the same name in a different year is allowed.
- Update with an empty body gives 400. Renaming to an existing name gives 400, and renaming to its own name is OK.
- `findOne` returns the class teacher without the password, and null when there isn't one.
- STUDENT/TEACHER get 403 on POST/PATCH. GET currently exposes teacher PII to students; assert or restrict that.
- Changing classLevel on a section that has subject assignments (currently allowed; document it).
