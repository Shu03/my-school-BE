import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";

import { ClassBasic, ClassWithRelations } from "./classes.types";
import { AssignTeacherDto } from "./dto/assign-teacher.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { ListClassesDto } from "./dto/list-classes.dto";
import { UpdateClassDto } from "./dto/update-class.dto";

@Injectable()
export class ClassesService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearService: AcademicYearsService,
    ) {}

    private async assertClassExists(classId: string): Promise<void> {
        const classExists = await this.prismaService.class.findUnique({
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
        const existing = await this.prismaService.class.findUnique({
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

    public async create(dto: CreateClassDto): Promise<ClassBasic> {
        // Get academicYearId — use provided or default to current year
        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const currentYear = await this.academicYearService.findCurrent();
            academicYearId = currentYear.id;
        }

        await this.assertClassNameNotTaken(dto.name, academicYearId);

        return this.prismaService.class.create({
            data: {
                name: dto.name,
                gradeLevel: dto.gradeLevel,
                academicYearId,
            },
        });
    }

    public async findAll(dto: ListClassesDto): Promise<ClassBasic[]> {
        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const currentYear = await this.academicYearService.findCurrent();
            academicYearId = currentYear.id;
        }

        return this.prismaService.class.findMany({
            where: {
                academicYearId,
                ...(dto.gradeLevel !== undefined && {
                    gradeLevel: dto.gradeLevel,
                }),
            },
            orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
        });
    }

    public async findOne(id: string): Promise<ClassWithRelations> {
        const classRecord = await this.prismaService.class.findUnique({
            where: { id },
            include: {
                academicYear: true,
                classTeacher: {
                    include: {
                        user: {
                            omit: { password: true },
                        },
                    },
                },
            },
        });

        if (!classRecord) {
            throw new NotFoundException("Class not found");
        }

        return classRecord;
    }

    public async update(id: string, dto: UpdateClassDto): Promise<ClassBasic> {
        if (dto.name === undefined && dto.gradeLevel === undefined) {
            throw new BadRequestException("Name or gradeLevel fields must be provided to update");
        }

        const existing = await this.prismaService.class.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Class not found");
        }

        if (dto.name !== undefined) {
            await this.assertClassNameNotTaken(dto.name, existing.academicYearId, id);
        }

        return this.prismaService.class.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.gradeLevel !== undefined && { gradeLevel: dto.gradeLevel }),
            },
        });
    }

    public async assignTeacher(id: string, dto: AssignTeacherDto): Promise<ClassBasic> {
        await this.assertClassExists(id);

        const teacher = await this.prismaService.teacherProfile.findUnique({
            where: { id: dto.teacherId },
            include: { user: true },
        });

        if (!teacher) {
            throw new NotFoundException("Teacher not found");
        }

        if (!teacher.user.isActive) {
            throw new BadRequestException("Cannot assign an inactive teacher as class teacher");
        }

        return this.prismaService.class.update({
            where: { id },
            data: { classTeacherId: dto.teacherId },
        });
    }

    public async removeTeacher(id: string): Promise<ClassBasic> {
        await this.assertClassExists(id);

        const classRecord = await this.prismaService.class.findUnique({
            where: { id },
        });

        if (!classRecord?.classTeacherId) {
            throw new BadRequestException("This class has no class teacher assigned");
        }

        return this.prismaService.class.update({
            where: { id },
            data: { classTeacherId: null },
        });
    }
}
