import { Prisma } from "@prisma/client";

export type ClassBasic = Prisma.ClassGetPayload<object>;

export type ClassWithRelations = Prisma.ClassGetPayload<{
    include: {
        academicYear: true;
        classTeacher: {
            include: {
                user: {
                    omit: { password: true };
                };
            };
        };
    };
}>;
