<!-- source-hash: a85f2fe68383 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-accounts by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp accounts`. -->

## Purpose
Tracks the school's cash in a simple ledger. Admins record deposits, withdrawals from those deposits, and bills paid out of a withdrawal. Balances are computed live with aggregates; no balance column is stored.
## Business rules & invariants
- All three models use `Decimal(12,2)` for amounts and `@db.Date` for dates (prisma/schema/accounts.prisma). Services compare with `Prisma.Decimal` methods. DTO amounts arrive as JS `number` (e.g. CreateWithdrawalDto: `@IsNumber({maxDecimalPlaces:2}) @Min(0.01) @Max(9999999999.99)`).
- Invariant 1: total deposits ≥ total withdrawals.
  - `createWithdrawal` checks it through `assertBalanceAvailable` (accounts.service.ts:180-197, 371-392).
  - `updateWithdrawal` checks it while excluding the withdrawal's own current amount (:440).
  - `updateDeposit` and `deleteDeposit` check it through `assertDepositsCoverWithdrawals` using a delta (:166-178, 336, 361).
- Invariant 2: the sum of bills on a withdrawal ≤ that withdrawal's amount.
  - `createBill` and `updateBill` check it through `assertWithdrawalHasRoom`, which excludes the bill itself on update (:213-230, 477, 539-544). `updateBill` can move a bill to another withdrawal.
  - `updateWithdrawal` cannot shrink below what has already been spent (`assertWithdrawalCoversBills`, :199-211, 441).
- Balance-checked writes run in `$transaction` and take `pg_advisory_xact_lock(7310001)` first (:57, 69-71), so they are serialised app-wide.
- Every update rejects an empty body with `ERROR_NO_FIELDS_TO_UPDATE` (`isEmptyUpdate`, :73-75).
- Summary (:260-278): `totalBalance = deposited − withdrawn`; `withdrawnBalance = withdrawn − spent`.
- Withdrawal responses carry computed `spent`/`remaining`, fetched in one `groupBy` (`attachWithdrawalBalances`, :232-256).
- Deleting a withdrawal cascades to its bills (`onDelete: Cascade` in the schema). `recordedById` is set from `requestingUser.sub`.
- Lists are paginated (default page/limit constants). `startDate`/`endDate` filters use `new Date(str)` gte/lte.
## Access control notes
- Every route is `@Roles(Role.ADMIN)` (accounts.controller.ts:42-179). The service does no further checks.
- Missing id → 404. Non-UUID id → 400 from `ParseUUIDPipe`.
## Cross-module contracts
- index.ts exports: `AccountsModule`, `AccountsService`, and the types `AccountBillBasic`, `AccountDepositBasic`, `AccountSummary`, `AccountWithdrawalBasic`.
- Used only by dashboard:
  - admin-dashboard.service.ts:11,100 calls `getSummary()`.
  - dashboard.types.ts:9 uses `AccountSummary`.
  - dashboard.module.ts:3 imports `AccountsModule`.
- Consumes `PrismaService` and the `JwtPayload` type.
## Known pitfalls / risks
- `deleteWithdrawal` (:460-466) and `deleteBill` (:563-569) do a read then delete without a transaction or the lock. Deleting a withdrawal also drops its bills through the cascade. It does not break the deposit invariant, but there is a race with a concurrent `createBill`/`updateBill` on the same withdrawal.
- `updateWithdrawal` returns via `findOneWithdrawal` after the transaction commits (:457), so there is a small stale-read window.
- `getSummary` is an unbounded whole-table aggregate. Nothing is scoped by academic year or date.
- The global advisory lock serialises every balance write, a throughput bottleneck.
- `buildDateFilter` uses `new Date("YYYY-MM-DD")`, which is UTC midnight, against `@db.Date` columns. Check `endDate` inclusivity.
- The date range is not validated: `startDate` may be later than `endDate`.
- No spec files exist for this module.
## Test focus
- Two concurrent `createWithdrawal` calls that together exceed the balance: exactly one should succeed (proves the lock works).
- `deleteDeposit` or a lower `updateDeposit` that would push deposits below withdrawals → 400.
- `updateWithdrawal` below the amount already billed → 400. Raising it above the available balance, excluding itself → 400.
- `updateBill` moving a bill to a withdrawal with no room → 400. Updating the same bill's amount within its own room → OK.
- Decimal precision: e.g. 0.1 + 0.2 deposits against a withdrawal of 0.3 should be exact.
- TEACHER/STUDENT hitting any `/accounts` route → 403. Empty PATCH body → 400.
- Delete a withdrawal that has bills: the bills are cascaded and the summary is recomputed correctly.
