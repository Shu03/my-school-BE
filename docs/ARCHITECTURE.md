# My School Backend — Architecture Documentation

> **Purpose:** Comprehensive system architecture reference for onboarding, KT sessions, and AI agent context.
> **Stack:** NestJS 11 · TypeScript · PostgreSQL 16 · Prisma ORM · JWT Auth · Docker

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        WEB[Web App / Admin Panel]
        MOB[Mobile App]
    end

    subgraph Proxy["Reverse Proxy (Future)"]
        RP[Nginx / ALB]
    end

    subgraph API["NestJS Application"]
        direction TB
        MW[Global Middleware<br/>CORS · ValidationPipe · ExceptionFilter · ResponseInterceptor]

        subgraph Guards["Guard Chain (Global)"]
            G1[JwtAuthGuard]
            G2[RolesGuard]
        end

        subgraph Modules["Feature Modules"]
            AUTH[Auth Module]
            USR[Users Module]
            AY[Academic Years Module]
            CLS[Classes Module]
            HEALTH[Health Module]
        end

        subgraph Shared["Shared Layer"]
            PRISMA[Prisma Service]
            CONFIG[Config Module]
        end
    end

    subgraph DB["Data Layer"]
        PG[(PostgreSQL 16)]
    end

    WEB & MOB --> RP
    RP --> MW
    MW --> Guards
    Guards --> Modules
    Modules --> PRISMA
    PRISMA --> PG
    CONFIG -.-> Modules
```

---

## 2. Module Dependency Graph

```mermaid
graph LR
    APP[AppModule] --> CONFIG[ConfigModule<br/><i>global</i>]
    APP --> PRISMA[PrismaModule<br/><i>global</i>]
    APP --> HEALTH[HealthModule]
    APP --> AUTH[AuthModule]
    APP --> USR[UsersModule]
    APP --> AY[AcademicYearsModule]
    APP --> CLS[ClassesModule]

    AUTH --> USR
    AUTH --> PRISMA
    AUTH --> CONFIG
    USR --> PRISMA
    AY --> PRISMA
    CLS --> PRISMA
    CLS --> AY
    HEALTH --> PRISMA
```

---

## 3. Authentication & Authorization Flow

### 3.1 Login Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as PostgreSQL

    C->>API: POST /api/v1/auth/login {mobileNumber, password}
    API->>SVC: login(dto)
    SVC->>DB: Find user by mobile
    DB-->>SVC: User record

    alt User not found OR password invalid
        SVC-->>C: 401 Invalid credentials
    end

    alt Account deactivated
        SVC-->>C: 403 Account deactivated
    end

    alt First login (password not changed)
        SVC-->>C: 200 {forcePasswordChange: true, firstLoginToken}
    end

    SVC->>SVC: Generate access + refresh tokens
    SVC->>DB: Enforce session limit (max 3)
    SVC->>DB: Store refresh token hash
    SVC-->>C: 200 {accessToken, refreshToken, user}
```

### 3.2 Token Refresh with Rotation & Reuse Detection

```mermaid
sequenceDiagram
    participant C as Client
    participant API as AuthController
    participant SVC as AuthService
    participant DB as PostgreSQL

    C->>API: POST /api/v1/auth/refresh {refreshToken}
    API->>SVC: refresh(dto)
    SVC->>SVC: Verify JWT signature & expiry
    SVC->>DB: Lookup token by SHA-256 hash

    alt Token already revoked (REUSE DETECTED)
        SVC->>DB: Revoke ALL tokens in family
        SVC-->>C: 401 Token reuse detected
    end

    alt Token valid
        SVC->>DB: Revoke current token
        SVC->>SVC: Issue new access + refresh (same family)
        SVC->>DB: Store new refresh token hash
        SVC-->>C: 200 {accessToken, refreshToken}
    end
```

### 3.3 Guard Execution Order

```mermaid
flowchart TD
    REQ[Incoming Request] --> PUB{@Public decorator?}
    PUB -->|Yes| HANDLER[Route Handler]
    PUB -->|No| JWT[JwtAuthGuard<br/>Validate JWT signature & expiry]
    JWT -->|Invalid| R401[401 Unauthorized]
    JWT -->|Valid| STRAT[JwtStrategy<br/>Verify token type = access<br/>Check user active]
    STRAT -->|Fail| R401
    STRAT -->|Pass| ROLES{RolesGuard<br/>@Roles decorator present?}
    ROLES -->|No decorator| HANDLER
    ROLES -->|Has roles| RCHK{User role in allowed list?}
    RCHK -->|No| R403[403 Forbidden]
    RCHK -->|Yes| HANDLER
    HANDLER --> SCOPE[Service layer<br/>AccessPolicyService checks<br/>assignments + approved access]
    SCOPE -->|Not allowed| R403
```

