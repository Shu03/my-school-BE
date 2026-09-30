import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EnrollmentStatus, ExamStatus, Prisma, Role } from "@prisma/client";

import {
    ERROR_EXAM_DISCARDED,
    ERROR_EXAM_DUPLICATE_SUBJECT,
    ERROR_EXAM_EMPTY_UPDATE,
    ERROR_EXAM_FINALIZED,
    ERROR_EXAM_FORBIDDEN_SCOPE,
    ERROR_EXAM_NO_SUBJECTS,
    ERROR_EXAM_NOT_FOUND,
    ERROR_EXAM_SUBJECT_ALREADY_EXISTS,
    ERROR_EXAM_SUBJECT_EMPTY_UPDATE,
    ERROR_EXAM_SUBJECT_GRADE_MISMATCH,
    ERROR_EXAM_SUBJECT_NOT_FOUND,
    ERROR_EXAM_TERM_NOT_FOUND,
    ERROR_EXAM_TERM_YEAR_MISMATCH,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";
import { AccessPolicyService } from "@modules/request-access";

import { AddExamSubjectDto } from "./dto/add-exam-subject.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { ExamSubjectInputDto } from "./dto/exam-subject-input.dto";
import { ListExamsDto } from "./dto/list-exams.dto";
import { UpdateExamSubjectDto } from "./dto/update-exam-subject.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { ExamBasic, ExamSubjectBasic, ExamSubjectSummary, ExamWithSummary } from "./exams.types";

const EXAM_INCLUDE = {
    section: true,
    academicYear: true,
    examSubjects: {
        include: { subject: true },
        orderBy: { date: "asc" },
    },
} satisfies Prisma.ExamInclude;

@Injectable()
export class ExamsService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
        private readonly accessPolicy: AccessPolicyService,
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

    public async getExamSubjectOrThrow(
        examId: string,
        subjectId: string,
    ): Promise<ExamSubjectBasic> {
        const examSubject = await this.prismaService.examSubject.findUnique({
            where: { examId_subjectId: { examId, subjectId } },
            include: { subject: true },
        });

        if (!examSubject) {
            throw new NotFoundException(ERROR_EXAM_SUBJECT_NOT_FOUND);
        }

        return examSubject;
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
            throw new BadRequestException(ERROR_EXAM_SUBJECT_GRADE_MISMATCH);
        }
    }

    private assertNoDuplicateSubjects(subjectIds: string[]): void {
        if (subjectIds.length === 0) {
            throw new BadRequestException(ERROR_EXAM_NO_SUBJECTS);
        }

        if (new Set(subjectIds).size !== subjectIds.length) {
            throw new BadRequestException(ERROR_EXAM_DUPLICATE_SUBJECT);
        }
    }

    private async assertSubjectsMatchClassGrade(
        subjects: ExamSubjectInputDto[],
        sectionId: string,
    ): Promise<void> {
        for (const subject of subjects) {
            await this.assertSubjectMatchesClassGrade(subject.subjectId, sectionId);
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

    public async create(dto: CreateExamDto): Promise<ExamBasic> {
        this.assertNoDuplicateSubjects(dto.subjects.map((subject) => subject.subjectId));
        await this.assertSubjectsMatchClassGrade(dto.subjects, dto.sectionId);

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
                sectionId: dto.sectionId,
                academicYearId,
                ...(dto.termId !== undefined && { termId: dto.termId }),
                examSubjects: {
                    create: dto.subjects.map((subject) => ({
                        subjectId: subject.subjectId,
                        totalMarks: subject.totalMarks,
                        date: new Date(subject.date),
                    })),
                },
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
            ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
            ...(dto.subjectId !== undefined && {
                examSubjects: { some: { subjectId: dto.subjectId } },
            }),
            ...(dto.type !== undefined && { type: dto.type }),
        };

        if (requestingUser.role === Role.TEACHER) {
            where.section = this.accessPolicy.buildSectionScope(requestingUser.sub);
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

        const [data, total] = await this.prismaService.$transaction([
            this.prismaService.exam.findMany({
                where,
                include: EXAM_INCLUDE,
                orderBy: { createdAt: "desc" },
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
            const canView = await this.accessPolicy.canViewSection(
                requestingUser.sub,
                exam.sectionId,
            );

            if (!canView) {
                throw new ForbiddenException(ERROR_EXAM_FORBIDDEN_SCOPE);
            }
        } else if (requestingUser.role === Role.STUDENT) {
            const enrollment = await this.prismaService.studentEnrollment.findFirst({
                where: {
                    sectionId: exam.sectionId,
                    academicYearId: exam.academicYearId,
                    status: EnrollmentStatus.ACTIVE,
                    student: { userId: requestingUser.sub },
                },
                select: { id: true },
            });

            if (!enrollment) {
                throw new ForbiddenException(ERROR_EXAM_FORBIDDEN_SCOPE);
            }
        }

        const examSubjectIds = exam.examSubjects.map((examSubject) => examSubject.id);

        const aggregates =
            examSubjectIds.length > 0
                ? await this.prismaService.grade.groupBy({
                      by: ["examSubjectId"],
                      where: { examSubjectId: { in: examSubjectIds } },
                      _count: { _all: true },
                      _avg: { marksObtained: true },
                  })
                : [];

        const aggregateByExamSubject = new Map(
            aggregates.map((aggregate) => [aggregate.examSubjectId, aggregate]),
        );

        const subjectSummaries: ExamSubjectSummary[] = exam.examSubjects.map((examSubject) => {
            const aggregate = aggregateByExamSubject.get(examSubject.id);

            return {
                examSubjectId: examSubject.id,
                subjectId: examSubject.subjectId,
                subjectName: examSubject.subject.name,
                totalMarks: examSubject.totalMarks,
                date: examSubject.date,
                gradeCount: aggregate?._count._all ?? 0,
                averageMarks: aggregate?._avg.marksObtained ?? null,
            };
        });

        return { ...exam, subjectSummaries };
    }

    public async update(id: string, dto: UpdateExamDto): Promise<ExamBasic> {
        if (dto.name === undefined && dto.type === undefined && dto.termId === undefined) {
            throw new BadRequestException(ERROR_EXAM_EMPTY_UPDATE);
        }

        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);
        this.assertExamNotDiscarded(exam);

        if (dto.termId !== undefined) {
            await this.assertTermBelongsToYear(dto.termId, exam.academicYearId);
        }

        return this.prismaService.exam.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.termId !== undefined && { termId: dto.termId }),
            },
            include: EXAM_INCLUDE,
        });
    }

    public async addSubject(id: string, dto: AddExamSubjectDto): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);
        this.assertExamNotDiscarded(exam);

        if (exam.examSubjects.some((examSubject) => examSubject.subjectId === dto.subjectId)) {
            throw new BadRequestException(ERROR_EXAM_SUBJECT_ALREADY_EXISTS);
        }

        await this.assertSubjectMatchesClassGrade(dto.subjectId, exam.sectionId);

        await this.prismaService.examSubject.create({
            data: {
                examId: id,
                subjectId: dto.subjectId,
                totalMarks: dto.totalMarks,
                date: new Date(dto.date),
            },
        });

        return this.getByIdOrThrow(id);
    }

    public async updateSubject(
        id: string,
        subjectId: string,
        dto: UpdateExamSubjectDto,
    ): Promise<ExamBasic> {
        if (dto.totalMarks === undefined && dto.date === undefined) {
            throw new BadRequestException(ERROR_EXAM_SUBJECT_EMPTY_UPDATE);
        }

        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);
        this.assertExamNotDiscarded(exam);
        await this.getExamSubjectOrThrow(id, subjectId);

        await this.prismaService.examSubject.update({
            where: { examId_subjectId: { examId: id, subjectId } },
            data: {
                ...(dto.totalMarks !== undefined && { totalMarks: dto.totalMarks }),
                ...(dto.date !== undefined && { date: new Date(dto.date) }),
            },
        });

        return this.getByIdOrThrow(id);
    }

    public async removeSubject(id: string, subjectId: string): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotFinalized(exam);
        this.assertExamNotDiscarded(exam);
        await this.getExamSubjectOrThrow(id, subjectId);

        if (exam.examSubjects.length <= 1) {
            throw new BadRequestException(ERROR_EXAM_NO_SUBJECTS);
        }

        await this.prismaService.examSubject.delete({
            where: { examId_subjectId: { examId: id, subjectId } },
        });

        return this.getByIdOrThrow(id);
    }

    public async finalize(id: string): Promise<ExamBasic> {
        const exam = await this.assertExamExists(id);
        this.assertExamNotDiscarded(exam);
        this.assertExamNotFinalized(exam);

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
