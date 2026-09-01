# Google Cloud Run (Backend) + Cloud SQL

> **Model:** Fully-managed serverless containers. Scales to zero (cold starts) or keep a
> warm min-instance. **Cost:** Generous always-free tier; pay per request/CPU beyond it.

## Prerequisites
- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- `gcloud` CLI installed + `gcloud auth login`, a project selected.
- Enable APIs: `gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com`.

## Database — Cloud SQL (or Neon)
Option A (Neon): simplest — just set `DATABASE_URL` as a secret.
Option B (Cloud SQL for PostgreSQL):
```bash
gcloud sql instances create school-db --database-version=POSTGRES_16 \
  --tier=db-f1-micro --region=us-central1
gcloud sql databases create school_db --instance=school-db
gcloud sql users set-password postgres --instance=school-db --password='...'
```
Connect Cloud Run to Cloud SQL via the built-in connector and use a Unix-socket URL, or
use the public IP + `sslmode=require`.

> **Warning:** Cloud Run scales to many instances; each opens a DB pool. Use a pooler
> (Neon pooler, PgBouncer, or Cloud SQL + a small `connection_limit`). See
> [Chapter 03](../03-database.md).

## Build & deploy
```bash
# Build image with Cloud Build and deploy
gcloud run deploy my-school-be \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production,CORS_ORIGIN=https://<fe-domain> \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,JWT_ACCESS_SECRET=JWT_ACCESS_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest
```

Store secrets in Secret Manager first:
```bash
printf 'postgresql://...' | gcloud secrets create DATABASE_URL --data-file=-
```

## Migrations
Cloud Run has no release hook. Run migrations as a **Cloud Run Job** (or a one-off
`gcloud run jobs execute`) in your pipeline before/after deploy:
```bash
gcloud run jobs create migrate \
  --image <same-image> --region us-central1 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --command pnpm --args "prisma,migrate,deploy"
gcloud run jobs execute migrate --region us-central1 --wait
```
Set the service `CMD` to just `node dist/main`.

## Cold starts / keep warm
- Default scales to zero → cold start on first request.
- To avoid: `--min-instances=1` (small ongoing cost).

## Health & logs
- Health path `/api/v1/health` — configure a startup/liveness probe on the service.
- Logs: Cloud Logging (`gcloud run services logs read my-school-be`).

## Frontend on GCP
Serve the SPA from a **Cloud Storage bucket + Cloud CDN** (or Firebase Hosting, which is
simpler and free). Configure the bucket website error page to `index.html` for SPA
routing.

## Pros / Cons
| Pros | Cons |
| ---- | ---- |
| Strong free tier, scales to zero | Cold starts unless min-instances>0 |
| Fully managed, autoscaling | Migrations need a separate Job |
| Secret Manager integration | GCP concepts add setup overhead |
| Pairs with Cloud SQL/Neon | Pooling required at scale |

## Cost
- Low traffic demo: often within the always-free tier (**$0**).
- `--min-instances=1` and Cloud SQL `db-f1-micro`: a few $/mo.
