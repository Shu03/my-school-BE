<!-- source-hash: d120fb4f418e · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-users by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp users`. -->

## Purpose
Admin-only CRUD for User accounts. It creates ADMIN, TEACHER (with teacherProfile) and STUDENT (with studentProfile) users with a generated temporary password.
## Business rules & invariants
- The mobile number must be unique. employeeCode and admissionNumber must be unique. These are pre-checked with 400 (users.service.ts:24-51, :76, :101-102, :134-135).
- Each create generates a temporary password, hashes it, stores createdById, and returns `{ user (password omitted), tempPassword }` (:72-161).
- The teacher or student profile is created by a nested create, which is atomic with the user row (:116-121, :149-154).
- `update` changes only firstName, lastName and email, and requires the user to be active (:229-242).
- `deactivate` requires the user to be active (400 if not) (:244-253).
- `activate` has no state check and is idempotent (:255-263).
- `findAll`: filter by role, isActive, or a case-insensitive search on name or mobile. Defaults are page=1, limit=20, ordered by createdAt desc, run in a `$transaction` (:163-210).
- DTO: `IsMobilePhone("en-IN")` with values trimmed (dto/create-user.dto.ts:29-33).
## Access control notes
- `@Roles(ADMIN)` at class level on all routes (users.controller.ts:26). There are no in-service checks.
- Any admin can create another admin and can deactivate any user, including other admins or themselves. There is no self-protection.
## Cross-module contracts
- Exports: UsersModule, UsersService and types. The only external consumer is AuthModule/AuthService (injected but unused) and the `UserWithProfiles` type.
- Consumes: PrismaService, generateTempPassword/hashPassword.
## Known pitfalls / risks
- The uniqueness pre-checks are read-then-write races. A concurrent duplicate hits the DB unique constraint and surfaces as an unhandled P2002 (500), not a 400.
- `:id` params have no ParseUUIDPipe (controller :78, :87, :98, :107), so a malformed id reaches Prisma.
- `deactivate` does not revoke refresh tokens. JwtStrategy blocks access tokens, and refresh checks isActive, so this is mitigated.
- The mobile number cannot be updated. Email has no uniqueness check.
- `joiningDate`/`dateOfBirth` use `new Date("YYYY-MM-DD")`, which gives UTC midnight (timezone shift risk).
- The comment at :71 says "used by auth module during registration", but that is not true.
## Test focus
- A TEACHER or STUDENT calling any /users route gets 403.
- A duplicate mobile, employeeCode or admissionNumber gets 400. Concurrent duplicates cause a 500.
- The create response never contains the password hash, and tempPassword is returned.
- Updating or deactivating an inactive user gets 400. Activate works on an already-active user.
- A deactivated user can no longer use an existing access token.
- Search is case-insensitive, and the pagination total is correct.
