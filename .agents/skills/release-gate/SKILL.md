---
name: release-gate
description: Exact commands and pass criteria for each production release gate (A–H) in release-standards.md, including the destructive-SQL scan, env/config parity, route-guard coverage from the catalog, secret scan and audit. Use when running a release readiness check.
---

# Release gate commands

Run from the repo root. Record the command, exit code and key output lines as evidence for every gate.

**Choosing BASE:**
- If there's a previous release, use the last release tag: `git describe --tags --abbrev=0`.
- If there are no tags (first release), use the root commit: `git rev-list --max-parents=0 HEAD | tail -1`. Treat the whole tree as new.
- Use `origin/main` only when checking a feature branch before merge.

**Portability:** macOS has no `timeout` command, so don't wrap commands in it. Don't create temp files.

## A. Build and code

```bash
pnpm install --frozen-lockfile --ignore-scripts   # A1; --ignore-scripts stops `prepare: husky` from changing git config
test -x node_modules/.bin/husky || echo "A1 MAJOR: prepare script 'husky' will fail (husky not in devDependencies)"
pnpm lint                                      # A2
pnpm format:check                              # A3
DATABASE_URL=postgresql://u:p@localhost:5432/x pnpm prisma:generate   # A4
pnpm build                                     # A5
pnpm test                                      # A6 (if 0 suites compile, mark G2 as FAIL and skip test:cov)
pnpm test:e2e                                  # A7 (needs a local database; otherwise UNVERIFIED)
pnpm agents:check                              # A8
git grep -nE "console\.log|debugger|\.only\(|TODO\(release\)" -- src test   # A9 (expect no output)
```

## B. Database

```bash
BASE=${BASE:-origin/main}
git diff --name-status $BASE -- prisma/schema/migrations        # B2: only 'A' (added) lines allowed
for f in $(git diff --name-only --diff-filter=A $BASE -- 'prisma/schema/migrations/*/migration.sql'); do
  echo "== $f"; grep -nEi "drop (table|column)|alter column .* type|rename|set not null|drop type|alter type .* (drop|rename)|create unique index|create index" "$f"
done                                                            # B3/B4: every hit needs a plan
DATABASE_URL=postgresql://u:p@localhost:5432/x pnpm prisma validate   # B1a
# B1b drift (Prisma 7 has no --shadow-database-url flag). Needs a THROWAWAY local database; otherwise mark it UNVERIFIED:
#   pnpm db:start && docker exec school_db createdb -U postgres drift_check
#   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/drift_check
#   pnpm prisma migrate deploy
#   pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code   # 0 = no drift, 2 = drift
#   docker exec school_db dropdb -U postgres drift_check
# B8 seed/reset scripts: must not contain hard-coded credentials and must refuse to run in production.
# Only findings are printed, never the matching lines.
perl -ne 'print "$ARGV:$.: hard-coded credential literal\n" if /hashPassword\(\s*["\x27`]/ || /password\s*[:=]\s*["\x27`][^"\x27`]{4,}/i; print "$ARGV:$.: logs a credential\n" if /console\.log.*passw/i; close ARGV if eof' prisma/seed.ts prisma/reset-keep-admin.ts
for f in prisma/seed.ts prisma/reset-keep-admin.ts; do grep -q "NODE_ENV" "$f" || echo "$f: no production guard"; done
```
If new migrations exist, hand them to `migration-guardian`.

## C. Config and secrets

```bash
# C1: keys in the zod schema vs .env.example
node -e '
const fs=require("fs");
const schema=fs.readFileSync("src/config/env.validation.ts","utf8");
const keys=[...schema.matchAll(/^\s+([A-Z][A-Z0-9_]+):/gm)].map(m=>m[1]);
const ex=fs.readFileSync(".env.example","utf8");
const missing=keys.filter(k=>!new RegExp("^"+k+"=","m").test(ex));
console.log({keys, missingInEnvExample: missing});'
# C4: secrets in the diff. The output is MASKED with perl (BSD sed has no \s); never print raw matches.
git diff $BASE -- . ':!pnpm-lock.yaml' \
  | grep -nEi "(secret|password|passwd|api[_-]?key|token)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{8,}|postgres(ql)?://[^:@]+:[^@]+@|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" \
  | perl -pe 's/((?:secret|password|passwd|api[_-]?key|token)\s*[:=]\s*["\x27`])[^"\x27`]+/$1****/gi; s#(postgres(?:ql)?://[^:@\s]+:)[^@\s]+@#$1****@#g'
git ls-files | grep -E "(^|/)\.env($|\.)" | grep -v ".env.example"   # expect nothing
# C6: config the docs mention but the code doesn't implement
grep -rhoE "\b[A-Z][A-Z0-9_]{3,}\b=" deployment/*.md | sort -u   # compare with the C1 keys
```
Target-environment values can't be seen from the repo. List the required keys for the operator to confirm, and mark them UNVERIFIED.

## D. Runtime hardening (static)

```bash
grep -n "helmet\|enableCors\|trust proxy\|enableShutdownHooks\|SwaggerModule\|json({\|limit:" src/main.ts
grep -n "ThrottlerModule" -A3 src/app.module.ts
grep -rn "@Throttle\|@SkipThrottle" src
```

## E. Security

```bash
pnpm audit --prod --audit-level=high         # E1 (baseline 2026-10-01: 37 high, 0 critical; report the delta)
# E2: every public route, every route that changes data without @Roles, and reads open to every role
node -e '
const c=require("./.agents/catalog/services.json");
for (const s of Object.values(c.services)) for (const r of s.routes) {
  if (r.public) console.log("PUBLIC      ", r.method, r.path, r.source);
  else if (r.method!=="GET" && r.roles.length===0) console.log("NO-ROLES    ", r.method, r.path, r.source);
  else if (r.roles.length===0) console.log("ANY-AUTH-READ", r.method, r.path, r.source);
}'
```
Confirm that each flagged route is intended. As of 2026-10-01 (commit `4fa4355`) the expected results are:
- PUBLIC: `POST /auth/login`, `/auth/refresh` and `/auth/change-password` (the last is guarded by `JwtChangePasswordGuard`), plus `GET /health`.
- NO-ROLES: `POST /auth/logout`.
- ANY-AUTH-READ: `/academic-years/current`, `/academic-years/:id/terms`, `/auth/me`, `/dashboard` (branches on role inside), `/school/holidays`, `/sections`, `/sections/:id`, `/subjects`, `/subjects/:id`.

Anything else is a finding. There are no permission flags to check; per-record access lives in the services (see the security-auditor checklist).

## F. API contract

Run the `api-contract-guardian` procedure against `$BASE`.

## G. Tests

Use the latest `tester` report for the changed modules. Coverage comes from `pnpm test:cov`, compared with testing-standards §6.

## H. Operations

Check that these exist: a rollback artifact (previous image or tag), smoke steps (release-standards §3), and monitoring (`deployment/11-monitoring-logging.md`). Platform-specific checks are deferred until the platform is chosen (`.agents/standards/platforms/`).
