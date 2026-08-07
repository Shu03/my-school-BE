# Frontend Attendance Service Implementation Guide

## Overview

The Attendance module handles:

- bulk attendance marking for a class (current day only)
- class attendance retrieval by date
- student attendance history retrieval with scope controls
- monthly attendance summary generation

This guide documents all `/attendance` endpoints for frontend integration.

---

## API Endpoints

All endpoints are prefixed with `/attendance`.

## Access Matrix

| Endpoint | ADMIN | TEACHER | STUDENT |
| --- | --- | --- | --- |
| `POST /attendance/mark` | Yes (permission bypass) | Yes (`ATTENDANCE_WRITE` required) | No |
| `GET /attendance` | Yes (`ATTENDANCE_READ`) | No | No |
| `GET /attendance/student/:studentId` | Yes | Yes (scoped) | Yes (self only) |
| `GET /attendance/summary` | Yes (`ATTENDANCE_READ`) | No | No |

Notes:

- Admin bypasses permission checks in the permissions guard.
- Teacher access to `POST /attendance/mark` additionally requires class assignment.

---

## Endpoint Details

### 1. Bulk Mark Attendance

**Endpoint:** `POST /attendance/mark`  
**Access:**
- Admin
- Teacher with `ATTENDANCE_WRITE` permission and class assignment

**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "classId": "class-uuid",
    "date": "2026-06-27",
    "records": [
        {
            "studentId": "student-profile-uuid-1",
            "status": "PRESENT"
        },
        {
            "studentId": "student-profile-uuid-2",
            "status": "ABSENT"
        }
    ]
}
```

**Validation Rules:**

- `classId`: required UUID
- `date`: required strict ISO 8601 date
- `records`: required non-empty array
- each record:
  - `studentId`: required UUID
  - `status`: required enum (`PRESENT`, `ABSENT`)

**Behavior:**

- `date` must match **today in `Asia/Kolkata` timezone**.
- Current academic year is auto-resolved (no academicYearId input here).
- Date must be a school day (not weekly off-day and not holiday).
- For teachers:
  - teacher profile must exist
  - teacher must be assigned to target class
- Every student in `records` must have ACTIVE enrollment in class/current year.
- Existing attendance rows for same `classId` + `date` + provided `studentId`s are deleted, then inserted again.

**Response - Success (200 OK):**

```json
{
    "marked": 2,
    "date": "2026-06-27",
    "classId": "class-uuid"
}
```

**Error Responses:**

- `400 Bad Request`:
  - date is not today
  - date is not a school day
  - one or more students are not actively enrolled in class
  - validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`:
  - teacher missing `ATTENDANCE_WRITE`
  - teacher not assigned to class
- `404 Not Found`: current academic year missing

---

### 2. Get Class Attendance

**Endpoint:** `GET /attendance`  
**Access:** Admin only (`ATTENDANCE_READ` permission or admin bypass)  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `classId` | UUID | Yes | Class id |
| `date` | ISO date | Yes | Date (`YYYY-MM-DD`) |

**Example:**

```http
GET /attendance?classId=class-uuid&date=2026-06-27
```

**Response - Success (200 OK):**

```json
[
    {
        "id": "attendance-uuid",
        "studentId": "student-profile-uuid-1",
        "classId": "class-uuid",
        "academicYearId": "academic-year-uuid",
        "date": "2026-06-27T00:00:00.000Z",
        "status": "PRESENT",
        "markedById": "teacher-profile-uuid",
        "periodId": null,
        "createdAt": "2026-06-27T09:00:00.000Z",
        "updatedAt": "2026-06-27T09:00:00.000Z",
        "student": {
            "id": "student-profile-uuid-1",
            "userId": "user-uuid-1",
            "admissionNumber": "ADM-001",
            "dateOfBirth": "2010-05-15T00:00:00.000Z",
            "createdAt": "2026-06-01T00:00:00.000Z",
            "updatedAt": "2026-06-01T00:00:00.000Z",
            "user": {
                "id": "user-uuid-1",
                "firstName": "Alice",
                "lastName": "Johnson",
                "mobileNumber": "9876543212",
                "email": "alice@example.com",
                "role": "STUDENT",
                "isActive": true,
                "isFirstLogin": false,
                "createdAt": "2026-06-01T00:00:00.000Z",
                "updatedAt": "2026-06-01T00:00:00.000Z",
                "createdById": "admin-user-uuid"
            }
        }
    }
]
```

