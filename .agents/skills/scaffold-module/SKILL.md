---
name: scaffold-module
description: Step-by-step procedure and file templates for creating a new production-ready NestJS feature module in my-school-BE: Prisma model, constants, module, controller, service, DTOs, types, barrel, tests, registration and agent catalog. Use when creating a new module or adding a new resource to an existing one.
---

# Scaffold a module

Replace these placeholders:
- `<name>`: kebab-case plural, for example `leave-requests`.
- `<Name>`: PascalCase, for example `LeaveRequests`.
- `<Model>`: the Prisma model, singular PascalCase, for example `LeaveRequest`.
- `<model>`: the camelCase client accessor, for example `leaveRequest`.
- `<NAME>`: the constant prefix, for example `LEAVE_REQUEST`.

Read `src/modules/request-access/` (state machine and access checks), `src/modules/accounts/` (Decimal money) or `src/modules/homework/` (teacher scoping through `AccessPolicyService`) side by side while you work. Learn behaviour from the code only, never from `docs/`.

## 1. Prisma (`prisma/schema/<domain>.prisma`)

```prisma
model <Model> {
  id             String       @id @default(uuid())
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  // domain fields: Decimal @db.Decimal(12, 2) for money, @db.Date for date-only
  createdById    String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([/* business uniqueness */])
  @@index([academicYearId])
}
```
Add the back-relation field on the related models. Then run `pnpm prisma:migrate:dev --name add_<snake_name>` (see the `prisma-migration` skill).

## 2. Constants (`src/common/constants/app.constants.ts`)

```ts
// <Name> error messages
export const ERROR_<NAME>_NOT_FOUND = "<Human name> not found";
export const ERROR_<NAME>_FORBIDDEN_SCOPE = "You are not allowed to access this <human name>";
```
For empty updates, reuse the shared `ERROR_NO_FIELDS_TO_UPDATE`. There are no permission constants; access is decided by roles plus `AccessPolicyService` (coding-standards §4).
If teachers need a new kind of delegated access (like `HOMEWORK`/`MARKS`), add an `AccessType` value in `prisma/schema/access.prisma`. That's a contract change, so coordinate it with `svc-request-access`.

## 3. Files

`<name>.module.ts` (import `RequestAccessModule` only if the service uses `AccessPolicyService`)
```ts
import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { RequestAccessModule } from "@modules/request-access";

import { <Name>Controller } from "./<name>.controller";
import { <Name>Service } from "./<name>.service";

@Module({
    imports: [AcademicYearsModule, RequestAccessModule],
    providers: [<Name>Service],
    controllers: [<Name>Controller],
    exports: [<Name>Service],
})
export class <Name>Module {}
```

`<name>.types.ts`
```ts
import { Prisma } from "@prisma/client";

export type <Model>Basic = Prisma.<Model>GetPayload<object>;

export type Paginated<T> = { data: T[]; total: number; page: number; limit: number };
```

`dto/create-<entity>.dto.ts`: see coding-standards §5. Strings get trim + `IsString` + `IsNotEmpty` + `MaxLength`. Use `IsUUID`, `IsEnum` and `IsDateString` where they apply. Every field gets an `ApiProperty` with an example.

`dto/list-<name>.dto.ts`
```ts
@ApiPropertyOptional({ example: 1 })
@Type(() => Number)
@IsInt()
@Min(1)
@IsOptional()
public page?: number;

@ApiPropertyOptional({ example: 20 })
@Type(() => Number)
@IsInt()
@Min(1)
@Max(MAX_PAGE_LIMIT)
@IsOptional()
public limit?: number;
```

`<name>.service.ts` (skeleton; `JwtPayload` is `{ sub, role, type }`, where `sub` is the User id)
```ts
@Injectable()
export class <Name>Service {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
        private readonly accessPolicy: AccessPolicyService,
    ) {}

    private async assert<Model>Exists(id: string): Promise<<Model>Basic> {
        const record = await this.prismaService.<model>.findUnique({ where: { id } });
        if (!record) throw new NotFoundException(ERROR_<NAME>_NOT_FOUND);
        return record;
    }

    // ADMIN: everything. TEACHER: must be assigned to the section (or hold an approved grant). STUDENT: never writes.
    private async assertCanWrite(sectionId: string, subjectId: string, user: JwtPayload): Promise<void> {
        if (user.role === Role.ADMIN) return;
        const source = await this.accessPolicy.resolveSubjectAccess(
            user.sub,
            AccessType.HOMEWORK, // pick the AccessType that governs this capability
            sectionId,
            subjectId,
        );
        if (!source) throw new ForbiddenException(ERROR_<NAME>_FORBIDDEN_SCOPE);
    }

    public async findAll(dto: List<Name>Dto, user: JwtPayload): Promise<Paginated<<Model>Basic>> {
        const page = dto.page ?? DEFAULT_PAGE;
        const limit = dto.limit ?? DEFAULT_PAGE_LIMIT;
        const academicYearId =
            dto.academicYearId ?? (await this.academicYearsService.findCurrent()).id;
        const where: Prisma.<Model>WhereInput = {
            academicYearId,
            ...(user.role === Role.TEACHER && { section: this.accessPolicy.buildSectionScope(user.sub) }),
            // STUDENT: restrict to the student's own enrollment, resolved from user.sub
        };
        const [data, total] = await this.prismaService.$transaction([
            this.prismaService.<model>.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            this.prismaService.<model>.count({ where }),
        ]);
        return { data, total, page, limit };
    }
}
```

`<name>.controller.ts` (see coding-standards §4; follows the current non-async pass-through style)
```ts
@ApiTags("<Human Name>")
@ApiBearerAuth()
@Controller("<name>")
export class <Name>Controller {
    public constructor(private readonly <camelName>Service: <Name>Service) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Create a <human name>" })
    @ApiCreatedResponse({ description: "<Human name> created" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    @ApiForbiddenResponse({ description: "Role not allowed or teacher lacks access to this section/subject" })
    public create(
        @Body() dto: Create<Entity>Dto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<<Name>Service["create"]> {
        return this.<camelName>Service.create(dto, user);
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "Get a <human name>" })
    @ApiOkResponse({ description: "<Human name> retrieved" })
    @ApiNotFoundResponse({ description: "<Human name> not found" })
    public findOne(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<<Name>Service["findOne"]> {
        return this.<camelName>Service.findOne(id, user);
    }
}
```

`index.ts`
```ts
export { <Name>Module } from "./<name>.module";
export { <Name>Service } from "./<name>.service";
export type { <Model>Basic } from "./<name>.types";
```

## 4. Register

Add `<Name>Module` to `imports` in `src/app.module.ts`, keeping the existing import style and ordering.

## 5. Tests

Follow the `write-tests` skill:
- a service spec covering every throw site and every role branch,
- a controller spec covering delegation,
- an e2e test of the authorization matrix.

## 6. Agent knowledge

Create `.agents/services/<name>.notes.md` **from the code you just wrote** (never from docs), with these headings: Purpose · Business rules & invariants · Access control notes · Cross-module contracts · Known pitfalls / risks · Test focus.

Then run `pnpm agents:stamp <name>`. This records the source hash, generates `svc-<name>` for Claude and Codex, and updates the graph.

## 7. Verify

`pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm agents:check`
