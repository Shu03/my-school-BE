import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

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

import { AcademicYearsModule } from "./modules/academic-years/academic-years.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, jwtConfig],
        }),
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60_000, limit: 10 }],
        }),
        PrismaModule,
        HealthModule,
        UsersModule,
        AuthModule,
        AcademicYearsModule,
        ClassesModule,
        SubjectsModule,
        TeachersModule,
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
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
