<!-- source-hash: 7367046f8f81 · Hand-maintained module knowledge, derived ONLY from code (src/, prisma/). Embedded into svc-announcements by scripts/agents/build.mjs. After verifying against code, run `pnpm agents:stamp announcements`. -->

## Purpose
School-wide announcements with a start/end window. Only admins create and manage them; every authenticated role can read them.
## Business rules & invariants
- `create` requires endDate > startDate (announcements.service.ts:77) and sets `createdById` = `requestingUser.sub` (a User id).
- `update` rejects an empty body (:121-128). It then checks the modifier, rejects expired announcements (endDate earlier than now → 400, :64-68), and re-checks the merged start/end range (:134-140).
- `delete` is a hard delete with the same creator and not-expired checks (:154-162).
- `findAll` is paginated and ordered by createdAt desc, with findMany and count in a `$transaction`. It does not filter by the active window, so future and expired announcements are listed (:93-110).
## Access control notes
- POST, PATCH and DELETE are ADMIN only. GET list and GET one allow ADMIN, TEACHER and STUDENT (announcements.controller.ts).
- `assertCanModify` returns immediately for ADMIN (:54-62), so because of `@Roles` the creator check is never actually used.
- There is no scoping on reads, so students see every announcement, including future ones.
## Cross-module contracts
- `index.ts` exports AnnouncementsModule, AnnouncementsService and AnnouncementBasic. A grep found no external importers.
- Consumes only PrismaService.
## Known pitfalls / risks
- Update/delete checks read and then write separately; not a significant risk here.
- An admin cannot fix or delete expired announcements (400), and they stay visible in the list forever.
- `UpdateAnnouncementDto` title and content lack `@IsNotEmpty`, so they can be set to "" (update-announcement.dto.ts:7-19).
- There is no active-window filter for STUDENT or TEACHER reads.
- No spec files exist for this module.
## Test focus
- TEACHER or STUDENT calling POST, PATCH or DELETE gets 403.
- endDate ≤ startDate gives 400 on create, and also on update when only one of the two dates changes.
- Updating or deleting an expired announcement gives 400.
- An empty PATCH gives 400. PATCH with `title: ""` is accepted (documents the gap).
- Pagination bounds (limit greater than MAX_PAGE_LIMIT gives 400).
- A non-UUID id gives 400 (ParseUUIDPipe). An unknown id gives 404.
