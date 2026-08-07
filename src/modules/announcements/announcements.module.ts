import { Module } from "@nestjs/common";

import { AnnouncementsController } from "./announcements.controller";
import { AnnouncementsService } from "./announcements.service";

@Module({
    providers: [AnnouncementsService],
    controllers: [AnnouncementsController],
    exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
