# Testing Standards: my-school-BE

> Used by `tester`, `service-creator` and `code-reviewer`. A test's job is to find what's broken, not to pass.

## 0. Current state (measured on commit `4fa4355`, 2026-10-01). Read this before writing tests

- **P0: the unit suite cannot run.** The root `package.json` Jest config (`rootDir: src`) has no `moduleNameMapper`, so every import of `@common/*`, `@config/*` or `@modules/*` fails. As a result, 20 of 20 suites fail with 0 tests executed. The first fix, which belongs to the tester because it's test infrastructure, is:
  ```json
  "moduleNameMapper": {
      "^@common/(.*)$": "<rootDir>/common/$1",
      "^@config/(.*)$": "<rootDir>/config/$1",
      "^@modules/(.*)$": "<rootDir>/modules/$1"
  }
  ```
  Add the same mapping to `test/jest-e2e.json`, using `<rootDir>/../src/...`, since that file's rootDir is `.`.
- `test/app.e2e-spec.ts` is scaffold left over from `nest new`. It expects `GET /` to return "Hello World!", but that route doesn't exist. Replace it.
- Most `*.spec.ts` files are "should be defined" stubs. The accounts, announcements, dashboard, exams, fees, grades, homework and platform (health/prisma) modules have **no** specs. `.agents/catalog/SERVICES.md` shows the live counts.
- Unit tests need a generated Prisma client: `DATABASE_URL=<any> pnpm prisma:generate`. `prisma.config.ts` throws if `DATABASE_URL` is missing.

## 1. Test pyramid and locations

| Layer | Location / naming | Runner | Database | Purpose |
|---|---|---|---|---|
| Unit | `src/modules/<m>/<m>.service.spec.ts`, `*.controller.spec.ts` | `pnpm test` | Mocked `PrismaService` | Business rules, branching, error mapping |
| Integration | `test/integration/<m>.int-spec.ts` | `pnpm test:int` (add a script and `test/jest-int.json` on first use) | Real Postgres (`pnpm db:start`), a separate `school_test` database, `prisma migrate deploy` | Transactions, constraints, race conditions, Prisma queries |
| E2E | `test/e2e/<m>.e2e-spec.ts` | `pnpm test:e2e` | Real Postgres | The full HTTP stack: guards, pipes, filters, interceptor, auth matrix |
| Property | next to unit tests (`fast-check`) | `pnpm test` | none | Calculators and date logic (fees status, percentages, timezone) |
| Mutation | `stryker.conf.json` (opt-in) | `pnpm test:mutation` | none | Checks that the tests actually catch changes. Run on the auth, request-access, accounts, fees, grades and attendance services |

Add new dev dependencies (`fast-check`, `@stryker-mutator/*`) only when first used, and mention them in the PR.

## 2. Unit test rules

- Use `Test.createTestingModule` with `{ provide: PrismaService, useValue: prismaMock }`. Build the mock with typed `jest.fn()`s per model/method. Only use `jest.Mocked<Pick<...>>` casts when necessary; never `any`.
- One `describe` per public method. Test names follow `it("<does X> when <condition>")`.
- Each test follows Arrange / Act / Assert. Assert on:
  - the return value,
  - the thrown exception **type and message constant** (`ERROR_*`),
  - and **the Prisma call arguments** that matter (where-clause scoping!).
- For every `throw` in a service, write a test that triggers it.
- For every role branch (ADMIN/TEACHER/STUDENT), write a test for each role.
- Don't change the clock through the environment. Use `jest.useFakeTimers().setSystemTime(...)` for date logic, and test around IST midnight (18:29:59Z and 18:30:00Z UTC).
- Don't snapshot whole responses.

## 3. Integration / E2E rules

- The app is bootstrapped exactly like `main.ts`: global prefix, `ValidationPipe` options, `GlobalExceptionFilter`, `ResponseInterceptor`. Put this in one shared `test/utils/create-app.ts`.
- The database is truncated between test files (`TRUNCATE ... CASCADE` on all tables except `_prisma_migrations`). Use factories in `test/factories/*.ts`; never rely on seed data.
- Get auth tokens through the real `/auth/login` flow using factory users (admin, teacher with or without each permission, student).
- Assert the response envelope: `{ success, statusCode, timestamp, data }` or `{ success:false, statusCode, message, path }`.

## 4. Required coverage per route: the authorization matrix

