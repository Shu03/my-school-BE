<!-- source-hash: 34aeb3cce743 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-attendance by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp attendance`. -->

## Purpose
Records daily attendance for each section. `AttendanceDay` (unique on `[sectionId, date]`, prisma/schema/attendance.prisma:14) marks that attendance was taken that day. The `Attendance` table stores only the absent students. Anyone enrolled who has no absence row on a taken day counts as PRESENT.
## Business rules & invariants
- `saveDay` (attendance.service.ts:272) only works for sections in the current academic year (`assertSectionInCurrentYear`, :61; otherwise 400).
- The date cannot be in the future. It is compared to `getTodayInSchoolTimezone()` (:80). It must also fall within the academic year's start/end, taken as UTC dates via `toISOString().slice(0,10)` (:38, :84-93). It must be a school day according to `SchoolService.isSchoolDay` (:96).
- Every id in `absentStudentIds` must be an ACTIVE enrollment of the section/year; this is checked with a count comparison (:139-160). The DTO requires the array to hold unique UUIDs (save-attendance-day.dto.ts:10-12).
- The save is one full replacement in a single `$transaction`: upsert the `AttendanceDay` (markedById = user id), `deleteMany` the absences, then `createMany` the new absences. `Attendance.markedById` is the TeacherProfile id, or null for ADMIN (:283-312). The two `markedById` fields point at different entities (User vs TeacherProfile).
- `deleteDay` (:328) returns 404 if no day was taken. Otherwise it deletes the absences and the day in one transaction.
- `getStudentAttendance` (:357) builds the history from the `AttendanceDay` rows of the student's current enrollment section plus their absences. It returns [] if the student has no enrollment. The date range is optional.
- `getSummary` (:420) is monthly and uses UTC month bounds (:428-431). Present = taken days − absences; percentage is rounded.
- The date param must be strict ISO `YYYY-MM-DD` (attendance-day-params.dto.ts:11-12).
## Access control notes
- `@Roles`: PUT/GET/DELETE `sections/:sectionId/days/:date` and GET `summary` allow ADMIN and TEACHER. GET `student/:studentId` also allows STUDENT (attendance.controller.ts:40-106).
- Managing (save/delete) is limited to ADMIN or `AccessPolicyService.isClassTeacher`; anyone else gets 403 (:103-119).
- Viewing a day or summary is limited to ADMIN or `isAssignedToSection` (class or subject teacher); anyone else gets 403 (:121-137).
- Student history: a STUDENT can only see their own profile id. A TEACHER needs a `teacherClassAssignment` in any section where that student has any enrollment, regardless of year or status (:180-213). Otherwise 403.
- Order of checks: the section's existence (404) and current-year check (400) run before the authorization check. A non-assigned user can therefore tell whether a section exists.
## Cross-module contracts
- `index.ts` exports AttendanceModule, AttendanceService and types. A grep found no importers outside the module.
- Consumes `SchoolService.isSchoolDay`, `AcademicYearsService.findCurrent`, `AccessPolicyService`, `getTodayInSchoolTimezone` (@common/utils).
## Known pitfalls / risks
- The year window uses UTC dates (`toDateOnly`, :38) while "today" uses the school timezone. These can disagree around midnight.
- `getDay` does not validate the date: no future-date, academic-year or school-day check, and it works on sections from past years (:317-326).
- `getStudentAttendance` ignores enrollment status (:371) and ignores students who transferred mid-year. Days from before the student joined count as PRESENT.
- `getSummary` has the same problem: `present = takenDays - absent` counts students who enrolled late as present on days before they joined (:465).
- The teacher check in `assertCanViewStudent` is not scoped by academic year (:198-208), so a teacher from a past section keeps access.
- Concurrent `saveDay` calls are serialized only by the transaction. Because every save is a full replacement, the last writer wins.
- `Attendance` has a unique on `[studentId, date, periodId]` and `periodId` is nullable (attendance.prisma:35). NULLs are distinct, so the database does not enforce uniqueness per day.
- `studentId` path param has no ParseUUIDPipe (controller:89).
## Test focus
- A subject teacher (not class teacher) gets 403 on PUT/DELETE, while GET day works.
- A future date, a date outside the year, or a holiday returns 400. Also test the timezone boundary near midnight.
- An absentee not in the section, or with an inactive enrollment, returns 400.
- Re-saving replaces the absences completely; an empty array makes everyone PRESENT.
- A STUDENT requesting another student's history gets 403.
- A teacher who was assigned only in a past year can still read a student (documents the current risk).
- Summary: month boundaries, and a student who enrolled late.
- DELETE on a day never taken returns 404.
