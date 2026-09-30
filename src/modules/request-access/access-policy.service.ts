import { Injectable } from "@nestjs/common";

import { AccessRequestStatus, AccessType, Prisma, TeacherClassRole } from "@prisma/client";

import { PrismaService } from "@modules/prisma";

import { SubjectAccessSource } from "./request-access.types";

@Injectable()
export class AccessPolicyService {
    public constructor(private readonly prisma: PrismaService) {}

    public async isClassTeacher(userId: string, sectionId: string): Promise<boolean> {
        const assignment = await this.prisma.teacherClassAssignment.findFirst({
            where: {
                sectionId,
                role: TeacherClassRole.CLASS_TEACHER,
                teacher: { userId },
            },
            select: { id: true },
        });

        return assignment !== null;
    }

    public async isAssignedToSection(userId: string, sectionId: string): Promise<boolean> {
        const assignment = await this.prisma.teacherClassAssignment.findFirst({
            where: { sectionId, teacher: { userId } },
            select: { id: true },
        });

        return assignment !== null;
    }

    public async hasApprovedAccess(
        userId: string,
        type: AccessType,
        sectionId: string,
        subjectId: string,
    ): Promise<boolean> {
        const grant = await this.prisma.accessRequest.findFirst({
            where: {
                requesterId: userId,
                type,
                sectionId,
                subjectId,
                status: AccessRequestStatus.APPROVED,
            },
            select: { id: true },
        });

        return grant !== null;
    }

    // Class teachers cover every subject of their section.
    public async resolveSubjectAccess(
        userId: string,
        type: AccessType,
        sectionId: string,
        subjectId: string,
    ): Promise<SubjectAccessSource | null> {
        const assignment = await this.prisma.teacherClassAssignment.findFirst({
            where: {
                sectionId,
                teacher: { userId },
                OR: [
                    { role: TeacherClassRole.CLASS_TEACHER },
                    { role: TeacherClassRole.SUBJECT_TEACHER, subjectId },
                ],
            },
            select: { role: true },
            orderBy: { role: "asc" },
        });

        if (assignment) {
            return assignment.role;
        }

        const granted = await this.hasApprovedAccess(userId, type, sectionId, subjectId);

        return granted ? "GRANTED" : null;
    }

    public async findApprovedScopes(
        userId: string,
        type: AccessType,
    ): Promise<{ sectionId: string; subjectId: string }[]> {
        const grants = await this.prisma.accessRequest.findMany({
            where: {
                requesterId: userId,
                type,
                status: AccessRequestStatus.APPROVED,
            },
            select: { sectionId: true, subjectId: true },
        });

        return grants.flatMap((grant) =>
            grant.sectionId && grant.subjectId
                ? [{ sectionId: grant.sectionId, subjectId: grant.subjectId }]
                : [],
        );
    }

    public async canViewSection(userId: string, sectionId: string): Promise<boolean> {
        const section = await this.prisma.section.findFirst({
            where: { id: sectionId, ...this.buildSectionScope(userId) },
            select: { id: true },
        });

        return section !== null;
    }

    // Sections a teacher is assigned to or holds approved access in.
    public buildSectionScope(userId: string): Prisma.SectionWhereInput {
        return {
            OR: [
                { teacherAssignments: { some: { teacher: { userId } } } },
                {
                    accessRequests: {
                        some: { requesterId: userId, status: AccessRequestStatus.APPROVED },
                    },
                },
            ],
        };
    }
}
