# 11 · Monitoring & Logging

Start with what every platform gives you for free, then layer on uptime, error
tracking, and metrics as the app matters more.

---

## Level 0 — Platform logs (free, built-in)

| Platform  | Live logs                                       |
| --------- | ----------------------------------------------- |
| Render    | Dashboard → service → Logs                      |
| Railway   | Deployments → Logs                              |
| Fly.io    | `fly logs`                                      |
| Cloud Run | `gcloud run services logs read` / Cloud Logging |
| AWS ECS   | CloudWatch Logs                                 |
| Azure ACA | `az containerapp logs show` / Log Analytics     |
| VPS       | `docker compose logs -f api`                    |

The app uses NestJS's built-in `Logger` (see `src/main.ts`). Logs go to stdout, which
every platform captures. **Keep logging to stdout/stderr** — don't write log files in
containers.

---

## Level 1 — Uptime monitoring (free)

Ping the health endpoint from outside so you know before users do:

- **Endpoint:** `GET /api/v1/health`
- **Tools (free tiers):** UptimeRobot, Better Stack (Uptime), Cronitor, or a
  `cron-job.org` job.
- **Bonus:** on free hosts that sleep (Render), a 10-minute ping doubles as a
  keep-alive.

Set alerts to email/Slack on non-200 or high latency.

---

## Level 2 — Error tracking (free tiers)

Capture exceptions with stack traces and context.

- **Sentry** (free tier) — add `@sentry/node`, initialize early in `main.ts`, and
  optionally hook into the existing `GlobalExceptionFilter` to report 5xx.
- Alternatives: GlitchTip (open-source Sentry-compatible), Highlight, Rollbar.

Sketch (implement later):

```ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

Then report from the exception filter's catch path. Add `SENTRY_DSN` as a secret.

> **Note:** `SENTRY_DSN` is not currently a validated env var. If you adopt Sentry, add
> it to `src/config/env.validation.ts` as optional.

---

## Level 3 — Structured logs & metrics

- **Structured JSON logs:** swap the default logger for `nestjs-pino` to emit JSON with
  request IDs — far easier to search in log aggregators.
- **Log aggregation (free tiers):** Better Stack Logs, Grafana Loki, Axiom, Datadog
  (trial). Point the platform's log drain at the aggregator.
- **Metrics:** `@nestjs/terminus` already powers health; for Prometheus metrics add
  `@willsoto/nestjs-prometheus` and scrape `/metrics` (guard it or keep it internal).
- **DB monitoring:** Neon/Supabase/RDS dashboards show connections, slow queries, and
  storage — watch **connection count** against your tier limit.

---

## What to watch (demo → production)

| Signal               | Why                          | Where                  |
| -------------------- | ---------------------------- | ---------------------- |
| Health check status  | Is the API alive             | Uptime monitor         |
| 5xx rate             | Broken deploy / bug          | Error tracker / logs   |
| p95 latency          | Cold starts, slow queries    | Platform metrics / APM |
| DB connections       | Pool exhaustion risk         | DB dashboard           |
| DB storage           | Free-tier limits             | DB dashboard           |
| Memory usage         | OOM on small VMs (Fly 256MB) | Platform metrics       |
| Cold-start frequency | Demo UX                      | Logs / uptime latency  |

---

## Recommended minimal setup for a demo

1. Platform logs (free, already on).
2. UptimeRobot on `/api/v1/health` (free) + keep-alive on sleeping hosts.
3. Sentry free tier for backend errors.

That trio costs **$0** and catches the vast majority of "is it down / why did it break"
questions.

Continue to [Chapter 12 · Cost Comparison](12-cost-comparison.md).
