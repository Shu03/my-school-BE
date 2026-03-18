import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";

import {
    JwtAuthGuard,
    JwtFirstLoginStrategy,
    JwtStrategy,
    PermissionsGuard,
    RolesGuard,
} from "@common/guards";

import { appConfig, jwtConfig } from "@config/index";

import { HealthModule } from "@modules/health";
import { PrismaModule } from "@modules/prisma";

import { AuthModule } from "./modules/auth/auth.module";
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
        AuthModule,
    ],
    providers: [
        JwtStrategy,
        JwtFirstLoginStrategy,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RolesGuard,
        },
        {
            provide: APP_GUARD,
            useClass: PermissionsGuard,
        },
    ],
})
export class AppModule {}
