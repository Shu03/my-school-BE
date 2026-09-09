> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Business Logic

## Auth Module (`src/modules/auth/`)

### Login Flow
- **Input**: mobileNumber + password
- **Rules**:
  1. User must exist and be active (`isActive === true`)
  2. Password must match bcrypt hash
  3. If `isFirstLogin === true`: return `firstLoginToken` (forces password change, no access to other endpoints)
  4. If `isFirstLogin === false`: return `accessToken` + `refreshToken` + user info
  5. Session limit: MAX_ACTIVE_SESSIONS = 3. When exceeded, oldest tokens are revoked.
- **Token contents**: `{ sub: userId, role, permissions: string[], type: "access"|"first_login" }`

### Refresh Token Rotation
- **Rules**:
  1. Token must be valid JWT with `type: "refresh"`
  2. Token hash must exist in DB and not be revoked
  3. **Reuse detection**: If token hash is found but revoked → **revoke ALL tokens in same family** (compromise indicator)
  4. On success: revoke old token, issue new accessToken + refreshToken (same family)
- **Family concept**: All tokens from a single login share a `family` UUID. Reuse detection revokes the entire family.

### Password Change
- **Two flows**:
  1. **First login**: Uses `first_login` token. No current password required. Sets `isFirstLogin = false`.
  2. **Voluntary change**: Uses `access` token. Current password required and verified.
- **Rules**: New password must differ from current. Must match regex: uppercase + lowercase + digit + special char, 8-72 chars.
- **Side effect**: Revokes all sessions (all refresh tokens), issues fresh token pair.

### Admin Password Reset
- **Rules**: Admin only. Generates random 12-char temp password. Sets `isFirstLogin = true`. Revokes all target user sessions.
- **Audit**: Records `resetPasswordById` and `resetPasswordAt` on the user record.

## Users Module (`src/modules/users/`)

### User Creation
- **Three creation endpoints** (all ADMIN only):
  - `createAdmin`: Creates user with ADMIN role + temp password
  - `createTeacher`: Creates user with TEACHER role + TeacherProfile (employeeCode required)
  - `createStudent`: Creates user with STUDENT role + StudentProfile (admissionNumber required)
- **Rules**:
  1. mobileNumber must be unique across all users
  2. email must be unique (if provided)
  3. employeeCode must be unique (teachers)
  4. admissionNumber must be unique (students)
  5. All new users get `isFirstLogin = true` + system-generated temp password

### User Deactivation/Activation
- `deactivate`: Sets `isActive = false`. User must be currently active.
- `activate`: Sets `isActive = true`. Can reactivate any deactivated user.
- **FACT**: Deactivation does NOT revoke refresh tokens. A deactivated user's existing tokens remain valid until they expire, though JwtStrategy checks `isActive` on each request.

## Academic Years Module (`src/modules/academic-years/`)

### Academic Year Lifecycle
- **Create**: Name must be unique. startDate must be before endDate.
- **Set Current**: Uses transaction: unsets ALL `isCurrent` flags, then sets the target year. Only one year is current at a time.
- **Copy Structure**: When `copyClassStructureFromCurrent = true` on creation, copies all sections from the current academic year to the new year.

### Term Management
- Terms belong to an academic year
- **Validation**: Term dates must fall within parent academic year date range
- **Overlap check**: No two terms in the same year can have overlapping date ranges

## Sections Module (`src/modules/sections/`)

### Section (Class) Management
- Sections represent class divisions (e.g., "1A", "2B")
- **Uniqueness**: Section name must be unique within an academic year
- **classLevel**: Integer representing the grade level (1, 2, 3...)
- Sections are linked to an academic year

## Subjects Module (`src/modules/subjects/`)

### Subject Management
- **Uniqueness constraints**: name+classLevel and code+classLevel must both be unique
- Subject codes are auto-uppercased
- **Deletion guard**: Cannot delete a subject with active teacher assignments

## Teachers Module (`src/modules/teachers/`)

### Permission System
- **PermissionPresets**: Named collections of permissions (e.g., "Full Access", "View Only"). ADMIN-managed.
- **Assignment**: Each teacher profile links to one preset (or none).
- **Overrides**: `permissionOverrides` array on TeacherProfile provides additive permissions beyond the preset.
- **13 permissions**: LEAVE_APPLY, ACADEMIC_YEAR_MANAGE, SECTION_MANAGE, SUBJECT_MANAGE, ATTENDANCE_READ, ATTENDANCE_WRITE, GRADES_READ, GRADES_WRITE, NOTES_UPLOAD, HOMEWORK_MANAGE, ANNOUNCEMENTS_MANAGE, REPORTS_VIEW, FEES_MANAGE
- **Resolved in JWT**: `permissions = preset.permissions ∪ permissionOverrides` (computed at token issuance)

