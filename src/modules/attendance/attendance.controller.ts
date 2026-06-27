import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { PERMISSION_ATTENDANCE_READ, PERMISSION_ATTENDANCE_WRITE } from "@common/constants";
import { CurrentUser, Permissions, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AttendanceService } from "./attendance.service";
import { BulkMarkAttendanceDto } from "./dto/bulk-mark-attendance.dto";
import { GetAttendanceSummaryDto } from "./dto/get-attendance-summary.dto";
import { GetAttendanceDto } from "./dto/get-attendance.dto";
import { GetStudentAttendanceDto } from "./dto/get-student-attendance.dto";

@ApiTags("Attendance")
@ApiBearerAuth()
@Controller("attendance")
export class AttendanceController {
    public constructor(private readonly attendanceService: AttendanceService) {}

    @Post("mark")
    @Roles(Role.ADMIN, Role.TEACHER)
    @Permissions(PERMISSION_ATTENDANCE_WRITE)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Bulk mark attendance for a class on the current day" })
    @ApiOkResponse({ description: "Attendance marked successfully" })
    @ApiBadRequestResponse({ description: "Validation failed or not a school day" })
    @ApiForbiddenResponse({ description: "Teacher not assigned to this class" })
    public async mark(
        @Body() dto: BulkMarkAttendanceDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AttendanceService["mark"]>> {
        return this.attendanceService.mark(dto, user.sub, user.role);
    }

    @Get()
    @Roles(Role.ADMIN)
    @Permissions(PERMISSION_ATTENDANCE_READ)
    @ApiOperation({ summary: "Get class attendance on a given date" })
    @ApiOkResponse({ description: "Attendance retrieved successfully" })
    public async getClassAttendance(
        @Query() dto: GetAttendanceDto,
    ): Promise<ReturnType<AttendanceService["getClassAttendance"]>> {
        return this.attendanceService.getClassAttendance(dto);
    }

    @Get("student/:studentId")
    @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
    @ApiOperation({ summary: "Get a student's attendance history" })
    @ApiOkResponse({ description: "Attendance history retrieved successfully" })
    @ApiForbiddenResponse({ description: "Not allowed to view this attendance" })
    public async getStudentAttendance(
        @Param("studentId") studentId: string,
        @Query() dto: GetStudentAttendanceDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AttendanceService["getStudentAttendance"]>> {
        return this.attendanceService.getStudentAttendance(studentId, dto, user);
    }

    @Get("summary")
    @Roles(Role.ADMIN)
    @Permissions(PERMISSION_ATTENDANCE_READ)
    @ApiOperation({ summary: "Get monthly attendance summary for a class" })
    @ApiOkResponse({ description: "Attendance summary retrieved successfully" })
    public async getSummary(
        @Query() dto: GetAttendanceSummaryDto,
    ): Promise<ReturnType<AttendanceService["getSummary"]>> {
        return this.attendanceService.getSummary(dto);
    }
}
