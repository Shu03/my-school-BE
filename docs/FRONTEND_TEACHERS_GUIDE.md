# Frontend Teachers Service Implementation Guide

## Overview

The Teachers module handles:

- permission presets
- teacher profile management
- preset and override permissions assignment
- teacher class/subject assignments

This module has strict role checks and ownership checks for teacher self-access endpoints.

---

## API Endpoints

All endpoints are prefixed with `/teachers`.

## Permission Presets

### 1. **Create Permission Preset**

**Endpoint:** `POST /teachers/presets`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "Class Teacher",
    "permissions": ["ATTENDANCE_READ", "ATTENDANCE_WRITE"]
}
```

**Validation Rules:**

- `name`: required, trimmed, max 50, unique
- `permissions`: required non-empty array
- every permission must be one of allowed values (see list below)

**Response - Success (201 Created):**

```json
{
    "id": "preset-uuid",
    "name": "Class Teacher",
    "permissions": ["ATTENDANCE_READ", "ATTENDANCE_WRITE"],
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z"
}
```

---

### 2. **List Presets**

**Endpoint:** `GET /teachers/presets`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Response:** array of presets sorted by `name`.

---

### 3. **Get Preset By ID**

**Endpoint:** `GET /teachers/presets/:presetId`  
**Access:** Admin only

**Error Responses:**

- `404 Not Found`: preset not found

---

### 4. **Update Preset**

**Endpoint:** `PATCH /teachers/presets/:presetId`  
**Access:** Admin only

**Request Body (all optional):**

```json
{
    "name": "Senior Class Teacher",
    "permissions": ["ATTENDANCE_READ", "ATTENDANCE_WRITE", "GRADES_READ"]
}
```

**Validation Rules:**

- at least one field required
- `name` remains unique
- permissions must be valid constants

**Error Responses:**

- `400 Bad Request`: empty payload, duplicate name, validation failure
- `404 Not Found`: preset not found

---

### 5. **Delete Preset**

**Endpoint:** `DELETE /teachers/presets/:presetId`  
**Access:** Admin only

**Response - Success:** `200 OK` with empty body.

**Deletion Guard:** cannot delete while assigned to one or more teachers.

**Error Responses:**

- `400 Bad Request`: preset assigned to teachers
- `404 Not Found`: preset not found

---

## Teacher Profiles

### 6. **List Teachers**

**Endpoint:** `GET /teachers`  
**Access:** Admin only

**Response - Success (200 OK):**

```json
[
    {
        "id": "teacher-profile-uuid",
        "userId": "teacher-user-uuid",
        "employeeCode": "TCH001",
        "joiningDate": "2024-01-15T00:00:00.000Z",
        "presetId": "preset-uuid",
        "permissionOverrides": ["ANNOUNCEMENTS_MANAGE"],
        "createdAt": "2026-06-22T11:00:00.000Z",
        "updatedAt": "2026-06-22T11:00:00.000Z",
        "user": {
            "id": "teacher-user-uuid",
            "firstName": "Jane",
            "lastName": "Smith",
            "mobileNumber": "9876543211",
            "email": "jane@example.com",
            "role": "TEACHER",
            "isActive": true
        },
        "preset": {
            "id": "preset-uuid",
            "name": "Class Teacher",
            "permissions": ["ATTENDANCE_READ", "ATTENDANCE_WRITE"]
        }
    }
]
```

---

### 7. **Get Teacher Profile**

**Endpoint:** `GET /teachers/:id`  
**Access:** Admin or Teacher (self only for teacher role)

**Rules:**

- Admin can view any teacher profile
- Teacher role can only view own profile (`teacher.userId === token.sub`)

**Response:** teacher profile with user, preset, and class assignments.

**Error Responses:**

- `403 Forbidden`: teacher tries to access another teacher profile
- `404 Not Found`: teacher not found

---

### 8. **Update Teacher Profile**

**Endpoint:** `PATCH /teachers/:id`  
**Access:** Admin only

**Request Body (all optional):**

```json
{
    "employeeCode": "TCH002",
    "joiningDate": "2024-01-15"
}
```

**Validation Rules:**

- at least one field required
- `employeeCode`: trimmed, max 20, unique
- `joiningDate`: strict ISO date

**Error Responses:**

- `400 Bad Request`: empty payload or duplicate employee code
- `404 Not Found`: teacher not found

---

### 9. **Assign Preset To Teacher**

**Endpoint:** `PATCH /teachers/:id/assign-preset`  
**Access:** Admin only

**Request Body:**

```json
{
    "presetId": "preset-uuid"
}
```

**Validation Rules:**

- `presetId`: required UUID
- teacher and preset must exist

---

### 10. **Remove Preset From Teacher**

**Endpoint:** `PATCH /teachers/:id/remove-preset`  
**Access:** Admin only

**Request Body:** empty

**Error Responses:**

- `400 Bad Request`: no preset currently assigned
- `404 Not Found`: teacher not found

---

### 11. **Replace Permission Overrides**

**Endpoint:** `PATCH /teachers/:id/permissions`  
**Access:** Admin only

**Request Body:**

```json
{
    "permissionOverrides": ["ANNOUNCEMENTS_MANAGE", "REPORTS_VIEW"]
}
```

**Important:** this replaces the full override list, not a partial merge.

---

## Teacher Assignments

### 12. **Create Assignment**

**Endpoint:** `POST /teachers/:id/assignments`  
**Access:** Admin only

**Request Body:**

```json
{
    "classId": "class-uuid",
    "role": "SUBJECT_TEACHER",
    "subjectId": "subject-uuid"
}
```

**Role Rules:**

- `role` must be `CLASS_TEACHER` or `SUBJECT_TEACHER`
- for `SUBJECT_TEACHER`, `subjectId` is required
- for `CLASS_TEACHER`, `subjectId` must not be provided

**Business Rules:**

- class must exist
- subject must exist when provided
- subject grade level must match class grade level
- class can have only one `CLASS_TEACHER` assignment

**Response:** assignment with embedded class and subject.

**Error Responses:**

- `400 Bad Request`: invalid role/subject combination, grade mismatch, duplicate class teacher
- `404 Not Found`: teacher, class, or subject not found

---

### 13. **List Teacher Assignments**

**Endpoint:** `GET /teachers/:id/assignments`  
**Access:** Admin or Teacher (self only for teacher role)

**Rules:**

- Admin can list any teacher assignments
- Teacher can list only own assignments

**Response:** assignments sorted by class grade then class name.

**Error Responses:**

- `403 Forbidden`: teacher accessing another teacher's assignments
- `404 Not Found`: teacher not found

---

### 14. **Delete Assignment**

**Endpoint:** `DELETE /teachers/:id/assignments/:assignmentId`  
**Access:** Admin only

**Response - Success:** `200 OK` with empty body.

**Error Responses:**

- `403 Forbidden`: assignment does not belong to provided teacher id
- `404 Not Found`: teacher or assignment not found

---

## Allowed Permissions

`permissionOverrides` and preset `permissions` must use only these values:

- `LEAVE_APPLY`
- `ACADEMIC_YEAR_MANAGE`
- `CLASS_MANAGE`
- `SUBJECT_MANAGE`
- `ATTENDANCE_READ`
- `ATTENDANCE_WRITE`
- `GRADES_READ`
- `GRADES_WRITE`
- `NOTES_UPLOAD`
- `HOMEWORK_MANAGE`
- `ANNOUNCEMENTS_MANAGE`
- `REPORTS_VIEW`

---

## Frontend Types

```typescript
type TeacherClassRole = "CLASS_TEACHER" | "SUBJECT_TEACHER";

