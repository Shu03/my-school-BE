import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";

import { EnrollmentStatus, FeeRecordStatus, Prisma, Role } from "@prisma/client";

import {
    ERROR_FEE_FORBIDDEN_SCOPE,
    ERROR_FEE_INSUFFICIENT_PERMISSIONS,
    ERROR_FEE_RECORD_NOT_FOUND,
    ERROR_FEE_STRUCTURE_ALREADY_EXISTS,
    ERROR_FEE_STRUCTURE_EMPTY_UPDATE,
    ERROR_FEE_STRUCTURE_NOT_FOUND,
    ERROR_FEE_STUDENT_PROFILE_NOT_FOUND,
    ERROR_FEE_TEACHER_NO_ACCESS_TO_STUDENT,
    ERROR_FEE_TEACHER_PROFILE_NOT_FOUND,
    PERMISSION_FEES_MANAGE,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma";

import {
    BackfillFeesDto,
    CreateFeeStructureDto,
    ListFeeRecordsDto,
    ListFeeStructuresDto,
    RecordPaymentDto,
    UpdateFeeStructureDto,
} from "./dto";
import {
    BackfillResult,
    FeePaymentBasic,
    FeeRecordBasic,
    FeeRecordWithPayments,
    FeeStructureBasic,
} from "./fees.types";

const FEE_STRUCTURE_INCLUDE = {
    academicYear: true,
} satisfies Prisma.FeeStructureInclude;

const FEE_RECORD_INCLUDE = {
    student: {
        include: {
            user: {
                omit: { password: true },
            },
        },
    },
    feeStructure: true,
} satisfies Prisma.FeeRecordInclude;

const FEE_PAYMENT_INCLUDE = {
    recordedBy: {
        omit: { password: true },
    },
} satisfies Prisma.FeePaymentInclude;

@Injectable()
export class FeesService {
    private readonly logger: Logger = new Logger(FeesService.name);

    public constructor(
        private readonly prisma: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    // ─── Private Helpers ─────────────────────────────────────────────────────────

    private async resolveAcademicYearId(academicYearId?: string): Promise<string> {
        if (academicYearId !== undefined) {
            return academicYearId;
        }

        const current = await this.academicYearsService.findCurrent();
        return current.id;
    }

    private async assertFeeStructureExists(id: string): Promise<FeeStructureBasic> {
        const structure = await this.prisma.feeStructure.findUnique({
            where: { id },
            include: FEE_STRUCTURE_INCLUDE,
        });

        if (!structure) {
            throw new NotFoundException(ERROR_FEE_STRUCTURE_NOT_FOUND);
        }

        return structure;
    }

    private async computeAmountPaid(feeRecordId: string): Promise<number> {
        const aggregate = await this.prisma.feePayment.aggregate({
            where: { feeRecordId },
            _sum: { amount: true },
        });

        return aggregate._sum.amount ?? 0;
    }

    private async computeAmountPaidAndStatus(
        feeRecordId: string,
    ): Promise<{ amountPaid: number; status: FeeRecordStatus }> {
        const record = await this.prisma.feeRecord.findUnique({
            where: { id: feeRecordId },
            select: { totalAmount: true },
        });

        if (!record) {
            throw new NotFoundException(ERROR_FEE_RECORD_NOT_FOUND);
        }

        const amountPaid = await this.computeAmountPaid(feeRecordId);

        let status: FeeRecordStatus = FeeRecordStatus.PENDING;
        if (amountPaid >= record.totalAmount) {
            status = FeeRecordStatus.PAID;
        } else if (amountPaid > 0) {
            status = FeeRecordStatus.PARTIAL;
        }

        return { amountPaid, status };
    }

    private async recalculateAndUpdateStatus(feeRecordId: string): Promise<void> {
        const { status } = await this.computeAmountPaidAndStatus(feeRecordId);

        await this.prisma.feeRecord.update({
            where: { id: feeRecordId },
            data: { status },
        });
    }

    private async assertFeeRecordExists(id: string): Promise<FeeRecordBasic> {
        const record = await this.prisma.feeRecord.findUnique({
            where: { id },
            include: FEE_RECORD_INCLUDE,
        });

        if (!record) {
            throw new NotFoundException(ERROR_FEE_RECORD_NOT_FOUND);
        }

        const amountPaid = await this.computeAmountPaid(id);

        return { ...record, amountPaid };
    }

    private async resolveTeacherProfileId(userId: string): Promise<string> {
        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_FEE_TEACHER_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async resolveStudentProfileId(userId: string): Promise<string> {
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_FEE_STUDENT_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async getTeacherClassIds(teacherProfileId: string): Promise<string[]> {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({
            where: { id: teacherProfileId },
            select: {
                classAssignments: { select: { classId: true } },
                classesAsTeacher: { select: { id: true } },
            },
        });

        if (!teacherProfile) {
            throw new ForbiddenException(ERROR_FEE_TEACHER_PROFILE_NOT_FOUND);
        }

        return [
            ...teacherProfile.classAssignments.map((assignment) => assignment.classId),
            ...teacherProfile.classesAsTeacher.map((classRecord) => classRecord.id),
        ];
    }

    private async assertTeacherHasAccessToStudent(
        teacherProfileId: string,
        studentId: string,
    ): Promise<void> {
        const teacherClassIds = await this.getTeacherClassIds(teacherProfileId);

        const enrollment = await this.prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                status: EnrollmentStatus.ACTIVE,
                classId: { in: teacherClassIds },
            },
            select: { id: true },
        });

        if (!enrollment) {
            throw new ForbiddenException(ERROR_FEE_TEACHER_NO_ACCESS_TO_STUDENT);
        }
    }

    private assertTeacherHasFeesPermission(requestingUser: JwtPayload): void {
        if (
            requestingUser.role === Role.TEACHER &&
            !requestingUser.permissions.includes(PERMISSION_FEES_MANAGE)
        ) {
            throw new ForbiddenException(ERROR_FEE_INSUFFICIENT_PERMISSIONS);
        }
    }

    private async attachAmountPaid(
        records: Prisma.FeeRecordGetPayload<{ include: typeof FEE_RECORD_INCLUDE }>[],
    ): Promise<FeeRecordBasic[]> {
        if (records.length === 0) {
            return [];
        }

        const grouped = await this.prisma.feePayment.groupBy({
            by: ["feeRecordId"],
            where: { feeRecordId: { in: records.map((record) => record.id) } },
            _sum: { amount: true },
        });

        const paidByRecordId = new Map<string, number>(
            grouped.map((group) => [group.feeRecordId, group._sum.amount ?? 0]),
        );

        return records.map((record) => ({
            ...record,
            amountPaid: paidByRecordId.get(record.id) ?? 0,
        }));
    }

    // ─── Fee Structures ──────────────────────────────────────────────────────────

    public async createFeeStructure(dto: CreateFeeStructureDto): Promise<FeeStructureBasic> {
        const academicYearId = await this.resolveAcademicYearId(dto.academicYearId);

        try {
            return await this.prisma.feeStructure.create({
                data: {
                    gradeLevel: dto.gradeLevel,
                    academicYearId,
                    totalAmount: dto.totalAmount,
                    dueDate: new Date(dto.dueDate),
                },
                include: FEE_STRUCTURE_INCLUDE,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new BadRequestException(
                    ERROR_FEE_STRUCTURE_ALREADY_EXISTS.replace("%s", String(dto.gradeLevel)),
                );
            }
            throw error;
        }
    }

    public async listFeeStructures(dto: ListFeeStructuresDto): Promise<FeeStructureBasic[]> {
        const academicYearId = await this.resolveAcademicYearId(dto.academicYearId);

        return this.prisma.feeStructure.findMany({
            where: { academicYearId },
            include: FEE_STRUCTURE_INCLUDE,
            orderBy: { gradeLevel: "asc" },
        });
    }

    public async updateFeeStructure(
        id: string,
        dto: UpdateFeeStructureDto,
    ): Promise<FeeStructureBasic> {
        if (dto.totalAmount === undefined && dto.dueDate === undefined) {
            throw new BadRequestException(ERROR_FEE_STRUCTURE_EMPTY_UPDATE);
        }

        await this.assertFeeStructureExists(id);

        return this.prisma.feeStructure.update({
            where: { id },
            data: {
                ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount }),
                ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
            },
            include: FEE_STRUCTURE_INCLUDE,
        });
    }

    // ─── Fee Record Generation ───────────────────────────────────────────────────

    public async generateFeeRecordForStudent(
        studentId: string,
        classId: string,
        academicYearId: string,
    ): Promise<void> {
        const classRecord = await this.prisma.class.findUnique({
            where: { id: classId },
            select: { gradeLevel: true },
        });

        if (!classRecord) {
            this.logger.warn(
                `Cannot generate fee record: class ${classId} not found for student ${studentId}`,
            );
            return;
        }

        const structure = await this.prisma.feeStructure.findUnique({
            where: {
                gradeLevel_academicYearId: {
                    gradeLevel: classRecord.gradeLevel,
                    academicYearId,
                },
            },
        });

        if (!structure) {
            this.logger.warn(
                `No fee structure for grade ${classRecord.gradeLevel} in academic year ` +
                    `${academicYearId}; skipping fee record for student ${studentId}`,
            );
            return;
        }

        try {
            await this.prisma.feeRecord.create({
                data: {
                    studentId,
                    academicYearId,
                    feeStructureId: structure.id,
                    totalAmount: structure.totalAmount,
                    status: FeeRecordStatus.PENDING,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                return;
            }
            throw error;
        }
    }

    public async backfill(dto: BackfillFeesDto): Promise<BackfillResult> {
        const academicYearId = await this.resolveAcademicYearId(dto.academicYearId);

        const enrollments = await this.prisma.studentEnrollment.findMany({
            where: {
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
            },
            include: {
                class: { select: { gradeLevel: true } },
            },
        });

        let created = 0;
        let skipped = 0;

        for (const enrollment of enrollments) {
            const existingRecord = await this.prisma.feeRecord.findUnique({
                where: {
                    studentId_academicYearId: {
                        studentId: enrollment.studentId,
                        academicYearId,
                    },
                },
                select: { id: true },
            });

            if (existingRecord) {
                continue;
            }

            const structure = await this.prisma.feeStructure.findUnique({
                where: {
                    gradeLevel_academicYearId: {
                        gradeLevel: enrollment.class.gradeLevel,
                        academicYearId,
                    },
                },
                select: { id: true },
            });

            if (!structure) {
                skipped++;
                continue;
            }

            await this.generateFeeRecordForStudent(
                enrollment.studentId,
                enrollment.classId,
                academicYearId,
            );
            created++;
        }

        return { created, skipped };
    }

    // ─── Fee Records ─────────────────────────────────────────────────────────────

    public async findAllRecords(
        dto: ListFeeRecordsDto,
        requestingUser: JwtPayload,
    ): Promise<FeeRecordBasic[]> {
        const academicYearId = await this.resolveAcademicYearId(dto.academicYearId);

        const where: Prisma.FeeRecordWhereInput = {
            academicYearId,
            ...(dto.status !== undefined && { status: dto.status }),
        };

        if (requestingUser.role === Role.STUDENT) {
            const studentId = await this.resolveStudentProfileId(requestingUser.sub);
            where.studentId = studentId;
        } else if (requestingUser.role === Role.TEACHER) {
            this.assertTeacherHasFeesPermission(requestingUser);

            const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);
            const teacherClassIds = await this.getTeacherClassIds(teacherProfileId);

            const classFilter =
                dto.classId !== undefined
                    ? teacherClassIds.includes(dto.classId)
                        ? [dto.classId]
                        : []
                    : teacherClassIds;

            where.student = {
                enrollments: {
                    some: {
                        academicYearId,
                        status: EnrollmentStatus.ACTIVE,
                        classId: { in: classFilter },
                    },
                },
            };
        } else if (dto.classId !== undefined) {
            where.student = {
                enrollments: {
                    some: {
                        academicYearId,
                        status: EnrollmentStatus.ACTIVE,
                        classId: dto.classId,
                    },
                },
            };
        }

        const records = await this.prisma.feeRecord.findMany({
            where,
            include: FEE_RECORD_INCLUDE,
            orderBy: { createdAt: "desc" },
        });

        return this.attachAmountPaid(records);
    }

    public async findOneRecord(
        id: string,
        requestingUser: JwtPayload,
    ): Promise<FeeRecordWithPayments> {
        const record = await this.assertFeeRecordExists(id);

        await this.assertCanAccessRecord(record, requestingUser);

        const payments = await this.prisma.feePayment.findMany({
            where: { feeRecordId: id },
            include: FEE_PAYMENT_INCLUDE,
            orderBy: { paidOn: "asc" },
        });

        return { ...record, payments };
    }

    public async recordPayment(
        feeRecordId: string,
        dto: RecordPaymentDto,
        requestingUser: JwtPayload,
    ): Promise<FeeRecordBasic> {
        await this.assertFeeRecordExists(feeRecordId);

        this.assertTeacherHasFeesPermission(requestingUser);

        await this.prisma.feePayment.create({
            data: {
                feeRecordId,
                amount: dto.amount,
                paidOn: new Date(dto.paidOn),
                note: dto.note ?? null,
                recordedById: requestingUser.sub,
            },
        });

        await this.recalculateAndUpdateStatus(feeRecordId);

        return this.assertFeeRecordExists(feeRecordId);
    }

    public async listPayments(
        feeRecordId: string,
        requestingUser: JwtPayload,
    ): Promise<FeePaymentBasic[]> {
        const record = await this.assertFeeRecordExists(feeRecordId);

        await this.assertCanAccessRecord(record, requestingUser);

        return this.prisma.feePayment.findMany({
            where: { feeRecordId },
            include: FEE_PAYMENT_INCLUDE,
            orderBy: { paidOn: "asc" },
        });
    }

    public async getStudentFeeHistory(
        studentId: string,
        requestingUser: JwtPayload,
    ): Promise<FeeRecordBasic[]> {
        if (requestingUser.role === Role.STUDENT) {
            const ownStudentId = await this.resolveStudentProfileId(requestingUser.sub);
            if (ownStudentId !== studentId) {
                throw new ForbiddenException(ERROR_FEE_FORBIDDEN_SCOPE);
            }
        } else if (requestingUser.role === Role.TEACHER) {
            this.assertTeacherHasFeesPermission(requestingUser);
            const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);
            await this.assertTeacherHasAccessToStudent(teacherProfileId, studentId);
        }

        const records = await this.prisma.feeRecord.findMany({
            where: { studentId },
            include: FEE_RECORD_INCLUDE,
            orderBy: { academicYear: { startDate: "desc" } },
        });

        return this.attachAmountPaid(records);
    }

    private async assertCanAccessRecord(
        record: FeeRecordBasic,
        requestingUser: JwtPayload,
    ): Promise<void> {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        if (requestingUser.role === Role.STUDENT) {
            const studentId = await this.resolveStudentProfileId(requestingUser.sub);
            if (record.studentId !== studentId) {
                throw new ForbiddenException(ERROR_FEE_FORBIDDEN_SCOPE);
            }
            return;
        }

        this.assertTeacherHasFeesPermission(requestingUser);
        const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);
        await this.assertTeacherHasAccessToStudent(teacherProfileId, record.studentId);
    }
}
