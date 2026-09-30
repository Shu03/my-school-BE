import { Test, TestingModule } from "@nestjs/testing";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";
import { AccessPolicyService } from "@modules/request-access";
import { SchoolService } from "@modules/school/school.service";

import { AttendanceService } from "./attendance.service";

describe("AttendanceService", () => {
    let service: AttendanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendanceService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
                {
                    provide: SchoolService,
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

        service = module.get<AttendanceService>(AttendanceService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
