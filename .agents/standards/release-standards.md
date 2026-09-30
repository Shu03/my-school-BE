# Release Standards: my-school-BE

> Used by `release-checker`, `migration-guardian`, `security-auditor` and `api-contract-guardian`.
> The deploy platform isn't decided yet. Platform-specific gates go in `.agents/standards/platforms/<platform>.md` once it's chosen.
> The release checker **never deploys, pushes, tags or runs migrations against a shared or production database**. It only gives a verdict.

## 1. Verdict rules

- **NO-GO** if any BLOCKER gate fails.
- **GO-WITH-RISKS** if only MAJOR gates fail and each one has a named owner and a mitigation.
- **GO** otherwise.
- A gate that can't be checked (for example, there's no access to the prod environment) is reported as `UNVERIFIED` with the exact command a human must run. It never counts as a pass.

## 2. Gates

### A. Build and code (BLOCKER)
| # | Check | How |
|---|---|---|
| A1 | Clean install from the lockfile | `pnpm install --frozen-lockfile --ignore-scripts`, then check that `node_modules/.bin/husky` exists (the `prepare: husky` script fails because `husky` isn't in devDependencies; that's a MAJOR finding until fixed) |
| A2 | Lint clean | `pnpm lint` |
| A3 | Formatting | `pnpm format:check` |
| A4 | Prisma client generates | `DATABASE_URL=<dummy> pnpm prisma:generate` |
| A5 | Build | `pnpm build` |
| A6 | Unit tests green | `pnpm test` (currently broken, see testing-standards §0) |
| A7 | E2E / integration green | `pnpm test:e2e` against an ephemeral Postgres |
| A8 | Agent catalog in sync | `pnpm agents:check` (MAJOR) |
| A9 | No leftover debug code | grep `console.log`, `debugger`, `.only(`, `TODO(release)` |

