> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Workflows

## 1. User Onboarding Workflow

**Entry Point**: `POST /api/v1/users/admin`, `POST /api/v1/users/teacher`, `POST /api/v1/users/student`

```
Admin creates user (POST /api/v1/users/{role})
    │
    ├── Validates: mobileNumber unique, email unique
    ├── Generates temp password (12 chars, cryptographic random)
    ├── Hashes password (bcrypt, 12 rounds)
    ├── Creates User record (isFirstLogin=true)
    ├── Creates profile (TeacherProfile or StudentProfile)
    │
    ▼
Admin shares temp password with user (out of band)
    │
    ▼
User logs in (POST /api/v1/auth/login)
    │
    ├── Validates credentials
    ├── Detects isFirstLogin=true
    ├── Returns { forcePasswordChange: true, firstLoginToken: "..." }
    │
    ▼
User changes password (POST /api/v1/auth/change-password)
    │
    ├── Uses firstLoginToken (JwtChangePasswordGuard)
    ├── No currentPassword required (first login flow)
    ├── Validates new password strength
    ├── Sets isFirstLogin=false
    ├── Revokes all sessions
    ├── Returns new accessToken + refreshToken
    │
    ▼
User can now access all authorized endpoints
```

## 2. Student Enrollment Workflow

**Entry Point**: `POST /api/v1/students/:id/enroll`

```
Admin enrolls student (POST /api/v1/students/:id/enroll)
    │
    ├── Input: { sectionId, academicYearId?, rollNumber? }
    │
    ├── Validates: student exists, section exists, academic year valid
    ├── Checks: no existing enrollment for student in same academic year
    │
    ├── Auto-generates rollNumber if not provided
    │   └── Count existing enrollments in section + 1, pad to 2 digits
    │
    ├── Creates StudentEnrollment record (status: ACTIVE)
    │
    ├── Calls FeesService.generateFeeRecordForStudent()
    │   ├── Finds FeeStructure for section's classLevel + academicYear
    │   ├── If found: creates FeeRecord (status: PENDING)
    │   └── If not found: silently skips (no fee record)
    │
    ▼
Student is enrolled and can be marked for attendance, receive grades, etc.
```

## 3. Student Promotion Workflow

**Entry Point**: `POST /api/v1/students/promote`

```
Admin promotes students (POST /api/v1/students/promote)
    │
    ├── Input: { studentIds[], targetSectionId, academicYearId? }
    │
    ├── For each student:
    │   ├── Find ACTIVE enrollment in current academic year
    │   ├── If no active enrollment → skip (add to skipped[])
    │   ├── If already enrolled in target year → skip
    │   │
    │   ├── Set current enrollment status → PROMOTED
    │   ├── Create new enrollment in target section (ACTIVE)
    │   ├── Auto-generate rollNumber
    │   └── Generate fee record for new enrollment
    │
    ▼
Returns { promoted: count, skipped: [{ studentId, reason }] }
```

## 4. Attendance Marking Workflow

**Entry Point**: `POST /api/v1/attendance/mark`

```
Teacher marks attendance (POST /api/v1/attendance/mark)
    │
    ├── Input: { sectionId, date, records: [{ studentId, status }] }
    │
    ├── Validate: date is today
    ├── Get current academic year
    ├── Check: date is a school day
    │   ├── SchoolService.isSchoolDay(date, academicYearId)
    │   ├── Not a weekly off day (from SchoolSettings.weeklyOffDays)
    │   └── Not a holiday (from holidays table)
    │
    ├── Verify: teacher is assigned to this section
    ├── Verify: all studentIds have ACTIVE enrollment in section
    │
    ├── Transaction:
    │   ├── DELETE all existing attendance for (section, date)
    │   └── CREATE new attendance records
    │
    ▼
Returns { marked: count, date, sectionId }
```

## 5. Exam → Grade Workflow

**Entry Point**: Create exam → Add subjects → Enter grades → Finalize

```
Teacher creates exam (POST /api/v1/exams)
    │
    ├── Input: { name, type, sectionId, subjects: [{ subjectId, totalMarks, date }] }
    ├── Validates: teacher is CLASS_TEACHER of section
    ├── Validates: each subject's classLevel matches section's classLevel
    │
    ▼
Teacher enters grades (POST /api/v1/exams/:examId/subjects/:subjectId/grades)
    │
    ├── Input: { records: [{ studentId, marksObtained, remarks? }] }
    ├── Validates: exam is ACTIVE (not finalized/discarded)
    ├── Validates: marksObtained ≤ totalMarks
    ├── Validates: all students enrolled in section
    ├── Transaction: delete existing + create new grades
    │
    ▼
Teacher finalizes exam (POST /api/v1/exams/:examId/finalize)
    │
    ├── Sets isFinalized = true
    ├── Grades are now read-only
    │
    ▼
(Optional) Admin unlocks exam (POST /api/v1/exams/:examId/unlock)
    │
    └── Sets isFinalized = false (allows re-editing)
```

## 6. Fee Collection Workflow

**Entry Point**: Admin creates fee structure → Students are enrolled → Payments recorded

```
Admin creates fee structure (POST /api/v1/fees/structures)
    │
    ├── Input: { classLevel, totalAmount, dueDate, academicYearId? }
    ├── Unique per classLevel + academicYear
    │
    ▼
Student is enrolled (or promoted)
    │
    ├── Auto-creates FeeRecord (status: PENDING, totalAmount from structure)
    │
    ▼
Admin/Teacher records payment (POST /api/v1/fees/records/:id/payments)
    │
    ├── Input: { amount, paidOn, note? }
    ├── Updates FeeRecord status:
    │   ├── sum(payments) == 0 → PENDING
    │   ├── 0 < sum(payments) < totalAmount → PARTIAL
    │   └── sum(payments) >= totalAmount → PAID
    │
    ▼
View payment history per record or per student
```

## 7. Token Refresh Workflow

**Entry Point**: `POST /api/v1/auth/refresh`

```
Client sends refreshToken (POST /api/v1/auth/refresh)
    │
    ├── Verify JWT signature
    ├── Hash token (SHA-256)
    ├── Look up tokenHash in DB
    │
    ├── Case 1: Token not found → 401 UNAUTHORIZED
    │
    ├── Case 2: Token found but isRevoked=true
    │   └── REUSE DETECTED → Revoke ALL tokens in same family → 401
    │
    ├── Case 3: Token valid
    │   ├── Revoke current token
    │   ├── Issue new accessToken + refreshToken (same family)
    │   └── Store new token hash in DB
    │
    ▼
Returns { accessToken, refreshToken }
```
