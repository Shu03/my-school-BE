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
                section: true;
                academicYear: true;
            };
        };
    };
}>;

export type EnrollmentBasic = Prisma.StudentEnrollmentGetPayload<{
    include: {
        section: true;
        academicYear: true;
    };
}>;

export type PromotionResult = {
    promoted: number;
    skipped: { studentId: string; reason: string }[];
};
