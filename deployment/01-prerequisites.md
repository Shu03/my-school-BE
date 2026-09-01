# 01 · Prerequisites & Required Code Fixes

> **Warning:** The three fixes in Part A are **mandatory**. The current code cannot be
> deployed to production as-is. These are documented here for a later implementation
> pass; nothing in this chapter has been applied to the codebase yet.

---

## Part A — Required code fixes

### A1. Add a backend `Dockerfile`

The repo has a `.dockerignore` but **no `Dockerfile`**. Container platforms (Fly.io,
Cloud Run, ECS, Azure Container Apps, VPS) require one. Even buildpack platforms
(Render, Railway) work more predictably with an explicit Dockerfile.

Create `my-school-BE/Dockerfile`:

```dockerfile
# ---- Base ----
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- Dependencies (cached) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod

# ---- Runtime ----
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
# Prisma needs OpenSSL at runtime
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
# Run pending migrations, then boot the API
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]
```

> **Note:** `prisma generate` must run **before** `pnpm build`, and the `prisma/`
> folder must be present at runtime so `migrate deploy` can find the schema and
> migration history.

Confirm `.dockerignore` excludes build noise (it already contains `node_modules`,
`dist`, `.env`, `coverage`, `.husky`). Keep it — copying `node_modules` from the host
would break the Alpine build.

> **Alternative (migrations outside the container):** If you prefer to run migrations
> as a separate release step (recommended for multi-instance deploys), change the last
> line to `CMD ["node", "dist/main"]` and run `pnpm prisma migrate deploy` in the
> platform's release/pre-deploy hook. See [Chapter 04](04-migrations-seeding.md).

### A2. Fix CORS for production

`src/main.ts` currently does:

```ts
app.enableCors({
    origin: nodeEnv === "production" ? false : "*",
    ...
});
```

`origin: false` **rejects every browser origin in production**, so the deployed FE
cannot call the API. Replace it with an allowlist driven by an env var.

**Fix in `src/main.ts`:**

```ts
const corsOrigin = configService.get<string>("app.corsOrigin");

app.enableCors({
    origin:
        nodeEnv === "production"
            ? (corsOrigin?.split(",").map((o) => o.trim()) ?? [])
            : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
});
```

**Add to `src/config/env.validation.ts`:**

```ts
    // Comma-separated list of allowed browser origins in production
    CORS_ORIGIN: z.string().optional(),
```

**Expose it in config** — `src/config/app.config.ts` reads from the validated `env`
object (not `process.env` directly), so add:

```ts
export const appConfig = registerAs("app", () => ({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,   // add this line
}));
```

Then set `CORS_ORIGIN=https://app.example.com` in the production environment. Multiple
origins: `CORS_ORIGIN=https://app.example.com,https://staging.example.com`.

> **Warning:** Only set `credentials: true` if the FE actually sends cookies. This app
> uses **Bearer tokens** (Authorization header), so `credentials` is optional — but if
> you enable it you must **not** use `origin: "*"`.

### A3. Point `DATABASE_URL` at a managed Postgres

`docker-compose.yml` runs Postgres locally for development only. Production needs a
managed instance. The connection string format is validated by Zod
(`DATABASE_URL: z.string().min(1)`) and consumed by Prisma via `prisma.config.ts`.

See [Chapter 03 · Database](03-database.md) for provider setup. The value looks like:

```
postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public&sslmode=require
```

---

## Part B — Optional but recommended fixes

### B1. Health check endpoint (already present)

`GET /api/v1/health` exists (health module + `@nestjs/terminus`). Use it as the
platform health/liveness probe. No change needed — just wire the path into each host's
health-check config.

### B2. Graceful shutdown

For zero-downtime rolling deploys, enable shutdown hooks in `src/main.ts`:

```ts
app.enableShutdownHooks();
```

This lets NestJS close DB connections cleanly on `SIGTERM` (sent by every container
platform during a redeploy).

### B3. Trust proxy (already present)

`app.set("trust proxy", 1)` is already set, which is correct behind a load balancer or
reverse proxy. No change needed.

### B4. Rate limiting (already present)

`@nestjs/throttler` is installed. Verify limits are sensible for a public demo.

---

## Part C — Accounts & tooling checklist

| Requirement | Why | Free? |
| ----------- | --- | ----- |
| GitHub account + repos pushed | Source for every platform + CI/CD | Yes |
| A managed Postgres account (e.g. Neon) | Production DB | Yes (free tier) |
| A BE host account (Render/Fly/Railway/…) | Run the API | Yes (free tier) |
| A FE host account (Vercel/Netlify/Cloudflare) | Serve the SPA | Yes (free tier) |
| `pnpm` installed locally | Build/verify locally | Yes |
| Node.js 22 locally | Match runtime | Yes |
| Docker Desktop (optional) | Test the Dockerfile locally | Yes |
| A custom domain (optional) | Nice URLs + stable CORS | ~$10/yr |

**Local verification before deploying:**

```bash
# From my-school-BE
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
NODE_ENV=production PORT=3000 \
  DATABASE_URL="postgresql://..." \
  JWT_ACCESS_SECRET=dev JWT_REFRESH_SECRET=dev \
  node dist/main
# then: curl http://localhost:3000/api/v1/health
```

> **Time:** ~1–2 hours to apply all Part A fixes and verify locally the first time.

Continue to [Chapter 02 · Environment Variables](02-environment-variables.md).
