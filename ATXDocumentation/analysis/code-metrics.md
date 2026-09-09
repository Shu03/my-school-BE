# Code Metrics

## Source Code Size

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| TypeScript source (src/) | ~138 | ~8,500 |
| Prisma schemas | 11 | ~600 |
| Config files (tsconfig, eslint, nest-cli) | 5 | ~200 |
| Seed/reset scripts | 3 | ~150 |
| Test files (spec + e2e) | ~15 | ~400 |
| **Total** | **~172** | **~9,900** |

## Module Size Distribution

| Module | Files (non-spec) | Routes | Service Methods | DTOs |
|--------|-------------------|--------|-----------------|------|
| teachers | 10 | 15 | 15+ | 6 |
| exams | 10 | 10 | 10+ | 6 |
| fees | 10 | 9 | 10+ | 6 |
| students | 10 | 7 | 7 | 5 |
| academic-years | 9 | 10 | 10 | 4 |
| auth | 8 | 6 | 6 | 4 |
| attendance | 8 | 4 | 4+ | 4 |
| homework | 6 | 5 | 5 | 3 |
| announcements | 6 | 5 | 5 | 3 |
| school | 7 | 5 | 6 | 3 |
| sections | 7 | 4 | 4 | 3 |
| subjects | 7 | 5 | 5 | 3 |
| grades | 6 | 4 | 4 | 3 |
| users | 7 | 8 | 8 | 3 |
| health | 2 | 1 | 0 | 0 |
| prisma | 2 | 0 | 0 | 0 |

## Shared Infrastructure Size

| Component | Files | Purpose |
|-----------|-------|---------|
| common/constants | 2 | All app constants (single large file) |
| common/decorators | 5 | 4 custom decorators + barrel |
| common/filters | 2 | Global exception filter |
| common/guards | 8 | 5 guards/strategies + barrel |
| common/interceptors | 2 | Response interceptor |
| common/utils | 2 | Password utilities |
| config/ | 5 | Env validation + config namespaces |

## Database Metrics

| Metric | Count |
|--------|-------|
| Models | 20 |
| Enums | 7 |
| Explicit indexes | 32 |
| Unique constraints | 17 |
| Cascade delete relationships | 15 |
| Migrations | 12 |

## API Surface Metrics

| Metric | Count |
|--------|-------|
| Controllers | 15 |
| Total routes | ~100 |
| Public routes | 4 (login, refresh, change-password, health) |
| ADMIN-only routes | ~25 |
| TEACHER-accessible routes | ~60 |
| STUDENT-accessible routes | ~30 |
| Rate-limited routes | 2 (login: 5/min, refresh: 10/min) |

## Test Coverage

| Metric | Status |
|--------|--------|
| Unit test files (.spec.ts) | 14 exist, 0 implemented |
| E2E test files | 1 (scaffold only — tests wrong route) |
| Integration tests | 0 |
| **Effective test coverage** | **~0%** |
