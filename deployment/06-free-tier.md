# 06 · Free-Tier Deployment (Recommended for Demo)

> **Goal:** get BE + FE + DB online for **$0** with the least friction. This is the
> recommended path for the demo. Two variants are given: **A1** (accepts cold starts)
> and **A2** (stays always-on within free limits).

> **Warning:** Do the [Chapter 01](01-prerequisites.md) fixes first (Dockerfile, CORS,
> managed DB). Nothing below works without them.

---

## The free-tier stack at a glance

```mermaid
flowchart LR
    FE[FE on Vercel / Cloudflare Pages<br/>free static] --> BE[BE on Render / Fly.io<br/>free container]
    BE --> DB[(Neon Postgres<br/>free serverless)]
```

| Layer     | Variant A1 (cold-start OK)                                  | Variant A2 (always-on)             |
| --------- | ----------------------------------------------------------- | ---------------------------------- |
| Database  | Neon free                                                   | Neon free                          |
| Backend   | **Render** free web service                                 | **Fly.io** free-allowance machine  |
| Frontend  | **Vercel** / Cloudflare Pages                               | Vercel / Cloudflare Pages          |
| Cost      | $0                                                          | $0 (within Fly limits)             |
| Trade-off | BE sleeps after ~15 min idle → first request slow (~30–60s) | Stays warm; small resource ceiling |

---

## Step 0 — Database (both variants)

Follow [Chapter 03](03-database.md) → create a Neon project. Keep the **pooled** and
**direct** connection strings handy.

```bash
DATABASE_URL="postgresql://user:pass@ep-xyz-pooler.neon.tech/school_db?sslmode=require"
```

Run migrations + seed once from your machine (pointing at Neon):

```bash
DATABASE_URL="postgresql://...neon..." pnpm prisma migrate deploy
DATABASE_URL="postgresql://...neon..." pnpm prisma:seed
```

---

## Variant A1 — Render (BE) + Vercel (FE)

> **Time:** ~30–45 min end to end. **Cost:** $0.

### 1. Deploy the backend on Render

1. Push `my-school-BE` to GitHub (already done).
2. Render → **New → Web Service** → connect the repo.
3. Settings:
    - **Runtime:** Docker (uses your `Dockerfile`).
    - **Health Check Path:** `/api/v1/health`.
    - **Instance Type:** Free.
4. Environment variables (see [Chapter 02](02-environment-variables.md)):
    ```
    NODE_ENV=production
    DATABASE_URL=postgresql://...neon...
    JWT_ACCESS_SECRET=...
    JWT_REFRESH_SECRET=...
    CORS_ORIGIN=https://<your-fe>.vercel.app
    ```
5. Deploy. Note the URL, e.g. `https://my-school-be.onrender.com`.
6. Verify: `curl https://my-school-be.onrender.com/api/v1/health`.

> **Note:** Render free web services **sleep after ~15 min idle**. The first request
> after sleep takes ~30–60s (container cold start + Neon wake). Acceptable for a demo.

Full detail: [07-platforms/render.md](07-platforms/render.md).

### 2. Deploy the frontend on Vercel

1. Push `my-school-FE` to GitHub.
2. Vercel → **Add New Project** → import the repo (framework auto-detected: Vite).
3. Environment variable:
    ```
    VITE_API_BASE_URL=https://my-school-be.onrender.com/api/v1
    ```
4. Deploy → note the URL, e.g. `https://my-school-fe.vercel.app`.
5. Go back to Render and set `CORS_ORIGIN` to that exact URL, then redeploy the BE.

Full detail: `my-school-FE/deployment/` and [07-platforms/vercel.md](07-platforms/vercel.md).

### 3. Connect the two

- `VITE_API_BASE_URL` (FE) → BE URL + `/api/v1`.
- `CORS_ORIGIN` (BE) → FE URL (no trailing slash).
- Redeploy whichever side you changed.

---

## Variant A2 — Fly.io (BE, always-on) + Cloudflare Pages (FE)

> **Time:** ~45–60 min. **Cost:** $0 within Fly's free resource allowance.

### 1. Backend on Fly.io

Fly runs your container on a small always-on machine (no idle sleep by default).

```bash
# from my-school-BE (Dockerfile present)
brew install flyctl        # or: curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --no-deploy     # generates fly.toml; pick a region near Neon
fly secrets set \
  NODE_ENV=production \
  DATABASE_URL="postgresql://...neon..." \
  JWT_ACCESS_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  CORS_ORIGIN="https://<your-fe>.pages.dev"
fly deploy
```

Add a health check + release migration step to `fly.toml`
(see [07-platforms/flyio.md](07-platforms/flyio.md)):

```toml
[http_service]
  internal_port = 3000
  force_https = true

[[http_service.checks]]
  method = "GET"
  path = "/api/v1/health"
  interval = "15s"
  timeout = "2s"

[deploy]
  release_command = "pnpm prisma migrate deploy"
```

> **Note:** To truly avoid cold starts, keep `min_machines_running = 1`. A single
> shared-cpu-1x/256MB machine fits the free allowance; watch memory.

### 2. Frontend on Cloudflare Pages

1. Cloudflare → **Workers & Pages → Create → Pages** → connect `my-school-FE`.
2. Build command: `pnpm build`; output dir: `dist`.
3. Env var: `VITE_API_BASE_URL=https://<your-app>.fly.dev/api/v1`.
4. Add an SPA fallback (see `my-school-FE/deployment/`): a `_redirects` file with
   `/* /index.html 200`.
5. Set the BE `CORS_ORIGIN` to the Pages URL and `fly deploy` again.

---

## Free-tier gotchas (read before demoing)

| Gotcha                            | Impact                         | Mitigation                                                        |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Render free sleeps                | First request slow after idle  | Use A2, or ping `/api/v1/health` every 10 min (e.g. cron-job.org) |
| Neon autosuspend                  | First query wakes DB (~1–3s)   | Acceptable; or keep-alive ping                                    |
| Render free DB expires in 30 days | Data loss                      | Use **Neon**, not Render's DB                                     |
| Supabase pauses after ~1 wk idle  | DB unavailable                 | Log in weekly, or use Neon                                        |
| Vite env is build-time            | Changing API URL needs rebuild | Redeploy FE after changing `VITE_API_BASE_URL`                    |
| CORS mismatch                     | FE calls fail                  | Exact origin, no trailing slash, redeploy BE                      |

> **Tip (keep-alive for A1):** a free scheduler hitting
> `GET /api/v1/health` every ~10 minutes keeps the Render service and Neon warm during
> demo hours.

---

## After it's up

Run the [Chapter 10 · Post-deploy checklist](10-post-deploy-checklist.md), then wire up
[Chapter 08 · CI/CD](08-cicd.md) so pushes deploy automatically.

Explore other hosts in [Chapter 07 · Platforms](07-platforms/).
