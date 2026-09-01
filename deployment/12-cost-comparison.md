# 12 · Cost Comparison & Recommendation

All prices are indicative (2026) for a **small demo / low-traffic** app and can change.
Always confirm on the provider's pricing page.

---

## Backend hosting

| Platform        | Free tier            | Always-on free?      | First paid step     | Best for            |
| --------------- | -------------------- | -------------------- | ------------------- | ------------------- |
| Render          | Web service (sleeps) | No (sleeps)          | ~$7/mo Starter      | Simplest Git deploy |
| Railway         | Trial credit         | No (credit burns)    | Usage (~few $/mo)   | Great DX, no sleep  |
| Fly.io          | Free allowance       | **Yes** (small VM)   | Per-machine seconds | Always-on free demo |
| Cloud Run       | Generous free        | Scale-to-zero        | Per request/CPU     | Bursty, pay-per-use |
| AWS ECS Fargate | Limited              | No                   | ~tens $/mo (+ALB)   | AWS orgs, scale     |
| Azure ACA       | Free grant           | Optional min-replica | Per vCPU-second     | Azure orgs          |
| VPS             | None                 | Yes (paid box)       | ~$4–6/mo            | Full control        |

## Frontend hosting

| Platform              | Free tier              | Cost after                     |
| --------------------- | ---------------------- | ------------------------------ |
| Vercel                | Hobby (generous)       | Pro ~$20/mo (teams/commercial) |
| Netlify               | Starter                | Paid on bandwidth/minutes      |
| Cloudflare Pages      | Very generous          | Rarely needed                  |
| S3 + CloudFront       | Pennies at low traffic | Pay-per-use                    |
| Azure Static Web Apps | Free tier              | Standard ~low $/mo             |

## Database

| Provider          | Free tier                      | Notes                      | First paid step        |
| ----------------- | ------------------------------ | -------------------------- | ---------------------- |
| **Neon**          | 0.5 GB, autosuspend, no expiry | Recommended free           | ~$19/mo Launch         |
| Supabase          | 500 MB, pauses if idle ~1wk    | Extras (auth/storage)      | ~$25/mo Pro            |
| Render PG         | Free **expires in 30 days**    | Avoid for anything lasting | ~$7/mo+                |
| RDS               | 12-mo micro (then paid)        | Robust, VPC                | ~tens $/mo             |
| Cloud SQL         | No lasting free                | Robust                     | `db-f1-micro` few $/mo |
| Azure PG Flexible | Limited                        | Burstable B1ms             | few $/mo               |

---

## Total cost by scenario

| Scenario                      | BE                    | FE               | DB               | Monthly |
| ----------------------------- | --------------------- | ---------------- | ---------------- | ------- |
| **Free demo (cold-start OK)** | Render free           | Vercel           | Neon free        | **$0**  |
| **Free demo (always-on)**     | Fly.io free allowance | Cloudflare Pages | Neon free        | **$0**  |
| Low-cost always-on            | Fly.io / Railway      | Vercel           | Neon free/Launch | ~$0–20  |
| Small production              | Render Starter        | Vercel           | Neon Launch      | ~$25–30 |
| AWS production                | ECS+ALB               | S3+CloudFront    | RDS micro        | ~$40–70 |
| GCP production                | Cloud Run min=1       | Firebase Hosting | Cloud SQL micro  | ~$15–35 |
| Azure production              | ACA min=1             | Static Web Apps  | PG B1ms          | ~$20–40 |
| VPS all-in-one                | one $6 box (BE+FE+DB) | ↔                | ↔                | **~$6** |

---

## Recommendation

### For the demo (primary ask): **$0**

- **DB:** Neon (free, no expiry, has pooling).
- **BE:** Fly.io (always-on, no cold starts) **or** Render (simplest, accepts sleep).
- **FE:** Vercel or Cloudflare Pages.

> Pick **Fly.io + Cloudflare Pages + Neon** if you want the demo to feel snappy at all
> times. Pick **Render + Vercel + Neon** if you want the least setup and can tolerate a
> slow first request after idle.

### When it graduates to real production

- Move to a paid always-on BE tier (Render Starter / Railway / Fly scaled) and a paid DB
  tier (Neon Launch) — roughly **$25–30/mo**.
- If your org standardizes on a hyperscaler, use the matching stack (AWS ECS+RDS,
  GCP Cloud Run+Cloud SQL, or Azure ACA+Postgres) for compliance and integration, at
  higher but predictable cost.

Continue to [Chapter 13 · Troubleshooting](13-troubleshooting.md).
