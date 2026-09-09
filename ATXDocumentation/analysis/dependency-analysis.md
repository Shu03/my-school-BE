# Dependency Analysis

## Internal Dependency Graph

```mermaid
graph TD
    subgraph Global["Global (available everywhere)"]
        Config["ConfigModule<br/>(isGlobal)"]
        Prisma["PrismaModule<br/>(@Global)"]
    end

    subgraph Level0["Level 0 — No module imports"]
        Users["UsersModule<br/>(8 routes)"]
        AY["AcademicYearsModule<br/>(10 routes)"]
        Subjects["SubjectsModule<br/>(5 routes)"]
        Teachers["TeachersModule<br/>(15 routes)"]
        Announcements["AnnouncementsModule<br/>(5 routes)"]
    end

    subgraph Level1["Level 1"]
        Auth["AuthModule ← Users"]
        Sections["SectionsModule ← AcYear"]
        School["SchoolModule ← AcYear"]
        Fees["FeesModule ← AcYear"]
        Exams["ExamsModule ← AcYear"]
        Homework["HomeworkModule ← AcYear"]
    end

    subgraph Level2["Level 2"]
        Attendance["AttendanceModule<br/>← School + AcYear"]
        Grades["GradesModule<br/>← Exams + AcYear"]
        Students["StudentsModule<br/>← AcYear + Sections + Fees"]
    end

    Prisma -.-> Level0
    Prisma -.-> Level1
    Prisma -.-> Level2

    Users --> Auth
    AY --> Sections
    AY --> School
    AY --> Fees
    AY --> Exams
    AY --> Homework
    AY --> Attendance
    AY --> Grades
    AY --> Students
    School --> Attendance
    Exams --> Grades
    Sections --> Students
    Fees --> Students

    style Global fill:#f3e5f5,stroke:#7b1fa2
    style Level0 fill:#e8f5e9,stroke:#388e3c
    style Level1 fill:#fff8e1,stroke:#f9a825
    style Level2 fill:#fce4ec,stroke:#c62828
```

## External Dependency Criticality

### Critical Path Dependencies
These packages, if broken, would prevent the application from starting:

| Package | Role | Alternatives |
|---------|------|-------------|
| @nestjs/core + common | Framework | None (core to architecture) |
| @prisma/client + adapter-pg | ORM | TypeORM, Drizzle, Knex |
| passport + passport-jwt | Auth | Custom JWT implementation |
| bcrypt | Password hashing | argon2, scrypt |
| pg | DB driver | postgres.js |

### Non-Critical Dependencies

| Package | Role | Impact if Removed |
|---------|------|-------------------|
| @nestjs/swagger | API docs | No docs in dev, no production impact |
| @nestjs/terminus | Health check | Custom health check needed |
| date-fns | Date math | Could use native Date/Intl APIs |
| zod | Env validation | Fall back to manual checks |
| helmet | Security headers | Manual header setting |
| @nestjs/axios | HTTP client | **Unused — safe to remove** |

## Dependency Freshness

All dependencies are on current major versions. No EOL or deprecated packages detected.

| Category | Status |
|----------|--------|
| NestJS ecosystem (11.x) | **Latest** — NestJS 11 released 2025 |
| Prisma (7.x) | **Latest** — Prisma 7 released 2025 |
| TypeScript (5.7) | **Current** |
| Jest (30.x) | **Latest** |
| ESLint (9.x) | **Latest** (flat config) |

### Version Mismatch
- `jest@30.0.0` + `ts-jest@29.2.5`: ts-jest 29 may not fully support Jest 30 APIs. Monitor for ts-jest 30.x release.

## Transitive Dependency Concerns

The application uses `@prisma/adapter-pg` which depends on the `pg` package. This introduces:
- Native binary dependency (pg-native optional)
- Connection pool management handled by Prisma, not directly configurable

No other significant transitive dependency concerns identified.
