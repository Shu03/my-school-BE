# Frontend Subjects Service Implementation Guide

## Overview

The Subjects module manages grade-wise subjects and their metadata. It supports create/list/read/update/delete operations and links each subject to teacher assignments.

---

## API Endpoints

All endpoints are prefixed with `/subjects`.

### 1. **Create Subject**

**Endpoint:** `POST /subjects`  
**Access:** Admin or Teacher with `SUBJECT_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "Mathematics",
    "code": "MATH",
    "gradeLevel": 6,
    "description": "Core mathematics for grade 6"
}
```

**Validation Rules:**

- `name`: required, trimmed, max 100
- `code`: required, trimmed, auto-uppercased, max 10
- `gradeLevel`: required integer, min 1
- `description`: optional, trimmed, max 500
- name must be unique per grade
- code must be unique per grade

**Response - Success (201 Created):**

```json
{
    "id": "subject-uuid",
    "name": "Mathematics",
    "code": "MATH",
    "gradeLevel": 6,
    "description": "Core mathematics for grade 6",
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: duplicate name/code in grade or validation failure
- `403 Forbidden`: missing permission/role

---

### 2. **List Subjects**

**Endpoint:** `GET /subjects`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter    | Type   | Required | Description                           |
| ------------ | ------ | -------- | ------------------------------------- |
| `gradeLevel` | number | No       | Filter by grade                       |
| `search`     | string | No       | Case-insensitive name contains search |

**Example:**

```http
GET /subjects?gradeLevel=6&search=math
```

**Response - Success (200 OK):**

```json
[
    {
        "id": "subject-uuid",
        "name": "Mathematics",
        "code": "MATH",
        "gradeLevel": 6,
        "description": "Core mathematics for grade 6",
        "createdAt": "2026-06-22T12:00:00.000Z",
        "updatedAt": "2026-06-22T12:00:00.000Z"
    }
]
```

**Sorting:** `gradeLevel ASC`, then `name ASC`.

---

### 3. **Get Subject By ID**

**Endpoint:** `GET /subjects/:id`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
{
    "id": "subject-uuid",
    "name": "Mathematics",
    "code": "MATH",
    "gradeLevel": 6,
    "description": "Core mathematics",
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z",
    "teacherAssignments": [
        {
            "id": "assignment-uuid",
            "teacherId": "teacher-profile-uuid",
            "classId": "class-uuid",
            "subjectId": "subject-uuid",
            "role": "SUBJECT_TEACHER",
            "createdAt": "2026-06-22T13:00:00.000Z",
            "teacher": {
                "id": "teacher-profile-uuid",
                "employeeCode": "TCH001",
                "user": {
                    "id": "teacher-user-uuid",
                    "firstName": "Jane",
                    "lastName": "Smith"
                }
            },
            "class": {
                "id": "class-uuid",
                "name": "6A",
                "gradeLevel": 6
            }
        }
    ]
}
```

**Error Responses:**

- `404 Not Found`: subject not found

---

### 4. **Update Subject**

**Endpoint:** `PATCH /subjects/:id`  
**Access:** Admin or Teacher with `SUBJECT_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (all optional):**

```json
{
    "name": "Advanced Mathematics",
    "code": "AMATH",
    "description": "Updated description"
}
```

**Validation Rules:**

- at least one field required (`name`, `code`, `description`)
- updated name/code must remain unique for same grade level

**Response:** updated subject object.

**Error Responses:**

- `400 Bad Request`: empty payload, duplicate name/code, validation failure
- `404 Not Found`: subject not found

---

### 5. **Delete Subject**

**Endpoint:** `DELETE /subjects/:id`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success:** `200 OK` with empty body.

**Deletion Guard:** subject cannot be deleted if active teacher assignments exist.

**Error Responses:**

- `400 Bad Request`: subject still has assignments
- `404 Not Found`: subject not found

---

## Frontend Types

```typescript
type Subject = {
    id: string;
    name: string;
    code: string;
    gradeLevel: number;
    description?: string;
    createdAt: string;
    updatedAt: string;
};

type SubjectWithAssignments = Subject & {
    teacherAssignments: Array<{
        id: string;
        teacherId: string;
        classId: string;
        subjectId: string | null;
        role: "CLASS_TEACHER" | "SUBJECT_TEACHER";
        createdAt: string;
        class: {
            id: string;
            name: string;
            gradeLevel: number;
        };
        teacher: {
            id: string;
            employeeCode: string;
            user: {
                id: string;
                firstName: string;
                lastName: string;
            };
        };
    }>;
};
```

---

## Frontend Implementation Notes

### Data Entry UX

- auto-transform subject code to uppercase in form before submit
- optionally debounce search input for `GET /subjects`
- warn before delete and show dependency message when assignment exists

### Filtering UX

- grade filter + text search work together
- preserve filters in URL query params for shareable views

### Error Handling

- `400` duplicate errors should map to name/code fields
- `404` should redirect to subject list from detail page

---

## Example Frontend Calls (TypeScript)

```typescript
export const subjectsApi = {
    create: (payload: { name: string; code: string; gradeLevel: number; description?: string }) =>
        api.post("/subjects", payload),
    list: (params?: { gradeLevel?: number; search?: string }) => api.get("/subjects", { params }),
    getById: (id: string) => api.get(`/subjects/${id}`),
    update: (id: string, payload: Partial<{ name: string; code: string; description: string }>) =>
        api.patch(`/subjects/${id}`, payload),
    remove: (id: string) => api.delete(`/subjects/${id}`),
};
```
