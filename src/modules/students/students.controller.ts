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
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser } from "@common/decorators/current-user.decorator";
import { Roles } from "@common/decorators/roles.decorator";

import { JwtPayload } from "@modules/auth/auth.types";

import {
    EnrollStudentDto,
    ListStudentsDto,
    PromoteStudentsDto,
    UpdateEnrollmentDto,
    UpdateStudentDto,
} from "./dto";
import { StudentsService } from "./students.service";

@ApiTags("Students")
@ApiBearerAuth()
@Controller("students")
export class StudentsController {
    public constructor(private readonly studentsService: StudentsService) {}

    // ─── Promotion (static route before :id) ────────────────────────────────────

    @Post("promote")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Promote multiple students to a target class" })
    @ApiCreatedResponse({ description: "Promotion completed" })
    @ApiBadRequestResponse({ description: "Validation failed or target class invalid" })
    public async promote(
        @Body() dto: PromoteStudentsDto,
    ): Promise<ReturnType<StudentsService["promote"]>> {
        return this.studentsService.promote(dto);
    }

    // ─── Student Profiles ────────────────────────────────────────────────────────

    @Get()
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "List students (scoped by role)" })
    @ApiOkResponse({ description: "Students retrieved successfully" })
    public async findAll(
        @Query() dto: ListStudentsDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<StudentsService["findAll"]>> {
        return this.studentsService.findAll(dto, user.sub, user.role);
    }

    @Get(":id")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "Get a single student profile" })
    @ApiOkResponse({ description: "Student retrieved successfully" })
    @ApiNotFoundResponse({ description: "Student not found" })
    @ApiForbiddenResponse({ description: "Cannot view this student profile" })
    public async findOne(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<StudentsService["findOne"]>> {
        return this.studentsService.findOne(id, user.sub, user.role);
    }

    @Patch(":id")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Update student profile" })
    @ApiOkResponse({ description: "Student updated successfully" })
    @ApiNotFoundResponse({ description: "Student not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async update(
        @Param("id") id: string,
        @Body() dto: UpdateStudentDto,
    ): Promise<ReturnType<StudentsService["update"]>> {
        return this.studentsService.update(id, dto);
    }

    // ─── Enrollment ──────────────────────────────────────────────────────────────

    @Post(":id/enroll")
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: "Enroll a student in a class" })
    @ApiCreatedResponse({ description: "Student enrolled successfully" })
    @ApiNotFoundResponse({ description: "Student or class not found" })
    @ApiConflictResponse({ description: "Already enrolled in this academic year" })
    @ApiBadRequestResponse({ description: "Class does not belong to the academic year" })
    public async enroll(
        @Param("id") id: string,
        @Body() dto: EnrollStudentDto,
    ): Promise<ReturnType<StudentsService["enroll"]>> {
        return this.studentsService.enroll(id, dto);
    }

    @Get(":id/enrollments")
    @Roles(Role.ADMIN, Role.STUDENT)
    @ApiOperation({ summary: "Get enrollment history for a student" })
    @ApiOkResponse({ description: "Enrollments retrieved successfully" })
    @ApiNotFoundResponse({ description: "Student not found" })
    @ApiForbiddenResponse({ description: "Cannot view this student's enrollments" })
    public async findEnrollments(
        @Param("id") id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<StudentsService["findEnrollments"]>> {
        return this.studentsService.findEnrollments(id, user.sub, user.role);
    }

    @Patch(":id/enrollments/:enrollmentId")
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Update an enrollment (status or roll number)" })
    @ApiOkResponse({ description: "Enrollment updated successfully" })
    @ApiNotFoundResponse({ description: "Enrollment not found" })
    @ApiBadRequestResponse({ description: "Validation failed" })
    public async updateEnrollment(
        @Param("id") id: string,
        @Param("enrollmentId") enrollmentId: string,
        @Body() dto: UpdateEnrollmentDto,
    ): Promise<ReturnType<StudentsService["updateEnrollment"]>> {
        return this.studentsService.updateEnrollment(id, enrollmentId, dto);
    }
}
