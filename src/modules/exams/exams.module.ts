import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { ExamsController } from "./exams.controller";
import { ExamsService } from "./exams.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [ExamsService],
    controllers: [ExamsController],
    exports: [ExamsService],
})
export class ExamsModule {}
