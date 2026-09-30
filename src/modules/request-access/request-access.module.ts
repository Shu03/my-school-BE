import { Module } from "@nestjs/common";

import { AcademicYearsModule } from "@modules/academic-years";

import { AccessPolicyService } from "./access-policy.service";
import { RequestAccessController } from "./request-access.controller";
import { RequestAccessService } from "./request-access.service";

@Module({
    imports: [AcademicYearsModule],
    providers: [RequestAccessService, AccessPolicyService],
    controllers: [RequestAccessController],
    exports: [RequestAccessService, AccessPolicyService],
})
export class RequestAccessModule {}
