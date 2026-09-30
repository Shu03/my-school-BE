import { Prisma } from "@prisma/client";

export type TeacherProfileBasic = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
    };
}>;

export type TeacherProfileWithAssignments = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
        classAssignments: {
            include: {
                section: true;
                subject: true;
            };
        };
    };
}>;

export type AssignmentBasic = Prisma.TeacherClassAssignmentGetPayload<{
    include: {
        section: true;
        subject: true;
    };
}>;
