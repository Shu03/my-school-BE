# Coding Standards: my-school-BE (production bar)

> This is the one source of truth for every agent that writes or reviews code.
> It comes from the existing code, `eslint.config.mjs`, `.prettierrc` and `tsconfig.json`.
> If the code and this doc disagree, raise it. Don't quietly pick one.

## 1. Stack

NestJS 11 · TypeScript 5 (strictNullChecks, noImplicitAny) · Prisma 7 (PostgreSQL 16, schema split across files) ·
class-validator/class-transformer DTOs · Passport JWT · Swagger · Jest 30 · pnpm.

Commands: `pnpm lint` · `pnpm format:check` · `pnpm build` · `pnpm test` · `pnpm test:e2e` ·
`pnpm prisma:migrate:dev --name <snake_case>` · `pnpm prisma:generate` · `pnpm agents:build`.

## 2. Module layout (required)

```
src/modules/<kebab-plural>/
  <name>.module.ts         # imports, providers, controllers, exports [<Name>Service]
  <name>.controller.ts     # HTTP only: decorators, DTO binding, delegate to the service
  <name>.service.ts        # all business logic and Prisma access
  <name>.types.ts          # Prisma.<Model>GetPayload<...> result types, domain types
  <name>.controller.spec.ts
  <name>.service.spec.ts
  dto/<verb>-<noun>.dto.ts # one DTO class per file (create-, update-, list-, bulk-...)
  dto/index.ts             # optional barrel
  index.ts                 # public API: export { XModule }, { XService }, export type {...}
```

- Register the module in the `imports` of `src/app.module.ts`.
- Other modules should import through `@modules/<name>` (the barrel). Deep imports (`@modules/<name>/<name>.service`) exist in older code. Don't add new ones.
- Path aliases: `@common/*`, `@config/*`, `@modules/*`. Never use `../../` to reach another module.
- Reference implementations (newest code, commit `4fa4355`). Read one before writing a module:
    - `src/modules/request-access/`: status state machine, per-record access checks, pagination and Swagger.
    - `src/modules/accounts/`: `Decimal` money, serialised balance checks inside a transaction.
    - `src/modules/homework/`: using `AccessPolicyService` to scope teachers and students.

    `sections/` is simple but older in style.

- A module can have more than one `*.service.ts` when concerns differ. Examples: `request-access` has `access-policy.service.ts`, and `dashboard` has one service per role.

## 3. TypeScript and style (enforced by ESLint; `pnpm lint` must be clean)

- 4 spaces, double quotes, semicolons, trailing commas, line width 100, LF line endings.
- `@typescript-eslint/no-explicit-any: error`. Use `unknown` with narrowing, or Prisma types.
- `explicit-function-return-type: error`. Every function and method declares its return type.
- `explicit-member-accessibility: error`. Every class member is marked `public`, `private` or `protected`, constructors included.
- `no-floating-promises`, `no-misused-promises`, `await-thenable`. Every promise is awaited or explicitly marked with `void`.
- Unused variables are errors unless their name starts with `_`.
- Import order:
    1. Built-in modules, then external packages (`@nestjs/**` first).
    2. `@prisma/client` and other libraries.
    3. `@common/**`, then `@config/**`, then `@modules/**`.
    4. Relative imports.

    Keep each group alphabetized with a blank line between groups. `import/no-duplicates` applies.

- No `console.*`. Use `new Logger(ClassName.name)`.
- DTO properties use definite assignment (`public name!: string;`) or are optional (`public name?: string;`).

## 4. Controllers

- Use `@ApiTags("<Human Name>")`, `@ApiBearerAuth()` (unless the controller is fully public) and `@Controller("<kebab-plural>")`.
- The global prefix `api/v1` is set in `main.ts`. Don't repeat it.
- Every handler has:
    - `@ApiOperation({ summary })`.
    - At least one success `@Api*Response`.
    - The matching error responses, such as `@ApiNotFoundResponse`, `@ApiBadRequestResponse` and `@ApiForbiddenResponse`.

    Some newer controllers (accounts, fees, grades, homework, announcements) are missing `@ApiOperation`. That's debt; don't copy it.

- Handler style (current code): a non-async pass-through that returns the service call.
    ```ts
    public create(@Body() dto: CreateXDto, @CurrentUser() user: JwtPayload): ReturnType<XService["create"]> {
        return this.xService.create(dto, user);
    }
    ```
    Older controllers use `public async ...: Promise<ReturnType<...>>`. Both are valid; follow the file you're editing.
