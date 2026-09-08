import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EnrollmentStatus, Prisma, Role } from "@prisma/client";

import {
    ERROR_HOMEWORK_EMPTY_UPDATE,
    ERROR_HOMEWORK_FORBIDDEN_SCOPE,
    ERROR_HOMEWORK_INSUFFICIENT_PERMISSIONS,
    ERROR_HOMEWORK_NOT_ASSIGNED,
    ERROR_HOMEWORK_NOT_CREATOR,
    ERROR_HOMEWORK_NOT_FOUND,
    ERROR_HOMEWORK_STUDENT_PROFILE_NOT_FOUND,
    ERROR_HOMEWORK_SUBJECT_GRADE_MISMATCH,
    ERROR_HOMEWORK_TEACHER_PROFILE_NOT_FOUND,
    PERMISSION_HOMEWORK_MANAGE,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { ListHomeworkDto } from "./dto/list-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { HomeworkBasic } from "./homework.types";

const HOMEWORK_INCLUDE = {
    section: true,
    subject: true,
    createdBy: {
        include: {
            user: {
                omit: {
                    password: true,
                },
            },
        },
    },
} satisfies Prisma.HomeworkInclude;

@Injectable()
export class HomeworkService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    private async assertHomeworkExists(id: string): Promise<HomeworkBasic> {
        const homework = await this.prismaService.homework.findUnique({
            where: { id },
            include: HOMEWORK_INCLUDE,
        });

        if (!homework) {
            throw new NotFoundException(ERROR_HOMEWORK_NOT_FOUND);
        }

        return homework;
    }

    private async assertSubjectMatchesClassGrade(
        subjectId: string,
        sectionId: string,
    ): Promise<void> {
        const [subject, classRecord] = await Promise.all([
            this.prismaService.subject.findUnique({
                where: { id: subjectId },
                select: { classLevel: true },
            }),
            this.prismaService.section.findUnique({
                where: { id: sectionId },
                select: { classLevel: true },
            }),
        ]);

        if (!subject) {
            throw new NotFoundException("Subject not found");
        }

        if (!classRecord) {
            throw new NotFoundException("Section not found");
        }

        if (subject.classLevel !== classRecord.classLevel) {
            throw new BadRequestException(ERROR_HOMEWORK_SUBJECT_GRADE_MISMATCH);
        }
    }

    private async assertTeacherAssignedToSubjectClass(
        userId: string,
        sectionId: string,
        subjectId: string,
    ): Promise<void> {
        const assignment = await this.prismaService.teacherClassAssignment.findFirst({
            where: {
                sectionId,
                teacher: { userId },
                OR: [{ subjectId }, { subjectId: null }],
            },
            select: { id: true },
        });

        if (!assignment) {
            throw new ForbiddenException(ERROR_HOMEWORK_NOT_ASSIGNED);
        }
    }

    private async resolveTeacherProfileId(userId: string): Promise<string> {
        const profile = await this.prismaService.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_HOMEWORK_TEACHER_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async resolveStudentProfileId(userId: string): Promise<string> {
        const profile = await this.prismaService.studentProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_HOMEWORK_STUDENT_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private assertCanModify(homework: HomeworkBasic, requestingUser: JwtPayload): void {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        if (homework.createdBy?.userId !== requestingUser.sub) {
            throw new ForbiddenException(ERROR_HOMEWORK_NOT_CREATOR);
        }
    }

    public async create(
        dto: CreateHomeworkDto,
        requestingUser: JwtPayload,
    ): Promise<HomeworkBasic> {
        let academicYearId = dto.academicYearId;

        if (academicYearId === undefined) {
            const currentYear = await this.academicYearsService.findCurrent();
            academicYearId = currentYear.id;
        }

        await this.assertSubjectMatchesClassGrade(dto.subjectId, dto.sectionId);

        let createdById: string | null = null;

        if (requestingUser.role === Role.TEACHER) {
            if (!requestingUser.permissions.includes(PERMISSION_HOMEWORK_MANAGE)) {
                throw new ForbiddenException(ERROR_HOMEWORK_INSUFFICIENT_PERMISSIONS);
            }

            createdById = await this.resolveTeacherProfileId(requestingUser.sub);
            await this.assertTeacherAssignedToSubjectClass(
                requestingUser.sub,
                dto.sectionId,
                dto.subjectId,
            );
        }

        return this.prismaService.homework.create({
            data: {
                title: dto.title,
                description: dto.description,
                sectionId: dto.sectionId,
                subjectId: dto.subjectId,
                academicYearId,
                dueDate: new Date(dto.dueDate),
                createdById,
            },
            include: HOMEWORK_INCLUDE,
        });
    }

    public async findAll(
        dto: ListHomeworkDto,
        requestingUser: JwtPayload,
    ): Promise<HomeworkBasic[]> {
        let academicYearId = dto.academicYearId;

        if (academicYearId === undefined) {
            const currentYear = await this.academicYearsService.findCurrent();
            academicYearId = currentYear.id;
        }

        const where: Prisma.HomeworkWhereInput = {
            academicYearId,
            ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
            ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        };

        if (requestingUser.role === Role.TEACHER) {
            where.section = {
                teacherAssignments: {
                    some: { teacher: { userId: requestingUser.sub } },
                },
            };
        } else if (requestingUser.role === Role.STUDENT) {
            where.section = {
                enrollments: {
                    some: {
                        academicYearId,
                        status: EnrollmentStatus.ACTIVE,
                        student: { userId: requestingUser.sub },
                    },
                },
            };
        }

        return this.prismaService.homework.findMany({
            where,
            include: HOMEWORK_INCLUDE,
            orderBy: { dueDate: "asc" },
        });
    }

    public async findOne(id: string, requestingUser: JwtPayload): Promise<HomeworkBasic> {
        const homework = await this.assertHomeworkExists(id);

        if (requestingUser.role === Role.TEACHER) {
            const assignment = await this.prismaService.teacherClassAssignment.findFirst({
                where: {
                    sectionId: homework.sectionId,
                    teacher: { userId: requestingUser.sub },
                },
                select: { id: true },
            });

            if (!assignment) {
                throw new ForbiddenException(ERROR_HOMEWORK_FORBIDDEN_SCOPE);
            }
        } else if (requestingUser.role === Role.STUDENT) {
            const enrollment = await this.prismaService.studentEnrollment.findFirst({
                where: {
                    sectionId: homework.sectionId,
                    academicYearId: homework.academicYearId,
                    status: EnrollmentStatus.ACTIVE,
                    student: { userId: requestingUser.sub },
                },
                select: { id: true },
            });

            if (!enrollment) {
                throw new ForbiddenException(ERROR_HOMEWORK_FORBIDDEN_SCOPE);
            }
        }

        return homework;
    }

    public async update(
        id: string,
        dto: UpdateHomeworkDto,
        requestingUser: JwtPayload,
    ): Promise<HomeworkBasic> {
        if (dto.title === undefined && dto.description === undefined && dto.dueDate === undefined) {
            throw new BadRequestException(ERROR_HOMEWORK_EMPTY_UPDATE);
        }

        const homework = await this.assertHomeworkExists(id);
        this.assertCanModify(homework, requestingUser);

        if (
            requestingUser.role === Role.TEACHER &&
            !requestingUser.permissions.includes(PERMISSION_HOMEWORK_MANAGE)
        ) {
            throw new ForbiddenException(ERROR_HOMEWORK_INSUFFICIENT_PERMISSIONS);
        }

        return this.prismaService.homework.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
            },
            include: HOMEWORK_INCLUDE,
        });
    }

    public async delete(id: string, requestingUser: JwtPayload): Promise<HomeworkBasic> {
        const homework = await this.assertHomeworkExists(id);
        this.assertCanModify(homework, requestingUser);

        await this.prismaService.homework.delete({ where: { id } });

        return homework;
    }
}
