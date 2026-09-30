---
name: write-tests
description: Procedure and templates for writing meaningful tests in my-school-BE. Covers Jest bootstrap fixes, a typed Prisma mock, service unit tests, e2e authorization matrix, concurrency, timezone and property-based tests. Use whenever writing or fixing tests.
---

# Write tests

Standards: `.agents/standards/testing-standards.md`. Read §0 first.

## 0. Bootstrap (once)

1. Check that `pnpm test` runs. If you see `Cannot find module '@common/...'`, add `moduleNameMapper` to the `jest` block in `package.json`, and to `test/jest-e2e.json` with `<rootDir>/../src/...` (testing-standards §0).
2. `DATABASE_URL=postgresql://u:p@localhost:5432/x pnpm prisma:generate` (the client is needed for types and enums).
3. For integration and e2e tests:
   - Run `pnpm db:start`.
   - Create the test database `school_test`.
   - Run `DATABASE_URL=.../school_test pnpm prisma:migrate:deploy`.
   - Put `DATABASE_URL` for tests in `.env.test`, which is git-ignored.

## 1. Typed Prisma mock (unit)

```ts
type PrismaMock = {
    [K in "section" | "teacherClassAssignment"]: {
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        findMany: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        count: jest.Mock;
    };
} & { $transaction: jest.Mock };

const createPrismaMock = (): PrismaMock => {
    const model = (): PrismaMock["section"] => ({
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
        create: jest.fn(), update: jest.fn(), count: jest.fn(),
    });
    const mock = { section: model(), teacherClassAssignment: model(), $transaction: jest.fn() };
    // Support both the array form and the interactive (callback) form of $transaction
    mock.$transaction.mockImplementation((arg: unknown) =>
        typeof arg === "function" ? (arg as (tx: unknown) => unknown)(mock) : Promise.all(arg as Promise<unknown>[]),
    );
    return mock;
};
```
Put the shared version in `src/test-utils/prisma-mock.ts` and exclude it from the build (it isn't a `*.spec.ts` file, so add it to the `tsconfig.build.json` exclude list).

## 2. Service unit test shape

```ts
describe("SectionsService", () => {
    let service: SectionsService;
    let prisma: PrismaMock;
    const academicYears = { findCurrent: jest.fn() };

    beforeEach(async () => {
        prisma = createPrismaMock();
        const module = await Test.createTestingModule({
            providers: [
                SectionsService,
                { provide: PrismaService, useValue: prisma },
                { provide: AcademicYearsService, useValue: academicYears },
            ],
        }).compile();
        service = module.get(SectionsService);
    });

    describe("create", () => {
        it("defaults to the current academic year when none is given", async () => {
            academicYears.findCurrent.mockResolvedValue({ id: "ay-1" });
            prisma.section.findUnique.mockResolvedValue(null);
            prisma.section.create.mockResolvedValue({ id: "s-1" });

            await service.create({ name: "6A", classLevel: 6 });

            expect(prisma.section.create).toHaveBeenCalledWith({
                data: { name: "6A", classLevel: 6, academicYearId: "ay-1" },
            });
        });

        it("throws BadRequestException when the name is taken in the same year", async () => {
            academicYears.findCurrent.mockResolvedValue({ id: "ay-1" });
            prisma.section.findUnique.mockResolvedValue({ id: "other" });
            await expect(service.create({ name: "6A", classLevel: 6 })).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
```
For every service method, cover:
- the happy path,
- each `throw` site (assert the type **and** the `ERROR_*` message),
- each role branch (ADMIN, TEACHER, STUDENT),
- the **where clause used for scoping**, asserted with `toHaveBeenCalledWith(expect.objectContaining({ where: ... }))`.

## 3. Users for tests (`JwtPayload` is `{ sub, role, type }`; there are no permission flags)

```ts
const admin: JwtPayload = { sub: "u-admin", role: Role.ADMIN, type: "access" };
const teacher: JwtPayload = { sub: "u-teacher", role: Role.TEACHER, type: "access" };
const student: JwtPayload = { sub: "u-student", role: Role.STUDENT, type: "access" };

// Teacher access is decided by AccessPolicyService. Mock it per test:
const accessPolicy = {
    resolveSubjectAccess: jest.fn(), // → "CLASS_TEACHER" | "SUBJECT_TEACHER" | "GRANTED" | null
    isAssignedToSection: jest.fn(),
    isClassTeacher: jest.fn(),
    hasApprovedAccess: jest.fn(),
    findApprovedScopes: jest.fn(),
    canViewSection: jest.fn(),
    buildSectionScope: jest.fn().mockReturnValue({}),
};
```
Every teacher branch needs these cases:
- each non-null access source (CLASS_TEACHER, SUBJECT_TEACHER, GRANTED), where behaviour differs; for example, homework lets only the creator edit under GRANTED,
- `null`, which must give 403.

In integration tests, use real `TeacherClassAssignment` and `AccessRequest` rows (APPROVED, REVOKED, PENDING, and a previous academic year).

## 4. E2E authorization matrix (`test/e2e/<module>.e2e-spec.ts`)

- Build the app with a shared `test/utils/create-app.ts`. It must reproduce `main.ts` exactly: `setGlobalPrefix("api/v1")`, the same `ValidationPipe` options, `GlobalExceptionFilter` and `ResponseInterceptor`.
- Seed users through factories and get tokens through `POST /api/v1/auth/login`. First-login users must change their password first, or the factory sets `isFirstLogin=false`.
- Generate the cases table-driven from `.agents/catalog/services.json` routes:
```ts
it.each(cases)("$method $path as $who → $expected", async ({ method, path, who, expected, body }) => {
    const res = await request(app.getHttpServer())[method](path).set(auth(who)).send(body);
    expect(res.status).toBe(expected);
});
```
Each route needs these cases:
- no token → 401,
- wrong role → 403,
- TEACHER without an assignment or grant for the section/subject → 403,
- TEACHER with CLASS_TEACHER / SUBJECT_TEACHER / GRANTED access → 2xx (or the documented restriction),
- owner → 2xx,
- another owner's record → 403/404.

## 5. Concurrency (integration, real database)

```ts
const results = await Promise.allSettled([
    service.createWithdrawal(dto, admin), // accounts: balance must never go negative
    service.createWithdrawal(dto, admin),
]);
// assert invariant, not implementation: e.g. at most one succeeds when together they exceed the balance
```

## 6. Time (IST vs UTC)

```ts
jest.useFakeTimers().setSystemTime(new Date("2026-06-15T18:29:59Z")); // 23:59:59 IST, 15 June
jest.useFakeTimers().setSystemTime(new Date("2026-06-15T18:30:00Z")); // 00:00:00 IST, 16 June
```
Always call `jest.useRealTimers()` in `afterEach`.

## 7. Property-based (`pnpm add -D fast-check` on first use)

```ts
fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1 }), (paise) => {
    const total = paise.reduce((a, b) => a + b, 0) / 100;
    expect(computeStatus(total, paise.map((p) => p / 100))).toBe("PAID");
}));
```

## 8. Done when

- `pnpm test` is green, apart from `it.failing` tests that each have a linked finding.
- `pnpm lint` is clean. Test files are linted too.
- Coverage for the touched services meets testing-standards §6.