- UUID route params always use `@Param("id", ParseUUIDPipe)`. Some older controllers (academic-years, attendance, exams, school, sections, students, subjects, teachers, users) omit it; don't copy that.
- Controllers contain no business logic, no Prisma calls and no try/catch.

### Authorization model (verified against code on 2026-10-01)

1. **Global guards:** `JwtAuthGuard → RolesGuard → ThrottlerGuard`, registered as `APP_GUARD` in `src/app.module.ts`.
    - Every route requires authentication by default.
    - `@Public()` needs a comment that explains why.
    - There are **no permission flags**: no `@Permissions`, no `PermissionsGuard`, no presets.
    - `JwtPayload` is `{ sub, role, type }`, where `sub` is the User id.
2. **The role decides broad access.**
    - Every route that changes data must declare `@Roles(...)`.
    - Read routes may leave it out only when every role may read the data. As of 2026-10-01 these are: `GET /academic-years/current`, `/academic-years/:id/terms`, `/sections`, `/sections/:id`, `/subjects`, `/subjects/:id`, `/school/holidays`, `/auth/me`, `/dashboard`, plus `POST /auth/logout`.
    - New modules should be explicit.
3. **The service decides per-record access.** It receives `@CurrentUser() user: JwtPayload` and branches on `user.role`:
    - **ADMIN:** full access. Admin-only modules (such as `accounts`) mark every route `@Roles(Role.ADMIN)`.
    - **TEACHER:** must be authorized through `AccessPolicyService` from `@modules/request-access`:
        - `isClassTeacher`, `isAssignedToSection` and `canViewSection` for access to a section.
        - `resolveSubjectAccess(userId, AccessType.X, sectionId, subjectId)` for access to a section and subject. It returns `CLASS_TEACHER`, `SUBJECT_TEACHER`, `GRANTED` or `null`.
        - `hasApprovedAccess` and `findApprovedScopes` for grants from approved `AccessRequest`s.
        - `buildSectionScope(userId)` as a `where` fragment for list queries.
    - **STUDENT:** only their own records. Resolve their `StudentProfile` or enrollment from `user.sub`; never trust a `studentId` sent by the client.
4. A new kind of delegated teacher capability means a new `AccessType` enum value in `prisma/schema/access.prisma`. Coordinate it with `svc-request-access`; it's a contract change.
5. Deny with `ForbiddenException(ERROR_<MODULE>_FORBIDDEN_SCOPE | _ACCESS_DENIED)`. Returning 404 for records the user may not see is also acceptable, but be consistent within a module.

## 5. DTOs and validation

