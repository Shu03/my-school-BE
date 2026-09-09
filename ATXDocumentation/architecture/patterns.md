# Architectural Patterns

## Primary Architecture: Modular Monolith

The application follows NestJS's modular monolith pattern with clear module boundaries:

```
AppModule (root)
  ├── Feature Modules (14) — each encapsulates a business domain
  ├── Infrastructure Modules (PrismaModule @Global, ConfigModule isGlobal)
  └── Cross-Cutting Concerns (guards, filters, interceptors registered globally)
```

**Pattern Assessment**: The modular structure provides good code organization, but the lack of a repository layer means module boundaries are **organizational, not architectural** — any service can query any database table through the global PrismaService.

## Design Patterns Identified

### 1. Controller-Service Pattern (All Modules)
Every feature module uses: `Controller → Service → PrismaService`
- **Controllers**: HTTP routing, decorator-based auth/validation, parameter extraction
- **Services**: Business logic, Prisma queries, cross-cutting validation
- **No Repository Layer**: Services directly use PrismaService

**Reference Implementation**: `src/modules/announcements/` — cleanest example with clear DTO usage, ownership checks, and pagination.

### 2. Global Guard Chain Pattern
Three guards applied globally in order via `APP_GUARD`:

```typescript
// src/app.module.ts
providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },      // 1. Authentication
    { provide: APP_GUARD, useClass: RolesGuard },         // 2. Role-based access
    { provide: APP_GUARD, useClass: PermissionsGuard },   // 3. Permission-based access
    { provide: APP_GUARD, useClass: ThrottlerGuard },     // 4. Rate limiting
]
```

**Opt-out pattern**: `@Public()` decorator sets metadata to bypass JWT auth.
**ADMIN bypass**: PermissionsGuard skips checks for ADMIN role.

### 3. DTO Validation Pattern (All Controllers)
- `class-validator` decorators for validation rules
- `class-transformer` for transformation (`@Transform`, `@Type`)
- Swagger decorators co-located on DTO properties
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`

### 4. Standard Response Envelope Pattern
All responses wrapped by `ResponseInterceptor`:
```json
// Success
{ "success": true, "statusCode": 200, "timestamp": "...", "data": {...} }

// Error (via GlobalExceptionFilter)
{ "success": false, "statusCode": 404, "timestamp": "...", "path": "/api/v1/...", "message": "..." }
```

### 5. Refresh Token Rotation with Family-Based Reuse Detection
**Location**: `src/modules/auth/auth.service.ts`

```
Login → issue accessToken + refreshToken (new family)
Refresh → verify token → check not revoked → rotate (new token, same family)
Reuse detected → revoke ALL tokens in family (security: token compromise)
```

- Tokens stored as SHA-256 hashes
- MAX_ACTIVE_SESSIONS = 3 (oldest revoked on new login)

### 6. Bulk Upsert via Delete+Create Pattern
Used in attendance and grades modules:
```typescript
// Transaction: delete existing + create new (instead of individual upserts)
await this.prisma.$transaction([
    this.prisma.attendance.deleteMany({ where: { sectionId, date } }),
    this.prisma.attendance.createMany({ data: records }),
]);
```
**Trade-off**: Simpler than individual upserts but loses individual record history.

### 7. Role-Scoped Data Access Pattern
Services filter query results based on the requesting user's role:
- **ADMIN**: Sees all data
- **TEACHER**: Sees data for assigned classes/sections only
- **STUDENT**: Sees own data only

**Example** (`FeesService.findAllRecords`):
```
if (role === ADMIN) → no filter
if (role === TEACHER) → filter by teacherClassAssignment.sectionId
if (role === STUDENT) → filter by studentProfile.userId
```

### 8. Prisma Include Constants Pattern
Each service defines typed include constants:
```typescript
const ANNOUNCEMENT_INCLUDE = {
    createdBy: { select: { id: true, firstName: true, lastName: true, role: true } }
} satisfies Prisma.AnnouncementInclude;
```

### 9. Barrel Export Pattern
Every module directory exports through `index.ts`:
```typescript
export { AcademicYearsModule } from './academic-years.module';
export { AcademicYearsService } from './academic-years.service';
export type { AcademicYearBasic, AcademicYearWithTerms } from './academic-years.types';
```

## Anti-Patterns Identified

### 1. Missing Repository Abstraction
**FACT**: All services directly import and call `PrismaService`. This creates:
- Tight coupling to Prisma ORM
- Difficulty unit-testing without full Prisma mocking
- Hidden cross-domain data access

### 2. Business Logic in Service Layer Without Separation
Complex business logic (attendance summary calculation, fee backfill, promotion) is mixed with data access in the same service methods.

### 3. Duplicate Access Control Logic
Role-based data scoping (admin/teacher/student) is implemented individually in each service's query methods rather than through a shared middleware or interceptor pattern.

### 4. Inconsistent Error Message Strategy
Some error messages are centralized in `app.constants.ts`, others are inline strings in services. No i18n or externalization.

## Established Conventions

| Convention | Location | Consistency |
|-----------|----------|-------------|
| DTO validation via class-validator | All DTOs | **Consistent** |
| Swagger decorators on controllers | All controllers | **Consistent** |
| `@Roles()` + `@Permissions()` on routes | All protected routes | **Consistent** |
| Types from Prisma utility types | All `*.types.ts` files | **Consistent** |
| Password omitted from responses | All user queries | **Consistent** |
| Barrel exports via `index.ts` | All modules | **Consistent** |
| UUID for all primary keys | All models | **Consistent** |
| Timestamp fields (createdAt, updatedAt) | All models | **Consistent** |
