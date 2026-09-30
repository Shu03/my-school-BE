import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { ListAnnouncementsDto } from "./dto/list-announcements.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

@ApiTags("Announcements")
@ApiBearerAuth()
@Controller("announcements")
export class AnnouncementsController {
    public constructor(private readonly announcementsService: AnnouncementsService) {}

    @Post()
    @Roles(Role.ADMIN)
    public create(
        @Body() dto: CreateAnnouncementDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AnnouncementsService["create"]> {
        return this.announcementsService.create(dto, user);
    }

    @Get()
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findAll(
        @Query() dto: ListAnnouncementsDto,
    ): ReturnType<AnnouncementsService["findAll"]> {
        return this.announcementsService.findAll(dto);
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findOne(
        @Param("id", ParseUUIDPipe) id: string,
    ): ReturnType<AnnouncementsService["findOne"]> {
        return this.announcementsService.findOne(id);
    }

    @Patch(":id")
    @Roles(Role.ADMIN)
    public update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateAnnouncementDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AnnouncementsService["update"]> {
        return this.announcementsService.update(id, dto, user);
    }

    @Delete(":id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    public delete(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<AnnouncementsService["delete"]> {
        return this.announcementsService.delete(id, user);
    }
}
