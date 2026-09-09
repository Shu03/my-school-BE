# Modules

## Module Registry

| # | Module | Path | Imports | Exports | Routes |
|---|--------|------|---------|---------|--------|
| 1 | PrismaModule | `src/modules/prisma/` | — | PrismaService | 0 |
| 2 | HealthModule | `src/modules/health/` | TerminusModule | — | 1 |
| 3 | AuthModule | `src/modules/auth/` | JwtModule, UsersModule | AuthService | 6 |
| 4 | UsersModule | `src/modules/users/` | — | UsersService | 8 |
| 5 | AcademicYearsModule | `src/modules/academic-years/` | — | AcademicYearsService | 10 |
| 6 | SectionsModule | `src/modules/sections/` | AcademicYearsModule | SectionsService | 4 |
| 7 | SubjectsModule | `src/modules/subjects/` | — | SubjectsService | 5 |
| 8 | TeachersModule | `src/modules/teachers/` | — | TeachersService | 15 |
| 9 | StudentsModule | `src/modules/students/` | AcademicYears, Sections, Fees | StudentsService | 7 |
| 10 | AttendanceModule | `src/modules/attendance/` | School, AcademicYears | AttendanceService | 4 |
| 11 | ExamsModule | `src/modules/exams/` | AcademicYearsModule | ExamsService | 10 |
| 12 | GradesModule | `src/modules/grades/` | Exams, AcademicYears | GradesService | 4 |
| 13 | HomeworkModule | `src/modules/homework/` | AcademicYearsModule | HomeworkService | 5 |
| 14 | AnnouncementsModule | `src/modules/announcements/` | — | AnnouncementsService | 5 |
| 15 | FeesModule | `src/modules/fees/` | AcademicYearsModule | FeesService | 9 |
| 16 | SchoolModule | `src/modules/school/` | AcademicYearsModule | SchoolService | 5 |

## Module Dependency Graph

```
Level 0 (no dependencies):
  PrismaModule (@Global), ConfigModule (isGlobal), UsersModule,
  AcademicYearsModule, SubjectsModule, TeachersModule, AnnouncementsModule

Level 1 (depends on Level 0):
  AuthModule ← UsersModule
  SectionsModule ← AcademicYearsModule
  SchoolModule ← AcademicYearsModule
  FeesModule ← AcademicYearsModule
  ExamsModule ← AcademicYearsModule
  HomeworkModule ← AcademicYearsModule

Level 2 (depends on Level 0+1):
  AttendanceModule ← SchoolModule + AcademicYearsModule
  GradesModule ← ExamsModule + AcademicYearsModule
  StudentsModule ← AcademicYearsModule + SectionsModule + FeesModule
```

## Boundary Analysis

### True Business Boundaries
- **Auth**: Self-contained authentication domain (login, tokens, passwords). Only imports UsersModule.
- **Fees**: Encapsulated fee management (structures, records, payments). Called by Students but doesn't reach back.
- **School**: Standalone settings + holidays. Only consumed by Attendance.

### Organizational-Only Boundaries
- **Students / Sections / AcademicYears**: These three form a tightly coupled cluster. Students imports both Sections and AcademicYears, and all three share enrollment-related logic.
- **Exams / Grades**: Grades is effectively a sub-module of Exams — it imports ExamsModule and operates on exam-owned data.

### Hidden Coupling (via PrismaService)
Despite NestJS module boundaries, services query across domain boundaries through PrismaService:
- AttendanceService queries `teacherClassAssignment`, `studentEnrollment`, `schoolSettings`, `holiday`
- ExamsService queries `teacherClassAssignment`, `studentEnrollment`, `subject`
- FeesService queries `studentEnrollment`, `section`

This means the true coupling is broader than what the NestJS module imports suggest.

## Module Responsibilities

### AcademicYearsModule (Most Critical)
Imported by 8 modules. Provides `findCurrent()` — the cornerstone operation that most features require to scope data by academic year. If this service fails, most of the application stops functioning.

### StudentsModule (Most Complex)
Imports 3 modules. Handles enrollment, promotion (bulk), search. Calls FeesService for auto-fee-record generation. Contains the heaviest business logic (promotion workflow).

### TeachersModule (Most Routes)
15 routes across 3 sub-domains: presets, profiles, assignments. Self-contained — no imports. Complex permission model with presets + overrides.

### AuthModule (Most Security-Critical)
Handles token issuance, rotation, and reuse detection. Manages session limits and password lifecycle. Entry point for all authenticated operations.
