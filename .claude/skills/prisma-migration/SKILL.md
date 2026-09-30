---
name: prisma-migration
description: Safe procedure for Prisma schema changes and migrations in my-school-BE. Covers the multi-file schema, naming, the destructive-change table, the expand/contract pattern, backfills, and rollback. Use whenever editing prisma/schema/*.prisma or reviewing migrations.
---

# Prisma migrations

- Schema: `prisma/schema/*.prisma`, one file per domain, with `base.prisma` holding the generator and datasource.
- Migrations: `prisma/schema/migrations/<timestamp>_<snake_name>/migration.sql`.
- Config: `prisma.config.ts`. It **throws if `DATABASE_URL` is unset**, so use a dummy URL for `generate` and `validate`.

## Commands

| Goal | Command | Where |
|---|---|---|
| Validate schema | `DATABASE_URL=postgresql://u:p@localhost:5432/x pnpm prisma validate` | anywhere |
| Generate client | `DATABASE_URL=... pnpm prisma:generate` | anywhere |
| Create and apply a migration | `pnpm prisma:migrate:dev --name <snake_case>` | **local database only** (`pnpm db:start`) |
| Create without applying (for review or editing SQL) | `pnpm prisma migrate dev --create-only --name <x>` | local |
| Drift check (Prisma 7 has no `--shadow-database-url` flag) | Apply the migrations to a **throwaway** local database, then diff. For example: `createdb drift_check`, then `DATABASE_URL=<drift_check url> pnpm prisma migrate deploy`, then `DATABASE_URL=<drift_check url> pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code` (exit code 0 means in sync, 2 means drift) | local |
| Apply in release | `pnpm prisma:migrate:deploy` | release step only (humans or CI) |

**Never** run the following against a shared or production database: `migrate dev`, `migrate reset`, `db push`, `prisma/seed.ts`, or `prisma/reset-keep-admin.ts`.

## Rules

1. Never edit or delete a migration that has already been applied. Fix forward with a new migration.
2. The migration name describes the intent: `add_leave_requests`, `add_index_attendance_date`.
3. Money uses `Decimal @db.Decimal(12, 2)`. Date-only fields use `@db.Date`. Every model gets `id`, `createdAt` and `updatedAt`.
4. Every foreign key and filter column gets `@@index`, and every business uniqueness rule gets `@@unique`.
5. Review the generated SQL before committing. Prisma sometimes turns a rename into DROP + ADD, which loses data.

## Destructive changes: use expand/contract

| Change | Risk | Safe pattern |
|---|---|---|
| Drop column/table | data loss; N-1 app still reads it | Release 1: stop reading and writing it. Release 2: drop it |
| Rename column/table | Prisma emits drop+add | Use `--create-only`, then hand-edit to `ALTER ... RENAME`. Better: add the new column, dual-write, backfill, switch reads, drop the old one |
| Add NOT NULL column | fails on existing rows | Add it as nullable or with a default, backfill, then SET NOT NULL |
| Change type (e.g. Float → Decimal) | rewrite + lock; precision | Add the new column, backfill with `ROUND(x::numeric, 2)`, switch, drop the old one |
| Remove enum value | fails if rows use it | Migrate the rows first, then remove the value |
| Add UNIQUE | fails on duplicates | Query for duplicates first and resolve them, then add the constraint |
| Index on a large table | write lock | Hand-edit to `CREATE INDEX CONCURRENTLY` in its own migration (no transaction) |

## Backfills

A backfill is a separate idempotent script (`prisma/scripts/<date>_<name>.ts`). It:
- processes rows in batches (500–1000),
- can resume after a failure,
- logs counts,
- is reviewed by `migration-guardian`,
- and is run by a human.

## Rollback

Every migration PR states one of:
- **Reversible**: include the down SQL in the PR description.
- **Forward-fix only**: explain why and give the fix plan.

It also states whether the previous app version works with the new schema.
