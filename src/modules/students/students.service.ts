import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EnrollmentStatus, Prisma, Role } from "@prisma/client";

import { ROLL_NUMBER_PAD_WIDTH } from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years";
import { ClassesService } from "@modules/classes";
import { PrismaService } from "@modules/prisma";

import {
    EnrollStudentDto,
    ListStudentsDto,
    PromoteStudentsDto,
    UpdateEnrollmentDto,
    UpdateStudentDto,
} from "./dto";
import {
    EnrollmentBasic,
    PromotionResult,
    StudentBasic,
    StudentWithEnrollment,
} from "./students.types";

@Injectable()
export class StudentsService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
        private readonly classesService: ClassesService,
    ) {}

    // ─── Private Helpers ─────────────────────────────────────────────────────────

    private async assertStudentExists(id: string): Promise<StudentBasic> {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id },
            include: {
                user: {
                    omit: { password: true },
                },
            },
        });

        if (!student) {
            throw new NotFoundException("Student not found");
        }

        return student;
    }

    private async assertEnrollmentExists(
        studentId: string,
        enrollmentId: string,
    ): Promise<EnrollmentBasic> {
        const enrollment = await this.prisma.studentEnrollment.findFirst({
            where: { id: enrollmentId, studentId },
            include: {
                class: true,
                academicYear: true,
            },
        });

        if (!enrollment) {
            throw new NotFoundException("Enrollment not found");
        }

        return enrollment;
    }

    private async generateRollNumber(classId: string, academicYearId: string): Promise<string> {
        const count = await this.prisma.studentEnrollment.count({
            where: {
                classId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        return String(count + 1).padStart(ROLL_NUMBER_PAD_WIDTH, "0");
    }

    private async assertTeacherHasAccessToStudent(
        teacherUserId: string,
        studentId: string,
    ): Promise<void> {
        const teacherProfile = await this.prisma.teacherProfile.findUnique({
            where: { userId: teacherUserId },
            select: {
                classAssignments: { select: { classId: true } },
                classesAsTeacher: { select: { id: true } },
            },
        });

        if (!teacherProfile) {
            throw new ForbiddenException("Teacher profile not found");
        }

        const teacherClassIds = new Set([
            ...teacherProfile.classAssignments.map((a) => a.classId),
            ...teacherProfile.classesAsTeacher.map((c) => c.id),
        ]);

        const studentEnrollment = await this.prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                status: EnrollmentStatus.ACTIVE,
                classId: { in: [...teacherClassIds] },
            },
        });

        if (!studentEnrollment) {
            throw new ForbiddenException("You do not have access to this student");
        }
    }

    // ─── Public Methods ──────────────────────────────────────────────────────────

    public async findAll(
        dto: ListStudentsDto,
        requestingUserId: string,
        requestingUserRole: Role,
    ): Promise<{ data: StudentBasic[]; total: number; page: number; limit: number }> {
        const { search, page = 1, limit = 20 } = dto;

        let academicYearId = dto.academicYearId;
        if (academicYearId === undefined) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        let where: Prisma.StudentProfileWhereInput = {};

        if (requestingUserRole === Role.STUDENT) {
            where = { userId: requestingUserId };
        } else if (requestingUserRole === Role.TEACHER) {
            const teacherProfile = await this.prisma.teacherProfile.findUnique({
                where: { userId: requestingUserId },
                select: {
                    classAssignments: { select: { classId: true } },
                    classesAsTeacher: { select: { id: true } },
                },
            });

            const teacherClassIds = [
                ...(teacherProfile?.classAssignments.map((a) => a.classId) ?? []),
                ...(teacherProfile?.classesAsTeacher.map((c) => c.id) ?? []),
            ];

            const classFilter = dto.classId
                ? teacherClassIds.includes(dto.classId)
                    ? [dto.classId]
                    : []
                : teacherClassIds;

            where = {
                enrollments: {
                    some: {
                        academicYearId,
                        classId: { in: classFilter },
                        status: EnrollmentStatus.ACTIVE,
                    },
                },
            };
        } else {
            // ADMIN
            where = {
                ...(dto.classId !== undefined && {
                    enrollments: {
                        some: {
                            academicYearId,
                            classId: dto.classId,
                            status: EnrollmentStatus.ACTIVE,
                        },
                    },
                }),
            };
        }

        if (search !== undefined) {
            const searchCondition: Prisma.StudentProfileWhereInput = {
                OR: [
                    {
                        user: {
                            firstName: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    },
                    {
                        user: {
                            lastName: {
                                contains: search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        },
                    },
                    {
                        admissionNumber: {
                            contains: search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            };
            where = { AND: [where, searchCondition] };
        }

        const [data, total] = await this.prisma.$transaction([
            this.prisma.studentProfile.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        omit: { password: true },
                    },
                },
                orderBy: {
                    user: { firstName: "asc" },
                },
            }),
            this.prisma.studentProfile.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async findOne(
        id: string,
        requestingUserId: string,
        requestingUserRole: Role,
    ): Promise<StudentWithEnrollment> {
        const student = await this.prisma.studentProfile.findUnique({
            where: { id },
            include: {
                user: {
                    omit: { password: true },
                },
                enrollments: {
                    include: {
                        class: true,
                        academicYear: true,
                    },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!student) {
            throw new NotFoundException("Student not found");
        }

        if (requestingUserRole === Role.STUDENT && student.userId !== requestingUserId) {
            throw new ForbiddenException("You can only view your own profile");
        }

        if (requestingUserRole === Role.TEACHER) {
            await this.assertTeacherHasAccessToStudent(requestingUserId, id);
        }

        return student;
    }

    public async update(id: string, dto: UpdateStudentDto): Promise<StudentBasic> {
        if (dto.dateOfBirth === undefined && dto.admissionNumber === undefined) {
            throw new BadRequestException(
                "At least one field must be provided: dateOfBirth, admissionNumber",
            );
        }

        await this.assertStudentExists(id);

        return this.prisma.studentProfile.update({
            where: { id },
            data: {
                ...(dto.dateOfBirth !== undefined && {
                    dateOfBirth: new Date(dto.dateOfBirth),
                }),
                ...(dto.admissionNumber !== undefined && {
                    admissionNumber: dto.admissionNumber,
                }),
            },
            include: {
                user: {
                    omit: { password: true },
                },
            },
        });
    }

    public async enroll(studentId: string, dto: EnrollStudentDto): Promise<EnrollmentBasic> {
        await this.assertStudentExists(studentId);

        let academicYearId = dto.academicYearId;
        if (academicYearId === undefined) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        const targetClass = await this.classesService.findOne(dto.classId);
        if (targetClass.academicYearId !== academicYearId) {
            throw new BadRequestException("Class does not belong to the specified academic year");
        }

        const rollNumber =
            dto.rollNumber ?? (await this.generateRollNumber(dto.classId, academicYearId));

        try {
            return await this.prisma.studentEnrollment.create({
                data: {
                    studentId,
                    classId: dto.classId,
                    academicYearId,
                    rollNumber,
                },
                include: {
                    class: true,
                    academicYear: true,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Student is already enrolled in this academic year");
            }
            throw error;
        }
    }

    public async findEnrollments(
        studentId: string,
        requestingUserId: string,
        requestingUserRole: Role,
    ): Promise<EnrollmentBasic[]> {
        const student = await this.assertStudentExists(studentId);

        if (requestingUserRole === Role.STUDENT && student.userId !== requestingUserId) {
            throw new ForbiddenException("You can only view your own enrollments");
        }

        return this.prisma.studentEnrollment.findMany({
            where: { studentId },
            include: {
                class: true,
                academicYear: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    public async updateEnrollment(
        studentId: string,
        enrollmentId: string,
        dto: UpdateEnrollmentDto,
    ): Promise<EnrollmentBasic> {
        if (dto.status === undefined && dto.rollNumber === undefined) {
            throw new BadRequestException(
                "At least one field must be provided: status, rollNumber",
            );
        }

        await this.assertEnrollmentExists(studentId, enrollmentId);

        return this.prisma.studentEnrollment.update({
            where: { id: enrollmentId },
            data: {
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.rollNumber !== undefined && { rollNumber: dto.rollNumber }),
            },
            include: {
                class: true,
                academicYear: true,
            },
        });
    }

    public async promote(dto: PromoteStudentsDto): Promise<PromotionResult> {
        let academicYearId = dto.academicYearId;
        if (academicYearId === undefined) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        const targetClass = await this.classesService.findOne(dto.targetClassId);
        if (targetClass.academicYearId !== academicYearId) {
            throw new BadRequestException(
                "Target class does not belong to the specified academic year",
            );
        }

        const existingCount = await this.prisma.studentEnrollment.count({
            where: {
                classId: dto.targetClassId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        const skipped: PromotionResult["skipped"] = [];
        let promoted = 0;
        let rollCounter = existingCount;

        for (const studentId of dto.studentIds) {
            const student = await this.prisma.studentProfile.findUnique({
                where: { id: studentId },
            });

            if (!student) {
                skipped.push({ studentId, reason: "Student not found" });
                continue;
            }

            const existingEnrollment = await this.prisma.studentEnrollment.findUnique({
                where: {
                    studentId_academicYearId: {
                        studentId,
                        academicYearId,
                    },
                },
            });

            if (existingEnrollment) {
                skipped.push({
                    studentId,
                    reason: "Already enrolled in the target academic year",
                });
                continue;
            }

            const previousEnrollment = await this.prisma.studentEnrollment.findFirst({
                where: { studentId, status: EnrollmentStatus.ACTIVE },
                orderBy: { createdAt: "desc" },
            });

            rollCounter++;
            const rollNumber = String(rollCounter).padStart(ROLL_NUMBER_PAD_WIDTH, "0");

            await this.prisma.$transaction(async (tx) => {
                if (previousEnrollment) {
                    await tx.studentEnrollment.update({
                        where: { id: previousEnrollment.id },
                        data: { status: EnrollmentStatus.PROMOTED },
                    });
                }

                await tx.studentEnrollment.create({
                    data: {
                        studentId,
                        classId: dto.targetClassId,
                        academicYearId,
                        rollNumber,
                    },
                });
            });

            promoted++;
        }

        return { promoted, skipped };
    }
}
