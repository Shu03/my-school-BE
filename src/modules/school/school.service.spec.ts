import { Test, TestingModule } from "@nestjs/testing";

import { AcademicYearsService } from "@modules/academic-years/academic-years.service";
import { PrismaService } from "@modules/prisma/prisma.service";

import { SchoolService } from "./school.service";

describe("SchoolService", () => {
    let service: SchoolService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchoolService,
                {
                    provide: PrismaService,
                    useValue: {},
                },
                {
                    provide: AcademicYearsService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<SchoolService>(SchoolService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
