# Prisma Schema Documentation

## Overview

This project uses a **multi-file Prisma schema** structure. The schema is split across multiple `.prisma` files organized by domain, making it easier to maintain and navigate as the application grows. Prisma merges all files in the `prisma/schema/` directory at build time.

**Database:** PostgreSQL  
**ORM:** Prisma (with `prisma-client-js` generator)  
**Schema path:** `prisma/schema/` (configured in `prisma.config.ts`)

---

## Directory Structure

```
prisma/schema/
├── base.prisma           # Generator & datasource configuration
├── user.prisma            # User accounts & authentication
├── teacher.prisma         # Teacher profiles, permissions & class assignments
├── student.prisma         # Student profiles & enrollments
├── academic.prisma        # Academic years, classes & subjects
├── SCHEMA.md              # This documentation file
└── migrations/
    └── 20260311173555_init/
        └── migration.sql  # Initial migration
```

---

## Schema Files

### 1. `base.prisma` — Configuration

Contains the Prisma generator and datasource configuration.

| Setting    | Value              |
|------------|--------------------|
| Generator  | `prisma-client-js` |
| Datasource | `postgresql`       |

---

### 2. `user.prisma` — Users & Authentication

Manages user accounts and authentication tokens.

#### Enums

| Enum   | Values                       | Description                  |
|--------|------------------------------|------------------------------|
| `Role` | `ADMIN`, `TEACHER`, `STUDENT`| Defines user roles in the system |

#### Models

##### `User` → `users`

The central identity model. Every person in the system (admin, teacher, student) has a User record.

| Field          | Type       | Constraints                    | Description                                  |
|----------------|------------|--------------------------------|----------------------------------------------|
| `id`           | `String`   | PK, UUID                      | Unique identifier                            |
| `mobileNumber` | `String`   | Unique                         | Primary login credential                     |
| `password`     | `String`   | —                              | Hashed password                              |
| `firstName`    | `String`   | —                              | User's first name                            |
| `lastName`     | `String`   | —                              | User's last name                             |
| `email`        | `String?`  | Unique (optional)              | Optional email address                       |
| `role`         | `Role`     | —                              | User role (ADMIN / TEACHER / STUDENT)        |
| `isActive`     | `Boolean`  | Default: `true`                | Soft delete / account status flag            |
| `isFirstLogin` | `Boolean`  | Default: `true`                | Tracks if user has completed initial login   |
| `createdAt`    | `DateTime` | Default: `now()`               | Record creation timestamp                    |
| `updatedAt`    | `DateTime` | Auto-updated                   | Last update timestamp                        |
| `createdById`  | `String?`  | FK → `users.id`                | Which user created this account              |

**Relations:**
- Self-referential `createdBy` / `createdUsers` — tracks which admin/teacher created a user
- `refreshTokens` → `RefreshToken[]` — active refresh tokens
- `teacherProfile` → `TeacherProfile?` — one-to-one (if role is TEACHER)
- `studentProfile` → `StudentProfile?` — one-to-one (if role is STUDENT)

##### `RefreshToken` → `refresh_tokens`

Stores hashed refresh tokens for JWT-based authentication with token rotation and family-based revocation.

| Field       | Type       | Constraints         | Description                              |
|-------------|------------|---------------------|------------------------------------------|
| `id`        | `String`   | PK, UUID            | Unique identifier                        |
| `userId`    | `String`   | FK → `users.id`     | Owning user                              |
| `tokenHash` | `String`   | Unique              | SHA-256 hash of the refresh token        |
| `family`    | `String`   | Indexed             | Token family for rotation detection      |
| `isRevoked` | `Boolean`  | Default: `false`    | Revocation flag                          |
| `expiresAt` | `DateTime` | —                   | Token expiration time                    |
| `createdAt` | `DateTime` | Default: `now()`    | Token creation timestamp                 |

**Indexes:** `userId`, `family`  
**On Delete:** Cascade (when user is deleted, all tokens are removed)

---

### 3. `teacher.prisma` — Teachers & Permissions

Manages teacher profiles, permission presets, and class/subject assignments.

#### Enums

| Enum               | Values                              | Description                        |
|--------------------|-------------------------------------|------------------------------------|
| `TeacherClassRole` | `CLASS_TEACHER`, `SUBJECT_TEACHER`  | Role a teacher plays in a class    |

