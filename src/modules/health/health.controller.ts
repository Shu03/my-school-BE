import { Controller, Get } from "@nestjs/common";
import {
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    HealthIndicatorResult,
    PrismaHealthIndicator,
} from "@nestjs/terminus";

import { Public } from "@common/decorators";

import { PrismaService } from "@modules/prisma";

@Controller("health")
export class HealthController {
    public constructor(
        private readonly health: HealthCheckService,
        private readonly prismaHealth: PrismaHealthIndicator,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    @HealthCheck()
    @Public()
    public check(): Promise<HealthCheckResult> {
        return this.health.check([
            (): Promise<HealthIndicatorResult> =>
                this.prismaHealth.pingCheck("database", this.prisma),
        ]);
    }
}
