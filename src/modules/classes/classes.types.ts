import { Prisma } from "@prisma/client";

export type ClassBasic = Prisma.ClassGetPayload<object>;

type ClassTeacherProfile = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
    };
}>;

export type ClassWithRelations = Prisma.ClassGetPayload<{
    include: {
        academicYear: true;
    };
}> & {
    classTeacher: ClassTeacherProfile | null;
};
