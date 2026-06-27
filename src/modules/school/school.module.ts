import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { SchoolController } from "./school.controller";
import { SchoolService } from "./school.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [SchoolService],
    controllers: [SchoolController],
    exports: [SchoolService],
})
export class SchoolModule {}
