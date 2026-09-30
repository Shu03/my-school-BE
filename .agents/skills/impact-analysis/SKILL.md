---
name: impact-analysis
description: Determines the blast radius of a change to a module's contract (exports, service method signatures or behaviour, Prisma models, routes, DTOs) using the generated service catalog and dependency graph. Lists the downstream svc-* agents that must review or adapt. Use before changing any exported symbol, shared model, or route.
---

# Impact analysis

## 1. Classify the change

| Contract surface | Where to look |
|---|---|
| Exported symbols | `src/modules/<m>/index.ts` → catalog `publicApi` |
| Service method used by others | catalog `dependsOn[].calls` / `usedBy[].calls` (exact `Service.method()` pairs, extracted from code), then confirm with `grep -rn "<method>(" src --include=*.ts` |
| Types (for example `JwtPayload`, `UserWithProfiles`) | catalog `usedBy` entries with `kind: "type"`, including `src/common` |
| Prisma model | catalog `prisma.writes`/`prisma.reads` of **every** service. Anyone reading the model is affected by column changes |
| Route / DTO / response shape | catalog `routes` means external clients are affected (see `api-contract-guardian`) |
| Access model (`AccessPolicyService` methods, `AccessType` enum, `AccessRequest` statuses) | `svc-request-access` "Used by": attendance, dashboard, exams, grades and homework, with the exact methods each one calls |
| Roles on routes | catalog `routes[].roles`; web and mobile clients are affected |

## 2. Find the dependents

```bash
node -e 'const c=require("./.agents/catalog/services.json");const s=c.services[process.argv[1]];console.log(JSON.stringify({usedBy:s.usedBy,publicApi:s.publicApi},null,2))' <service>
# who reads/writes a model
node -e 'const c=require("./.agents/catalog/services.json");for(const s of Object.values(c.services)){const m=process.argv[1];if(s.prisma.writes.includes(m)||s.prisma.reads.includes(m))console.log(s.agent, s.prisma.writes.includes(m)?"writes":"reads")}' <Model>
```
Always confirm with `grep`. The catalog only records static imports.

## 3. Classify each dependent

- **Unaffected**: it uses a part that didn't change.
- **Compatible**: the behaviour change is acceptable, but it should be noted in that module's notes.
- **Breaking**: the dependent must change in the same PR, or the change must be made backward-compatible. Options include:
  - an optional parameter,
  - a new method, with the old one deprecated,
  - an expand/contract schema change.

## 4. Output

```
Change: <what>
| Downstream agent | Uses | Effect (unaffected/compatible/breaking) | Required action |
External clients affected: yes/no (routes)
Recommendation: proceed | make backward-compatible first | coordinate change with <agents>
```
Include this table in your final report so that the orchestrator can dispatch the downstream agents.
