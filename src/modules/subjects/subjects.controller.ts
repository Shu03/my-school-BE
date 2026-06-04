import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiTags,
    ApiBearerAuth,
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_SUBJECT_MANAGE } from "@common/constants";
import { Permissions, Roles } from "@common/decorators";

import { CreateSubjectDto } from "./dto/create-subject.dto";
import { ListSubjectsDto } from "./dto/list-subjects.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { SubjectsService } from "./subjects.service";

@ApiTags("Subjects")
@ApiBearerAuth()
@Controller("subjects")
export class SubjectsController {
    public constructor(private readonly subjectsService: SubjectsService) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_SUBJECT_MANAGE)
    @ApiOperation({ summary: "Create a new subject" })
    @ApiCreatedResponse({ description: "Subject created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or name/code taken" })
    public async create(
        @Body() dto: CreateSubjectDto,
    ): Promise<ReturnType<SubjectsService["create"]>> {
        return this.subjectsService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: "List subjects with optional filters" })
    @ApiOkResponse({ description: "Subjects retrieved successfully" })
    public async findAll(
        @Query() dto: ListSubjectsDto,
    ): Promise<ReturnType<SubjectsService["findAll"]>> {
        return this.subjectsService.findAll(dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single subject with teacher assignments" })
    @ApiOkResponse({ description: "Subject retrieved successfully" })
    @ApiNotFoundResponse({ description: "Subject not found" })
    public async findOne(@Param("id") id: string): Promise<ReturnType<SubjectsService["findOne"]>> {
        return this.subjectsService.findOne(id);
    }

    @Patch(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_SUBJECT_MANAGE)
    @ApiOperation({ summary: "Update subject name, code or description" })
    @ApiOkResponse({ description: "Subject updated successfully" })
    @ApiNotFoundResponse({ description: "Subject not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateSubjectDto,
    ): Promise<ReturnType<SubjectsService["update"]>> {
        return this.subjectsService.update(id, dto);
    }

    @Delete(":id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Delete a subject" })
    @ApiOkResponse({ description: "Subject deleted successfully" })
    @ApiNotFoundResponse({ description: "Subject not found" })
    @ApiBadRequestResponse({ description: "Subject has active assignments" })
    public async delete(@Param("id") id: string): Promise<void> {
        await this.subjectsService.delete(id);
    }
}
