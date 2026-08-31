import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { FeesController } from "./fees.controller";
import { FeesService } from "./fees.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [FeesService],
    controllers: [FeesController],
    exports: [FeesService],
})
export class FeesModule {}