#### Models

##### `PermissionPreset` → `permission_presets`

Reusable permission templates that can be assigned to multiple teachers.

| Field         | Type       | Constraints    | Description                              |
|---------------|------------|----------------|------------------------------------------|
| `id`          | `String`   | PK, UUID       | Unique identifier                        |
| `name`        | `String`   | Unique         | Preset name (e.g., "Senior Teacher")     |
| `permissions` | `String[]` | —              | Array of permission strings              |
| `createdAt`   | `DateTime` | Default: `now()` | Record creation timestamp              |
| `updatedAt`   | `DateTime` | Auto-updated   | Last update timestamp                    |

**Relations:**
- `teachers` → `TeacherProfile[]` — teachers using this preset

##### `TeacherProfile` → `teacher_profiles`

Extended profile for users with the TEACHER role.

| Field                 | Type       | Constraints                      | Description                            |
|-----------------------|------------|----------------------------------|----------------------------------------|
| `id`                  | `String`   | PK, UUID                        | Unique identifier                      |
| `userId`              | `String`   | Unique, FK → `users.id`         | Link to User account                   |
| `employeeCode`        | `String`   | Unique                           | HR employee code                       |
| `joiningDate`         | `DateTime?`| —                                | Date of joining                        |
| `presetId`            | `String?`  | FK → `permission_presets.id`     | Assigned permission preset             |
| `permissionOverrides` | `String[]` | —                                | Per-teacher permission overrides       |
| `createdAt`           | `DateTime` | Default: `now()`                 | Record creation timestamp              |
| `updatedAt`           | `DateTime` | Auto-updated                     | Last update timestamp                  |

**Relations:**
- `user` → `User` — one-to-one (CASCADE on delete)
- `preset` → `PermissionPreset?` — optional permission preset
- `classesAsTeacher` → `Class[]` — classes where this teacher is the class teacher
- `classAssignments` → `TeacherClassAssignment[]` — subject/class assignments

##### `TeacherClassAssignment` → `teacher_class_assignments`

Junction table linking teachers to classes and optionally subjects.

| Field       | Type               | Constraints                     | Description                      |
|-------------|--------------------|---------------------------------|----------------------------------|
| `id`        | `String`           | PK, UUID                       | Unique identifier                |
| `teacherId` | `String`           | FK → `teacher_profiles.id`     | Assigned teacher                 |
| `classId`   | `String`           | FK → `classes.id`              | Assigned class                   |
| `subjectId` | `String?`          | FK → `subjects.id`             | Assigned subject (optional)      |
| `role`      | `TeacherClassRole` | —                               | CLASS_TEACHER or SUBJECT_TEACHER |
| `createdAt` | `DateTime`         | Default: `now()`                | Record creation timestamp        |

**Unique constraint:** `(teacherId, classId, subjectId)` — prevents duplicate assignments  
**Indexes:** `classId`, `teacherId`  
**On Delete:** Cascade on both `teacherId` and `classId`

---

### 4. `student.prisma` — Students & Enrollments

Manages student profiles and their year-wise class enrollments.

#### Enums

| Enum               | Values                                                     | Description                |
|--------------------|-------------------------------------------------------------|----------------------------|
| `EnrollmentStatus` | `ACTIVE`, `PROMOTED`, `FAILED`, `TRANSFERRED`, `WITHDRAWN` | Student's enrollment state |

#### Models

##### `StudentProfile` → `student_profiles`

Extended profile for users with the STUDENT role.

| Field             | Type        | Constraints              | Description                   |
|-------------------|-------------|--------------------------|-------------------------------|
| `id`              | `String`    | PK, UUID                 | Unique identifier             |
| `userId`          | `String`    | Unique, FK → `users.id`  | Link to User account          |
| `admissionNumber` | `String`    | Unique                   | School admission number       |
| `dateOfBirth`     | `DateTime?` | —                        | Date of birth                 |
| `createdAt`       | `DateTime`  | Default: `now()`         | Record creation timestamp     |
| `updatedAt`       | `DateTime`  | Auto-updated             | Last update timestamp         |

**Relations:**
- `user` → `User` — one-to-one (CASCADE on delete)
- `enrollments` → `StudentEnrollment[]` — enrollment history

