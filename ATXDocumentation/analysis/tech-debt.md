# Tech Debt Assessment

## Overview

The codebase is built on modern technologies with no EOL or deprecated components. Technical debt is concentrated in **testing gaps**, **missing infrastructure**, and **architectural decisions** that will limit scalability.

## Debt Categories

### 1. Testing Debt (High)

| Item | Details |
|------|---------|
| Unit tests | 14 `.spec.ts` files exist but contain no implemented tests |
| E2E tests | 1 scaffold test that tests wrong route (`GET /` instead of `/api/v1/health`) |
| Integration tests | None |
| Coverage | Effectively 0% |

**Business Risk**: 100+ endpoints with complex business logic (token rotation, attendance calculation, fee management, bulk promotion) have no automated verification.

### 2. Infrastructure Debt (High)

| Item | Details |
|------|---------|
| Dockerfile | Missing — cannot containerize |
| CI/CD pipeline | None — no automated builds, tests, or deployments |
| Container orchestration | No Kubernetes/ECS manifests |
| Monitoring | No APM, structured logging, or alerting setup |

### 3. Architectural Debt (Medium)

| Item | Impact |
|------|--------|
| No repository layer | Services tightly coupled to Prisma, hard to test |
| Duplicated access control logic | Role-scoping reimplemented in ~8 services |
| Single constants file | 500+ lines covering all domains |
| Hidden cross-domain queries | Services query tables outside their module boundary |
| Hardcoded timezone | Cannot deploy for non-India schools |

### 4. API Design Debt (Low)

| Item | Impact |
|------|--------|
| No API versioning strategy | v2 migration will be difficult |
| Inconsistent error messages | Mix of centralized constants and inline strings |
| Unused @nestjs/axios dependency | Dead dependency |
| CORS not configured for production | Frontend blocked in prod |

## Debt Trend

The codebase is relatively new (migrations span Mar-Sep 2026). Debt is accumulating in predictable areas:
- New features added without tests (velocity over quality trade-off)
- Infrastructure deferred (deployment guide written instead of Dockerfile)
- Each new module copies the same patterns (including the same access control duplication)

## Recommendations Priority

1. **Add unit tests for Auth and Fees services** — highest business risk
2. **Create Dockerfile** — prerequisite for any production deployment
3. **Add CI/CD pipeline** — automate quality gates
4. **Extract role-scoped query utility** — reduce duplication across services
5. **Configure CORS for production** — blocking issue for deployment
6. **Remove unused @nestjs/axios** — clean dependency list
