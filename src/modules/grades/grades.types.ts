import { Prisma } from "@prisma/client";

export type GradeBasic = Prisma.GradeGetPayload<{
    include: {
        student: {
            include: {
                user: {
                    omit: {
                        password: true;
                    };
                };
            };
        };
    };
}>;

export type GradeWithExamSubject = Prisma.GradeGetPayload<{
    include: {
        examSubject: {
            include: {
                subject: true;
                exam: true;
            };
        };
    };
}>;

export interface ExamGradeStudentSummary {
    studentId: string;
    name: string;
    marksObtained: number;
    percentage: number;
}

export interface ExamGradesSummary {
    examId: string;
    examName: string;
    subjectId: string;
    subjectName: string;
    totalMarks: number;
    classAverage: number | null;
    highest: number | null;
    lowest: number | null;
    students: ExamGradeStudentSummary[];
}

export interface StudentGradeHistoryEntry {
    examId: string;
    examName: string;
    subjectId: string;
    subjectName: string;
    type: string;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
    date: Date;
}

export interface StudentGradeHistory {
    studentId: string;
    exams: StudentGradeHistoryEntry[];
}

export interface BulkGradeResult {
    entered: number;
    examId: string;
    subjectId: string;
}
