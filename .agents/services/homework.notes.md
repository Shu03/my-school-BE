<!-- source-hash: 58534fe0f524 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-homework by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp homework`. -->

## Purpose
Homework items for each section, subject and academic year. They are created by admins or authorized teachers and visible to enrolled students.
## Business rules & invariants
- `create` (homework.service.ts:162) defaults the year to the current one. The subject's classLevel must equal the section's (404/400, :66-92). `dueDate` is a strict ISO date with no past or future validation.
- `createdById` is the TeacherProfile id, or null for ADMIN (:175-195).
- The section is not checked against the given academicYearId.
- `update` rejects an empty body (:293) and can change only title, description and dueDate.
- `delete` is a hard delete that returns the old record (:311-318).
- `findAll` is not paginated and is ordered by dueDate (:245-249).
## Access control notes
- POST, PATCH and DELETE allow ADMIN and TEACHER. GET list and GET one allow ADMIN, TEACHER and STUDENT (homework.controller.ts). The `:id` param uses ParseUUIDPipe.
- Create as a teacher requires `resolveSubjectAccess(HOMEWORK)`; otherwise 403 (:94-109).
- Modify/delete (`assertCanModify`, :138-160) allows ADMIN always. An ASSIGNED teacher (class teacher, or subject teacher for that subject) may edit any homework of the subject. A GRANTED teacher may edit only homework they created; otherwise 403 `ERROR_HOMEWORK_GRANTED_NOT_CREATOR`.
- In the list, a teacher sees homework in any assigned section (all subjects) OR matching one of their approved HOMEWORK scopes via `findApprovedScopes` (:217-232). A student sees homework in sections where they have an ACTIVE enrollment (:233-243).
- `findOne` allows a teacher who is `isAssignedToSection` or `hasApprovedAccess`, and a student with an ACTIVE enrollment; otherwise 403. A missing id gives 404 first.
## Cross-module contracts
- `index.ts` exports HomeworkModule, HomeworkService and HomeworkBasic. A grep found no external importers.
- Consumes `AccessPolicyService` (`resolveSubjectAccess`, `findApprovedScopes`, `isAssignedToSection`, `hasApprovedAccess`) and `AcademicYearsService`.
## Known pitfalls / risks
- The list query is unbounded, with no pagination (:245).
- `HOMEWORK_INCLUDE` exposes the creator's full user row minus the password to students (:31-43).
- If a TEACHER's `findApprovedScopes` returns nothing, `where.OR` has only the assignment clause, which is fine. If the teacher has no assignments, they get an empty result.
- Homework with `createdById` null (created by an admin) can never be modified by a GRANTED teacher, which is intended but worth knowing.
- `dueDate` uses `new Date(string)` with UTC semantics and no timezone handling.
- No spec files exist for this module.
## Test focus
- A teacher with a GRANTED HOMEWORK scope edits another teacher's homework and gets 403. Editing their own homework works.
- A subject teacher of subject A tries to create homework for subject B in the same section and gets 403.
- A subject that does not match the section's class level gives 400.
- A STUDENT not enrolled in the section gets 403 on findOne, and the list excludes that homework.
- A STUDENT calling POST, PATCH or DELETE gets 403 from RolesGuard.
- PATCH with an empty body gives 400.
- Check that the student response does not include the creator's email or phone.
