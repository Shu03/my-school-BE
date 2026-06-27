import { Prisma } from "@prisma/client";

export type AttendanceRecord = Prisma.AttendanceGetPayload<{
    include: {
        student: {
            include: {
                user: {
                    omit: { password: true };
                };
            };
        };
    };
}>;

export type AttendanceSummaryItem = {
    studentId: string;
    firstName: string;
    lastName: string;
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
};

export type BulkMarkResult = {
    marked: number;
    date: string;
    classId: string;
};
