<!-- source-hash: b9ca283ca3b1 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-platform by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp platform`. -->

## Purpose
`PrismaService` (PrismaClient using the PrismaPg adapter and `env.DATABASE_URL`) is shared by all modules. HealthModule exposes a public DB ping at GET /health.
## Business rules & invariants
- `PrismaService` connects on `onModuleInit` and disconnects on `onModuleDestroy` (prisma/prisma.service.ts:17-23).
- `HealthController.check` runs terminus `PrismaHealthIndicator.pingCheck("database", prisma)` (health/health.controller.ts:22-30).
## Access control notes
- /health is @Public, so it skips JwtAuthGuard. It has no @Roles. ThrottlerGuard still applies.
## Cross-module contracts
- prisma/index.ts exports PrismaModule and PrismaService. PrismaService is injected by every service. The one exception is teachers, which imports "@modules/prisma/prisma.service" directly (teachers.service.ts:8).
- health/index.ts exports HealthModule.
## Known pitfalls / risks
- The adapter is loaded with `require` under an eslint-disable (prisma.service.ts:4-5).
- It relies on `env.DATABASE_URL` and has no pool or timeout configuration.
- There is no soft-delete or tenant middleware, so every scoping check lives in the services.
- The public health endpoint could leak DB error details through terminus.
- There are no spec files for prisma or health (no *.spec.ts found in either module).
## Test focus
- GET /health returns 200 without a token, and 503 when the DB is down.
- Health is subject to throttling.
- PrismaService connects and disconnects with the module lifecycle (e2e bootstrap).
- Transactions used by other modules (`$transaction` array and interactive) roll back on error.
- A health response does not expose the connection string.
