# Component Migration Order

## Dependency-Based Migration Order

When migrating or refactoring this codebase, components should be addressed in dependency order (leaf nodes first, root last).

### Phase 1: Infrastructure (No Dependencies)
| Order | Component | Reason |
|-------|-----------|--------|
| 1.1 | `src/common/constants/` | Pure constants, no imports |
| 1.2 | `src/common/utils/` | Utility functions (bcrypt, SHA-256) |
| 1.3 | `src/config/` | Env validation, config registration |
| 1.4 | `prisma/schema/` | Database schema definitions |

### Phase 2: Shared Infrastructure
| Order | Component | Reason |
|-------|-----------|--------|
| 2.1 | `src/common/decorators/` | Depends on constants only |
| 2.2 | `src/common/filters/` | Depends on NestJS + Prisma types |
| 2.3 | `src/common/interceptors/` | Depends on NestJS types |
| 2.4 | `src/common/guards/` | Depends on constants + decorators |
| 2.5 | `src/modules/prisma/` | Global module, depends on config |

### Phase 3: Level 0 Modules (No Module Imports)
| Order | Component | Reason |
|-------|-----------|--------|
| 3.1 | UsersModule | No module imports |
| 3.2 | AcademicYearsModule | No module imports, most depended-upon |
| 3.3 | SubjectsModule | No module imports |
| 3.4 | TeachersModule | No module imports |
| 3.5 | AnnouncementsModule | No module imports |

### Phase 4: Level 1 Modules
| Order | Component | Depends On |
|-------|-----------|-----------|
| 4.1 | AuthModule | UsersModule |
| 4.2 | SectionsModule | AcademicYearsModule |
| 4.3 | SchoolModule | AcademicYearsModule |
| 4.4 | FeesModule | AcademicYearsModule |
| 4.5 | ExamsModule | AcademicYearsModule |
| 4.6 | HomeworkModule | AcademicYearsModule |
| 4.7 | HealthModule | TerminusModule |

### Phase 5: Level 2 Modules
| Order | Component | Depends On |
|-------|-----------|-----------|
| 5.1 | AttendanceModule | SchoolModule, AcademicYearsModule |
| 5.2 | GradesModule | ExamsModule, AcademicYearsModule |
| 5.3 | StudentsModule | AcademicYearsModule, SectionsModule, FeesModule |

### Phase 6: Application Shell
| Order | Component | Reason |
|-------|-----------|--------|
| 6.1 | `src/app.module.ts` | Root module importing all others |
| 6.2 | `src/main.ts` | Bootstrap, global middleware |

## Critical Path

The critical migration path (longest dependency chain):
```
Constants → Decorators → Guards → PrismaModule → AcademicYearsModule → SectionsModule → StudentsModule
```

Any delay in migrating AcademicYearsModule blocks 8 downstream modules.
