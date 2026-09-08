import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { SectionsController } from "./sections.controller";
import { SectionsService } from "./sections.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [SectionsService],
    controllers: [SectionsController],
    exports: [SectionsService],
})
export class SectionsModule {}
