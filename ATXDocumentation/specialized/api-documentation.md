# API Documentation — Request/Response Examples

## Authentication

### POST /api/v1/auth/login (Normal User)

**Request**:
```json
{
    "mobileNumber": "9876543210",
    "password": "MyP@ssw0rd"
}
```

**Response (200)**:
```json
{
    "success": true,
    "statusCode": 200,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": "uuid-...",
            "firstName": "John",
            "lastName": "Doe",
            "role": "TEACHER"
        }
    }
}
```

### POST /api/v1/auth/login (First Login)

**Response (200)**:
```json
{
    "success": true,
    "statusCode": 200,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "data": {
        "forcePasswordChange": true,
        "firstLoginToken": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### Error Response (401)
```json
{
    "success": false,
    "statusCode": 401,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "path": "/api/v1/auth/login",
    "message": "Invalid credentials"
}
```

## User Creation

### POST /api/v1/users/student

**Request** (ADMIN only):
```json
{
    "firstName": "Jane",
    "lastName": "Smith",
    "mobileNumber": "9876543211",
    "email": "jane@example.com",
    "admissionNumber": "ADM-2026-001",
    "dateOfBirth": "2015-05-15T00:00:00.000Z"
}
```

**Response (201)**:
```json
{
    "success": true,
    "statusCode": 201,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "data": {
        "user": {
            "id": "uuid-...",
            "firstName": "Jane",
            "lastName": "Smith",
            "mobileNumber": "9876543211",
            "role": "STUDENT",
            "isActive": true,
            "isFirstLogin": true
        },
        "tempPassword": "xK9#mP2$vL4@"
    }
}
```

## Attendance

### POST /api/v1/attendance/mark

**Request** (TEACHER with ATTENDANCE_WRITE):
```json
{
    "sectionId": "section-uuid-...",
    "date": "2026-09-09T00:00:00.000Z",
    "records": [
        { "studentId": "student-uuid-1", "status": "PRESENT" },
        { "studentId": "student-uuid-2", "status": "ABSENT" },
        { "studentId": "student-uuid-3", "status": "PRESENT" }
    ]
}
```

**Response (200)**:
```json
{
    "success": true,
    "statusCode": 200,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "data": {
        "marked": 3,
        "date": "2026-09-09",
        "sectionId": "section-uuid-..."
    }
}
```

## Fee Payment

### POST /api/v1/fees/records/:id/payments

**Request**:
```json
{
    "amount": 5000,
    "paidOn": "2026-09-09T00:00:00.000Z",
    "note": "First installment"
}
```

**Response (201)**:
```json
{
    "success": true,
    "statusCode": 201,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "data": {
        "id": "payment-uuid-...",
        "amount": 5000,
        "paidOn": "2026-09-09T00:00:00.000Z",
        "note": "First installment",
        "recordedBy": {
            "id": "admin-uuid-...",
            "firstName": "Admin",
            "lastName": "User",
            "role": "ADMIN"
        }
    }
}
```

## Validation Error

### 400 Bad Request (DTO Validation Failure)
```json
{
    "success": false,
    "statusCode": 400,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "path": "/api/v1/users/student",
    "message": [
        "admissionNumber must be shorter than or equal to 20 characters",
        "mobileNumber must match /^[6-9]\\d{9}$/ regular expression"
    ]
}
```

### 409 Conflict (Unique Constraint Violation)
```json
{
    "success": false,
    "statusCode": 409,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "path": "/api/v1/users/student",
    "message": "Unique constraint failed on: mobileNumber"
}
```

### 403 Forbidden (Insufficient Permissions)
```json
{
    "success": false,
    "statusCode": 403,
    "timestamp": "2026-09-09T12:00:00.000Z",
    "path": "/api/v1/attendance/mark",
    "message": "Forbidden resource"
}
```
