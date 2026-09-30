import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { JwtAuthGuard, JwtFirstLoginStrategy, JwtStrategy, RolesGuard } from "@common/guards";

import { appConfig, jwtConfig } from "@config/index";

import { HealthModule } from "@modules/health";
import { PrismaModule } from "@modules/prisma";

import { AcademicYearsModule } from "./modules/academic-years/academic-years.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { FeesModule } from "./modules/fees/fees.module";
import { GradesModule } from "./modules/grades/grades.module";
import { HomeworkModule } from "./modules/homework/homework.module";
import { RequestAccessModule } from "./modules/request-access/request-access.module";
import { SchoolModule } from "./modules/school/school.module";
import { SectionsModule } from "./modules/sections/sections.module";
import { StudentsModule } from "./modules/students/students.module";
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
        SectionsModule,
        SubjectsModule,
        TeachersModule,
        StudentsModule,
        SchoolModule,
        AttendanceModule,
        ExamsModule,
        GradesModule,
        HomeworkModule,
        AnnouncementsModule,
        FeesModule,
        AccountsModule,
        RequestAccessModule,
        DashboardModule,
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
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
