# 🏫 My School — Backend API

A production-grade school management system REST API built with NestJS, Prisma ORM, and PostgreSQL.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Scripts Reference](#scripts-reference)
- [Project Structure](#project-structure)
- [Code Standards](#code-standards)
- [Commit Convention](#commit-convention)

---

## 🛠 Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Framework        | NestJS (Node.js)                            |
| Language         | TypeScript (strict mode)                    |
| ORM              | Prisma v7                                   |
| Database         | PostgreSQL 16                               |
| Env Validation   | Zod                                         |
| DTO Validation   | class-validator + class-transformer         |
| Package Manager  | pnpm                                        |
| Containerization | Docker + Docker Compose                     |
| Linting          | ESLint v9 (flat config) + typescript-eslint |
| Formatting       | Prettier                                    |
| Git Hooks        | Husky + lint-staged + commitlint            |

---

## ✅ Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd my-school-BE
```

### 2. Install dependencies

```bash
pnpm install
```

> Husky git hooks are installed automatically via the `prepare` script on `pnpm install`.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in all required values. See [Environment Variables](#environment-variables).

### 4. Start the database

```bash
pnpm db:start
```

### 5. Generate Prisma Client and run migrations

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
```

### 6. Start the development server

```bash
pnpm start:dev
```

API available at `http://localhost:3000/api/v1`
Health check at `http://localhost:3000/api/v1/health`

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```ini
# App
NODE_ENV=development          # development | production | test
PORT=3000

# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"

# JWT
JWT_ACCESS_SECRET=            # Strong random secret (min 32 chars)
JWT_REFRESH_SECRET=           # Different strong random secret (min 32 chars)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

> The app will **refuse to start** if any required environment variable is missing or invalid. Validated at startup via Zod.

---

## 🗄 Database

### Docker (local development)

```bash
pnpm db:start       # Start PostgreSQL container
pnpm db:stop        # Stop container
pnpm db:reset       # Wipe and recreate (destructive)
pnpm db:logs        # Tail container logs
```

### Prisma

```bash
pnpm prisma:generate          # Regenerate Prisma Client after schema changes
pnpm prisma:migrate:dev       # Create and apply a new migration (development)
pnpm prisma:migrate:deploy    # Apply pending migrations (production / CI)
pnpm prisma:migrate:reset     # Reset all migrations (destructive, dev only)
pnpm prisma:push              # Push schema without migration (prototyping only)
pnpm prisma:studio            # Open Prisma Studio at http://localhost:5555
pnpm prisma:seed              # Seed the database
```

> **Production rule:** Always use `prisma:migrate:deploy` in production — never `prisma:push`.

---

## 📜 Scripts Reference

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `pnpm start:dev`    | Start development server with hot reload        |
| `pnpm start:debug`  | Start development server with debugger attached |
| `pnpm start:prod`   | Start production server from compiled `dist/`   |
| `pnpm build`        | Clean `dist/` and compile TypeScript            |
| `pnpm lint`         | Run ESLint (read-only, no auto-fix)             |
| `pnpm lint:fix`     | Run ESLint with auto-fix                        |
| `pnpm format`       | Format all source files with Prettier           |
| `pnpm format:check` | Check formatting without writing changes        |
| `pnpm test`         | Run unit tests                                  |
| `pnpm test:watch`   | Run unit tests in watch mode                    |
| `pnpm test:cov`     | Run unit tests with coverage report             |
| `pnpm test:e2e`     | Run end-to-end tests                            |

---

## 📁 Project Structure

```
my-school-BE/
├── src/
│   ├── common/
│   │   ├── decorators/        # Custom decorators
│   │   ├── filters/           # GlobalExceptionFilter
│   │   ├── guards/            # Auth, Roles, Permissions guards
│   │   ├── interceptors/      # ResponseInterceptor
│   │   └── pipes/             # Custom pipes
│   ├── config/
│   │   ├── app.config.ts      # App config factory
│   │   ├── env.ts             # Env loader + Zod validation
│   │   ├── env.validation.ts  # Zod schema + EnvConfig type
│   │   ├── jwt.config.ts      # JWT config factory
│   │   └── index.ts           # Barrel export
│   ├── modules/
│   │   ├── health/            # Health check endpoint
│   │   ├── prisma/            # PrismaService + PrismaModule (global)
│   │   └── ...                # Feature modules
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── test/
├── .husky/                    # Git hooks
├── .vscode/                   # Editor settings + recommended extensions
├── docker-compose.yml
├── prisma.config.ts           # Prisma v7 config (excluded from build)
├── .env.example
├── .prettierrc
├── .editorconfig
├── eslint.config.mjs
├── tsconfig.json
├── tsconfig.build.json        # Production build (excludes test files)
└── nest-cli.json
```

### Path Aliases

Avoid deep relative imports — use these aliases throughout the codebase:

| Alias        | Resolves To     |
| ------------ | --------------- |
| `@common/*`  | `src/common/*`  |
| `@config/*`  | `src/config/*`  |
| `@modules/*` | `src/modules/*` |

---

## 📏 Code Standards

Enforced automatically via ESLint + Prettier on every commit (lint-staged).

### Formatting

- Double quotes
- 4 spaces indentation
- Semicolons required
- Trailing commas on all multi-line structures
- Max line width: 100 characters
- LF line endings (consistent across all OSes)

### TypeScript

- No `any` — ever
- Explicit return types on all functions
- Explicit access modifiers on all class members (`public`, `private`, `protected`)
- No unhandled floating promises
- No unused variables (prefix with `_` to intentionally ignore)

### Import Order

Imports are automatically ordered and grouped by ESLint:

```typescript
// 1. NestJS packages
import { Injectable } from "@nestjs/common";

// 2. External packages
import { z } from "zod";

// 3. Internal aliases (@common, @config, @modules)
import { PrismaService } from "@modules/prisma";

// 4. Relative imports
import { CreateUserDto } from "./dto/create-user.dto";
```

---

## 📝 Commit Convention

Enforced via commitlint on every commit. Follows [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>
```

### Types

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `chore`    | Maintenance, dependencies, config        |
| `refactor` | Code restructure without behavior change |
| `docs`     | Documentation only                       |
| `test`     | Adding or updating tests                 |
| `perf`     | Performance improvement                  |
| `ci`       | CI/CD pipeline changes                   |
| `revert`   | Revert a previous commit                 |

### Valid Scopes

`auth` `users` `students` `teachers` `classes` `subjects` `attendance` `grades` `homework` `announcements` `common` `config` `prisma` `deps` `ci`

### Examples

```bash
feat(auth): add login endpoint
fix(users): resolve bcrypt hash comparison issue
chore(prisma): add refresh token model to schema
refactor(common): simplify permission guard logic
docs(readme): update setup instructions
```
