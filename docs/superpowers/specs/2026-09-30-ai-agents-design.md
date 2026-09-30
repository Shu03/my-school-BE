# AI Agent System: Design

- **Status:** Approved on 2026-09-30 and implemented. Rebased onto commit `4fa4355` ("Accounts service, Permissions modification, bug fixes") on 2026-10-01. Platform-specific release gates are deferred until a deploy platform is chosen.
- **Targets:** Claude Code (subagents and skills) and OpenAI Codex (custom agents, skills and `AGENTS.md`).
- **Principle:** agents learn from **code only**. `docs/`, `ATXDocumentation/`, `deployment/` and `README.md` were outdated, for example still describing permission presets and missing the accounts module. They are never an input to agent knowledge.

## 1. Why this design

| Repo finding (from code) | Design response |
|---|---|
| The standards are implicit (strict ESLint, a consistent module shape) | Write them down once in `.agents/standards/*`, extracted from the current code, and have every agent reference them |
| 18 services. `academic-years` is a hub used by 9 modules. `request-access` exports `AccessPolicyService`, used by attendance, dashboard, exams, grades and homework. `dashboard` → accounts, school. `grades` → exams. `students` → sections, fees | Generate each per-service agent's **Depends on / Used by** links, **including the exact methods called**, from the TypeScript AST |
| Authorization changed from permission flags to roles in guards plus `AccessPolicyService` in services (class or subject teacher, or an approved `AccessRequest`) | The standards, skills and tester/security checklists describe the model that exists in the code |
| Most specs are stubs. 8 services have none. The Jest alias mapping is missing, so 20 of 20 suites fail | The tester's first step is to repair the test infrastructure |
| No CI, no Dockerfile, `husky` missing, prod CORS set to `origin: false`, 10 req/min throttle, seed/reset scripts with no production guard | Recorded as standing risks that the release checker re-verifies |
| Docs drifted from code | Notes are stamped with a source hash, so drift between code and agent knowledge is detected automatically |

## 2. Architecture: one source, generated adapters

```
.agents/                               (source of truth, hand-written)
  agents.config.json                   model tiers, access profiles, service groups, skills
  standards/{coding,testing,release}-standards.md
  specs/<agent>.md                     11 core agents (frontmatter: name, description, tier, access)
  templates/service-agent.md           template for the svc-* agents
  services/<svc>.notes.md              knowledge derived from CODE only, stamped with a source hash (18)
  skills/<skill>/SKILL.md              6 shared skills (Codex reads these here natively)
  catalog/{services.json,SERVICES.md}  GENERATED: routes, RBAC, Prisma models, dependency graph
scripts/agents/build.mjs               generator (TypeScript compiler API), plus --check
.claude/agents/*.md, .claude/skills/   GENERATED for Claude Code
.codex/agents/*.toml                   GENERATED for Codex
AGENTS.md (roster block GENERATED)     Codex instructions; CLAUDE.md imports it
```

- `pnpm agents:build` regenerates everything.
- `pnpm agents:check` exits with code 1 on drift or on stale generated files.
- `pnpm agents:stamp <svc|all>` marks notes as verified against the current code.
- Claude and Codex agents get **identical** instruction bodies.
- Only the metadata differs:

  | Setting | Claude | Codex |
  |---|---|---|
  | Tools / sandbox | `tools` | `sandbox_mode` |
  | Model | `model` | `model` plus `model_reasoning_effort` |

  Both are derived from `tier` and `access` in `agents.config.json`.

### Catalog extraction (per service, TypeScript compiler API; no documentation is read)

- Routes: HTTP decorators, `@Roles`, `@Public`, `@Throttle`, the `ApiOperation` summary, and the source line.
- Dependencies: `@modules/*` imports.
  - **Runtime:** the import appears in `*.module.ts`, or the imported symbol is a `*Service` or `*Module`.
  - **Type:** anything else.
  - `src/common` is recorded as a consumer.
