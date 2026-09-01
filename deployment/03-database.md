# 03 · Database — Providers & Setup

The app uses **PostgreSQL 16** with Prisma 7 (`@prisma/adapter-pg` + `pg` driver).
This chapter goes from the simplest local setup to production-grade managed Postgres.

---

## Level 0 — Local (development only)

`docker-compose.yml` already defines a local Postgres:

```bash
pnpm db:start      # docker compose up -d
pnpm db:logs       # tail logs
pnpm db:stop       # docker compose down
pnpm db:reset      # wipe volume + restart
```

Connection string:

```
postgresql://postgres:postgres@localhost:5432/school_db?schema=public
```

> **Warning:** This is **not** for production. No backups, no TLS, no HA, and the
> credentials are public. Use a managed provider for anything deployed.

---

## Level 1 — Managed free tier (recommended for demo)

### Neon (recommended) — serverless Postgres

> **Cost:** Free tier: 0.5 GB storage, autosuspend, 1 project. Enough for a demo.

**Why Neon:** true free tier that doesn't expire, serverless (scales to zero), instant
provisioning, database branching, and a built-in connection pooler (important for
serverless/edge BE hosts).

Setup:

1. Create an account at neon.tech and a new project (pick a region near your BE host).
2. Copy the connection string. Neon gives you two:
    - **Pooled** (`...-pooler.neon.tech`) — use for the app runtime.
    - **Direct** (`...neon.tech`) — use for migrations.
3. Set `DATABASE_URL` to the **pooled** string with `?sslmode=require`.

```bash
# Runtime (pooled)
DATABASE_URL="postgresql://user:pass@ep-xyz-pooler.neon.tech/school_db?sslmode=require"
```

> **Note (Prisma + pooling):** With PgBouncer-style poolers, migrations must use a
> **direct** connection. Prisma supports a separate `directUrl`. If you adopt this,
> add `directUrl` to the datasource block and set a `DIRECT_URL` env var to the direct
> Neon string. For a small demo you can also just run migrations against the pooled URL
> with `?pgbouncer=true` — but `directUrl` is the clean approach.

### Supabase (alternative) — Postgres + extras

> **Cost:** Free tier: 500 MB DB, pauses after ~1 week of inactivity.

Good if you also want auth/storage/dashboards later. Use the **connection pooler**
string (port `6543`, transaction mode) for the app and the direct string (port `5432`)
for migrations.

### Provider-bundled databases

- **Render Postgres** — free instance **expires after 30 days**, then deletes. Fine for
  short demos only.
- **Railway Postgres** — billed from trial credit; not permanently free.

---

## Level 2 — Production managed (paid, robust)

| Provider        | Service                                       | When                             |
| --------------- | --------------------------------------------- | -------------------------------- |
| AWS             | RDS for PostgreSQL / Aurora Serverless v2     | Already on AWS                   |
| Google Cloud    | Cloud SQL for PostgreSQL                      | Already on GCP / using Cloud Run |
| Azure           | Azure Database for PostgreSQL Flexible Server | Already on Azure                 |
| Neon / Supabase | Paid tiers                                    | Serverless, branching, low ops   |
| DigitalOcean    | Managed Databases                             | Simple, predictable pricing      |

These add automated backups, point-in-time recovery, read replicas, HA failover, and
private networking.

---

## Connection pooling (why it matters)

Each NestJS instance opens a pool of DB connections (`pg`). Postgres has a hard
`max_connections` limit (often ~100 on small tiers). Problems appear when:

- You run **multiple BE instances** (each opens a pool), or
- You use a **serverless BE** (Cloud Run, Lambda) that spawns many short-lived instances.

Mitigations:

| Situation                  | Solution                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Serverless BE + Postgres   | Use a pooler (Neon pooler, Supabase pooler, PgBouncer, RDS Proxy)     |
| Few always-on instances    | Tune Prisma `connection_limit` in the URL, e.g. `?connection_limit=5` |
| Migrations behind a pooler | Use a **direct** connection (`directUrl` / `DIRECT_URL`)              |

Example tuned URL:

```
postgresql://user:pass@host:5432/db?schema=public&sslmode=require&connection_limit=5&pool_timeout=20
```

---

## TLS / SSL

Managed providers require encrypted connections. Append `sslmode=require` to
`DATABASE_URL`. Some providers (certain RDS configs) need the CA bundle; with the `pg`
adapter you can usually rely on `sslmode=require` without pinning the CA for a demo.

---

## Backups

| Provider                | Default backups                                        |
| ----------------------- | ------------------------------------------------------ |
| Neon                    | Point-in-time within retention window (tier-dependent) |
| Supabase                | Daily (paid: PITR)                                     |
| RDS / Cloud SQL / Azure | Automated daily + PITR (configurable)                  |
| Self-hosted VPS         | **You must set this up** — see below                   |

Self-hosted backup (cron):

```bash
pg_dump "$DATABASE_URL" | gzip > "backup-$(date +%F).sql.gz"
# restore:
gunzip -c backup-2026-09-01.sql.gz | psql "$DATABASE_URL"
```

Continue to [Chapter 04 · Migrations & Seeding](04-migrations-seeding.md).