---

## 4. Database Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o| TeacherProfile : "has"
    User ||--o| StudentProfile : "has"
    User ||--o{ RefreshToken : "owns"
    User ||--o{ User : "createdBy"
    User ||--o{ AccessRequest : "requests"

    TeacherProfile ||--o{ TeacherClassAssignment : "assigned"

    StudentProfile ||--o{ StudentEnrollment : "enrolled"

    AcademicYear ||--o{ Class : "contains"
    AcademicYear ||--o{ Term : "contains"
    AcademicYear ||--o{ StudentEnrollment : "year"

    Class ||--o{ StudentEnrollment : "has"
    Class ||--o{ TeacherClassAssignment : "has"

    Subject ||--o{ TeacherClassAssignment : "taught"

    User {
        uuid id PK
        string mobileNumber UK
        string password
        string firstName
        string lastName
        string email UK
        Role role
        bool isActive
        bool isFirstLogin
        uuid createdById FK
    }

    TeacherProfile {
        uuid id PK
        uuid userId FK_UK
        string employeeCode UK
        datetime joiningDate
    }

    StudentProfile {
        uuid id PK
        uuid userId FK_UK
        string admissionNumber UK
        datetime dateOfBirth
    }

    RefreshToken {
        uuid id PK
        uuid userId FK
        string tokenHash UK
        string family
        bool isRevoked
        datetime expiresAt
    }

    AccessRequest {
        uuid id PK
        uuid requesterId FK
        AccessType type
        AccessRequestStatus status
        uuid sectionId FK
        uuid subjectId FK
    }

    AcademicYear {
        uuid id PK
        string name UK
        datetime startDate
        datetime endDate
        bool isCurrent
    }

    Term {
        uuid id PK
        string name
        datetime startDate
        datetime endDate
        uuid academicYearId FK
    }

    Class {
        uuid id PK
        string name
        int gradeLevel
        uuid academicYearId FK
    }

    Subject {
        uuid id PK
        string name
        string code
        int gradeLevel
    }

    StudentEnrollment {
        uuid id PK
        uuid studentId FK
        uuid classId FK
        uuid academicYearId FK
        string rollNumber
        EnrollmentStatus status
    }

    TeacherClassAssignment {
        uuid id PK
        uuid teacherId FK
        uuid classId FK
        uuid subjectId FK
        TeacherClassRole role
    }
```

---

## 5. Teacher Access

```mermaid
flowchart LR
    subgraph Roles
        ADMIN[ADMIN<br/><i>Implicit full access</i>]
        TEACHER[TEACHER<br/><i>Assignment-based</i>]
        STUDENT[STUDENT<br/><i>Own data only</i>]
    end

    subgraph Sources["Access Sources (Teachers)"]
        CT[CLASS_TEACHER assignment<br/>attendance + all subjects]
        ST[SUBJECT_TEACHER assignment<br/>section + subject]
        AR[Approved AccessRequest<br/>HOMEWORK / MARKS for section + subject]
    end

    TEACHER --> CT & ST & AR
    CT & ST & AR --> POLICY[AccessPolicyService]
```

**Key rules:** no permission strings or presets. Access is checked against the database on every request, so approvals and revocations take effect immediately. Teachers request extra homework/marks access via `/request-access`; admins approve, reject, revoke or grant directly.

---

## 6. Request/Response Lifecycle

```mermaid
flowchart TD
    REQ[HTTP Request] --> CORS[CORS Middleware]
    CORS --> VP[ValidationPipe<br/>whitelist + transform]
    VP --> GUARDS[Guard Chain<br/>JWT → Roles]
    GUARDS --> CTRL[Controller]
    CTRL --> SVC[Service Layer]
    SVC --> PRISMA[Prisma ORM]
    PRISMA --> DB[(PostgreSQL)]
    DB --> PRISMA
    PRISMA --> SVC
    SVC --> CTRL
    CTRL --> INTERCEPT[ResponseInterceptor<br/>Wraps in standard envelope]
    INTERCEPT --> RES[HTTP Response]

    SVC -.->|throws| EXC[Exception]
    EXC --> FILTER[GlobalExceptionFilter<br/>Maps to error envelope]
    FILTER --> RES

    style RES fill:#2d6,color:#fff
```

### Standard Response Envelope

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-05-05T10:30:00.000Z",
  "data": { ... }
}
```

### Error Response Envelope

```json
{
    "success": false,
    "statusCode": 401,
    "timestamp": "2026-05-05T10:30:00.000Z",
    "path": "/api/v1/auth/login",
    "message": "Invalid credentials"
}
```

---

## 7. API Route Map

```mermaid
graph LR
    subgraph Public["Public (No Auth)"]
        P1["GET /health"]
        P2["POST /auth/login"]
        P3["POST /auth/refresh"]
        P4["GET /academic-years/current"]
        P5["GET /classes"]
    end

    subgraph AuthRequired["Authenticated"]
        A1["POST /auth/logout"]
        A2["POST /auth/change-password"]
    end

    subgraph AdminOnly["Admin Only"]
        AD1["POST /users/admin"]
        AD2["POST /users/teacher"]
        AD3["POST /users/student"]
        AD4["GET /users"]
        AD5["GET /users/:id"]
        AD6["PATCH /users/:id"]
        AD7["PATCH /users/:id/activate"]
        AD8["PATCH /users/:id/deactivate"]
        AD9["POST /auth/admin/reset-password"]
        AD10["PATCH /academic-years/:id/set-current"]
        AD11["POST /academic-years"]
        AD12["GET /academic-years"]
        AD13["GET /academic-years/:id"]
        AD14["PATCH /academic-years/:id"]
        AD15["POST /academic-years/:id/terms"]
        AD16["POST /classes"]
        AD17["PATCH /classes/:id"]
    end
```

| Endpoint                          | Method | Auth                        | Roles |
| --------------------------------- | ------ | --------------------------- | ----- |
| `/health`                         | GET    | Public                      | —     |
| `/auth/login`                     | POST   | Public                      | —     |
| `/auth/refresh`                   | POST   | Public                      | —     |
| `/auth/logout`                    | POST   | JWT                         | Any   |
| `/auth/change-password`           | POST   | JWT (access or first_login) | Any   |
| `/auth/admin/reset-password`      | POST   | JWT                         | ADMIN |
| `/users/admin`                    | POST   | JWT                         | ADMIN |
| `/users/teacher`                  | POST   | JWT                         | ADMIN |
| `/users/student`                  | POST   | JWT                         | ADMIN |
| `/users`                          | GET    | JWT                         | ADMIN |
| `/users/:id`                      | GET    | JWT                         | ADMIN |
| `/users/:id`                      | PATCH  | JWT                         | ADMIN |
| `/users/:id/activate`             | PATCH  | JWT                         | ADMIN |
| `/users/:id/deactivate`           | PATCH  | JWT                         | ADMIN |
| `/academic-years`                 | POST   | JWT                         | ADMIN |
| `/academic-years`                 | GET    | JWT                         | ADMIN |
| `/academic-years/current`         | GET    | Public                      | —     |
| `/academic-years/:id`             | GET    | JWT                         | ADMIN |
| `/academic-years/:id`             | PATCH  | JWT                         | ADMIN |
| `/academic-years/:id/set-current` | PATCH  | JWT                         | ADMIN |
| `/academic-years/:id/terms`       | POST   | JWT                         | ADMIN |
| `/classes`                        | GET    | Public                      | —     |
| `/classes`                        | POST   | JWT                         | ADMIN |
| `/classes/:id`                    | GET    | JWT                         | Any   |
| `/classes/:id`                    | PATCH  | JWT                         | ADMIN |

---

## 8. Project Structure

```mermaid
graph TD
    subgraph Root["Project Root"]
        MAIN["src/main.ts<br/><i>Bootstrap, global setup</i>"]
        APPMOD["src/app.module.ts<br/><i>Root module, global guards</i>"]
    end

    subgraph Config["src/config/"]
        ENV["env.ts — .env loader + Zod validation"]
        APPCONF["app.config.ts — PORT, NODE_ENV"]
        JWTCONF["jwt.config.ts — JWT secrets & TTLs"]
    end

    subgraph Common["src/common/"]
        GUARDS["guards/ — JWT, Roles"]
        DECORATORS["decorators/ — @Public, @Roles, @CurrentUser"]
        FILTERS["filters/ — GlobalExceptionFilter"]
        INTERCEPTORS["interceptors/ — ResponseInterceptor"]
        UTILS["utils/ — password hashing, token hashing"]
        CONSTANTS["constants/ — all magic values"]
    end

    subgraph Modules["src/modules/"]
        M_AUTH["auth/ — login, refresh, logout, change-password, reset"]
        M_USERS["users/ — CRUD, activate/deactivate"]
        M_AY["academic-years/ — years + terms CRUD"]
        M_CLASSES["classes/ — classes + teacher assignment"]
        M_PRISMA["prisma/ — PrismaService singleton"]
        M_HEALTH["health/ — DB connectivity check"]
    end

    subgraph Schema["prisma/schema/"]
        S_BASE["base.prisma — generator + datasource"]
        S_USER["user.prisma — User, RefreshToken"]
        S_TEACHER["teacher.prisma — TeacherProfile, Assignments"]
        S_STUDENT["student.prisma — StudentProfile, Enrollment"]
        S_ACADEMIC["academic.prisma — AcademicYear, Term, Class, Subject"]
    end

    MAIN --> APPMOD
    APPMOD --> Config
    APPMOD --> Common
    APPMOD --> Modules
    Modules --> Schema
```

---

## 9. Token Architecture

```mermaid
stateDiagram-v2
    [*] --> Login: POST /auth/login

    Login --> FirstLoginToken: isFirstLogin = true
    Login --> AccessToken: Normal login
    Login --> RefreshToken: Normal login

    FirstLoginToken --> ChangePassword: POST /auth/change-password
    ChangePassword --> AccessToken: Returns full tokens
    ChangePassword --> RefreshToken: Returns full tokens

    AccessToken --> APICall: Bearer header (15min TTL)
    APICall --> Expired: Token expires

    RefreshToken --> Rotate: POST /auth/refresh (7d TTL)
    Rotate --> AccessToken: New access token
    Rotate --> RefreshToken: New refresh token (old revoked)

    Rotate --> ReuseDetected: Revoked token replayed
    ReuseDetected --> AllRevoked: Entire family revoked

    AccessToken --> Logout: POST /auth/logout
    Logout --> AllRevoked: All sessions revoked
```

| Token Type    | TTL | Secret             | Storage            |
| ------------- | --- | ------------------ | ------------------ |
| `access`      | 15m | JWT_ACCESS_SECRET  | Client memory only |
| `first_login` | 15m | JWT_ACCESS_SECRET  | Client memory only |
| `refresh`     | 7d  | JWT_REFRESH_SECRET | SHA-256 hash in DB |

---

## 10. Session Management

- **Max active sessions:** 3 per user
- **Enforcement:** On login, if 3 active (non-revoked, non-expired) refresh tokens exist, the **oldest** is revoked
- **Family tracking:** Each login creates a new token family; rotations stay in the same family
- **Reuse detection:** If a revoked token from a family is presented, ALL tokens in that family are revoked (indicates token theft)

---

## 11. Environment & Configuration

```mermaid
flowchart LR
    ENV[".env file"] --> PARSER["env.ts<br/>Custom parser + Zod validation"]
    PARSER --> ZOD{"Validation passes?"}
    ZOD -->|No| EXIT["process.exit(1)"]
    ZOD -->|Yes| EXPORT["export const env: EnvConfig"]
    EXPORT --> NEST_CONFIG["ConfigModule.forRoot()<br/>app.config.ts + jwt.config.ts"]
    NEST_CONFIG --> SERVICES["Injected via ConfigService"]
```

| Variable                 | Required | Default       | Description                           |
| ------------------------ | -------- | ------------- | ------------------------------------- |
| `NODE_ENV`               | Yes      | `development` | `development` / `production` / `test` |
| `PORT`                   | Yes      | `3000`        | Server port                           |
| `DATABASE_URL`           | Yes      | —             | PostgreSQL connection string          |
| `JWT_ACCESS_SECRET`      | Yes      | —             | HMAC secret for access tokens         |
| `JWT_REFRESH_SECRET`     | Yes      | —             | HMAC secret for refresh tokens        |
| `JWT_ACCESS_EXPIRES_IN`  | No       | `15m`         | Access token TTL                      |
| `JWT_REFRESH_EXPIRES_IN` | No       | `7d`          | Refresh token TTL                     |

---

## 12. Infrastructure

```mermaid
graph LR
    subgraph Docker["Docker Compose (Local Dev)"]
        PG[PostgreSQL 16 Alpine<br/>Port 5432<br/>postgres/postgres]
        VOL[(postgres_data volume)]
    end

    subgraph App["Node.js Process"]
        NEST[NestJS App<br/>Port 3000]
    end

    NEST -->|DATABASE_URL| PG
    PG --- VOL
```

### Key Commands

| Command                    | Purpose                    |
| -------------------------- | -------------------------- |
| `pnpm db:start`            | Start PostgreSQL container |
| `pnpm prisma:migrate:dev`  | Run migrations (dev)       |
| `pnpm prisma:seed`         | Seed database              |
| `pnpm start:dev`           | Start with hot reload      |
| `pnpm build && pnpm start` | Production build + start   |

---

## 13. Error Handling Strategy

```mermaid
flowchart TD
    EXC[Exception Thrown] --> TYPE{Exception Type}

    TYPE -->|HttpException| HTTP[Return status + message]
    TYPE -->|Prisma P2002| CONFLICT[409 — Unique constraint violated]
    TYPE -->|Prisma P2025| NF[404 — Record not found]
    TYPE -->|Prisma other| ISE1[500 — Database error]
    TYPE -->|Unknown| ISE2[500 — Internal server error]

    HTTP & CONFLICT & NF & ISE1 & ISE2 --> LOG{Status >= 500?}
    LOG -->|Yes| ERROR_LOG[logger.error with stack trace]
    LOG -->|No| WARN_LOG[logger.warn]
    ERROR_LOG & WARN_LOG --> RESPONSE[JSON error envelope]
```

---

## 14. Data Flow Examples

### Creating a Teacher

```mermaid
sequenceDiagram
    participant Admin as Admin Client
    participant UC as UsersController
    participant US as UsersService
    participant DB as PostgreSQL

    Admin->>UC: POST /users/teacher<br/>{firstName, lastName, mobileNumber, employeeCode}
    Note over UC: @Roles(ADMIN) guard passes
    UC->>US: createTeacher(dto, adminId)
    US->>DB: Check mobile not taken
    US->>DB: Check employeeCode not taken
    US->>US: Generate temp password
    US->>US: Hash password (bcrypt, 12 rounds)
    US->>DB: Create User + TeacherProfile (nested)
    DB-->>US: User with profile
    US-->>UC: {user, tempPassword}
    UC-->>Admin: 201 {user, tempPassword}
    Note over Admin: Admin shares tempPassword<br/>with teacher out-of-band
```

### First Login → Password Change

```mermaid
sequenceDiagram
    participant T as Teacher Client
    participant AC as AuthController
    participant AS as AuthService
    participant DB as PostgreSQL

    T->>AC: POST /auth/login {mobile, tempPassword}
    AC->>AS: login(dto)
    AS->>DB: Find user, verify password
    Note over AS: isFirstLogin = true
    AS-->>T: 200 {forcePasswordChange: true, firstLoginToken}

    T->>AC: POST /auth/change-password<br/>Bearer: firstLoginToken<br/>{currentPassword, newPassword}
    Note over AC: JwtChangePasswordGuard accepts first_login token
    AC->>AS: changePassword(userId, 'first_login', dto)
    AS->>DB: Verify current password
    AS->>DB: Update password + set isFirstLogin=false
    AS->>AS: Generate access + refresh tokens
    AS->>DB: Store refresh token
    AS-->>T: 200 {accessToken, refreshToken, user}
```

---

## 15. Known Limitations & Future Work

| Area                     | Current State                        | Recommended Fix                           |
| ------------------------ | ------------------------------------ | ----------------------------------------- |
| Rate limiting            | None                                 | Add `@nestjs/throttler` on auth endpoints |
| Temp password generation | Modulo bias in random char selection | Use `crypto.randomInt()`                  |
| User creation uniqueness | Check-then-act race condition        | Rely on DB constraint + handle P2002      |
| Term date validation     | No overlap detection between terms   | Add overlap check in service              |
| Tests                    | Scaffold only ("should be defined")  | Write integration + unit tests            |
| Unused deps              | `@nestjs/axios` installed but unused | Remove                                    |
| .env parsing             | Custom hand-rolled parser            | Replace with `dotenv.config()`            |

---

## 16. Enums Reference

```typescript
// User roles
enum Role {
    ADMIN,
    TEACHER,
    STUDENT,
}

// Teacher assignment types
enum TeacherClassRole {
    CLASS_TEACHER,
    SUBJECT_TEACHER,
}

// Student enrollment lifecycle
enum EnrollmentStatus {
    ACTIVE,
    PROMOTED,
    FAILED,
    TRANSFERRED,
    WITHDRAWN,
}
```

---

## 17. Security Measures

| Measure                 | Implementation                                                            |
| ----------------------- | ------------------------------------------------------------------------- |
| Password hashing        | bcrypt with 12 salt rounds                                                |
| Token storage           | Only SHA-256 hash stored in DB, never raw token                           |
| Token rotation          | Every refresh invalidates previous token                                  |
| Reuse detection         | Replaying revoked token kills entire token family                         |
| Session limiting        | Max 3 active sessions per user                                            |
| Input validation        | class-validator + whitelist (strips unknown fields)                       |
| First-login enforcement | Must change temp password before accessing system                         |
| Access isolation        | Teachers limited to assigned sections/subjects + approved access requests |
| Deactivation            | Deactivated users rejected at strategy level on every request             |
