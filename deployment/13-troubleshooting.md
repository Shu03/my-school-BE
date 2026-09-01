# 13 · Troubleshooting

Symptom → likely cause → fix. Grouped by where it hurts.

---

## CORS

**Symptom:** Browser console shows *"blocked by CORS policy"* / *"No
'Access-Control-Allow-Origin' header"*; API works from `curl` but not the FE.

| Cause | Fix |
| ----- | --- |
| Prod CORS still `origin: false` | Apply the [Chapter 01](01-prerequisites.md) CORS fix. |
| `CORS_ORIGIN` unset in prod | Set it to the exact FE URL. |
| Trailing slash mismatch | `https://app.example.com` (no `/`). |
| FE calling wrong host | Check `VITE_API_BASE_URL`; rebuild FE. |
| Multiple FE origins | Comma-separate them in `CORS_ORIGIN`. |

Verify:
```bash
curl -i -X OPTIONS https://api.example.com/api/v1/auth/login \
  -H "Origin: https://app.example.com" -H "Access-Control-Request-Method: POST"
```

---

## App won't start / crashes on boot

**Symptom:** Container exits immediately; logs show a thrown error before "Application
running".

| Cause | Fix |
| ----- | --- |
| Missing required env var | Zod validation throws — check `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. |
| Bad `DATABASE_URL` | Verify host/port/creds; add `?sslmode=require` for managed DB. |
| Wrong port | Read the host-injected `PORT`; don't hardcode. |
| Prisma client not generated | Ensure `prisma generate` ran in the build. |
| `prisma/` missing at runtime | Dockerfile must copy `prisma/` for `migrate deploy`. |

---

## Database connection issues

**Symptom:** `ECONNREFUSED`, `timeout`, `too many connections`, or `SSL required`.

| Cause | Fix |
| ----- | --- |
| No TLS | Append `?sslmode=require`. |
| Pool exhaustion (serverless/many instances) | Use a pooler (Neon pooler/PgBouncer/RDS Proxy); set `connection_limit`. |
| DB asleep (Neon/Supabase) | First query wakes it; expect a short delay. |
| Firewall/VPC | Allow the app's egress IP / put app+DB in same VPC (AWS/Azure). |
| Migrations behind pooler | Use the **direct** URL (`directUrl`/`DIRECT_URL`). |

---

## Migrations

**Symptom:** *"drift detected"*, *"migration failed"*, or schema out of date.

| Cause | Fix |
| ----- | --- |
| `migrate deploy` never ran | Add it to the release step (see [Chapter 04](04-migrations-seeding.md)). |
| Manual DB change (drift) | Reconcile with a new migration or restore; `prisma migrate status`. |
| Ran `migrate dev` on prod | Never do this; use `migrate deploy`. |
| Parallel instances racing | Prefer a single release step over per-instance boot migration. |
| Partial/failed migration | Fix forward with a corrective migration; restore from backup if destructive. |

Diagnose: `DATABASE_URL=... pnpm prisma migrate status`.

---

## Frontend issues

**Symptom:** Blank page, 404 on refresh, or calls going to `localhost`.

| Cause | Fix |
| ----- | --- |
| 404 on deep link / refresh | Add SPA fallback (`_redirects` / `netlify.toml` / `vercel.json` / proxy `try_files`). |
| API calls hit `localhost:3000` | `VITE_API_BASE_URL` wasn't set at build → set it and **redeploy**. |
| Stale API URL after change | Vite inlines env at build; redeploy the FE. |
| Mixed content blocked | Serve API over HTTPS (browsers block HTTP calls from HTTPS pages). |
| Assets 404 | Check build `base`/output dir = `dist`. |

---

## Cold starts / slow first request

**Symptom:** First request after idle takes 30–60s.

| Cause | Fix |
| ----- | --- |
| Free host sleeps (Render) | Keep-alive ping every ~10 min, or use Fly always-on. |
| Cloud Run/ACA scaled to zero | Set `--min-instances=1` / `--min-replicas 1`. |
| Neon autosuspend | Accept ~1–3s wake, or keep-alive. |

---

## Auth / JWT

**Symptom:** Users logged out unexpectedly, or `401` after a deploy.

| Cause | Fix |
| ----- | --- |
| JWT secret changed/rotated | All old tokens invalidated → users re-login (expected). |
| Different secret per instance | Ensure all instances share the **same** `JWT_*` secrets. |
| Clock skew | Rare; ensure host time is correct. |

---

## TLS / certificates

| Symptom | Fix |
| ------- | --- |
| Cert warning on custom domain | Wait for issuance; verify DNS (CNAME/A) is correct. |
| API over HTTP only | Enable HTTPS/`force_https`; browsers block mixed content. |

---

## General debugging workflow
1. **Read the logs** (see [Chapter 11](11-monitoring-logging.md)) — the thrown error is
   usually explicit.
2. **Hit the health check** — isolates app-up vs routing/CORS.
3. **Reproduce with `curl`** — separates backend faults from browser/CORS faults.
4. **Check `prisma migrate status`** — separates schema from app faults.
5. **Diff env vars** against [Chapter 02](02-environment-variables.md) — the most common
   root cause.

Back to [README](README.md).
