import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import {
    ApproveAccessRequestDto,
    CreateAccessRequestDto,
    GrantAccessDto,
    ListAccessRequestsDto,
    ListMyAccessRequestsDto,
    RejectAccessRequestDto,
    RevokeAccessDto,
} from "./dto";
import { RequestAccessService } from "./request-access.service";

@ApiTags("Request Access")
@ApiBearerAuth()
@Controller("request-access")
export class RequestAccessController {
    public constructor(private readonly requestAccessService: RequestAccessService) {}

    // ─── Requester ───────────────────────────────────────────────────────────────

    @Post()
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: "Request access for a section and subject" })
    public create(
        @Body() dto: CreateAccessRequestDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["create"]> {
        return this.requestAccessService.create(dto, user);
    }

    @Get("mine")
    @Roles(Role.TEACHER)
    @ApiOperation({ summary: "List my access requests" })
    public findMine(
        @Query() dto: ListMyAccessRequestsDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["findMine"]> {
        return this.requestAccessService.findMine(dto, user);
    }

    @Patch(":id/cancel")
    @Roles(Role.TEACHER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Cancel my pending access request" })
    public cancel(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["cancel"]> {
        return this.requestAccessService.cancel(id, user);
    }

    // ─── Admin ───────────────────────────────────────────────────────────────────

    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "List access requests" })
    public findAll(
        @Query() dto: ListAccessRequestsDto,
    ): ReturnType<RequestAccessService["findAll"]> {
        return this.requestAccessService.findAll(dto);
    }

    @Post("grants")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Grant access directly without a request" })
    public grant(
        @Body() dto: GrantAccessDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["grant"]> {
        return this.requestAccessService.grant(dto, user);
    }

    @Get("sections/:sectionId/subjects/:subjectId")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "List assigned teachers and granted access for a subject" })
    public findSubjectAccess(
        @Param("sectionId", ParseUUIDPipe) sectionId: string,
        @Param("subjectId", ParseUUIDPipe) subjectId: string,
    ): ReturnType<RequestAccessService["findSubjectAccess"]> {
        return this.requestAccessService.findSubjectAccess(sectionId, subjectId);
    }

    @Patch(":id/approve")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Approve a pending access request" })
    public approve(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: ApproveAccessRequestDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["approve"]> {
        return this.requestAccessService.approve(id, dto, user);
    }

    @Patch(":id/reject")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Reject a pending access request" })
    public reject(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: RejectAccessRequestDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["reject"]> {
        return this.requestAccessService.reject(id, dto, user);
    }

    @Patch(":id/revoke")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Revoke approved access" })
    public revoke(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: RevokeAccessDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["revoke"]> {
        return this.requestAccessService.revoke(id, dto, user);
    }

    // ─── Shared ──────────────────────────────────────────────────────────────────

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Get an access request" })
    public findOne(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<RequestAccessService["findOne"]> {
        return this.requestAccessService.findOne(id, user);
    }
}