- **Methods called on other services:** constructor-injected parameters, then `this.<param>.<method>(` calls. For example, grades calls `AccessPolicyService.resolveSubjectAccess()`.
- Public API: the `index.ts` exports.
- Prisma models read and written, mapped to their schema files.
- Throw inventory: the exception types and `ERROR_*` constants used.
- Tests: spec files, case counts, and whether they're stubs only.
- **Source hash:** sha256 of the module's non-spec source plus the schema files it touches.

### Knowledge freshness

- Each `.agents/services/<svc>.notes.md` is written from code only. Its header comment carries `source-hash: <hash>`, written by `pnpm agents:stamp <svc|all>`.
- When a module's code or schema changes, the hash no longer matches:
  - the build warns,
  - the generated agent (both Claude and Codex) gets a "Module knowledge may be stale: verify against code" banner,
  - `SERVICES.md` lists the module as `stale`.
- `agents.config.json` → `staleNotes: "fail"` makes `pnpm agents:check` block CI until the notes are re-verified and re-stamped.

## 3. Agent roster

| Agent | Tier / access | Role |
|---|---|---|
| `service-creator` | deep / write | Builds new modules and endpoints end to end to the Definition of Done |
| `tester` | deep / write (tests only) | Adversarial readiness testing: the authorization/IDOR matrix and the 11-category unthinkable checklist; returns a READY/NOT READY report |
| `release-checker` | deep / analyze | Gates A–H; returns GO / GO-WITH-RISKS / NO-GO; never deploys |
| `svc-<module>` ×18 | standard / write | Module owner with generated facts, routes and links, plus stamped knowledge derived from code. The services are academic-years, accounts, announcements, attendance, auth, dashboard, exams, fees, grades, homework, platform (prisma + health), request-access, school, sections, students, subjects, teachers and users |
| `code-reviewer` | deep / read-only | Reviews diffs against the standards |
| `security-auditor` | deep / read-only | Auth, RBAC, IDOR, personal data of minors (DPDP), supply chain |
| `migration-guardian` | deep / analyze | Prisma migration safety, expand/contract, rollback |
| `api-contract-guardian` | standard / read-only | Breaking-change detection for web and mobile clients |
| `docs-keeper` | standard / write | Keeps the notes, catalog and docs accurate |
| `perf-analyst` | deep / analyze | N+1 queries, indexes, EXPLAIN, k6 |
| `incident-triage` | deep / write | Reproduce, root-cause, blast radius, fix |
| `dependency-upgrader` | deep / write | Batched, changelog-driven upgrades |

**Access profiles:**
- `write`: all tools.
- `analyze`: Claude has no Edit or Write tools. The Codex sandbox is `workspace-write`, so it can still build and test into `dist/` and `coverage/`.
- `read-only`: the Codex sandbox is `read-only`.

**Skills:** `feature-pipeline` (orchestration), `scaffold-module`, `write-tests`, `impact-analysis`, `prisma-migration`, `release-gate`.

## 4. Orchestration

In both products, subagents can't spawn subagents, so the **main thread** orchestrates through the `feature-pipeline` skill:

1. The `svc-*` agents give context (in parallel).
2. `service-creator` builds.
3. `code-reviewer`, `security-auditor`, `migration-guardian` and `api-contract-guardian` check (in parallel, read-only).
4. The fix loop repeats up to 3 times.
5. `tester` runs.
6. Downstream `svc-*` agents confirm compatibility.
7. The knowledge files are refreshed.
8. `release-checker` gives a verdict.

Agents that write run one at a time.

## 5. Deferred and future work

- **Platform release gates:** add `.agents/standards/platforms/<platform>.md` once the platform is chosen. The release checker already looks for it.
- **CI:** add a GitHub Actions workflow that runs `lint`, `build`, `test` and `agents:check`. The release checker proposes one on its first run.
- **Model names:** set centrally in `agents.config.json`. Change them there if your account lacks access.
