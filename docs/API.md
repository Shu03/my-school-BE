# API Documentation

**Base URL:** `http://localhost:3000/api/v1`  
**Swagger UI:** `http://localhost:3000/api/docs` (non-production only)

All responses follow a standard envelope:

```json
// Success
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2026-03-16T10:00:00.000Z",
  "data": { ... }
}

// Error
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-03-16T10:00:00.000Z",
  "path": "/api/v1/users",
  "message": "Validation failed"
}
```

---

## Health

### `GET /health`

Database connectivity check via `@nestjs/terminus`.

**Response:** `200 OK`

```json
{
    "status": "ok",
    "info": { "database": { "status": "up" } }
}
```

---

## Users

All user endpoints are prefixed with `/users`.

### `POST /users/admin`

Create an admin account with a temporary password.

**Body:**

| Field          | Type     | Required | Validation                    |
| -------------- | -------- | -------- | ----------------------------- |
| `firstName`    | `string` | Yes      | Max 50 chars, trimmed         |
| `lastName`     | `string` | Yes      | Max 50 chars, trimmed         |
| `mobileNumber` | `string` | Yes      | Valid Indian mobile, trimmed  |
| `email`        | `string` | No       | Valid email, max 255, trimmed |

**Response:** `201 Created`

```json
{
    "user": {
        "id": "uuid",
        "firstName": "...",
        "lastName": "...",
        "mobileNumber": "...",
        "email": null,
        "role": "ADMIN",
        "isActive": true,
        "isFirstLogin": true,
        "createdAt": "...",
        "updatedAt": "...",
        "createdById": "..."
    },
    "tempPassword": "..."
}
```

---

### `POST /users/teacher`

Create a teacher account with profile.

**Body:** All fields from admin, plus:

| Field          | Type     | Required | Validation                    |
| -------------- | -------- | -------- | ----------------------------- |
| `employeeCode` | `string` | Yes      | Max 20 chars, unique, trimmed |
| `joiningDate`  | `string` | No       | ISO 8601 date (strict)        |

**Response:** `201 Created` — User object with nested `teacherProfile`.

---

### `POST /users/student`

Create a student account with profile.

**Body:** All fields from admin, plus:

| Field             | Type     | Required | Validation                    |
| ----------------- | -------- | -------- | ----------------------------- |
| `admissionNumber` | `string` | Yes      | Max 20 chars, unique, trimmed |
| `dateOfBirth`     | `string` | No       | ISO 8601 date (strict)        |

**Response:** `201 Created` — User object with nested `studentProfile`.

---

### `GET /users`

List users with filtering, search, and pagination.

**Query Parameters:**

| Param      | Type      | Default | Validation                                                                        |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `role`     | `Role`    | —       | `ADMIN`, `TEACHER`, or `STUDENT`                                                  |
| `isActive` | `boolean` | —       | `true` or `false`                                                                 |
| `search`   | `string`  | —       | Max 100 chars, case-insensitive search on `firstName`, `lastName`, `mobileNumber` |
| `page`     | `number`  | `1`     | Min 1                                                                             |
| `limit`    | `number`  | `20`    | Min 1, Max 100                                                                    |

**Response:** `200 OK`

```json
{
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `GET /users/:id`

Get a single user by ID, including teacher/student profiles.

**Response:** `200 OK` — User with `teacherProfile` and `studentProfile` (nullable).  
**Errors:** `404` if not found.

---

### `PATCH /users/:id`

Update user's name or email.

**Body:**

| Field       | Type     | Required | Validation                    |
| ----------- | -------- | -------- | ----------------------------- |
| `firstName` | `string` | No       | Max 50 chars, trimmed         |
| `lastName`  | `string` | No       | Max 50 chars, trimmed         |
| `email`     | `string` | No       | Valid email, max 255, trimmed |

**Response:** `200 OK` — Updated user (without password).  
**Errors:** `404` if not found.

---

### `PATCH /users/:id/deactivate`

Soft-deactivate a user account (sets `isActive = false`).

**Response:** `200 OK`  
**Errors:** `404` if not found.

---

### `PATCH /users/:id/activate`

Reactivate a user account (sets `isActive = true`).

**Response:** `200 OK`  
**Errors:** `404` if not found.

---

## Auth

All auth endpoints are prefixed with `/auth`. _(In progress — endpoints not yet implemented.)_

### Planned Endpoints

| Method | Path                    | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| POST   | `/auth/login`           | Login with mobile + password               |
| POST   | `/auth/refresh`         | Refresh access token                       |
| POST   | `/auth/change-password` | Change password (first-login or voluntary) |
| POST   | `/auth/reset-password`  | Admin resets a user's password             |

### Auth DTOs

**LoginDto:**

| Field          | Type     | Required | Validation                   |
| -------------- | -------- | -------- | ---------------------------- |
| `mobileNumber` | `string` | Yes      | Valid Indian mobile, trimmed |
| `password`     | `string` | Yes      | Min 6, Max 72 chars          |

**ChangePasswordDto:**

| Field             | Type     | Required | Validation                                                         |
| ----------------- | -------- | -------- | ------------------------------------------------------------------ |
| `currentPassword` | `string` | No       | Max 72. Optional for first-login, required for voluntary change    |
| `newPassword`     | `string` | Yes      | Min 8, Max 72. Must have uppercase, lowercase, digit, special char |

**RefreshTokenDto:**

| Field          | Type     | Required |
| -------------- | -------- | -------- |
| `refreshToken` | `string` | Yes      |

**ResetPasswordDto:**

| Field    | Type   | Required | Validation |
| -------- | ------ | -------- | ---------- |
| `userId` | `UUID` | Yes      | Valid UUID |

---

## Error Codes

| Status | Meaning               | Common Causes                              |
| ------ | --------------------- | ------------------------------------------ |
| `400`  | Bad Request           | Validation failure, duplicate mobile/code  |
| `404`  | Not Found             | User/record doesn't exist                  |
| `409`  | Conflict              | Prisma unique constraint violation (P2002) |
| `500`  | Internal Server Error | Unexpected errors (logged server-side)     |