##### `StudentEnrollment` → `student_enrollments`

Tracks which class a student is enrolled in for each academic year.

| Field            | Type               | Constraints                        | Description                      |
|------------------|--------------------|------------------------------------|----------------------------------|
| `id`             | `String`           | PK, UUID                          | Unique identifier                |
| `studentId`      | `String`           | FK → `student_profiles.id`        | Enrolled student                 |
| `classId`        | `String`           | FK → `classes.id`                 | Enrolled class                   |
| `academicYearId` | `String`           | FK → `academic_years.id`          | Academic year of enrollment      |
| `rollNumber`     | `String`           | —                                  | Roll number within the class     |
| `status`         | `EnrollmentStatus` | Default: `ACTIVE`                  | Current enrollment status        |
| `createdAt`      | `DateTime`         | Default: `now()`                   | Record creation timestamp        |
| `updatedAt`      | `DateTime`         | Auto-updated                       | Last update timestamp            |

**Unique constraint:** `(studentId, academicYearId)` — one enrollment per student per year  
**Indexes:** `(classId, academicYearId)`, `studentId`  
**On Delete:** Cascade on `studentId`; Restrict on `classId` and `academicYearId`

---

### 5. `academic.prisma` — Academic Structure

Defines the school's academic structure: years, classes, and subjects.

#### Models

##### `AcademicYear` → `academic_years`

Represents a school academic year / session.

| Field       | Type       | Constraints      | Description                          |
|-------------|------------|------------------|--------------------------------------|
| `id`        | `String`   | PK, UUID         | Unique identifier                    |
| `name`      | `String`   | Unique           | Year name (e.g., "2025-26")         |
| `startDate` | `DateTime` | —                | Year start date                      |
| `endDate`   | `DateTime` | —                | Year end date                        |
| `isCurrent` | `Boolean`  | Default: `false` | Flag for the active academic year    |
| `createdAt` | `DateTime` | Default: `now()` | Record creation timestamp            |
| `updatedAt` | `DateTime` | Auto-updated     | Last update timestamp                |

**Relations:**
- `classes` → `Class[]` — classes in this year
- `enrollments` → `StudentEnrollment[]` — enrollments in this year

##### `Class` → `classes`

A specific class/section within an academic year.

| Field            | Type       | Constraints                     | Description                         |
|------------------|------------|---------------------------------|-------------------------------------|
| `id`             | `String`   | PK, UUID                       | Unique identifier                   |
| `name`           | `String`   | —                               | Class name (e.g., "10-A")          |
| `gradeLevel`     | `Int`      | —                               | Numeric grade (e.g., 10)           |
| `academicYearId` | `String`   | FK → `academic_years.id`       | Associated academic year            |
| `classTeacherId` | `String?`  | FK → `teacher_profiles.id`     | Assigned class teacher              |
| `createdAt`      | `DateTime` | Default: `now()`                | Record creation timestamp           |
| `updatedAt`      | `DateTime` | Auto-updated                    | Last update timestamp               |

**Unique constraint:** `(name, academicYearId)` — unique class name per year  
**Indexes:** `academicYearId`, `(gradeLevel, academicYearId)`  
**Relations:**
- `academicYear` → `AcademicYear` — parent year (Restrict on delete)
- `classTeacher` → `TeacherProfile?` — assigned class teacher (SET NULL on delete)
- `enrollments` → `StudentEnrollment[]`
- `teacherAssignments` → `TeacherClassAssignment[]`

##### `Subject` → `subjects`

A subject offered at a specific grade level.

| Field         | Type       | Constraints      | Description                        |
|---------------|------------|------------------|------------------------------------|
| `id`          | `String`   | PK, UUID         | Unique identifier                  |
| `name`        | `String`   | —                | Subject name (e.g., "Mathematics") |
| `code`        | `String`   | —                | Subject code (e.g., "MATH")       |
| `gradeLevel`  | `Int`      | —                | Grade level this subject is for    |
| `description` | `String?`  | —                | Optional description               |
| `createdAt`   | `DateTime` | Default: `now()` | Record creation timestamp          |
| `updatedAt`   | `DateTime` | Auto-updated     | Last update timestamp              |

