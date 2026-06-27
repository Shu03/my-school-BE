# Frontend Classes Service Implementation Guide

## Overview

The Classes module manages class entities per academic year. It supports creating classes, listing classes by year/grade, updating class details, and assigning/removing class teachers.

---

## API Endpoints

All endpoints are prefixed with `/classes`.

### 1. **Create Class**

**Endpoint:** `POST /classes`  
**Access:** Admin or Teacher with `CLASS_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "6A",
    "gradeLevel": 6,
    "academicYearId": "optional-year-uuid"
}
```

**Validation Rules:**

- `name`: required, string, trimmed, max 20
- `gradeLevel`: required integer, min 1
- `academicYearId`: optional UUID
- class name must be unique within an academic year

**Behavior:**

- if `academicYearId` is omitted, backend uses current academic year

**Response - Success (201 Created):**

```json
{
    "id": "class-uuid",
    "name": "6A",
    "gradeLevel": 6,
    "academicYearId": "year-uuid",
    "classTeacherId": null,
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: duplicate class name in year, validation failure
- `404 Not Found`: no current academic year exists (when id omitted)
- `403 Forbidden`: missing permission/role

---

### 2. **List Classes**

**Endpoint:** `GET /classes`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter        | Type   | Required | Description                      |
| ---------------- | ------ | -------- | -------------------------------- |
| `academicYearId` | UUID   | No       | If omitted, current year is used |
| `gradeLevel`     | number | No       | Filter by grade level            |

**Example:**

```http
GET /classes?academicYearId=year-uuid&gradeLevel=6
```

**Response - Success (200 OK):**

```json
[
    {
        "id": "class-1",
        "name": "6A",
        "gradeLevel": 6,
        "academicYearId": "year-uuid",
        "classTeacherId": "teacher-profile-uuid",
        "createdAt": "2026-06-22T12:00:00.000Z",
        "updatedAt": "2026-06-22T12:30:00.000Z"
    }
]
```

**Sorting:** `gradeLevel ASC`, then `name ASC`.

---

### 3. **Get Class By ID**

**Endpoint:** `GET /classes/:id`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
{
    "id": "class-1",
    "name": "6A",
    "gradeLevel": 6,
    "academicYearId": "year-uuid",
    "classTeacherId": "teacher-profile-uuid",
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:30:00.000Z",
    "academicYear": {
        "id": "year-uuid",
        "name": "2026-27",
        "isCurrent": true
    },
    "classTeacher": {
        "id": "teacher-profile-uuid",
        "employeeCode": "TCH001",
        "user": {
            "id": "teacher-user-uuid",
            "firstName": "Jane",
            "lastName": "Smith",
            "mobileNumber": "9876543211",
            "email": "jane@example.com"
        }
    }
}
```

**Error Responses:**

- `404 Not Found`: class not found

---

### 4. **Update Class**

**Endpoint:** `PATCH /classes/:id`  
**Access:** Admin or Teacher with `CLASS_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (all optional):**

```json
{
    "name": "6B",
    "gradeLevel": 6
}
```

**Validation Rules:**

- at least one of `name` or `gradeLevel` required
- `name`: trimmed, max 20
- `gradeLevel`: integer, min 1

**Response:** updated class object.

**Error Responses:**

- `400 Bad Request`: empty payload, duplicate name, validation failure
- `404 Not Found`: class not found
- `403 Forbidden`: missing permission/role

---

### 5. **Assign Class Teacher**

**Endpoint:** `PATCH /classes/:id/assign-teacher`  
**Access:** Admin or Teacher with `CLASS_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "teacherId": "teacher-profile-uuid"
}
```

**Validation Rules:**

- `teacherId`: required UUID
- teacher must exist
- teacher user must be active

**Response - Success (200 OK):**

```json
{
    "id": "class-1",
    "name": "6A",
    "gradeLevel": 6,
    "academicYearId": "year-uuid",
    "classTeacherId": "teacher-profile-uuid",
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T13:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: teacher is inactive
- `404 Not Found`: class or teacher not found

---

### 6. **Remove Class Teacher**

**Endpoint:** `PATCH /classes/:id/remove-teacher`  
**Access:** Admin or Teacher with `CLASS_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:** empty

**Response:** updated class object with `classTeacherId: null`.

**Error Responses:**

- `400 Bad Request`: class has no teacher assigned
- `404 Not Found`: class not found

---

## Frontend Types

```typescript
type SchoolClass = {
    id: string;
    name: string;
    gradeLevel: number;
    academicYearId: string;
    classTeacherId: string | null;
    createdAt: string;
    updatedAt: string;
};

type SchoolClassWithRelations = SchoolClass & {
    academicYear: {
        id: string;
        name: string;
        isCurrent: boolean;
    };
    classTeacher: null | {
        id: string;
        employeeCode: string;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            mobileNumber: string;
            email?: string;
        };
    };
};
```

---

## Frontend Implementation Notes

### Default Academic Year Behavior

When `academicYearId` is not sent on create/list, backend resolves current year. For predictable UI filtering, include selected `academicYearId` explicitly whenever possible.

### Assignment UX

- teacher dropdown should only show active teachers
- display assignment/removal actions inline in class list row
- refresh class details after assignment updates

### Error Handling

- `400` duplicate name: show user-friendly message about same year scope
- `404` in detail screens: navigate back to classes list

---

## Example Frontend Calls (TypeScript)

```typescript
export const classesApi = {
    create: (payload: { name: string; gradeLevel: number; academicYearId?: string }) =>
        api.post("/classes", payload),
    list: (params?: { academicYearId?: string; gradeLevel?: number }) =>
        api.get("/classes", { params }),
    getById: (id: string) => api.get(`/classes/${id}`),
    update: (id: string, payload: Partial<{ name: string; gradeLevel: number }>) =>
        api.patch(`/classes/${id}`, payload),
    assignTeacher: (id: string, teacherId: string) =>
        api.patch(`/classes/${id}/assign-teacher`, { teacherId }),
    removeTeacher: (id: string) => api.patch(`/classes/${id}/remove-teacher`),
};
```
