# 08 · CI/CD with GitHub Actions

From simplest to most complete. Start with platform auto-deploy (zero YAML), then add
GitHub Actions when you want tests, migrations, and control in the pipeline.

---

## Level 0 — Platform auto-deploy (no YAML)

Most hosts deploy on every push to `main` once the repo is connected:

| Host                                | Trigger                                        |
| ----------------------------------- | ---------------------------------------------- |
| Render / Railway / Fly (GitHub app) | Push to `main` → build + deploy                |
| Vercel / Netlify / Cloudflare Pages | Push to `main` → build + deploy; PRs → preview |

Good enough for a solo demo. Add Actions when you want a test gate or explicit
migration control.

---

## Level 1 — CI: build & test on every PR (backend)

`.github/workflows/be-ci.yml` in `my-school-BE`:

```yaml
name: BE CI
on:
    pull_request:
    push:
        branches: [main]

jobs:
    build-test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
              with:
                  version: 9
            - uses: actions/setup-node@v4
              with:
                  node-version: 22
                  cache: pnpm
            - run: pnpm install --frozen-lockfile
            - run: pnpm prisma generate
            - run: pnpm lint
            - run: pnpm build
            - run: pnpm test
              env:
                  NODE_ENV: test
```

> **Note:** If tests need a real Postgres, add a `services: postgres:` block and set
> `DATABASE_URL` to `postgresql://postgres:postgres@localhost:5432/test`.

Postgres service example:

```yaml
services:
    postgres:
        image: postgres:16-alpine
        env:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: test
        ports: ["5432:5432"]
        options: >-
            --health-cmd pg_isready --health-interval 10s
            --health-timeout 5s --health-retries 5
```

---

## Level 2 — CD: deploy backend on merge to main

Choose the block matching your host. Store credentials in
**Repo → Settings → Secrets and variables → Actions**.

### Fly.io

```yaml
deploy:
    needs: build-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
        - uses: actions/checkout@v4
        - uses: superfly/flyctl-actions/setup-flyctl@master
        - run: flyctl deploy --remote-only
          env:
              FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
        # migrations run via fly.toml release_command
```

### Render / Railway (deploy hook)

```yaml
deploy:
    needs: build-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
        - name: Trigger Render deploy
          run: curl -fsSL -X POST "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

> Render/Railway also auto-deploy from Git; a hook is only needed if you gate deploys
> behind CI passing.

### Google Cloud Run

```yaml
deploy:
    needs: build-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
        - uses: actions/checkout@v4
        - uses: google-github-actions/auth@v2
          with:
              credentials_json: ${{ secrets.GCP_SA_KEY }}
        - uses: google-github-actions/setup-gcloud@v2
        - name: Migrate
          run: gcloud run jobs execute migrate --region us-central1 --wait
        - name: Deploy
          run: gcloud run deploy my-school-be --source . --region us-central1
```

### AWS ECS

```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: us-east-1
- name: Build & push to ECR
  run: |
      docker build -t $ECR/my-school-be:${{ github.sha }} .
      docker push $ECR/my-school-be:${{ github.sha }}
- name: Run migration task
  run: aws ecs run-task --cluster my-school --task-definition my-school-migrate --launch-type FARGATE ...
- name: Update service
  run: aws ecs update-service --cluster my-school --service my-school-be --force-new-deployment
```

### Azure Container Apps

```yaml
- uses: azure/login@v2
  with:
      creds: ${{ secrets.AZURE_CREDENTIALS }}
- run: az acr build -r myschoolacr -t my-school-be:${{ github.sha }} .
- run: az containerapp job start -g my-school -n migrate
- run: az containerapp update -g my-school -n my-school-be --image myschoolacr.azurecr.io/my-school-be:${{ github.sha }}
```

---

## Frontend CI/CD

For Vercel/Netlify/Cloudflare Pages, the platform's own Git integration is the simplest
and recommended path (build + preview + deploy handled for you). Only add an Actions
workflow if you need a custom build or a non-Git host (S3/CloudFront).

`.github/workflows/fe-ci.yml` in `my-school-FE` (lint + build gate):

```yaml
name: FE CI
on: [pull_request, push]
jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
              with: { version: 9 }
            - uses: actions/setup-node@v4
              with: { node-version: 22, cache: pnpm }
            - run: pnpm install --frozen-lockfile
            - run: pnpm lint
            - run: pnpm build
              env:
                  VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
```

S3 + CloudFront deploy job (if not using Amplify):

```yaml
- run: aws s3 sync dist/ s3://my-school-fe --delete
- run: aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

---

## Migrations in CI/CD — the rule

> **Warning:** Run `pnpm prisma migrate deploy` **once per release**, before new app
> instances take traffic — via the platform release hook (Fly/Render), a dedicated Job
> (Cloud Run/ACA), or a one-off task (ECS). Do **not** run it in parallel across many
> instances. See [Chapter 04](04-migrations-seeding.md).

## Monorepo path filters (if you adopt a monorepo)

```yaml
on:
    push:
        paths: ["apps/api/**", "packages/**"] # BE workflow
# and a separate workflow with paths: ["apps/web/**", "packages/**"]
```

## Required secrets summary

| Secret                                        | Used by        |
| --------------------------------------------- | -------------- |
| `FLY_API_TOKEN`                               | Fly deploy     |
| `RENDER_DEPLOY_HOOK`                          | Render deploy  |
| `GCP_SA_KEY`                                  | Cloud Run      |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | ECS / S3       |
| `AZURE_CREDENTIALS`                           | Container Apps |
| `VITE_API_BASE_URL` (Actions **variable**)    | FE build       |

Continue to [Chapter 09 · Secrets](09-secrets-config.md).
