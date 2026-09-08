import { Prisma } from "@prisma/client";

export type ExamBasic = Prisma.ExamGetPayload<{
    include: {
        section: true;
        academicYear: true;
        examSubjects: {
            include: {
                subject: true;
            };
        };
    };
}>;

export type ExamSubjectBasic = Prisma.ExamSubjectGetPayload<{
    include: {
        subject: true;
    };
}>;

export interface ExamSubjectSummary {
    examSubjectId: string;
    subjectId: string;
    subjectName: string;
    totalMarks: number;
    date: Date;
    gradeCount: number;
    averageMarks: number | null;
}

export type ExamWithSummary = ExamBasic & {
    subjectSummaries: ExamSubjectSummary[];
};
