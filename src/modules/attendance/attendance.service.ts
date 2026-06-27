import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { AttendanceStatus, EnrollmentStatus, Role, StudentEnrollment } from "@prisma/client";
import { eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth } from "date-fns";

import {
    ERROR_ATTENDANCE_DATE_NOT_TODAY,
    ERROR_ATTENDANCE_FORBIDDEN_SCOPE,
    ERROR_ATTENDANCE_NOT_SCHOOL_DAY,
    ERROR_STUDENT_NOT_ENROLLED,
    ERROR_TEACHER_NOT_ASSIGNED_TO_CLASS,
    SCHOOL_TIMEZONE,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";
import { SchoolService } from "@modules/school/school.service";

import { AttendanceRecord, AttendanceSummaryItem, BulkMarkResult } from "./attendance.types";
import { BulkMarkAttendanceDto } from "./dto/bulk-mark-attendance.dto";
import { GetAttendanceSummaryDto } from "./dto/get-attendance-summary.dto";
import { GetAttendanceDto } from "./dto/get-attendance.dto";
import { GetStudentAttendanceDto } from "./dto/get-student-attendance.dto";

@Injectable()
export class AttendanceService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly schoolService: SchoolService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    private getTodayInSchoolTimezone(): string {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: SCHOOL_TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

        return formatter.format(new Date());
    }

    private assertIsToday(date: string): void {
        if (date.slice(0, 10) !== this.getTodayInSchoolTimezone()) {
            throw new BadRequestException(ERROR_ATTENDANCE_DATE_NOT_TODAY);
        }
    }

    private async assertIsSchoolDay(date: string, academicYearId: string): Promise<void> {
        const isSchoolDay = await this.schoolService.isSchoolDay(date, academicYearId);

        if (!isSchoolDay) {
            throw new BadRequestException(ERROR_ATTENDANCE_NOT_SCHOOL_DAY);
        }
    }

    private async resolveTeacherProfileId(userId: string): Promise<string | null> {
        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        return profile?.id ?? null;
    }

    private async resolveStudentProfileId(userId: string): Promise<string | null> {
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        return profile?.id ?? null;
    }

    private async assertTeacherAssignedToClass(
        teacherProfileId: string,
        classId: string,
    ): Promise<void> {
        const assignment = await this.prisma.teacherClassAssignment.findFirst({
            where: {
                teacherId: teacherProfileId,
                classId,
            },
        });

        if (!assignment) {
            throw new ForbiddenException(ERROR_TEACHER_NOT_ASSIGNED_TO_CLASS);
        }
    }

    private async getActiveEnrollments(
        classId: string,
        academicYearId: string,
    ): Promise<StudentEnrollment[]> {
        return this.prisma.studentEnrollment.findMany({
            where: {
                classId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
            },
        });
    }

    private async assertCanViewStudent(
        studentId: string,
        requestingUser: JwtPayload,
    ): Promise<void> {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        if (requestingUser.role === Role.STUDENT) {
            const ownProfileId = await this.resolveStudentProfileId(requestingUser.sub);

            if (ownProfileId !== studentId) {
                throw new ForbiddenException(ERROR_ATTENDANCE_FORBIDDEN_SCOPE);
            }

            return;
        }

        const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);

        if (!teacherProfileId) {
            throw new ForbiddenException(ERROR_ATTENDANCE_FORBIDDEN_SCOPE);
        }

        const sharedAssignment = await this.prisma.teacherClassAssignment.findFirst({
            where: {
                teacherId: teacherProfileId,
                class: {
                    enrollments: {
                        some: { studentId },
                    },
                },
            },
        });

        if (!sharedAssignment) {
            throw new ForbiddenException(ERROR_ATTENDANCE_FORBIDDEN_SCOPE);
        }
    }

    private async countWorkingDays(
        start: Date,
        end: Date,
        academicYearId: string,
    ): Promise<number> {
        const settings = await this.schoolService.getSettings();

        const holidays = await this.prisma.holiday.findMany({
            where: {
                academicYearId,
                date: { gte: start, lte: end },
            },
        });

        const holidayDates = new Set(holidays.map((holiday) => format(holiday.date, "yyyy-MM-dd")));

        return eachDayOfInterval({ start, end }).filter((day) => {
            if (settings.weeklyOffDays.includes(getDay(day))) {
                return false;
            }

            return !holidayDates.has(format(day, "yyyy-MM-dd"));
        }).length;
    }

    public async mark(
        dto: BulkMarkAttendanceDto,
        userId: string,
        role: Role,
    ): Promise<BulkMarkResult> {
        this.assertIsToday(dto.date);

        const currentYear = await this.academicYearsService.findCurrent();
        const academicYearId = currentYear.id;

        await this.assertIsSchoolDay(dto.date, academicYearId);

        let markedById: string | null = null;

        if (role === Role.TEACHER) {
            const teacherProfileId = await this.resolveTeacherProfileId(userId);

            if (!teacherProfileId) {
                throw new ForbiddenException(ERROR_TEACHER_NOT_ASSIGNED_TO_CLASS);
            }

            await this.assertTeacherAssignedToClass(teacherProfileId, dto.classId);
            markedById = teacherProfileId;
        }

        const enrollments = await this.getActiveEnrollments(dto.classId, academicYearId);
        const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
        const recordStudentIds = dto.records.map((record) => record.studentId);

        const allEnrolled = recordStudentIds.every((studentId) =>
            enrolledStudentIds.has(studentId),
        );

        if (!allEnrolled) {
            throw new BadRequestException(ERROR_STUDENT_NOT_ENROLLED);
        }

        const date = new Date(dto.date);

        await this.prisma.$transaction([
            this.prisma.attendance.deleteMany({
                where: {
                    classId: dto.classId,
                    date,
                    studentId: { in: recordStudentIds },
                },
            }),
            this.prisma.attendance.createMany({
                data: dto.records.map((record) => ({
                    studentId: record.studentId,
                    classId: dto.classId,
                    academicYearId,
                    date,
                    status: record.status,
                    markedById,
                })),
            }),
        ]);

        return {
            marked: dto.records.length,
            date: dto.date,
            classId: dto.classId,
        };
    }

    public async getClassAttendance(dto: GetAttendanceDto): Promise<AttendanceRecord[]> {
        return this.prisma.attendance.findMany({
            where: {
                classId: dto.classId,
                date: new Date(dto.date),
            },
            include: {
                student: {
                    include: {
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    public async getStudentAttendance(
        studentId: string,
        dto: GetStudentAttendanceDto,
        requestingUser: JwtPayload,
    ): Promise<AttendanceRecord[]> {
        await this.assertCanViewStudent(studentId, requestingUser);

        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        return this.prisma.attendance.findMany({
            where: {
                studentId,
                academicYearId,
                ...((dto.startDate ?? dto.endDate)
                    ? {
                          date: {
                              ...(dto.startDate && { gte: new Date(dto.startDate) }),
                              ...(dto.endDate && { lte: new Date(dto.endDate) }),
                          },
                      }
                    : {}),
            },
            include: {
                student: {
                    include: {
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
            orderBy: { date: "desc" },
        });
    }

    public async getSummary(dto: GetAttendanceSummaryDto): Promise<AttendanceSummaryItem[]> {
        const classRecord = await this.prisma.class.findUnique({
            where: { id: dto.classId },
        });

        if (!classRecord) {
            throw new NotFoundException("Class not found");
        }

        const academicYearId = classRecord.academicYearId;
        const monthStart = startOfMonth(parseISO(`${dto.month}-01`));
        const monthEnd = endOfMonth(monthStart);

        const totalDays = await this.countWorkingDays(monthStart, monthEnd, academicYearId);

        const enrollments = await this.prisma.studentEnrollment.findMany({
            where: {
                classId: dto.classId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
            },
            include: {
                student: {
                    include: {
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
        });

        const attendances = await this.prisma.attendance.findMany({
            where: {
                classId: dto.classId,
                date: { gte: monthStart, lte: monthEnd },
            },
        });

        return enrollments.map((enrollment) => {
            const studentAttendances = attendances.filter(
                (attendance) => attendance.studentId === enrollment.studentId,
            );
            const present = studentAttendances.filter(
                (attendance) => attendance.status === AttendanceStatus.PRESENT,
            ).length;
            const absent = studentAttendances.filter(
                (attendance) => attendance.status === AttendanceStatus.ABSENT,
            ).length;
            const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

            return {
                studentId: enrollment.studentId,
                firstName: enrollment.student.user.firstName,
                lastName: enrollment.student.user.lastName,
                totalDays,
                present,
                absent,
                percentage,
            };
        });
    }
}
