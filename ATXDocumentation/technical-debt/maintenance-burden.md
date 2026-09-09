# Maintenance Burden

## High-Maintenance Areas

### 1. Role-Based Data Scoping (Duplicated in ~8 Services)

**Pattern**: Each service that returns data implements its own role-based filtering:
```
if (role === ADMIN) → no filter
if (role === TEACHER) → filter by assigned sections
if (role === STUDENT) → filter by own profile
```

**Affected services**: AttendanceService, ExamsService, FeesService, GradesService, HomeworkService, StudentsService (6+ services with 10+ methods)

**Burden**: Any change to the access control model (e.g., adding a PARENT role) requires modifying every service independently. Risk of inconsistent enforcement.

### 2. Constants File (`src/common/constants/app.constants.ts`)

**Size**: Single file containing ALL application constants:
- Pagination defaults
- JWT configuration (TTLs, types)
- 13 permission definitions + type
- Passport strategy names
- 50+ error message constants (organized by domain)
- School configuration

**Burden**: Every new module adds more constants to this file. Merge conflicts increase as team grows.

### 3. Attendance Date/Timezone Logic

**Location**: `src/modules/attendance/attendance.service.ts`

**Complexity**: Uses `Intl.DateTimeFormat` with `SCHOOL_TIMEZONE` for date conversions, `date-fns` for interval calculations, and manual working-day counting.

**Burden**: Timezone bugs are difficult to detect without tests. The hardcoded timezone makes multi-region deployment impossible without code changes.

### 4. Prisma Schema Migration Coordination

**Location**: `prisma/schema/` (11 files, 12 migrations)

**Burden**: Multi-file Prisma schema requires careful coordination. Renaming operations (e.g., the Class→Section rename in migration 12) require updating all references across multiple schema files and all consuming services.

### 5. Cross-Module Implicit Dependencies

Services query models outside their module boundary through PrismaService:
- AttendanceService → studentEnrollment, teacherClassAssignment, holiday, schoolSettings
- ExamsService → teacherClassAssignment, studentEnrollment, subject
- GradesService → teacherClassAssignment, studentEnrollment

**Burden**: Changes to shared models (like StudentEnrollment) can silently break multiple modules. No compile-time safety for these cross-boundary queries.

## Ongoing Maintenance Costs

| Area | Effort Level | Frequency | Description |
|------|-------------|-----------|-------------|
| Adding new module | Low | Per feature | Follow established pattern (controller+service+DTOs) |
| Adding new permission | Low | Per feature | Add to constants, update preset/guard logic |
| Schema changes | Medium | Per migration | Update schema + all services that query affected models |
| Access control changes | High | Rare | Modify all services with role-scoping logic |
| Timezone/date logic | High | Rare | Complex, error-prone, requires manual testing |
| New user role | High | Very rare | Update all guards, all services, all DTOs |

## Technical Debt Accumulation Rate

The codebase shows a pattern of:
1. **Features shipped without tests** — every new module adds untested code
2. **Access control logic copied** — each new module that needs role-scoping copies the pattern
3. **Constants file grows** — each domain adds error messages and config
4. **No refactoring sprints** — no evidence of cleanup or consolidation

**INFERENCE**: Without intervention, maintenance burden will grow linearly with each new feature module.
