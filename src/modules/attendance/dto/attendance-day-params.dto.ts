import { ApiProperty } from "@nestjs/swagger";

import { IsISO8601, IsUUID, Matches } from "class-validator";

export class AttendanceDayParamsDto {
    @ApiProperty({ example: "uuid-of-section" })
    @IsUUID()
    public sectionId!: string;

    @ApiProperty({ example: "2026-06-27", description: "Date in YYYY-MM-DD format" })
    @IsISO8601({ strict: true })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be in YYYY-MM-DD format" })
    public date!: string;
}
