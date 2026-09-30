import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { AccessRequestStatus, AccessType, Prisma, Role, TeacherClassRole } from "@prisma/client";

import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_LIMIT,
    ERROR_ACCESS_GRANT_ALREADY_HAS_ACCESS,
    ERROR_ACCESS_REQUEST_ALREADY_HAS_ACCESS,
    ERROR_ACCESS_REQUEST_DUPLICATE_PENDING,
    ERROR_ACCESS_REQUEST_INVALID_STATUS,
    ERROR_ACCESS_REQUEST_NOT_FOUND,
    ERROR_ACCESS_REQUEST_NOT_OWNER,
    ERROR_ACCESS_REQUEST_REQUESTER_NOT_TEACHER,
    ERROR_ACCESS_REQUEST_SCOPE_REQUIRED,
    ERROR_ACCESS_REQUEST_SECTION_NOT_CURRENT_YEAR,
    ERROR_ACCESS_REQUEST_SECTION_NOT_FOUND,
    ERROR_ACCESS_REQUEST_SUBJECT_LEVEL_MISMATCH,
    ERROR_ACCESS_REQUEST_SUBJECT_NOT_FOUND,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years";
import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma";

import { AccessPolicyService } from "./access-policy.service";
import {
    ApproveAccessRequestDto,
    CreateAccessRequestDto,
    GrantAccessDto,
    ListAccessRequestsDto,
    ListMyAccessRequestsDto,
    RejectAccessRequestDto,
    RevokeAccessDto,
} from "./dto";
import {
    AccessRequestDetail,
    PaginatedAccessRequests,
    SubjectAccessOverview,
    SubjectAccessSource,
} from "./request-access.types";

const USER_SUMMARY_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    mobileNumber: true,
    role: true,
} satisfies Prisma.UserSelect;

const ACCESS_REQUEST_INCLUDE = {
    requester: { select: USER_SUMMARY_SELECT },
    requestedBy: { select: USER_SUMMARY_SELECT },
    reviewedBy: { select: USER_SUMMARY_SELECT },
    revokedBy: { select: USER_SUMMARY_SELECT },
    section: true,
    subject: true,
} satisfies Prisma.AccessRequestInclude;

const ACCESS_SOURCE_LABELS: Record<SubjectAccessSource, string> = {
    CLASS_TEACHER: "class teacher",
    SUBJECT_TEACHER: "subject teacher",
    GRANTED: "approved access request",
};

type AccessScope = {
    sectionId: string;
    subjectId: string;
};

