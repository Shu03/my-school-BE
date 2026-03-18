# Project Setup

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** (package manager)
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
pnpm db:start

# 3. Copy environment file
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 4. Generate Prisma client
pnpm prisma:generate

# 5. Run migrations
pnpm prisma:migrate:dev

# 6. Seed the database (optional)
pnpm prisma:seed

# 7. Start dev server
pnpm start:dev
```

The API will be available at `http://localhost:3000/api/v1`.  
Swagger docs at `http://localhost:3000/api/docs`.

---

## Environment Variables

| Variable                 | Required | Default       | Description                         |
| ------------------------ | -------- | ------------- | ----------------------------------- |
| `NODE_ENV`               | No       | `development` | `development`, `production`, `test` |
| `PORT`                   | No       | `3000`        | Server port                         |
| `DATABASE_URL`           | Yes      | —             | PostgreSQL connection string        |
| `JWT_ACCESS_SECRET`      | Yes      | —             | Secret for access tokens            |
| `JWT_REFRESH_SECRET`     | Yes      | —             | Secret for refresh tokens           |
| `JWT_ACCESS_EXPIRES_IN`  | No       | `15m`         | Access token TTL                    |
| `JWT_REFRESH_EXPIRES_IN` | No       | `7d`          | Refresh token TTL                   |

Example `DATABASE_URL`:

```
postgresql://postgres:postgres@localhost:5432/school_db
```

---

## Scripts

| Script                       | Description                          |
| ---------------------------- | ------------------------------------ |
| `pnpm start:dev`             | Start in watch mode (development)    |
| `pnpm start:debug`           | Start in debug + watch mode          |
| `pnpm build`                 | Build for production                 |
| `pnpm start`                 | Run production build                 |
| `pnpm lint`                  | Run ESLint                           |
| `pnpm lint:fix`              | Run ESLint with auto-fix             |
| `pnpm format`                | Format with Prettier                 |
| `pnpm test`                  | Run unit tests                       |
| `pnpm test:watch`            | Run tests in watch mode              |
| `pnpm test:cov`              | Run tests with coverage              |
| `pnpm test:e2e`              | Run end-to-end tests                 |
| `pnpm prisma:generate`       | Generate Prisma client               |
| `pnpm prisma:migrate:dev`    | Create/apply dev migrations          |
| `pnpm prisma:migrate:deploy` | Apply migrations (production)        |
| `pnpm prisma:migrate:reset`  | Reset DB and re-apply all migrations |
| `pnpm prisma:studio`         | Open Prisma Studio GUI               |
| `pnpm prisma:seed`           | Seed the database                    |
| `pnpm db:start`              | Start PostgreSQL via Docker Compose  |
| `pnpm db:stop`               | Stop PostgreSQL                      |
| `pnpm db:reset`              | Destroy and recreate the DB volume   |
| `pnpm db:logs`               | Tail PostgreSQL logs                 |

---

## Docker

PostgreSQL 16 is provided via Docker Compose:

```yaml
# docker-compose.yml
services:
    postgres:
        image: postgres:16-alpine
        container_name: school_db
        ports: ["5432:5432"]
        environment:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: school_db
        volumes:
            - postgres_data:/var/lib/postgresql/data
```

---

## Tech Stack

| Layer           | Technology                                            |
| --------------- | ----------------------------------------------------- |
| Framework       | NestJS 11 + TypeScript (strict)                       |
| ORM             | Prisma v7 with PostgreSQL 16                          |
| Auth            | JWT via `@nestjs/jwt` + Passport                      |
| Validation      | Zod (env), class-validator + class-transformer (DTOs) |
| API Docs        | Swagger (`@nestjs/swagger`)                           |
| Code Quality    | ESLint v9 (flat config), Prettier, Husky              |
| Package Manager | pnpm                                                  |

---

## Project Structure

```
src/
├── main.ts                           # Bootstrap, global pipes/filters/interceptors, Swagger
├── app.module.ts                     # Root module
├── config/                           # Env loading (Zod), app config, JWT config
├── common/
│   ├── constants/                    # App-wide constants
│   ├── filters/                      # GlobalExceptionFilter (HTTP + Prisma errors)
│   ├── interceptors/                 # ResponseInterceptor (standard envelope)
│   ├── utils/                        # Password hashing & generation
│   ├── decorators/                   # Custom decorators (TBD)
│   ├── guards/                       # Auth guards (TBD)
│   └── pipes/                        # Custom pipes (TBD)
└── modules/
    ├── prisma/                       # Global PrismaService
    ├── health/                       # Health check endpoint
    ├── auth/                         # Authentication (JWT, login, password management)
    └── users/                        # User CRUD, role-based creation
```
