import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { AcademicYear, EnrollmentStatus, Prisma, Role, Section } from "@prisma/client";

import {
    ERROR_ATTENDANCE_DAY_NOT_TAKEN,
    ERROR_ATTENDANCE_FORBIDDEN_SCOPE,
    ERROR_ATTENDANCE_FUTURE_DATE,
    ERROR_ATTENDANCE_NOT_CLASS_TEACHER,
    ERROR_ATTENDANCE_NOT_SCHOOL_DAY,
    ERROR_ATTENDANCE_OUTSIDE_ACADEMIC_YEAR,
    ERROR_ATTENDANCE_SECTION_NOT_CURRENT_YEAR,
    ERROR_ATTENDANCE_SECTION_NOT_FOUND,
    ERROR_STUDENT_NOT_ENROLLED,
} from "@common/constants";
import { getTodayInSchoolTimezone } from "@common/utils";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";
import { AccessPolicyService } from "@modules/request-access";
import { SchoolService } from "@modules/school/school.service";

import {
    AttendanceDayView,
    AttendanceSummaryItem,
    StudentAttendanceItem,
} from "./attendance.types";
import { GetAttendanceSummaryDto } from "./dto/get-attendance-summary.dto";
import { GetStudentAttendanceDto } from "./dto/get-student-attendance.dto";
import { SaveAttendanceDayDto } from "./dto/save-attendance-day.dto";

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

