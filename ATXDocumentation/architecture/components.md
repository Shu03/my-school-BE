# Components

## Module Architecture

The application consists of 16 NestJS modules. Each feature module follows a consistent pattern: **Module → Controller → Service → PrismaService**.

### Infrastructure Modules

| Module | Path | Responsibility | Scope |
|--------|------|----------------|-------|
| **PrismaModule** | `src/modules/prisma/` | Database client lifecycle (connect/disconnect) | `@Global` — available everywhere |
| **HealthModule** | `src/modules/health/` | Health check endpoint (`/health`) | Imports TerminusModule |
| **ConfigModule** | (NestJS built-in) | Environment config (`app`, `jwt` namespaces) | `isGlobal: true` |

### Feature Modules

| Module | Path | Domain | Routes | Exports |
|--------|------|--------|--------|---------|
| **AuthModule** | `src/modules/auth/` | Authentication, token management | 6 | AuthService |
| **UsersModule** | `src/modules/users/` | User CRUD, role creation | 8 | UsersService |
| **AcademicYearsModule** | `src/modules/academic-years/` | Academic year + term lifecycle | 10 | AcademicYearsService |
| **SectionsModule** | `src/modules/sections/` | Class/section management | 4 | SectionsService |
| **SubjectsModule** | `src/modules/subjects/` | Subject catalog | 5 | SubjectsService |
| **TeachersModule** | `src/modules/teachers/` | Teacher profiles, permissions, class assignments | 15 | TeachersService |
| **StudentsModule** | `src/modules/students/` | Student profiles, enrollment, promotion | 7 | StudentsService |
| **AttendanceModule** | `src/modules/attendance/` | Daily attendance marking + summary | 4 | AttendanceService |
| **ExamsModule** | `src/modules/exams/` | Exam creation, finalization, discarding | 10 | ExamsService |
| **GradesModule** | `src/modules/grades/` | Grade entry, reporting, history | 4 | GradesService |
| **HomeworkModule** | `src/modules/homework/` | Homework assignments | 5 | HomeworkService |
| **AnnouncementsModule** | `src/modules/announcements/` | School announcements | 5 | AnnouncementsService |
| **FeesModule** | `src/modules/fees/` | Fee structures, records, payments | 9 | FeesService |
| **SchoolModule** | `src/modules/school/` | School settings + holidays | 5 | SchoolService |

### Shared Infrastructure (`src/common/`)

| Component | Path | Responsibility |
|-----------|------|----------------|
| **Constants** | `common/constants/app.constants.ts` | All app constants: pagination, JWT TTL, permissions, error messages |
| **@Public** | `common/decorators/public.decorator.ts` | Marks routes as unauthenticated |
| **@CurrentUser** | `common/decorators/current-user.decorator.ts` | Extracts JWT payload from request |
| **@Roles** | `common/decorators/roles.decorator.ts` | Sets required roles metadata |
| **@Permissions** | `common/decorators/permissions.decorator.ts` | Sets required permissions metadata |
| **GlobalExceptionFilter** | `common/filters/http-exception.filter.ts` | Catches all exceptions, handles Prisma P2002/P2025 |
| **JwtAuthGuard** | `common/guards/jwt-auth.guard.ts` | Global auth guard (Passport JWT) |
| **JwtStrategy** | `common/guards/jwt.strategy.ts` | Validates access tokens, loads user |
| **JwtFirstLoginStrategy** | `common/guards/jwt-first-login.strategy.ts` | Validates first_login tokens |
| **JwtChangePasswordGuard** | `common/guards/jwt-change-password.guard.ts` | Accepts both access + first_login tokens |
| **RolesGuard** | `common/guards/roles.guard.ts` | Enforces @Roles metadata |
| **PermissionsGuard** | `common/guards/permissions.guard.ts` | Enforces @Permissions metadata (ADMIN bypasses) |
| **ResponseInterceptor** | `common/interceptors/response.interceptor.ts` | Standard `{ success, data }` envelope |
| **Password Utils** | `common/utils/password.util.ts` | bcrypt hash/compare, SHA-256 token hashing |

## Module Interactions

### Cross-Module Dependencies

```mermaid
graph TD
    AY["AcademicYearsModule<br/>🏆 Most depended-upon"]

    AY --> Sections
    AY --> Attendance
    AY --> Exams
    AY --> Grades
    AY --> Homework
    AY --> School
    AY --> Students
    AY --> Fees

    School --> Attendance
    Exams --> Grades
    Sections --> Students
    Fees --> Students
    Users --> Auth

    style AY fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
    style Students fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

**Key dependency facts**:
- `AcademicYearsModule` is imported by **8 modules** — it provides `findCurrent()` which most operations need
- `StudentsModule` imports 3 modules (AcademicYears, Sections, Fees) — heaviest consumer
- `GradesModule` imports ExamsModule + AcademicYearsModule
- `AuthModule` imports UsersModule + JwtModule
- `AttendanceModule` imports SchoolModule (for `isSchoolDay()`) + AcademicYearsModule

### Data Flow Between Modules

```mermaid
flowchart LR
    subgraph Enrollment["Student Enrollment Flow"]
        direction TB
        Students2["StudentsService<br/>.enroll()"]
        Students2 -->|"generateFeeRecordForStudent()"| Fees2["FeesService"]
        Students2 -->|"findOne(sectionId)"| Sections2["SectionsService"]
    end

    subgraph AttendanceFlow["Attendance Marking Flow"]
        direction TB
        Att["AttendanceService<br/>.mark()"]
        Att -->|"isSchoolDay(date)"| SchoolSvc["SchoolService"]
        Att -->|"findCurrent()"| AYSvc["AcademicYearsService"]
    end

    subgraph GradeFlow["Grade Entry Flow"]
        direction TB
        Grade["GradesService<br/>.submitGrades()"]
        Grade -->|"findOne(examId)"| ExamSvc["ExamsService"]
    end

    subgraph AuthFlow["Authentication Flow"]
        direction TB
        AuthSvc["AuthService<br/>.login()"]
        AuthSvc -->|"findByMobile()"| UserSvc["UsersService"]
    end

    style Enrollment fill:#e8f5e9,stroke:#2e7d32
    style AttendanceFlow fill:#fff3e0,stroke:#e65100
    style GradeFlow fill:#e3f2fd,stroke:#1565c0
    style AuthFlow fill:#fce4ec,stroke:#c62828
```

| Source Module | Target Module | Interaction |
|---------------|---------------|-------------|
| Students → Fees | `FeesService.generateFeeRecordForStudent()` | Called during enrollment and promotion |
| Attendance → School | `SchoolService.isSchoolDay()` | Validates date before marking attendance |
| Attendance → AcademicYears | `AcademicYearsService.findCurrent()` | Gets current academic year |
| Grades → Exams | `ExamsService.findOne()` | Validates exam exists and is active |
| Auth → Users | `UsersService.findByMobile()`, `findById()` | User lookup during login/token validation |
