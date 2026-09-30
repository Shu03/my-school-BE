import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { RequestAccessModule } from "@modules/request-access";
import { SchoolModule } from "@modules/school";

import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
    imports: [SchoolModule, AcademicYearsModule, RequestAccessModule],
    providers: [AttendanceService],
    controllers: [AttendanceController],
    exports: [AttendanceService],
})
export class AttendanceModule {}
