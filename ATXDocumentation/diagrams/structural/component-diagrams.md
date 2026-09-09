# Structural Diagrams

## System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NestJS Application                            │
│                                                                         │
│  ┌─── Global Middleware ──────────────────────────────────────────────┐ │
│  │  Helmet │ CORS │ ThrottlerGuard │ JwtAuthGuard │ RolesGuard │     │ │
│  │  PermissionsGuard │ ValidationPipe │ ResponseInterceptor │        │ │
│  │  GlobalExceptionFilter                                            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── Feature Modules ───────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │ │
│  │  │ Auth        │  │ Users        │  │ Teachers               │   │ │
│  │  │ (6 routes)  │  │ (8 routes)   │  │ (15 routes)            │   │ │
│  │  └─────────────┘  └──────────────┘  │ Presets+Profiles+Assign│   │ │
│  │                                      └────────────────────────┘   │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │ │
│  │  │ Students    │  │ Sections     │  │ Academic Years          │   │ │
│  │  │ (7 routes)  │  │ (4 routes)   │  │ (10 routes)            │   │ │
│  │  │ +Enrollment │  └──────────────┘  │ +Terms                 │   │ │
│  │  │ +Promotion  │                    └────────────────────────┘   │ │
│  │  └─────────────┘                                                  │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │ │
│  │  │ Attendance  │  │ Exams        │  │ Grades                 │   │ │
│  │  │ (4 routes)  │  │ (10 routes)  │  │ (4 routes)             │   │ │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘   │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │ │
│  │  │ Fees        │  │ Homework     │  │ Announcements          │   │ │
│  │  │ (9 routes)  │  │ (5 routes)   │  │ (5 routes)             │   │ │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘   │ │
│  │  ┌─────────────┐  ┌──────────────┐                               │ │
│  │  │ School      │  │ Subjects     │                               │ │
│  │  │ (5 routes)  │  │ (5 routes)   │                               │ │
│  │  └─────────────┘  └──────────────┘                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── Infrastructure ────────────────────────────────────────────────┐ │
│  │  PrismaModule (@Global) │ ConfigModule (isGlobal) │ HealthModule │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  PostgreSQL 16    │
                          │  20 tables        │
                          │  7 enums          │
                          └──────────────────┘
```

## Module Dependency Graph

```
                    ┌─────────────────────┐
                    │  PrismaModule       │ (@Global)
                    │  ConfigModule       │ (isGlobal)
                    └─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌────────────┐  ┌──────────────┐  ┌──────────────┐
     │ Users      │  │ AcademicYears│  │ Subjects     │  (Level 0)
     │ Teachers   │  │              │  │ Announcements│
     └─────┬──────┘  └──────┬───────┘  └──────────────┘
           │                 │
           ▼                 ├────────┬────────┬─────────┬────────┐
     ┌──────────┐            ▼        ▼        ▼         ▼        ▼
     │ Auth     │       Sections   School    Fees     Exams   Homework (Level 1)
     └──────────┘            │        │        │         │
                             │        │        │         │
                             ▼        ▼        │         ▼
                        Students  Attendance   │      Grades     (Level 2)
                        (←Sections, ←Fees)     │
                                               │
                        Students ◄─────────────┘
```

## Database Entity Relationship Diagram

```
┌──────────────────┐          ┌──────────────────┐
│      User        │ 1    0..1│  TeacherProfile   │
│ ─────────────── │──────────│ ─────────────── │
│ id (PK)         │          │ id (PK)          │
│ mobileNumber (U)│          │ userId (U,FK)    │
│ password        │          │ employeeCode (U) │
│ firstName       │          │ joiningDate?     │
│ lastName        │          │ presetId? (FK)   │
│ email? (U)      │          │ permissionOverrides[]│
│ role            │          └────────┬─────────┘
│ isActive        │                   │ 1
│ isFirstLogin    │                   │
└──────┬──────────┘                   ▼ *
       │ 1                 ┌──────────────────────┐
       │                   │TeacherClassAssignment │
       ▼ 0..1              │ id (PK)              │
┌──────────────────┐       │ teacherId (FK)       │
│  StudentProfile  │       │ sectionId (FK)       │
│ id (PK)          │       │ subjectId? (FK)      │
│ userId (U,FK)    │       │ role                 │
│ admissionNumber(U)│      └──────────────────────┘
│ dateOfBirth?     │
└────────┬─────────┘
         │ 1
         ▼ *
┌──────────────────┐       ┌──────────────────┐
│StudentEnrollment │       │   AcademicYear   │
│ id (PK)          │       │ id (PK)          │
│ studentId (FK)   │◄──────│ name (U)         │
│ sectionId (FK)   │       │ startDate        │
│ academicYearId(FK)│       │ endDate          │
│ rollNumber       │       │ isCurrent        │
│ status           │       └────────┬─────────┘
└──────────────────┘                │ 1
                                    ▼ *
                            ┌──────────────────┐
                            │    Section       │
                            │ id (PK)          │
                            │ name             │
                            │ classLevel       │
                            │ academicYearId(FK)│
                            └──────────────────┘
```
