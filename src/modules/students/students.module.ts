import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { FeesModule } from "@modules/fees";
import { SectionsModule } from "@modules/sections";

import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
    imports: [AcademicYearsModule, SectionsModule, FeesModule],
    providers: [StudentsService],
    controllers: [StudentsController],
    exports: [StudentsService],
})
export class StudentsModule {}
