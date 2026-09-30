import { ForbiddenException, Injectable } from "@nestjs/common";

import { EnrollmentStatus, ExamStatus, TeacherClassRole } from "@prisma/client";

import { DASHBOARD_LIST_LIMIT, ERROR_DASHBOARD_STUDENT_PROFILE_NOT_FOUND } from "@common/constants";

import { PrismaService } from "@modules/prisma";

import { DashboardCommonService, roundAmount, toPercentage } from "./dashboard-common.service";
import {
    AttendanceCounts,
    DashboardContext,
    ExamResultItem,
    StudentDashboardStats,
} from "./dashboard.types";

@Injectable()
export class StudentDashboardService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly common: DashboardCommonService,
    ) {}

    // Only absences are stored, so present = days attendance was taken - absences.
    private async getAttendanceCounts(
        studentId: string,
        sectionId: string,
        date: { gte?: Date; lte: Date },
    ): Promise<AttendanceCounts> {
        const [totalDays, absent] = await Promise.all([
            this.prisma.attendanceDay.count({ where: { sectionId, date } }),
            this.prisma.attendance.count({ where: { studentId, sectionId, date } }),
        ]);
        const present = totalDays - absent;

        return { totalDays, present, absent, percentage: toPercentage(present, totalDays) };
    }

    private async getFees(
        studentId: string,
        academicYearId: string,
    ): Promise<StudentDashboardStats["fees"]> {
        const record = await this.prisma.feeRecord.findUnique({
            where: { studentId_academicYearId: { studentId, academicYearId } },
            select: {
                id: true,
                totalAmount: true,
                status: true,
                feeStructure: { select: { dueDate: true } },
            },
        });

        if (!record) {
            return null;
        }

        const payments = await this.prisma.feePayment.aggregate({
            where: { feeRecordId: record.id },
            _sum: { amount: true },
        });
        const paid = payments._sum.amount ?? 0;

        return {
            total: roundAmount(record.totalAmount),
            paid: roundAmount(paid),
            due: roundAmount(record.totalAmount - paid),
            status: record.status,
            dueDate: record.feeStructure.dueDate,
        };
    }

    private async getRecentResults(
        studentId: string,
        sectionId: string,
        academicYearId: string,
    ): Promise<ExamResultItem[]> {
        const exams = await this.prisma.exam.findMany({
            where: {
                sectionId,
                academicYearId,
                status: ExamStatus.ACTIVE,
                isFinalized: true,
                examSubjects: { some: { grades: { some: { studentId } } } },
            },
            select: {
                id: true,
                name: true,
                type: true,
                examSubjects: {
                    select: {
                        totalMarks: true,
                        grades: { where: { studentId }, select: { marksObtained: true } },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: DASHBOARD_LIST_LIMIT,
        });

        return exams.map((exam) => {
            // Subjects without a grade for this student are left out of the percentage.
            const graded = exam.examSubjects.filter((subject) => subject.grades.length > 0);
            const marksObtained = graded.reduce(
                (total, subject) => total + subject.grades[0].marksObtained,
                0,
            );
            const totalMarks = graded.reduce((total, subject) => total + subject.totalMarks, 0);

            return {
                examId: exam.id,
                examName: exam.name,
                examType: exam.type,
                marksObtained: roundAmount(marksObtained),
                totalMarks: roundAmount(totalMarks),
                percentage: toPercentage(marksObtained, totalMarks),
            };
        });
    }

    public async getStats(context: DashboardContext): Promise<StudentDashboardStats> {
        const { academicYearId, todayDate } = context;

        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: context.userId },
            select: {
                id: true,
                enrollments: {
                    where: { academicYearId, status: EnrollmentStatus.ACTIVE },
                    select: {
                        rollNumber: true,
                        section: {
                            select: {
                                id: true,
                                name: true,
                                classLevel: true,
                                teacherAssignments: {
                                    where: { role: TeacherClassRole.CLASS_TEACHER },
                                    select: {
                                        teacher: {
                                            select: {
                                                user: {
                                                    select: { firstName: true, lastName: true },
                                                },
                                            },
                                        },
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_DASHBOARD_STUDENT_PROFILE_NOT_FOUND);
        }

        const fees = await this.getFees(profile.id, academicYearId);
        const enrollment = profile.enrollments[0];

        if (!enrollment) {
            return {
                enrollment: null,
                attendance: null,
                fees,
                homeworkDueSoon: null,
                exams: null,
            };
        }

        const { section } = enrollment;
        const monthStart = new Date(`${context.today.slice(0, 7)}-01`);

        const [yearAttendance, monthAttendance, homework, upcoming, recentResults] =
            await Promise.all([
                this.getAttendanceCounts(profile.id, section.id, { lte: todayDate }),
                this.getAttendanceCounts(profile.id, section.id, {
                    gte: monthStart,
                    lte: todayDate,
                }),
                this.prisma.homework.findMany({
                    where: {
                        sectionId: section.id,
                        academicYearId,
                        dueDate: { gte: todayDate, lte: context.upcomingUntil },
                    },
                    select: {
                        id: true,
                        title: true,
                        dueDate: true,
                        subject: { select: { name: true } },
                    },
                    orderBy: { dueDate: "asc" },
                    take: DASHBOARD_LIST_LIMIT,
                }),
                this.common.findUpcomingExams(context, { sectionId: section.id }),
                this.getRecentResults(profile.id, section.id, academicYearId),
            ]);

        const classTeacher = section.teacherAssignments[0]?.teacher.user ?? null;

        return {
            enrollment: {
                sectionId: section.id,
                sectionName: section.name,
                classLevel: section.classLevel,
                rollNumber: enrollment.rollNumber,
                classTeacher,
            },
            attendance: { year: yearAttendance, month: monthAttendance },
            fees,
            homeworkDueSoon: homework.map((item) => ({
                id: item.id,
                title: item.title,
                subjectName: item.subject.name,
                dueDate: item.dueDate,
            })),
            exams: { upcoming, recentResults },
        };
    }
}
