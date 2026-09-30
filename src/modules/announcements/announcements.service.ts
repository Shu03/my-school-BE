import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { Prisma, Role } from "@prisma/client";

import {
    ERROR_ANNOUNCEMENT_EMPTY_UPDATE,
    ERROR_ANNOUNCEMENT_EXPIRED,
    ERROR_ANNOUNCEMENT_INVALID_DATE_RANGE,
    ERROR_ANNOUNCEMENT_NOT_CREATOR,
    ERROR_ANNOUNCEMENT_NOT_FOUND,
} from "@common/constants";

import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma/prisma.service";

import { AnnouncementBasic } from "./announcements.types";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { ListAnnouncementsDto } from "./dto/list-announcements.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";

const ANNOUNCEMENT_INCLUDE = {
    createdBy: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    },
} satisfies Prisma.AnnouncementInclude;

@Injectable()
export class AnnouncementsService {
    public constructor(private readonly prismaService: PrismaService) {}

    private async assertAnnouncementExists(id: string): Promise<AnnouncementBasic> {
        const announcement = await this.prismaService.announcement.findUnique({
            where: { id },
            include: ANNOUNCEMENT_INCLUDE,
        });

        if (!announcement) {
            throw new NotFoundException(ERROR_ANNOUNCEMENT_NOT_FOUND);
        }

        return announcement;
    }

    private assertCanModify(announcement: AnnouncementBasic, requestingUser: JwtPayload): void {
        if (requestingUser.role === Role.ADMIN) {
            return;
        }

        if (announcement.createdById !== requestingUser.sub) {
            throw new ForbiddenException(ERROR_ANNOUNCEMENT_NOT_CREATOR);
        }
    }

    private assertNotExpired(announcement: AnnouncementBasic): void {
        if (announcement.endDate.getTime() < Date.now()) {
            throw new BadRequestException(ERROR_ANNOUNCEMENT_EXPIRED);
        }
    }

    public async create(
        dto: CreateAnnouncementDto,
        requestingUser: JwtPayload,
    ): Promise<AnnouncementBasic> {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate.getTime() <= startDate.getTime()) {
            throw new BadRequestException(ERROR_ANNOUNCEMENT_INVALID_DATE_RANGE);
        }

        return this.prismaService.announcement.create({
            data: {
                title: dto.title,
                content: dto.content,
                startDate,
                endDate,
                createdById: requestingUser.sub,
            },
            include: ANNOUNCEMENT_INCLUDE,
        });
    }

    public async findAll(
        dto: ListAnnouncementsDto,
    ): Promise<{ data: AnnouncementBasic[]; total: number; page: number; limit: number }> {
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;

        const [data, total] = await this.prismaService.$transaction([
            this.prismaService.announcement.findMany({
                include: ANNOUNCEMENT_INCLUDE,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prismaService.announcement.count(),
        ]);

        return { data, total, page, limit };
    }

    public async findOne(id: string): Promise<AnnouncementBasic> {
        return this.assertAnnouncementExists(id);
    }

    public async update(
        id: string,
        dto: UpdateAnnouncementDto,
        requestingUser: JwtPayload,
    ): Promise<AnnouncementBasic> {
        if (
            dto.title === undefined &&
            dto.content === undefined &&
            dto.startDate === undefined &&
            dto.endDate === undefined
        ) {
            throw new BadRequestException(ERROR_ANNOUNCEMENT_EMPTY_UPDATE);
        }

        const announcement = await this.assertAnnouncementExists(id);
        this.assertCanModify(announcement, requestingUser);
        this.assertNotExpired(announcement);

        const startDate =
            dto.startDate !== undefined ? new Date(dto.startDate) : announcement.startDate;
        const endDate = dto.endDate !== undefined ? new Date(dto.endDate) : announcement.endDate;

        if (endDate.getTime() <= startDate.getTime()) {
            throw new BadRequestException(ERROR_ANNOUNCEMENT_INVALID_DATE_RANGE);
        }

        return this.prismaService.announcement.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.content !== undefined && { content: dto.content }),
                ...(dto.startDate !== undefined && { startDate }),
                ...(dto.endDate !== undefined && { endDate }),
            },
            include: ANNOUNCEMENT_INCLUDE,
        });
    }

    public async delete(id: string, requestingUser: JwtPayload): Promise<AnnouncementBasic> {
        const announcement = await this.assertAnnouncementExists(id);
        this.assertCanModify(announcement, requestingUser);
        this.assertNotExpired(announcement);

        await this.prismaService.announcement.delete({ where: { id } });

        return announcement;
    }
}
