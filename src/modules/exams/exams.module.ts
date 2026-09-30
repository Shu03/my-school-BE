import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { RequestAccessModule } from "@modules/request-access";

import { ExamsController } from "./exams.controller";
import { ExamsService } from "./exams.service";

@Module({
    imports: [AcademicYearsModule, RequestAccessModule],
    providers: [ExamsService],
    controllers: [ExamsController],
    exports: [ExamsService],
})
export class ExamsModule {}
