import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { appConfig, jwtConfig } from "@config/index";

import { HealthModule } from "@modules/health";
import { PrismaModule } from "@modules/prisma";

import { UsersModule } from "./modules/users/users.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, jwtConfig],
        }),
        PrismaModule,
        HealthModule,
        UsersModule,
    ],
})
export class AppModule {}
