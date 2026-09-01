# 09 · Secrets & Configuration Management

The app fails fast if secrets are missing (Zod validation at boot). This chapter is
about storing them safely and rotating them.

---

## What is secret vs config

| Value | Type | Notes |
| ----- | ---- | ----- |
| `DATABASE_URL` | **secret** | Contains DB password. |
| `JWT_ACCESS_SECRET` | **secret** | Signing key. |
| `JWT_REFRESH_SECRET` | **secret** | Signing key. |
| `CORS_ORIGIN` | config | Not secret, but environment-specific. |
| `NODE_ENV`, `PORT` | config | Non-sensitive. |
| `JWT_*_EXPIRES_IN` | config | Non-sensitive. |
| `VITE_API_BASE_URL` (FE) | config | Public (ends up in the bundle). |

> **Warning:** `VITE_*` values are embedded in the shipped JS bundle and are visible to
> anyone. **Never put a secret in a `VITE_` variable.**

---

## Golden rules
1. **Never commit secrets.** `.env` is already git-ignored; keep it that way.
2. `.env.example` holds **placeholders only** (it already does).
3. Use **different** JWT secrets per environment (dev/staging/prod).
4. Rotate secrets on suspected exposure and on a schedule.
5. Grant least privilege to CI service accounts.

---

## Where secrets live, per platform

| Platform | Store | How to set |
| -------- | ----- | ---------- |
| Render | Env vars / Secret Files | Dashboard → Environment; `sync: false` in `render.yaml` |
| Railway | Variables | Dashboard → Variables; `railway variables set` |
| Fly.io | Encrypted secrets | `fly secrets set KEY=value` |
| Cloud Run | Secret Manager | `--set-secrets KEY=SECRET:latest` |
| AWS ECS | Secrets Manager / SSM | Task def `secrets:` referencing ARNs |
| Azure ACA | Container App secrets / Key Vault | `--secrets` + `secretref:` |
| Vercel/Netlify/CF Pages | Project env vars | Dashboard (Production/Preview scopes) |
| VPS | `.env` (chmod 600) or systemd `EnvironmentFile` | On the server only |

---

## Generating strong secrets
```bash
openssl rand -base64 48        # run per JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Rotating JWT secrets
1. Generate a new secret and set it in the platform's secret store.
2. Redeploy the BE.
3. **Impact:** existing access/refresh tokens signed with the old secret become
   invalid → users must log in again. Rotate during low traffic or with a maintenance
   note. (There is no dual-secret grace window in the current code.)

## Rotating the database password
1. Change the password in the DB provider.
2. Update `DATABASE_URL` secret on every consumer (BE + CI).
3. Redeploy. Run `pnpm prisma migrate status` to confirm connectivity.

---

## GitHub Actions secrets
- **Secrets** (`secrets.*`): tokens, keys, `DATABASE_URL` for CI DB. Encrypted, masked
  in logs.
- **Variables** (`vars.*`): non-sensitive config like `VITE_API_BASE_URL`.
- Scope with **Environments** (e.g. `production`) to add required reviewers before a
  deploy job can read production secrets.

---

## Local development
Keep a local `.env` (ignored). Copy from `.env.example`:
```bash
cp .env.example .env   # then fill in values
```
Never share a real `.env`; share the `.example` instead.

Continue to [Chapter 10 · Post-Deploy Checklist](10-post-deploy-checklist.md).
