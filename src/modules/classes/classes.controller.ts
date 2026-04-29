import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_CLASS_MANAGE } from "@common/constants";
import { Permissions, Roles } from "@common/decorators";

import { ClassesService } from "./classes.service";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { ListClassesDto } from "./dto/list-classes.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@ApiTags("Classes")
@ApiBearerAuth()
@Controller("classes")
export class ClassesController {
    public constructor(private readonly classesService: ClassesService) {}

    @Post()
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_CLASS_MANAGE)
    @ApiOperation({ summary: "Create a new class" })
    @ApiCreatedResponse({ description: "Class created successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or name taken" })
    public async create(
        @Body() dto: CreateClassDto,
    ): Promise<ReturnType<ClassesService["create"]>> {
        return this.classesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: "List classes by academic year" })
    @ApiOkResponse({ description: "Classes retrieved successfully" })
    public async findAll(
        @Query() dto: ListClassesDto,
    ): Promise<ReturnType<ClassesService["findAll"]>> {
        return this.classesService.findAll(dto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single class with relations" })
    @ApiOkResponse({ description: "Class retrieved successfully" })
    @ApiNotFoundResponse({ description: "Class not found" })
    public async findOne(@Param("id") id: string): Promise<ReturnType<ClassesService["findOne"]>> {
        return this.classesService.findOne(id);
    }

    @Patch(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_CLASS_MANAGE)
    @ApiOperation({ summary: "Update class name or grade level" })
    @ApiOkResponse({ description: "Class updated successfully" })
    @ApiNotFoundResponse({ description: "Class not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateClassDto,
    ): Promise<ReturnType<ClassesService["update"]>> {
        return this.classesService.update(id, dto);
    }

    @Patch(":id/assign-teacher")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_CLASS_MANAGE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Assign a class teacher" })
    @ApiOkResponse({ description: "Teacher assigned successfully" })
    @ApiNotFoundResponse({ description: "Class or teacher not found" })
    @ApiBadRequestResponse({ description: "Teacher is inactive" })
    public async assignTeacher(
        @Param("id") id: string,
        @Body() dto: AssignTeacherDto,
    ): Promise<ReturnType<ClassesService["assignTeacher"]>> {
        return this.classesService.assignTeacher(id, dto);
    }

    @Patch(":id/remove-teacher")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_CLASS_MANAGE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Remove class teacher" })
    @ApiOkResponse({ description: "Teacher removed successfully" })
    @ApiNotFoundResponse({ description: "Class not found" })
    @ApiBadRequestResponse({ description: "No teacher assigned" })
    public async removeTeacher(
        @Param("id") id: string,
    ): Promise<ReturnType<ClassesService["removeTeacher"]>> {
        return this.classesService.removeTeacher(id);
    }
}
