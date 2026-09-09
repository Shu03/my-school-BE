# Architecture Diagrams

## System Context

```
┌─────────────────────┐
│   School Admin       │
│   (Web Browser)      │─────┐
└─────────────────────┘      │
                              │  HTTPS REST API
┌─────────────────────┐      │  (Bearer JWT)
│   Teacher            │      │
│   (Web/Mobile)       │──────┤
└─────────────────────┘      │
                              │
┌─────────────────────┐      │     ┌──────────────────────────────┐
│   Student            │      │     │    my-school-BE               │
│   (Web/Mobile)       │──────┼────>│    NestJS Application        │
└─────────────────────┘      │     │                              │
                              │     │  /api/v1/*                   │
                              │     │  JWT Auth + Role/Permission  │
                              │     │  Rate Limiting               │
                              │     └──────────────┬───────────────┘
                              │                    │
                              │                    │ SQL (Prisma)
                              │                    ▼
                              │     ┌──────────────────────────────┐
                              │     │    PostgreSQL 16              │
                              │     │    (Docker / Managed DB)      │
                              │     │    20 tables, 32 indexes      │
                              │     └──────────────────────────────┘
```

**Key boundaries**:
- No external API integrations
- No message queues or async processing
- No file storage or CDN
- No caching layer
- Single database, single application instance

## Security Boundary Diagram

```
┌──────────────── PUBLIC ZONE ─────────────────────────────────┐
│                                                               │
│  /api/v1/auth/login          (rate limited: 5/min)           │
│  /api/v1/auth/refresh        (rate limited: 10/min)          │
│  /api/v1/auth/change-password (with JwtChangePasswordGuard)  │
│  /api/v1/health              (no auth required)              │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                    JwtAuthGuard (global)
                            │
┌──────────────── AUTHENTICATED ZONE ──────────────────────────┐
│                                                               │
│  /api/v1/academic-years/current  (any role)                  │
│  /api/v1/sections               (any role, read)             │
│  /api/v1/subjects               (any role, read)             │
│  /api/v1/school/holidays        (any role, read)             │
│  /api/v1/announcements          (any role, read)             │
│  /api/v1/auth/me                (any role)                   │
│  /api/v1/auth/logout            (any role)                   │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                       RolesGuard
                            │
┌──────────────── ROLE-RESTRICTED ZONE ────────────────────────┐
│                                                               │
│  ADMIN + TEACHER:                                            │
│    /attendance, /exams, /grades, /homework, /announcements   │
│    (with @Permissions guard)                                  │
│                                                               │
│  ADMIN ONLY:                                                  │
│    /users (all CRUD)                                          │
│    /school/settings                                           │
│    /exams/:id/unlock, /exams/:id/discard                     │
│    /students/promote                                          │
│    /teachers/presets                                           │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                    PermissionsGuard
                            │
┌──────────────── PERMISSION-RESTRICTED ZONE ──────────────────┐
│                                                               │
│  ATTENDANCE_WRITE: POST /attendance/mark                     │
│  ATTENDANCE_READ:  GET /attendance, GET /attendance/summary   │
│  GRADES_WRITE:     POST exams, POST grades, finalize         │
│  GRADES_READ:      GET grades/summary                        │
│  FEES_MANAGE:      POST/PATCH fee structures, record payment │
│  HOMEWORK_MANAGE:  POST/PATCH/DELETE homework                │
│  ANNOUNCEMENTS_MANAGE: POST/PATCH/DELETE announcements       │
│  SECTION_MANAGE:   POST/PATCH sections                       │
│  SUBJECT_MANAGE:   POST/PATCH subjects                       │
│  ACADEMIC_YEAR_MANAGE: POST/PATCH academic-years             │
│                                                               │
│  Note: ADMIN bypasses all permission checks                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
                    ┌──────────┐
                    │ Frontend │
                    └────┬─────┘
                         │
                    REST API (JSON)
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
    ┌──────────┐  ┌────────────┐  ┌──────────────┐
    │ Auth     │  │ Management │  │ Operations   │
    │ Domain   │  │ Domain     │  │ Domain       │
    │          │  │            │  │              │
    │ Login    │  │ Users      │  │ Attendance   │
    │ Refresh  │  │ Teachers   │  │ Exams/Grades │
    │ Password │  │ Students   │  │ Homework     │
    │ Sessions │  │ Sections   │  │ Fees         │
    │          │  │ Subjects   │  │ Announcements│
    │          │  │ AcadYears  │  │              │
    └────┬─────┘  │ School     │  └──────┬───────┘
         │        └──────┬─────┘         │
         │               │               │
         └───────────────┼───────────────┘
                         │
                    PrismaService
                         │
                    ┌────┴─────┐
                    │PostgreSQL│
                    └──────────┘
```
