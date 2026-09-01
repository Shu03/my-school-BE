# 02 · Environment Variables Reference

All backend variables are validated at boot by Zod in
`src/config/env.validation.ts`. **If a required variable is missing or malformed, the
app throws on startup** — this is intentional (fail fast).

---

## Backend variables

| Variable                 |   Required    | Default       | Example                                                       | Notes                                                                           |
| ------------------------ | :-----------: | ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`               |      no       | `development` | `production`                                                  | Must be `production` in prod. Disables Swagger, tightens CORS.                  |
| `PORT`                   |      no       | `3000`        | `3000`                                                        | Some hosts inject their own `PORT` — read it, don't hardcode.                   |
| `DATABASE_URL`           |    **yes**    | —             | `postgresql://u:p@host:5432/db?schema=public&sslmode=require` | Postgres connection string. Add `sslmode=require` for managed DBs.              |
| `JWT_ACCESS_SECRET`      |    **yes**    | —             | 32+ random chars                                              | Signs short-lived access tokens.                                                |
| `JWT_REFRESH_SECRET`     |    **yes**    | —             | 32+ random chars (different from access)                      | Signs refresh tokens.                                                           |
| `JWT_ACCESS_EXPIRES_IN`  |      no       | `15m`         | `15m`                                                         | Access token lifetime.                                                          |
| `JWT_REFRESH_EXPIRES_IN` |      no       | `7d`          | `7d`                                                          | Refresh token lifetime.                                                         |
| `CORS_ORIGIN`            | prod: **yes** | —             | `https://app.example.com`                                     | **New var** (see [Chapter 01](01-prerequisites.md)). Comma-separated allowlist. |

> **Warning:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be **different**,
> long, and random. Never reuse the `.env.example` placeholder values.

### Generating secrets

```bash
# One 48-byte base64 secret (run twice for the two JWT secrets)
openssl rand -base64 48
# or with Node
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Frontend variables

The FE is built by Vite. **Vite inlines `VITE_*` variables at build time**, so the API
URL is baked into the bundle — changing it requires a rebuild, not just a restart.

| Variable            | Required | Example                          | Notes                                                 |
| ------------------- | :------: | -------------------------------- | ----------------------------------------------------- |
| `VITE_API_BASE_URL` | **yes**  | `https://api.example.com/api/v1` | Must include the `/api/v1` prefix. No trailing slash. |

> **Warning:** Because it is build-time, you set `VITE_API_BASE_URL` in the **FE host's
> build environment** (Vercel/Netlify/etc.), not at runtime. Full detail in
> `my-school-FE/deployment/`.

---

## Per-environment example values

### Local development

```bash
# BE .env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/school_db?schema=public"
JWT_ACCESS_SECRET=local-access-secret
JWT_REFRESH_SECRET=local-refresh-secret

# FE .env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### Production

```bash
# BE
NODE_ENV=production
PORT=3000                 # or the host-injected port
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/school_db?sslmode=require"
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://app.example.com

# FE (build-time)
VITE_API_BASE_URL=https://api.example.com/api/v1
```

---

## Where secrets live per platform

Never commit real secrets. Each platform has its own store — details in
[Chapter 09 · Secrets](09-secrets-config.md). Quick map:

| Platform  | Where you set env vars                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Render    | Dashboard → Service → Environment; or `render.yaml` (non-secret) + secret groups |
| Railway   | Dashboard → Variables; or `railway variables` CLI                                |
| Fly.io    | `fly secrets set KEY=value` (encrypted)                                          |
| Vercel    | Dashboard → Settings → Environment Variables                                     |
| Netlify   | Dashboard → Site settings → Environment variables                                |
| Cloud Run | `--set-env-vars` / Secret Manager                                                |
| AWS ECS   | Task definition env / SSM Parameter Store / Secrets Manager                      |
| Azure     | Container App secrets / App settings                                             |
| VPS       | `.env` file (chmod 600) or systemd `EnvironmentFile`                             |

Continue to [Chapter 03 · Database](03-database.md).
