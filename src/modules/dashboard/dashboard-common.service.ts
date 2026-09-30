import { Injectable } from "@nestjs/common";

import { ExamStatus, Prisma } from "@prisma/client";

import { DASHBOARD_LIST_LIMIT } from "@common/constants";

import { PrismaService } from "@modules/prisma";

import {
    AnnouncementItem,
    DashboardContext,
    ExamSubjectItem,
    HolidayItem,
} from "./dashboard.types";

const examSubjectInclude = {
    exam: {
        select: {
            id: true,
            name: true,
            type: true,
            section: { select: { id: true, name: true, classLevel: true } },
        },
    },
    subject: { select: { id: true, name: true } },
} satisfies Prisma.ExamSubjectInclude;

export type ExamSubjectWithRelations = Prisma.ExamSubjectGetPayload<{
    include: typeof examSubjectInclude;
}>;

// Fee amounts are Float columns, so sums need rounding to avoid 0.1 + 0.2 artefacts.
export const roundAmount = (value: number): number => Math.round(value * 100) / 100;

export const toPercentage = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

@Injectable()
export class DashboardCommonService {
    public constructor(private readonly prisma: PrismaService) {}

    public toExamSubjectItem(examSubject: ExamSubjectWithRelations): ExamSubjectItem {
        return {
            examSubjectId: examSubject.id,
            examId: examSubject.exam.id,
            examName: examSubject.exam.name,
            examType: examSubject.exam.type,
            sectionId: examSubject.exam.section.id,
            sectionName: examSubject.exam.section.name,
            classLevel: examSubject.exam.section.classLevel,
            subjectId: examSubject.subject.id,
            subjectName: examSubject.subject.name,
            date: examSubject.date,
            totalMarks: examSubject.totalMarks,
        };
    }

    public async findUpcomingExams(
        context: DashboardContext,
        examWhere: Prisma.ExamWhereInput = {},
    ): Promise<ExamSubjectItem[]> {
        const examSubjects = await this.prisma.examSubject.findMany({
            where: {
                date: { gte: context.todayDate, lte: context.upcomingUntil },
                exam: {
                    ...examWhere,
                    academicYearId: context.academicYearId,
                    status: ExamStatus.ACTIVE,
                },
            },
            include: examSubjectInclude,
            orderBy: { date: "asc" },
            take: DASHBOARD_LIST_LIMIT,
        });

        return examSubjects.map((examSubject) => this.toExamSubjectItem(examSubject));
    }

    public async findPastUnfinalizedExamSubjects(
        context: DashboardContext,
        where: Prisma.ExamSubjectWhereInput,
    ): Promise<(ExamSubjectWithRelations & { _count: { grades: number } })[]> {
        return this.prisma.examSubject.findMany({
            where: {
                ...where,
                date: { lte: context.todayDate },
                exam: {
                    academicYearId: context.academicYearId,
                    status: ExamStatus.ACTIVE,
                    isFinalized: false,
                },
            },
            include: { ...examSubjectInclude, _count: { select: { grades: true } } },
            orderBy: { date: "asc" },
        });
    }

    public async findActiveAnnouncements(): Promise<AnnouncementItem[]> {
        const now = new Date();

        return this.prisma.announcement.findMany({
            where: { startDate: { lte: now }, endDate: { gte: now } },
            select: { id: true, title: true, content: true, startDate: true, endDate: true },
            orderBy: { startDate: "desc" },
            take: DASHBOARD_LIST_LIMIT,
        });
    }

    public async findUpcomingHolidays(context: DashboardContext): Promise<HolidayItem[]> {
        return this.prisma.holiday.findMany({
            where: { academicYearId: context.academicYearId, date: { gte: context.todayDate } },
            select: { id: true, name: true, date: true },
            orderBy: { date: "asc" },
            take: DASHBOARD_LIST_LIMIT,
        });
    }
}
