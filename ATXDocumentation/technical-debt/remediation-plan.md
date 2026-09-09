# Remediation Plan

## Priority Order

Issues are ordered by: (1) EOL/deprecated runtimes, (2) outdated dependencies, (3) code quality and architecture.

Since there are **no EOL/deprecated runtimes or outdated dependencies**, all items are code quality and architecture improvements.

---

## Phase 1: Production Readiness (High Priority)

### 1.1 Add Test Coverage

**Goal**: Cover critical business logic with unit tests.

**Start with**:
- `auth.service.spec.ts` — login, refresh (reuse detection), password change
- `fees.service.spec.ts` — payment recording, status transitions, backfill
- `attendance.service.spec.ts` — summary calculation, school day validation
- `students.service.spec.ts` — enrollment, promotion

**Approach**: Use `@nestjs/testing` with mocked PrismaService. Focus on business logic branches, not CRUD.

**Effort**: Significant — each service has 4-15 methods with complex branching.

### 1.2 Create Dockerfile

```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prisma generate

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main"]
```

### 1.3 Add CI/CD Pipeline

**Minimum pipeline**:
1. Lint (`pnpm lint`)
2. Type check (`pnpm build`)
3. Test (`pnpm test`)
4. Build Docker image
5. Deploy to staging

### 1.4 Fix CORS for Production

**Current** (`main.ts`): `origin: nodeEnv === "production" ? false : "*"`
**Fix**: Add `CORS_ORIGIN` environment variable:
```typescript
origin: nodeEnv === "production"
    ? configService.get<string>("app.corsOrigin")
    : "*"
```

---

## Phase 2: Architecture Improvements (Medium Priority)

### 2.1 Extract Role-Scoped Query Utility

Create a shared utility that builds Prisma `where` clauses based on user role:
```typescript
// Example
function scopeByRole(user: JwtPayload, sectionId?: string) {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.TEACHER) return { sectionId: { in: teacherSections } };
    if (user.role === Role.STUDENT) return { studentId: studentProfileId };
}
```

### 2.2 Add Structured Logging

**Replace**: NestJS built-in Logger
**With**: `nestjs-pino` (JSON output, request correlation IDs, configurable log levels)

### 2.3 Add Audit Trail

For critical operations (grade entry, attendance marking, enrollment changes, fee payments):
- Add `updatedById` field where missing
- Or implement event-based audit logging

### 2.4 Make Timezone Configurable

Move `SCHOOL_TIMEZONE` from hardcoded constant to:
- `SchoolSettings.timezone` (per-school)
- Or `SCHOOL_TIMEZONE` environment variable

---

## Phase 3: Code Quality (Low Priority)

### 3.1 Split Constants File
Break `app.constants.ts` into domain-specific files:
- `auth.constants.ts`
- `attendance.constants.ts`
- `exam.constants.ts`
- etc.

### 3.2 Remove Unused Dependencies
- Remove `@nestjs/axios` from `package.json`

### 3.3 Fix E2E Test
- Update `test/app.e2e-spec.ts` to test `GET /api/v1/health` instead of `GET /`

### 3.4 Resolve Jest/ts-jest Version Mismatch
- Upgrade `ts-jest` to 30.x when available
- Or pin `jest` to 29.x until ts-jest catches up

### 3.5 Clean Up Empty Directories
- Remove `src/common/pipes/` (empty) or add custom pipes

---

## Checklist

- [ ] Auth service unit tests
- [ ] Fee service unit tests
- [ ] Attendance service unit tests
- [ ] Student service unit tests
- [ ] Dockerfile (multi-stage)
- [ ] GitHub Actions CI/CD pipeline
- [ ] CORS production configuration
- [ ] Role-scoped query utility
- [ ] Structured logging (nestjs-pino)
- [ ] Audit trail for critical operations
- [ ] Configurable timezone
- [ ] Split constants file
- [ ] Remove @nestjs/axios
- [ ] Fix e2e test
- [ ] Resolve Jest/ts-jest mismatch
