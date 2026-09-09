# Technical Debt Summary

## Severity Distribution

| Severity | Count | Categories |
|----------|-------|-----------|
| **High** | 3 | Testing, Dockerfile, CI/CD |
| **Medium** | 5 | Repository abstraction, audit trail, CORS, timezone, logging |
| **Low** | 4 | ts-jest version, empty pipes dir, e2e test, API versioning |

## Top Findings

### High Severity
1. **Near-zero test coverage** — 0% effective coverage across 100+ endpoints
2. **No Dockerfile** — cannot deploy to container platforms
3. **No CI/CD pipeline** — no automated quality gates

### Medium Severity
4. **No repository abstraction** — PrismaService used directly in all services
5. **Missing audit trail** — most mutations lack who-changed-what tracking
6. **CORS production gap** — `origin: false` blocks cross-origin requests
7. **Hardcoded timezone** — "Asia/Kolkata" not configurable
8. **No structured logging** — only NestJS built-in Logger

### Low Severity
9. **Empty pipes directory** — exists but unused
10. **E2E test tests wrong route** — scaffold test doesn't match actual routes
11. **Jest/ts-jest version mismatch** — Jest 30 + ts-jest 29
12. **No API versioning strategy** — only `/api/v1` with no v2 plan

## Cross-References
- [Outdated Components](./outdated-components.md) — Dependency freshness analysis
- [Maintenance Burden](./maintenance-burden.md) — Areas requiring ongoing effort
- [Remediation Plan](./remediation-plan.md) — Prioritized action items
- [Root Technical Debt Report](../technical-debt-report.md) — Executive summary
