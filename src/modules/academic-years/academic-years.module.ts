import { Module } from "@nestjs/common";

import { AcademicYearsController } from "./academic-years.controller";
import { AcademicYearsService } from "./academic-years.service";

@Module({
    providers: [AcademicYearsService],
    controllers: [AcademicYearsController],
    exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
