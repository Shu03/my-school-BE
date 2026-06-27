# Frontend Auth Service Implementation Guide

## Overview

The backend uses JWT-based authentication with a **dual-token strategy** (access + refresh) and enforces a **first-login forced password change** flow. The system supports multiple active sessions per user with session rotation security.

---

## API Endpoints

### 1. **Login**

**Endpoint:** `POST /auth/login`  
**Access:** Public (no auth required)  
**Rate Limit:** 5 requests per 60 seconds

**Request Body:**

```json
{
    "mobileNumber": "9999999999",
    "password": "Admin@1234"
}
```

**Validation Rules:**

- `mobileNumber`: Valid Indian mobile number (10 digits)
- `password`: 6-72 characters (existing password validation only)

**Response - Success (Normal User):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN" | "TEACHER" | "STUDENT"
  }
}
```

**Response - First Login (New User):**

```json
{
    "forcePasswordChange": true,
    "firstLoginToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account deactivated
- `429 Too Many Requests`: Rate limit exceeded

---

### 2. **Change Password**

**Endpoint:** `POST /auth/change-password`  
**Access:** Authenticated (Bearer token required)  
**Token Type:** Accepts both `access` token and `first_login` token

**Request Body - First Login (using firstLoginToken):**

```json
{
    "newPassword": "NewPass@123"
}
```

**Request Body - Voluntary Change (using accessToken):**

```json
{
    "currentPassword": "OldPass@123",
    "newPassword": "NewPass@123"
}
```

**Validation Rules:**

- `newPassword`: 8-72 characters
- `newPassword`: Must contain:
    - At least one uppercase letter (A-Z)
    - At least one lowercase letter (a-z)
    - At least one digit (0-9)
    - At least one special character (!@#$%^&\*)
- `newPassword`: Must differ from current password
- `currentPassword`: Required only for voluntary change (access token), not for first login

**Response - Success:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN" | "TEACHER" | "STUDENT"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Validation failed, password policy violation, same password used
- `401 Unauthorized`: Invalid token, wrong current password, user not active

---

### 3. **Refresh Tokens**

**Endpoint:** `POST /auth/refresh`  
**Access:** Public (no auth required)  
**Rate Limit:** 10 requests per 60 seconds

**Request Body:**

```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response - Success:**

```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid refresh token, expired token, token reuse detected

---

### 4. **Logout**

**Endpoint:** `POST /auth/logout`  
**Access:** Authenticated (Bearer access token required)

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response - Success:**

```
204 No Content
```

**Side Effects:**

- Revokes all active sessions for the user
- All existing refresh tokens become invalid

---

### 5. **Get Current User Profile**

**Endpoint:** `GET /auth/me`  
**Access:** Authenticated (Bearer access token required)

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response:**

```json
{
  "id": "user-uuid",
  "mobileNumber": "9999999999",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN" | "TEACHER" | "STUDENT",
  "isActive": true,
  "isFirstLogin": false,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-06-15T14:22:00Z",
  "teacherProfile": {
    "id": "teacher-uuid",
    "userId": "user-uuid",
    "presetId": "preset-uuid-or-null",
    "permissionOverrides": ["perm1", "perm2"]
  },
  "studentProfile": {
    "id": "student-uuid",
    "userId": "user-uuid",
    "rollNumber": "2024-001"
  }
}
```

---

### 6. **Admin Reset Password**

**Endpoint:** `POST /auth/admin/reset-password`  
**Access:** Admin only (requires `ADMIN` role)  
**Admin only operation**

**Headers:**

```
Authorization: Bearer <adminAccessToken>
```

**Request Body:**

```json
{
    "userId": "target-user-uuid"
}
```

**Response - Success:**

```json
{
    "tempPassword": "aB3!xY9pQw2M"
}
```

**Side Effects:**

- Sets user's `isFirstLogin` to `true`
- Revokes all active sessions for the target user
- Records reset in audit logs

**Error Responses:**

- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

---

## Token Types & Payloads

### Access Token

- **Secret:** `JWT_ACCESS_SECRET` (environment variable)
- **TTL:** 15 minutes
- **Type Field:** `"access"`
- **Payload:**

```json
{
  "sub": "user-uuid",
  "role": "ADMIN" | "TEACHER" | "STUDENT",
  "permissions": ["perm1", "perm2", "..."],
  "type": "access",
  "iat": 1645000000,
  "exp": 1645000900
}
```

### First Login Token

- **Secret:** `JWT_ACCESS_SECRET` (same as access token)
- **TTL:** 15 minutes
- **Type Field:** `"first_login"`
- **Payload:**

```json
{
  "sub": "user-uuid",
  "role": "ADMIN" | "TEACHER" | "STUDENT",
  "permissions": [],
  "type": "first_login",
  "iat": 1645000000,
  "exp": 1645000900
}
```

- **Restrictions:** Can ONLY be used to call `POST /auth/change-password`

### Refresh Token

- **Secret:** `JWT_REFRESH_SECRET` (environment variable)
- **TTL:** 7 days
- **Type Field:** `"refresh"`
- **Payload:**

```json
{
    "sub": "user-uuid",
    "family": "token-family-uuid",
    "type": "refresh",
    "iat": 1645000000,
    "exp": 1645604800
}
```

- **Storage:** Token hash (SHA-256) is stored in database, not the raw token
- **Family:** Unique per login session, used for rotation and reuse detection

---

## Authentication Flow Diagrams

### Login Flow

```
┌─────────────┐                                    ┌────────────┐
│   Client    │                                    │   Server   │
└─────────────┘                                    └────────────┘
      │                                                   │
      │  POST /auth/login                                │
      │  { mobileNumber, password }                      │
      ├──────────────────────────────────────────────────▶
      │                                                   │ Validate credentials
      │                                                   │ Check isActive
      │                                                   │ Check isFirstLogin
      │                                                   │
      │  ◀── { firstLoginToken, forcePasswordChange }    │
      │  (if first login)                                │
      │                                                   │
      │  OR                                              │
      │  ◀── { accessToken, refreshToken, user }        │
      │  (if normal login)                               │
```

### First Login Password Change Flow

```
┌─────────────┐                                    ┌────────────┐
│   Client    │                                    │   Server   │
└─────────────┘                                    └────────────┘
      │                                                   │
      │  POST /auth/change-password                      │
      │  Authorization: Bearer <firstLoginToken>         │
      │  { newPassword }                                 │
      ├──────────────────────────────────────────────────▶
      │                                                   │ Verify type == first_login
      │                                                   │ Hash new password
      │                                                   │ Set isFirstLogin = false
      │                                                   │
      │  ◀── { accessToken, refreshToken, user }        │
```

### Token Refresh Flow

```
┌─────────────┐                                    ┌────────────┐
│   Client    │                                    │   Server   │
└─────────────┘                                    └────────────┘
      │                                                   │
      │  POST /auth/refresh                              │
      │  { refreshToken }                                │
      ├──────────────────────────────────────────────────▶
      │                                                   │ Verify JWT signature
      │                                                   │ Check family & revocation
      │                                                   │ Rotate tokens
      │                                                   │
      │  ◀── { accessToken, refreshToken }              │
```

---

## Security Features

### Refresh Token Rotation

- Uses **family-based rotation** to detect token reuse attacks
- Each refresh creates a new token and revokes the old one
- If a revoked token is used → all tokens in that family are revoked
- Each user can have **maximum 3 active sessions**
- Older sessions are automatically revoked when limit is exceeded

### Session Limits

- `MAX_ACTIVE_SESSIONS = 3`
- When user logs in and already has 3 active sessions, the oldest session is invalidated
- Prevents unlimited session proliferation

### Password Hashing

- Algorithm: **bcrypt** (12 salt rounds)
- Input limit: 72 characters (bcrypt limit)
- Never stored in plaintext

### Token Storage

- **Refresh token hashes** (SHA-256) are stored in database, not raw tokens
- Access tokens are not stored (stateless verification)
- No sensitive data in token payload

### Attack Detection

- Token reuse detection via family tracking
- Automatic revocation of entire token family on reuse
- Rate limiting on login (5/min) and refresh (10/min)

---

## Frontend Implementation Checklist

### Authentication Storage

- [ ] Store `accessToken` (short-lived, 15 min)
- [ ] Store `refreshToken` (long-lived, 7 days) securely
- [ ] Store `user` profile data (optional, can fetch via `/auth/me`)
- [ ] Clear all auth data on logout

### HTTP Interceptor/Middleware

- [ ] Add `Authorization: Bearer <accessToken>` to all authenticated requests
- [ ] Intercept 401 responses and attempt token refresh
- [ ] On refresh success, retry original request with new access token
- [ ] On refresh failure (401), redirect to login

### Token Refresh Logic

```
1. If access token expires (401 on API call):
   a. Call POST /auth/refresh with refreshToken
   b. If success: Store new tokens, retry original request
   c. If failure: Clear auth data, redirect to login
2. Refresh tokens before expiry (optional, proactive):
   a. Schedule refresh 1-2 minutes before expiry
   b. No user interaction required
```

### First Login Handling

```
1. After login, check response:
   a. If forcePasswordChange === true:
      - Show password change form (required)
      - Use firstLoginToken in Authorization header
      - Submit new password to POST /auth/change-password
   b. If forcePasswordChange is undefined:
      - User has completed initial setup
      - Proceed to main app with normal tokens
```

### Password Change Implementation

- **First Login:** No currentPassword required, only newPassword
- **Voluntary Change:** Both currentPassword and newPassword required
- **Validation on Frontend:**
    - newPassword: 8-72 chars
    - Must contain: uppercase, lowercase, digit, special char
    - Cannot match current password
- **Backend Validation:** Same checks repeated

### Error Handling

- `400 Bad Request`: Validation error, show user-friendly message
- `401 Unauthorized`: Invalid/expired token, redirect to login
- `403 Forbidden`: Account deactivated or insufficient permissions
- `429 Too Many Requests`: Rate limited, show cooldown message
- `404 Not Found`: Resource not found

### Session Management

- [ ] Display current user info from `/auth/me` endpoint
- [ ] Implement logout that clears all sessions
- [ ] Optional: Show active sessions count (max 3)
- [ ] Optional: Implement session switching (logout other devices)

---

## Environment Configuration

Frontend needs to configure API base URL:

```
VITE_API_URL=http://localhost:3000  # or production URL
```

Backend requires these environment variables:

```
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Example Frontend Usage (TypeScript/React)

### Login

```typescript
const login = async (mobileNumber: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber, password }),
    });

    const data = await response.json();

    if (data.forcePasswordChange) {
        // First login - show password change form
        setFirstLoginToken(data.firstLoginToken);
        setShowPasswordChange(true);
    } else {
        // Normal login
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setUser(data.user);
    }
};
```

### Refresh Token

```typescript
const refreshAccessToken = async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
    });

    const data = await response.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
};
```

### API Request with Auto-Refresh

```typescript
const apiCall = async (url: string, options = {}) => {
    let headers = {
        Authorization: `Bearer ${getAccessToken()}`,
        ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Try to refresh token
        const newToken = await refreshAccessToken();
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
    }

    if (!response.ok && response.status === 401) {
        // Refresh failed, redirect to login
        redirectToLogin();
    }

    return response.json();
};
```

---

## Common Scenarios

### Scenario 1: User logs in for the first time

1. Frontend calls `POST /auth/login`
2. Backend returns `{ forcePasswordChange: true, firstLoginToken }`
3. Frontend shows password change modal
4. User enters new password
5. Frontend calls `POST /auth/change-password` with `firstLoginToken`
6. Backend returns `{ accessToken, refreshToken, user }`
7. Frontend stores tokens and redirects to dashboard

### Scenario 2: Access token expires during API call

1. Frontend makes API call with expired access token
2. Backend returns 401 Unauthorized
3. Frontend automatically calls `POST /auth/refresh` with refresh token
4. Backend returns new access + refresh token pair
5. Frontend retries original API call with new token
6. API call succeeds

### Scenario 3: Admin resets user password

1. Admin calls `POST /auth/admin/reset-password` with target userId
2. Backend generates temp password and returns it
3. Admin shares temp password with user (out-of-band)
4. User logs in with temp password → receives `firstLoginToken`
5. User must change password before accessing app

### Scenario 4: Token reuse detected (security incident)

1. User logs in on Device A → receives refresh token family "X"
2. Attacker steals refresh token from Device A
3. Attacker uses old refresh token on Device B
4. Backend detects revoked token reuse
5. Backend revokes entire family "X"
6. User on Device A is automatically logged out
7. User must log in again with new family

---

## Permissions System

User permissions are embedded in the access token and determined by:

1. **Teacher's permission preset** (base permissions for role)
2. **Permission overrides** (individual additions to preset)

Example permissions array in token:

```json
{
    "permissions": ["view_students", "edit_grades", "manage_classes", "view_reports"]
}
```

Recommendations for frontend:

- [ ] Use permissions array to show/hide UI components
- [ ] Implement permission guard for routes/buttons
- [ ] Handle 403 Forbidden errors gracefully
- [ ] Example: `if (user.permissions.includes('edit_grades')) { showGradeEditor() }`

---

## Status Codes Reference

| Code | Meaning           | Action                                          |
| ---- | ----------------- | ----------------------------------------------- |
| 200  | Success           | Proceed normally                                |
| 400  | Bad Request       | Show validation error to user                   |
| 401  | Unauthorized      | Token invalid/expired, attempt refresh          |
| 403  | Forbidden         | Insufficient permissions or deactivated account |
| 404  | Not Found         | Resource doesn't exist                          |
| 429  | Too Many Requests | Rate limited, wait before retry                 |
| 500  | Server Error      | Show generic error, contact support             |

---

## Useful Constants

```typescript
// Token types
TOKEN_TYPE_ACCESS = "access";
TOKEN_TYPE_FIRST_LOGIN = "first_login";
TOKEN_TYPE_REFRESH = "refresh";

// Expiration times (configured server-side)
ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes
REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
FIRST_LOGIN_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes

// Rate limits
LOGIN_RATE_LIMIT = 5; // requests per 60 seconds
REFRESH_RATE_LIMIT = 10; // requests per 60 seconds

// User roles
USER_ROLES = {
    ADMIN: "ADMIN",
    TEACHER: "TEACHER",
    STUDENT: "STUDENT",
};

// Max active sessions
MAX_ACTIVE_SESSIONS = 3;
```

---

## Support & Questions

For questions about specific endpoints or behaviors, refer to the backend documentation:

- API Docs: `/docs` (Swagger/OpenAPI)
- Authentication Docs: `docs/AUTH.md`
- Schema: `docs/SCHEMA.md`
- Architecture: `docs/ARCHITECTURE.md`
