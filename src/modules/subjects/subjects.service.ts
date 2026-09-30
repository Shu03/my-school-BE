import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { AccessRequestStatus } from "@prisma/client";

import { ERROR_SUBJECT_HAS_ACTIVE_ACCESS } from "@common/constants";

import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateSubjectDto } from "./dto/create-subject.dto";
import { ListSubjectsDto } from "./dto/list-subjects.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { SubjectBasic, SubjectWithAssignments } from "./subjects.types";

@Injectable()
export class SubjectsService {
    public constructor(private readonly prisma: PrismaService) {}

    private async assertSubjectExists(id: string): Promise<void> {
        const existing = await this.prisma.subject.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Subject not found");
        }
    }

    private async assertNameNotTaken(
        name: string,
        classLevel: number,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prisma.subject.findUnique({
            where: {
                name_classLevel: { name, classLevel },
            },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(
                `Subject "${name}" already exists for class ${classLevel}`,
            );
        }
    }

    private async assertCodeNotTaken(
        code: string,
        classLevel: number,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prisma.subject.findUnique({
            where: {
                code_classLevel: { code, classLevel },
            },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(
                `Subject code "${code}" already exists for class ${classLevel}`,
            );
        }
    }

    /** Creating the subject */
    public async create(dto: CreateSubjectDto): Promise<SubjectBasic> {
        await this.assertNameNotTaken(dto.name, dto.classLevel);
        await this.assertCodeNotTaken(dto.code, dto.classLevel);

        return this.prisma.subject.create({
            data: {
                name: dto.name,
                code: dto.code,
                classLevel: dto.classLevel,
                description: dto.description,
            },
        });
    }

    /** Find all subjects */
    public async findAll(dto: ListSubjectsDto): Promise<SubjectBasic[]> {
        return this.prisma.subject.findMany({
            where: {
                ...(dto.classLevel !== undefined && {
                    classLevel: dto.classLevel,
                }),
                ...(dto.search !== undefined && {
                    name: {
                        contains: dto.search,
                        mode: "insensitive",
                    },
                }),
            },
            orderBy: [{ classLevel: "asc" }, { name: "asc" }],
        });
    }

    /** Find one subject by ID */
    public async findOne(id: string): Promise<SubjectWithAssignments> {
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                teacherAssignments: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    omit: { password: true },
                                },
                            },
                        },
                        section: true,
                    },
                },
            },
        });

        if (!subject) {
            throw new NotFoundException("Subject not found");
        }

        return subject;
    }

    /** Update subject details */
    public async update(id: string, dto: UpdateSubjectDto): Promise<SubjectBasic> {
        if (dto.name === undefined && dto.code === undefined && dto.description === undefined) {
            throw new BadRequestException(
                "At least one field must be provided: name, code, description",
            );
        }

        const existing = await this.prisma.subject.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Subject not found");
        }

        if (dto.name !== undefined) {
            await this.assertNameNotTaken(dto.name, existing.classLevel, id);
        }

        if (dto.code !== undefined) {
            await this.assertCodeNotTaken(dto.code, existing.classLevel, id);
        }

        return this.prisma.subject.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.code !== undefined && { code: dto.code }),
                ...(dto.description !== undefined && {
                    description: dto.description,
                }),
            },
        });
    }

    /** Delete a subject */

    public async delete(id: string): Promise<void> {
        await this.assertSubjectExists(id);

        const assignmentCount = await this.prisma.teacherClassAssignment.count({
            where: { subjectId: id },
        });

        if (assignmentCount > 0) {
            throw new BadRequestException(
                `Cannot delete subject — it has ${assignmentCount} active teacher assignment(s). Remove all assignments first.`,
            );
        }

        const activeAccessCount = await this.prisma.accessRequest.count({
            where: { subjectId: id, status: AccessRequestStatus.APPROVED },
        });

        if (activeAccessCount > 0) {
            throw new BadRequestException(
                ERROR_SUBJECT_HAS_ACTIVE_ACCESS.replace("%s", String(activeAccessCount)),
            );
        }

        await this.prisma.subject.delete({
            where: { id },
        });
    }
}
