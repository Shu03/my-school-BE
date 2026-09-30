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
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { TeachersService } from "./teachers.service";

@ApiTags("Teachers")
@ApiBearerAuth()
@Controller("teachers")
export class TeachersController {
    public constructor(private readonly teachersService: TeachersService) {}

    // ─── Teacher Profiles ─────────────────────────────────────────────

    @Get()
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "List all teachers" })
    @ApiOkResponse({ description: "Teachers retrieved successfully" })
    public async findAllTeachers(): Promise<ReturnType<TeachersService["findAllTeachers"]>> {
        return this.teachersService.findAllTeachers();
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Get a single teacher profile" })
    @ApiOkResponse({ description: "Teacher retrieved successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiForbiddenResponse({ description: "Cannot view another teacher profile" })
    public async findOneTeacher(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<TeachersService["findOneTeacher"]>> {
        return this.teachersService.findOneTeacher(id, user.sub, user.role);
    }

    @Patch(":id")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Update teacher profile" })
    @ApiOkResponse({ description: "Teacher updated successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async updateTeacher(
        @Param("id") id: string,
        @Body() dto: UpdateTeacherDto,
    ): Promise<ReturnType<TeachersService["updateTeacher"]>> {
        return this.teachersService.updateTeacher(id, dto);
    }

    // ─── Teacher Class Assignments ────────────────────────────────────

    @Post(":id/assignments")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Assign teacher to a class" })
    @ApiCreatedResponse({ description: "Assignment created successfully" })
    @ApiNotFoundResponse({ description: "Teacher, class or subject not found" })
    @ApiBadRequestResponse({ description: "Validation failed or grade mismatch" })
    public async createAssignment(
        @Param("id") id: string,
        @Body() dto: CreateAssignmentDto,
    ): Promise<ReturnType<TeachersService["createAssignment"]>> {
        return this.teachersService.createAssignment(id, dto);
    }

    @Get(":id/assignments")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "List all assignments for a teacher" })
    @ApiOkResponse({ description: "Assignments retrieved successfully" })
    @ApiNotFoundResponse({ description: "Teacher not found" })
    @ApiForbiddenResponse({ description: "Cannot view another teacher assignments" })
    public async findAssignments(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<TeachersService["findAssignments"]>> {
        return this.teachersService.findAssignments(id, user.sub, user.role);
    }

    @Delete(":id/assignments/:assignmentId")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Remove a teacher class assignment" })
    @ApiOkResponse({ description: "Assignment removed successfully" })
    @ApiNotFoundResponse({ description: "Teacher or assignment not found" })
    public async deleteAssignment(
        @Param("id") id: string,
        @Param("assignmentId") assignmentId: string,
    ): Promise<void> {
        await this.teachersService.deleteAssignment(id, assignmentId);
    }
}
