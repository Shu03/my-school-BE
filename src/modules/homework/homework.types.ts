import { Prisma } from "@prisma/client";

export type HomeworkBasic = Prisma.HomeworkGetPayload<{
    include: {
        class: true;
        subject: true;
        createdBy: {
            include: {
                user: {
                    omit: {
                        password: true;
                    };
                };
            };
        };
    };
}>;
