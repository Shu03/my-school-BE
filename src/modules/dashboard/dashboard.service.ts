import { Injectable, NotFoundException } from "@nestjs/common";

import { Role } from "@prisma/client";
import { addDays } from "date-fns";

import { DASHBOARD_UPCOMING_DAYS, ERROR_DASHBOARD_NO_CURRENT_YEAR } from "@common/constants";
import { getTodayInSchoolTimezone } from "@common/utils";

import { JwtPayload } from "@modules/auth";
import { PrismaService } from "@modules/prisma";
import { SchoolService } from "@modules/school";

import { AdminDashboardService } from "./admin-dashboard.service";
import { DashboardCommonService } from "./dashboard-common.service";
import { DashboardContext, DashboardResponse } from "./dashboard.types";
import { StudentDashboardService } from "./student-dashboard.service";
import { TeacherDashboardService } from "./teacher-dashboard.service";

@Injectable()
export class DashboardService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly schoolService: SchoolService,
        private readonly common: DashboardCommonService,
        private readonly adminDashboard: AdminDashboardService,
        private readonly teacherDashboard: TeacherDashboardService,
        private readonly studentDashboard: StudentDashboardService,
    ) {}

    public async getDashboard(user: JwtPayload): Promise<DashboardResponse> {
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { isCurrent: true },
            select: { id: true, name: true },
        });

        if (!academicYear) {
            throw new NotFoundException(ERROR_DASHBOARD_NO_CURRENT_YEAR);
        }

        const today = getTodayInSchoolTimezone();
        const todayDate = new Date(today);
        const isSchoolDay = await this.schoolService.isSchoolDay(today, academicYear.id);

        const context: DashboardContext = {
            userId: user.sub,
            academicYearId: academicYear.id,
            today,
            todayDate,
            upcomingUntil: addDays(todayDate, DASHBOARD_UPCOMING_DAYS),
            isSchoolDay,
        };

        const [announcements, upcomingHolidays] = await Promise.all([
            this.common.findActiveAnnouncements(),
            this.common.findUpcomingHolidays(context),
        ]);
        const base = { academicYear, today, announcements, upcomingHolidays };

        switch (user.role) {
            case Role.ADMIN:
                return {
                    role: Role.ADMIN,
                    ...base,
                    ...(await this.adminDashboard.getStats(context)),
                };
            case Role.TEACHER:
                return {
                    role: Role.TEACHER,
                    ...base,
                    ...(await this.teacherDashboard.getStats(context)),
                };
            case Role.STUDENT:
                return {
                    role: Role.STUDENT,
                    ...base,
                    ...(await this.studentDashboard.getStats(context)),
                };
        }
    }
}
