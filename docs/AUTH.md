# Authentication Architecture

## Overview

JWT-based authentication with **dual-token** strategy (access + refresh) and a **first-login forced password change** flow.

---

## Token Types

| Token       | Secret               | TTL | Payload                                            | Purpose                        |
| ----------- | -------------------- | --- | -------------------------------------------------- | ------------------------------ |
| Access      | `JWT_ACCESS_SECRET`  | 15m | `sub`, `role`, `permissions`, `type:"access"`      | API authorization              |
| First Login | `JWT_ACCESS_SECRET`  | 15m | `sub`, `role`, `permissions`, `type:"first_login"` | Force password change only     |
| Refresh     | `JWT_REFRESH_SECRET` | 7d  | `sub`, `family`, `type:"refresh"`                  | Obtain new access/refresh pair |

---

## Authentication Flow

### Login

```
Client                          Server
  │                               │
  │  POST /auth/login             │
  │  { mobileNumber, password }   │
  │──────────────────────────────▶│
  │                               │── Validate credentials
  │                               │── Check isActive
  │                               │── Check isFirstLogin
  │                               │
  │  if isFirstLogin:             │
  │◀──────────────────────────────│── { forcePasswordChange: true, firstLoginToken }
  │                               │
  │  else:                        │
  │◀──────────────────────────────│── { accessToken, refreshToken, user }
```

### First Login (Password Change)

```
Client                          Server
  │                               │
  │  POST /auth/change-password   │
  │  Authorization: Bearer <firstLoginToken>
  │  { newPassword }              │
  │──────────────────────────────▶│
  │                               │── Verify token type === "first_login"
  │                               │── Hash & save new password
  │                               │── Set isFirstLogin = false
  │                               │── Issue new access + refresh tokens
  │◀──────────────────────────────│── { accessToken, refreshToken, user }
```

### Voluntary Password Change

```
Client                          Server
  │                               │
  │  POST /auth/change-password   │
  │  Authorization: Bearer <accessToken>
  │  { currentPassword, newPassword }
  │──────────────────────────────▶│
  │                               │── Verify token type === "access"
  │                               │── Verify currentPassword (required)
  │                               │── Hash & save newPassword
  │◀──────────────────────────────│── success
```

### Token Refresh

```
Client                          Server
  │                               │
  │  POST /auth/refresh           │
  │  { refreshToken }             │
  │──────────────────────────────▶│
  │                               │── Verify refresh token (JWT_REFRESH_SECRET)
  │                               │── Check token family & revocation
  │                               │── Revoke old token, issue new pair
  │◀──────────────────────────────│── { accessToken, refreshToken }
```

### Password Reset (Admin)

```
Admin                           Server
  │                               │
  │  POST /auth/reset-password    │
  │  Authorization: Bearer <adminAccessToken>
  │  { userId }                   │
  │──────────────────────────────▶│
  │                               │── Verify admin role
  │                               │── Generate temp password
  │                               │── Set isFirstLogin = true
  │◀──────────────────────────────│── { tempPassword }
```

---

## Refresh Token Rotation

Refresh tokens use **family-based rotation** to detect token reuse:

1. On login, a new `family` UUID is created.
2. Each refresh creates a new token in the same family, revoking the old one.
3. If a revoked token is reused → **all tokens in that family are revoked** (compromise detected).
4. Token hash (`SHA-256`) is stored, not the raw token.

**Session limit:** Max 3 active sessions per user (`MAX_ACTIVE_SESSIONS`).

---

## Password Policy

| Context             | Min Length | Complexity                                        |
| ------------------- | ---------- | ------------------------------------------------- |
| Login (existing)    | 6          | None (validating existing passwords)              |
| Change / Set new    | 8          | Uppercase + lowercase + digit + special character |
| Max length (bcrypt) | 72         | Bcrypt input limit                                |

Temp passwords are 12 chars, generated from `A-Za-z0-9!@#$%^&*` using `crypto.randomBytes`.

---

## Security Notes

- Access and first-login tokens share the same secret but are distinguished by the `type` claim. Guards must validate the `type` field.
- Refresh tokens use a **separate secret** (`JWT_REFRESH_SECRET`).
- Passwords are hashed with **bcrypt** (12 salt rounds).
- Refresh token hashes (not raw values) are stored in the database.
- `P2002` (unique constraint) errors are handled in the global exception filter → `409 Conflict`.
- CORS is open (`*`) in development, disabled in production.
