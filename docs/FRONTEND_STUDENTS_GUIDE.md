# Frontend Students Service Implementation Guide

## Overview

The Students module handles:

- student profile listing and retrieval with role-based data scope
- student profile updates
- class enrollment management
- bulk student promotion to a target class

This guide is the frontend contract for all `/students` endpoints.

---

## API Endpoints

All endpoints are prefixed with `/students`.

## Access Matrix

| Endpoint | ADMIN | TEACHER | STUDENT |
| --- | --- | --- | --- |
| `POST /students/promote` | Yes | No | No |
| `GET /students` | Yes | Yes | Yes |
| `GET /students/:id` | Yes | Yes (scoped) | Yes (self only) |
| `PATCH /students/:id` | Yes | No | No |
| `POST /students/:id/enroll` | Yes | No | No |
| `GET /students/:id/enrollments` | Yes | No | Yes (self only) |
| `PATCH /students/:id/enrollments/:enrollmentId` | Yes | No | No |

---

## Role Scope Rules

### `GET /students`

- **ADMIN**: can list all students; optional class filter applies.
- **TEACHER**: sees only students with **ACTIVE** enrollment in teacher-owned classes.
  - Teacher-owned classes include class assignments and class-teacher classes.
  - If teacher sends `classId` outside their scope, result is empty.
- **STUDENT**: sees only their own student profile.

### `GET /students/:id`

- **ADMIN**: can access any student.
- **TEACHER**: can access only if student has ACTIVE enrollment in one of teacher-owned classes.
- **STUDENT**: can access only own profile.

### `GET /students/:id/enrollments`

- **ADMIN**: can access any student enrollments.
- **STUDENT**: can access only own enrollments.
- **TEACHER**: endpoint not available for teacher role.

---

## Endpoint Details

### 1. Promote Students

