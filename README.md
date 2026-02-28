# 🏫 My School — Backend API

A production-grade school management system REST API built with NestJS, Prisma ORM, and PostgreSQL. Designed for a single-school environment with role-based access control (RBAC) for Admins, Teachers, Students, and Parents.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Roles & Permissions](#roles--permissions)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Scripts Reference](#scripts-reference)
- [API Overview](#api-overview)
- [Auth Flow](#auth-flow)
- [Code Standards](#code-standards)
- [Commit Convention](#commit-convention)
- [Services Checklist](#services-checklist)

---

## 🛠 Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Framework        | NestJS (Node.js)                            |
| Language         | TypeScript (strict mode)                    |
| ORM              | Prisma v7                                   |
| Database         | PostgreSQL 16                               |
| Validation       | Zod (env) + class-validator (DTOs)          |
| Auth             | JWT (Access + Refresh tokens)               |
| Package Manager  | pnpm                                        |
| Containerization | Docker + Docker Compose                     |
| Linting          | ESLint v9 (flat config) + typescript-eslint |
| Formatting       | Prettier                                    |
| Git Hooks        | Husky + lint-staged + commitlint            |

---

## 🏗 Architecture Overview

This is a **single-school, closed system**. There is no public registration. All accounts are created by Admin only.

### Key Design Decisions

- **Closed system** — Admin creates all user accounts. No public signup.
- **JWT strategy** — Short-lived Access Token (15 min) + Long-lived Refresh Token (7 days) with rotation and reuse detection (token family pattern).
- **Default-deny RBAC** — Teachers start with zero permissions. Admin explicitly grants permissions via preset groups or individual flags.
- **Consistent API shape** — All responses (success and error) follow a unified envelope format.
- **Environment validation** — App refuses to start if any required environment variable is missing or invalid.

### Response Envelope

Every API response follows this shape:

**Success:**

```json
{
    "success": true,
    "statusCode": 200,
    "timestamp": "2026-01-01T00:00:00.000Z",
    "data": {}
}
```

**Error:**

```json
{
    "success": false,
    "statusCode": 400,
    "timestamp": "2026-01-01T00:00:00.000Z",
    "path": "/api/v1/auth/login",
    "message": "Invalid credentials"
}
```

---

## 👥 Roles & Permissions

### Roles

| Role      | Access Level      | Description                                                    |
| --------- | ----------------- | -------------------------------------------------------------- |
| `ADMIN`   | Full access       | Manages all system data, creates accounts, assigns permissions |
| `TEACHER` | Scoped write      | Access gated by explicit permission flags assigned by Admin    |
| `STUDENT` | Read-only + leave | Can view own data and submit leave applications                |
| `PARENT`  | Read-only         | Can view data scoped to their linked children                  |

### Teacher Permission Flags

Teachers start with **zero permissions (default-deny)**. Admin grants permissions via preset groups or individual overrides.

| Permission             | Description                |
| ---------------------- | -------------------------- |
| `ATTENDANCE_READ`      | View attendance records    |
| `ATTENDANCE_WRITE`     | Mark and update attendance |
| `GRADES_READ`          | View student grades        |
| `GRADES_WRITE`         | Enter and update grades    |
| `NOTES_UPLOAD`         | Upload study notes         |
| `HOMEWORK_MANAGE`      | Create and manage homework |
| `ANNOUNCEMENTS_MANAGE` | Post announcements         |
| `REPORTS_VIEW`         | View student reports       |

### Permission Preset Groups

Admin can assign named presets (e.g., "Class Teacher", "Subject Teacher") which bundle permissions. Individual flags can be overridden on top of any preset.

### RBAC Guard Chain

```
Request
  → JwtAuthGuard        (validates token signature + expiry)
  → RolesGuard          (checks role against endpoint requirement)
  → PermissionsGuard    (checks permission flags — Teachers only)
  → Service Layer       (data scoping — Student sees own data, Parent sees children's data)
```

---

## 📁 Project Structure

```
my-school-BE/
├── src/
│   ├── common/
│   │   ├── decorators/        # Custom decorators (e.g., @CurrentUser, @Roles)
│   │   ├── filters/           # GlobalExceptionFilter
│   │   ├── guards/            # JwtAuthGuard, RolesGuard, PermissionsGuard
│   │   ├── interceptors/      # ResponseInterceptor
│   │   └── pipes/             # Custom pipes
│   ├── config/
│   │   ├── app.config.ts      # App config factory
│   │   ├── env.ts             # Env loader + Zod validation
│   │   ├── env.validation.ts  # Zod schema + EnvConfig type
│   │   ├── jwt.config.ts      # JWT config factory
│   │   └── index.ts           # Barrel export
│   ├── modules/
│   │   ├── auth/              # Authentication & token management
│   │   ├── health/            # Health check endpoint
│   │   ├── prisma/            # PrismaService + PrismaModule (global)
│   │   ├── users/             # User management (Admin only)
│   │   ├── students/          # Student profiles
│   │   ├── teachers/          # Teacher profiles + permissions
│   │   ├── parents/           # Parent profiles
│   │   ├── classes/           # Class management
│   │   ├── subjects/          # Subject management
│   │   ├── attendance/        # Attendance tracking
│   │   ├── grades/            # Grades & report cards
│   │   ├── homework/          # Homework management
│   │   └── announcements/     # Announcements
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── test/
├── .husky/
├── .vscode/
├── docker-compose.yml
├── prisma.config.ts
├── .env.example
├── .prettierrc
├── eslint.config.mjs
├── tsconfig.json
├── tsconfig.build.json
└── nest-cli.json
```

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

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in all required values in `.env`. See [Environment Variables](#environment-variables) below.

### 4. Start the database

```bash
pnpm db:start
```

### 5. Run Prisma migrations

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
```

### 6. Start the development server

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

Health check: `http://localhost:3000/api/v1/health`

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
JWT_ACCESS_EXPIRES_IN=15m     # Access token expiry
JWT_REFRESH_EXPIRES_IN=7d     # Refresh token expiry
```

> **Note:** The app will **refuse to start** if any required environment variable is missing or invalid. This is intentional.

---

## 🗄 Database

### Local Development

The project uses Docker Compose to run PostgreSQL locally.

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
pnpm prisma:migrate:deploy    # Apply pending migrations (production/CI)
pnpm prisma:migrate:reset     # Reset all migrations (destructive, dev only)
pnpm prisma:push              # Push schema without migration (prototyping only)
pnpm prisma:studio            # Open Prisma Studio at http://localhost:5555
pnpm prisma:seed              # Seed the database
```

> **Production rule:** Always use `prisma:migrate:deploy` in production — never `prisma:push`.

---

## 📜 Scripts Reference

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm start:dev`    | Start development server with hot reload   |
| `pnpm start:debug`  | Start development server with debugger     |
| `pnpm start:prod`   | Start production server from compiled dist |
| `pnpm build`        | Clean dist and compile TypeScript          |
| `pnpm lint`         | Run ESLint (no auto-fix)                   |
| `pnpm lint:fix`     | Run ESLint with auto-fix                   |
| `pnpm format`       | Format all files with Prettier             |
| `pnpm format:check` | Check formatting without writing           |
| `pnpm test`         | Run unit tests                             |
| `pnpm test:watch`   | Run unit tests in watch mode               |
| `pnpm test:cov`     | Run unit tests with coverage report        |
| `pnpm test:e2e`     | Run end-to-end tests                       |

---

## 🔌 API Overview

All routes are prefixed with `/api/v1`.

### Auth

| Method | Endpoint                     | Access        | Description                              |
| ------ | ---------------------------- | ------------- | ---------------------------------------- |
| POST   | `/auth/login`                | Public        | Login with mobile number + password      |
| POST   | `/auth/refresh`              | Public        | Rotate refresh token                     |
| POST   | `/auth/logout`               | Authenticated | Revoke refresh token                     |
| POST   | `/auth/change-password`      | Authenticated | First-login or voluntary password change |
| POST   | `/auth/admin/reset-password` | Admin         | Reset any user's password                |

### Health

| Method | Endpoint  | Access | Description                 |
| ------ | --------- | ------ | --------------------------- |
| GET    | `/health` | Public | App + database health check |

> More endpoints will be documented here as services are implemented.

---

## 🔑 Auth Flow

### Normal Login

```
POST /auth/login { mobileNumber, password }
  → Validate credentials
  → Check isActive
  → Check isFirstLogin → return FORCE_PASSWORD_CHANGE if true
  → Issue Access Token (15m) + Refresh Token (7d)
  → Store hashed Refresh Token in DB
```

### First Login Flow

```
Login → API returns { forcePasswordChange: true } (no tokens yet)
  → Client redirects to Change Password screen
  → POST /auth/change-password { newPassword }
  → isFirstLogin flips to false
  → Tokens issued normally
```

### Refresh Token Rotation

```
POST /auth/refresh { refreshToken }
  → Validate token signature + expiry
  → Check token exists in DB and is not revoked
  → Check token family for reuse (replay attack detection)
  → If reused → revoke entire token family
  → Issue new Access Token + new Refresh Token
  → Invalidate old Refresh Token
```

---

## 📏 Code Standards

This project enforces strict code standards via ESLint and Prettier on every commit.

### Formatting Rules

- Double quotes everywhere
- 4 spaces indentation
- Semicolons required
- Trailing commas on all multi-line structures
- Max line width: 100 characters
- LF line endings

### TypeScript Rules

- No `any` — ever
- Explicit return types on all functions
- Explicit access modifiers on all class members (`public`, `private`, `protected`)
- No unhandled floating promises
- No unused variables (underscore prefix `_param` to intentionally ignore)

### Import Order

Imports are automatically ordered and grouped:

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

This project enforces [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `chore`    | Maintenance, dependencies, config                       |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs`     | Documentation changes                                   |
| `test`     | Adding or updating tests                                |
| `perf`     | Performance improvements                                |
| `ci`       | CI/CD changes                                           |
| `revert`   | Revert a previous commit                                |

### Scopes

`auth` `users` `students` `teachers` `classes` `subjects` `attendance` `grades` `homework` `announcements` `common` `config` `prisma` `deps` `ci`

### Examples

```bash
feat(auth): add login endpoint with jwt token issuance
fix(users): resolve bcrypt hash comparison issue
chore(prisma): add refresh token model to schema
refactor(common): simplify permission guard logic
test(auth): add unit tests for jwt strategy
docs(readme): update environment variable reference
```

---

## 🗺 Services Checklist

### ✅ Infrastructure (Complete)

- [x] NestJS project with strict TypeScript
- [x] ESLint v9 flat config + Prettier (double quotes, 4 spaces)
- [x] Path aliases (`@common`, `@config`, `@modules`)
- [x] Zod environment validation (app refuses to start on invalid env)
- [x] Prisma v7 + PostgreSQL with adapter
- [x] PrismaModule (global)
- [x] GlobalExceptionFilter (consistent error responses)
- [x] ResponseInterceptor (consistent success responses)
- [x] ValidationPipe (whitelist, transform, forbid unknown)
- [x] Health check endpoint (`/api/v1/health`)
- [x] Docker Compose for local PostgreSQL
- [x] Production build pipeline
- [ ] Husky + lint-staged + commitlint (deferred)
- [ ] Swagger / OpenAPI documentation

### 🔲 Auth Service

- [ ] Prisma schema — User, RefreshToken models
- [ ] Password hashing (bcrypt)
- [ ] Login endpoint (mobile number + password)
- [ ] First-login force password change flow
- [ ] JWT Access Token issuance (15m)
- [ ] JWT Refresh Token issuance + DB storage (7d)
- [ ] Refresh token rotation
- [ ] Token family reuse detection
- [ ] Logout (revoke refresh token)
- [ ] Admin reset password endpoint
- [ ] JwtAuthGuard
- [ ] RolesGuard
- [ ] PermissionsGuard
- [ ] `@CurrentUser` decorator
- [ ] `@Roles` decorator
- [ ] `@Permissions` decorator

### 🔲 Users Service

- [ ] Admin creates user accounts
- [ ] Assign role on creation
- [ ] Deactivate / reactivate accounts
- [ ] List and search users (Admin only)

### 🔲 Teachers Service

- [ ] Teacher profile linked to User
- [ ] Permission preset groups (CRUD by Admin)
- [ ] Assign preset to teacher
- [ ] Individual permission overrides
- [ ] Effective permissions resolution (preset + overrides)

### 🔲 Students Service

- [ ] Student profile linked to User
- [ ] Class and section assignment
- [ ] Link parent(s) to student
- [ ] Leave application submission

### 🔲 Parents Service

- [ ] Parent profile linked to User
- [ ] Link to one or more students
- [ ] Scoped read access to children's data

### 🔲 Classes Service

- [ ] Class and section management
- [ ] Assign class teacher
- [ ] Assign subjects to class

### 🔲 Subjects Service

- [ ] Subject management
- [ ] Assign subject teacher

### 🔲 Attendance Service

- [ ] Mark daily attendance (Teacher — ATTENDANCE_WRITE)
- [ ] View attendance records (Teacher — ATTENDANCE_READ, Student/Parent — read own)
- [ ] Attendance reports

### 🔲 Grades Service

- [ ] Enter grades (Teacher — GRADES_WRITE)
- [ ] View grades (Teacher — GRADES_READ, Student/Parent — read own)
- [ ] Report card generation

### 🔲 Homework Service

- [ ] Create and manage homework (Teacher — HOMEWORK_MANAGE)
- [ ] View homework (Student/Parent — read own class)

### 🔲 Announcements Service

- [ ] Post announcements (Teacher — ANNOUNCEMENTS_MANAGE, Admin — always)
- [ ] View announcements (all authenticated users)

---

## 👤 Author

Built with care for production. Maintained by the school development team.
