# System Overview

## High-Level Architecture

**my-school-BE** is a monolithic NestJS REST API serving as the backend for a school management platform.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                            │
│                    (Not in this repository)                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS (REST API)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NestJS Application                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Helmet   │  │ Throttle │  │ JWT Auth     │  │ Roles/Perms  │ │
│  │ (Security│  │ (Rate    │  │ Guard        │  │ Guards       │ │
│  │ Headers) │  │ Limiting)│  │ (Passport)   │  │              │ │
│  └─────────┘  └──────────┘  └──────────────┘  └──────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Global Pipes: ValidationPipe (class-validator + whitelist)   │ │
│  │ Global Filters: GlobalExceptionFilter (HTTP + Prisma errors) │ │
│  │ Global Interceptors: ResponseInterceptor (standard envelope) │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Feature Modules (14)                     │   │
│  │  Auth │ Users │ Students │ Teachers │ AcademicYears │ ...  │   │
│  │  Each: Controller → Service → PrismaService                │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────┐  ┌──────────────┐                            │
│  │ PrismaModule   │  │ ConfigModule │                            │
│  │ (@Global)      │  │ (isGlobal)   │                            │
│  └───────┬────────┘  └──────────────┘                            │
└──────────┼───────────────────────────────────────────────────────┘
           │ SQL (via Prisma Client + pg adapter)
           ▼
┌──────────────────────┐
│ PostgreSQL 16        │
│ (Docker / External)  │
│ 20 tables, 7 enums   │
└──────────────────────┘
```

## Technology Stack Details

### Core Runtime
- **Node.js** — Runtime environment (18+ required based on NestJS 11 compatibility)
- **TypeScript 5.7.3** — Strict mode with path aliases (`@common/`, `@config/`, `@modules/`)
- **NestJS 11.0.1** — Modular, decorator-based framework on Express

### Data Layer
- **Prisma 7.7.0** — ORM with PostgreSQL adapter (`@prisma/adapter-pg`)
- **PostgreSQL 16** — Primary database (Docker Compose for dev)
- **pg 8.19.0** — Node.js PostgreSQL driver (used by Prisma adapter)

### Authentication & Security
- **Passport 0.7** + **passport-jwt 4.0.1** — JWT strategy implementation
- **@nestjs/jwt 11.0.2** — JWT token signing/verification
- **bcrypt 6.0.0** — Password hashing (12 salt rounds)
- **helmet 8.1.0** — Security HTTP headers
- **@nestjs/throttler 6.5.0** — Rate limiting (global: 10/min)

### API & Validation
- **@nestjs/swagger 11.2.6** — OpenAPI documentation (non-production only)
- **class-validator 0.15.1** + **class-transformer 0.5.1** — DTO validation
- **zod 4.3.6** — Environment variable validation only

### Infrastructure
- **Docker Compose** — PostgreSQL dev container only
- **pnpm** — Package manager
- **cross-env** — Cross-platform env variable setting

## Deployment Model

**FACT**: No Dockerfile exists. The application is designed to be deployed as:
1. **Development**: `pnpm start:dev` (NestJS watch mode) + Docker Compose PostgreSQL
2. **Production**: `node dist/main` after `pnpm build` (Prisma migrations run separately)

The `deployment/` directory contains guides for 11 platforms but notes the missing Dockerfile as a prerequisite.

## External Dependencies

The application has **no external API integrations** — it is a self-contained CRUD API backed by PostgreSQL. There are:
- No message queues or event buses
- No external notification services (email, SMS, push)
- No file storage services (S3, etc.)
- No third-party API calls (@nestjs/axios is declared but unused)
- No caching layer (Redis, etc.)

## Request Flow

```
Client Request
    │
    ▼
Express (trust proxy=1, helmet, CORS)
    │
    ▼
ThrottlerGuard (rate limiting)
    │
    ▼
JwtAuthGuard (skip if @Public)
    │  ├── JwtStrategy: validates access token, loads user from DB
    │  └── JwtFirstLoginStrategy: validates first_login token
    │
    ▼
RolesGuard (skip if no @Roles decorator)
    │
    ▼
PermissionsGuard (skip if no @Permissions; ADMIN bypasses)
    │
    ▼
ValidationPipe (whitelist + transform DTOs)
    │
    ▼
Controller method → Service → PrismaService → PostgreSQL
    │
    ▼
ResponseInterceptor: wrap in { success: true, statusCode, timestamp, data }
    │
    ▼
(on error) GlobalExceptionFilter: { success: false, statusCode, timestamp, path, message }
```
