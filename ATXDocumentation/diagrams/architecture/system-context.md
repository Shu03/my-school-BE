# Architecture Diagrams

## System Context

```mermaid
C4Context
    title System Context — my-school-BE

    Person(admin, "School Admin", "Manages school configuration,<br/>users, and academic data")
    Person(teacher, "Teacher", "Manages attendance, exams,<br/>grades, and homework")
    Person(student, "Student", "Views grades, attendance,<br/>and announcements")

    System(api, "my-school-BE", "NestJS Application<br/>/api/v1/*<br/>JWT Auth + Role/Permission<br/>Rate Limiting")

    SystemDb(db, "PostgreSQL 16", "20 tables · 32 indexes<br/>Docker / Managed DB")

    Rel(admin, api, "HTTPS REST", "Bearer JWT")
    Rel(teacher, api, "HTTPS REST", "Bearer JWT")
    Rel(student, api, "HTTPS REST", "Bearer JWT")
    Rel(api, db, "SQL", "Prisma ORM")
```

**Key boundaries**:
- No external API integrations
- No message queues or async processing
- No file storage or CDN
- No caching layer
- Single database, single application instance

## Security Boundary Diagram

```mermaid
graph TD
    subgraph Public["🔓 PUBLIC ZONE"]
        Login["POST /auth/login<br/>rate: 5/min"]
        Refresh["POST /auth/refresh<br/>rate: 10/min"]
        ChangePass["POST /auth/change-password<br/>JwtChangePasswordGuard"]
        Health["GET /health<br/>no auth"]
    end

    Public -->|JwtAuthGuard| Authenticated

    subgraph Authenticated["🔑 AUTHENTICATED ZONE (any role)"]
        CurrentYear["GET /academic-years/current"]
        SectionsRead["GET /sections"]
        SubjectsRead["GET /subjects"]
        Holidays["GET /school/holidays"]
        AnnouncementsRead["GET /announcements"]
        Me["GET /auth/me"]
        Logout["POST /auth/logout"]
    end

    Authenticated -->|RolesGuard| RoleRestricted

    subgraph RoleRestricted["👤 ROLE-RESTRICTED ZONE"]
        direction LR
        AdminTeacher["ADMIN + TEACHER:<br/>attendance, exams, grades,<br/>homework, announcements<br/>(with @Permissions)"]
        AdminOnly["ADMIN ONLY:<br/>users CRUD, school settings,<br/>exam unlock/discard,<br/>promote, teacher presets"]
    end

    RoleRestricted -->|PermissionsGuard| PermRestricted

    subgraph PermRestricted["🛡️ PERMISSION-RESTRICTED ZONE"]
        ATTENDANCE_WRITE["ATTENDANCE_WRITE<br/>POST /attendance/mark"]
        ATTENDANCE_READ["ATTENDANCE_READ<br/>GET /attendance"]
        GRADES_WRITE["GRADES_WRITE<br/>POST exams, grades, finalize"]
        GRADES_READ["GRADES_READ<br/>GET /grades/summary"]
        FEES_MANAGE["FEES_MANAGE<br/>fee structures, payments"]
        HOMEWORK_MANAGE["HOMEWORK_MANAGE<br/>POST/PATCH/DELETE homework"]
        ANNOUNCEMENTS_MANAGE["ANNOUNCEMENTS_MANAGE<br/>POST/PATCH/DELETE"]
        SECTION_MANAGE["SECTION_MANAGE<br/>POST/PATCH sections"]
        SUBJECT_MANAGE["SUBJECT_MANAGE<br/>POST/PATCH subjects"]
        ACADEMIC_YEAR_MANAGE["ACADEMIC_YEAR_MANAGE<br/>POST/PATCH academic-years"]
    end

    note["Note: ADMIN bypasses<br/>all permission checks"]

    style Public fill:#e8f5e9,stroke:#4caf50
    style Authenticated fill:#fff8e1,stroke:#ff8f00
    style RoleRestricted fill:#fff3e0,stroke:#e65100
    style PermRestricted fill:#fce4ec,stroke:#c62828
```

## Data Flow Diagram

```mermaid
graph TD
    FE["🖥️ Frontend"]

    FE -->|REST API JSON| AuthDomain
    FE -->|REST API JSON| MgmtDomain
    FE -->|REST API JSON| OpsDomain

    subgraph AuthDomain["Auth Domain"]
        Login2["Login"]
        Refresh2["Refresh"]
        Password["Password"]
        Sessions["Sessions"]
    end

    subgraph MgmtDomain["Management Domain"]
        Users2["Users"]
        Teachers2["Teachers"]
        Students2["Students"]
        Sections2["Sections"]
        Subjects2["Subjects"]
        AcadYears["AcademicYears"]
        School2["School"]
    end

    subgraph OpsDomain["Operations Domain"]
        Attendance2["Attendance"]
        ExamsGrades["Exams / Grades"]
        Homework2["Homework"]
        Fees2["Fees"]
        Announcements2["Announcements"]
    end

    AuthDomain --> Prisma["PrismaService"]
    MgmtDomain --> Prisma
    OpsDomain --> Prisma
    Prisma --> DB2[("PostgreSQL")]

    style AuthDomain fill:#e3f2fd,stroke:#1565c0
    style MgmtDomain fill:#e8f5e9,stroke:#2e7d32
    style OpsDomain fill:#fff3e0,stroke:#e65100
    style DB2 fill:#f3e5f5,stroke:#7b1fa2
```
