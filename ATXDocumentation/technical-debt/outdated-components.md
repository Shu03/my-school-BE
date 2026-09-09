# Outdated Components

## Runtime and Framework Analysis

| Component | Current Version | Latest Stable | Status |
|-----------|----------------|---------------|--------|
| NestJS | 11.0.1 | 11.x | **Current** |
| TypeScript | 5.7.3 | 5.x | **Current** |
| Prisma | 7.7.0 | 7.x | **Current** |
| Node.js | Not pinned | 22 LTS | **INFERENCE**: Requires 18+ based on NestJS 11 |
| PostgreSQL | 16 | 17 | **Current** (16 supported until Nov 2028) |

## Runtime Dependencies

| Package | Current | Latest | Status | Risk |
|---------|---------|--------|--------|------|
| @nestjs/common | ^11.0.1 | 11.x | Current | — |
| @nestjs/core | ^11.0.1 | 11.x | Current | — |
| @nestjs/platform-express | ^11.0.1 | 11.x | Current | — |
| @nestjs/config | ^4.0.3 | 4.x | Current | — |
| @nestjs/jwt | ^11.0.2 | 11.x | Current | — |
| @nestjs/passport | ^11.0.5 | 11.x | Current | — |
| @nestjs/swagger | ^11.2.6 | 11.x | Current | — |
| @nestjs/terminus | ^11.1.1 | 11.x | Current | — |
| @nestjs/throttler | ^6.5.0 | 6.x | Current | — |
| @nestjs/axios | ^4.0.1 | 4.x | Current | **Unused** |
| @prisma/client | ^7.7.0 | 7.x | Current | — |
| @prisma/adapter-pg | ^7.4.2 | 7.x | Current | — |
| bcrypt | ^6.0.0 | 6.x | Current | — |
| class-transformer | ^0.5.1 | 0.5.x | Current | — |
| class-validator | ^0.15.1 | 0.15.x | Current | — |
| date-fns | ^4.1.0 | 4.x | Current | — |
| dotenv | ^17.3.1 | 17.x | Current | — |
| helmet | ^8.1.0 | 8.x | Current | — |
| passport | ^0.7.0 | 0.7.x | Current | — |
| passport-jwt | ^4.0.1 | 4.x | Current | — |
| pg | ^8.19.0 | 8.x | Current | — |
| reflect-metadata | ^0.2.2 | 0.2.x | Current | — |
| rxjs | ^7.8.1 | 7.x | Current | — |
| zod | ^4.3.6 | 4.x | Current | — |

## Dev Dependencies

| Package | Current | Latest | Status | Risk |
|---------|---------|--------|--------|------|
| typescript | ^5.7.3 | 5.x | Current | — |
| jest | ^30.0.0 | 30.x | Current | — |
| ts-jest | ^29.2.5 | 29.x | **Minor Concern** | Lags behind Jest 30 |
| eslint | ^9.18.0 | 9.x | Current | — |
| prettier | ^3.4.2 | 3.x | Current | — |
| prisma | ^7.7.0 | 7.x | Current | — |
| supertest | ^7.0.0 | 7.x | Current | — |
| ts-node | ^10.9.2 | 10.x | Current | — |
| source-map-support | ^0.5.21 | 0.5.x | **Legacy** | Low - dev tool |

## Assessment

**This codebase has no EOL, deprecated, or significantly outdated components.** All runtime dependencies are on their latest major versions. The technology stack is modern and well-maintained.

### Minor Concerns

1. **ts-jest@29 + Jest@30**: ts-jest 29 predates Jest 30. This could cause subtle compatibility issues. Monitor for ts-jest 30.x release.

2. **source-map-support@0.5.21**: This package has been in maintenance mode. Node.js 22+ has built-in source map support (`--enable-source-maps`). Low priority to replace.

3. **@nestjs/axios**: Declared but unused. Should be removed to reduce dependency surface.

## Deprecated APIs / Patterns

No deprecated TypeScript or NestJS APIs were detected in the codebase. The code uses modern patterns:
- NestJS 11 module system
- Prisma 7 client with adapter pattern
- ESLint v9 flat config
- TypeScript strict mode
