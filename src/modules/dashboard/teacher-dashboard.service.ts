import { ForbiddenException, Injectable } from "@nestjs/common";

import { AccessRequestStatus, EnrollmentStatus, Prisma, TeacherClassRole } from "@prisma/client";

import { DASHBOARD_LIST_LIMIT, ERROR_DASHBOARD_TEACHER_PROFILE_NOT_FOUND } from "@common/constants";

import { PrismaService } from "@modules/prisma";
import { AccessPolicyService } from "@modules/request-access";

import { DashboardCommonService } from "./dashboard-common.service";
import { DashboardContext, TeacherDashboardStats } from "./dashboard.types";

@Injectable()
export class TeacherDashboardService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly accessPolicy: AccessPolicyService,
        private readonly common: DashboardCommonService,
    ) {}

    private async findProfileWithAssignments(
        context: DashboardContext,
    ): Promise<{ id: string; assignments: TeacherDashboardStats["assignments"] }> {
        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId: context.userId },
            select: {
                id: true,
                classAssignments: {
                    where: { section: { academicYearId: context.academicYearId } },
                    select: {
                        role: true,
                        section: {
                            select: {
                                id: true,
                                name: true,
                                classLevel: true,
                                _count: {
                                    select: {
                                        enrollments: {
                                            where: { status: EnrollmentStatus.ACTIVE },
                                        },
                                    },
                                },
                            },
                        },
                        subject: { select: { id: true, name: true } },
                    },
                    orderBy: [{ section: { classLevel: "asc" } }, { section: { name: "asc" } }],
                },
            },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_DASHBOARD_TEACHER_PROFILE_NOT_FOUND);
        }

        return {
            id: profile.id,
            assignments: profile.classAssignments.map((assignment) => ({
                sectionId: assignment.section.id,
                sectionName: assignment.section.name,
                classLevel: assignment.section.classLevel,
                subjectId: assignment.subject?.id ?? null,
                subjectName: assignment.subject?.name ?? null,
                role: assignment.role,
                studentCount: assignment.section._count.enrollments,
            })),
        };
    }

    private async getAttendanceToday(
        context: DashboardContext,
        assignments: TeacherDashboardStats["assignments"],
    ): Promise<TeacherDashboardStats["attendanceToday"]> {
        if (!context.isSchoolDay) {
            return { isSchoolDay: false };
        }

        const classSections = assignments.filter(
            (assignment) => assignment.role === TeacherClassRole.CLASS_TEACHER,
        );
        const markedDays = await this.prisma.attendanceDay.findMany({
            where: {
                sectionId: { in: classSections.map((section) => section.sectionId) },
                date: context.todayDate,
            },
            select: { sectionId: true },
        });
        const markedSectionIds = new Set(markedDays.map((day) => day.sectionId));

        return {
            isSchoolDay: true,
            sections: classSections.map((section) => ({
                sectionId: section.sectionId,
                sectionName: section.sectionName,
                marked: markedSectionIds.has(section.sectionId),
            })),
        };
    }

    // Class teachers grade every subject of their section; subject teachers only their subject.
    private async getPendingGrading(
        context: DashboardContext,
        assignments: TeacherDashboardStats["assignments"],
    ): Promise<TeacherDashboardStats["exams"]["pendingGrading"]> {
        if (assignments.length === 0) {
            return { count: 0, items: [] };
        }

        const scopes: Prisma.ExamSubjectWhereInput[] = assignments.map((assignment) =>
            assignment.role === TeacherClassRole.CLASS_TEACHER || !assignment.subjectId
                ? { exam: { sectionId: assignment.sectionId } }
                : { exam: { sectionId: assignment.sectionId }, subjectId: assignment.subjectId },
        );
        const studentCountBySection = new Map(
            assignments.map((assignment) => [assignment.sectionId, assignment.studentCount]),
        );

        const examSubjects = await this.common.findPastUnfinalizedExamSubjects(context, {
            OR: scopes,
        });

        const pending = examSubjects.flatMap((examSubject) => {
            const totalStudents = studentCountBySection.get(examSubject.exam.section.id) ?? 0;
            const graded = examSubject._count.grades;

            return graded < totalStudents
                ? [{ ...this.common.toExamSubjectItem(examSubject), graded, totalStudents }]
                : [];
        });

        return { count: pending.length, items: pending.slice(0, DASHBOARD_LIST_LIMIT) };
    }

    private async getAccessRequestCounts(
        userId: string,
    ): Promise<TeacherDashboardStats["accessRequests"]> {
        const groups = await this.prisma.accessRequest.groupBy({
            by: ["status"],
            where: { requesterId: userId },
            _count: { _all: true },
        });

        const counts: Record<AccessRequestStatus, number> = {
            [AccessRequestStatus.PENDING]: 0,
            [AccessRequestStatus.APPROVED]: 0,
            [AccessRequestStatus.REJECTED]: 0,
            [AccessRequestStatus.CANCELLED]: 0,
            [AccessRequestStatus.REVOKED]: 0,
        };

        for (const group of groups) {
            counts[group.status] = group._count._all;
        }

        return counts;
    }

    public async getStats(context: DashboardContext): Promise<TeacherDashboardStats> {
        const profile = await this.findProfileWithAssignments(context);

        const [attendanceToday, upcoming, pendingGrading, activeHomeworkCount, accessRequests] =
            await Promise.all([
                this.getAttendanceToday(context, profile.assignments),
                this.common.findUpcomingExams(context, {
                    section: this.accessPolicy.buildSectionScope(context.userId),
                }),
                this.getPendingGrading(context, profile.assignments),
                this.prisma.homework.count({
                    where: {
                        createdById: profile.id,
                        academicYearId: context.academicYearId,
                        dueDate: { gte: context.todayDate },
                    },
                }),
                this.getAccessRequestCounts(context.userId),
            ]);

        return {
            assignments: profile.assignments,
            attendanceToday,
            exams: { upcoming, pendingGrading },
            activeHomeworkCount,
            accessRequests,
        };
    }
}
