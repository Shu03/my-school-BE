import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { TeacherClassRole } from "@prisma/client";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateSectionDto } from "./dto/create-section.dto";
import { ListSectionsDto } from "./dto/list-sections.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { SectionBasic, SectionWithRelations } from "./sections.types";

@Injectable()
export class SectionsService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearService: AcademicYearsService,
    ) {}

    private async assertClassExists(classId: string): Promise<void> {
        const classExists = await this.prismaService.section.findUnique({
            where: { id: classId },
        });

        if (!classExists) {
            throw new NotFoundException("Class not found");
        }
    }

    private async assertClassNameNotTaken(
        name: string,
        academicYearId: string,
        excludeId?: string,
    ): Promise<void> {
        const existing = await this.prismaService.section.findUnique({
            where: {
                name_academicYearId: {
                    name,
                    academicYearId,
                },
            },
        });

        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(`Class "${name}" already exists in this academic year`);
        }
    }

    public async create(dto: CreateSectionDto): Promise<SectionBasic> {
        // Get academicYearId — use provided or default to current year
        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const currentYear = await this.academicYearService.findCurrent();
            academicYearId = currentYear.id;
        }

        await this.assertClassNameNotTaken(dto.name, academicYearId);

        return this.prismaService.section.create({
            data: {
                name: dto.name,
                classLevel: dto.classLevel,
                academicYearId,
            },
        });
    }

    public async findAll(dto: ListSectionsDto): Promise<SectionBasic[]> {
        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const currentYear = await this.academicYearService.findCurrent();
            academicYearId = currentYear.id;
        }

        return this.prismaService.section.findMany({
            where: {
                academicYearId,
                ...(dto.classLevel !== undefined && {
                    classLevel: dto.classLevel,
                }),
            },
            orderBy: [{ classLevel: "asc" }, { name: "asc" }],
        });
    }

    public async findOne(id: string): Promise<SectionWithRelations> {
        const classRecord = await this.prismaService.section.findUnique({
            where: { id },
            include: {
                academicYear: true,
            },
        });

        if (!classRecord) {
            throw new NotFoundException("Class not found");
        }

        const classTeacherAssignment = await this.prismaService.teacherClassAssignment.findFirst({
            where: {
                sectionId: id,
                role: TeacherClassRole.CLASS_TEACHER,
            },
            include: {
                teacher: {
                    include: {
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
        });

        return { ...classRecord, classTeacher: classTeacherAssignment?.teacher ?? null };
    }

    public async update(id: string, dto: UpdateSectionDto): Promise<SectionBasic> {
        if (dto.name === undefined && dto.classLevel === undefined) {
            throw new BadRequestException("Name or classLevel fields must be provided to update");
        }

        const existing = await this.prismaService.section.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Class not found");
        }

        if (dto.name !== undefined) {
            await this.assertClassNameNotTaken(dto.name, existing.academicYearId, id);
        }

        return this.prismaService.section.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.classLevel !== undefined && { classLevel: dto.classLevel }),
            },
        });
    }
}