@Injectable()
export class AttendanceService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly schoolService: SchoolService,
        private readonly academicYearsService: AcademicYearsService,
        private readonly accessPolicy: AccessPolicyService,
    ) {}

    private async assertSectionExists(sectionId: string): Promise<Section> {
        const section = await this.prisma.section.findUnique({
            where: { id: sectionId },
        });

        if (!section) {
            throw new NotFoundException(ERROR_ATTENDANCE_SECTION_NOT_FOUND);
        }

        return section;
    }

    private async assertSectionInCurrentYear(
        sectionId: string,
    ): Promise<{ section: Section; academicYear: AcademicYear }> {
        const [section, academicYear] = await Promise.all([
            this.assertSectionExists(sectionId),
            this.academicYearsService.findCurrent(),
        ]);

        if (section.academicYearId !== academicYear.id) {
            throw new BadRequestException(ERROR_ATTENDANCE_SECTION_NOT_CURRENT_YEAR);
        }

        return { section, academicYear };
    }

    private async assertValidAttendanceDate(
        date: string,
        academicYear: AcademicYear,
    ): Promise<void> {
        if (date > getTodayInSchoolTimezone()) {
            throw new BadRequestException(ERROR_ATTENDANCE_FUTURE_DATE);
        }

        const yearStart = toDateOnly(academicYear.startDate);
        const yearEnd = toDateOnly(academicYear.endDate);

        if (date < yearStart || date > yearEnd) {
            throw new BadRequestException(
                ERROR_ATTENDANCE_OUTSIDE_ACADEMIC_YEAR.replace("%s", yearStart).replace(
                    "%s",
                    yearEnd,
                ),
            );
        }

        const isSchoolDay = await this.schoolService.isSchoolDay(date, academicYear.id);

        if (!isSchoolDay) {
            throw new BadRequestException(ERROR_ATTENDANCE_NOT_SCHOOL_DAY);
        }
    }

    private async assertCanManageSection(
        requestingUser: JwtPayload,
        sectionId: string,
    ): Promise<void> {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        const isClassTeacher = await this.accessPolicy.isClassTeacher(
            requestingUser.sub,
            sectionId,
        );

        if (!isClassTeacher) {
            throw new ForbiddenException(ERROR_ATTENDANCE_NOT_CLASS_TEACHER);
        }
    }

    private async assertCanViewSection(
        requestingUser: JwtPayload,
        sectionId: string,
    ): Promise<void> {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        const isAssigned = await this.accessPolicy.isAssignedToSection(
            requestingUser.sub,
            sectionId,
        );

        if (!isAssigned) {
            throw new ForbiddenException(ERROR_ATTENDANCE_FORBIDDEN_SCOPE);
        }
    }

    private async assertAbsenteesEnrolled(
        studentIds: string[],
        sectionId: string,
        academicYearId: string,
    ): Promise<void> {
        if (studentIds.length === 0) {
            return;
        }

        const enrolledCount = await this.prisma.studentEnrollment.count({
            where: {
                sectionId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
                studentId: { in: studentIds },
            },
        });

        if (enrolledCount !== studentIds.length) {
            throw new BadRequestException(ERROR_STUDENT_NOT_ENROLLED);
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

        const sharedAssignment = await this.prisma.teacherClassAssignment.findFirst({
            where: {
                teacher: { userId: requestingUser.sub },
                section: {
                    enrollments: {
                        some: { studentId },
                    },
                },
            },
            select: { id: true },
        });

        if (!sharedAssignment) {
            throw new ForbiddenException(ERROR_ATTENDANCE_FORBIDDEN_SCOPE);
        }
    }

    private async buildDayView(section: Section, date: string): Promise<AttendanceDayView> {
        const attendanceDate = new Date(date);

        const [day, enrollments, absences] = await Promise.all([
            this.prisma.attendanceDay.findUnique({
                where: { sectionId_date: { sectionId: section.id, date: attendanceDate } },
                include: {
                    markedBy: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.studentEnrollment.findMany({
                where: {
                    sectionId: section.id,
                    academicYearId: section.academicYearId,
                    status: EnrollmentStatus.ACTIVE,
                },
                include: {
                    student: {
                        include: {
                            user: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { rollNumber: "asc" },
            }),
            this.prisma.attendance.findMany({
                where: { sectionId: section.id, date: attendanceDate },
                select: { studentId: true },
            }),
        ]);

        const absentStudentIds = new Set(absences.map((absence) => absence.studentId));

        return {
            sectionId: section.id,
            date,
            isTaken: day !== null,
            markedBy: day?.markedBy ?? null,
            markedAt: day?.updatedAt ?? null,
            students: enrollments.map((enrollment) => {
                let status: AttendanceDayView["students"][number]["status"] = null;

                if (day !== null) {
                    status = absentStudentIds.has(enrollment.studentId) ? "ABSENT" : "PRESENT";
                }

                return {
                    studentId: enrollment.studentId,
                    rollNumber: enrollment.rollNumber,
                    firstName: enrollment.student.user.firstName,
                    lastName: enrollment.student.user.lastName,
                    status,
                };
            }),
        };
    }

    public async saveDay(
        sectionId: string,
        date: string,
        dto: SaveAttendanceDayDto,
        requestingUser: JwtPayload,
    ): Promise<AttendanceDayView> {
        const { section, academicYear } = await this.assertSectionInCurrentYear(sectionId);
        await this.assertCanManageSection(requestingUser, sectionId);
        await this.assertValidAttendanceDate(date, academicYear);
        await this.assertAbsenteesEnrolled(dto.absentStudentIds, sectionId, academicYear.id);

        const teacherProfileId =
            requestingUser.role === Role.TEACHER
                ? await this.resolveTeacherProfileId(requestingUser.sub)
                : null;
        const attendanceDate = new Date(date);

        await this.prisma.$transaction([
            this.prisma.attendanceDay.upsert({
                where: { sectionId_date: { sectionId, date: attendanceDate } },
                create: {
                    sectionId,
                    academicYearId: academicYear.id,
                    date: attendanceDate,
                    markedById: requestingUser.sub,
                },
                update: { markedById: requestingUser.sub },
            }),
            this.prisma.attendance.deleteMany({
                where: { sectionId, date: attendanceDate },
            }),
            this.prisma.attendance.createMany({
                data: dto.absentStudentIds.map((studentId) => ({
                    studentId,
                    sectionId,
                    academicYearId: academicYear.id,
                    date: attendanceDate,
                    markedById: teacherProfileId,
                })),
            }),
        ]);

        return this.buildDayView(section, date);
    }

    public async getDay(
        sectionId: string,
        date: string,
        requestingUser: JwtPayload,
    ): Promise<AttendanceDayView> {
        const section = await this.assertSectionExists(sectionId);
        await this.assertCanViewSection(requestingUser, sectionId);

        return this.buildDayView(section, date);
    }

    public async deleteDay(
        sectionId: string,
        date: string,
        requestingUser: JwtPayload,
    ): Promise<void> {
        await this.assertSectionInCurrentYear(sectionId);
        await this.assertCanManageSection(requestingUser, sectionId);

        const attendanceDate = new Date(date);

        const day = await this.prisma.attendanceDay.findUnique({
            where: { sectionId_date: { sectionId, date: attendanceDate } },
            select: { id: true },
        });

        if (!day) {
            throw new NotFoundException(ERROR_ATTENDANCE_DAY_NOT_TAKEN.replace("%s", date));
        }

        await this.prisma.$transaction([
            this.prisma.attendance.deleteMany({
                where: { sectionId, date: attendanceDate },
            }),
            this.prisma.attendanceDay.delete({
                where: { id: day.id },
            }),
        ]);
    }

    public async getStudentAttendance(
        studentId: string,
        dto: GetStudentAttendanceDto,
        requestingUser: JwtPayload,
    ): Promise<StudentAttendanceItem[]> {
        await this.assertCanViewStudent(studentId, requestingUser);

        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        const enrollment = await this.prisma.studentEnrollment.findUnique({
            where: { studentId_academicYearId: { studentId, academicYearId } },
            select: { sectionId: true },
        });

        if (!enrollment) {
            return [];
        }

        const dateFilter: Prisma.DateTimeFilter | undefined =
            (dto.startDate ?? dto.endDate)
                ? {
                      ...(dto.startDate && { gte: new Date(dto.startDate) }),
                      ...(dto.endDate && { lte: new Date(dto.endDate) }),
                  }
                : undefined;

        const [days, absences] = await Promise.all([
            this.prisma.attendanceDay.findMany({
                where: {
                    sectionId: enrollment.sectionId,
                    ...(dateFilter && { date: dateFilter }),
                },
                select: { date: true },
                orderBy: { date: "desc" },
            }),
            this.prisma.attendance.findMany({
                where: {
                    studentId,
                    academicYearId,
                    ...(dateFilter && { date: dateFilter }),
                },
                select: { date: true },
            }),
        ]);

        const absentDates = new Set(absences.map((absence) => toDateOnly(absence.date)));

        return days.map((day) => {
            const date = toDateOnly(day.date);

            return {
                date,
                sectionId: enrollment.sectionId,
                status: absentDates.has(date) ? "ABSENT" : "PRESENT",
            };
        });
    }

    public async getSummary(
        dto: GetAttendanceSummaryDto,
        requestingUser: JwtPayload,
    ): Promise<AttendanceSummaryItem[]> {
        const section = await this.assertSectionExists(dto.sectionId);
        await this.assertCanViewSection(requestingUser, dto.sectionId);

        const [year, month] = dto.month.split("-").map(Number);
        const monthRange = {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lte: new Date(Date.UTC(year, month, 0)),
        };

        const [takenDays, enrollments, absences] = await Promise.all([
            this.prisma.attendanceDay.count({
                where: { sectionId: dto.sectionId, date: monthRange },
            }),
            this.prisma.studentEnrollment.findMany({
                where: {
                    sectionId: dto.sectionId,
                    academicYearId: section.academicYearId,
                    status: EnrollmentStatus.ACTIVE,
                },
                include: {
                    student: {
                        include: {
                            user: { select: { firstName: true, lastName: true } },
                        },
                    },
                },
                orderBy: { rollNumber: "asc" },
            }),
            this.prisma.attendance.groupBy({
                by: ["studentId"],
                where: { sectionId: dto.sectionId, date: monthRange },
                _count: { _all: true },
            }),
        ]);

        const absentByStudent = new Map(
            absences.map((absence) => [absence.studentId, absence._count._all]),
        );

        return enrollments.map((enrollment) => {
            const absent = absentByStudent.get(enrollment.studentId) ?? 0;
            const present = takenDays - absent;
            const percentage = takenDays > 0 ? Math.round((present / takenDays) * 100) : 0;

            return {
                studentId: enrollment.studentId,
                firstName: enrollment.student.user.firstName,
                lastName: enrollment.student.user.lastName,
                totalDays: takenDays,
                present,
                absent,
                percentage,
            };
        });
    }
}
