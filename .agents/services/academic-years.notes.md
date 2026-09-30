<!-- source-hash: fa279241b457 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-academic-years by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp academic-years`. -->

## Purpose
Manages academic years and the terms inside them. It also decides which year is the "current" one, which many other modules rely on.
## Business rules & invariants
- The year name must be unique. `AcademicYearsService.assertNameNotTaken` checks this at academic-years.service.ts:15, and the schema has `name @unique` (academic.prisma:3).
- Start must be strictly before end (`assertValidDateRange`, :27-33). It uses `new Date(isoString)`, so there is no timezone normalisation.
- The current year is whichever row has `isCurrent=true`, read with `findFirst` (`findCurrent`, :105-116). If none exists it throws a 404 "No current academic year set".
- `setCurrent` (:169) returns 400 if the id doesn't exist (`assertYearExists` throws BadRequest, :40) or if the year is already current. `setCurrentYear` (:44-55) runs one `$transaction` that clears every `isCurrent` and then sets the chosen one.
- `create` (:57-97): if `copyClassStructureFromCurrent` is set, it copies the section `{name, classLevel}` pairs from the current year into a nested create. Nothing else is copied (teachers, students). A new year is never made current automatically.
- `update` (:131-167): needs at least one field, otherwise 400. Date range is re-checked against the stored dates. It does not re-check that existing terms still fit inside the new year dates.
- Terms: dates must be inside the year's bounds (:218-223, repeated in updateTerm) and must not overlap other terms in the same year (`assertNoTermOverlap` :187-207, checks `lt end` / `gt start`, excludes itself on update). The schema has `@@unique([name, academicYearId])` (academic.prisma:36), but the service never checks name uniqueness before writing.
- `updateTerm` / `deleteTerm` return 404 if the term belongs to a different year (:266, :318-ish).
- There is no endpoint to delete an academic year.
## Access control notes
- ADMIN only: POST /, GET /, GET /:id, PATCH /:id, PATCH /:id/set-current, POST/PATCH/DELETE terms (academic-years.controller.ts:39-142).
- No @Roles, so open to any authenticated JWT (ADMIN, TEACHER, STUDENT): GET /current (:59) and GET /:id/terms (:117).
- The service has no ownership checks. A missing year gives 400 from `assertYearExists` in some places and 404 from `findOne`/`update` in others.
## Cross-module contracts
- Exports `AcademicYearsModule`, `AcademicYearsService` and types (index.ts).
- `findCurrent` is used by attendance.service.ts:66,367, grades.service.ts:289, fees.service.ts:77, request-access.service.ts:130, students.service.ts:137,305,402, homework.service.ts:169,207, exams.service.ts:170,207, school.service.ts:88, sections.service.ts:54,73 and the dashboard (dashboard.service.ts).
- Consumes only PrismaService.
## Known pitfalls / risks
- `create` (:57-97) and `update` are check-then-write with no transaction. A race turns into a P2002 error instead of the 400. Term name duplicates are never pre-checked, so they also surface as P2002.
- The partial unique index on `isCurrent` has not been checked in migrations. Seeds or races could leave several current years, and `findFirst` would then pick one arbitrarily (:106).
- `setCurrent` reads the current year outside the transaction (:172).
- Shrinking a year's dates in `update` can leave terms and holidays outside the year.
- The term bounds check uses `academicYear!` (:219). It is safe only because `assertYearExists` runs just before it, but that means two queries.
- Dates are parsed from ISO strings with no timezone handling. A date-only string is UTC midnight.
- `findAll` has no pagination (:99).
## Test focus
- `setCurrent` flips the flag atomically, and returns 400 when the year is already current or doesn't exist.
- `create` with copyClassStructure copies sections from the current year, and handles "no current year" gracefully.
- Terms: overlap rejected, touching boundaries (end == next start) allowed, out-of-bounds rejected, update excludes itself from the overlap check.
- Term routes return 404 for a term belonging to a different year.
- STUDENT/TEACHER get 403 on POST/PATCH but 200 on GET /current and GET /:id/terms.
- Updating year dates so existing terms fall outside (currently allowed; document the behaviour).
- A duplicate term name produces a P2002 error. Check how the filter maps it.
