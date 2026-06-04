import { Prisma } from "@prisma/client";

export type SubjectBasic = Prisma.SubjectGetPayload<object>;

export type SubjectWithAssignments = Prisma.SubjectGetPayload<{
    include: {
        teacherAssignments: {
            include: {
                teacher: {
                    include: {
                        user: {
                            omit: { password: true };
                        };
                    };
                };
                class: true;
            };
        };
    };
}>;
