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

import { PERMISSION_HOMEWORK_MANAGE } from "@common/constants";
import { CurrentUser, Permissions, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { ListHomeworkDto } from "./dto/list-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { HomeworkService } from "./homework.service";

@ApiTags("Homework")
@ApiBearerAuth()
@Controller("homework")
export class HomeworkController {
    public constructor(private readonly homeworkService: HomeworkService) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_HOMEWORK_MANAGE)
    public create(
        @Body() dto: CreateHomeworkDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<HomeworkService["create"]> {
        return this.homeworkService.create(dto, user);
    }

    @Get()
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findAll(
        @Query() dto: ListHomeworkDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<HomeworkService["findAll"]> {
        return this.homeworkService.findAll(dto, user);
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public findOne(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<HomeworkService["findOne"]> {
        return this.homeworkService.findOne(id, user);
    }

    @Patch(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_HOMEWORK_MANAGE)
    public update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() dto: UpdateHomeworkDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<HomeworkService["update"]> {
        return this.homeworkService.update(id, dto, user);
    }

    @Delete(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_HOMEWORK_MANAGE)
    @HttpCode(HttpStatus.OK)
    public delete(
        @Param("id", ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<HomeworkService["delete"]> {
        return this.homeworkService.delete(id, user);
    }
}
