import { Prisma } from "@prisma/client";

export type SectionBasic = Prisma.SectionGetPayload<object>;

type ClassTeacherProfile = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
    };
}>;

export type SectionWithRelations = Prisma.SectionGetPayload<{
    include: {
        academicYear: true;
    };
}> & {
    classTeacher: ClassTeacherProfile | null;
};
