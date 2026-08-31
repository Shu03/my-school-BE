import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";

import { EnrollmentStatus, ExamStatus, Prisma, Role } from "@prisma/client";

import {
    ERROR_EXAM_DISCARDED,
    ERROR_EXAM_FINALIZED,
    ERROR_GRADE_FORBIDDEN_SCOPE,
    ERROR_GRADE_INSUFFICIENT_PERMISSIONS,
    ERROR_GRADE_MARKS_OUT_OF_RANGE,
    ERROR_GRADE_STUDENT_PROFILE_NOT_FOUND,
    ERROR_GRADE_STUDENTS_NOT_ENROLLED,
    ERROR_GRADE_TEACHER_NOT_ASSIGNED,
    ERROR_GRADE_TEACHER_PROFILE_NOT_FOUND,
    PERMISSION_GRADES_READ,
    PERMISSION_GRADES_WRITE,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { JwtPayload } from "@modules/auth";
import { ExamBasic, ExamsService } from "@modules/exams";
import { PrismaService } from "@modules/prisma/prisma.service";

import { BulkEnterGradesDto } from "./dto/bulk-enter-grades.dto";
import { GetStudentGradesDto } from "./dto/get-student-grades.dto";
import {
    BulkGradeResult,
    ExamGradesSummary,
    GradeBasic,
    StudentGradeHistory,
    StudentGradeHistoryEntry,
} from "./grades.types";

const GRADE_STUDENT_INCLUDE = {
    student: {
        include: {
            user: {
                omit: {
                    password: true,
                },
            },
        },
    },
} satisfies Prisma.GradeInclude;

@Injectable()
export class GradesService {
    public constructor(
        private readonly prismaService: PrismaService,
        private readonly examsService: ExamsService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    private async resolveTeacherProfileId(userId: string): Promise<string> {
        const profile = await this.prismaService.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_GRADE_TEACHER_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async resolveStudentProfileId(userId: string): Promise<string> {
        const profile = await this.prismaService.studentProfile.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!profile) {
            throw new ForbiddenException(ERROR_GRADE_STUDENT_PROFILE_NOT_FOUND);
        }

        return profile.id;
    }

    private async assertTeacherAssignedToExamSubject(
        userId: string,
        classId: string,
        subjectId: string,
    ): Promise<void> {
        const assignment = await this.prismaService.teacherClassAssignment.findFirst({
            where: {
                classId,
                teacher: { userId },
                OR: [{ subjectId }, { subjectId: null }],
            },
            select: { id: true },
        });

        if (!assignment) {
            throw new ForbiddenException(ERROR_GRADE_TEACHER_NOT_ASSIGNED);
        }
    }

    private assertMarksWithinRange(marks: number, totalMarks: number): void {
        if (marks < 0 || marks > totalMarks) {
            throw new BadRequestException(ERROR_GRADE_MARKS_OUT_OF_RANGE);
        }
    }

    private async assertStudentsEnrolledInExamClass(
        studentIds: string[],
        classId: string,
        academicYearId: string,
    ): Promise<void> {
        const enrollments = await this.prismaService.studentEnrollment.findMany({
            where: {
                classId,
                academicYearId,
                status: EnrollmentStatus.ACTIVE,
                studentId: { in: studentIds },
            },
            select: { studentId: true },
        });

        const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
        const invalidIds = studentIds.filter((studentId) => !enrolledIds.has(studentId));

        if (invalidIds.length > 0) {
            throw new BadRequestException(
                `${ERROR_GRADE_STUDENTS_NOT_ENROLLED}: ${invalidIds.join(", ")}`,
            );
        }
    }

    public async enterGrades(
        examId: string,
        subjectId: string,
        dto: BulkEnterGradesDto,
        requestingUser: JwtPayload,
    ): Promise<BulkGradeResult> {
        const exam = await this.examsService.getByIdOrThrow(examId);

        if (exam.isFinalized) {
            throw new BadRequestException(ERROR_EXAM_FINALIZED);
        }

        if (exam.status === ExamStatus.DISCARDED) {
            throw new BadRequestException(ERROR_EXAM_DISCARDED);
        }

        const examSubject = await this.examsService.getExamSubjectOrThrow(examId, subjectId);

        let gradedById: string | null = null;

        if (requestingUser.role === Role.TEACHER) {
            if (!requestingUser.permissions.includes(PERMISSION_GRADES_WRITE)) {
                throw new ForbiddenException(ERROR_GRADE_INSUFFICIENT_PERMISSIONS);
            }

            gradedById = await this.resolveTeacherProfileId(requestingUser.sub);
            await this.assertTeacherAssignedToExamSubject(
                requestingUser.sub,
                exam.classId,
                subjectId,
            );
        }

        for (const record of dto.records) {
            this.assertMarksWithinRange(record.marksObtained, examSubject.totalMarks);
        }

        const studentIds = dto.records.map((record) => record.studentId);
        await this.assertStudentsEnrolledInExamClass(studentIds, exam.classId, exam.academicYearId);

        await this.prismaService.$transaction([
            this.prismaService.grade.deleteMany({
                where: {
                    examSubjectId: examSubject.id,
                    studentId: { in: studentIds },
                },
            }),
            this.prismaService.grade.createMany({
                data: dto.records.map((record) => ({
                    examSubjectId: examSubject.id,
                    studentId: record.studentId,
                    marksObtained: record.marksObtained,
                    gradedById,
                    ...(record.remarks !== undefined && { remarks: record.remarks }),
                })),
            }),
        ]);

        return { entered: dto.records.length, examId, subjectId };
    }

    private async assertTeacherCanReadExamSubject(
        exam: ExamBasic,
        subjectId: string,
        requestingUser: JwtPayload,
    ): Promise<void> {
        if (!requestingUser.permissions.includes(PERMISSION_GRADES_READ)) {
            throw new ForbiddenException(ERROR_GRADE_INSUFFICIENT_PERMISSIONS);
        }

        await this.assertTeacherAssignedToExamSubject(requestingUser.sub, exam.classId, subjectId);
    }

    public async getExamSubjectGrades(
        examId: string,
        subjectId: string,
        requestingUser: JwtPayload,
    ): Promise<GradeBasic[]> {
        const exam = await this.examsService.getByIdOrThrow(examId);
        const examSubject = await this.examsService.getExamSubjectOrThrow(examId, subjectId);

        const where: Prisma.GradeWhereInput = { examSubjectId: examSubject.id };

        if (requestingUser.role === Role.TEACHER) {
            await this.assertTeacherCanReadExamSubject(exam, subjectId, requestingUser);
        } else if (requestingUser.role === Role.STUDENT) {
            const studentProfileId = await this.resolveStudentProfileId(requestingUser.sub);
            where.studentId = studentProfileId;
        }

        return this.prismaService.grade.findMany({
            where,
            include: GRADE_STUDENT_INCLUDE,
            orderBy: { marksObtained: "desc" },
        });
    }

    public async getExamSubjectSummary(
        examId: string,
        subjectId: string,
        requestingUser: JwtPayload,
    ): Promise<ExamGradesSummary> {
        const exam = await this.examsService.getByIdOrThrow(examId);
        const examSubject = await this.examsService.getExamSubjectOrThrow(examId, subjectId);

        if (requestingUser.role === Role.STUDENT) {
            throw new ForbiddenException(ERROR_GRADE_FORBIDDEN_SCOPE);
        }

        if (requestingUser.role === Role.TEACHER) {
            await this.assertTeacherCanReadExamSubject(exam, subjectId, requestingUser);
        }

        const grades = await this.prismaService.grade.findMany({
            where: { examSubjectId: examSubject.id },
            include: GRADE_STUDENT_INCLUDE,
            orderBy: { marksObtained: "desc" },
        });

        const students = grades.map((grade) => ({
            studentId: grade.studentId,
            name: `${grade.student.user.firstName} ${grade.student.user.lastName}`,
            marksObtained: grade.marksObtained,
            percentage: (grade.marksObtained / examSubject.totalMarks) * 100,
        }));

        let classAverage: number | null = null;
        let highest: number | null = null;
        let lowest: number | null = null;

        if (grades.length > 0) {
            const marks = grades.map((grade) => grade.marksObtained);
            classAverage = marks.reduce((sum, value) => sum + value, 0) / marks.length;
            highest = Math.max(...marks);
            lowest = Math.min(...marks);
        }

        return {
            examId: exam.id,
            examName: exam.name,
            subjectId: examSubject.subjectId,
            subjectName: examSubject.subject.name,
            totalMarks: examSubject.totalMarks,
            classAverage,
            highest,
            lowest,
            students,
        };
    }

    public async getStudentGradeHistory(
        studentId: string,
        dto: GetStudentGradesDto,
        requestingUser: JwtPayload,
    ): Promise<StudentGradeHistory> {
        let academicYearId = dto.academicYearId;

        if (academicYearId === undefined) {
            const currentYear = await this.academicYearsService.findCurrent();
            academicYearId = currentYear.id;
        }

        if (requestingUser.role === Role.STUDENT) {
            const studentProfileId = await this.resolveStudentProfileId(requestingUser.sub);

            if (studentProfileId !== studentId) {
                throw new ForbiddenException(ERROR_GRADE_FORBIDDEN_SCOPE);
            }
        } else if (requestingUser.role === Role.TEACHER) {
            if (!requestingUser.permissions.includes(PERMISSION_GRADES_READ)) {
                throw new ForbiddenException(ERROR_GRADE_INSUFFICIENT_PERMISSIONS);
            }

            const assignment = await this.prismaService.teacherClassAssignment.findFirst({
                where: {
                    teacher: { userId: requestingUser.sub },
                    class: {
                        enrollments: {
                            some: {
                                studentId,
                                academicYearId,
                                status: EnrollmentStatus.ACTIVE,
                            },
                        },
                    },
                },
                select: { id: true },
            });

            if (!assignment) {
                throw new ForbiddenException(ERROR_GRADE_FORBIDDEN_SCOPE);
            }
        }

        const grades = await this.prismaService.grade.findMany({
            where: {
                studentId,
                examSubject: {
                    exam: { academicYearId },
                    ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
                },
            },
            include: {
                examSubject: {
                    include: {
                        subject: true,
                        exam: true,
                    },
                },
            },
            orderBy: { examSubject: { date: "desc" } },
        });

        const exams: StudentGradeHistoryEntry[] = grades.map((grade) => ({
            examId: grade.examSubject.examId,
            examName: grade.examSubject.exam.name,
            subjectId: grade.examSubject.subjectId,
            subjectName: grade.examSubject.subject.name,
            type: grade.examSubject.exam.type,
            marksObtained: grade.marksObtained,
            totalMarks: grade.examSubject.totalMarks,
            percentage: (grade.marksObtained / grade.examSubject.totalMarks) * 100,
            date: grade.examSubject.date,
        }));

        return { studentId, exams };
    }
}
