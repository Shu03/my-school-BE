import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [ClassesService],
    controllers: [ClassesController],
    exports: [ClassesService],
})
export class ClassesModule {}
