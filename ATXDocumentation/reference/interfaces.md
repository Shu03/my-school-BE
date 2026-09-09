# Interfaces and Type Definitions

## Common Types

### JwtPayload (`src/modules/auth/auth.types.ts`)
```typescript
interface JwtPayload {
    sub: string;           // User ID (UUID)
    role: Role;            // ADMIN | TEACHER | STUDENT
    permissions: string[]; // Resolved permissions array
    type: "access" | "first_login";
    iat?: number;
    exp?: number;
}
```

### RefreshTokenPayload (`src/modules/auth/auth.types.ts`)
```typescript
interface RefreshTokenPayload {
    sub: string;    // User ID
    family: string; // Token family UUID
    type: "refresh";
    iat?: number;
    exp?: number;
}
```

### ApiResponse (`src/common/interceptors/response.interceptor.ts`)
```typescript
interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    timestamp: string;
    data: T;
}
```

### Permission Type (`src/common/constants/app.constants.ts`)
```typescript
type Permission = typeof ALL_PERMISSIONS[number];
// One of 13 permission strings
```

## Module Types Summary

All module types are derived from Prisma utility types using `Prisma.*GetPayload<>`:

### Auth Types
| Type | Definition |
|------|-----------|
| `AuthTokens` | `{ accessToken: string; refreshToken: string }` |
| `LoginResponse` | `AuthTokens & { user: { id, firstName, lastName, role } }` |
| `FirstLoginResponse` | `{ forcePasswordChange: true; firstLoginToken: string }` |
| `AuthResponse` | `LoginResponse \| FirstLoginResponse` |

### User Types
| Type | Key Fields |
|------|-----------|
| `UserWithoutPassword` | User with password omitted |
| `UserWithProfiles` | User + teacherProfile? + studentProfile? |
| `CreateUserResult<T>` | `{ user: T; tempPassword: string }` |

### Student Types
| Type | Key Fields |
|------|-----------|
| `StudentBasic` | StudentProfile + user (no password) |
| `StudentWithEnrollment` | + enrollments[] with section + academicYear |
| `EnrollmentBasic` | StudentEnrollment + section + academicYear |
| `PromotionResult` | `{ promoted: number; skipped: { studentId, reason }[] }` |

### Teacher Types
| Type | Key Fields |
|------|-----------|
| `TeacherProfileBasic` | TeacherProfile + user (no password) + preset |
| `TeacherProfileWithAssignments` | + classAssignments[] with section + subject |
| `AssignmentBasic` | TeacherClassAssignment + section + subject |
| `PresetBasic` | PermissionPreset plain object |

### Exam Types
| Type | Key Fields |
|------|-----------|
| `ExamBasic` | Exam + section + academicYear + examSubjects (with subject) |
| `ExamWithSummary` | + subjectSummaries[] (gradeCount, averageMarks) |
| `ExamSubjectSummary` | examSubjectId, subjectName, totalMarks, gradeCount, averageMarks |

### Grade Types
| Type | Key Fields |
|------|-----------|
| `GradeBasic` | Grade + student + user (no password) |
| `GradeWithExamSubject` | Grade + examSubject + subject + exam |
| `ExamGradesSummary` | classAverage, highest, lowest, students[] |
| `BulkGradeResult` | `{ entered: number; examId; subjectId }` |

### Fee Types
| Type | Key Fields |
|------|-----------|
| `FeeStructureBasic` | FeeStructure + academicYear |
| `FeeRecordBasic` | FeeRecord + student + feeStructure + computed amountPaid |
| `FeeRecordWithPayments` | + payments[] |
| `FeePaymentBasic` | FeePayment + recordedBy user |
| `BackfillResult` | `{ created: number; skipped: number }` |

### Other Module Types
| Module | Type | Key Fields |
|--------|------|-----------|
| AcademicYears | `AcademicYearWithTerms` | AcademicYear + terms[] |
| Sections | `SectionWithRelations` | Section + academicYear + classTeacher |
| Subjects | `SubjectWithAssignments` | Subject + teacherAssignments[] |
| Attendance | `AttendanceSummaryItem` | studentId, totalDays, present, absent, percentage |
| Homework | `HomeworkBasic` | Homework + section + subject + createdBy |
| Announcements | `AnnouncementBasic` | Announcement + createdBy (id, name, role) |
| School | `SchoolSettingsBasic` | SchoolSettings plain object |

## Enums (from Prisma)

| Enum | Values | Used In |
|------|--------|---------|
| `Role` | ADMIN, TEACHER, STUDENT | User model, guards, decorators |
| `EnrollmentStatus` | ACTIVE, PROMOTED, FAILED, TRANSFERRED, WITHDRAWN | StudentEnrollment |
| `TeacherClassRole` | CLASS_TEACHER, SUBJECT_TEACHER | TeacherClassAssignment |
| `AttendanceStatus` | PRESENT, ABSENT | Attendance |
| `ExamType` | UNIT_TEST, MID_TERM, FINAL_EXAM, ASSIGNMENT, PROJECT, PRACTICAL | Exam |
| `ExamStatus` | ACTIVE, DISCARDED | Exam |
| `FeeRecordStatus` | PENDING, PARTIAL, PAID | FeeRecord |
