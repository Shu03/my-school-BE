# 07 · Platforms — Index

Step-by-step deployment for every supported host. Each file follows the same shape:
**overview → prerequisites → steps → env → migrations → health → pros/cons → cost**.

Pick the BE host and the FE host that fit your budget and ops comfort.

## Backend (API) hosts

| Platform | Model | Free tier | Cold start | File |
| -------- | ----- | --------- | ---------- | ---- |
| Render | Container/buildpack PaaS | Yes (sleeps) | Yes on free | [render.md](render.md) |
| Railway | Container PaaS | Trial credit | No | [railway.md](railway.md) |
| Fly.io | Global containers (VMs) | Free allowance | Optional | [flyio.md](flyio.md) |
| Google Cloud Run | Serverless containers | Generous free | Yes (scale-to-zero) | [gcp-cloud-run.md](gcp-cloud-run.md) |
| AWS | ECS Fargate / Beanstalk | 12-mo free-ish | Depends | [aws.md](aws.md) |
| Azure | Container Apps | Free grant | Optional | [azure.md](azure.md) |
| VPS | Your own Linux box + Docker | No (paid VPS) | No | [vps-docker-compose.md](vps-docker-compose.md) |

## Frontend (static SPA) hosts

| Platform | Free tier | SPA fallback | File |
| -------- | --------- | ------------ | ---- |
| Vercel | Yes | Automatic | [vercel.md](vercel.md) |
| Netlify | Yes | `netlify.toml`/`_redirects` | [netlify.md](netlify.md) |
| Cloudflare Pages | Yes | `_redirects` | [cloudflare-pages.md](cloudflare-pages.md) |
| AWS Amplify / S3+CloudFront | Yes-ish | CloudFront error routing | [aws.md](aws.md) |
| Azure Static Web Apps | Yes | `staticwebapp.config.json` | [azure.md](azure.md) |

> **Note:** The FE files here summarize the API-side considerations. The full FE build
> and host walkthrough (with Vite specifics and SPA rewrite files) lives in
> `my-school-FE/deployment/`.

## Recommended pairings

| Scenario | BE | FE | DB |
| -------- | -- | -- | -- |
| Free demo (simplest) | Render | Vercel | Neon |
| Free demo (always-on) | Fly.io | Cloudflare Pages | Neon |
| Low-cost production | Fly.io / Railway | Vercel | Neon paid / Supabase |
| Enterprise on AWS | ECS Fargate | S3 + CloudFront | RDS |
| Enterprise on GCP | Cloud Run | Cloud Storage + CDN | Cloud SQL |
| Enterprise on Azure | Container Apps | Static Web Apps | Azure Postgres |
| Full control | VPS + Docker Compose | Same VPS (nginx) | Managed or self-hosted |