**Endpoint:** `POST /students/promote`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "studentIds": ["student-uuid-1", "student-uuid-2"],
    "targetClassId": "class-uuid",
    "academicYearId": "optional-year-uuid"
}
```

**Validation Rules:**

- `studentIds`: required, non-empty UUID v4 array
- `targetClassId`: required UUID
- `academicYearId`: optional UUID

**Behavior:**

- If `academicYearId` is omitted, backend uses current academic year.
- Target class must belong to the resolved academic year.
- For each student:
  - if student not found, student is skipped
  - if already enrolled in target academic year, student is skipped
  - otherwise previous ACTIVE enrollment (if any) is marked `PROMOTED`, then new enrollment is created in target class
- New roll numbers are assigned sequentially in target class and padded to width 2 (`01`, `02`, ...).

**Response - Success (201 Created):**

```json
{
    "promoted": 2,
    "skipped": [
        {
            "studentId": "student-uuid-3",
            "reason": "Already enrolled in the target academic year"
        },
        {
            "studentId": "student-uuid-4",
            "reason": "Student not found"
        }
    ]
}
```

**Error Responses:**

- `400 Bad Request`: validation failure, invalid target academic-year mapping
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `404 Not Found`: target class not found

---

### 2. List Students

**Endpoint:** `GET /students`  
**Access:** Admin, Teacher, Student (role-scoped)  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
| --- | --- | --- | --- | --- |
| `classId` | UUID | - | - | Filter by class (subject to role scope) |
| `academicYearId` | UUID | current year | - | Academic year filter |
| `search` | string | - | 100 | Case-insensitive search on first name, last name, admission number |
| `page` | integer | 1 | - | 1-indexed page number |
| `limit` | integer | 20 | 100 | Items per page |

**Example:**

```http
GET /students?academicYearId=year-uuid&classId=class-uuid&search=adm&page=1&limit=20
```

**Response - Success (200 OK):**

```json
{
    "data": [
        {
            "id": "student-profile-uuid",
            "userId": "user-uuid",
            "admissionNumber": "ADM-2026-001",
            "dateOfBirth": "2010-05-15T00:00:00.000Z",
            "createdAt": "2026-06-25T10:00:00.000Z",
            "updatedAt": "2026-06-25T10:00:00.000Z",
            "user": {
                "id": "user-uuid",
                "firstName": "Alice",
                "lastName": "Johnson",
                "mobileNumber": "9876543212",
                "email": "alice@example.com",
                "role": "STUDENT",
                "isActive": true,
                "isFirstLogin": false,
                "createdAt": "2026-06-25T10:00:00.000Z",
                "updatedAt": "2026-06-25T10:00:00.000Z",
                "createdById": "admin-user-uuid"
            }
        }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
}
```

**Error Responses:**

- `400 Bad Request`: invalid query params (UUID/pagination/search)
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: role not allowed

---

### 3. Get Student Profile

**Endpoint:** `GET /students/:id`  
**Access:** Admin, Teacher (scoped), Student (self only)  
**Headers:** `Authorization: Bearer <accessToken>`

**Path Parameters:**

- `id` (UUID): student profile id

**Response - Success (200 OK):**

```json
{
    "id": "student-profile-uuid",
    "userId": "user-uuid",
    "admissionNumber": "ADM-2026-001",
    "dateOfBirth": "2010-05-15T00:00:00.000Z",
    "createdAt": "2026-06-25T10:00:00.000Z",
    "updatedAt": "2026-06-25T10:00:00.000Z",
    "user": {
        "id": "user-uuid",
        "firstName": "Alice",
        "lastName": "Johnson",
        "mobileNumber": "9876543212",
        "email": "alice@example.com",
        "role": "STUDENT",
        "isActive": true,
        "isFirstLogin": false,
        "createdAt": "2026-06-25T10:00:00.000Z",
        "updatedAt": "2026-06-25T10:00:00.000Z",
        "createdById": "admin-user-uuid"
    },
    "enrollments": [
        {
            "id": "enrollment-uuid",
            "studentId": "student-profile-uuid",
            "classId": "class-uuid",
            "academicYearId": "year-uuid",
            "rollNumber": "01",
            "status": "ACTIVE",
            "createdAt": "2026-06-25T10:10:00.000Z",
            "updatedAt": "2026-06-25T10:10:00.000Z",
            "class": {
                "id": "class-uuid",
                "name": "6A",
                "gradeLevel": 6,
                "academicYearId": "year-uuid",
                "classTeacherId": "teacher-profile-uuid",
                "createdAt": "2026-06-01T08:00:00.000Z",
                "updatedAt": "2026-06-20T09:00:00.000Z"
            },
            "academicYear": {
                "id": "year-uuid",
                "name": "2026-27",
                "startDate": "2026-06-01T00:00:00.000Z",
                "endDate": "2027-04-30T00:00:00.000Z",
                "isCurrent": true,
                "createdAt": "2026-05-25T00:00:00.000Z",
                "updatedAt": "2026-05-25T00:00:00.000Z"
            }
        }
    ]
}
```

**Error Responses:**

- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`:
  - student trying to access another profile
  - teacher outside allowed student scope
  - teacher user without teacher profile
- `404 Not Found`: student not found

---

### 4. Update Student Profile

**Endpoint:** `PATCH /students/:id`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (at least one required):**

```json
{
    "dateOfBirth": "2010-05-15",
    "admissionNumber": "ADM-2026-001"
}
```

**Validation Rules:**

- At least one of `dateOfBirth` or `admissionNumber` is required.
- `dateOfBirth`: strict ISO 8601 date string
- `admissionNumber`: trimmed, non-empty, max 20

**Response - Success (200 OK):**

Returns updated student profile with nested `user`.

**Error Responses:**

- `400 Bad Request`: empty payload or validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `404 Not Found`: student not found
- `409 Conflict`: duplicate admission number

---

### 5. Enroll Student In Class

**Endpoint:** `POST /students/:id/enroll`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "classId": "class-uuid",
    "academicYearId": "optional-year-uuid",
    "rollNumber": "05"
}
```

**Validation Rules:**

- `classId`: required UUID
- `academicYearId`: optional UUID
- `rollNumber`: optional, trimmed, non-empty, max 10

**Behavior:**

- If `academicYearId` is omitted, backend uses current academic year.
- Class must belong to the resolved academic year.
- If `rollNumber` is omitted, backend auto-generates roll number from current ACTIVE count in class/year and pads to width 2.
- Student can have only one enrollment per academic year.

**Response - Success (201 Created):**

```json
{
    "id": "enrollment-uuid",
    "studentId": "student-profile-uuid",
    "classId": "class-uuid",
    "academicYearId": "year-uuid",
    "rollNumber": "05",
    "status": "ACTIVE",
    "createdAt": "2026-06-27T09:00:00.000Z",
    "updatedAt": "2026-06-27T09:00:00.000Z",
    "class": {
        "id": "class-uuid",
        "name": "6A",
        "gradeLevel": 6,
        "academicYearId": "year-uuid",
        "classTeacherId": "teacher-profile-uuid",
        "createdAt": "2026-06-01T08:00:00.000Z",
        "updatedAt": "2026-06-20T09:00:00.000Z"
    },
    "academicYear": {
        "id": "year-uuid",
        "name": "2026-27",
        "startDate": "2026-06-01T00:00:00.000Z",
        "endDate": "2027-04-30T00:00:00.000Z",
        "isCurrent": true,
        "createdAt": "2026-05-25T00:00:00.000Z",
        "updatedAt": "2026-05-25T00:00:00.000Z"
    }
}
```

**Error Responses:**

- `400 Bad Request`: class does not belong to selected academic year or validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `404 Not Found`: student or class not found
- `409 Conflict`: already enrolled in same academic year

---

### 6. Get Student Enrollments

**Endpoint:** `GET /students/:id/enrollments`  
**Access:** Admin, Student (self only)  
**Headers:** `Authorization: Bearer <accessToken>`

**Path Parameters:**

- `id` (UUID): student profile id

**Response - Success (200 OK):**

```json
[
    {
        "id": "enrollment-uuid",
        "studentId": "student-profile-uuid",
        "classId": "class-uuid",
        "academicYearId": "year-uuid",
        "rollNumber": "01",
        "status": "ACTIVE",
        "createdAt": "2026-06-25T10:10:00.000Z",
        "updatedAt": "2026-06-25T10:10:00.000Z",
        "class": {
            "id": "class-uuid",
            "name": "6A",
            "gradeLevel": 6,
            "academicYearId": "year-uuid",
            "classTeacherId": "teacher-profile-uuid",
            "createdAt": "2026-06-01T08:00:00.000Z",
            "updatedAt": "2026-06-20T09:00:00.000Z"
        },
        "academicYear": {
            "id": "year-uuid",
            "name": "2026-27",
            "startDate": "2026-06-01T00:00:00.000Z",
            "endDate": "2027-04-30T00:00:00.000Z",
            "isCurrent": true,
            "createdAt": "2026-05-25T00:00:00.000Z",
            "updatedAt": "2026-05-25T00:00:00.000Z"
        }
    }
]
```

**Ordering:** newest first (`createdAt DESC`).

**Error Responses:**

- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: student trying to access another student's enrollments
- `404 Not Found`: student not found

---

### 7. Update Enrollment

**Endpoint:** `PATCH /students/:id/enrollments/:enrollmentId`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (at least one required):**

```json
{
    "status": "PROMOTED",
    "rollNumber": "07"
}
```

**Validation Rules:**

- At least one of `status` or `rollNumber` is required.
- `status`: one of `ACTIVE`, `PROMOTED`, `FAILED`, `TRANSFERRED`, `WITHDRAWN`
- `rollNumber`: trimmed, non-empty, max 10

**Response - Success (200 OK):**

Returns updated enrollment with nested `class` and `academicYear`.

**Error Responses:**

- `400 Bad Request`: empty payload or validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `404 Not Found`: enrollment not found for given student

---

## Frontend Types

```typescript
type StudentProfile = {
    id: string;
    userId: string;
    admissionNumber: string;
    dateOfBirth: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        mobileNumber: string;
        email: string | null;
        role: "STUDENT";
        isActive: boolean;
        isFirstLogin: boolean;
        createdAt: string;
        updatedAt: string;
        createdById: string | null;
    };
};

