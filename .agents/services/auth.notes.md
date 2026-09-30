<!-- source-hash: 8e5d6b00aee1 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-auth by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp auth`. -->

## Purpose
Handles login by mobile number and password, a forced password change on first login, refresh-token rotation with reuse detection, logout, admin password reset, and GET /me.
## Business rules & invariants
- `login` (auth.service.ts:90-174):
  - A missing user and a wrong password both return 401 "Invalid credentials".
  - An inactive user gets 403. The password is checked first, so this reveals that the account exists and is inactive.
  - If `isFirstLogin`, the caller gets only a `first_login` token (FIRST_LOGIN_TOKEN_EXPIRY) and no refresh token.
  - Otherwise, in an interactive `$transaction`, it revokes the oldest session when active sessions ≥ MAX_ACTIVE_SESSIONS, then stores the sha-hashed refresh token (:137-162).
- `refresh` (:195-278):
  - Verifies the JWT and requires type=refresh.
  - If the hash is not found, it revokes the whole family and returns 401. If the token is revoked, it revokes the family and returns "Token reuse detected".
  - It also checks DB expiry and that the user is active, then rotates in a batch `$transaction` (revoke old + create new, same family).
- `changePassword` (:284-365):
  - With an access-type token, currentPassword is required and must match.
  - The new password must differ from the current one.
  - A first_login token also sets isFirstLogin=false.
  - All tokens are revoked, then a new session is created.
- `adminResetPassword` (:367-406): the user must exist and be active. It sets a temporary password, isFirstLogin=true and resetPasswordBy/At, and revokes all tokens, in one transaction.
- `logout` revokes all of the user's refresh tokens (:280), not just the current session.
- `getTokenExpiry` supports only d/h/m units. Anything else becomes 7 days (:178-193).
## Access control notes
- Global guards (app.module.ts:64-74): JwtAuthGuard → RolesGuard → ThrottlerGuard.
- `JwtStrategy.validate` accepts only type=access and checks that the user exists and is active (common/guards/jwt.strategy.ts:25-42). `RolesGuard` allows the request when no @Roles is set (roles.guard.ts:20).
- login and refresh are @Public and throttled (5/min and 10/min).
- change-password is @Public + `JwtChangePasswordGuard`, which accepts an access or first_login token without a DB active check (jwt-change-password.guard.ts:34). The service re-checks isActive (:294).
- admin/reset-password is @Roles(ADMIN). logout and me have no @Roles, so any authenticated role can call them.
## Cross-module contracts
- index.ts exports AuthModule and the types JwtPayload, RefreshTokenPayload, and the token/response types. `JwtPayload` is imported by the guards and by controllers such as users, teachers and request-access.
- Consumes: UsersService is injected (:42) but never called (dead dependency); UserWithProfiles type; PrismaService; hashToken/comparePassword/hashPassword/generateTempPassword from @common/utils.
## Known pitfalls / risks
- `changePassword` does the user update, the revoke-all and the token create as three separate writes with no transaction (:323-353).
- `refresh` race: two concurrent refreshes with the same token can both pass the `isRevoked` check before rotating. Rotation uses `update` by id, not a conditional update (:262-275).
- The login session-limit check is read-then-write inside the transaction but without serializable isolation. Concurrent logins can go over MAX_ACTIVE_SESSIONS.
- The first_login token is signed with the same secret as access tokens and is only told apart by `type`. `JwtFirstLoginStrategy` exists, but the change-password route does not use it.
- A deactivated user keeps a valid access JWT, but JwtStrategy blocks it. The admin reset also rejects inactive users (:379).
- `getMe` returns 401 instead of 404 when the user is missing (:418).
## Test focus
- Refresh reuse: using a rotated token again revokes the whole family, and the next refresh fails.
- A first_login token is rejected on normal routes (JwtStrategy) but accepted on change-password without currentPassword.
- An access token on change-password without currentPassword gets 400; a wrong currentPassword gets 401; the same password gets 400.
- The session cap: the (MAX+1)th login revokes the oldest session.
- A deactivated user: login gets 403, refresh gets 401, and an existing access token gets 401.
- A non-admin calling admin/reset-password gets 403. After a reset, the old refresh tokens are revoked.
- The login throttle: the 6th request within a minute gets 429.
