import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { RequestAccessModule } from "@modules/request-access";

import { HomeworkController } from "./homework.controller";
import { HomeworkService } from "./homework.service";

@Module({
    imports: [AcademicYearsModule, RequestAccessModule],
    providers: [HomeworkService],
    controllers: [HomeworkController],
    exports: [HomeworkService],
})
export class HomeworkModule {}
