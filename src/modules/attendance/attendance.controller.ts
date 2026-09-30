import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Put,
    Query,
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from "@nestjs/swagger";

import { Role } from "@prisma/client";

import { CurrentUser, Roles } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { AttendanceService } from "./attendance.service";
import { AttendanceDayParamsDto } from "./dto/attendance-day-params.dto";
import { GetAttendanceSummaryDto } from "./dto/get-attendance-summary.dto";
import { GetStudentAttendanceDto } from "./dto/get-student-attendance.dto";
import { SaveAttendanceDayDto } from "./dto/save-attendance-day.dto";

@ApiTags("Attendance")
@ApiBearerAuth()
@Controller("attendance")
export class AttendanceController {
    public constructor(private readonly attendanceService: AttendanceService) {}

    @Put("sections/:sectionId/days/:date")
    @Roles(Role.ADMIN, Role.TEACHER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Record or update attendance for a section on a day" })
    @ApiOkResponse({ description: "Attendance saved successfully" })
    @ApiBadRequestResponse({
        description: "Invalid date, not a school day or student not enrolled",
    })
    @ApiForbiddenResponse({ description: "Only the class teacher can manage attendance" })
    public async saveDay(
        @Param() params: AttendanceDayParamsDto,
        @Body() dto: SaveAttendanceDayDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AttendanceService["saveDay"]>> {
        return this.attendanceService.saveDay(params.sectionId, params.date, dto, user);
    }

    @Get("sections/:sectionId/days/:date")
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Get attendance for a section on a day" })
    @ApiOkResponse({ description: "Attendance retrieved successfully" })
    @ApiForbiddenResponse({ description: "Not assigned to this section" })
    public async getDay(
        @Param() params: AttendanceDayParamsDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AttendanceService["getDay"]>> {
        return this.attendanceService.getDay(params.sectionId, params.date, user);
    }

    @Delete("sections/:sectionId/days/:date")
    @Roles(Role.ADMIN, Role.TEACHER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Delete attendance for a section on a day" })
    @ApiOkResponse({ description: "Attendance deleted successfully" })
    @ApiNotFoundResponse({ description: "Attendance has not been taken on this day" })
    @ApiForbiddenResponse({ description: "Only the class teacher can manage attendance" })
    public async deleteDay(
        @Param() params: AttendanceDayParamsDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<void> {
        await this.attendanceService.deleteDay(params.sectionId, params.date, user);
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
    @Roles(Role.ADMIN, Role.TEACHER)
    @ApiOperation({ summary: "Get monthly attendance summary for a section" })
    @ApiOkResponse({ description: "Attendance summary retrieved successfully" })
    @ApiForbiddenResponse({ description: "Not assigned to this section" })
    public async getSummary(
        @Query() dto: GetAttendanceSummaryDto,
        @CurrentUser() user: JwtPayload,
    ): Promise<ReturnType<AttendanceService["getSummary"]>> {
        return this.attendanceService.getSummary(dto, user);
    }
}
