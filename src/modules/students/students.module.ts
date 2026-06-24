import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";
import { ClassesModule } from "@modules/classes";

import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
    imports: [AcademicYearsModule, ClassesModule],
    providers: [StudentsService],
    controllers: [StudentsController],
    exports: [StudentsService],
})
export class StudentsModule {}
