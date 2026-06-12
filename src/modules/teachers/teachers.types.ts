import { Prisma } from "@prisma/client";

export type PresetBasic = Prisma.PermissionPresetGetPayload<object>;

export type TeacherProfileBasic = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
        preset: true;
    };
}>;

export type TeacherProfileWithAssignments = Prisma.TeacherProfileGetPayload<{
    include: {
        user: {
            omit: { password: true };
        };
        preset: true;
        classAssignments: {
            include: {
                class: true;
                subject: true;
            };
        };
    };
}>;

export type AssignmentBasic = Prisma.TeacherClassAssignmentGetPayload<{
    include: {
        class: true;
        subject: true;
    };
}>;
