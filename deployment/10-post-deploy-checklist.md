# 10 · Post-Deploy Checklist

Run this after the first deploy of each environment. Replace `api.example.com` /
`app.example.com` with your real domains.

---

## 1. Backend is up
```bash
curl -i https://api.example.com/api/v1/health
# expect: 200 OK with a health payload
```
- [ ] `/api/v1/health` returns 200.
- [ ] Response is served over **HTTPS** with a valid cert.
- [ ] `NODE_ENV=production` (Swagger at `/api/docs` should be **404/disabled**).

## 2. Database connectivity & schema
- [ ] `pnpm prisma migrate status` against prod shows "up to date".
- [ ] App logs show a successful DB connection (no pool timeouts).
- [ ] Seed data present (if you seeded).

## 3. CORS works end-to-end
```bash
# Simulate the browser preflight from the FE origin
curl -i -X OPTIONS https://api.example.com/api/v1/auth/login \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST"
# expect: 204/200 with Access-Control-Allow-Origin: https://app.example.com
```
- [ ] `Access-Control-Allow-Origin` echoes the FE origin (not `*`, not missing).
- [ ] `CORS_ORIGIN` has **no trailing slash** and matches the FE URL exactly.

## 4. Frontend ↔ Backend
- [ ] FE loads over HTTPS.
- [ ] Login works from the deployed FE (network tab shows calls to `api.example.com`).
- [ ] Deep-linking / page refresh on a client route works (SPA fallback configured).
- [ ] `VITE_API_BASE_URL` points at the prod API and includes `/api/v1`.

## 5. Security
- [ ] `helmet` headers present (`curl -I` shows `X-Content-Type-Options`, etc.).
- [ ] Rate limiting active (`@nestjs/throttler`) — rapid requests get throttled.
- [ ] No secrets in logs, repo, or the FE bundle.
- [ ] JWT secrets are unique to production and strong.
- [ ] DB not publicly reachable except from the API (or via TLS + strong password).

## 6. Reliability
- [ ] Health check wired into the platform (auto-restart on failure).
- [ ] Migrations run via release step, not racing across instances.
- [ ] Backups enabled (managed provider) or scheduled (VPS).
- [ ] `enableShutdownHooks()` added for graceful shutdown (optional, recommended).

## 7. Domains & TLS
- [ ] Custom domains mapped (if used); TLS auto-renewing.
- [ ] `CORS_ORIGIN` and `VITE_API_BASE_URL` updated to custom domains.
- [ ] Redeployed both sides after any URL change.

## 8. Smoke test the core flows
- [ ] Register/login → receive tokens.
- [ ] An authenticated GET (e.g. list students) returns data.
- [ ] A create/update writes to the DB and persists after refresh.
- [ ] Refresh-token flow issues a new access token.

> **Tip:** Keep this list in your release notes and tick it every environment/promotion.

Continue to [Chapter 11 · Monitoring & Logging](11-monitoring-logging.md).