For every route, run the full matrix:
- unauthenticated → 401,
- `first_login` token → 401,
- each role that isn't allowed → 403,
- a TEACHER with no assignment or `AccessRequest` grant for the section/subject → 403,
- an allowed role or source → 2xx,
- **a record owned by someone else → 403/404** (the IDOR check).

## 5. Unthinkable-case checklist (the tester must consider each one and record a result: N/A, tested, or finding)

1. **Authorization and ownership:** a teacher of section A acts on section B. A student reads another student's grades, fees or attendance. Someone other than the creator edits homework, an announcement or an exam. An admin resets another admin.
2. **Auth lifecycle:**
   - Refresh-token reuse, and two concurrent refreshes with the same token.
   - A 4th login evicts the oldest session, including concurrent logins.
   - A deactivated user with a live access token.
   - An `AccessRequest` grant that was revoked, belongs to a past academic year, or belongs to a deactivated teacher still grants access.
   - A MARKS grant widening homework or attendance visibility, because `buildSectionScope` ignores `type`.
   - Using a first-login token on normal routes.
3. **Time:**
   - IST vs UTC midnight.
   - Academic-year rollover, including when no current year exists.
   - Overlapping years or terms.
   - A holiday on a weekly off day, leap day, and a date at a year boundary.
   - A server running in UTC compared with "today" in IST.
4. **Concurrency and idempotency:**
   - Submitting the same payment twice.
   - Parallel bulk attendance for the same section and date.
   - Entering the same grades twice.
   - Two admins setting different years as current.
   - Promoting the same student twice.
5. **Money:**
   - Fees use `Float`: test sums like 33.33 × 3.
   - Accounts use `Decimal`: check precision, and that the balance never goes negative under concurrent withdrawals.
   - Overpayment, and zero or negative amounts.
   - Changing a structure after records exist.
   - Re-running backfill.
6. **Input edges:**
   - Unicode and Devanagari names, emoji, and leading or trailing whitespace.
   - Maximum lengths, plus one character over.
   - Empty arrays, and arrays with 10k items.
   - Duplicate IDs inside one bulk payload.
   - Unknown fields (should get 400 because of forbidNonWhitelisted).
   - Invalid UUIDs.
   - `limit=0`, `limit=10000`, and negative page numbers.
7. **State machines:**
   - Every illegal transition, such as editing a FINALIZED or DISCARDED exam, or entering grades on a discarded exam.
   - Unlocking after grades have been entered.
8. **Referential edges:** referencing a record from another academic year, an inactive or transferred enrollment, a deleted or deactivated user, or a subject whose grade level doesn't match.
9. **Failure modes:**
   - The database is unavailable (health returns 503).
   - Prisma P2002/P2025 map to 409/404.
   - An unknown Prisma error returns 500 without leaking internals.
   - Validation error messages don't include secrets.
10. **Data exposure:**
    - No `password` or `tokenHash` in any response.
    - List endpoints don't return other tenants' or users' data.
    - Error messages don't reveal whether an account exists.
11. **Abuse:** throttler limits on `/auth/login`, oversized JSON bodies, and slow or expensive list queries without filters.

## 6. Coverage thresholds (enforce in Jest `coverageThreshold` once the suite is green)

| Scope | Lines | Branches |
|---|---|---|
| `src/modules/auth/**`, `request-access/**`, `accounts/**`, `fees/**`, `grades/**`, `attendance/**` | 90% | 85% |
| other `src/modules/**` services | 80% | 70% |
| global | 75% | 65% |

Coverage is a floor, not the goal. If a mutation score is available, target ≥ 70% on critical services.

## 7. Readiness report format (output of the `tester` agent)

```
# Production Readiness: <scope>  (<date>, <commit>)
Verdict: READY | READY-WITH-RISKS | NOT READY
Suites: unit x/y · integration x/y · e2e x/y · coverage L% / B%
## Findings
| ID | Severity (P0-P3) | Module | Scenario | Expected | Actual | Evidence (test file:line) |
## Unthinkable checklist
| # | Category | Result (tested / finding / N/A + why) |
## Tests added
- path: what it covers
```
Severity levels:
- **P0:** data loss or corruption, auth bypass, or personal data exposure.
- **P1:** wrong business result, or a race condition with a realistic trigger.
- **P2:** missing validation, or a wrong HTTP code.
- **P3:** hygiene.
