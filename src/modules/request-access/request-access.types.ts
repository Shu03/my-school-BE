import { Prisma, Section, Subject, TeacherClassRole } from "@prisma/client";

type UserSummarySelect = {
    id: true;
    firstName: true;
    lastName: true;
    mobileNumber: true;
    role: true;
};

export type AccessRequestDetail = Prisma.AccessRequestGetPayload<{
    include: {
        requester: { select: UserSummarySelect };
        requestedBy: { select: UserSummarySelect };
        reviewedBy: { select: UserSummarySelect };
        revokedBy: { select: UserSummarySelect };
        section: true;
        subject: true;
    };
}>;

export type PaginatedAccessRequests = {
    data: AccessRequestDetail[];
    total: number;
    page: number;
    limit: number;
};

export type SubjectAccessSource = TeacherClassRole | "GRANTED";

export type AssignedTeacherSummary = Prisma.TeacherProfileGetPayload<{
    include: { user: { select: UserSummarySelect } };
}>;

export type SubjectAccessOverview = {
    section: Section;
    subject: Subject;
    classTeacher: AssignedTeacherSummary | null;
    subjectTeachers: AssignedTeacherSummary[];
    grantedAccess: AccessRequestDetail[];
};
