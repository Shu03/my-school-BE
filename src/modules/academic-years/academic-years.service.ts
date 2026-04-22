import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@modules/prisma/prisma.service";

import { AcademicYearBasic, AcademicYearWithTerms, TermBasic } from "./academic-years.types";
import { CreateAcademicYearDto } from "./dto/create-academic-year.dto";
import { CreateTermDto } from "./dto/create-term.dto";
import { UpdateAcademicYearDto } from "./dto/update-academic-year.dto";
import { UpdateTermDto } from "./dto/update-term.dto";

@Injectable()
export class AcademicYearsService {
    public constructor(private readonly prisma: PrismaService) {}

    private async assertNameNotTaken(name: string, excludeId?: string): Promise<void> {
        // Implementation to check if the academic year name is already taken, excluding the current record if updating
        const existing = await this.prisma.academicYear.findUnique({
            where: {
                name,
            },
        });
        if (existing && existing.id !== excludeId) {
            throw new BadRequestException(`Academic year "${name}" already exists`);
        }
    }

    private assertValidDateRange(startDate: string, endDate: string): void {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new BadRequestException("startDate must be before endDate");
        }
    }

    private async assertYearExists(id: string): Promise<void> {
        const existing = await this.prisma.academicYear.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new BadRequestException(`Academic year not found`);
        }
    }

    private async setCurrentYear(id: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.academicYear.updateMany({
                where: { isCurrent: true },
                data: { isCurrent: false },
            }),
            this.prisma.academicYear.update({
                where: { id },
                data: { isCurrent: true },
            }),
        ]);
    }

    public async create(dto: CreateAcademicYearDto): Promise<AcademicYearBasic> {
        await this.assertNameNotTaken(dto.name);
        this.assertValidDateRange(dto.startDate, dto.endDate);

        const classesToCopy: { name: string; gradeLevel: number }[] = [];

        if (dto.copyClassStructureFromCurrent) {
            const currentYear = await this.prisma.academicYear.findFirst({
                where: { isCurrent: true },
                include: {
                    classes: {
                        select: {
                            name: true,
                            gradeLevel: true,
                        },
                    },
                },
            });

            if (currentYear) {
                classesToCopy.push(...currentYear.classes);
            }
        }

        const academicYear = await this.prisma.academicYear.create({
            data: {
                name: dto.name,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                ...(classesToCopy.length > 0 && {
                    classes: {
                        create: classesToCopy.map((cls) => ({
                            name: cls.name,
                            gradeLevel: cls.gradeLevel,
                        })),
                    },
                }),
            },
        });
        return academicYear;
    }

    public async findAll(): Promise<AcademicYearBasic[]> {
        return this.prisma.academicYear.findMany({
            orderBy: { startDate: "desc" },
        });
    }

    public async findCurrent(): Promise<AcademicYearWithTerms> {
        const current = await this.prisma.academicYear.findFirst({
            where: { isCurrent: true },
            include: { terms: true },
        });

        if (!current) {
            throw new NotFoundException("No current academic year set");
        }

        return current;
    }

    public async findOne(id: string): Promise<AcademicYearWithTerms> {
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id },
            include: { terms: true },
        });

        if (!academicYear) {
            throw new NotFoundException("Academic year not found");
        }

        return academicYear;
    }

    public async update(id: string, dto: UpdateAcademicYearDto): Promise<AcademicYearBasic> {
        // Guard — nothing to update
        if (dto.name === undefined && dto.startDate === undefined && dto.endDate === undefined) {
            throw new BadRequestException("No fields provided to update");
        }

        const existing = await this.prisma.academicYear.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException("Academic year not found");
        }

        if (dto.name !== undefined) {
            await this.assertNameNotTaken(dto.name, id);
        }

        if (dto.startDate !== undefined || dto.endDate !== undefined) {
            const startDate = dto.startDate ?? existing.startDate.toISOString();
            const endDate = dto.endDate ?? existing.endDate.toISOString();
            this.assertValidDateRange(startDate, endDate);
        }

        return this.prisma.academicYear.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.startDate !== undefined && {
                    startDate: new Date(dto.startDate),
                }),
                ...(dto.endDate !== undefined && {
                    endDate: new Date(dto.endDate),
                }),
            },
        });
    }

    public async setCurrent(id: string): Promise<AcademicYearBasic> {
        await this.assertYearExists(id);

        const current = await this.prisma.academicYear.findFirst({
            where: { isCurrent: true },
        });

        if (current?.id === id) {
            throw new BadRequestException("This academic year is already set as current");
        }

        await this.setCurrentYear(id);

        return this.prisma.academicYear.findUniqueOrThrow({
            where: { id },
        });
    }

    public async createTerm(academicYearId: string, dto: CreateTermDto): Promise<TermBasic> {
        await this.assertYearExists(academicYearId);
        this.assertValidDateRange(dto.startDate, dto.endDate);

        // Validate term dates are within academic year bounds
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id: academicYearId },
        });

        if (
            new Date(dto.startDate) < academicYear!.startDate ||
            new Date(dto.endDate) > academicYear!.endDate
        ) {
            throw new BadRequestException("Term dates must be within the academic year bounds");
        }

        return this.prisma.term.create({
            data: {
                name: dto.name,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                academicYearId,
            },
        });
    }

    public async findTerms(academicYearId: string): Promise<TermBasic[]> {
        await this.assertYearExists(academicYearId);

        return this.prisma.term.findMany({
            where: { academicYearId },
            orderBy: { startDate: "asc" },
        });
    }

    public async updateTerm(
        academicYearId: string,
        termId: string,
        dto: UpdateTermDto,
    ): Promise<TermBasic> {
        if (dto.name === undefined && dto.startDate === undefined && dto.endDate === undefined) {
            throw new BadRequestException("No fields provided to update");
        }

        await this.assertYearExists(academicYearId);

        const existing = await this.prisma.term.findUnique({
            where: { id: termId },
        });

        if (!existing || existing.academicYearId !== academicYearId) {
            throw new NotFoundException("Term not found");
        }

        if (dto.startDate !== undefined || dto.endDate !== undefined) {
            const startDate = dto.startDate ?? existing.startDate.toISOString();
            const endDate = dto.endDate ?? existing.endDate.toISOString();
            this.assertValidDateRange(startDate, endDate);

            // Validate term dates are within academic year bounds
            const academicYear = await this.prisma.academicYear.findUnique({
                where: { id: academicYearId },
            });

            if (
                new Date(startDate) < academicYear!.startDate ||
                new Date(endDate) > academicYear!.endDate
            ) {
                throw new BadRequestException("Term dates must be within the academic year bounds");
            }
        }

        return this.prisma.term.update({
            where: { id: termId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.startDate !== undefined && {
                    startDate: new Date(dto.startDate),
                }),
                ...(dto.endDate !== undefined && {
                    endDate: new Date(dto.endDate),
                }),
            },
        });
    }

    public async deleteTerm(academicYearId: string, termId: string): Promise<void> {
        await this.assertYearExists(academicYearId);

        const existing = await this.prisma.term.findUnique({
            where: { id: termId },
        });

        if (!existing || existing.academicYearId !== academicYearId) {
            throw new NotFoundException("Term not found");
        }

        await this.prisma.term.delete({
            where: { id: termId },
        });
    }
}
