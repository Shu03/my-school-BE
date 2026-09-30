import { Module } from "@nestjs/common";

import { AccountsModule } from "@modules/accounts";
import { RequestAccessModule } from "@modules/request-access";
import { SchoolModule } from "@modules/school";

import { AdminDashboardService } from "./admin-dashboard.service";
import { DashboardCommonService } from "./dashboard-common.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { StudentDashboardService } from "./student-dashboard.service";
import { TeacherDashboardService } from "./teacher-dashboard.service";

@Module({
    imports: [AccountsModule, RequestAccessModule, SchoolModule],
    providers: [
        DashboardService,
        DashboardCommonService,
        AdminDashboardService,
        TeacherDashboardService,
        StudentDashboardService,
    ],
    controllers: [DashboardController],
})
export class DashboardModule {}