### Class Assignments
- Teachers are assigned to sections with a role:
  - **CLASS_TEACHER**: One per section. No subjectId needed.
  - **SUBJECT_TEACHER**: Must specify subjectId. Subject's classLevel must match section's classLevel.
- **Uniqueness**: `[teacherId, sectionId, subjectId]` composite unique.
- **Deletion guard**: Cannot delete preset if teachers are assigned to it.

## Students Module (`src/modules/students/`)

### Enrollment
- A student is enrolled in one section per academic year (`@@unique([studentId, academicYearId])`)
- **Auto roll number**: If no rollNumber provided, generated as `<count + 1>` padded to 2 digits
- **Auto fee record**: On enrollment, `FeesService.generateFeeRecordForStudent()` is called to create a fee record based on the section's classLevel fee structure
- **Search**: Supports case-insensitive search across firstName, lastName, admissionNumber

### Promotion
- Bulk operation: list of studentIds → target section
- **Rules**:
  1. Each student must have ACTIVE enrollment in the current academic year
  2. Previous enrollment status set to PROMOTED
  3. New enrollment created in target section with auto-generated roll number
  4. Fee records auto-generated for new enrollment
  5. Students already enrolled in target year are skipped (returned in `skipped[]`)

## Attendance Module (`src/modules/attendance/`)

### Attendance Marking
- **Bulk operation**: All students in a section for a single date
- **Rules**:
  1. Date must be today (attendance for past/future dates not allowed)
  2. Date must be a school day (not weeklyOffDay, not holiday) — checked via `SchoolService.isSchoolDay()`
  3. Teacher must be assigned to the section (CLASS_TEACHER or SUBJECT_TEACHER)
  4. All studentIds must be actively enrolled in the section
- **Upsert pattern**: Deletes existing attendance for (section, date), then creates new records
- **Statuses**: PRESENT or ABSENT only

### Attendance Summary
- Monthly summary per section
- **Calculation**:
  1. Count working days in month (total days minus weeklyOffDays minus holidays)
  2. Count PRESENT and ABSENT records per student
  3. Calculate percentage = (present / workingDays) * 100
- **Timezone**: Uses `SCHOOL_TIMEZONE` ("Asia/Kolkata") for date calculations

## Exams Module (`src/modules/exams/`)

### Exam Lifecycle
- **States**: ACTIVE (default) → FINALIZED (grades locked) or DISCARDED
- **Finalize**: Sets `isFinalized = true`. After finalization, no exam updates or subject changes allowed.
- **Unlock**: ADMIN only. Sets `isFinalized = false` (allows re-editing).
- **Discard**: ADMIN only. Sets `status = DISCARDED`. Discarded exams cannot be modified.

### Multi-Subject Exams
- Each exam has one or more ExamSubjects (each links exam to a subject with totalMarks + date)
- **Validation**: Subject's classLevel must match section's classLevel
- **No duplicate subjects**: One subject per exam

## Grades Module (`src/modules/grades/`)

### Grade Entry
- Bulk entry: array of `{ studentId, marksObtained, remarks }` for one examSubject
- **Rules**:
  1. Exam must be ACTIVE (not finalized, not discarded)
  2. `marksObtained` must be ≤ `totalMarks` for the exam subject
  3. All students must be enrolled in the exam's section
  4. Teacher must be assigned to the section
- **Upsert pattern**: deleteMany + createMany for the (examSubject, students) set

### Grade Summary
- Per exam-subject: classAverage, highest, lowest marks, per-student breakdown with percentage

## Fees Module (`src/modules/fees/`)

### Fee Structure
- One structure per classLevel per academic year (`@@unique([classLevel, academicYearId])`)
- Defines `totalAmount` and `dueDate`

### Fee Records
- One record per student per academic year (`@@unique([studentId, academicYearId])`)
- **Auto-generated** during enrollment and promotion
- **Status transitions**: PENDING → PARTIAL (some payments) → PAID (total payments ≥ totalAmount)

### Payments
- Each payment records `amount`, `paidOn`, optional `note`, `recordedById`
- After each payment, status is recalculated: sum(payments.amount) vs totalAmount
- **Backfill**: Admin operation to create missing fee records for all active enrollments

## School Module (`src/modules/school/`)

### School Settings
- Singleton record (auto-created on first access)
- `weeklyOffDays`: array of integers (0=Sunday, 6=Saturday). Default: `[0]` (Sunday)

### Holidays
- Named holidays linked to academic year
- Unique per date per academic year
- Used by attendance module to validate school days

## Announcements Module (`src/modules/announcements/`)

### Announcement Lifecycle
- Created with `startDate` and `endDate` (display window)
- **Ownership**: Only creator (or admin) can update/delete
- **Expiry check**: Cannot update/delete expired announcements (endDate < now)
- Visible to all authenticated users (ADMIN, TEACHER, STUDENT)
