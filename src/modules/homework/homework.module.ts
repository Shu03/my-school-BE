import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { HomeworkController } from "./homework.controller";
import { HomeworkService } from "./homework.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [HomeworkService],
    controllers: [HomeworkController],
    exports: [HomeworkService],
})
export class HomeworkModule {}
