# Security Patterns

## Authentication

### JWT Token Architecture
**Location**: `src/common/guards/`, `src/modules/auth/`

| Token Type | TTL | Secret | Purpose |
|-----------|-----|--------|---------|
| Access | 15m (configurable) | `JWT_ACCESS_SECRET` | API access |
| Refresh | 7d (configurable) | `JWT_REFRESH_SECRET` | Token renewal |
| First Login | 15m (hardcoded) | `JWT_ACCESS_SECRET` | Force password change |

**Security properties**:
- Separate secrets for access and refresh tokens
- Refresh tokens stored as SHA-256 hashes (not plaintext)
- Family-based reuse detection (compromise indicator)
- Session limit: MAX_ACTIVE_SESSIONS = 3

### Password Security
- **Hashing**: bcrypt with 12 salt rounds (`src/common/utils/password.util.ts`)
- **Policy**: 8-72 chars, must include uppercase + lowercase + digit + special char
- **Temp passwords**: Cryptographically random, 12 chars, diverse charset
- **First login flow**: Forces password change before any API access
- **Change password**: Validates current password (for non-first-login), ensures new differs from current

### Session Management
- Multiple sessions supported (up to 3)
- All sessions revoked on password change/reset
- Logout revokes all user tokens
- Deactivated users blocked at JwtStrategy level (`isActive` check)

## Authorization

### Three-Layer Guard Chain
```
1. JwtAuthGuard → Authentication (skip if @Public)
2. RolesGuard → Role-based access (ADMIN, TEACHER, STUDENT)
3. PermissionsGuard → Granular permissions (13 types, ADMIN bypasses all)
```

### Permission Model
- Teachers receive permissions via preset + overrides
- Permissions are resolved at token issuance time (not per-request)
- **INFERENCE**: If a teacher's preset changes, they must re-login (or refresh) to get updated permissions in their JWT.

### Service-Level Access Control
Beyond guards, services implement row-level access control:
- Students can only see their own data
- Teachers can only see data for their assigned sections
- Admin sees all data

## Input Validation

### Global ValidationPipe
```typescript
new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    forbidNonWhitelisted: true,   // Reject requests with unknown properties
    transform: true,              // Auto-transform to DTO types
    transformOptions: {
        enableImplicitConversion: true,  // Convert strings to numbers/booleans
    },
})
```

### DTO Validation
All DTOs use `class-validator` decorators: `@IsString`, `@IsUUID`, `@IsEnum`, `@Min`, `@Max`, `@MaxLength`, `@Matches` (regex), `@IsDateString`, `@IsArray`, `@ValidateNested`.

### SQL Injection Protection
**FACT**: All database queries go through Prisma Client, which uses parameterized queries. No raw SQL strings found in the codebase.

## HTTP Security

### Helmet
**Location**: `src/main.ts`
- Applied globally via `app.use(helmet())`
- Sets security headers: CSP, X-Frame-Options, X-Content-Type-Options, etc.

### CORS
```typescript
app.enableCors({
    origin: nodeEnv === "production" ? false : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
});
```
**ISSUE**: Production CORS origin is `false` — will block all cross-origin requests. Needs configuration for production deployment.

### Rate Limiting
- Global: 10 requests per 60 seconds (ThrottlerGuard)
- Login: 5 requests per 60 seconds
- Refresh: 10 requests per 60 seconds

### Trust Proxy
```typescript
app.set("trust proxy", 1);
```
Required for rate limiting behind reverse proxy (ALB, nginx).

## Security Concerns

| Concern | Severity | Details |
|---------|----------|---------|
| CORS production config | Medium | `origin: false` blocks frontend in production |
| Permission caching in JWT | Low | Permission changes not reflected until token refresh |
| No audit logging | Medium | Most mutations lack audit trail (who changed what) |
| No CSRF protection | Low | Not needed for Bearer-token-only API (no cookies) |
| No request signing | Low | Standard for internal APIs |
| Swagger in production | Low | Already disabled (`nodeEnv !== "production"`) |

## Secrets Management
- JWT secrets loaded from environment variables (validated by Zod)
- Database URL from environment variable
- No hardcoded secrets in source code
- **FACT**: Seed script contains hardcoded admin password (`Admin@1234`) — acceptable for initial dev seed only
