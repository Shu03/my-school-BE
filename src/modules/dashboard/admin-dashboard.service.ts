import { Injectable } from "@nestjs/common";

import {
    AccessRequestStatus,
    EnrollmentStatus,
    ExamStatus,
    FeeRecordStatus,
    Role,
} from "@prisma/client";

import { AccountsService } from "@modules/accounts";
import { PrismaService } from "@modules/prisma";

import { DashboardCommonService, roundAmount, toPercentage } from "./dashboard-common.service";
import { AdminDashboardStats, DashboardContext } from "./dashboard.types";

@Injectable()
export class AdminDashboardService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly accountsService: AccountsService,
        private readonly common: DashboardCommonService,
    ) {}

    private async getFees(academicYearId: string): Promise<AdminDashboardStats["fees"]> {
        const [expected, collected, statusGroups] = await Promise.all([
            this.prisma.feeRecord.aggregate({
                where: { academicYearId },
                _sum: { totalAmount: true },
            }),
            this.prisma.feePayment.aggregate({
                where: { feeRecord: { academicYearId } },
                _sum: { amount: true },
            }),
            this.prisma.feeRecord.groupBy({
                by: ["status"],
                where: { academicYearId },
                _count: { _all: true },
            }),
        ]);

        const expectedAmount = expected._sum.totalAmount ?? 0;
        const collectedAmount = collected._sum.amount ?? 0;
        const byStatus: Record<FeeRecordStatus, number> = {
            [FeeRecordStatus.PENDING]: 0,
            [FeeRecordStatus.PARTIAL]: 0,
            [FeeRecordStatus.PAID]: 0,
        };

        for (const group of statusGroups) {
            byStatus[group.status] = group._count._all;
        }

        return {
            expected: roundAmount(expectedAmount),
            collected: roundAmount(collectedAmount),
            outstanding: roundAmount(expectedAmount - collectedAmount),
            byStatus,
        };
    }

    public async getStats(context: DashboardContext): Promise<AdminDashboardStats> {
        const { academicYearId, todayDate } = context;

        const [
            studentCount,
            teacherCount,
            sections,
            markedDays,
            absentees,
            fees,
            accounts,
            pendingAccessRequests,
            upcomingExams,
            notFinalizedCount,
        ] = await Promise.all([
            this.prisma.studentEnrollment.count({
                where: { academicYearId, status: EnrollmentStatus.ACTIVE },
            }),
            this.prisma.user.count({ where: { role: Role.TEACHER, isActive: true } }),
            this.prisma.section.findMany({
                where: { academicYearId },
                select: {
                    id: true,
                    classLevel: true,
                    _count: {
                        select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } },
                    },
                },
            }),
            this.prisma.attendanceDay.findMany({
                where: { academicYearId, date: todayDate },
                select: { sectionId: true },
            }),
            this.prisma.attendance.groupBy({
                by: ["studentId"],
                where: { academicYearId, date: todayDate },
            }),
            this.getFees(academicYearId),
            this.accountsService.getSummary(),
            this.prisma.accessRequest.count({ where: { status: AccessRequestStatus.PENDING } }),
            this.common.findUpcomingExams(context),
            this.prisma.exam.count({
                where: { academicYearId, status: ExamStatus.ACTIVE, isFinalized: false },
            }),
        ]);

        const studentsByClassLevel = new Map<number, number>();

        for (const section of sections) {
            studentsByClassLevel.set(
                section.classLevel,
                (studentsByClassLevel.get(section.classLevel) ?? 0) + section._count.enrollments,
            );
        }

        const enrollmentByClassLevel = [...studentsByClassLevel.entries()]
            .map(([classLevel, students]) => ({ classLevel, students }))
            .sort((a, b) => a.classLevel - b.classLevel);

        let attendanceToday: AdminDashboardStats["attendanceToday"] = { isSchoolDay: false };

        if (context.isSchoolDay) {
            const markedSectionIds = new Set(markedDays.map((day) => day.sectionId));
            const studentsInMarkedSections = sections
                .filter((section) => markedSectionIds.has(section.id))
                .reduce((total, section) => total + section._count.enrollments, 0);

            attendanceToday = {
                isSchoolDay: true,
                sectionsMarked: markedSectionIds.size,
                sectionsPending: sections.length - markedSectionIds.size,
                absentees: absentees.length,
                presentPercentage: toPercentage(
                    studentsInMarkedSections - absentees.length,
                    studentsInMarkedSections,
                ),
            };
        }

        return {
            counts: { students: studentCount, teachers: teacherCount, sections: sections.length },
            enrollmentByClassLevel,
            attendanceToday,
            fees,
            accounts,
            pendingAccessRequests,
            exams: { upcoming: upcomingExams, notFinalizedCount },
        };
    }
}