@Injectable()
export class RequestAccessService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
        private readonly accessPolicy: AccessPolicyService,
    ) {}

    private async assertAccessRequestExists(id: string): Promise<AccessRequestDetail> {
        const request = await this.prisma.accessRequest.findUnique({
            where: { id },
            include: ACCESS_REQUEST_INCLUDE,
        });

        if (!request) {
            throw new NotFoundException(ERROR_ACCESS_REQUEST_NOT_FOUND);
        }

        return request;
    }

    private async assertRequesterIsActiveTeacher(
        userId: string,
    ): Promise<{ firstName: string; lastName: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                teacherProfile: { select: { id: true } },
            },
        });

        if (!user || user.role !== Role.TEACHER || !user.isActive || !user.teacherProfile) {
            throw new BadRequestException(ERROR_ACCESS_REQUEST_REQUESTER_NOT_TEACHER);
        }

        return user;
    }

    private async assertValidScope(
        type: AccessType,
        sectionId?: string,
        subjectId?: string,
    ): Promise<AccessScope> {
        if (!sectionId || !subjectId) {
            throw new BadRequestException(ERROR_ACCESS_REQUEST_SCOPE_REQUIRED.replace("%s", type));
        }

        const [section, subject, currentYear] = await Promise.all([
            this.prisma.section.findUnique({ where: { id: sectionId } }),
            this.prisma.subject.findUnique({ where: { id: subjectId } }),
            this.academicYearsService.findCurrent(),
        ]);

        if (!section) {
            throw new NotFoundException(ERROR_ACCESS_REQUEST_SECTION_NOT_FOUND);
        }

        if (!subject) {
            throw new NotFoundException(ERROR_ACCESS_REQUEST_SUBJECT_NOT_FOUND);
        }

        if (subject.classLevel !== section.classLevel) {
            throw new BadRequestException(
                ERROR_ACCESS_REQUEST_SUBJECT_LEVEL_MISMATCH.replace(
                    "%s",
                    String(subject.classLevel),
                ).replace("%s", String(section.classLevel)),
            );
        }

        if (section.academicYearId !== currentYear.id) {
            throw new BadRequestException(ERROR_ACCESS_REQUEST_SECTION_NOT_CURRENT_YEAR);
        }

        return { sectionId, subjectId };
    }

    // holderName is null when teachers request for themselves.
    private async assertNoExistingAccess(
        userId: string,
        type: AccessType,
        scope: AccessScope,
        holderName: string | null,
    ): Promise<void> {
        const source = await this.accessPolicy.resolveSubjectAccess(
            userId,
            type,
            scope.sectionId,
            scope.subjectId,
        );

        if (!source) {
            return;
        }

        const message =
            holderName === null
                ? ERROR_ACCESS_REQUEST_ALREADY_HAS_ACCESS.replace("%s", type)
                : ERROR_ACCESS_GRANT_ALREADY_HAS_ACCESS.replace("%s", holderName).replace(
                      "%s",
                      type,
                  );

        throw new BadRequestException(message.replace("%s", ACCESS_SOURCE_LABELS[source]));
    }

    private async assertNoPendingRequest(
        userId: string,
        type: AccessType,
        scope: AccessScope,
    ): Promise<void> {
        const pending = await this.prisma.accessRequest.findFirst({
            where: {
                requesterId: userId,
                type,
                sectionId: scope.sectionId,
                subjectId: scope.subjectId,
                status: AccessRequestStatus.PENDING,
            },
            select: { id: true },
        });

        if (pending) {
            throw new BadRequestException(
                ERROR_ACCESS_REQUEST_DUPLICATE_PENDING.replace("%s", type),
            );
        }
    }

    private assertValidStatus(
        request: AccessRequestDetail,
        expected: AccessRequestStatus,
        action: string,
    ): void {
        if (request.status !== expected) {
            throw new BadRequestException(
                ERROR_ACCESS_REQUEST_INVALID_STATUS.replace("%s", expected.toLowerCase())
                    .replace("%s", action)
                    .replace("%s", request.status.toLowerCase()),
            );
        }
    }

    // Conditional update guards against two reviewers acting on the same request.
    private async setStatus(
        request: AccessRequestDetail,
        expected: AccessRequestStatus,
        action: string,
        data: Prisma.AccessRequestUncheckedUpdateManyInput,
    ): Promise<AccessRequestDetail> {
        this.assertValidStatus(request, expected, action);

        const { count } = await this.prisma.accessRequest.updateMany({
            where: { id: request.id, status: expected },
            data,
        });

        const updated = await this.assertAccessRequestExists(request.id);

        if (count === 0) {
            this.assertValidStatus(updated, expected, action);
        }

        return updated;
    }

    private async findPaginated(
        dto: ListMyAccessRequestsDto,
        requesterId?: string,
    ): Promise<PaginatedAccessRequests> {
        const page = dto.page ?? DEFAULT_PAGE;
        const limit = dto.limit ?? DEFAULT_PAGE_LIMIT;

        const where: Prisma.AccessRequestWhereInput = {
            ...(requesterId !== undefined && { requesterId }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.type !== undefined && { type: dto.type }),
            ...(dto.sectionId !== undefined && { sectionId: dto.sectionId }),
            ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        };

        const [data, total] = await this.prisma.$transaction([
            this.prisma.accessRequest.findMany({
                where,
                include: ACCESS_REQUEST_INCLUDE,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.accessRequest.count({ where }),
        ]);

        return { data, total, page, limit };
    }

    public async create(
        dto: CreateAccessRequestDto,
        requestingUser: JwtPayload,
    ): Promise<AccessRequestDetail> {
        await this.assertRequesterIsActiveTeacher(requestingUser.sub);
        const scope = await this.assertValidScope(dto.type, dto.sectionId, dto.subjectId);
        await this.assertNoExistingAccess(requestingUser.sub, dto.type, scope, null);
        await this.assertNoPendingRequest(requestingUser.sub, dto.type, scope);

        return this.prisma.accessRequest.create({
            data: {
                requesterId: requestingUser.sub,
                type: dto.type,
                sectionId: scope.sectionId,
                subjectId: scope.subjectId,
                reason: dto.reason,
                requestedById: requestingUser.sub,
            },
            include: ACCESS_REQUEST_INCLUDE,
        });
    }

    public async grant(
        dto: GrantAccessDto,
        requestingUser: JwtPayload,
    ): Promise<AccessRequestDetail> {
        const requester = await this.assertRequesterIsActiveTeacher(dto.requesterId);
        const scope = await this.assertValidScope(dto.type, dto.sectionId, dto.subjectId);
        await this.assertNoExistingAccess(
            dto.requesterId,
            dto.type,
            scope,
            `${requester.firstName} ${requester.lastName}`,
        );
        await this.assertNoPendingRequest(dto.requesterId, dto.type, scope);

        return this.prisma.accessRequest.create({
            data: {
                requesterId: dto.requesterId,
                type: dto.type,
                status: AccessRequestStatus.APPROVED,
                sectionId: scope.sectionId,
                subjectId: scope.subjectId,
                requestedById: requestingUser.sub,
                reviewedById: requestingUser.sub,
                reviewedAt: new Date(),
                reviewRemarks: dto.remarks ?? null,
            },
            include: ACCESS_REQUEST_INCLUDE,
        });
    }

    public async findAll(dto: ListAccessRequestsDto): Promise<PaginatedAccessRequests> {
        return this.findPaginated(dto, dto.requesterId);
    }

    public async findMine(
        dto: ListMyAccessRequestsDto,
        requestingUser: JwtPayload,
    ): Promise<PaginatedAccessRequests> {
        return this.findPaginated(dto, requestingUser.sub);
    }

    public async findOne(id: string, requestingUser: JwtPayload): Promise<AccessRequestDetail> {
        const request = await this.assertAccessRequestExists(id);

        if (requestingUser.role !== Role.ADMIN && request.requesterId !== requestingUser.sub) {
            throw new ForbiddenException(ERROR_ACCESS_REQUEST_NOT_OWNER);
        }

        return request;
    }

    public async cancel(id: string, requestingUser: JwtPayload): Promise<AccessRequestDetail> {
        const request = await this.assertAccessRequestExists(id);

        if (request.requesterId !== requestingUser.sub) {
            throw new ForbiddenException(ERROR_ACCESS_REQUEST_NOT_OWNER);
        }

        return this.setStatus(request, AccessRequestStatus.PENDING, "cancelled", {
            status: AccessRequestStatus.CANCELLED,
        });
    }

    public async approve(
        id: string,
        dto: ApproveAccessRequestDto,
        requestingUser: JwtPayload,
    ): Promise<AccessRequestDetail> {
        const request = await this.assertAccessRequestExists(id);

        return this.setStatus(request, AccessRequestStatus.PENDING, "approved", {
            status: AccessRequestStatus.APPROVED,
            reviewedById: requestingUser.sub,
            reviewedAt: new Date(),
            reviewRemarks: dto.remarks ?? null,
        });
    }

    public async reject(
        id: string,
        dto: RejectAccessRequestDto,
        requestingUser: JwtPayload,
    ): Promise<AccessRequestDetail> {
        const request = await this.assertAccessRequestExists(id);

        return this.setStatus(request, AccessRequestStatus.PENDING, "rejected", {
            status: AccessRequestStatus.REJECTED,
            reviewedById: requestingUser.sub,
            reviewedAt: new Date(),
            reviewRemarks: dto.remarks,
        });
    }

    public async revoke(
        id: string,
        dto: RevokeAccessDto,
        requestingUser: JwtPayload,
    ): Promise<AccessRequestDetail> {
        const request = await this.assertAccessRequestExists(id);

        return this.setStatus(request, AccessRequestStatus.APPROVED, "revoked", {
            status: AccessRequestStatus.REVOKED,
            revokedById: requestingUser.sub,
            revokedAt: new Date(),
            revokeRemarks: dto.remarks ?? null,
        });
    }

    public async findSubjectAccess(
        sectionId: string,
        subjectId: string,
    ): Promise<SubjectAccessOverview> {
        const [section, subject] = await Promise.all([
            this.prisma.section.findUnique({ where: { id: sectionId } }),
            this.prisma.subject.findUnique({ where: { id: subjectId } }),
        ]);

        if (!section) {
            throw new NotFoundException(ERROR_ACCESS_REQUEST_SECTION_NOT_FOUND);
        }

        if (!subject) {
            throw new NotFoundException(ERROR_ACCESS_REQUEST_SUBJECT_NOT_FOUND);
        }

        const [assignments, grantedAccess] = await Promise.all([
            this.prisma.teacherClassAssignment.findMany({
                where: {
                    sectionId,
                    OR: [
                        { role: TeacherClassRole.CLASS_TEACHER },
                        { role: TeacherClassRole.SUBJECT_TEACHER, subjectId },
                    ],
                },
                include: {
                    teacher: {
                        include: { user: { select: USER_SUMMARY_SELECT } },
                    },
                },
            }),
            this.prisma.accessRequest.findMany({
                where: { sectionId, subjectId, status: AccessRequestStatus.APPROVED },
                include: ACCESS_REQUEST_INCLUDE,
                orderBy: { reviewedAt: "desc" },
            }),
        ]);

        const classTeacher =
            assignments.find((assignment) => assignment.role === TeacherClassRole.CLASS_TEACHER)
                ?.teacher ?? null;

        const subjectTeachers = assignments
            .filter((assignment) => assignment.role === TeacherClassRole.SUBJECT_TEACHER)
            .map((assignment) => assignment.teacher);

        return { section, subject, classTeacher, subjectTeachers, grantedAccess };
    }
}
