# Azure (Backend on Container Apps + Azure Postgres; Frontend on Static Web Apps)

> **Model:** **Azure Container Apps (ACA)** runs your container serverlessly (scale to
> zero or keep warm). **Azure Database for PostgreSQL Flexible Server** for data.
> **Azure Static Web Apps (SWA)** for the SPA. **Cost:** Free grants on ACA + SWA;
> Postgres Flexible Server has a low-cost burstable tier.

## Prerequisites

- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- Azure CLI: `az login`; `az extension add --name containerapp`.
- A resource group: `az group create -n my-school -l eastus`.

## Database — Postgres Flexible Server

```bash
az postgres flexible-server create \
  --resource-group my-school --name school-db \
  --version 16 --tier Burstable --sku-name Standard_B1ms \
  --admin-user pgadmin --admin-password '...' \
  --public-access 0.0.0.0
az postgres flexible-server db create -g my-school -s school-db -d school_db
```

`DATABASE_URL=postgresql://pgadmin:...@school-db.postgres.database.azure.com:5432/school_db?sslmode=require`

> **Note:** Or use **Neon** to keep the DB free; just set `DATABASE_URL` as an ACA secret.

## Build & push image (ACR)

```bash
az acr create -g my-school -n myschoolacr --sku Basic
az acr build -r myschoolacr -t my-school-be:latest .
```

## Deploy to Container Apps

```bash
az containerapp env create -g my-school -n my-school-env -l eastus
az containerapp create -g my-school -n my-school-be \
  --environment my-school-env \
  --image myschoolacr.azurecr.io/my-school-be:latest \
  --registry-server myschoolacr.azurecr.io \
  --target-port 3000 --ingress external \
  --secrets db-url="postgresql://..." jwt-a="..." jwt-r="..." \
  --env-vars NODE_ENV=production CORS_ORIGIN=https://<fe-domain> \
             DATABASE_URL=secretref:db-url \
             JWT_ACCESS_SECRET=secretref:jwt-a \
             JWT_REFRESH_SECRET=secretref:jwt-r \
  --min-replicas 1 --max-replicas 3
```

- Ingress gives you `https://my-school-be.<region>.azurecontainerapps.io`.
- Health probes: configure a liveness/readiness probe on `/api/v1/health`.
- `--min-replicas 1` avoids cold starts; set `0` to scale to zero (cold starts).

## Migrations

ACA has no release hook. Run a one-off before rollout:

```bash
az containerapp job create -g my-school -n migrate \
  --environment my-school-env \
  --image myschoolacr.azurecr.io/my-school-be:latest \
  --secrets db-url="postgresql://..." \
  --env-vars DATABASE_URL=secretref:db-url \
  --trigger-type Manual --replica-timeout 600 \
  --command "pnpm" "prisma" "migrate" "deploy"
az containerapp job start -g my-school -n migrate
```

Keep the service container `CMD` as `node dist/main`.

## Frontend — Static Web Apps

```bash
az staticwebapp create -g my-school -n my-school-fe \
  --source https://github.com/<you>/my-school-FE --branch main \
  --app-location "/" --output-location "dist" --login-with-github
```

- Build: SWA runs `pnpm build` and serves `dist`.
- **SPA routing:** add `staticwebapp.config.json` with a fallback to `/index.html`
  (see `my-school-FE/deployment/`).
- Set `VITE_API_BASE_URL` in SWA build configuration.

## Pros / Cons

| Pros                                 | Cons                           |
| ------------------------------------ | ------------------------------ |
| Serverless containers, scale-to-zero | Migrations need a separate Job |
| SWA is great for SPAs (free)         | More CLI ceremony              |
| Managed Postgres + Key Vault         | Cost tracking across services  |
| Fits Azure-based orgs                | Regional feature variance      |

## Cost

- ACA + SWA free grants cover a small demo.
- Postgres Flexible `Standard_B1ms` burstable: a few $/mo (or use Neon free).
