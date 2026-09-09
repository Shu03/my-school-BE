# Project Overview

## Summary

**my-school-BE** is a monolithic School Management System backend API serving a multi-tenant school administration platform. It handles user management (admin, teachers, students), academic year configuration, class/section management, attendance tracking, exam/grade management, homework assignments, announcements, and fee collection.

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | (not pinned; requires Node 18+) |
| Language | TypeScript | 5.7.3 |
| Framework | NestJS | 11.0.1 |
| HTTP Platform | Express (via @nestjs/platform-express) | 11.0.1 |
| ORM | Prisma Client | 7.7.0 |
| Database | PostgreSQL | 16 (Alpine) |
| Auth | Passport + JWT (@nestjs/jwt 11, passport-jwt 4) | — |
| Validation | class-validator 0.15 + class-transformer 0.5 | — |
| API Docs | Swagger (@nestjs/swagger 11.2) | — |
| Security | helmet 8, @nestjs/throttler 6.5 | — |
| Date Handling | date-fns 4.1 | — |
| Schema Validation | Zod 4.3 (env config only) | — |
| Package Manager | pnpm | — |
| Containerization | Docker Compose (DB only) | — |

## Project Structure

```
my-school-BE/
├── src/
│   ├── main.ts                    # Bootstrap: Express, Helmet, CORS, Swagger, ValidationPipe
│   ├── app.module.ts              # Root module: imports all feature modules, global guards
│   ├── common/                    # Shared infrastructure
│   │   ├── constants/             # App-wide constants (pagination, JWT, permissions, errors)
│   │   ├── decorators/            # @Public, @CurrentUser, @Roles, @Permissions
│   │   ├── filters/               # GlobalExceptionFilter (HTTP + Prisma errors)
│   │   ├── guards/                # JWT strategies, RolesGuard, PermissionsGuard
│   │   ├── interceptors/          # ResponseInterceptor (standard envelope)
│   │   ├── pipes/                 # (empty — uses built-in ValidationPipe)
│   │   └── utils/                 # Password hashing, token hashing
│   ├── config/                    # Env validation (Zod), app + JWT config
│   └── modules/                   # Feature modules (16 total)
│       ├── academic-years/        # Academic year + term management
│       ├── announcements/         # School announcements
│       ├── attendance/            # Daily attendance tracking
│       ├── auth/                  # Login, refresh, password management
│       ├── exams/                 # Exam creation and management
│       ├── fees/                  # Fee structures, records, payments
│       ├── grades/                # Grade entry and reporting
│       ├── health/                # Health check endpoint
│       ├── homework/              # Homework assignments
│       ├── prisma/                # Global PrismaService wrapper
│       ├── school/                # School settings + holidays
│       ├── sections/              # Class/section management
│       ├── students/              # Student profiles + enrollment
│       ├── subjects/              # Subject catalog
│       ├── teachers/              # Teacher profiles + assignments + permissions
│       └── users/                 # User CRUD (admin, teacher, student creation)
├── prisma/
│   ├── schema/                    # Multi-file Prisma schema (11 .prisma files)
│   │   └── migrations/            # 12 migrations (Mar 2026 – Sep 2026)
│   ├── seed.ts                    # Seeds Super Admin user
│   └── reset-keep-admin.ts        # Resets all data except admin
├── test/                          # E2E test scaffold
├── docs/                          # Architecture, Auth, Setup docs
├── deployment/                    # 14-chapter deployment handbook
├── docker-compose.yml             # PostgreSQL 16 (dev)
├── package.json                   # Dependencies + scripts
├── tsconfig.json                  # TS config with path aliases
├── nest-cli.json                  # NestJS CLI config
└── eslint.config.mjs              # ESLint v9 flat config
```

## Key Architectural Decisions

1. **Monolithic NestJS app** — single deployable service, all modules in one process
2. **No repository layer** — services call PrismaService directly (no abstraction)
3. **Global PrismaModule** — `@Global()` module, no explicit imports needed
4. **Multi-file Prisma schema** — one `.prisma` file per domain
5. **JWT with refresh token rotation** — family-based reuse detection
6. **Role + Permission authorization** — three-tier: JwtAuthGuard → RolesGuard → PermissionsGuard
7. **Standard response envelope** — all responses wrapped in `{ success, statusCode, timestamp, data }`
8. **Strict ESLint + TypeScript** — no-explicit-any, explicit return types, explicit member accessibility
9. **Zod for env validation** — separate from class-validator (used for DTOs)

## Database

- **PostgreSQL 16** via Docker Compose (dev) or external provider (production)
- **20 models** across 7 domains
- **7 enums** (Role, EnrollmentStatus, TeacherClassRole, AttendanceStatus, ExamType, ExamStatus, FeeRecordStatus)
- **32 explicit indexes** + unique constraints
- **15 cascade delete relationships**
- **12 migrations** spanning initial schema through class→section rename

## API Surface

- **Global prefix**: `/api/v1`
- **~100 endpoints** across 15 controllers
- **Authentication**: Bearer JWT on all routes except `@Public()` decorated
- **Rate limiting**: Global (10 req/min), login (5 req/min), refresh (10 req/min)
- **Swagger**: Available at `/api/docs` in non-production environments
