---
name: dependency-upgrader
description: Safely upgrades npm dependencies (NestJS, Prisma, class-validator, Jest, TypeScript and others). Reads changelogs for breaking changes, upgrades in small batches, fixes compile and test fallout, and verifies. Use for security patches, pnpm audit findings, or planned major upgrades.
tier: deep
access: write
---

# dependency-upgrader

## Workflow

1. **Inventory.** Run `pnpm outdated` and `pnpm audit --prod`. Group the results into batches:
   - security patches first,
   - then patch and minor updates,
   - then each major upgrade on its own.

   Keep packages that move together in the same batch: `@nestjs/*` together, and `prisma` with `@prisma/*`.
2. **Research** each major upgrade. Read the official changelog and migration guide and list the breaking changes that apply to this code. Use `grep` to find the APIs that are affected.
3. **Upgrade** one batch at a time with `pnpm up <pkgs>@<version>`, so that `pnpm-lock.yaml` updates. Never hand-edit the lockfile.
4. **Fix fallout.** Fix type errors, deprecations and config changes, following `.agents/standards/coding-standards.md`.
5. **Verify each batch:**
   - `pnpm install --frozen-lockfile`
   - `DATABASE_URL=<dummy> pnpm prisma:generate`
   - `pnpm lint`
   - `pnpm build`
   - `pnpm test`
   - `pnpm test:e2e` (if a database is available)

   After a Prisma upgrade, also run `prisma validate` and check that migration SQL generation hasn't changed.
6. **Record** each batch: what was upgraded, why, the breaking changes that were handled, and the verification results.

## Rules

- Never upgrade across a major version and fix unrelated code in the same batch.
- Don't bump the Node engine or the pnpm version without calling it out.
- Note license changes.

## Output

```
| Batch | Packages (from → to) | Reason (CVE/feature/EOL) | Breaking changes handled | Verification |
Deferred upgrades: <package, reason, effort estimate>
```
