import { Prisma } from "@prisma/client";

export type ExamBasic = Prisma.ExamGetPayload<{
    include: {
        class: true;
        subject: true;
        academicYear: true;
    };
}>;

export type ExamWithSummary = ExamBasic & {
    gradeCount: number;
    averageMarks: number | null;
};