### B. Database (BLOCKER)
| # | Check |
|---|---|
| B1 | `prisma validate` passes, and every schema change has a committed migration. The drift check applies the migrations to a throwaway local database, then runs `prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`, which must exit 0 |
| B2 | Migrations that were already applied are unchanged (`git diff <last-release-tag> -- prisma/schema/migrations` only **adds** folders) |
| B3 | Destructive SQL scan in new migrations. These need an explicit expand/contract plan: `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `RENAME`, `SET NOT NULL` without a default or backfill, removing an enum value, a unique index on a table that already has data |
| B4 | Long-lock risk: new indexes on large tables, and table rewrites |
| B5 | Data backfill script exists and is idempotent when semantics change |
| B6 | Backup/snapshot taken before migrating (human confirms, so `UNVERIFIED` by default) |
| B7 | Migrations run as a single release step, not racing across instances (`prisma migrate deploy`, never `migrate dev`, `db push` or `migrate reset` in prod) |
| B8 | Seed is not run against prod unless intended. `prisma/seed.ts` inserts demo teachers, students and fees, and `prisma/reset-keep-admin.ts` wipes all data except one admin. Neither has a production guard, so running either against prod is a BLOCKER |

### C. Configuration and secrets (BLOCKER)
| # | Check |
|---|---|
| C1 | Every key in `src/config/env.validation.ts` is documented in `.env.example` and set in the target environment |
| C2 | `NODE_ENV=production`, so Swagger `/api/docs` is disabled |
| C3 | `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`, each ≥ 32 random bytes, and unique to production |
| C4 | No secrets committed: scan the git history of the diff for `.env`, keys and connection strings |
| C5 | `DATABASE_URL` uses TLS (`sslmode=require`) for a managed database, and the database user isn't a superuser |
| C6 | Config the docs rely on actually exists in code. For example, `deployment/01-prerequisites.md` describes `CORS_ORIGIN`, but `env.validation.ts` and `main.ts` don't implement it: prod CORS is `origin: false`, which blocks every browser front end. This is a BLOCKER if a browser front end calls the API |

### D. Runtime hardening (MAJOR unless noted)
| # | Check |
|---|---|
| D1 | `helmet()` enabled |
| D2 | CORS allows only the real front-end origins (never `*` in prod) |
| D3 | Throttling fits prod traffic. The global limit is currently **10 req/min per IP**; behind NAT (a school network) that throttles real users. `/auth/login` is limited to 5 req/min |
| D4 | `trust proxy` matches the real number of proxy hops (currently `1`) |
| D5 | `app.enableShutdownHooks()` for graceful shutdown (not present today) |
| D6 | Health endpoint `/api/v1/health` is public, checks the database, and is wired to the platform's liveness/readiness checks |
| D7 | Logs have no personal data, passwords, tokens or temporary passwords (`adminResetPassword` returns a temp password, so make sure it's never logged) |
| D8 | Body size limit set for the Express JSON parser |
| D9 | Swagger disabled in prod (BLOCKER) |

### E. Security and supply chain
| # | Check | Severity |
|---|---|---|
| E1 | `pnpm audit --prod`: no high or critical issues | BLOCKER for critical |
| E2 | Every route that changes data has `@Roles`, every `@Public()` is justified, and every read open to any role is intended (use `.agents/catalog/services.json`) | BLOCKER |
| E3 | `security-auditor` report has no open P0 | BLOCKER |
| E4 | Dependency licenses are compatible (no AGPL in prod deps) | MAJOR |
| E5 | Container image (once a Dockerfile exists): non-root user, multi-stage build, `node:22-alpine` or similar, `NODE_ENV=production`, no dev dependencies, `HEALTHCHECK` | MAJOR |

### F. API contract
| # | Check | Severity |
|---|---|---|
| F1 | `api-contract-guardian` finds no breaking change without a version bump or an agreed plan with the client | BLOCKER |
| F2 | Changelog/release notes list new, changed and removed endpoints | MINOR |

### G. Tests and readiness
| # | Check | Severity |
|---|---|---|
| G1 | Latest `tester` readiness report is `READY` or `READY-WITH-RISKS` for the modules in the diff | BLOCKER on `NOT READY` |
| G2 | Coverage thresholds from testing-standards §6 | MAJOR |

### H. Operations
| # | Check | Severity |
|---|---|---|
| H1 | Rollback plan: the previous image or commit can be redeployed, and it's compatible with the new schema (expand/contract) | BLOCKER |
| H2 | Post-deploy smoke script defined (see §3) | MAJOR |
| H3 | Monitoring and alerting cover the 5xx rate, latency and database connections (`deployment/11-monitoring-logging.md`) | MAJOR |
| H4 | Release window and communication (school hours: avoid 07:00–15:00 IST on weekdays, and exam periods) | MINOR |

## 3. Post-deploy smoke (run by a human or CI against the deployed URL)

1. `GET /api/v1/health` returns 200 with `database: up`.
2. `GET /api/docs` returns 404.
3. `POST /api/v1/auth/login` with the smoke admin returns 200 with tokens.
4. `POST /api/v1/auth/refresh` returns 200 with a rotated token. Reusing the old token returns 401.
5. One authenticated GET per module (academic-years current, sections, subjects, teachers, students, attendance summary, exams, homework, announcements, fees structures) returns 200.
6. A CORS preflight from the front-end origin echoes that origin.
7. Watch the error rate for 15 minutes. Roll back if the 5xx rate is above 1% or p95 latency is more than twice the baseline.

## 4. Report format (`release-checker` output)

```
# Release Readiness: <version/commit> → <environment>   (<date>)
Verdict: GO | GO-WITH-RISKS | NO-GO
## Summary
<3 lines>
## Gates
| Gate | Status (PASS/FAIL/UNVERIFIED/N/A) | Evidence (command + key output) | Severity |
## Blockers
## Risks accepted (owner, mitigation)
## Manual steps for the human operator (ordered)
## Rollback plan
```
