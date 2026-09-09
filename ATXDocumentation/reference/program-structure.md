# Program Structure

## Directory Tree

```
src/
├── main.ts                                          # Application bootstrap
├── app.module.ts                                    # Root module (all imports + global guards)
│
├── common/                                          # Shared infrastructure
│   ├── constants/
│   │   ├── app.constants.ts                         # All constants: pagination, JWT, permissions, errors
│   │   └── index.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts                # @CurrentUser() param decorator
│   │   ├── permissions.decorator.ts                 # @Permissions() metadata decorator
│   │   ├── public.decorator.ts                      # @Public() skip-auth decorator
│   │   ├── roles.decorator.ts                       # @Roles() metadata decorator
│   │   └── index.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts                 # GlobalExceptionFilter
│   │   └── index.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                        # Global JWT auth guard
│   │   ├── jwt-change-password.guard.ts             # Dual-token password change guard
│   │   ├── jwt-first-login.guard.ts                 # First-login token guard
│   │   ├── jwt-first-login.strategy.ts              # Passport strategy for first_login tokens
│   │   ├── jwt.strategy.ts                          # Passport strategy for access tokens
│   │   ├── permissions.guard.ts                     # Global permissions guard
│   │   ├── roles.guard.ts                           # Global roles guard
│   │   └── index.ts
│   ├── interceptors/
│   │   ├── response.interceptor.ts                  # Standard response envelope
│   │   └── index.ts
│   ├── pipes/                                       # (empty)
│   │   └── index.ts
│   └── utils/
│       ├── password.util.ts                         # bcrypt, SHA-256, temp password generation
│       └── index.ts
│
├── config/
│   ├── app.config.ts                                # registerAs("app") — nodeEnv, port
│   ├── env.ts                                       # Load + validate env with Zod
│   ├── env.validation.ts                            # Zod schema for env vars
│   ├── jwt.config.ts                                # registerAs("jwt") — secrets, TTLs
│   └── index.ts
│
└── modules/
    ├── academic-years/
    │   ├── academic-years.controller.ts             # 10 routes
    │   ├── academic-years.module.ts
    │   ├── academic-years.service.ts                # 10 methods
    │   ├── academic-years.types.ts
    │   ├── academic-years.controller.spec.ts
    │   ├── academic-years.service.spec.ts
    │   ├── dto/
    │   │   ├── create-academic-year.dto.ts
    │   │   ├── create-term.dto.ts
    │   │   ├── update-academic-year.dto.ts
    │   │   └── update-term.dto.ts
    │   └── index.ts
    │
    ├── announcements/                               # 5 routes, 3 DTOs
    ├── attendance/                                   # 4 routes, 4 DTOs
    ├── auth/                                        # 6 routes, 4 DTOs
    ├── exams/                                       # 10 routes, 6 DTOs
    ├── fees/                                        # 9 routes, 6 DTOs
    ├── grades/                                      # 4 routes, 3 DTOs
    ├── health/                                      # 1 route, 0 DTOs
    ├── homework/                                    # 5 routes, 3 DTOs
    ├── prisma/                                      # 0 routes (global service only)
    ├── school/                                      # 5 routes, 3 DTOs
    ├── sections/                                    # 4 routes, 3 DTOs
    ├── students/                                    # 7 routes, 5 DTOs
    ├── subjects/                                    # 5 routes, 3 DTOs
    ├── teachers/                                    # 15 routes, 6 DTOs
    └── users/                                       # 8 routes, 3 DTOs
```

## File Count Summary

| Directory | .ts Files | Spec Files | Total |
|-----------|-----------|------------|-------|
| `src/common/` | 17 | 0 | 17 |
| `src/config/` | 5 | 0 | 5 |
| `src/modules/` | ~110 | ~14 | ~124 |
| `src/` (root) | 2 | 0 | 2 |
| `prisma/` | 4 | 0 | 4 |
| **Total** | **~138** | **~14** | **~152** |

## Module File Pattern

Each feature module follows this structure:
```
<module-name>/
├── <module-name>.controller.ts          # HTTP routing + decorators
├── <module-name>.service.ts             # Business logic + data access
├── <module-name>.module.ts              # NestJS module definition
├── <module-name>.types.ts               # TypeScript types (Prisma utility types)
├── <module-name>.controller.spec.ts     # Controller tests (skeleton/empty)
├── <module-name>.service.spec.ts        # Service tests (skeleton/empty)
├── dto/
│   ├── create-*.dto.ts                  # Creation DTOs
│   ├── update-*.dto.ts                  # Update DTOs (PartialType)
│   └── list-*.dto.ts                    # Query/filter DTOs
└── index.ts                             # Barrel exports
```
