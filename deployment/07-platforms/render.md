# Render (Backend + optional Frontend)

> **Model:** Git-connected PaaS. Builds from a Dockerfile or buildpack, runs a
> long-lived web service. **Cost:** Free web service (sleeps after ~15 min idle); paid
> tiers stay warm from ~$7/mo.

## Prerequisites
- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- A managed Postgres (Neon) — do **not** rely on Render's free DB (expires in 30 days).
- Repo pushed to GitHub.

## Deploy the API (dashboard)
1. Render → **New → Web Service** → connect `my-school-BE`.
2. **Runtime:** Docker.
3. **Health Check Path:** `/api/v1/health`.
4. **Instance Type:** Free (or Starter to avoid sleep).
5. Add env vars (see [Chapter 02](../02-environment-variables.md)):
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://...neon...?sslmode=require
   JWT_ACCESS_SECRET=...
   JWT_REFRESH_SECRET=...
   CORS_ORIGIN=https://<fe-domain>
   ```
6. Create → wait for build → note `https://<service>.onrender.com`.

## Deploy the API (Blueprint / `render.yaml`)
Commit this to the BE repo root for reproducible infra:

```yaml
services:
  - type: web
    name: my-school-be
    runtime: docker
    plan: free
    healthCheckPath: /api/v1/health
    # Run migrations before new instances receive traffic
    preDeployCommand: pnpm prisma migrate deploy
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false      # set as a secret in the dashboard
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: CORS_ORIGIN
        sync: false
```

> **Note:** With `preDeployCommand` running migrations, change the Dockerfile `CMD` to
> just `node dist/main` so migrations don't also run on every container boot.

## Migrations
- Preferred: `preDeployCommand: pnpm prisma migrate deploy` (above).
- Or leave the Dockerfile's `migrate deploy && node dist/main` for single-instance.
- Seed once manually from your machine against the Neon URL.

## Frontend on Render (optional)
Render can also host the SPA as a **Static Site**:
- Build command: `pnpm install && pnpm build`
- Publish directory: `dist`
- Add a rewrite rule: source `/*` → destination `/index.html` (Action: Rewrite) for
  client-side routing.

## Health & logs
- Health probe: `/api/v1/health` (configured above).
- Logs: dashboard → service → **Logs** (live tail).

## Pros / Cons
| Pros | Cons |
| ---- | ---- |
| Dead-simple Git deploys | Free service sleeps (cold starts) |
| Native Dockerfile + health checks | Free Postgres expires in 30 days |
| `render.yaml` infra-as-code | Fewer regions than hyperscalers |
| Free static site hosting for FE | Build minutes limited on free |

## Cost
- Free: web service (sleeps) + static site. **$0.**
- Starter web service (always-on): ~$7/mo.
