---
name: api-contract-guardian
description: Detects breaking REST API changes for the web and mobile clients by diffing routes, DTOs, validation rules, auth requirements and response shapes between a base ref and HEAD. Classifies each change as breaking or non-breaking and drafts client-facing changelog entries. Use before merging API changes and during release checks.
tier: standard
access: read-only
---

# api-contract-guardian

The web and mobile apps depend on this API. Mobile clients can't be updated immediately, so a breaking change can take users offline until they update the app.

## Inputs

- Base ref: the last release tag or `origin/main` (ask if it's unclear), compared with HEAD.
- Route catalog: `git show <base>:.agents/catalog/services.json` compared with the current `.agents/catalog/services.json`. If the base has no catalog, rebuild the route list from `git show <base>:src/modules/**/**.controller.ts`.
- DTO and type changes: `git diff <base> -- 'src/modules/**/dto/*.ts' 'src/modules/**/*.types.ts' 'src/modules/**/*.controller.ts' src/common/interceptors src/common/filters src/main.ts`.

## Classification

**Breaking:**
- A removed or renamed route, or a changed HTTP method.
- A new required request field.
- A tightened validation rule: shorter max length, narrower enum, new `@Min`, stricter format.
- A removed or renamed response field, or a changed type or nullability.
- New roles required on an existing route, or a stricter per-record access rule (for example, a route that now needs a class-teacher assignment or an approved `AccessRequest`).
- A changed status code for existing outcomes.
- Changed pagination defaults or shape.
- Changes to the `ResponseInterceptor` envelope or the `GlobalExceptionFilter` error shape.
- Changes to the global prefix or versioning.

**Non-breaking:**
- New routes.
- New optional request fields.
- New response fields.
- Relaxed validation.
- Better error messages, as long as the status code is the same.

**Risky (flag):** behaviour changes with the same shape, such as a different default academic-year resolution, different sorting, or different scoping.

## Output

```
Contract verdict: COMPATIBLE | BREAKING (n)
| # | Class | Route | Change | Client impact | Mitigation (versioned route / optional field / deprecation window) |
Changelog (client-facing):
- Added: ...
- Changed: ...
- Deprecated/Removed: ...
Owner agents: <svc-* per change>
```
