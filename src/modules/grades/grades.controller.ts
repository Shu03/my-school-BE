import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { BulkEnterGradesDto } from "./dto/bulk-enter-grades.dto";
import { GetStudentGradesDto } from "./dto/get-student-grades.dto";
import { GradesService } from "./grades.service";

@ApiTags("Grades")
@ApiBearerAuth()
@Controller()
export class GradesController {
    public constructor(private readonly gradesService: GradesService) {}

    @Post("exams/:examId/subjects/:subjectId/grades")
    @Roles(Role.ADMIN, Role.TEACHER)
    public enterGrades(
        @Param("examId", ParseUUIDPipe) examId: string,
        @Param("subjectId", ParseUUIDPipe) subjectId: string,
        @Body() dto: BulkEnterGradesDto,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["enterGrades"]> {
        return this.gradesService.enterGrades(examId, subjectId, dto, user);
    }

    @Get("exams/:examId/subjects/:subjectId/grades")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    public getExamSubjectGrades(
        @Param("examId", ParseUUIDPipe) examId: string,
        @Param("subjectId", ParseUUIDPipe) subjectId: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["getExamSubjectGrades"]> {
        return this.gradesService.getExamSubjectGrades(examId, subjectId, user);
    }

    @Get("exams/:examId/subjects/:subjectId/grades/summary")
    @Roles(Role.ADMIN, Role.TEACHER)
    public getExamSubjectSummary(
        @Param("examId", ParseUUIDPipe) examId: string,
        @Param("subjectId", ParseUUIDPipe) subjectId: string,
        @CurrentUser() user: JwtPayload,
    ): ReturnType<GradesService["getExamSubjectSummary"]> {
        return this.gradesService.getExamSubjectSummary(examId, subjectId, user);
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