**Unique constraints:** `(name, gradeLevel)`, `(code, gradeLevel)`  
**Indexes:** `gradeLevel`  
**Relations:**
- `teacherAssignments` → `TeacherClassAssignment[]`

---

## Entity Relationship Diagram

```
┌──────────────────┐
│      User        │
│  (users)         │
├──────────────────┤
│ id (PK)          │
│ mobileNumber (U) │
│ email (U)        │
│ role             │
│ createdById (FK) │───┐ self-ref
└──────┬───────────┘   │
       │               │
       ├───────────────┘
       │
       ├──── 1:1 ────┐                         ┌───────────────────┐
       │              ▼                         │  PermissionPreset │
       │    ┌──────────────────┐                │ (permission_      │
       │    │  TeacherProfile  │────── M:1 ────▶│     presets)      │
       │    │ (teacher_        │                └───────────────────┘
       │    │    profiles)     │
       │    └──────┬───────────┘
       │           │
       │           ├──── 1:M ──┐
       │           │           ▼
       │           │  ┌─────────────────────────┐
       │           │  │ TeacherClassAssignment   │
       │           │  │ (teacher_class_          │
       │           │  │    assignments)          │
       │           │  └──────┬──────────┬────────┘
       │           │         │          │
       │           └── ClassTeacher     │
       │                  │             │
       ├──── 1:1 ────┐    │             │
       │              ▼   ▼             │
       │    ┌──────────────────┐        │      ┌──────────────┐
       │    │  StudentProfile  │        └─────▶│   Subject    │
       │    │ (student_        │               │ (subjects)   │
       │    │    profiles)     │               └──────────────┘
       │    └──────┬───────────┘
       │           │
       │           └──── 1:M ──┐
       │                       ▼
       │           ┌─────────────────────┐
       │           │ StudentEnrollment   │
       │           │ (student_           │
       │           │    enrollments)     │
       │           └──────┬──────┬───────┘
       │                  │      │
       │                  ▼      ▼
       │    ┌──────────────┐  ┌──────────────┐
       │    │    Class     │  │ AcademicYear │
       │    │  (classes)   │  │ (academic_   │
       │    └──────────────┘  │    years)    │
       │                      └──────────────┘
       │
       └──── 1:M ────┐
                      ▼
            ┌──────────────────┐
            │  RefreshToken    │
            │ (refresh_tokens) │
            └──────────────────┘
```

---

## Key Design Decisions

1. **Multi-file schema** — Split by domain for maintainability. Prisma merges them automatically via the `schema` directory path in `prisma.config.ts`.

2. **UUID primary keys** — All models use `@default(uuid())` for globally unique, non-sequential IDs.

3. **Soft delete pattern** — `User.isActive` flag instead of hard deletes, preserving referential integrity and audit trails.

4. **Token family rotation** — `RefreshToken.family` groups related tokens for detecting token reuse attacks. If a revoked token's family is reused, all tokens in that family can be invalidated.

5. **Permission model** — Two-tiered: `PermissionPreset` for reusable role templates + `TeacherProfile.permissionOverrides` for per-teacher customization.

6. **Academic year scoping** — Classes and enrollments are scoped to an `AcademicYear`, allowing year-over-year data isolation while keeping historical records.

7. **Cascade deletes** — Applied on profile → user relationships (deleting a user removes their profile). Class and academic year references use RESTRICT to prevent accidental data loss.

8. **Self-referential User** — `createdById` tracks which admin/teacher created a user account, enabling audit trails without a separate audit table.

---

## Migrations

| Migration                   | Date       | Description        |
|-----------------------------|------------|--------------------|
| `20260311173555_init`       | 2026-03-11 | Initial schema — creates all tables, enums, indexes, and foreign keys |

### Running Migrations

```bash
# Apply pending migrations
pnpm prisma migrate dev

# Create a new migration
pnpm prisma migrate dev --name <migration_name>

# Reset database (WARNING: drops all data)
pnpm prisma migrate reset

# Generate Prisma Client
pnpm prisma generate
```

---

## Adding a New Schema File

1. Create a new `.prisma` file in `prisma/schema/` (e.g., `attendance.prisma`).
2. Define your models — no need to repeat `generator` or `datasource` blocks.
3. Reference existing models from other files directly (Prisma resolves cross-file references).
4. Run `pnpm prisma migrate dev --name <description>` to generate and apply the migration.
