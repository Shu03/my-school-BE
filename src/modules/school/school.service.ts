import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { getDay, parseISO } from "date-fns";

import {
    ERROR_HOLIDAY_ALREADY_EXISTS,
    ERROR_NO_FIELDS_TO_UPDATE,
    WEEKLY_OFF_DAYS_DEFAULT,
} from "@common/constants";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";

import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { ListHolidaysDto } from "./dto/list-holidays.dto";
import { UpdateSchoolSettingsDto } from "./dto/update-school-settings.dto";
import { HolidayBasic, SchoolSettingsBasic } from "./school.types";

@Injectable()
export class SchoolService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly academicYearsService: AcademicYearsService,
    ) {}

    private async getOrCreateSettings(): Promise<SchoolSettingsBasic> {
        const existing = await this.prisma.schoolSettings.findFirst();

        if (existing) {
            return existing;
        }

        return this.prisma.schoolSettings.create({
            data: {
                weeklyOffDays: WEEKLY_OFF_DAYS_DEFAULT,
            },
        });
    }

    public async getSettings(): Promise<SchoolSettingsBasic> {
        return this.getOrCreateSettings();
    }

    public async updateSettings(dto: UpdateSchoolSettingsDto): Promise<SchoolSettingsBasic> {
        if (dto.weeklyOffDays === undefined) {
            throw new BadRequestException(ERROR_NO_FIELDS_TO_UPDATE);
        }

        const settings = await this.getOrCreateSettings();

        return this.prisma.schoolSettings.update({
            where: { id: settings.id },
            data: {
                weeklyOffDays: dto.weeklyOffDays,
            },
        });
    }

    public async createHoliday(dto: CreateHolidayDto): Promise<HolidayBasic> {
        const date = new Date(dto.date);

        const existing = await this.prisma.holiday.findUnique({
            where: {
                date_academicYearId: {
                    date,
                    academicYearId: dto.academicYearId,
                },
            },
        });

        if (existing) {
            throw new ConflictException(ERROR_HOLIDAY_ALREADY_EXISTS);
        }

        return this.prisma.holiday.create({
            data: {
                name: dto.name,
                date,
                academicYearId: dto.academicYearId,
            },
        });
    }

    public async listHolidays(dto: ListHolidaysDto): Promise<HolidayBasic[]> {
        let academicYearId = dto.academicYearId;

        if (!academicYearId) {
            const current = await this.academicYearsService.findCurrent();
            academicYearId = current.id;
        }

        return this.prisma.holiday.findMany({
            where: { academicYearId },
            orderBy: { date: "asc" },
        });
    }

    public async deleteHoliday(id: string): Promise<void> {
        await this.prisma.holiday.delete({
            where: { id },
        });
    }

    public async isSchoolDay(date: string, academicYearId: string): Promise<boolean> {
        const settings = await this.getOrCreateSettings();
        const dayOfWeek = getDay(parseISO(date));

        if (settings.weeklyOffDays.includes(dayOfWeek)) {
            return false;
        }

        const holiday = await this.prisma.holiday.findUnique({
            where: {
                date_academicYearId: {
                    date: new Date(date),
                    academicYearId,
                },
            },
        });

        return holiday === null;
    }
}
