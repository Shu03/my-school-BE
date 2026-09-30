<!-- source-hash: 400bba16c200 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-school by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp school`. -->

## Purpose

Stores the single school settings row (weekly off days) and a holiday calendar per academic year. It also answers "is this a school day?" for attendance and the dashboard.

## Business rules & invariants

- `getOrCreateSettings` (school.service.ts:26-38) lazily creates the settings row with `WEEKLY_OFF_DAYS_DEFAULT`. It uses `findFirst` because there is no singleton constraint (school.prisma:1-7).
- `updateSettings` (:44-57) requires `weeklyOffDays`, otherwise 400. The DTO requires a non-empty int array with values 0-6 (update-school-settings.dto.ts:10-14).
- `createHoliday` (:59-82) rejects a duplicate `(date, academicYearId)` with 409 (`ERROR_HOLIDAY_ALREADY_EXISTS`). The DTO requires strict ISO8601, a UUID year and a name of at most 100 chars. The column is `@db.Date` (academic.prisma:89). It does not check that the date falls inside the academic year, or that the year exists (only the FK does).
- `listHolidays` (:84-96) defaults to the current year, so it returns 404 if no current year is set.
- `isSchoolDay` (:104-122) returns false if the weekday is in `weeklyOffDays` or if a holiday exists for that date and year.

## Access control notes

- ADMIN only: GET/PATCH /school/settings, POST /school/holidays, DELETE /school/holidays/:id (school.controller.ts:40-84).
- No @Roles, so any authenticated role can call GET /school/holidays (:74).
- The service has no role logic.

## Cross-module contracts

- Exports `SchoolModule`, `SchoolService` and types.
- `isSchoolDay` is used by attendance.service.ts:96 and dashboard.service.ts:42.
- Consumes `AcademicYearsService.findCurrent`.

## Known pitfalls / risks

- Timezone mismatch in `isSchoolDay`: `getDay(parseISO(date))` (:106) uses the server's local timezone, while `new Date(date)` (:115) uses UTC midnight. A full datetime string, or a non-UTC server, can compare against the wrong weekday or holiday.
- `getOrCreateSettings` has a race: two concurrent first calls can create two settings rows, since there is no unique constraint (:27-37).
- `deleteHoliday` (:98-102) has no existence check, so a missing id raises Prisma P2025, which the global filter maps to 404 with a generic "Record not found".
- `createHoliday` is check-then-create. A race gives P2002 → 409.
- A holiday dated outside its academic year is accepted.
- `listHolidays` has no pagination.

## Test focus

- `isSchoolDay` with a weekend date, a holiday, a normal day, and a date-only string versus a datetime string under TZ≠UTC.
- A duplicate holiday returns 409. A holiday with a nonexistent academicYearId is handled as an FK error.
- Deleting a nonexistent holiday gives a 404, not a 500.
- `updateSettings` rejects an empty array, 7, -1 and non-integers.
- Settings are auto-created on first GET, and concurrent first GETs leave exactly one row.
- TEACHER/STUDENT get 403 on settings and holiday writes but 200 on GET holidays. GET holidays returns 404 when there is no current year.
