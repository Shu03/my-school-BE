<!-- source-hash: a95601de28e2 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-dashboard by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp dashboard`. -->

## Purpose
Serves one `GET /dashboard` endpoint that returns a different aggregate payload for ADMIN, TEACHER and STUDENT, all for the current academic year and the school-timezone "today".
## Business rules & invariants
- `DashboardService.getDashboard` (dashboard.service.ts:30-79):
  - No `isCurrent` academic year → 404 `ERROR_DASHBOARD_NO_CURRENT_YEAR`.
  - `today = getTodayInSchoolTimezone()`, `todayDate = new Date(today)`, `upcomingUntil = today + DASHBOARD_UPCOMING_DAYS`, and `isSchoolDay` comes from `SchoolService`.
  - The base payload has announcements and upcoming holidays (capped at `DASHBOARD_LIST_LIMIT`), then a switch on `user.role`.
- Admin (admin-dashboard.service.ts):
  - Counts: ACTIVE enrollments, active teachers, sections.
  - Enrollment grouped by classLevel.
  - Attendance today, only on a school day. Present % = (students in marked sections − absentees) / students in marked sections.
  - Fees: expected = sum of `FeeRecord.totalAmount`, collected = sum of payments, outstanding = expected − collected, plus counts by status.
  - `AccountsService.getSummary()` (Decimal), pending AccessRequest count, upcoming exams, count of ACTIVE unfinalized exams.
- Fee sums are Float. `roundAmount` rounds to 2 dp (dashboard-common.service.ts:33) and `toPercentage` gives an integer %.
- Teacher (teacher-dashboard.service.ts):
  - Assignments in the current year with their ACTIVE student counts.
  - Attendance: only CLASS_TEACHER sections.
  - Upcoming exams scoped by `accessPolicy.buildSectionScope(userId)` (:166).
  - Pending grading: class teachers see all subjects of their section, subject teachers only their subject. Past, unfinalized exam subjects where grades < ACTIVE students (:102-133).
  - Their own active homework count and their AccessRequest counts by status.
- Student (student-dashboard.service.ts):
  - Profile plus the ACTIVE enrollment for the year.
  - Fees: total/paid/due/status/dueDate.
  - Attendance for year and month, present = marked days − absences (:25-37).
  - Homework due soon, upcoming exams for their section.
  - Recent results from *finalized* exams, where subjects without a grade are excluded from the percentage (:100-117).
  - No enrollment → enrollment, attendance, homework and exams are `null`, but fees are still returned.
## Access control notes
- The controller has no `@Roles` (dashboard.controller.ts:16-22), so any authenticated role reaches it; RolesGuard presumably passes routes without metadata. Data is scoped by `user.sub`/`role` inside the service.
- TEACHER/STUDENT without a profile → 403 (`ERROR_DASHBOARD_TEACHER_PROFILE_NOT_FOUND` / `ERROR_DASHBOARD_STUDENT_PROFILE_NOT_FOUND`).
- The only AccessPolicyService use is `buildSectionScope` for the teacher's upcoming exams. Pending grading uses the raw assignments instead, so it does **not** include sections granted through an AccessRequest (a possible inconsistency).
## Cross-module contracts
- index.ts exports `DashboardModule`, `DashboardService`, and the types `AdminDashboard`, `DashboardResponse`, `StudentDashboard`, `TeacherDashboard`. No outside users found by grep.
- Consumes:
  - `AccountsService.getSummary` and `AccountSummary`.
  - `AccessPolicyService.buildSectionScope`.
  - `SchoolService.isSchoolDay`.
  - `getTodayInSchoolTimezone`.
  - Direct Prisma reads of fee, attendance, exam, homework, announcement, holiday and accessRequest tables. This duplicates FeesService logic.
## Known pitfalls / risks
- The admin payload mixes Float fee sums with the Decimal accounts summary (serialised as strings).
- `outstanding` goes negative when there are overpayments (admin :57; student `due` :66).
- `findPastUnfinalizedExamSubjects` has no `take` (dashboard-common.service.ts:83-95), so it is unbounded; the result is sliced in memory (teacher :132).
- Pending grading counts grades against the *current* ACTIVE students, so it can be off after withdrawals or transfers.
- Timezone:
  - `todayDate = new Date("YYYY-MM-DD")` is UTC midnight. It matches `@db.Date`, but mixing it with `addDays` is fine only if kept in UTC.
  - `monthStart` is built the same way (student :174).
  - Announcements use `new Date()` (real now), which is inconsistent with the school-timezone today.
- `absentees` counts distinct students with any Attendance row today, which could include sections not in `sections` if the data is inconsistent.
- The admin view runs about 10 parallel queries per request with no caching.
- The fee duplication means rule changes in FeesService will not be reflected here.
- No spec files exist for this module.
## Test focus
- No current academic year → 404. Teacher or student without a profile → 403.
- A student only ever sees their own fee, attendance and results; `userId` comes from the JWT.
- Teacher upcoming exams include sections granted through an approved AccessRequest (buildSectionScope), while pending grading does not; confirm which behaviour is intended.
- Pending grading for a subject teacher is limited to their subject; a class teacher sees all subjects.
- Non-school day → `attendanceToday: {isSchoolDay:false}` for admin and teacher.
- Fee rounding: payments of 0.1 + 0.2 show as 0.3. Overpayment gives a negative outstanding.
- A student with no enrollment gets the null sections but still gets fees.
- Timezone boundary: a request just after midnight in the school timezone but before UTC midnight uses the correct "today".
