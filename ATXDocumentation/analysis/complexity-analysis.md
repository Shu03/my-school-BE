# Complexity Analysis

## High-Complexity Modules

### 1. AttendanceService — Summary Calculation
**Location**: `src/modules/attendance/attendance.service.ts` → `getSummary()`

**Complexity factors**:
- Timezone-aware date handling (SCHOOL_TIMEZONE = "Asia/Kolkata")
- Working day calculation: total month days - weekly off days - holidays
- Per-student aggregation: iterates all students × all dates
- Uses `Intl.DateTimeFormat` for timezone conversion + `date-fns` for intervals

**Risk**: Date/timezone logic is the most error-prone area. A timezone bug could affect all attendance percentages.

### 2. AuthService — Token Rotation
**Location**: `src/modules/auth/auth.service.ts` → `refresh()`

**Complexity factors**:
- SHA-256 token hashing
- Family-based reuse detection (revoke entire family on reuse)
- Session limit enforcement
- Transaction for atomic token rotation
- Multiple failure paths (expired, revoked, reuse, not found)

### 3. StudentsService — Promotion
**Location**: `src/modules/students/students.service.ts` → `promote()`

**Complexity factors**:
- Bulk operation across multiple students
- Multiple state changes per student (old enrollment → PROMOTED, new enrollment → ACTIVE)
- Auto roll number generation
- Cross-module call to FeesService for fee record generation
- Skip logic for already-enrolled students
- Transaction wrapping all operations

### 4. ExamsService — Visibility + State Machine
**Location**: `src/modules/exams/exams.service.ts`

**Complexity factors**:
- Three-state machine: ACTIVE/FINALIZED/DISCARDED
- Role-based visibility scoping (admin/teacher/student see different data)
- Multi-subject exam structure with grade aggregation
- Teacher assignment validation for each operation

### 5. FeesService — Payment Status Recalculation
**Location**: `src/modules/fees/fees.service.ts`

**Complexity factors**:
- Status computed from payment sum vs totalAmount
- Role-based access control on every query
- Cross-module integration (called by StudentsService during enrollment)
- Backfill operation across all active enrollments

## Low-Complexity Modules

| Module | Why Simple |
|--------|-----------|
| Health | Single health check endpoint, no business logic |
| Prisma | Wraps PrismaClient with lifecycle hooks |
| Announcements | Basic CRUD with ownership check |
| Subjects | Basic CRUD with uniqueness validation |
| Sections | Basic CRUD with academic year scoping |

## Complexity Hotspots

| Location | Concern | Impact |
|----------|---------|--------|
| `attendance.service.ts:getSummary` | Timezone + date math | Incorrect percentages |
| `auth.service.ts:refresh` | Token rotation logic | Security vulnerability |
| `students.service.ts:promote` | Bulk multi-step mutation | Data inconsistency on partial failure |
| `exams.service.ts:findAll` | Role-scoped query building | Authorization bypass |
| `fees.service.ts:recordPayment` | Status recalculation | Incorrect fee status |
| `common/guards/*` | Guard chain ordering | Auth bypass |

## Maintainability Concerns

### Constants File Size
`src/common/constants/app.constants.ts` is a single file containing ALL constants — pagination, JWT config, permissions, 50+ error messages. This will become unwieldy as the application grows.

**RECOMMENDATION**: Split into domain-specific constant files (e.g., `auth.constants.ts`, `attendance.constants.ts`).

### Duplicated Access Control Logic
Role-based data scoping (`if admin → all, if teacher → assigned, if student → own`) is implemented separately in ~8 service methods. Any change to the access model requires updating all instances.

**RECOMMENDATION**: Extract role-scoped query building into a shared utility or interceptor.
