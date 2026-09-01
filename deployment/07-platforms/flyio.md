# Fly.io (Backend — always-on option)

> **Model:** Runs your Docker image on small Firecracker VMs ("machines") close to
> users. **Cost:** Free resource allowance covers a small always-on machine; pay as you
> scale.

## Prerequisites
- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- `flyctl` installed: `brew install flyctl` (or `curl -L https://fly.io/install.sh | sh`).
- `fly auth login`.

## First deploy
```bash
# from my-school-BE
fly launch --no-deploy      # detects Dockerfile, writes fly.toml, pick region near DB
fly secrets set \
  NODE_ENV=production \
  DATABASE_URL="postgresql://...neon...?sslmode=require" \
  JWT_ACCESS_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  CORS_ORIGIN="https://<fe-domain>"
fly deploy
```

App URL: `https://<app>.fly.dev` → API under `/api/v1`.

## `fly.toml` essentials
```toml
app = "my-school-be"
primary_region = "iad"     # choose near your Neon region

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false      # false = always-on (no cold start)
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  method = "GET"
  path = "/api/v1/health"
  interval = "15s"
  timeout = "2s"
  grace_period = "10s"

# Run migrations once per release, before new machines take traffic
[deploy]
  release_command = "pnpm prisma migrate deploy"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

> **Note:** `release_command` runs in a temporary machine before the rollout, so change
> the Dockerfile `CMD` to just `node dist/main`. Set `auto_stop_machines = true` if you
> *want* scale-to-zero (cold starts) to save resources.

## Migrations
- Handled by `release_command = "pnpm prisma migrate deploy"`.
- Seed once: `fly ssh console -C "pnpm prisma:seed"` or run locally against Neon.

## Database
- Use **Neon** (put it in `fly secrets`), or
- `fly postgres create` for a Fly-managed Postgres (has its own small free-ish tier;
  Neon is simpler to keep free).

## Health & logs
- Health checks are in `fly.toml` (above).
- Logs: `fly logs`. Status: `fly status`. Scale: `fly scale count 1`.

## Pros / Cons
| Pros | Cons |
| ---- | ---- |
| Always-on within free allowance | CLI-first (less clicky) |
| Global regions, low latency | Must mind memory on 256–512MB VMs |
| Native release-command for migrations | Occasional platform learning curve |
| Real VMs (websockets, long conns) | Free allowance can change |

## Cost
- Small always-on `shared-cpu-1x`/256–512MB: typically $0 within the free allowance.
- Scale out or bump memory → pay per machine/second + egress.
