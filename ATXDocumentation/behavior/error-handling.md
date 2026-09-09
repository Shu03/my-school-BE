> ⚠️ **Early Access**: Behavior documentation is in early access. Please review critically.

# Error Handling

## Global Exception Filter

**Location**: `src/common/filters/http-exception.filter.ts`

The `GlobalExceptionFilter` catches ALL unhandled exceptions and standardizes the error response.

### Error Response Format
```json
{
    "success": false,
    "statusCode": 404,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "path": "/api/v1/students/invalid-id",
    "message": "Student not found"
}
```

### Exception Resolution Paths

| Exception Type | Status Code | Handling |
|---------------|-------------|----------|
| `HttpException` (NestJS) | Extracted from exception | Returns the exception's message and status |
| Prisma `P2002` (unique constraint) | 409 Conflict | Extracts field names from metadata, returns "Unique constraint failed on: [fields]" |
| Prisma `P2025` (record not found) | 404 Not Found | Returns "Record not found" |
| All other exceptions | 500 Internal Server Error | Returns "Internal server error" (hides details) |

### Logging Strategy
- **4xx errors**: Logged at WARN level
- **5xx errors**: Logged at ERROR level with full stack trace
- **FACT**: No structured logging — uses NestJS built-in `Logger`

## Service-Level Exception Usage

### Common Exceptions by Module

| Module | Exception | Typical Trigger |
|--------|-----------|----------------|
| Auth | `UnauthorizedException` | Invalid credentials, expired tokens, deactivated user |
| Auth | `BadRequestException` | Same password on change, invalid token type |
| Users | `NotFoundException` | User ID not found |
| Users | `BadRequestException` | Deactivating already inactive user |
| AcademicYears | `NotFoundException` | No current academic year set |
| AcademicYears | `BadRequestException` | Invalid date range, overlapping terms |
| Attendance | `BadRequestException` | Future/past date, non-school day |
| Attendance | `ForbiddenException` | Teacher not assigned to section |
| Exams | `BadRequestException` | Modifying finalized/discarded exam |
| Exams | `ForbiddenException` | Teacher not assigned to section |
| Grades | `BadRequestException` | Marks exceed totalMarks |
| Fees | `BadRequestException` | Payment exceeds remaining balance |
| Students | `NotFoundException` | Student not found |
| Students | `BadRequestException` | Already enrolled in academic year |
| Teachers | `BadRequestException` | Deleting preset with assigned teachers |
| Subjects | `BadRequestException` | Deleting subject with active assignments |

### Error Message Constants

**Location**: `src/common/constants/app.constants.ts`

The application centralizes many (but not all) error messages as constants:

**Attendance errors**: `ERR_ATTENDANCE_NOT_SCHOOL_DAY`, `ERR_ATTENDANCE_TEACHER_NOT_ASSIGNED`, `ERR_ATTENDANCE_STUDENTS_NOT_ENROLLED`, `ERR_ATTENDANCE_FUTURE_DATE`

**Exam errors**: `ERR_EXAM_NOT_FOUND`, `ERR_EXAM_FINALIZED`, `ERR_EXAM_DISCARDED`, `ERR_EXAM_SUBJECT_GRADE_MISMATCH`

**Grade errors**: `ERR_GRADE_MARKS_EXCEED`, `ERR_GRADE_STUDENTS_NOT_ENROLLED`

**Fee errors**: `ERR_FEE_STRUCTURE_NOT_FOUND`, `ERR_FEE_RECORD_NOT_FOUND`, `ERR_FEE_OVERPAYMENT`

**INFERENCE**: Some services use inline error strings rather than constants, leading to inconsistency. Centralizing all messages would improve maintainability.

## Prisma Error Handling Patterns

### Unique Constraint Violations (P2002)
Handled in two ways:
1. **Globally**: `GlobalExceptionFilter` catches P2002 → 409 Conflict
2. **Locally**: Some services catch P2002 explicitly for custom messages (e.g., `FeesService.createFeeStructure`)

### Record Not Found (P2025)
Handled in two ways:
1. **Globally**: `GlobalExceptionFilter` catches P2025 → 404 Not Found
2. **Locally**: Most services use `findUnique` + explicit null check + throw `NotFoundException`

### Transaction Errors
- Transactions are used for multi-step operations (attendance, token rotation, promotions)
- **FACT**: No explicit rollback handling — Prisma auto-rolls back on any error within `$transaction`

## Validation Errors

### Request Validation (ValidationPipe)
- Triggers on DTO validation failures
- Returns 400 Bad Request with validation error details
- `whitelist: true` strips unknown properties
- `forbidNonWhitelisted: true` rejects requests with unknown properties

### Business Validation
- Performed in service methods before data operations
- Throws appropriate `HttpException` subclasses
- Examples: date range validation, grade level matching, session limit checks
