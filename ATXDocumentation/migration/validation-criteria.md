# Validation Criteria

## Functional Validation

### Authentication & Authorization
- [ ] Login returns appropriate response for each user state (active, first-login, deactivated)
- [ ] Refresh token rotation works with family-based reuse detection
- [ ] Password change flow works for both first-login and voluntary scenarios
- [ ] Session limit (MAX_ACTIVE_SESSIONS=3) is enforced
- [ ] @Public routes are accessible without JWT
- [ ] @Roles decorator correctly restricts access by role
- [ ] @Permissions decorator correctly restricts access; ADMIN bypasses
- [ ] Deactivated users are rejected at JwtStrategy level

### Data Operations
- [ ] All CRUD operations work for each module
- [ ] Unique constraints return 409 Conflict (not 500)
- [ ] Not-found scenarios return 404
- [ ] Pagination works correctly (page, limit, total count)
- [ ] Search/filter parameters work as documented

### Business Logic
- [ ] Academic year copy-structure creates sections correctly
- [ ] Attendance only marks for today, school days
- [ ] Exam state machine enforces ACTIVE→FINALIZED→DISCARDED transitions
- [ ] Grade marks validated against totalMarks
- [ ] Fee status correctly transitions PENDING→PARTIAL→PAID
- [ ] Student promotion updates old enrollment + creates new + generates fees
- [ ] Teacher assignment validates role-specific rules (CLASS_TEACHER vs SUBJECT_TEACHER)

### Role-Scoped Data Access
- [ ] Students can only see their own data (attendance, grades, fees, enrollments)
- [ ] Teachers can only see data for their assigned sections
- [ ] Admin can see all data

## Non-Functional Validation

### Security
- [ ] Passwords never appear in API responses
- [ ] Refresh tokens stored as SHA-256 hashes
- [ ] Rate limiting active (login: 5/min, refresh: 10/min, global: 10/min)
- [ ] Helmet security headers present
- [ ] CORS configured appropriately for deployment environment
- [ ] Swagger disabled in production

### API Contract
- [ ] All responses wrapped in `{ success, statusCode, timestamp, data }` envelope
- [ ] Error responses use `{ success: false, statusCode, timestamp, path, message }` format
- [ ] Global prefix `/api/v1` applied to all routes
- [ ] Health endpoint returns `{ status: "ok" }` with DB connectivity check

### Data Integrity
- [ ] All unique constraints enforced at database level
- [ ] Cascade deletes work correctly (User → Profiles → related data)
- [ ] Transactions maintain atomicity for multi-step operations
- [ ] No orphaned records after deletions

## Migration-Specific Criteria

### Database
- [ ] All 12 migrations apply cleanly on a fresh database
- [ ] Seed script creates admin user successfully
- [ ] Reset script clears all data except admin

### Build & Deploy
- [ ] `pnpm build` produces valid `dist/` output
- [ ] `pnpm start:prod` starts the application
- [ ] Environment variables validated at startup (Zod)
- [ ] Application starts with minimal env vars (DATABASE_URL + JWT secrets)
