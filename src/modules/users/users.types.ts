import { Prisma } from "@prisma/client";

export type UserWithoutPassword = Prisma.UserGetPayload<{
    omit: { password: true };
}>;

export type UserWithTeacherProfile = Prisma.UserGetPayload<{
    omit: { password: true };
    include: { teacherProfile: true };
}>;

export type UserWithStudentProfile = Prisma.UserGetPayload<{
    omit: { password: true };
    include: { studentProfile: true };
}>;

export type UserWithProfiles = Prisma.UserGetPayload<{
    omit: { password: true };
    include: {
        teacherProfile: true;
        studentProfile: true;
    };
}>;

export type CreateUserResult<T> = {
    user: T;
    tempPassword: string;
};
