# Technical Debt Report

## 🎯 AWS Transformation Recommendation

### **RECOMMENDED TRANSFORMATIONS: None**

This is a modern NestJS 11 / TypeScript 5.7 / Prisma 7 application with no AWS SDK dependencies, no legacy Java/.NET/Python frameworks, no Angular/Vue frontend code, and no outdated runtime versions. None of the currently available AWS-managed transformations apply to this codebase. Recommended next steps focus on addressing the testing gaps, adding production infrastructure (Dockerfile, CI/CD), and resolving the moderate code-quality and architectural issues documented below.

---

## Executive Summary

**my-school-BE** is built on a modern technology stack (NestJS 11, TypeScript 5.7, Prisma 7, PostgreSQL 16). There are **no critical EOL or deprecated runtimes or frameworks**. The primary technical debt is in **testing coverage**, **missing production infrastructure**, and **architectural patterns** that will become pain points as the application scales.

## Severity Summary

| Severity | Count | Category |
|----------|-------|----------|
| **High** | 3 | Missing test coverage, no Dockerfile, no CI/CD pipeline |
| **Medium** | 5 | No repository abstraction, missing audit trail, hardcoded config, CORS production gap, no logging integration |
| **Low** | 4 | Dev dependency staleness, empty pipes directory, e2e test scaffold, missing API versioning strategy |

## Priority-Ordered Findings

### High Severity

#### 1. Near-Zero Test Coverage
- **FACT**: Only scaffold e2e test exists (`test/app.e2e-spec.ts` — tests `GET /` for 200). Zero unit test implementations despite `.spec.ts` files existing for 7 modules.
- **Impact**: No regression safety net for 100+ endpoints and complex business logic (attendance calculations, fee management, token rotation, grade aggregation).
- **Remediation**: Implement unit tests for all services starting with auth (token rotation, reuse detection) and fees (payment calculation, status transitions).

#### 2. No Dockerfile / Container Build
- **FACT**: `docker-compose.yml` only defines PostgreSQL. No Dockerfile exists for the application.
- **Impact**: Cannot deploy to any container-based platform (ECS, EKS, Cloud Run, Fly.io) without manual Dockerfile creation.
- **Remediation**: Create multi-stage Dockerfile (build + runtime stages) with `node:22-alpine` base.

#### 3. No CI/CD Pipeline
- **FACT**: No `.github/workflows/`, no `Jenkinsfile`, no pipeline configuration of any kind.
- **Impact**: No automated testing, linting, or deployment. Manual-only deployment process.
- **Remediation**: Add GitHub Actions workflow for lint → test → build → deploy.

### Medium Severity

#### 4. No Repository/Data Access Abstraction
- **FACT**: All 14 service classes call `PrismaService` directly (e.g., `this.prisma.user.findUnique(...)`). No repository layer.
- **INFERENCE**: Tight coupling to Prisma makes unit testing require mocking the entire Prisma client. Database migration to a different ORM would require rewriting all services.
- **Remediation**: Consider introducing repository interfaces for complex modules (auth, fees, students) to improve testability.

#### 5. Missing Comprehensive Audit Trail
- **FACT**: Only `User` model tracks `createdById` and `resetPasswordById`. Fee payments track `recordedById`. Most mutations (attendance, grades, enrollment changes) lack audit fields.
- **Impact**: Cannot trace who made changes to grades, attendance, or enrollment status.
- **Remediation**: Add `updatedById` / audit logging for critical operations.

#### 6. CORS Not Configured for Production
- **FACT**: `main.ts` line 30: `origin: nodeEnv === "production" ? false : "*"`. In production, CORS origin is `false`, which blocks all cross-origin requests.
- **Impact**: Frontend cannot call the API from a different domain in production.
- **Remediation**: Configure allowed origins via environment variable.

#### 7. Hardcoded School Configuration
- **FACT**: `SCHOOL_TIMEZONE = "Asia/Kolkata"` hardcoded in `app.constants.ts`. Not configurable per-deployment.
- **Impact**: Cannot deploy for schools in different timezones without code change.
- **Remediation**: Move timezone to SchoolSettings model or environment variable.

#### 8. No Structured Logging / Observability
- **FACT**: Uses NestJS built-in `Logger` only. No structured logging library (Winston, Pino). No request correlation IDs.
- **Impact**: Difficult to debug production issues; no log aggregation support.
- **Remediation**: Integrate `nestjs-pino` or Winston with JSON output and correlation IDs.

### Low Severity

#### 9. Empty Pipes Directory
- **FACT**: `src/common/pipes/` directory exists but contains no files. Only an `index.ts` barrel exists in the parent.
- **Remediation**: Remove empty directory or add custom pipes if needed.

#### 10. E2E Test Tests Wrong Route
- **FACT**: `test/app.e2e-spec.ts` tests `GET /` expecting "Hello World!", but the app uses global prefix `/api/v1` and has no root handler.
- **Remediation**: Update e2e test to test `GET /api/v1/health`.

#### 11. ts-jest Version Mismatch
- **FACT**: `jest@30.0.0` is installed but `ts-jest@29.2.5` — ts-jest 29 may not fully support Jest 30.
- **INFERENCE**: Could cause subtle test runner issues.
- **Remediation**: Upgrade ts-jest to 30.x when available, or pin jest to 29.x.

#### 12. No API Versioning Strategy
- **FACT**: API prefix is `/api/v1` but no versioning mechanism for future breaking changes.
- **INFERENCE**: Adding v2 endpoints will require manual route management.
- **RECOMMENDATION**: Plan versioning strategy before the first breaking API change.

---

## Detailed Documentation

- [Technical Debt Summary](./technical-debt/summary.md)
- [Outdated Components](./technical-debt/outdated-components.md)
- [Maintenance Burden](./technical-debt/maintenance-burden.md)
- [Remediation Plan](./technical-debt/remediation-plan.md)
- [Analysis: Tech Debt](./analysis/tech-debt.md)
