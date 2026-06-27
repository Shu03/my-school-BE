# Frontend Academic Years Service Implementation Guide

## Overview

The Academic Years module manages school year cycles and terms. It supports creating and updating academic years, setting the current year, and managing terms inside each year.

---

## API Endpoints

All endpoints are prefixed with `/academic-years`.

### 1. **Create Academic Year**

**Endpoint:** `POST /academic-years`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "2026-27",
    "startDate": "2026-04-01",
    "endDate": "2027-03-31",
    "copyClassStructureFromCurrent": true
}
```

**Validation Rules:**

- `name`: required, string, trimmed, max 20
- `startDate`: required, strict ISO date
- `endDate`: required, strict ISO date
- `copyClassStructureFromCurrent`: optional boolean
- `startDate` must be before `endDate`
- `name` must be unique

**Response - Success (201 Created):**

```json
{
    "id": "academic-year-uuid",
    "name": "2026-27",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2027-03-31T00:00:00.000Z",
    "isCurrent": false,
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: validation failed, duplicate year name, invalid date range
- `403 Forbidden`: missing permission or role
- `401 Unauthorized`: missing/invalid token

---

### 2. **List Academic Years**

**Endpoint:** `GET /academic-years`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
[
    {
        "id": "year-2",
        "name": "2026-27",
        "startDate": "2026-04-01T00:00:00.000Z",
        "endDate": "2027-03-31T00:00:00.000Z",
        "isCurrent": true,
        "createdAt": "2026-06-22T12:00:00.000Z",
        "updatedAt": "2026-06-22T12:10:00.000Z"
    },
    {
        "id": "year-1",
        "name": "2025-26",
        "startDate": "2025-04-01T00:00:00.000Z",
        "endDate": "2026-03-31T00:00:00.000Z",
        "isCurrent": false,
        "createdAt": "2025-06-22T12:00:00.000Z",
        "updatedAt": "2026-04-01T12:00:00.000Z"
    }
]
```

**Sorting:** newest `startDate` first.

---

### 3. **Get Current Academic Year**

**Endpoint:** `GET /academic-years/current`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
{
    "id": "year-2",
    "name": "2026-27",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2027-03-31T00:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:10:00.000Z",
    "terms": [
        {
            "id": "term-1",
            "name": "Term 1",
            "startDate": "2026-04-01T00:00:00.000Z",
            "endDate": "2026-09-30T00:00:00.000Z",
            "academicYearId": "year-2",
            "createdAt": "2026-06-22T12:20:00.000Z",
            "updatedAt": "2026-06-22T12:20:00.000Z"
        }
    ]
}
```

**Error Responses:**

- `404 Not Found`: no current academic year configured

---

### 4. **Get Academic Year By ID**

**Endpoint:** `GET /academic-years/:id`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Response:** same shape as current year response.

**Error Responses:**

- `404 Not Found`: academic year not found

---

### 5. **Update Academic Year**

**Endpoint:** `PATCH /academic-years/:id`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (all optional):**

```json
{
    "name": "2026-27",
    "startDate": "2026-04-01",
    "endDate": "2027-03-31"
}
```

**Validation Rules:**

- at least one field required
- `name`: trimmed, max 20, unique
- dates must remain a valid range (`startDate < endDate`)

**Response - Success (200 OK):**

```json
{
    "id": "academic-year-uuid",
    "name": "2026-27",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2027-03-31T00:00:00.000Z",
    "isCurrent": false,
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T13:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: no fields, duplicate name, invalid range
- `404 Not Found`: year not found

---

### 6. **Set Current Academic Year**

**Endpoint:** `PATCH /academic-years/:id/set-current`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:** empty

**Response - Success (200 OK):** updated academic year.

**Error Responses:**

- `400 Bad Request`: already current
- `400 Bad Request`: year not found

**Side Effects:**

- existing current year is unset
- target year is marked current

---

### 7. **Create Term**

**Endpoint:** `POST /academic-years/:id/terms`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body:**

```json
{
    "name": "Term 1",
    "startDate": "2026-04-01",
    "endDate": "2026-09-30"
}
```

**Validation Rules:**

- `name`: required, trimmed, max 50
- `startDate` and `endDate`: required strict ISO dates
- `startDate < endDate`
- term range must be inside academic year range
- term dates must not overlap existing terms in the same year

**Response - Success (201 Created):**

```json
{
    "id": "term-uuid",
    "name": "Term 1",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2026-09-30T00:00:00.000Z",
    "academicYearId": "academic-year-uuid",
    "createdAt": "2026-06-22T13:20:00.000Z",
    "updatedAt": "2026-06-22T13:20:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: invalid range, out-of-bounds term dates, overlap with existing term
- `400 Bad Request`: academic year not found

---

### 8. **List Terms By Academic Year**

**Endpoint:** `GET /academic-years/:id/terms`  
**Access:** Authenticated user  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success (200 OK):**

```json
[
    {
        "id": "term-1",
        "name": "Term 1",
        "startDate": "2026-04-01T00:00:00.000Z",
        "endDate": "2026-09-30T00:00:00.000Z",
        "academicYearId": "year-2",
        "createdAt": "2026-06-22T12:20:00.000Z",
        "updatedAt": "2026-06-22T12:20:00.000Z"
    }
]
```

**Sorting:** `startDate` ascending.

---

### 9. **Update Term**

**Endpoint:** `PATCH /academic-years/:id/terms/:termId`  
**Access:** Admin or Teacher with `ACADEMIC_YEAR_MANAGE` permission  
**Headers:** `Authorization: Bearer <accessToken>`

**Request Body (all optional):**

```json
{
    "name": "Term 1 - Revised",
    "startDate": "2026-04-05",
    "endDate": "2026-10-01"
}
```

**Validation Rules:**

- at least one field required
- updated range must remain valid and non-overlapping
- updated range must remain inside academic year bounds

**Response:** updated term object.

**Error Responses:**

- `400 Bad Request`: no fields, overlap, out-of-bounds, invalid range, academic year not found
- `404 Not Found`: term not found

---

### 10. **Delete Term**

**Endpoint:** `DELETE /academic-years/:id/terms/:termId`  
**Access:** Admin only  
**Headers:** `Authorization: Bearer <accessToken>`

**Response - Success:** `200 OK` with empty body.

**Error Responses:**

- `400 Bad Request`: academic year not found
- `404 Not Found`: term not found

---

## Frontend Types

```typescript
type Term = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    academicYearId: string;
    createdAt: string;
    updatedAt: string;
};

type AcademicYear = {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string;
};

type AcademicYearWithTerms = AcademicYear & {
    terms: Term[];
};
```

---

## Frontend Implementation Notes

### Recommended UI Flows

1. Settings page to create year and set current year.
2. Terms tab inside academic year details.
3. Read-only year/term selector for modules that depend on current year.

### Validation Before Submit

- enforce `startDate < endDate` in the form
- prevent creating terms outside selected year boundaries
- show conflict message for overlap errors from API

### Error Handling

- `400`: show field-level validation or business-rule error
- `403`: show permission denied message
- `404`: refresh list and show not-found toast

---

## Example Frontend Calls (TypeScript)

```typescript
export const academicYearsApi = {
    list: () => api.get("/academic-years"),
    current: () => api.get("/academic-years/current"),
    create: (payload: {
        name: string;
        startDate: string;
        endDate: string;
        copyClassStructureFromCurrent?: boolean;
    }) => api.post("/academic-years", payload),
    update: (id: string, payload: Partial<{ name: string; startDate: string; endDate: string }>) =>
        api.patch(`/academic-years/${id}`, payload),
    setCurrent: (id: string) => api.patch(`/academic-years/${id}/set-current`),
    listTerms: (id: string) => api.get(`/academic-years/${id}/terms`),
    createTerm: (id: string, payload: { name: string; startDate: string; endDate: string }) =>
        api.post(`/academic-years/${id}/terms`, payload),
    updateTerm: (
        id: string,
        termId: string,
        payload: Partial<{ name: string; startDate: string; endDate: string }>,
    ) => api.patch(`/academic-years/${id}/terms/${termId}`, payload),
    deleteTerm: (id: string, termId: string) => api.delete(`/academic-years/${id}/terms/${termId}`),
};
```
