# AWS (Backend on ECS Fargate / Elastic Beanstalk + RDS; Frontend on S3 + CloudFront)

> **Model:** The most flexible and the most involved. Two common BE paths: **ECS
> Fargate** (containers, recommended) and **Elastic Beanstalk** (simpler, older). DB on
> **RDS**. FE on **S3 + CloudFront** (or Amplify).

## Prerequisites
- [Chapter 01](../01-prerequisites.md) fixes applied (Dockerfile, CORS).
- AWS account, AWS CLI configured (`aws configure`).
- A VPC (default VPC is fine for a demo).

---

## Backend — Option 1: ECS Fargate (recommended)

### 1. Push the image to ECR
```bash
aws ecr create-repository --repository-name my-school-be
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker build -t my-school-be .
docker tag my-school-be:latest <acct>.dkr.ecr.<region>.amazonaws.com/my-school-be:latest
docker push <acct>.dkr.ecr.<region>.amazonaws.com/my-school-be:latest
```

### 2. Database — RDS for PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier school-db \
  --engine postgres --engine-version 16 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 \
  --master-username postgres --master-user-password '...' \
  --publicly-accessible
```
Build `DATABASE_URL=postgresql://postgres:...@<endpoint>:5432/school_db?sslmode=require`.

> **Warning:** Put RDS and Fargate in the same VPC; open the RDS security group to the
> Fargate task's security group only. For many tasks, front RDS with **RDS Proxy** to
> pool connections.

### 3. ECS service
- Create an **ECS cluster** (Fargate).
- **Task definition:** container image from ECR, port `3000`, env vars +
  secrets from **Secrets Manager / SSM Parameter Store**
  (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `CORS_ORIGIN`).
- **Service** behind an **Application Load Balancer**; target group health check path
  `/api/v1/health`.
- ALB listener: HTTPS (ACM cert) → forward to the target group.

### 4. Migrations
Run a **one-off ECS task** with command override `pnpm prisma migrate deploy` before
updating the service (do this in CI/CD). Keep the service container `CMD` as
`node dist/main`.

---

## Backend — Option 2: Elastic Beanstalk (simpler)
- `eb init` (Docker platform) → `eb create` → `eb deploy`.
- Set env vars via `eb setenv NODE_ENV=production DATABASE_URL=... JWT_ACCESS_SECRET=...`.
- Health check URL: `/api/v1/health` in the environment config.
- Migrations: an EB **platform hook** (`.platform/hooks/predeploy/`) running
  `pnpm prisma migrate deploy`.

Beanstalk provisions the ALB/ASG for you — less control, faster to stand up.

---

## Frontend — S3 + CloudFront
```bash
aws s3 mb s3://my-school-fe
aws s3 sync dist/ s3://my-school-fe --delete
```
- Create a **CloudFront** distribution with the S3 bucket as origin (use OAC).
- **SPA routing:** add a custom error response mapping **403/404 → `/index.html`
  (HTTP 200)** so client-side routes work.
- Invalidate cache on each deploy: `aws cloudfront create-invalidation --paths "/*"`.
- Alternative: **AWS Amplify Hosting** (Git-connected, handles build + SPA rewrites
  automatically) — much simpler than raw S3+CloudFront.

## Pros / Cons
| Pros | Cons |
| ---- | ---- |
| Ultimate control, scale, compliance | Steepest setup; many moving parts |
| RDS/Proxy, ALB, ACM, IAM maturity | Cost model complex; easy to overspend |
| Fits existing AWS orgs | Migrations need a one-off task |

## Cost
- Not truly free long-term. Fargate + ALB + RDS `db.t4g.micro` ≈ low tens of $/mo.
- 12-month free tier offsets some (RDS micro, minimal Fargate) but ALB always bills.
- Amplify + a tiny backend can be cheaper for a demo than full ECS.
