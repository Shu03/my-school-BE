import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@common/decorators";

import { JwtPayload } from "@modules/auth";

import { DashboardService } from "./dashboard.service";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
    public constructor(private readonly dashboardService: DashboardService) {}

    @Get()
    @ApiOperation({ summary: "Get dashboard stats for the current user's role" })
    public getDashboard(
        @CurrentUser() user: JwtPayload,
    ): ReturnType<DashboardService["getDashboard"]> {
        return this.dashboardService.getDashboard(user);
    }
}
