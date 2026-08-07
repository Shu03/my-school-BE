# Frontend School Service Implementation Guide

## Overview

The School module handles:

- school-wide settings (weekly off-days)
- holiday creation and deletion
- holiday listing by academic year
- school-day determination used by attendance workflows

This guide documents all `/school` endpoints for frontend integration.

---

## API Endpoints

All endpoints are prefixed with `/school`.

## Access Matrix

| Endpoint | ADMIN | TEACHER | STUDENT |
| --- | --- | --- | --- |
| `GET /school/settings` | Yes | No | No |
| `PATCH /school/settings` | Yes | No | No |
| `POST /school/holidays` | Yes | No | No |
| `GET /school/holidays` | Yes | Yes | Yes |
| `DELETE /school/holidays/:id` | Yes | No | No |

Note: `GET /school/holidays` is authenticated and does not have role restriction in controller.

---

## Endpoint Details

### 1. Get School Settings

**Endpoint:** `GET /school/settings`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
{
    "id": "settings-uuid",
    "weeklyOffDays": [0],
    "createdAt": "2026-06-27T08:00:00.000Z",
    "updatedAt": "2026-06-27T08:00:00.000Z"
}
```

**Behavior:**

- If settings do not exist yet, backend auto-creates them with default `weeklyOffDays: [0]` (Sunday).

**Error Responses:**

- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin

---

### 2. Update School Settings

**Endpoint:** `PATCH /school/settings`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "weeklyOffDays": [0, 6]
}
```

**Validation Rules:**

- `weeklyOffDays`: required, non-empty array
- every value must be integer from `0` to `6`
  - `0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat`

**Response - Success (200 OK):**

Returns updated settings object.

**Error Responses:**

- `400 Bad Request`: validation failure or no fields provided
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin

---

### 3. Create Holiday

**Endpoint:** `POST /school/holidays`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "Independence Day",
    "date": "2026-08-15",
    "academicYearId": "academic-year-uuid"
}
```

**Validation Rules:**

- `name`: required, trimmed, non-empty, max 100
- `date`: required strict ISO 8601 date
- `academicYearId`: required UUID

**Response - Success (201 Created):**

```json
{
    "id": "holiday-uuid",
    "name": "Independence Day",
    "date": "2026-08-15T00:00:00.000Z",
    "academicYearId": "academic-year-uuid",
    "createdAt": "2026-06-27T09:00:00.000Z",
    "updatedAt": "2026-06-27T09:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: validation failure
- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `409 Conflict`: holiday already exists on the same date for that academic year

---

### 4. List Holidays

**Endpoint:** `GET /school/holidays`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `academicYearId` | UUID | current year | Academic year to fetch holidays for |

**Example:**

```http
GET /school/holidays?academicYearId=academic-year-uuid
```

**Response - Success (200 OK):**

```json
[
    {
        "id": "holiday-uuid-1",
        "name": "Independence Day",
        "date": "2026-08-15T00:00:00.000Z",
        "academicYearId": "academic-year-uuid",
        "createdAt": "2026-06-27T09:00:00.000Z",
        "updatedAt": "2026-06-27T09:00:00.000Z"
    },
    {
        "id": "holiday-uuid-2",
        "name": "Gandhi Jayanti",
        "date": "2026-10-02T00:00:00.000Z",
        "academicYearId": "academic-year-uuid",
        "createdAt": "2026-06-27T09:05:00.000Z",
        "updatedAt": "2026-06-27T09:05:00.000Z"
    }
]
```

**Ordering:** `date ASC`.

**Behavior:**

- If `academicYearId` is not provided, backend resolves current academic year.

**Error Responses:**

- `400 Bad Request`: invalid query params
- `401 Unauthorized`: invalid or missing token
- `404 Not Found`: current academic year not configured (when query param omitted)

---

### 5. Delete Holiday

**Endpoint:** `DELETE /school/holidays/:id`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Path Parameters:**

- `id` (UUID): holiday id

**Response - Success (200 OK):**

Empty response body.

**Error Responses:**

- `401 Unauthorized`: invalid or missing token
- `403 Forbidden`: not an admin
- `404 Not Found`: holiday not found

---

## Frontend Types

```typescript
type SchoolSettings = {
    id: string;
    weeklyOffDays: number[];
    createdAt: string;
    updatedAt: string;
};

type Holiday = {
    id: string;
    name: string;
    date: string;
    academicYearId: string;
    createdAt: string;
    updatedAt: string;
};
```

---

## Frontend Implementation Notes

### Weekly Off-Day UX

- Use fixed weekday mapping: `0=Sun` through `6=Sat`.
- Enforce non-empty selection in form before submit.

### Holiday Date Handling

- Send date as ISO date string (`YYYY-MM-DD`).
- Treat duplicate-date conflicts (`409`) as user-friendly "holiday already exists" messages.

### Attendance Dependency

- Attendance marking depends on school settings + holidays to determine school day.
- Any settings/holiday change can impact attendance mark eligibility for dates.
