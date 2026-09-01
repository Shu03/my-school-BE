# 04 · Migrations & Seeding

Prisma migrations are the single source of truth for the database schema. This chapter
covers the dev loop, the deploy/release flow, seeding, rollbacks, and drift.

Schema lives in `prisma/schema/` (split across `*.prisma` files). Existing migrations
are in `prisma/schema/migrations/`. Config is `prisma.config.ts`.

---

## The two commands you must not confuse

| Command                 | Use where              | What it does                                                                                 |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `prisma migrate dev`    | **local dev only**     | Creates a new migration from schema changes, applies it, regenerates client. May reset data. |
| `prisma migrate deploy` | **CI/CD & production** | Applies existing, committed migrations. Never generates new ones, never resets. Idempotent.  |

> **Warning:** Never run `migrate dev` against production — it can prompt, create
> migrations, and in some flows reset the database. Production uses **`migrate deploy`**.

Repo script aliases (from `package.json`):

```bash
pnpm prisma:migrate:dev      # prisma migrate dev      (local)
pnpm prisma:migrate:deploy   # prisma migrate deploy   (release)
pnpm prisma:migrate:reset    # prisma migrate reset    (DANGER: wipes data)
pnpm prisma:generate         # prisma generate         (build step)
pnpm prisma:seed             # prisma db seed          (seed)
```

---

## Local development loop

```bash
# 1. Edit prisma/schema/*.prisma
# 2. Create + apply a migration
pnpm prisma:migrate:dev --name add_something
# 3. Regenerate client (migrate dev does this automatically)
# 4. Commit the new folder under prisma/schema/migrations/
```

Always commit the generated migration directory. It is what production replays.

---

## Release flow (production)

The order on every deploy:

```
1. prisma generate      (build time — bakes the client)
2. prisma migrate deploy (release time — applies pending migrations)
3. node dist/main        (start the app)
```

You have **two placement options**:

### Option 1 — Migrate on container start (simplest)

The Dockerfile in [Chapter 01](01-prerequisites.md) runs:

```dockerfile
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
```

> **Warning:** With **multiple instances**, every instance runs `migrate deploy` on
> boot. Prisma takes an advisory lock so they don't collide, but it's cleaner to use a
> dedicated release step (Option 2) at scale. For a single-instance demo, Option 1 is
> perfectly fine.

### Option 2 — Dedicated release/pre-deploy step (recommended at scale)

Run migrations once, before new instances start, using the platform's release hook:

| Platform     | Release hook                                     |
| ------------ | ------------------------------------------------ |
| Render       | `preDeployCommand` in `render.yaml`              |
| Railway      | Deploy "pre-deploy command"                      |
| Fly.io       | `[deploy] release_command` in `fly.toml`         |
| Heroku-style | `release:` process in `Procfile`                 |
| Cloud Run    | A separate Cloud Run **Job** run in the pipeline |
| ECS          | A one-off task run before service update         |
| Kubernetes   | An `initContainer` or a `Job`                    |

Command in all cases:

```bash
pnpm prisma migrate deploy
```

Then the container start command is just `node dist/main`.

---

## Seeding

The seed script is `prisma/seed.ts` (wired via `prisma.config.ts`). Run it **once**
after the first successful migration, typically manually:

```bash
DATABASE_URL="postgresql://...prod..." pnpm prisma:seed
```

> **Warning:** Do **not** put seeding in the container start command — it would re-run
> on every deploy/restart. Seed once, or make the seed idempotent (upserts) if you must
> automate it. Check `prisma/seed.ts` and `prisma/reset-keep-admin.ts` for the intended
> data (there is an admin-preserving reset helper).

Idempotent seed pattern (if you adapt the seed):

```ts
await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
        /* ... */
    },
});
```

---

## Rollbacks

Prisma has **no automatic down-migration**. Strategies:

1. **Forward fix (preferred):** write a new migration that reverts the change and deploy
   it. Safest and auditable.
2. **Restore from backup:** for destructive mistakes, restore the DB from a snapshot
   (see [Chapter 03](03-database.md)) and redeploy the previous app version.
3. **Manual SQL:** apply a corrective SQL statement, then reconcile Prisma history.

> **Note:** Write migrations to be **expand → migrate → contract**: add new columns as
> nullable, backfill, switch reads/writes, then drop old columns in a later release.
> This keeps deploys zero-downtime and rollbacks easy.

---

## Drift & the shadow database

- **Drift** = the DB no longer matches the migration history (someone changed it
  manually). Detect with `pnpm prisma migrate status`.
- **Shadow DB** = a temporary database Prisma creates during `migrate dev` to detect
  drift. It is a **dev-only** concept; `migrate deploy` does **not** need it. On hosted
  Postgres where you can't create databases, only run `migrate dev` locally.

Check status against any environment:

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate status
```

---

## First-deploy checklist

- [ ] All migrations committed under `prisma/schema/migrations/`
- [ ] `DATABASE_URL` points at the managed DB (direct URL if behind a pooler)
- [ ] Release step runs `prisma migrate deploy`
- [ ] `prisma migrate status` shows "Database schema is up to date"
- [ ] Seed run once (if needed)

Continue to [Chapter 05 · Repo Strategy](05-repo-strategy.md).
