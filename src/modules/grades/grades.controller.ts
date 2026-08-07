import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_GRADES_READ, PERMISSION_GRADES_WRITE } from "@common/constants";
import { CurrentUser, Permissions, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { BulkEnterGradesDto } from "./dto/bulk-enter-grades.dto";
import { GetStudentGradesDto } from "./dto/get-student-grades.dto";
import { GradesService } from "./grades.service";

@ApiTags("Grades")
@ApiBearerAuth()
@Controller()
export class GradesController {
    public constructor(private readonly gradesService: GradesService) {}

    @Post("exams/:examId/grades")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_WRITE)
    public enterGrades(
        @Param("examId", ParseUUIDPipe) examId: string,
        @Body() dto: BulkEnterGradesDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["enterGrades"]> {
        return this.gradesService.enterGrades(examId, dto, user);
    }

    @Get("exams/:examId/grades")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public getExamGrades(
        @Param("examId", ParseUUIDPipe) examId: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["getExamGrades"]> {
        return this.gradesService.getExamGrades(examId, user);
    }

    @Get("exams/:examId/grades/summary")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_GRADES_READ)
    public getExamSummary(
        @Param("examId", ParseUUIDPipe) examId: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["getExamSummary"]> {
        return this.gradesService.getExamSummary(examId, user);
    }

    @Get("grades/student/:studentId")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public getStudentGradeHistory(
        @Param("studentId", ParseUUIDPipe) studentId: string,
        @Query() dto: GetStudentGradesDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["getStudentGradeHistory"]> {
        return this.gradesService.getStudentGradeHistory(studentId, dto, user);
    }
}