type StudentEnrollment = {
    id: string;
    studentId: string;
    classId: string;
    academicYearId: string;
    rollNumber: string;
    status: "ACTIVE" | "PROMOTED" | "FAILED" | "TRANSFERRED" | "WITHDRAWN";
    createdAt: string;
    updatedAt: string;
    class: {
        id: string;
        name: string;
        gradeLevel: number;
        academicYearId: string;
        classTeacherId: string | null;
        createdAt: string;
        updatedAt: string;
    };
    academicYear: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        isCurrent: boolean;
        createdAt: string;
        updatedAt: string;
    };
};

type ListStudentsResponse = {
    data: StudentProfile[];
    total: number;
    page: number;
    limit: number;
};

type PromoteStudentsResponse = {
    promoted: number;
    skipped: { studentId: string; reason: string }[];
};
```

---

## Frontend Implementation Notes

### Enrollment UX

- Show explicit warning before promotion since it updates old ACTIVE enrollment status to `PROMOTED`.
- For enroll and promote flows, prefer sending explicit `academicYearId` selected in UI even though backend can default.

### Pagination

- Keep page state when changing search/class filters.
- Backend max `limit` is `100`; clamp on frontend to avoid validation errors.

### Access-Aware UI

- Hide student management actions for non-admin users.
- For student role, avoid rendering list filters that imply broader access; list returns only self.

### Error Handling

- Map `409` conflicts to user-friendly duplicate enrollment/admission messages.
- Handle `403` with role-scope explanation (forbidden profile/enrollment access).
- Handle `404` with stale-record messaging when IDs are no longer valid.
