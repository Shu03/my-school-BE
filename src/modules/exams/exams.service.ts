import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EnrollmentStatus, ExamStatus, Prisma, Role, TeacherClassRole } from "@prisma/client";

import {
    ERROR_EXAM_DISCARDED,
    ERROR_EXAM_EMPTY_UPDATE,
    ERROR_EXAM_FINALIZED,
    ERROR_EXAM_INSUFFICIENT_PERMISSIONS,
    ERROR_EXAM_NOT_CLASS_TEACHER,
    ERROR_EXAM_NOT_CREATOR,
    ERROR_EXAM_NOT_FOUND,
    ERROR_EXAM_SUBJECT_GRADE_MISMATCH,
    ERROR_EXAM_TEACHER_PROFILE_NOT_FOUND,
    ERROR_EXAM_TERM_NOT_FOUND,
    ERROR_EXAM_TERM_YEAR_MISMATCH,
    PERMISSION_GRADES_READ,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateExamDto } from "./dto/create-exam.dto";
import { ListExamsDto } from "./dto/list-exams.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { ExamBasic, ExamWithSummary } from "./exams.types";

const EXAM_INCLUDE = {
    class: true,
    subject: true,
    academicYear: true,
} satisfies Prisma.ExamInclude;

@Injectable()
export class ExamsService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    private async assertExamExists(id: string): Promise<ExamBasic> {
        return this.getByIdOrThrow(id);
    }

    public async getByIdOrThrow(id: string): Promise<ExamBasic> {
        const exam = await this.prismaService.exam.findUnique({
            where: { id },
            include: EXAM_INCLUDE,
        });

        if (!exam) {
            throw new NotFoundException(ERROR_EXAM_NOT_FOUND);
        }

        return exam;
    }

    private assertExamNotFinalized(exam: ExamBasic): void {
        if (exam.isFinalized) {
            throw new BadRequestException(ERROR_EXAM_FINALIZED);
        }
    }

    private assertExamNotDiscarded(exam: ExamBasic): void {
        if (exam.status === ExamStatus.DISCARDED) {
            throw new BadRequestException(ERROR_EXAM_DISCARDED);
        }
    }

    private async assertCanFinalize(exam: ExamBasic, requestingUser: JwtPayload): Promise<void> {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);

        if (exam.createdById !== teacherProfileId) {
            throw new ForbiddenException(ERROR_EXAM_NOT_CREATOR);
        }
    }

    private async resolveTeacherProfileId(userId: string): Promise<string> {
        const profile = await this.prismaService.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_EXAM_TEACHER_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async assertIsClassTeacherOfClass(classId: string, userId: string): Promise<void> {
        const assignment = await this.prismaService.teacherClassAssignment.findFirst({
            where: {
                classId,
                role: TeacherClassRole.CLASS_TEACHER,
                teacher: { userId },
            },
            select: { id: true },
        });

        if (!assignment) {
            throw new ForbiddenException(ERROR_EXAM_NOT_CLASS_TEACHER);
        }
    }

    private async assertSubjectMatchesClassGrade(
        subjectId: string,
        classId: string,
    ): Promise<void> {
        const [subject, classRecord] = await Promise.all([
            this.prismaService.subject.findUnique({
                where: { id: subjectId },
                select: { gradeLevel: true },
            }),
            this.prismaService.class.findUnique({
                where: { id: classId },
                select: { gradeLevel: true },
            }),
        ]);

        if (!subject) {
            throw new NotFoundException("Subject not found");
        }

        if (!classRecord) {
            throw new NotFoundException("Class not found");
        }

        if (subject.gradeLevel !== classRecord.gradeLevel) {
            throw new BadRequestException(ERROR_EXAM_SUBJECT_GRADE_MISMATCH);
        }
    }

    private async assertTermBelongsToYear(termId: string, academicYearId: string): Promise<void> {
        const term = await this.prismaService.term.findUnique({
            where: { id: termId },
            select: { academicYearId: true },
        });

        if (!term) {
            throw new NotFoundException(ERROR_EXAM_TERM_NOT_FOUND);
        }

        if (term.academicYearId !== academicYearId) {
            throw new BadRequestException(ERROR_EXAM_TERM_YEAR_MISMATCH);
        }
    }

    public async create(dto: CreateExamDto, requestingUser: JwtPayload): Promise<ExamBasic> {
        let createdById: string | null = null;

        if (requestingUser.role === Role.TEACHER) {
            createdById = await this.resolveTeacherProfileId(requestingUser.sub);
            await this.assertIsClassTeacherOfClass(dto.classId, requestingUser.sub);
        }

        await this.assertSubjectMatchesClassGrade(dto.subjectId, dto.classId);

        let academicYearId = dto.academicYearId;

        if (academicYearId === undefined) {
            const currentYear = await this.academicYearsService.findCurrent();
            academicYearId = currentYear.id;
        }

        if (dto.termId !== undefined) {
            await this.assertTermBelongsToYear(dto.termId, academicYearId);
        }

        return this.prismaService.exam.create({
            data: {
                name: dto.name,
                type: dto.type,
                classId: dto.classId,
                subjectId: dto.subjectId,
                academicYearId,
                totalMarks: dto.totalMarks,
                date: new Date(dto.date),
                createdById,
                ...(dto.termId !== undefined && { termId: dto.termId }),
            },
            include: EXAM_INCLUDE,
        });
    }

    public async findAll(
        dto: ListExamsDto,
        requestingUser: JwtPayload,
    ): Promise<{ data: ExamBasic[]; total: number; page: number; limit: number }> {
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;

        let academicYearId = dto.academicYearId;

        if (academicYearId === undefined) {
            const currentYear = await this.academicYearsService.findCurrent();
            academicYearId = currentYear.id;
        }

        const where: Prisma.ExamWhereInput = {
            academicYearId,
            status: dto.status ?? ExamStatus.ACTIVE,
            ...(dto.classId !== undefined && { classId: dto.classId }),
            ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
            ...(dto.type !== undefined && { type: dto.type }),
        };

        if (requestingUser.role === Role.TEACHER) {
            if (!requestingUser.permissions.includes(PERMISSION_GRADES_READ)) {
                throw new ForbiddenException(ERROR_EXAM_INSUFFICIENT_PERMISSIONS);
            }

            where.class = {
                teacherAssignments: {
                    some: { teacher: { userId: requestingUser.sub } },
                },
            };
        } else if (requestingUser.role === Role.STUDENT) {
            where.class = {
                enrollments: {
                    some: {
                        academicYearId,
                        status: EnrollmentStatus.ACTIVE,
                        student: { userId: requestingUser.sub },
                    },
                },
            };
        }

        const [data, total] = await this.prismaService.$transaction([
            this.prismaService.exam.findMany({
                where,
                include: EXAM_INCLUDE,
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prismaService.exam.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async findOne(id: string, requestingUser: JwtPayload): Promise<ExamWithSummary> {
        const exam = await this.assertExamExists(id);

        if (requestingUser.role === Role.TEACHER) {
            if (!requestingUser.permissions.includes(PERMISSION_GRADES_READ)) {
                throw new ForbiddenException(ERROR_EXAM_INSUFFICIENT_PERMISSIONS);
            }

            const assignment = await this.prismaService.teacherClassAssignment.findFirst({
                where: {
                    classId: exam.classId,
                    teacher: { userId: requestingUser.sub },
                },
                select: { id: true },
            });

            if (!assignment) {
                throw new ForbiddenException(ERROR_EXAM_NOT_CREATOR);
            }
        } else if (requestingUser.role === Role.STUDENT) {
            const enrollment = await this.prismaService.studentEnrollment.findFirst({
                where: {
                    classId: exam.classId,
                    academicYearId: exam.academicYearId,
                    status: EnrollmentStatus.ACTIVE,
                    student: { userId: requestingUser.sub },
                },
                select: { id: true },
            });

            if (!enrollment) {
                throw new ForbiddenException(ERROR_EXAM_NOT_CREATOR);
            }
        }

        const summary = await this.prismaService.grade.aggregate({
            where: { examId: id },
            _count: { _all: true },
            _avg: { marksObtained: true },
        });

        return {
            ...exam,
            gradeCount: summary._count._all,
            averageMarks: summary._avg.marksObtained,
        };
    }

    public async update(
        id: string,
        dto: UpdateExamDto,
        requestingUser: JwtPayload,
    ): Promise<ExamBasic> {
        if (
            dto.name === undefined &&
            dto.type === undefined &&
            dto.totalMarks === undefined &&
            dto.date === undefined &&
            dto.termId === undefined
        ) {
            throw new BadRequestException(ERROR_EXAM_EMPTY_UPDATE);
        }

        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);
        this.assertExamNotDiscarded(exam);

        if (requestingUser.role === Role.TEACHER) {
            const teacherProfileId = await this.resolveTeacherProfileId(requestingUser.sub);

            if (exam.createdById !== teacherProfileId) {
                throw new ForbiddenException(ERROR_EXAM_NOT_CREATOR);
            }
        }

        if (dto.termId !== undefined) {
            await this.assertTermBelongsToYear(dto.termId, exam.academicYearId);
        }

        return this.prismaService.exam.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
                ...(dto.date !== undefined && { date: new Date(dto.date) }),
                ...(dto.termId !== undefined && { termId: dto.termId }),
            },
            include: EXAM_INCLUDE,
        });
    }

    public async finalize(id: string, requestingUser: JwtPayload): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotDiscarded(exam);
        this.assertExamNotFinalized(exam);
        await this.assertCanFinalize(exam, requestingUser);

        return this.prismaService.exam.update({
            where: { id },
            data: { isFinalized: true },
            include: EXAM_INCLUDE,
        });
    }

    public async unlock(id: string): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotDiscarded(exam);

        return this.prismaService.exam.update({
            where: { id },
            data: { isFinalized: false },
            include: EXAM_INCLUDE,
        });
    }

    public async discard(id: string): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);

        return this.prismaService.exam.update({
            where: { id },
            data: { status: ExamStatus.DISCARDED },
            include: EXAM_INCLUDE,
        });
    }
}
