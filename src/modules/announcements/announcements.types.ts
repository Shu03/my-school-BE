import { Prisma } from "@prisma/client";

export type AnnouncementBasic = Prisma.AnnouncementGetPayload<{
    include: {
        createdBy: {
            select: {
                id: true;
                firstName: true;
                lastName: true;
                role: true;
            };
        };
    };
}>;
