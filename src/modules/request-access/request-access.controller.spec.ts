import { Test, TestingModule } from "@nestjs/testing";

import { RequestAccessController } from "./request-access.controller";
import { RequestAccessService } from "./request-access.service";

describe("RequestAccessController", () => {
    let controller: RequestAccessController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RequestAccessController],
            providers: [
                {
                    provide: RequestAccessService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<RequestAccessController>(RequestAccessController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
