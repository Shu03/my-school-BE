import { Test, TestingModule } from "@nestjs/testing";

import { AcademicYearsService } from "@modules/academic-years";
import { ClassesService } from "@modules/classes";
import { PrismaService } from "@modules/prisma";

import { StudentsService } from "./students.service";

describe("StudentsService", () => {
    let service: StudentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StudentsService,
                { provide: PrismaService, useValue: {} },
                { provide: AcademicYearsService, useValue: {} },
                { provide: ClassesService, useValue: {} },
            ],
        }).compile();

        service = module.get<StudentsService>(StudentsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
