import { Controller, Get } from "@nestjs/common";
import {
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    HealthIndicatorResult,
    PrismaHealthIndicator,
} from "@nestjs/terminus";

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
    public check(): Promise<HealthCheckResult> {
        return this.health.check([
            (): Promise<HealthIndicatorResult> =>
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                this.prismaHealth.pingCheck("database", this.prisma),
        ]);
    }
}
