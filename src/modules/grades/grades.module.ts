import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { ExamsModule } from "@modules/exams";
import { RequestAccessModule } from "@modules/request-access";

import { GradesController } from "./grades.controller";
import { GradesService } from "./grades.service";

@Module({
    imports: [ExamsModule, AcademicYearsModule, RequestAccessModule],
    providers: [GradesService],
    controllers: [GradesController],
    exports: [GradesService],
})
export class GradesModule {}
