import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

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
        gradeLevel: number,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prisma.subject.findUnique({
            where: {
                name_gradeLevel: { name, gradeLevel },
            },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(
                `Subject "${name}" already exists for grade ${gradeLevel}`,
            );
        }
    }

    private async assertCodeNotTaken(
        code: string,
        gradeLevel: number,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prisma.subject.findUnique({
            where: {
                code_gradeLevel: { code, gradeLevel },
            },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(
                `Subject code "${code}" already exists for grade ${gradeLevel}`,
            );
        }
    }

    /** Creating the subject */
    public async create(dto: CreateSubjectDto): Promise<SubjectBasic> {
        await this.assertNameNotTaken(dto.name, dto.gradeLevel);
        await this.assertCodeNotTaken(dto.code, dto.gradeLevel);

        return this.prisma.subject.create({
            data: {
                name: dto.name,
                code: dto.code,
                gradeLevel: dto.gradeLevel,
                description: dto.description,
            },
        });
    }

    /** Find all subjects */
    public async findAll(dto: ListSubjectsDto): Promise<SubjectBasic[]> {
        return this.prisma.subject.findMany({
            where: {
                ...(dto.gradeLevel !== undefined && {
                    gradeLevel: dto.gradeLevel,
                }),
                ...(dto.search !== undefined && {
                    name: {
                        contains: dto.search,
                        mode: "insensitive",
                    },
                }),
            },
            orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
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
                        class: true,
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
            await this.assertNameNotTaken(dto.name, existing.gradeLevel, id);
        }

        if (dto.code !== undefined) {
            await this.assertCodeNotTaken(dto.code, existing.gradeLevel, id);
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

        await this.prisma.subject.delete({
            where: { id },
        });
    }
}
