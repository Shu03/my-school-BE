import { Prisma } from "@prisma/client";

export type StudentBasic = Prisma.StudentProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
    };
}>;

export type StudentWithEnrollment = Prisma.StudentProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
        enrollments: {
            include: {
                class: true;
                academicYear: true;
            };
        };
    };
}>;

export type EnrollmentBasic = Prisma.StudentEnrollmentGetPayload<{
    include: {
        class: true;
        academicYear: true;
    };
}>;

export type PromotionResult = {
    promoted: number;
    skipped: { studentId: string; reason: string }[];
};