**Ordering:** `createdAt ASC`.

**Error Responses:**

- `400 Bad Request`: validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: role/permission not allowed

---

### 3. Get Student Attendance History

**Endpoint:** `GET /attendance/student/:studentId`  
**Access:** Admin, Teacher (scoped), Student (self only)  
**Headers:** `Authorization: Bearer <accessToken>`

**Path Parameters:**

- `studentId` (UUID): student profile id

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `academicYearId` | UUID | current year | Filter by academic year |
| `startDate` | ISO date | - | Inclusive start date |
| `endDate` | ISO date | - | Inclusive end date |

**Scope Rules:**

- Admin can view any student attendance.
- Student can view only own attendance.
- Teacher can view only students that share a teacher class assignment path.

**Response - Success (200 OK):**

Array of attendance records with nested student + user, ordered by `date DESC`.

**Error Responses:**

- `400 Bad Request`: invalid query params
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: outside allowed scope
- `404 Not Found`: current academic year missing (when `academicYearId` omitted)

---

### 4. Get Monthly Class Attendance Summary

**Endpoint:** `GET /attendance/summary`  
**Access:** Admin only (`ATTENDANCE_READ` permission or admin bypass)  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter | Type | Required | Validation |
| --- | --- | --- | --- |
| `classId` | UUID | Yes | Valid class id |
| `month` | string | Yes | Format `YYYY-MM` |

**Example:**

```http
GET /attendance/summary?classId=class-uuid&month=2026-06
```

**Response - Success (200 OK):**

```json
[
    {
        "studentId": "student-profile-uuid-1",
        "firstName": "Alice",
        "lastName": "Johnson",
        "totalDays": 24,
        "present": 22,
        "absent": 2,
        "percentage": 92
    },
    {
        "studentId": "student-profile-uuid-2",
        "firstName": "Bob",
        "lastName": "Mehta",
        "totalDays": 24,
        "present": 20,
        "absent": 4,
        "percentage": 83
    }
]
```

**Computation Rules:**

- `totalDays` = working days in month after removing weekly off-days and holidays.
- `present` = count of student records with `PRESENT`.
- `absent` = count of student records with `ABSENT`.
- `percentage` = `Math.round((present / totalDays) * 100)`, `0` when `totalDays` is `0`.

**Error Responses:**

- `400 Bad Request`: invalid month format
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: role/permission not allowed
- `404 Not Found`: class not found

---

## Frontend Types

```typescript
type AttendanceStatus = "PRESENT" | "ABSENT";

type AttendanceRecord = {
    id: string;
    studentId: string;
    classId: string;
    academicYearId: string;
    date: string;
    status: AttendanceStatus;
    markedById: string | null;
    periodId: string | null;
    createdAt: string;
    updatedAt: string;
    student: {
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
};

type BulkMarkResult = {
    marked: number;
    date: string;
    classId: string;
};

type AttendanceSummaryItem = {
    studentId: string;
    firstName: string;
    lastName: string;
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
};
```

---

## Frontend Implementation Notes

### Mark Attendance UX

- Build UI around "today only" behavior in school timezone (`Asia/Kolkata`).
- Show explicit reason messages for school-day violations (weekly off/holiday).
- Prevent duplicate student rows in client payload before submit.

### Teacher Scope Awareness

- Teacher may have write permission but still fail if not assigned to class.
- On 403 for teachers, surface class-assignment guidance in UI.

### Summary Interpretation

- Monthly percentage is against working days, not only marked days.
- If marking is incomplete for month, percentage may look lower than expected.
