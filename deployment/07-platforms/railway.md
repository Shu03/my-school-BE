# Railway (Backend + optional Frontend)

> **Model:** Git-connected container PaaS with a slick UI. **Cost:** Usage-based from a
> monthly trial/credit; not permanently free, but cheap and does **not** sleep.

## Prerequisites

- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- Repo pushed to GitHub. Optionally the Railway CLI: `npm i -g @railway/cli`.

## Deploy the API

1. Railway → **New Project → Deploy from GitHub repo** → `my-school-BE`.
2. Railway auto-detects the Dockerfile.
3. Add **Variables** (Settings → Variables):
    ```
    NODE_ENV=production
    DATABASE_URL=postgresql://...neon...?sslmode=require
    JWT_ACCESS_SECRET=...
    JWT_REFRESH_SECRET=...
    CORS_ORIGIN=https://<fe-domain>
    ```
4. Networking → **Generate Domain** → note `https://<app>.up.railway.app`.

## Database options

- Use **Neon** (recommended) via `DATABASE_URL`, or
- Add a **Railway Postgres** plugin (New → Database → PostgreSQL). It injects
  `DATABASE_URL` automatically. Note: billed against your credit, not free forever.

## Migrations

Set a **pre-deploy / custom start** command. Two ways:

- Start command: `pnpm prisma migrate deploy && node dist/main`, or
- Keep the Dockerfile `CMD` (already does this for single instance).

For a dedicated release step, add a `railway.json`:

```json
{
    "$schema": "https://railway.app/railway.schema.json",
    "deploy": {
        "startCommand": "pnpm prisma migrate deploy && node dist/main",
        "healthcheckPath": "/api/v1/health",
        "restartPolicyType": "ON_FAILURE"
    }
}
```

## Frontend on Railway (optional)

You can deploy the FE as a static service (serve `dist` with a static server), but
Vercel/Cloudflare Pages are simpler and free for SPAs. Prefer those for the FE.

## Health & logs

- Health check path: `/api/v1/health` (set in `railway.json` or UI).
- Logs: project → service → **Deployments → Logs**.

## Pros / Cons

| Pros                                      | Cons                                     |
| ----------------------------------------- | ---------------------------------------- |
| No sleep; fast deploys                    | Not permanently free                     |
| Great DX, one-click Postgres/Redis        | Usage-based cost can surprise            |
| Dockerfile + healthcheck + `railway.json` | Fewer compliance certs than hyperscalers |

## Cost

- Trial credit covers a small demo initially.
- Beyond that: usage-based (CPU/memory/egress). Budget a few $/mo for a small API.