type PermissionPreset = {
    id: string;
    name: string;
    permissions: string[];
    createdAt: string;
    updatedAt: string;
};

type TeacherProfile = {
    id: string;
    userId: string;
    employeeCode: string;
    joiningDate?: string;
    presetId?: string | null;
    permissionOverrides: string[];
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        mobileNumber: string;
        email?: string;
        role: "TEACHER";
        isActive: boolean;
    };
    preset: PermissionPreset | null;
};
```

---

## Frontend Implementation Notes

### Effective Permissions

For a teacher, effective permissions are:

- permissions from assigned preset
- plus `permissionOverrides`

If your frontend surfaces permission chips, merge and deduplicate before display.

### Ownership-Aware UI

For teacher role users:

- profile page should call only own teacher id
- assignments page should use own teacher id
- hide admin-only controls (preset CRUD, assignment create/delete, update teacher)

### Error Handling

- `403` on self-restricted endpoints: show "You can only access your own data"
- `400` assignment rules: map errors to form controls (`role`, `subjectId`, `classId`)

---

## Example Frontend Calls (TypeScript)

```typescript
export const teachersApi = {
    // Presets
    createPreset: (payload: { name: string; permissions: string[] }) =>
        api.post("/teachers/presets", payload),
    listPresets: () => api.get("/teachers/presets"),
    getPreset: (presetId: string) => api.get(`/teachers/presets/${presetId}`),
    updatePreset: (presetId: string, payload: Partial<{ name: string; permissions: string[] }>) =>
        api.patch(`/teachers/presets/${presetId}`, payload),
    deletePreset: (presetId: string) => api.delete(`/teachers/presets/${presetId}`),

    // Teachers
    listTeachers: () => api.get("/teachers"),
    getTeacher: (id: string) => api.get(`/teachers/${id}`),
    updateTeacher: (id: string, payload: Partial<{ employeeCode: string; joiningDate: string }>) =>
        api.patch(`/teachers/${id}`, payload),
    assignPreset: (id: string, presetId: string) =>
        api.patch(`/teachers/${id}/assign-preset`, { presetId }),
    removePreset: (id: string) => api.patch(`/teachers/${id}/remove-preset`),
    replaceOverrides: (id: string, permissionOverrides: string[]) =>
        api.patch(`/teachers/${id}/permissions`, { permissionOverrides }),

    // Assignments
    createAssignment: (
        id: string,
        payload: { classId: string; role: TeacherClassRole; subjectId?: string },
    ) => api.post(`/teachers/${id}/assignments`, payload),
    listAssignments: (id: string) => api.get(`/teachers/${id}/assignments`),
    deleteAssignment: (id: string, assignmentId: string) =>
        api.delete(`/teachers/${id}/assignments/${assignmentId}`),
};
```