- The global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform, enableImplicitConversion })` rejects any field without a validator.
- Every field has `@ApiProperty`/`@ApiPropertyOptional` with an `example`, plus class-validator decorators. Optional fields also get `@IsOptional()`.
- Strings: `@Transform(({ value }: { value: string }) => value?.trim())`, `@IsString()`, `@IsNotEmpty()` and `@MaxLength(n)`. Always limit the length.
- IDs: `@IsUUID()`. Enums: `@IsEnum(PrismaEnum)`. Dates: `@IsDateString()`, and document date-only fields as `YYYY-MM-DD`.
- Numbers from query strings: `@Type(() => Number)` or `@Transform(parseInt)`, then `@IsInt()` with `@Min`/`@Max`.
- Arrays: `@IsArray()`, `@ArrayMinSize(1)`, `@ArrayMaxSize(n)`, and `@ValidateNested({ each: true })` with `@Type(() => Item)`.
- Money: positive, capped at a maximum, and at most 2 decimals (`@IsNumber({ maxDecimalPlaces: 2 })`).
- Update DTOs: every field is optional. The service rejects an empty update using a named `ERROR_*_EMPTY_UPDATE` constant.
- List DTOs: `page` (default `DEFAULT_PAGE`) and `limit` (default `DEFAULT_PAGE_LIMIT`, `@Max(MAX_PAGE_LIMIT)`). Legacy unpaginated lists: sections, subjects, academic-years, homework, fees records.

## 6. Services

- Mark with `@Injectable()`. Inject `PrismaService` and other module services through the constructor. Never create them with `new`.
- Private check helpers are named `assert<Thing>` and throw on failure. Public methods follow this order: validate, check access, write, return.
- Exceptions: use Nest HTTP exceptions only (`NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`, `UnauthorizedException`). Messages come from `ERROR_*` constants in `src/common/constants/app.constants.ts` (older modules such as academic-years still throw string literals; don't copy that). A new module adds its own block of constants there.
- Status codes:
    - 400: invalid input or invalid state.
    - 401: not logged in.
    - 403: logged in but not allowed.
    - 404: missing, or hidden from this user.
    - 409: unique conflict.
- `GlobalExceptionFilter` maps Prisma `P2002 → 409`, `P2025 → 404`, and everything else to 500. Don't rely on it for business errors; check explicitly first.
- Academic-year scope: when `academicYearId` is optional, default to `AcademicYearsService.findCurrent()`.
- Dates: compare date-only business rules (today, school day, due date) in `SCHOOL_TIMEZONE` (`Asia/Kolkata`). Use `getTodayInSchoolTimezone()` from `@common/utils` (it returns `YYYY-MM-DD`). Never use `new Date().toDateString()` on the server clock.
- `ResponseInterceptor` wraps every successful response as `{ success, statusCode, timestamp, data }`. Return the raw data. Errors are shaped by `GlobalExceptionFilter` as `{ success: false, statusCode, timestamp, path, message }`.

## 7. Data access (Prisma)

- The schema lives in `prisma/schema/<domain>.prisma`; a new domain gets a new file.
- Naming and required fields:
    - Models are PascalCase and fields are camelCase.
    - Every new model has `id String @id @default(uuid())`, `createdAt @default(now())` and `updatedAt @updatedAt`. (Legacy exceptions without `updatedAt`: `RefreshToken`, `TeacherClassAssignment`.)
- Add a `@@unique` for every business uniqueness rule, and an `@@index` for every foreign key or filter column used in lists.
- Money: use `Decimal @db.Decimal(12, 2)` and do arithmetic with `Prisma.Decimal` (see `accounts`). The fees module still stores money as `Float` (`prisma/schema/fees.prisma`); that's known debt, so don't copy it.
- Date-only fields: `@db.Date`.
- Operations that write more than once must be atomic: `this.prismaService.$transaction(async (tx) => { ... })`.
- Read-then-write races need a transaction plus either a database constraint or a conditional `updateMany({ where: { ..., version/status } })`. Examples: counters, recalculating a status, "only one per X".
    - Status transitions: `request-access` `setStatus` uses a conditional `updateMany` with `where status = expected`.
    - Invariants that span a whole table: `accounts` takes `pg_advisory_xact_lock` inside `$transaction`.
- Every `findMany` that can grow is either paginated (`skip`/`take` plus `count`, inside `$transaction([...])`) or explicitly limited.
- Never return `user.password`. Use `omit: { password: true }` or `select`.
- No N+1 queries: batch with `in` queries or `include`. List endpoints never make Prisma calls inside a loop.
- Migrations:
    - Create them with `pnpm prisma:migrate:dev --name <snake_case>`.
    - Never edit a migration that has already been applied.
    - Destructive changes follow expand → migrate data → contract (see `.agents/skills/prisma-migration`).

## 8. Types

- `<name>.types.ts` exports result types built with `Prisma.<Model>GetPayload<{ include/select/omit }>`.
- A module's public API is whatever its `index.ts` exports. Changing it affects other modules, so run impact analysis first.

## 9. Security baseline

- Never put secrets, tokens, passwords or full personal data in logs or error messages.
- Hash passwords with `hashPassword` (bcrypt, `SALT_ROUNDS`). Hash tokens with `hashToken`.
- Returning 403 can reveal that another user's record exists. In those cases 404 is acceptable, but be consistent within a module.
- Bulk endpoints limit array size. All free text is limited with `@MaxLength`.
- New config goes into both `src/config/env.validation.ts` (zod) and `.env.example`.

## 10. Definition of Done

A change is ready for production only when:

1. `pnpm lint`, `pnpm format:check` and `pnpm build` pass.
2. `pnpm test` passes, and new or changed service logic has real unit tests (more than "should be defined").
3. Migrations are generated, reviewed and committed, with no drift.
4. Swagger documents every new route. Every route has an explicit `@Roles`, and the service enforces per-record access (coding-standards §4 "Authorization model").
5. Tests cover per-record authorization, both allowed and denied.
6. `pnpm agents:build` has been re-run so the service catalog and the `svc-*` agents reflect the change.
7. If the module's code changed, `.agents/services/<module>.notes.md` is re-verified **against the code**, updated, and re-stamped with `pnpm agents:stamp <module>`.
