> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Decision Logic

## Authentication Decisions

### JwtAuthGuard Decision Tree
```
Request arrives
    │
    ├── Has @Public() metadata? → YES → Skip auth, pass through
    │
    └── NO → Extract Bearer token
        │
        ├── No token? → 401 Unauthorized
        │
        └── Validate via JwtStrategy
            ├── Token type !== "access"? → 401
            ├── User not found in DB? → 401
            ├── User isActive === false? → 401
            └── Valid → Attach user to request
```

### RolesGuard Decision Tree
```
Request arrives (after JwtAuthGuard)
    │
    ├── Has @Roles() metadata? → NO → Pass through (no restriction)
    │
    └── YES → Get required roles[]
        │
        ├── user.role IN required roles? → Pass through
        │
        └── NOT IN → 403 Forbidden
```

### PermissionsGuard Decision Tree
```
Request arrives (after RolesGuard)
    │
    ├── Has @Permissions() metadata? → NO → Pass through
    │
    └── YES → Get required permissions[]
        │
        ├── user.role === ADMIN? → Pass through (ADMIN bypasses all permissions)
        │
        └── NOT ADMIN → Check ALL required permissions present in user.permissions
            │
            ├── All present? → Pass through
            │
            └── Missing any? → 403 Forbidden
```

## Data Access Scoping Decisions

### Exam Visibility (ExamsService.findAll)
```
User requests exam list
    │
    ├── role === ADMIN → Return all exams (filtered by optional sectionId/type/status)
    │
    ├── role === TEACHER
    │   ├── Has GRADES_READ permission? → NO → 403 Forbidden
    │   └── YES → Filter by sections where teacher has CLASS_TEACHER or SUBJECT_TEACHER assignment
    │
    └── role === STUDENT
        └── Filter by sections where student has ACTIVE enrollment
```

### Fee Record Visibility (FeesService.findAllRecords)
```
User requests fee records
    │
    ├── role === ADMIN → Return all records (filtered by optional sectionId/status)
    │
    ├── role === TEACHER → Filter by sections where teacher is assigned
    │
    └── role === STUDENT → Return only own fee records (via studentProfile.userId)
```

### Student Attendance Visibility (AttendanceService.getStudentAttendance)
```
User requests student attendance
    │
    ├── role === ADMIN → Return all attendance for requested student
    │
    ├── role === TEACHER
    │   └── Check: teacher has assignment to a section where student is enrolled
    │       ├── YES → Return attendance
    │       └── NO → 403 Forbidden
    │
    └── role === STUDENT
        └── userId matches student's userId?
            ├── YES → Return own attendance
            └── NO → 403 Forbidden
```

## Business Rule Decisions

### Attendance Date Validation
```
Mark attendance request (date)
    │
    ├── date !== today? → 400 "Attendance can only be marked for today"
    │
    ├── Get school settings (weeklyOffDays[])
    │   └── dayOfWeek(date) IN weeklyOffDays? → 400 "Not a school day"
    │
    ├── Get holidays for academic year
    │   └── date IN holidays? → 400 "Not a school day (holiday)"
    │
    └── Valid school day → proceed
```

### Exam State Transitions
```
Exam current state
    │
    ├── ACTIVE + isFinalized=false
    │   ├── Can: update, addSubject, removeSubject, enterGrades, finalize
    │   └── Cannot: unlock, discard (no-op states)
    │
    ├── ACTIVE + isFinalized=true
    │   ├── Can: unlock (admin), discard (admin), view grades
    │   └── Cannot: update, addSubject, removeSubject, enterGrades
    │
    └── DISCARDED
        ├── Can: view only
        └── Cannot: any modification
```

### Fee Record Status Calculation
```
After recording a payment:
    │
    ├── sum(all payments) === 0 → status = PENDING
    │
    ├── 0 < sum(all payments) < totalAmount → status = PARTIAL
    │
    └── sum(all payments) >= totalAmount → status = PAID
```

### Teacher Assignment Validation
```
Create assignment request (teacherId, sectionId, role, subjectId?)
    │
    ├── role === CLASS_TEACHER
    │   ├── subjectId provided? → 400 "Class teacher does not need subjectId"
    │   ├── Section already has a CLASS_TEACHER? → 400 "Section already has class teacher"
    │   └── Valid → create assignment
    │
    └── role === SUBJECT_TEACHER
        ├── subjectId missing? → 400 "Subject teacher requires subjectId"
        ├── subject.classLevel !== section.classLevel? → 400 "Grade level mismatch"
        ├── Duplicate [teacherId, sectionId, subjectId]? → 409 Conflict
        └── Valid → create assignment
```

### User Login Decision
```
Login request (mobileNumber, password)
    │
    ├── User not found? → 401 "Invalid credentials"
    │
    ├── User isActive === false? → 401 "Account is deactivated"
    │
    ├── Password mismatch? → 401 "Invalid credentials"
    │
    ├── isFirstLogin === true? → Return { forcePasswordChange: true, firstLoginToken }
    │
    └── isFirstLogin === false
        ├── Count active sessions ≥ MAX_ACTIVE_SESSIONS(3)?
        │   └── YES → Revoke oldest tokens to make room
        └── Return { accessToken, refreshToken, user }
```
