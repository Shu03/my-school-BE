<!-- source-hash: 30b8e9b3c024 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-fees by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp fees`. -->

## Purpose

Handles per-class fee structures for each academic year, one fee record per student per year, and the payments recorded against it. The record's status (PENDING/PARTIAL/PAID) is derived from the sum of its payments.

## Business rules & invariants

- `FeeStructure.totalAmount`, `FeeRecord.totalAmount` and `FeePayment.amount` are all **Float**, not Decimal (prisma/schema/fees.prisma).
- `FeeStructure` is unique on `(classLevel, academicYearId)`. A duplicate create (P2002) → 400 `ERROR_FEE_STRUCTURE_ALREADY_EXISTS` (fees.service.ts:189-210).
- `FeeRecord` is unique on `(studentId, academicYearId)`. `generateFeeRecordForStudent` swallows P2002 (:288-291).
- `generateFeeRecordForStudent` (:244-294):
    - Looks up the section's classLevel, then the structure for that class and year.
    - Returns silently with only a warning log if either is missing.
    - Copies `structure.totalAmount` into the record as a snapshot.
- `updateFeeStructure` (:222-240) needs `totalAmount` or `dueDate`, otherwise 400. `totalAmount` is snapshotted into FeeRecords, so a new amount does **not** propagate. `dueDate` lives only on the structure, so a new due date is visible on existing records (and the student dashboard) immediately.
- DTO: `classLevel >= 1`, `totalAmount >= 1`.
- `academicYearId` defaults to the current year through `AcademicYearsService.findCurrent` (:72-79).
- `recordPayment` (:407-427):
    - Checks the record exists, creates the payment, then `recalculateAndUpdateStatus`.
    - Status is PAID if paid ≥ total, PARTIAL if paid > 0, otherwise PENDING (:117-122).
    - Overpayment is allowed; there is no upper bound.
    - DTO: `amount @IsNumber @Min(0.01)` with no `maxDecimalPlaces`; `paidOn` is strict ISO8601.
- `backfill` (:296-351):
    - Loops over ACTIVE enrollments of the year, skipping students who already have a record.
    - Counts `skipped` when no structure exists. Otherwise calls generate and counts `created++`, even if generate returned early.
- `amountPaid` is computed on read through aggregate/groupBy (:94-101, 164-185). It is not stored.

## Access control notes

- ADMIN only: `structures` (POST, GET, PATCH), `backfill`, and `POST records/:id/payments`.
- ADMIN or STUDENT: `GET records`, `records/:id`, `records/:id/payments`, `student/:studentId` (fees.controller.ts). TEACHER gets 403 from RolesGuard.
- STUDENT scoping:
    - `findAllRecords` forces `where.studentId` to the student's own profile and ignores `sectionId` (:366-368).
    - `assertCanAccessRecord` (:464-478) → 403 `ERROR_FEE_FORBIDDEN_SCOPE` for someone else's record.
    - `getStudentFeeHistory` → 403 if the path's `studentId` is not the caller's own (:448-453).
    - No StudentProfile → 403 `ERROR_FEE_STUDENT_PROFILE_NOT_FOUND`.
- Existence is checked before ownership, so a student probing another record's id gets 404 vs 403. That is an existence oracle.
- AccessPolicyService is not used.

## Cross-module contracts

- index.ts exports: `FeesModule`, `FeesService`, and the types `BackfillResult`, `FeePaymentBasic`, `FeeRecordBasic`, `FeeRecordWithPayments`, `FeeStructureBasic`.
- students.service.ts:15 calls `generateFeeRecordForStudent` from `enroll` and `promote`; students.module.ts:4 imports `FeesModule`.
- The dashboard reads the `feeRecord`/`feePayment` tables directly through Prisma, not through FeesService.
- Consumes `AcademicYearsService.findCurrent` and `PrismaService`.

## Known pitfalls / risks

- `recordPayment` does create, then recalculate, then update as separate statements, with no transaction or lock (:412-426).
    - Concurrent payments can leave `status` stale; the last writer wins with a possibly outdated sum.
    - A double-submit creates duplicate payments, since there is no idempotency key.
- Float money: sums like 0.1 + 0.2 can make `amountPaid >= totalAmount` misjudge (:118). There is no rounding on write.
- Payments cannot be deleted or edited. `totalAmount` is snapshotted, so structure edits never re-price records or recompute status.
- `findAllRecords` and `getStudentFeeHistory` are unbounded `findMany` calls with no pagination (:381, 455).
- `backfill` is N+1: 2–4 queries per enrollment (:312-348). Its `created` count can be inflated (see above).
- `assertCanAccessRecord` implicitly allows any role other than ADMIN or STUDENT (:464-478). Only the route `@Roles` protects against TEACHER.
- `paidOn`/`dueDate` are parsed with `new Date(ISO)` as UTC.
- No spec files exist for this module.

## Test focus

- STUDENT fetching another student's record, payments or history → 403. Own → 200. `sectionId` filter is ignored for a student.
- TEACHER on any `/fees` route → 403.
- Payment sequence partial → paid → overpaid: status transitions, including Float sums (0.1 + 0.2 vs total 0.3).
- Concurrent `recordPayment` calls on one record: final status is consistent with the payment sum.
- Duplicate structure for the same class and year → 400. Empty update → 400.
- Enroll a student with no structure: the enrollment succeeds and no record is created. Later backfill creates the record and is idempotent on a re-run.
- `updateFeeStructure` does not change existing FeeRecord totals but does change their effective due date; document or fix this.
