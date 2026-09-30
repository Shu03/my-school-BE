import { Test, TestingModule } from "@nestjs/testing";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";

import { AccessPolicyService } from "./access-policy.service";
import { RequestAccessService } from "./request-access.service";

describe("RequestAccessService", () => {
    let service: RequestAccessService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestAccessService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
                {
                    provide: AcademicYearsService,
                    useValue: {},
                },
                {
                    provide: AccessPolicyService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<RequestAccessService>(RequestAccessService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
